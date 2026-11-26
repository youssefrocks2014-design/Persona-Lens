import type {
  Analysis,
  EvidenceItem,
  Persona,
  Situation,
  SituationInput,
} from '../types/personaLens.ts';

export const SITUATION_LIMITS = {
  titleMin: 3,
  titleMax: 160,
  descriptionMin: 15,
  descriptionMax: 4000,
  desiredOutcomeMin: 5,
  desiredOutcomeMax: 1000,
  otherPersonRoleMin: 2,
  otherPersonRoleMax: 200,
} as const;

export const ANALYSIS_LIMITS = {
  framingMax: 3000,
  principleApplicationMax: 3000,
  blindSpotWarningMax: 2000,
  suggestedResponseMax: 4000,
  assessmentMax: 3000,
  researchComparisonMax: 3000,
  risksAndLimitsMax: 2500,
  evidenceIdsMax: 8,
} as const;

/** Strips non-printable ASCII control bytes while preserving tabs and line breaks. */
export function stripControlChars(value: string): string {
  // Remove non-printable ASCII control bytes while preserving tab (\x09), LF (\x0A), and CR (\x0D)
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
}

/** Sanitizes and trims all user-authored SituationInput text fields. */
export function sanitizeSituationInput(input: SituationInput): SituationInput {
  return {
    title: stripControlChars(input.title).trim(),
    description: stripControlChars(input.description).trim(),
    desiredOutcome: stripControlChars(input.desiredOutcome).trim(),
    otherPersonRole: stripControlChars(input.otherPersonRole).trim(),
  };
}

/** Validates situation field bounds and optional persona selection on client and server. */
export function validateSituationInput(
  input: SituationInput,
  personaId?: string
): Record<string, string> {
  const clean = sanitizeSituationInput(input);
  const errors: Record<string, string> = {};

  if (clean.title.length < SITUATION_LIMITS.titleMin) {
    errors.title = `Title must be at least ${SITUATION_LIMITS.titleMin} characters.`;
  } else if (clean.title.length > SITUATION_LIMITS.titleMax) {
    errors.title = `Title cannot exceed ${SITUATION_LIMITS.titleMax} characters.`;
  }

  if (clean.description.length < SITUATION_LIMITS.descriptionMin) {
    errors.description = `Describe what happened in at least ${SITUATION_LIMITS.descriptionMin} characters.`;
  } else if (clean.description.length > SITUATION_LIMITS.descriptionMax) {
    errors.description = `Description cannot exceed ${SITUATION_LIMITS.descriptionMax} characters.`;
  }

  if (clean.desiredOutcome.length < SITUATION_LIMITS.desiredOutcomeMin) {
    errors.desiredOutcome = `Desired outcome must be at least ${SITUATION_LIMITS.desiredOutcomeMin} characters.`;
  } else if (clean.desiredOutcome.length > SITUATION_LIMITS.desiredOutcomeMax) {
    errors.desiredOutcome = `Desired outcome cannot exceed ${SITUATION_LIMITS.desiredOutcomeMax} characters.`;
  }

  if (clean.otherPersonRole.length < SITUATION_LIMITS.otherPersonRoleMin) {
    errors.otherPersonRole = `Other person's role must be at least ${SITUATION_LIMITS.otherPersonRoleMin} characters.`;
  } else if (clean.otherPersonRole.length > SITUATION_LIMITS.otherPersonRoleMax) {
    errors.otherPersonRole = `Other person's role cannot exceed ${SITUATION_LIMITS.otherPersonRoleMax} characters.`;
  }

  if (personaId !== undefined && personaId.trim().length === 0) {
    errors.personaId = 'Please select a historical persona lens.';
  }

  return errors;
}

