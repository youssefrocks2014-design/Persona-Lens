import { MANDATORY_INTERPRETATION_NOTE } from '../src/data/seedCatalog.ts';
import type {
  AnalysisGenerationResult,
  EvidenceItem,
  Persona,
  RehearsalMessage,
  RehearsalTurnResult,
  SituationInput,
} from '../src/types/personaLens.ts';
import {
  ANALYSIS_LIMITS,
  clampText,
  normalizeEvidenceIds,
} from '../src/utils/validation.ts';
import {
  getSerializedEvidenceJson,
  getSerializedEvidenceSummaryLine,
  getSerializedPersonaJson,
} from './catalog.ts';

export const DEFAULT_SAFETY_SUPPORT_MESSAGE =
  'It sounds like you may be dealing with self-harm, abuse, or immediate danger. Please step away from this exercise and reach out to a trusted person, local emergency services, or a crisis support helpline right now—you deserve direct human care and support.';

export const NO_MATCHING_EVIDENCE_TEXT = 'No matching evidence in the library.';

export function buildLivingYourDayPrompt(
  situation: SituationInput,
  persona: Persona,
  evidenceLibrary: EvidenceItem[]
): { systemInstruction: string; userPrompt: string } {
  const systemInstruction = [
    'You are the analysis engine of PersonaLens. You receive: (1) a situation described by the user, (2) one persona card, and (3) the evidence library.',
    '',
    'Safety FIRST:',
    '- If the situation involves self-harm, abuse, or immediate danger, do NOT produce a persona analysis. Set "isSafetyAlert": true and put a short, kind message in "safetyMessage" encouraging the user to contact a trusted person or local emergency or support services. Leave personaView fields, suggestedResponse, and realityCheck fields concise/empty and evidenceIdsUsed as [].',
    '- Otherwise set "isSafetyAlert": false and "safetyMessage": "".',
    '',
    'Your job when isSafetyAlert is false:',
    '1. PERSONA VIEW: Explain how the philosophy, decision pattern, and communication style on the persona card would approach this situation. Use ONLY what is on the persona card. Write strictly in third person ("Through the lens of..."). Never write as the real person. Never invent or quote words they said or wrote. If the user asks what the historical figure would say, decline to quote them and provide a third-person interpretation instead.',
    '2. SUGGESTED RESPONSE: Draft a short message or plan of action the user could use, in the spirit of that lens, in plain language.',
    '3. REALITY CHECK: Compare the suggested response with entries ONLY from the supplied evidence library. For each relevant entry, state clearly whether it helps, carries a risk, or is neutral, and explain why in one or two sentences. Cite entries ONLY by their exact id and name (include exact id strings in realityCheck.evidenceIdsUsed). If none apply, set evidenceIdsUsed to [] and write "No matching evidence in the library." in researchComparison. Always show the exact evidence strength label (e.g., strong, moderate, low to limited, strong (in clinical contexts), moderate; lab and field studies, moderate; widely used, empirical support mixed).',
    '4. Honest Backfire Check: If the persona’s style would likely backfire in this situation, say so honestly in blindSpotWarning and realityCheck.risksAndLimits and explain why.',
    `5. Always set "note" to: "${MANDATORY_INTERPRETATION_NOTE}"`,
    '',
    'Scope: This is reflection and communication practice, not therapy, medical, or legal advice.',
    'Keep each field crisp, specific, and concise (2-3 sentences per field; suggestedResponse 2-4 sentences).',
    'Return valid JSON only with "isSafetyAlert", "safetyMessage", "note", "personaView", "suggestedResponse", and "realityCheck".',
  ].join('\n');

  const personaBlock = getSerializedPersonaJson(persona);
  const evidenceBlock = getSerializedEvidenceJson(evidenceLibrary);

  const userPrompt = [
    'Analyze the situation through the Persona Card, draft a suggested response, and run a Reality Check using ONLY the Evidence Library.',
    '',
    '=== USER SITUATION ===',
    `Title: ${situation.title}`,
    `Other Person Role: ${situation.otherPersonRole}`,
    `Desired Outcome: ${situation.desiredOutcome}`,
    `Description: ${situation.description}`,
    '',
    '=== PERSONA CARD (FROM DATABASE) ===',
    personaBlock,
    '',
    '=== EVIDENCE LIBRARY (FROM DATABASE) ===',
    evidenceBlock,
  ].join('\n');

  return { systemInstruction, userPrompt };
}

export type ParsedAnalysisPayload = AnalysisGenerationResult;

