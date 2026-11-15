import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export interface DecodedFirebaseIdToken {
  uid: string;
  email?: string;
  name?: string;
  aud: string;
  iss: string;
  sub: string;
  exp: number;
  iat: number;
  auth_time?: number;
}

const FIREBASE_CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

let cachedCerts: Record<string, string> | null = null;
let cachedCertsExpiresAtMs = 0;

export function resolveFirebaseProjectId(): string {
  if (process.env.FIREBASE_PROJECT_ID?.trim()) {
    return process.env.FIREBASE_PROJECT_ID.trim();
  }
  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8')) as {
      projectId?: string;
    };
    if (parsed.projectId) {
      return parsed.projectId;
    }
  } catch {
    // Fallback below if config file is omitted in serverless environment
  }
  return 'advance-creek-cwk2q';
}

function decodeBase64UrlJson<T>(segment: string): T {
  const json = Buffer.from(segment, 'base64url').toString('utf8');
  return JSON.parse(json) as T;
}

export function verifyFirebaseJwtWithCerts(
  token: string,
  projectId: string,
  certs: Record<string, string>,
  nowSeconds = Math.floor(Date.now() / 1000),
): DecodedFirebaseIdToken {
  const parts = token.split('.');
  if (parts.length !== 3 || parts.some((p) => !p)) {
    throw new Error('Malformed Firebase ID token.');
  }

  const [headerB64, payloadB64, signatureB64] = parts;
  const header = decodeBase64UrlJson<{ alg?: string; kid?: string }>(headerB64);

  if (header.alg !== 'RS256') {
    throw new Error('Unexpected Firebase ID token algorithm.');
  }
  if (typeof header.kid !== 'string' || !header.kid || !certs[header.kid]) {
    const err = new Error('Unknown Firebase ID token key ID.');
    err.name = 'UnknownKidError';
    throw err;
  }

  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${headerB64}.${payloadB64}`);
  verifier.end();
  const signature = Buffer.from(signatureB64, 'base64url');
  const isValidSignature = verifier.verify(certs[header.kid], signature);
  if (!isValidSignature) {
    throw new Error('Invalid Firebase ID token signature.');
  }

  const payload = decodeBase64UrlJson<Record<string, unknown>>(payloadB64);
  const expectedIssuer = `https://securetoken.google.com/${projectId}`;

  if (payload.aud !== projectId) {
    throw new Error('Invalid Firebase ID token audience.');
  }
  if (payload.iss !== expectedIssuer) {
    throw new Error('Invalid Firebase ID token issuer.');
  }
  if (
    typeof payload.sub !== 'string' ||
    payload.sub.length === 0 ||
    payload.sub.length > 128
  ) {
    throw new Error('Invalid Firebase ID token subject.');
  }
  if (typeof payload.exp !== 'number' || payload.exp <= nowSeconds) {
    throw new Error('Firebase ID token has expired.');
  }
  if (typeof payload.iat !== 'number' || payload.iat > nowSeconds + 300) {
    throw new Error('Firebase ID token issued-at time is in the future.');
  }
  if (
    payload.auth_time !== undefined &&
    (typeof payload.auth_time !== 'number' || payload.auth_time > nowSeconds + 300)
  ) {
    throw new Error('Firebase ID token auth_time is invalid.');
  }

  return {
    uid: payload.sub,
    email: typeof payload.email === 'string' ? payload.email : undefined,
    name: typeof payload.name === 'string' ? payload.name : undefined,
    aud: payload.aud,
    iss: payload.iss,
    sub: payload.sub,
    exp: payload.exp,
    iat: payload.iat,
    auth_time:
      typeof payload.auth_time === 'number' ? payload.auth_time : undefined,
  };
}

async function fetchFirebasePublicCerts(
  forceRefresh = false,
): Promise<Record<string, string>> {
  const nowMs = Date.now();
  if (!forceRefresh && cachedCerts && nowMs < cachedCertsExpiresAtMs) {
    return cachedCerts;
  }

  const response = await fetch(FIREBASE_CERTS_URL);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch Firebase public certificates (${response.status}).`,
    );
  }

  const certs = (await response.json()) as Record<string, string>;
  const cacheControl = response.headers.get('cache-control') ?? '';
  const maxAgeMatch = /max-age=(\d+)/i.exec(cacheControl);
  const maxAgeSec = maxAgeMatch ? Number(maxAgeMatch[1]) : 3600;

  cachedCerts = certs;
  cachedCertsExpiresAtMs = nowMs + Math.max(60, maxAgeSec) * 1000;
  return certs;
}

export async function verifyFirebaseIdToken(
  token: string,
): Promise<DecodedFirebaseIdToken> {
  const projectId = resolveFirebaseProjectId();
  const certs = await fetchFirebasePublicCerts(false);
  try {
    return verifyFirebaseJwtWithCerts(token, projectId, certs);
  } catch (err) {
    if (err instanceof Error && err.name === 'UnknownKidError') {
      const freshCerts = await fetchFirebasePublicCerts(true);
      return verifyFirebaseJwtWithCerts(token, projectId, freshCerts);
    }
    throw err;
  }
}
