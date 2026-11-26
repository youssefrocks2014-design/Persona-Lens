import test from 'node:test';
import assert from 'node:assert/strict';
import { SAMPLE_SITUATIONS } from '../data/sampleSituations.ts';
import { SEED_EVIDENCE_LIBRARY } from '../data/seedCatalog.ts';
import {
  classifyCitedEvidenceEffect,
  getEvidenceStrengthBadge,
  getEvidenceStrengthTier,
} from './evidenceDisplay.ts';
import { validateSituationInput } from './validation.ts';

test('SAMPLE_SITUATIONS provides 3 presets that satisfy all situation validation bounds', () => {
  assert.equal(SAMPLE_SITUATIONS.length, 3);
  for (const preset of SAMPLE_SITUATIONS) {
    const errors = validateSituationInput(preset.input, 'marcus-aurelius');
    assert.deepEqual(errors, {}, `Sample preset ${preset.id} had validation errors`);
  }
});

test('getEvidenceStrengthTier and badge classify strong, moderate, and low to limited', () => {
  assert.equal(getEvidenceStrengthTier('strong'), 'strong');
  assert.equal(getEvidenceStrengthTier('strong (in clinical contexts)'), 'strong');
  assert.equal(getEvidenceStrengthTier('moderate'), 'moderate');
  assert.equal(getEvidenceStrengthTier('moderate; lab and field studies'), 'moderate');
  assert.equal(getEvidenceStrengthTier('low to limited'), 'low');

  const strongBadge = getEvidenceStrengthBadge('strong');
  const modBadge = getEvidenceStrengthBadge('moderate; lab and field studies');
  const lowBadge = getEvidenceStrengthBadge('low to limited');

  assert.equal(strongBadge.label, 'strong');
  assert.equal(modBadge.label, 'moderate; lab and field studies');
  assert.equal(lowBadge.label, 'low to limited');
  assert.notEqual(strongBadge.badgeClass, modBadge.badgeClass);
  assert.notEqual(modBadge.badgeClass, lowBadge.badgeClass);
});

test('classifyCitedEvidenceEffect distinguishes helps, risks, and neutral per cited entry', () => {
  const byId = new Map(SEED_EVIDENCE_LIBRARY.map((e) => [e.id, e]));
  const evHelp = byId.get('principled-negotiation')!;
  const evRisk = byId.get('dear-man-assertiveness')!;
  const evNeutral = byId.get('nonviolent-communication')!;

  const realityCheck = {
    assessment: 'Mixed empirical backing.',
    evidenceIdsUsed: [evHelp.id, evRisk.id, evNeutral.id],
    researchComparison:
      'principled-negotiation (Principled negotiation, strength: moderate; widely used, empirical support mixed): helps by shifting the talk to shared interests. dear-man-assertiveness (DEAR MAN assertiveness, strength: moderate): carries a risk if power asymmetry makes firm demands backfire. nonviolent-communication (Nonviolent Communication (NVC), strength: low to limited): is neutral here with thin direct empirical backing.',
    risksAndLimits: 'Watch for power dynamics.',
  };

  assert.equal(classifyCitedEvidenceEffect(evHelp, realityCheck).effect, 'helps');
  assert.equal(classifyCitedEvidenceEffect(evRisk, realityCheck).effect, 'risks');
  assert.equal(classifyCitedEvidenceEffect(evNeutral, realityCheck).effect, 'neutral');
});
