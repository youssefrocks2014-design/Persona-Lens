import {
  MANDATORY_INTERPRETATION_NOTE,
  SEED_PERSONAS,
} from '../data/seedCatalog.ts';
import { auth } from '../firebase.ts';
import type {
  AnalysisGenerationResult,
  EvidenceItem,
  Persona,
  RehearsalMessage,
  RehearsalTurnResult,
  SituationInput,
} from '../types/personaLens.ts';

const CURATED_PERSONA_IDS = new Set(SEED_PERSONAS.map((p) => p.id));
const DEFAULT_API_TIMEOUT_MS = 35_000;

const PREVIEW_SAFETY_PATTERN =
  /\b(self-harm|kill myself|suicide|end my life|hurt myself|immediate danger|physical abuse|abusing me)\b/i;

const PREVIEW_SAFETY_MESSAGE =
  'If you are facing self-harm, abuse, or immediate danger, please step away from this reflection and reach out to a trusted person, local emergency services, or a local crisis helpline right now.';

export interface ServerHealthStatus {
  ok: boolean;
  aiConfigured: boolean;
}

function buildPersonaPayload(persona: Persona): { personaId?: string; persona?: Persona } {
  return CURATED_PERSONA_IDS.has(persona.id)
    ? { personaId: persona.id }
    : { persona };
}

async function getBearerHeaders(): Promise<Record<string, string>> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('You must be signed in with Google to run an analysis.');
  }
  const token = await currentUser.getIdToken();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

function toFriendlyClientErrorMessage(rawMessage: unknown, fallbackMessage: string): string {
  if (typeof rawMessage !== 'string') {
    return fallbackMessage;
  }
  const trimmed = rawMessage.trim();
  if (!trimmed) {
    return fallbackMessage;
  }
  const looksLikeRawPayload =
    trimmed.includes('{') ||
    trimmed.includes('}') ||
    trimmed.startsWith('<') ||
    /^ApiError\b/i.test(trimmed) ||
    /"error"\s*:/.test(trimmed);

  if (looksLikeRawPayload) {
    if (/\b503\b|UNAVAILABLE|high demand|overloaded|Service Unavailable/i.test(trimmed)) {
      return 'The AI service is temporarily busy right now. Please wait a moment and try again.';
    }
    if (/\b429\b|RESOURCE_EXHAUSTED|Too Many Requests|rate limit|quota/i.test(trimmed)) {
      return 'The AI service is receiving too many requests right now. Please wait a few seconds and try again.';
    }
    return fallbackMessage;
  }

  return trimmed;
}

async function parseApiJson<T>(res: Response, fallbackMessage: string): Promise<T> {
  const rawBody = await res.text();
  let data: Record<string, unknown> | null = null;
  if (rawBody) {
    try {
      data = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const serverMessage = data && typeof data.error === 'string' ? data.error : rawBody;
    throw new Error(toFriendlyClientErrorMessage(serverMessage, fallbackMessage));
  }

  if (!data) {
    throw new Error(fallbackMessage);
  }
  return data as unknown as T;
}

async function postApiJson<T>(
  url: string,
  payload: unknown,
  fallbackMessage: string,
  timeoutMs = DEFAULT_API_TIMEOUT_MS
): Promise<T> {
  const headers = await getBearerHeaders();
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    if (err instanceof DOMException && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
      throw new Error(
        'The request timed out while waiting for the AI service. Please try again.'
      );
    }
    throw new Error(
      'Could not connect to the PersonaLens server. Check your internet connection and try again.'
    );
  }

  return parseApiJson<T>(res, fallbackMessage);
}

/**
 * Checks backend availability and whether GEMINI_API_KEY is configured on the server.
 * Never exposes secret material; returns null if the health check cannot complete.
 */
