import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildLivingYourDayPrompt,
  buildRehearsalTurnPrompt,
  DEFAULT_SAFETY_SUPPORT_MESSAGE,
  NO_MATCHING_EVIDENCE_TEXT,
  parseLivingYourDayResponse,
  parseRehearsalTurnResponse,
} from './prompts.ts';
import {
  MANDATORY_INTERPRETATION_NOTE,
  SEED_EVIDENCE_LIBRARY,
  SEED_PERSONAS,
} from '../src/data/seedCatalog.ts';

const sampleSituation = {
  title: 'Deadline pushback with product lead',
  description:
    'The product lead asked to double sprint scope two days before freeze without cutting any existing deliverables.',
  desiredOutcome: 'Defer secondary items to next sprint while keeping working trust.',
  otherPersonRole: 'Senior Product Manager',
};

test('buildLivingYourDayPrompt encodes Master Instructions, third-person rule, safety rule, and exact database cards', () => {
  const persona = SEED_PERSONAS[0];
  const { systemInstruction, userPrompt } = buildLivingYourDayPrompt(
    sampleSituation,
    persona,
    SEED_EVIDENCE_LIBRARY
  );

  assert.ok(systemInstruction.includes('Through the lens of...'));
  assert.ok(systemInstruction.includes('Never invent or quote words they said or wrote'));
  assert.ok(systemInstruction.includes(NO_MATCHING_EVIDENCE_TEXT));
  assert.ok(systemInstruction.includes('self-harm, abuse, or immediate danger'));
  assert.ok(systemInstruction.includes('isSafetyAlert'));
  assert.ok(systemInstruction.includes(MANDATORY_INTERPRETATION_NOTE));
  assert.ok(systemInstruction.includes('not therapy, medical, or legal advice'));
  assert.ok(userPrompt.includes(persona.name));
  assert.ok(userPrompt.includes(persona.sources[0]));
  assert.ok(userPrompt.includes(SEED_EVIDENCE_LIBRARY[0].id));
});

test('parseLivingYourDayResponse validates evidenceIdsUsed, preserves note, and keeps normal safety state false', () => {
  const persona = SEED_PERSONAS[1];
  const raw = JSON.stringify({
    isSafetyAlert: false,
    safetyMessage: '',
    note: MANDATORY_INTERPRETATION_NOTE,
    personaView: {
      framing: 'Through the lens of Nelson Mandela, frame the conversation around shared human constraints and realistic pacing.',
      principleApplication: 'Listen to the pressure driving the product lead before proposing trade-offs.',
      blindSpotWarning: 'Avoid letting empathy soften the technical delivery risk too far.',
    },
    suggestedResponse:
      'I hear how important the launch visibility is this week. Let us review which two items matter most so quality holds.',
    realityCheck: {
      assessment: 'Strong match with interest-based negotiation and gentle startup principles.',
      evidenceIdsUsed: ['nonexistent-theory', 'principled-negotiation', 'dear-man-assertiveness'],
      researchComparison: 'Separating people from the delivery constraint reduces defensive pushback.',
      risksAndLimits: 'Requires clear escalation if scope remains non-negotiable.',
    },
  });

  const parsed = parseLivingYourDayResponse(raw, persona, SEED_EVIDENCE_LIBRARY);
  assert.equal(parsed.isSafetyAlert, false);
  assert.equal(parsed.safetyMessage, '');
  assert.equal(parsed.note, MANDATORY_INTERPRETATION_NOTE);
  assert.deepEqual(parsed.realityCheck.evidenceIdsUsed, [
    'principled-negotiation',
    'dear-man-assertiveness',
  ]);
  assert.ok(parsed.suggestedResponse.includes('launch visibility'));
});

