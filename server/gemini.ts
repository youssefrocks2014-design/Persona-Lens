import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import type {
  EvidenceItem,
  Persona,
  RehearsalMessage,
  RehearsalTurnResult,
  SituationInput,
} from '../src/types/personaLens.ts';
import {
  EmptyModelResponseError,
  generateWithModelFallback,
  getThinkingLevelForModel,
} from './modelFallback.ts';
import { userScopedAnalysisCache } from './analysisCache.ts';
import {
  buildLivingYourDayPrompt,
  buildRehearsalFeedbackPrompt,
  buildRehearsalTurnPrompt,
  parseLivingYourDayResponse,
  parseRehearsalTurnResponse,
  type ParsedAnalysisPayload,
} from './prompts.ts';
import { clampText } from '../src/utils/validation.ts';

let cachedClient: GoogleGenAI | null = null;
let cachedApiKey = '';

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured on the server. Add it in Settings > Secrets.'
    );
  }
  if (cachedClient && cachedApiKey === apiKey) {
    return cachedClient;
  }
  cachedApiKey = apiKey;
  cachedClient = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
  return cachedClient;
}

const ANALYSIS_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    isSafetyAlert: {
      type: Type.BOOLEAN,
      description: 'True only for self-harm, abuse, or immediate danger.',
    },
    safetyMessage: {
      type: Type.STRING,
      description: 'Short supportive safety message if isSafetyAlert is true; else "".',
    },
    note: {
      type: Type.STRING,
      description: 'Always: "An interpretation based on public writings, not their actual words."',
    },
    personaView: {
      type: Type.OBJECT,
      properties: {
        framing: {
          type: Type.STRING,
          description: 'Third-person ("Through the lens of...") framing from persona card only; 2-3 sentences.',
        },
        principleApplication: {
          type: Type.STRING,
          description: 'How persona principles and decision pattern apply; 2-3 sentences.',
        },
        blindSpotWarning: {
          type: Type.STRING,
          description: 'Honest backfire check grounded in card blind spots; 2 sentences.',
        },
      },
      required: ['framing', 'principleApplication', 'blindSpotWarning'],
    },
    suggestedResponse: {
      type: Type.STRING,
      description: 'Short, practical draft message or plan in plain language (2-4 sentences).',
    },
    realityCheck: {
      type: Type.OBJECT,
      properties: {
        assessment: {
          type: Type.STRING,
          description: 'Overall comparison vs evidence library with exact strength labels; 2 sentences.',
        },
        evidenceIdsUsed: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Matching IDs from the Evidence Library; [] if none apply.',
        },
        researchComparison: {
          type: Type.STRING,
          description: 'For each cited id and name: helps/risk/neutral + 1-2 sentences + exact strength label, or "No matching evidence in the library.".',
        },
        risksAndLimits: {
          type: Type.STRING,
          description: 'Practical caveats and limits for this situation; 1-2 sentences.',
        },
      },
      required: ['assessment', 'evidenceIdsUsed', 'researchComparison', 'risksAndLimits'],
    },
  },
  required: [
    'isSafetyAlert',
    'safetyMessage',
    'note',
    'personaView',
    'suggestedResponse',
    'realityCheck',
  ],
};

const REHEARSAL_TURN_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    isSafetyAlert: {
      type: Type.BOOLEAN,
      description: 'True only for self-harm, abuse, or immediate danger.',
    },
    safetyMessage: {
      type: Type.STRING,
      description: 'Short supportive safety message when isSafetyAlert is true; else "".',
    },
    otherPersonReply: {
      type: Type.STRING,
      description: 'Natural reply from the other person (empty if safety alert).',
    },
    coachNote: {
      type: Type.STRING,
      description: 'Third-person coaching note using persona card + evidence id, name, strength label.',
    },
  },
  required: ['isSafetyAlert', 'safetyMessage', 'otherPersonReply', 'coachNote'],
};

function buildThinkingConfig(model: string) {
  const level = getThinkingLevelForModel(model);
  if (level === 'MINIMAL') {
    return { thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL } };
  }
  if (level === 'LOW') {
    return { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } };
  }
  return {};
}

function requireNonEmptyModelText(rawText: string | undefined, model: string): string {
  const trimmed = (rawText ?? '').trim();
  if (!trimmed) {
    throw new EmptyModelResponseError(model);
  }
  return trimmed;
}

