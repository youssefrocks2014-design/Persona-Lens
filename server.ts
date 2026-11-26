import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import {
  verifyFirebaseBearerToken,
  warmGooglePublicCerts,
  type VerifiedFirebaseUser,
} from './server/auth.ts';
import {
  resolveServerEvidenceLibrary,
  resolveServerPersona,
} from './server/catalog.ts';
import {
  generateRehearsalFeedback,
  generateRehearsalTurn,
  generateSituationAnalysis,
} from './server/gemini.ts';
import { toFriendlyGeminiError } from './server/modelFallback.ts';
import { aiEndpointRateLimiter } from './server/rateLimit.ts';
import {
  sanitizeSituationInput,
  validateAndSanitizeRehearsalMessages,
  validateSituationInput,
} from './src/utils/validation.ts';
import type { SituationInput } from './src/types/personaLens.ts';

const PORT = Number(process.env.PORT ?? 3000);
const app = express();

app.disable('x-powered-by');
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});
app.use('/api', (_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});
app.use(express.json({ limit: '128kb' }));

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    aiConfigured: Boolean(process.env.GEMINI_API_KEY?.trim()),
  });
});

function isValidSituationShape(raw: unknown): raw is SituationInput {
  return Boolean(
    raw &&
      typeof raw === 'object' &&
      typeof (raw as SituationInput).title === 'string' &&
      typeof (raw as SituationInput).description === 'string' &&
      typeof (raw as SituationInput).desiredOutcome === 'string' &&
      typeof (raw as SituationInput).otherPersonRole === 'string'
  );
}

async function authenticateAndRateLimit(
  req: Request,
  res: Response
): Promise<VerifiedFirebaseUser | null> {
  let verifiedUser: VerifiedFirebaseUser;
  try {
    verifiedUser = await verifyFirebaseBearerToken(req.headers.authorization);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unauthorized';
    res.status(401).json({ error: message });
    return null;
  }

  const limit = aiEndpointRateLimiter.check(verifiedUser.uid);
  if (!limit.allowed) {
    res.setHeader('Retry-After', String(limit.retryAfterSeconds));
    res.status(429).json({
      error: `Too many analysis requests right now. Please wait about ${limit.retryAfterSeconds} seconds and try again.`,
    });
    return null;
  }

  return verifiedUser;
}

app.post('/api/analyze', async (req: Request, res: Response) => {
  const user = await authenticateAndRateLimit(req, res);
  if (!user) return;

  try {
    const body = req.body as {
      situation?: unknown;
      personaId?: unknown;
      persona?: unknown;
      evidenceLibrary?: unknown;
    };

    const resolvedPersona = resolveServerPersona({
      personaId: body?.personaId,
      persona: body?.persona,
    });

    if (!isValidSituationShape(body?.situation) || !resolvedPersona) {
      res.status(400).json({
        error: 'Valid situation and database persona card are required.',
      });
      return;
    }

    const cleanSituation = sanitizeSituationInput(body.situation);
    const validationErrors = validateSituationInput(cleanSituation, resolvedPersona.id);
    if (Object.keys(validationErrors).length > 0) {
      res.status(400).json({
        error: Object.values(validationErrors)[0],
        validationErrors,
      });
      return;
    }

    const resolvedEvidence = resolveServerEvidenceLibrary(body?.evidenceLibrary);
    if (!resolvedEvidence) {
      res.status(400).json({
        error: 'Valid evidence library items from the database are required.',
      });
      return;
    }

    const analysis = await generateSituationAnalysis(
      cleanSituation,
      resolvedPersona,
      resolvedEvidence,
      user.uid
    );
    res.json(analysis);
  } catch (err) {
    const friendly = toFriendlyGeminiError(err, { triedFallbacks: true });
    res.status(friendly.statusCode).json({ error: friendly.message });
  }
});

app.post('/api/analyze-compare', async (req: Request, res: Response) => {
  const user = await authenticateAndRateLimit(req, res);
  if (!user) return;

  try {
    const body = req.body as {
      situation?: unknown;
      personaAId?: unknown;
      personaBId?: unknown;
      personaA?: unknown;
      personaB?: unknown;
      evidenceLibrary?: unknown;
    };

    const personaA = resolveServerPersona({
      personaId: body?.personaAId,
      persona: body?.personaA,
    });
    const personaB = resolveServerPersona({
      personaId: body?.personaBId,
      persona: body?.personaB,
    });

    if (!isValidSituationShape(body?.situation) || !personaA || !personaB) {
      res.status(400).json({
        error: 'Valid situation and two distinct database persona cards are required.',
      });
      return;
    }

    if (personaA.id === personaB.id) {
      res.status(400).json({
        error: 'Please choose two distinct personas to compare.',
      });
      return;
    }

    const cleanSituation = sanitizeSituationInput(body.situation);
    const validationErrors = validateSituationInput(cleanSituation, personaA.id);
    if (Object.keys(validationErrors).length > 0) {
      res.status(400).json({
        error: Object.values(validationErrors)[0],
        validationErrors,
      });
      return;
    }

    const resolvedEvidence = resolveServerEvidenceLibrary(body?.evidenceLibrary);
    if (!resolvedEvidence) {
      res.status(400).json({
        error: 'Valid evidence library items from the database are required.',
      });
      return;
    }

    const [left, right] = await Promise.all([
      generateSituationAnalysis(cleanSituation, personaA, resolvedEvidence, user.uid),
      generateSituationAnalysis(cleanSituation, personaB, resolvedEvidence, user.uid),
    ]);

    res.json({ left, right });
  } catch (err) {
    const friendly = toFriendlyGeminiError(err, { triedFallbacks: true });
    res.status(friendly.statusCode).json({ error: friendly.message });
  }
});