export function parseLivingYourDayResponse(
  rawText: string,
  persona: Persona,
  evidenceLibrary: EvidenceItem[]
): ParsedAnalysisPayload {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(rawText || '{}') as Record<string, unknown>;
  } catch {
    throw new Error('Model returned malformed JSON for situation analysis.');
  }

  const isSafetyAlert = parsed.isSafetyAlert === true;
  if (isSafetyAlert) {
    const rawSafety =
      typeof parsed.safetyMessage === 'string' ? parsed.safetyMessage.trim() : '';
    const safetyMessage =
      rawSafety.length >= 10
        ? rawSafety.slice(0, 1200)
        : DEFAULT_SAFETY_SUPPORT_MESSAGE;

    return {
      isSafetyAlert: true,
      safetyMessage,
      note: MANDATORY_INTERPRETATION_NOTE,
      personaView: {
        framing: '',
        principleApplication: '',
        blindSpotWarning: '',
      },
      suggestedResponse: '',
      realityCheck: {
        assessment: '',
        evidenceIdsUsed: [],
        researchComparison: '',
        risksAndLimits: '',
      },
    };
  }

  const pv = (parsed.personaView ?? {}) as Record<string, unknown>;
  const rc = (parsed.realityCheck ?? {}) as Record<string, unknown>;

  const framing = clampText(
    typeof pv.framing === 'string' ? pv.framing : '',
    ANALYSIS_LIMITS.framingMax,
    `Through the lens of ${persona.name}, this situation centers on applying their documented principles rather than reacting impulsively.`
  );
  const principleApplication = clampText(
    typeof pv.principleApplication === 'string' ? pv.principleApplication : '',
    ANALYSIS_LIMITS.principleApplicationMax,
    `Through the lens of ${persona.name}, their documented decision pattern emphasizes measured clarity and adherence to their stated principles.`
  );
  const blindSpotWarning = clampText(
    typeof pv.blindSpotWarning === 'string' ? pv.blindSpotWarning : '',
    ANALYSIS_LIMITS.blindSpotWarningMax,
    persona.blindSpots[0] ?? 'Watch for how this lens could backfire if applied rigidly without adapting to the counterpart.'
  );

  const suggestedResponse = clampText(
    typeof parsed.suggestedResponse === 'string' ? parsed.suggestedResponse : '',
    ANALYSIS_LIMITS.suggestedResponseMax,
    'Thank you for sharing this. I want to address the core concern constructively while keeping our shared goals clear.'
  );

  const evidenceIdsUsed = normalizeEvidenceIds(rc.evidenceIdsUsed, evidenceLibrary);

  const assessment = clampText(
    typeof rc.assessment === 'string' ? rc.assessment : '',
    ANALYSIS_LIMITS.assessmentMax,
    evidenceIdsUsed.length === 0
      ? NO_MATCHING_EVIDENCE_TEXT
      : 'Compared against the communication research library, this lens has distinct strengths and trade-offs.'
  );

  const rawResearchComparison =
    typeof rc.researchComparison === 'string' ? rc.researchComparison.trim() : '';
  const researchComparison =
    evidenceIdsUsed.length === 0
      ? rawResearchComparison.toLowerCase().includes('no matching evidence in the library')
        ? clampText(rawResearchComparison, ANALYSIS_LIMITS.researchComparisonMax, NO_MATCHING_EVIDENCE_TEXT)
        : NO_MATCHING_EVIDENCE_TEXT
      : clampText(
          rawResearchComparison,
          ANALYSIS_LIMITS.researchComparisonMax,
          'The suggested approach was compared against the cited entries in the Evidence Library.'
        );

  const risksAndLimits = clampText(
    typeof rc.risksAndLimits === 'string' ? rc.risksAndLimits : '',
    ANALYSIS_LIMITS.risksAndLimitsMax,
    'Research limits indicate that calm framing alone may need explicit boundaries if the counterpart remains non-cooperative.'
  );

  return {
    isSafetyAlert: false,
    safetyMessage: '',
    note: MANDATORY_INTERPRETATION_NOTE,
    personaView: {
      framing,
      principleApplication,
      blindSpotWarning,
    },
    suggestedResponse,
    realityCheck: {
      assessment,
      evidenceIdsUsed,
      researchComparison,
      risksAndLimits,
    },
  };
}

