import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
const blueprintPath = path.resolve(process.cwd(), 'firebase-blueprint.json');

test('firestore.rules covers every collection in firebase-blueprint.json with default-deny catch-all', () => {
  const rules = fs.readFileSync(rulesPath, 'utf8');
  const blueprint = JSON.parse(fs.readFileSync(blueprintPath, 'utf8'));

  assert.match(rules, /rules_version = '2';/);
  assert.match(rules, /match \/\{document=\*\*\} \{\s*allow read, write: if false;\s*\}/);
  assert.match(rules, /request\.auth\.token\.email_verified == true/);

  const collections = Object.keys(blueprint.firestore ?? {});
  assert.equal(collections.length, 5);
  for (const collectionPath of collections) {
    assert.ok(
      rules.includes(`match ${collectionPath}`),
      `Missing rule block for ${collectionPath}`,
    );
  }
});

test('firestore.rules enforces Dirty Dozen invariants: id regex, strict keys, array bounds, and server timestamps', () => {
  const rules = fs.readFileSync(rulesPath, 'utf8');
  assert.match(rules, /function isValidId\(id\)/);
  assert.match(rules, /function isValidWardrobeItemDoc\(data, userId, itemId\)/);
  assert.match(rules, /data\.imageDataUrl is string && data\.imageDataUrl\.size\(\) >= 10 && data\.imageDataUrl\.size\(\) <= 180000/);
  assert.match(rules, /incoming\(\)\.createdAt == request\.time/);
  assert.match(rules, /incoming\(\)\.updatedAt == request\.time/);
  assert.match(rules, /incoming\(\)\.uid == existing\(\)\.uid/);
  assert.match(rules, /affectedKeys\(\)\.hasOnly\(/);
  assert.match(rules, /arr\.size\(\) <= 6/);
  assert.match(rules, /allow list: if isVerifiedOwner\(userId\) && existing\(\)\.uid == request\.auth\.uid;/);
  assert.equal(rules.includes('allow read: if isSignedIn()'), false);
});
