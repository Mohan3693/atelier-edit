import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { verifyFirebaseJwtWithCerts } from './firebase-admin.ts';

function signRs256Jwt(
  header: Record<string, unknown>,
  payload: Record<string, unknown>,
  privateKey: crypto.KeyObject,
): string {
  const h = Buffer.from(JSON.stringify(header)).toString('base64url');
  const p = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(`${h}.${p}`);
  signer.end();
  const sig = signer.sign(privateKey).toString('base64url');
  return `${h}.${p}.${sig}`;
}

test('verifyFirebaseJwtWithCerts validates RS256 Firebase ID tokens and rejects invalid claims', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
  });
  const publicPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
  const certs = { 'kid-1': publicPem };
  const projectId = 'advance-creek-cwk2q';
  const now = 1_760_000_000;

  const validToken = signRs256Jwt(
    { alg: 'RS256', kid: 'kid-1', typ: 'JWT' },
    {
      aud: projectId,
      iss: `https://securetoken.google.com/${projectId}`,
      sub: 'user-uid-123',
      email: 'stylist@example.com',
      name: 'Atelier Client',
      iat: now - 60,
      exp: now + 3600,
      auth_time: now - 60,
    },
    privateKey,
  );

  const decoded = verifyFirebaseJwtWithCerts(validToken, projectId, certs, now);
  assert.equal(decoded.uid, 'user-uid-123');
  assert.equal(decoded.email, 'stylist@example.com');
  assert.equal(decoded.name, 'Atelier Client');

  const expiredToken = signRs256Jwt(
    { alg: 'RS256', kid: 'kid-1' },
    {
      aud: projectId,
      iss: `https://securetoken.google.com/${projectId}`,
      sub: 'user-uid-123',
      iat: now - 4000,
      exp: now - 10,
    },
    privateKey,
  );
  assert.throws(
    () => verifyFirebaseJwtWithCerts(expiredToken, projectId, certs, now),
    /expired/,
  );

  const wrongAudToken = signRs256Jwt(
    { alg: 'RS256', kid: 'kid-1' },
    {
      aud: 'wrong-project',
      iss: `https://securetoken.google.com/${projectId}`,
      sub: 'user-uid-123',
      iat: now - 60,
      exp: now + 3600,
    },
    privateKey,
  );
  assert.throws(
    () => verifyFirebaseJwtWithCerts(wrongAudToken, projectId, certs, now),
    /audience/,
  );

  assert.throws(
    () => verifyFirebaseJwtWithCerts(`${validToken}tamper`, projectId, certs, now),
    /signature/,
  );
});
