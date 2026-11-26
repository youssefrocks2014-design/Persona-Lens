import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

interface FirebaseConfigFile {
  projectId: string;
}

const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
let cachedProjectId = '';

function getFirebaseProjectId(): string {
  if (cachedProjectId) return cachedProjectId;
  const raw = fs.readFileSync(configPath, 'utf8');
  const parsed = JSON.parse(raw) as FirebaseConfigFile;
  if (!parsed.projectId || parsed.projectId === 'remixed-project-id') {
    throw new Error('Firebase projectId is not configured in firebase-applet-config.json');
  }
  cachedProjectId = parsed.projectId;
  return cachedProjectId;
}

interface CertCache {
  certs: Record<string, string>;
  expiresAt: number;
  lastFetchedAt: number;
}

let certCache: CertCache | null = null;
let inFlightCertFetch: Promise<Record<string, string>> | null = null;

async function getGooglePublicCerts(forceRefresh = false): Promise<Record<string, string>> {
  const now = Date.now();
  if (
    certCache &&
    certCache.expiresAt > now &&
    (!forceRefresh || now - certCache.lastFetchedAt < 60_000)
  ) {
    return certCache.certs;
  }

  if (inFlightCertFetch) {
    return inFlightCertFetch;
  }

  inFlightCertFetch = (async () => {
    const response = await fetch(
      'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com',
      {
        redirect: 'error',
        signal: AbortSignal.timeout(5000),
      }
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch Firebase public signing certificates (${response.status})`);
    }

    const cacheControl = response.headers.get('cache-control') ?? '';
    const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
    const parsedMaxAge = maxAgeMatch ? Number(maxAgeMatch[1]) : 3600;
    const maxAgeSeconds = Number.isFinite(parsedMaxAge)
      ? Math.min(86400, Math.max(60, parsedMaxAge))
      : 3600;

    const certs = (await response.json()) as Record<string, string>;
    const completedAt = Date.now();
    certCache = {
      certs,
      expiresAt: completedAt + maxAgeSeconds * 1000,
      lastFetchedAt: completedAt,
    };
    return certs;
  })();

  try {
    return await inFlightCertFetch;
  } finally {
    inFlightCertFetch = null;
  }
}

export async function warmGooglePublicCerts(): Promise<void> {
  await getGooglePublicCerts(false);
}

function decodeBase64Url(segment: string): Buffer {
  const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (normalized.length % 4)) % 4;
  return Buffer.from(normalized + '='.repeat(padLen), 'base64');
}

function safeParseTokenSegment<T>(segment: string): T {
  try {
    return JSON.parse(decodeBase64Url(segment).toString('utf8')) as T;
  } catch {
    throw new Error('Malformed Firebase ID token.');
  }
}

export interface VerifiedFirebaseUser {
  uid: string;
  email: string;
  emailVerified: boolean;
}

export async function verifyFirebaseBearerToken(
  authorizationHeader: string | undefined
): Promise<VerifiedFirebaseUser> {
  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    throw new Error('Missing Authorization Bearer token.');
  }

  const token = authorizationHeader.slice('Bearer '.length).trim();
  if (token.length < 32 || token.length > 8192) {
    throw new Error('Malformed Firebase ID token.');
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed Firebase ID token.');
  }

  const [headerB64, payloadB64, signatureB64] = parts;
  const header = safeParseTokenSegment<{
    alg?: string;
    kid?: string;
  }>(headerB64);
  const payload = safeParseTokenSegment<{
    aud?: string;
    iss?: string;
    sub?: string;
    exp?: number;
    iat?: number;
    email?: string;
    email_verified?: boolean;
  }>(payloadB64);

  if (header.alg !== 'RS256' || typeof header.kid !== 'string' || header.kid.length === 0) {
    throw new Error('Invalid token algorithm or missing key ID.');
  }

  const projectId = getFirebaseProjectId();
  const expectedIssuer = `https://securetoken.google.com/${projectId}`;
  const nowSeconds = Math.floor(Date.now() / 1000);

  if (payload.aud !== projectId) {
    throw new Error('Firebase ID token audience mismatch.');
  }
  if (payload.iss !== expectedIssuer) {
    throw new Error('Firebase ID token issuer mismatch.');
  }
  if (typeof payload.sub !== 'string' || payload.sub.length === 0 || payload.sub.length > 128) {
    throw new Error('Invalid Firebase ID token subject.');
  }
  if (typeof payload.exp !== 'number' || payload.exp <= nowSeconds) {
    throw new Error('Firebase ID token has expired.');
  }
  if (typeof payload.iat !== 'number' || payload.iat > nowSeconds + 300) {
    throw new Error('Firebase ID token issued-at timestamp is invalid.');
  }

  let certs = await getGooglePublicCerts(false);
  let pem = certs[header.kid];
  if (!pem) {
    certs = await getGooglePublicCerts(true);
    pem = certs[header.kid];
  }
  if (!pem) {
    throw new Error('Signing certificate not found for Firebase token kid.');
  }

  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${headerB64}.${payloadB64}`);
  verifier.end();

  const signature = decodeBase64Url(signatureB64);
  if (!verifier.verify(pem, signature)) {
    throw new Error('Invalid Firebase ID token signature.');
  }

  if (payload.email_verified !== true) {
    throw new Error('Google account email verification is required.');
  }

  return {
    uid: payload.sub,
    email: payload.email ?? '',
    emailVerified: true,
  };
}