app.post('/api/rehearse/turn', async (req: Request, res: Response) => {
  const user = await authenticateAndRateLimit(req, res);
  if (!user) return;

  try {
    const body = req.body as {
      situation?: unknown;
      personaId?: unknown;
      persona?: unknown;
      evidenceLibrary?: unknown;
      history?: unknown;
      userMessage?: unknown;
    };

    const resolvedPersona = resolveServerPersona({
      personaId: body?.personaId,
      persona: body?.persona,
    });

    if (!isValidSituationShape(body?.situation) || !resolvedPersona) {
      res.status(400).json({ error: 'Valid situation and persona card are required.' });
      return;
    }

    const cleanSituation = sanitizeSituationInput(body.situation);
    const validationErrors = validateSituationInput(cleanSituation, resolvedPersona.id);
    if (Object.keys(validationErrors).length > 0) {
      res.status(400).json({
        error: Object.values(validationErrors)[0],
        validationErrors,
      });
      return;
    }

    const resolvedEvidence = resolveServerEvidenceLibrary(body?.evidenceLibrary);
    if (!resolvedEvidence) {
      res.status(400).json({ error: 'Valid evidence library from database is required.' });
      return;
    }

    const userMessage = typeof body.userMessage === 'string' ? body.userMessage.trim() : '';
    if (userMessage.length < 1 || userMessage.length > 4000) {
      res.status(400).json({ error: 'Reply message must be between 1 and 4000 characters.' });
      return;
    }

    const historyValidation = validateAndSanitizeRehearsalMessages(body.history);
    if (!historyValidation.valid) {
      res.status(400).json({ error: historyValidation.error ?? 'Invalid rehearsal history.' });
      return;
    }

    const turnResult = await generateRehearsalTurn(
      cleanSituation,
      resolvedPersona,
      resolvedEvidence,
      historyValidation.messages,
      userMessage
    );
    res.json(turnResult);
  } catch (err) {
    const friendly = toFriendlyGeminiError(err, { triedFallbacks: true });
    res.status(friendly.statusCode).json({ error: friendly.message });
  }
});

app.post('/api/rehearse/feedback', async (req: Request, res: Response) => {
  const user = await authenticateAndRateLimit(req, res);
  if (!user) return;

  try {
    const body = req.body as {
      situation?: unknown;
      personaId?: unknown;
      persona?: unknown;
      evidenceLibrary?: unknown;
      messages?: unknown;
    };

    const resolvedPersona = resolveServerPersona({
      personaId: body?.personaId,
      persona: body?.persona,
    });

    if (!isValidSituationShape(body?.situation) || !resolvedPersona) {
      res.status(400).json({ error: 'Valid situation and persona card are required.' });
      return;
    }

    const cleanSituation = sanitizeSituationInput(body.situation);
    const validationErrors = validateSituationInput(cleanSituation, resolvedPersona.id);
    if (Object.keys(validationErrors).length > 0) {
      res.status(400).json({
        error: Object.values(validationErrors)[0],
        validationErrors,
      });
      return;
    }

    const resolvedEvidence = resolveServerEvidenceLibrary(body?.evidenceLibrary);
    if (!resolvedEvidence) {
      res.status(400).json({ error: 'Valid evidence library from database is required.' });
      return;
    }

    const messagesValidation = validateAndSanitizeRehearsalMessages(body.messages, {
      requireNonEmpty: true,
    });
    if (!messagesValidation.valid) {
      res.status(400).json({
        error: messagesValidation.error ?? 'Rehearsal transcript must have at least one exchange.',
      });
      return;
    }

    const result = await generateRehearsalFeedback(
      cleanSituation,
      resolvedPersona,
      resolvedEvidence,
      messagesValidation.messages
    );
    res.json(result);
  } catch (err) {
    const friendly = toFriendlyGeminiError(err, { triedFallbacks: true });
    res.status(friendly.statusCode).json({ error: friendly.message });
  }
});

app.use(
  '/api',
  (
    err: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction
  ) => {
    const record = err && typeof err === 'object' ? (err as { type?: string; status?: number }) : {};
    if (record.type === 'entity.too.large' || record.status === 413) {
      res.status(413).json({ error: 'Request payload is too large.' });
      return;
    }
    if (err instanceof SyntaxError || record.type === 'entity.parse.failed') {
      res.status(400).json({ error: 'Invalid JSON request body.' });
      return;
    }
    res.status(500).json({ error: 'Unexpected API server error. Please try again.' });
  }
);

async function startServer() {
  const distPath = path.resolve(process.cwd(), 'dist');
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd && fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PersonaLens server listening on http://0.0.0.0:${PORT}`);
    void warmGooglePublicCerts().catch(() => undefined);
  });
}

if (!process.env.VERCEL) {
  startServer().catch((err) => {
    console.error('Failed to start PersonaLens server:', err);
    process.exit(1);
  });
}

export default app;