/**
 * Generates a structured Living Your Day analysis (Persona View, Suggested Response,
 * and Evidence-Based Reality Check) with per-user caching and automatic model fallback.
 */
export async function generateSituationAnalysis(
  situation: SituationInput,
  persona: Persona,
  evidenceLibrary: EvidenceItem[],
  userId?: string
): Promise<ParsedAnalysisPayload> {
  const execute = async (): Promise<ParsedAnalysisPayload> => {
    const ai = getGeminiClient();
    const { systemInstruction, userPrompt } = buildLivingYourDayPrompt(
      situation,
      persona,
      evidenceLibrary
    );

    const { result: responseText } = await generateWithModelFallback(
      async (model, abortSignal) => {
        const response = await ai.models.generateContent({
          model,
          contents: userPrompt,
          config: {
            systemInstruction,
            abortSignal,
            maxOutputTokens: 1200,
            ...buildThinkingConfig(model),
            responseMimeType: 'application/json',
            responseSchema: ANALYSIS_RESPONSE_SCHEMA,
          },
        });
        return requireNonEmptyModelText(response.text, model);
      },
      { operationLabel: '/api/analyze', attemptTimeoutMs: 10000, finalTimeoutMs: 22000 }
    );

    return parseLivingYourDayResponse(responseText, persona, evidenceLibrary);
  };

  if (!userId) {
    return execute();
  }

  const cacheKey = userScopedAnalysisCache.buildKey(userId, persona, situation);
  const { result } = await userScopedAnalysisCache.getOrCompute(cacheKey, execute);
  return result;
}

/**
 * Generates one turn of Larp Mode roleplay: an in-character reply from the counterpart
 * paired with a third-person coaching note grounded in the persona card and evidence library.
 */
export async function generateRehearsalTurn(
  situation: SituationInput,
  persona: Persona,
  evidenceLibrary: EvidenceItem[],
  history: RehearsalMessage[],
  userMessage: string
): Promise<RehearsalTurnResult> {
  const ai = getGeminiClient();
  const { systemInstruction, userPrompt } = buildRehearsalTurnPrompt(
    situation,
    persona,
    evidenceLibrary,
    history,
    userMessage
  );

  const { result: responseText } = await generateWithModelFallback(
    async (model, abortSignal) => {
      const response = await ai.models.generateContent({
        model,
        contents: userPrompt,
        config: {
          systemInstruction,
          abortSignal,
          maxOutputTokens: 600,
          ...buildThinkingConfig(model),
          responseMimeType: 'application/json',
          responseSchema: REHEARSAL_TURN_RESPONSE_SCHEMA,
        },
      });
      return requireNonEmptyModelText(response.text, model);
    },
    { operationLabel: '/api/rehearse/turn', attemptTimeoutMs: 8500, finalTimeoutMs: 18000 }
  );

  return parseRehearsalTurnResponse(responseText, situation, persona);
}

/**
 * Summarizes a completed Larp Mode conversation into final coaching feedback
 * anchored in the persona's style and cited Evidence Library frameworks.
 */
export async function generateRehearsalFeedback(
  situation: SituationInput,
  persona: Persona,
  evidenceLibrary: EvidenceItem[],
  messages: RehearsalMessage[]
): Promise<{ feedback: string }> {
  const ai = getGeminiClient();
  const { systemInstruction, userPrompt } = buildRehearsalFeedbackPrompt(
    situation,
    persona,
    evidenceLibrary,
    messages
  );

  const { result: responseText } = await generateWithModelFallback(
    async (model, abortSignal) => {
      const response = await ai.models.generateContent({
        model,
        contents: userPrompt,
        config: {
          systemInstruction,
          abortSignal,
          maxOutputTokens: 750,
          ...buildThinkingConfig(model),
        },
      });
      return requireNonEmptyModelText(response.text, model);
    },
    { operationLabel: '/api/rehearse/feedback', attemptTimeoutMs: 10000, finalTimeoutMs: 20000 }
  );

  return {
    feedback: clampText(
      responseText,
      4800,
      'You practiced maintaining composure while clarifying your desired outcome. Continue balancing empathy with explicit boundaries.'
    ),
  };
}
