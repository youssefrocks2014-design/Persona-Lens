import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
const blueprintPath = path.resolve(process.cwd(), 'firebase-blueprint.json');
const rulesContent = fs.readFileSync(rulesPath, 'utf8');
const blueprint = JSON.parse(fs.readFileSync(blueprintPath, 'utf8'));

test('firestore.rules defines default-deny safety net and covers every blueprint collection', () => {
  assert.match(rulesContent, /rules_version\s*=\s*'2'/);
  assert.match(rulesContent, /match \/\{document=\*\*\}[\s\S]*allow read, write: if false;/);

  for (const collectionPath of Object.keys(blueprint.firestore)) {
    const collectionName = collectionPath.split('/')[1];
    assert.ok(
      rulesContent.includes(`match /${collectionName}/`),
      `Missing match block for collection ${collectionName}`
    );
  }
});

test('firestore.rules enforces verified users, owner scoping on list, and read-only personas/evidence', () => {
  assert.match(rulesContent, /request\.auth\.token\.email_verified == true/);
  assert.match(rulesContent, /match \/personas\/\{personaId\}[\s\S]*allow get: if isSignedIn\(\)/);
  assert.match(rulesContent, /match \/evidenceLibrary\/\{evidenceId\}[\s\S]*allow get: if isSignedIn\(\)/);
  assert.match(rulesContent, /allow list: if isSignedIn\(\) && resource\.data\.userId == request\.auth\.uid;/);
  assert.match(rulesContent, /allow update: if false;/);
});

test('firestore.rules enforces Dirty Dozen structural invariants (keys().hasOnly, isValidId, request.time, terminal lock)', () => {
  assert.match(rulesContent, /keys\(\)\.hasOnly\(/);
  assert.match(rulesContent, /isValidId\(/);
  assert.match(rulesContent, /request\.time/);
  assert.match(rulesContent, /existing\(\)\.feedback == ''/);
  assert.match(rulesContent, /affectedKeys\(\)\.hasOnly\(/);
});

test('firestore.rules allowlists the curated 7 persona IDs and 9 evidence IDs', () => {
  const expectedPersonas = [
    'marcus-aurelius',
    'nelson-mandela',
    'abraham-lincoln',
    'marie-curie',
    'ibn-khaldun',
    'benjamin-franklin',
    'frederick-douglass',
  ];
  for (const id of expectedPersonas) {
    assert.ok(rulesContent.includes(`'${id}'`), `Missing persona ID ${id} in firestore.rules`);
  }

  const expectedEvidence = [
    'active-reflective-listening',
    'motivational-interviewing',
    'dear-man-assertiveness',
    'principled-negotiation',
    'softened-startup-repair',
    'perspective-getting',
    'affect-labeling',
    'implementation-intentions',
    'nonviolent-communication',
  ];
  for (const id of expectedEvidence) {
    assert.ok(rulesContent.includes(`'${id}'`), `Missing evidence ID ${id} in firestore.rules`);
  }
});

test('firestore.rules allows empty evidenceIdsUsed when no evidence in the library matches', () => {
  assert.ok(
    rulesContent.includes('isValidStringList(rc.evidenceIdsUsed, 0, 8, 128)'),
    'Expected evidenceIdsUsed minLength 0 in firestore.rules'
  );
});
