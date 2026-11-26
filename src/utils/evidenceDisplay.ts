import type { EvidenceItem, RealityCheck } from '../types/personaLens.ts';

export type EvidenceStrengthTier = 'strong' | 'moderate' | 'low';
export type CitedEvidenceEffect = 'helps' | 'risks' | 'neutral';

export interface StrengthBadgeMeta {
  tier: EvidenceStrengthTier;
  label: string;
  badgeClass: string;
}

export interface CitedEvidenceEffectMeta {
  effect: CitedEvidenceEffect;
  label: 'Helps' | 'Risks' | 'Neutral';
  badgeClass: string;
  rationale: string;
}

export function getEvidenceStrengthTier(evidenceStrength: string): EvidenceStrengthTier {
  const normalized = (evidenceStrength ?? '').trim().toLowerCase();
  if (normalized.startsWith('strong')) {
    return 'strong';
  }
  if (normalized.includes('low') || normalized.includes('limited')) {
    return 'low';
  }
  return 'moderate';
}

export function getEvidenceStrengthBadge(evidenceStrength: string): StrengthBadgeMeta {
  const tier = getEvidenceStrengthTier(evidenceStrength);
  const label = (evidenceStrength ?? '').trim() || 'moderate';

  if (tier === 'strong') {
    return {
      tier,
      label,
      badgeClass: 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]',
    };
  }
  if (tier === 'low') {
    return {
      tier,
      label,
      badgeClass: 'bg-[#FFF7ED] text-[#9A3412] border-[#FED7AA]',
    };
  }
  return {
    tier,
    label,
    badgeClass: 'bg-[#EFF6FF] text-[#1E3A8A] border-[#BFDBFE]',
  };
}

function splitIntoSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function buildSearchTerms(item: EvidenceItem): string[] {
  const terms = [item.id.toLowerCase(), item.name.toLowerCase()];
  const shortName = item.name.replace(/\([^)]*\)/g, '').trim().toLowerCase();
  if (shortName.length >= 4 && !terms.includes(shortName)) {
    terms.push(shortName);
  }
  const firstWords = shortName.split(/\s+/).slice(0, 2).join(' ');
  if (firstWords.length >= 6 && !terms.includes(firstWords)) {
    terms.push(firstWords);
  }
  return terms;
}

export function classifyCitedEvidenceEffect(
  item: EvidenceItem,
  realityCheck: RealityCheck
): CitedEvidenceEffectMeta {
  const comparisonText = (realityCheck.researchComparison ?? '').trim();
  const sentences = splitIntoSentences(comparisonText);
  const terms = buildSearchTerms(item);

  const matchingSentences = sentences.filter((sentence) => {
    const lower = sentence.toLowerCase();
    return terms.some((term) => lower.includes(term));
  });

  const targetSnippet =
    matchingSentences.length > 0
      ? matchingSentences.slice(0, 2).join(' ')
      : '';

  const rawInspection =
    targetSnippet ||
    (realityCheck.evidenceIdsUsed.length <= 1 ? comparisonText : item.whenItHelps);
  const strengthText = (item.evidenceStrength ?? '').trim().toLowerCase();
  const inspectionText = strengthText
    ? rawInspection.toLowerCase().split(strengthText).join('')
    : rawInspection.toLowerCase();

  let effect: CitedEvidenceEffect = 'helps';
  if (
    /\b(carries a risk|carries risk|risks|at risk|risk of|could backfire|may backfire|warns against|diverges|fails when|unsafe)\b/.test(
      inspectionText
    )
  ) {
    effect = 'risks';
  } else if (
    /\b(is neutral|neutral|mixed|inconclusive|neither helps nor|limited direct)\b/.test(
      inspectionText
    )
  ) {
    effect = 'neutral';
  } else if (
    /\b(helps|supports|aligns|aligned|reduces|effective|strengthens|reinforces|clarify)\b/.test(
      inspectionText
    )
  ) {
    effect = 'helps';
  }

  const rationale = targetSnippet || item.whenItHelps;

  if (effect === 'risks') {
    return {
      effect,
      label: 'Risks',
      badgeClass: 'bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]',
      rationale,
    };
  }
  if (effect === 'neutral') {
    return {
      effect,
      label: 'Neutral',
      badgeClass: 'bg-[#F5F5F4] text-[#44403C] border-[#D6D3D1]',
      rationale,
    };
  }
  return {
    effect,
    label: 'Helps',
    badgeClass: 'bg-[#ECFDF5] text-[#14532D] border-[#BBF7D0]',
    rationale,
  };
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to legacy textarea copy fallback
  }

  if (typeof document === 'undefined') return false;
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