export async function fetchServerHealth(): Promise<ServerHealthStatus | null> {
  try {
    const res = await fetch('/api/health', {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      return null;
    }
    const data = (await res.json()) as Partial<ServerHealthStatus>;
    if (typeof data.ok !== 'boolean' || typeof data.aiConfigured !== 'boolean') {
      return null;
    }
    return { ok: data.ok, aiConfigured: data.aiConfigured };
  } catch {
    return null;
  }
}

/** Requests a structured Persona View, Suggested Response, and Reality Check for a situation. */
export async function requestLivingYourDayAnalysis(
  situation: SituationInput,
  persona: Persona,
  evidenceLibrary: EvidenceItem[],
  previewMode = false
): Promise<AnalysisGenerationResult> {
  if (previewMode) {
    const combined = `${situation.title} ${situation.description} ${situation.desiredOutcome}`;
    if (PREVIEW_SAFETY_PATTERN.test(combined)) {
      return {
        isSafetyAlert: true,
        safetyMessage: PREVIEW_SAFETY_MESSAGE,
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

    const personaIndex = persona.id.length % 2;
    const ev1 =
      personaIndex === 0
        ? evidenceLibrary[3] ?? evidenceLibrary[0]
        : evidenceLibrary[0];
    const ev2 =
      personaIndex === 0
        ? evidenceLibrary[2] ?? evidenceLibrary[1]
        : evidenceLibrary[8] ?? evidenceLibrary[2];
    const usedIds = ev1.id === ev2.id ? [ev1.id] : [ev1.id, ev2.id];

    return {
      isSafetyAlert: false,
      safetyMessage: '',
      note: MANDATORY_INTERPRETATION_NOTE,
      personaView: {
        framing: `Through the lens of ${persona.name} (${persona.lensSummary}), this situation ("${situation.title}") calls for applying their documented decision pattern rather than reacting to pressure from ${situation.otherPersonRole}.`,
        principleApplication: `Through the lens of ${persona.name}, prioritize "${persona.corePrinciples[0]}" while keeping their communication style in mind: ${persona.communicationStyle}`,
        blindSpotWarning: `${persona.blindSpots[0] ?? 'This style can backfire if applied rigidly without adapting to the other person.'} In high-stakes tension, relying exclusively on this pattern could leave important emotional or practical context unaddressed.`,
      },
      suggestedResponse: `Thank you for raising this. Regarding ${situation.title.replace(/\.+$/, '').toLowerCase()}, my aim is ${situation.desiredOutcome.replace(/\.+$/, '').toLowerCase()}. Let us walk through the concrete facts together and agree on a clear, workable next step.`,
      realityCheck: {
        assessment: `Compared with the Evidence Library, this approach pairs structured problem-solving (strength: ${ev1.evidenceStrength}) with boundary framing (strength: ${ev2.evidenceStrength}).`,
        evidenceIdsUsed: usedIds,
        researchComparison: `${ev1.id} (${ev1.name}, strength: ${ev1.evidenceStrength}): helps by focusing on shared interests and lowering defensiveness before problem-solving. ${ev2.id} (${ev2.name}, strength: ${ev2.evidenceStrength}): carries a risk if power asymmetry or thin empirical support limits how well it holds under pressure.`,
        risksAndLimits: `${ev1.limits} ${ev2.limits}`,
      },
    };
  }

  return postApiJson<AnalysisGenerationResult>(
    '/api/analyze',
    {
      situation,
      ...buildPersonaPayload(persona),
    },
    'The AI analysis service is temporarily unavailable. Please wait a moment and try again.'
  );
}

/** Runs two distinct persona analyses in parallel for the same situation via Compare View. */
export async function requestCompareAnalysis(
  situation: SituationInput,
  personaA: Persona,
  personaB: Persona,
  evidenceLibrary: EvidenceItem[],
  previewMode = false
): Promise<{ left: AnalysisGenerationResult; right: AnalysisGenerationResult }> {
  if (previewMode) {
    const [left, right] = await Promise.all([
      requestLivingYourDayAnalysis(situation, personaA, evidenceLibrary, true),
      requestLivingYourDayAnalysis(situation, personaB, evidenceLibrary, true),
    ]);
    return { left, right };
  }

  return postApiJson<{ left: AnalysisGenerationResult; right: AnalysisGenerationResult }>(
    '/api/analyze-compare',
    {
      situation,
      ...(CURATED_PERSONA_IDS.has(personaA.id)
        ? { personaAId: personaA.id }
        : { personaA }),
      ...(CURATED_PERSONA_IDS.has(personaB.id)
        ? { personaBId: personaB.id }
        : { personaB }),
    },
    'The AI comparison service is temporarily unavailable. Please wait a moment and try again.',
    45_000
  );
}

/** Sends a practice message in Larp Mode and returns the counterpart reply and coaching note. */
export async function requestRehearsalTurn(
  situation: SituationInput,
  persona: Persona,
  evidenceLibrary: EvidenceItem[],
  history: RehearsalMessage[],
  userMessage: string,
  previewMode = false
): Promise<RehearsalTurnResult> {
  if (previewMode) {
    if (PREVIEW_SAFETY_PATTERN.test(userMessage)) {
      return {
        isSafetyAlert: true,
        safetyMessage: PREVIEW_SAFETY_MESSAGE,
        otherPersonReply: '',
        coachNote: '',
      };
    }

    const ev = evidenceLibrary[0];
    return {
      isSafetyAlert: false,
      safetyMessage: '',
      otherPersonReply: `I appreciate you trying to work this out, though as ${situation.otherPersonRole} I still feel real urgency on my end. What specifically are you proposing we change first?`,
      coachNote: `Through the lens of ${persona.name}, your turn stayed focused on "${situation.desiredOutcome}". Relating to ${ev.id} (${ev.name}, strength: ${ev.evidenceStrength}), restate what ${situation.otherPersonRole} values first—this helps lower defensiveness before making your concrete ask.`,
    };
  }

  return postApiJson<RehearsalTurnResult>(
    '/api/rehearse/turn',
    {
      situation,
      ...buildPersonaPayload(persona),
      history,
      userMessage,
    },
    'The rehearsal service is temporarily unavailable. Please wait a moment and try again.'
  );
}

/** Requests a final coaching debrief summarizing a completed Larp Mode rehearsal transcript. */
export async function requestRehearsalFeedback(
  situation: SituationInput,
  persona: Persona,
  evidenceLibrary: EvidenceItem[],
  messages: RehearsalMessage[],
  previewMode = false
): Promise<{ feedback: string }> {
  if (previewMode) {
    return {
      feedback: `Through the lens of ${persona.name}, across ${messages.filter((m) => m.role === 'user').length} turn(s) you stayed oriented toward "${situation.desiredOutcome}". ${evidenceLibrary[0].id} (${evidenceLibrary[0].name}, strength: ${evidenceLibrary[0].evidenceStrength}) suggests pairing reflection with one specific next step. ${MANDATORY_INTERPRETATION_NOTE}`,
    };
  }

  return postApiJson<{ feedback: string }>(
    '/api/rehearse/feedback',
    {
      situation,
      ...buildPersonaPayload(persona),
      messages,
    },
    'Could not generate rehearsal feedback right now. Please wait a moment and try again.'
  );
}