export function clampText(value: string, maxLen: number, fallback: string): string {
  const trimmed = (value ?? '').trim();
  if (trimmed.length < 10) {
    return fallback.slice(0, maxLen);
  }
  if (trimmed.length <= maxLen) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxLen - 3).trimEnd()}...`;
}

export function normalizeEvidenceIds(
  candidateIds: unknown,
  evidenceLibrary: EvidenceItem[]
): string[] {
  const validSet = new Set(evidenceLibrary.map((e) => e.id));
  const filtered: string[] = [];

  if (Array.isArray(candidateIds)) {
    for (const raw of candidateIds) {
      if (typeof raw === 'string' && validSet.has(raw) && !filtered.includes(raw)) {
        filtered.push(raw);
      }
      if (filtered.length >= ANALYSIS_LIMITS.evidenceIdsMax) {
        break;
      }
    }
  }

  return filtered;
}

export function createFirestoreSafeId(prefix: string): string {
  const cleanPrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 16) || 'doc';
  const rand = Math.random().toString(36).slice(2, 10);
  const ts = Date.now().toString(36);
  return `${cleanPrefix}-${ts}-${rand}`;
}

export interface HistoryItem {
  situation: Situation;
  analyses: Analysis[];
}

export function filterHistorySituations(
  situations: Situation[],
  analyses: Analysis[],
  searchQuery: string,
  personaIdFilter: string
): HistoryItem[] {
  const query = searchQuery.trim().toLowerCase();
  const analysesBySituation = new Map<string, Analysis[]>();

  for (const analysis of analyses) {
    const existing = analysesBySituation.get(analysis.situationId) ?? [];
    existing.push(analysis);
    analysesBySituation.set(analysis.situationId, existing);
  }

  return situations
    .map((situation) => {
      const sitAnalyses = [...(analysesBySituation.get(situation.id) ?? [])].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      return { situation, analyses: sitAnalyses };
    })
    .filter(({ situation, analyses: sitAnalyses }) => {
      if (personaIdFilter !== 'all') {
        const matchesPersona = sitAnalyses.some((a) => a.personaId === personaIdFilter);
        if (!matchesPersona) return false;
      }

      if (query.length > 0) {
        const haystack = [
          situation.title,
          situation.description,
          situation.desiredOutcome,
          situation.otherPersonRole,
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      return true;
    })
    .sort(
      (a, b) =>
        new Date(b.situation.createdAt).getTime() -
        new Date(a.situation.createdAt).getTime()
    );
}

const VALID_ID_REGEX = /^[a-zA-Z0-9_-]+$/;

function isBoundedString(value: unknown, minLen: number, maxLen: number): value is string {
  if (typeof value !== 'string') return false;
  const len = value.trim().length;
  return len >= minLen && len <= maxLen;
}

function isBoundedStringArray(
  value: unknown,
  minItems: number,
  maxItems: number,
  maxItemLen: number
): value is string[] {
  return (
    Array.isArray(value) &&
    value.length >= minItems &&
    value.length <= maxItems &&
    value.every((item) => isBoundedString(item, 1, maxItemLen))
  );
}

export function isPersonaComplete(persona: Partial<Persona> | null | undefined): persona is Persona {
  return Boolean(
    persona &&
      typeof persona === 'object' &&
      isBoundedString(persona.id, 1, 128) &&
      VALID_ID_REGEX.test(persona.id) &&
      isBoundedString(persona.name, 1, 120) &&
      isBoundedString(persona.lensSummary, 10, 600) &&
      isBoundedStringArray(persona.corePrinciples, 1, 10, 300) &&
      isBoundedString(persona.decisionPattern, 10, 1500) &&
      isBoundedString(persona.communicationStyle, 10, 1500) &&
      isBoundedStringArray(persona.blindSpots, 1, 10, 300) &&
      isBoundedStringArray(persona.sources, 1, 10, 300)
  );
}

export function isValidEvidenceLibraryPayload(items: unknown): items is EvidenceItem[] {
  return (
    Array.isArray(items) &&
    items.length > 0 &&
    items.length <= 25 &&
    items.every((item) => {
      if (!item || typeof item !== 'object') return false;
      const e = item as Partial<EvidenceItem>;
      return (
        isBoundedString(e.id, 1, 128) &&
        VALID_ID_REGEX.test(e.id) &&
        isBoundedString(e.name, 2, 160) &&
        isBoundedString(e.summary, 10, 1500) &&
        isBoundedString(e.whenItHelps, 10, 1200) &&
        isBoundedString(e.limits, 10, 1200) &&
        isBoundedString(e.evidenceStrength, 3, 120) &&
        isBoundedString(e.source, 5, 500)
      );
    })
  );
}

export interface RehearsalMessageValidationResult {
  valid: boolean;
  messages: Array<{ role: 'user' | 'other_person' | 'coach'; text: string; timestamp: string }>;
  error?: string;
}

export function validateAndSanitizeRehearsalMessages(
  items: unknown,
  options?: { requireNonEmpty?: boolean }
): RehearsalMessageValidationResult {
  if (items === undefined || items === null) {
    if (options?.requireNonEmpty) {
      return { valid: false, messages: [], error: 'Rehearsal transcript must have at least one exchange.' };
    }
    return { valid: true, messages: [] };
  }

  if (!Array.isArray(items)) {
    return { valid: false, messages: [], error: 'Rehearsal history must be an array.' };
  }
  if (items.length > 60) {
    return { valid: false, messages: [], error: 'Rehearsal transcript cannot exceed 60 messages.' };
  }
  if (options?.requireNonEmpty && items.length === 0) {
    return { valid: false, messages: [], error: 'Rehearsal transcript must have at least one exchange.' };
  }

  const sanitized: Array<{
    role: 'user' | 'other_person' | 'coach';
    text: string;
    timestamp: string;
  }> = [];

  for (const raw of items) {
    if (!raw || typeof raw !== 'object') {
      return { valid: false, messages: [], error: 'Invalid message entry in rehearsal transcript.' };
    }
    const candidate = raw as Record<string, unknown>;
    if (
      candidate.role !== 'user' &&
      candidate.role !== 'other_person' &&
      candidate.role !== 'coach'
    ) {
      return { valid: false, messages: [], error: 'Invalid role in rehearsal transcript.' };
    }
    if (typeof candidate.text !== 'string') {
      return {
        valid: false,
        messages: [],
        error: 'Each rehearsal message must be between 1 and 4000 characters.',
      };
    }
    const cleanText = stripControlChars(candidate.text).trim();
    if (cleanText.length < 1 || cleanText.length > 4000) {
      return {
        valid: false,
        messages: [],
        error: 'Each rehearsal message must be between 1 and 4000 characters.',
      };
    }
    const ts =
      typeof candidate.timestamp === 'string' && candidate.timestamp.trim().length <= 64
        ? stripControlChars(candidate.timestamp).trim()
        : '';
    sanitized.push({
      role: candidate.role,
      text: cleanText,
      timestamp: ts || new Date().toISOString(),
    });
  }

  return { valid: true, messages: sanitized };
}

export function getPersonaShortLabel(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return 'Persona';
  if (trimmed.toLowerCase().startsWith('ibn ')) {
    return trimmed;
  }
  return trimmed.split(/\s+/)[0] || trimmed;
}