test('parseLivingYourDayResponse returns [] and "No matching evidence in the library." when no library entries apply', () => {
  const persona = SEED_PERSONAS[3];
  const raw = JSON.stringify({
    isSafetyAlert: false,
    safetyMessage: '',
    personaView: {
      framing: 'Through the lens of Marie Curie, rely on verified data rather than speculation.',
      principleApplication: 'Focus steadily on measurable experimental checkpoints.',
      blindSpotWarning: 'Reserved delivery may seem detached to impatient colleagues.',
    },
    suggestedResponse: 'Let us inspect the measured baseline numbers together before committing to a timeline.',
    realityCheck: {
      assessment: 'No matching evidence in the library.',
      evidenceIdsUsed: ['hallucinated-framework'],
      researchComparison: 'No matching evidence in the library.',
      risksAndLimits: 'Purely analytical responses may overlook relational tension.',
    },
  });

  const parsed = parseLivingYourDayResponse(raw, persona, SEED_EVIDENCE_LIBRARY);
  assert.deepEqual(parsed.realityCheck.evidenceIdsUsed, []);
  assert.equal(parsed.realityCheck.researchComparison, NO_MATCHING_EVIDENCE_TEXT);
});

test('parseLivingYourDayResponse handles safety alerts without producing persona analysis', () => {
  const persona = SEED_PERSONAS[0];
  const raw = JSON.stringify({
    isSafetyAlert: true,
    safetyMessage: 'Please reach out to a trusted person or local emergency support services right now.',
    personaView: {
      framing: 'Ignored framing',
      principleApplication: 'Ignored principle',
      blindSpotWarning: 'Ignored blind spot',
    },
    suggestedResponse: 'Ignored suggestion',
    realityCheck: {
      assessment: 'Ignored assessment',
      evidenceIdsUsed: ['affect-labeling'],
      researchComparison: 'Ignored comparison',
      risksAndLimits: 'Ignored limits',
    },
  });

  const parsed = parseLivingYourDayResponse(raw, persona, SEED_EVIDENCE_LIBRARY);
  assert.equal(parsed.isSafetyAlert, true);
  assert.ok(parsed.safetyMessage.includes('trusted person'));
  assert.equal(parsed.suggestedResponse, '');
  assert.deepEqual(parsed.realityCheck.evidenceIdsUsed, []);
  assert.equal(parsed.note, MANDATORY_INTERPRETATION_NOTE);

  const fallbackSafety = parseLivingYourDayResponse(
    JSON.stringify({ isSafetyAlert: true, safetyMessage: 'ok' }),
    persona,
    SEED_EVIDENCE_LIBRARY
  );
  assert.equal(fallbackSafety.safetyMessage, DEFAULT_SAFETY_SUPPORT_MESSAGE);
});

test('buildRehearsalTurnPrompt and parseRehearsalTurnResponse support normal turns and safety alerts', () => {
  const persona = SEED_PERSONAS[2];
  const { systemInstruction, userPrompt } = buildRehearsalTurnPrompt(
    sampleSituation,
    persona,
    SEED_EVIDENCE_LIBRARY,
    [
      {
        role: 'user',
        text: 'Can we walk through the sprint priorities together?',
        timestamp: '2026-11-21T10:00:00Z',
      },
    ],
    'Which single metric matters most for Friday?'
  );

  assert.match(systemInstruction, /otherPersonReply/);
  assert.match(systemInstruction, /coachNote/);
  assert.ok(systemInstruction.includes('never invent or quote words they said or wrote'));
  assert.ok(userPrompt.includes('Which single metric matters most for Friday?'));
  assert.ok(userPrompt.includes(persona.name));

  const normalTurn = parseRehearsalTurnResponse(
    JSON.stringify({
      isSafetyAlert: false,
      safetyMessage: '',
      otherPersonReply: 'I need the dashboard demo ready by Friday morning.',
      coachNote: 'Through the lens of Abraham Lincoln, acknowledge the pressure behind the demo before proposing trade-offs.',
    }),
    sampleSituation,
    persona
  );
  assert.equal(normalTurn.isSafetyAlert, false);
  assert.ok(normalTurn.otherPersonReply.includes('Friday morning'));
  assert.ok(normalTurn.coachNote.includes('Abraham Lincoln'));

  const safetyTurn = parseRehearsalTurnResponse(
    JSON.stringify({
      isSafetyAlert: true,
      safetyMessage: 'Please pause and contact someone you trust or local support services immediately.',
      otherPersonReply: 'Should be cleared',
      coachNote: 'Should be cleared',
    }),
    sampleSituation,
    persona
  );
  assert.equal(safetyTurn.isSafetyAlert, true);
  assert.ok(safetyTurn.safetyMessage.includes('local support services'));
  assert.equal(safetyTurn.otherPersonReply, '');
  assert.equal(safetyTurn.coachNote, '');
});
