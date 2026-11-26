import {
  SEED_EVIDENCE_LIBRARY,
  SEED_PERSONAS,
} from '../src/data/seedCatalog.ts';
import type { EvidenceItem, Persona } from '../src/types/personaLens.ts';
import {
  isPersonaComplete,
  isValidEvidenceLibraryPayload,
} from '../src/utils/validation.ts';

export const CANONICAL_PERSONAS_BY_ID = new Map<string, Persona>(
  SEED_PERSONAS.map((persona) => [persona.id, persona])
);

export const CANONICAL_EVIDENCE_BY_ID = new Map<string, EvidenceItem>(
  SEED_EVIDENCE_LIBRARY.map((item) => [item.id, item])
);

function serializePersonaCard(persona: Persona): string {
  return JSON.stringify({
    id: persona.id,
    name: persona.name,
    lensSummary: persona.lensSummary,
    corePrinciples: persona.corePrinciples,
    decisionPattern: persona.decisionPattern,
    communicationStyle: persona.communicationStyle,
    blindSpots: persona.blindSpots,
    sources: persona.sources,
  });
}

function serializeEvidenceItems(items: EvidenceItem[]): string {
  return JSON.stringify(
    items.map((e) => ({
      id: e.id,
      name: e.name,
      summary: e.summary,
      whenItHelps: e.whenItHelps,
      limits: e.limits,
      evidenceStrength: e.evidenceStrength,
      source: e.source,
    }))
  );
}

function serializeEvidenceSummaryLine(items: EvidenceItem[]): string {
  return items
    .map((e) => `${e.id} (${e.name}; strength: ${e.evidenceStrength})`)
    .join('; ');
}

const CANONICAL_PERSONA_JSON_MAP = new Map<string, string>(
  SEED_PERSONAS.map((persona) => [persona.id, serializePersonaCard(persona)])
);

const CANONICAL_EVIDENCE_JSON = serializeEvidenceItems(SEED_EVIDENCE_LIBRARY);
const CANONICAL_EVIDENCE_SUMMARY_LINE = serializeEvidenceSummaryLine(
  SEED_EVIDENCE_LIBRARY
);

export function getSerializedPersonaJson(persona: Persona): string {
  const canonical = CANONICAL_PERSONA_JSON_MAP.get(persona.id);
  if (canonical && persona === CANONICAL_PERSONAS_BY_ID.get(persona.id)) {
    return canonical;
  }
  return serializePersonaCard(persona);
}

export function getSerializedEvidenceJson(items: EvidenceItem[]): string {
  if (items === SEED_EVIDENCE_LIBRARY) {
    return CANONICAL_EVIDENCE_JSON;
  }
  return serializeEvidenceItems(items);
}

export function getSerializedEvidenceSummaryLine(items: EvidenceItem[]): string {
  if (items === SEED_EVIDENCE_LIBRARY) {
    return CANONICAL_EVIDENCE_SUMMARY_LINE;
  }
  return serializeEvidenceSummaryLine(items);
}

/**
 * Resolves a persona card authoritatively on the server.
 * Any curated catalog ID always resolves to the trusted server copy so
 * callers cannot alter corePrinciples, blindSpots, or inject prompt instructions.
 */
export function resolveServerPersona(input: {
  personaId?: unknown;
  persona?: unknown;
}): Persona | null {
  const candidateId =
    typeof input.personaId === 'string'
      ? input.personaId.trim()
      : input.persona &&
          typeof input.persona === 'object' &&
          typeof (input.persona as Partial<Persona>).id === 'string'
        ? (input.persona as Partial<Persona>).id!.trim()
        : '';

  if (candidateId) {
    const canonical = CANONICAL_PERSONAS_BY_ID.get(candidateId);
    if (canonical) {
      return canonical;
    }
  }

  if (isPersonaComplete(input.persona as Partial<Persona> | null | undefined)) {
    return input.persona as Persona;
  }

  return null;
}

/**
 * Resolves the Evidence Library authoritatively on the server.
 * When omitted, uses the curated 9-entry SEED_EVIDENCE_LIBRARY directly.
 * When supplied, validates shape/bounds and overrides any matching canonical ID
 * with the server-trusted record so strength labels cannot be spoofed.
 */
export function resolveServerEvidenceLibrary(raw: unknown): EvidenceItem[] | null {
  if (raw === undefined || raw === null) {
    return SEED_EVIDENCE_LIBRARY;
  }
  if (!isValidEvidenceLibraryPayload(raw)) {
    return null;
  }
  return raw.map((item) => CANONICAL_EVIDENCE_BY_ID.get(item.id) ?? item);
}