export function buildRehearsalTurnPrompt(
  situation: SituationInput,
  persona: Persona,
  evidenceLibrary: EvidenceItem[],
  history: RehearsalMessage[],
  userMessage: string
): { systemInstruction: string; userPrompt: string } {
  const systemInstruction = [
    'You are facilitating PersonaLens Larp Mode (interactive communication rehearsal).',
    'Safety FIRST:',
    '- If the user message or situation involves self-harm, abuse, or immediate danger, do NOT roleplay or produce coaching. Set "isSafetyAlert": true, put a short, kind message in "safetyMessage" encouraging the user to contact a trusted person or local emergency or support services, and set otherPersonReply and coachNote to "".',
    '- Otherwise set "isSafetyAlert": false and "safetyMessage": "".',
    '',
    'When isSafetyAlert is false, return two responses grounded strictly in the provided cards:',
    `1. otherPersonReply: Roleplay realistically as the other person (${situation.otherPersonRole}). React naturally and candidly to what the user just said—do not become unrealistically compliant unless earned.`,
    `2. coachNote: Write strictly in third person ("Through the lens of ${persona.name}...") grounded ONLY in ${persona.name}’s Persona Card and the provided Evidence Library. Never write as ${persona.name} in first person, and never invent or quote words they said or wrote (if asked what they would say, decline the quote and give an interpretation). When citing an evidence entry, use ONLY its exact id, name, and exact evidenceStrength label, and note whether it helps, carries a risk, or is neutral (or write "${NO_MATCHING_EVIDENCE_TEXT}" if none apply). Say honestly if the persona’s style would backfire.`,
    'Scope: This is reflection and communication practice, not therapy, medical, or legal advice.',
    'Return valid JSON only.',
  ].join('\n');

  const transcript = history
    .slice(-12)
    .map((m) => `[${m.role.toUpperCase()}]: ${m.text}`)
    .join('\n');

  const userPrompt = [
    '=== SITUATION ===',
    `Title: ${situation.title}`,
    `Other Person Role: ${situation.otherPersonRole}`,
    `Desired Outcome: ${situation.desiredOutcome}`,
    `Context: ${situation.description}`,
    '',
    '=== PERSONA COACH CARD ===',
    getSerializedPersonaJson(persona),
    '',
    '=== EVIDENCE LIBRARY ===',
    getSerializedEvidenceJson(evidenceLibrary),
    '',
    '=== PRIOR TRANSCRIPT ===',
    transcript || '(Start of rehearsal)',
    '',
    '=== USER LATEST MESSAGE ===',
    userMessage,
  ].join('\n');

  return { systemInstruction, userPrompt };
}

export function parseRehearsalTurnResponse(
  rawText: string,
  situation: SituationInput,
  persona: Persona
): RehearsalTurnResult {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(rawText || '{}') as Record<string, unknown>;
  } catch {
    throw new Error('Model returned malformed JSON for rehearsal turn.');
  }

  if (parsed.isSafetyAlert === true) {
    const rawSafety =
      typeof parsed.safetyMessage === 'string' ? parsed.safetyMessage.trim() : '';
    return {
      isSafetyAlert: true,
      safetyMessage:
        rawSafety.length >= 10
          ? rawSafety.slice(0, 1200)
          : DEFAULT_SAFETY_SUPPORT_MESSAGE,
      otherPersonReply: '',
      coachNote: '',
    };
  }

  return {
    isSafetyAlert: false,
    safetyMessage: '',
    otherPersonReply: clampText(
      typeof parsed.otherPersonReply === 'string' ? parsed.otherPersonReply : '',
      3800,
      'I hear what you are saying, though I still need to see how this addresses my immediate concern.'
    ),
    coachNote: clampText(
      typeof parsed.coachNote === 'string' ? parsed.coachNote : '',
      3800,
      `Through the lens of ${persona.name}, keep your next reply concise, acknowledge ${situation.otherPersonRole}'s constraint, and restate your core boundary calmly.`
    ),
  };
}

export function buildRehearsalFeedbackPrompt(
  situation: SituationInput,
  persona: Persona,
  evidenceLibrary: EvidenceItem[],
  messages: RehearsalMessage[]
): { systemInstruction: string; userPrompt: string } {
  const systemInstruction = [
    'You are concluding a PersonaLens Larp Mode rehearsal.',
    'Provide clear, balanced coaching feedback grounded STRICTLY in the supplied Persona Card and Evidence Library.',
    'Write in third person ("Through the lens of..."). Never invent or quote words from the historical figure.',
    'Cover: (1) What worked in the user’s phrasing, (2) How closely it stayed aligned with the persona’s documented principles without falling into their blind spots, and (3) Concrete adjustments citing ONLY matching Evidence Library entries by id, name, and exact evidenceStrength label (or stating "No matching evidence in the library." if none apply).',
    `Always end with: "${MANDATORY_INTERPRETATION_NOTE}"`,
    'Scope: This is reflection and communication practice, not therapy, medical, or legal advice.',
    'Keep feedback under 400 words in plain structured paragraphs.',
  ].join('\n');

  const transcript = messages
    .map((m) => `[${m.role.toUpperCase()}]: ${m.text}`)
    .join('\n');

  const userPrompt = [
    `Situation: ${situation.title} (${situation.otherPersonRole})`,
    `Desired Outcome: ${situation.desiredOutcome}`,
    `Coach Persona: ${persona.name} — ${persona.lensSummary}`,
    `Persona Blind Spots: ${persona.blindSpots.join(' | ')}`,
    `Evidence Library: ${getSerializedEvidenceSummaryLine(evidenceLibrary)}`,
    '',
    '=== FULL REHEARSAL TRANSCRIPT ===',
    transcript,
  ].join('\n');

  return { systemInstruction, userPrompt };
}
