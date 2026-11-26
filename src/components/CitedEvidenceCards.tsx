import { AlertTriangle, CheckCircle2, MinusCircle } from 'lucide-react';
import type { EvidenceItem, RealityCheck } from '../types/personaLens.ts';
import {
  classifyCitedEvidenceEffect,
  getEvidenceStrengthBadge,
} from '../utils/evidenceDisplay.ts';

interface CitedEvidenceCardsProps {
  evidenceItems: EvidenceItem[];
  realityCheck: RealityCheck;
}

export function CitedEvidenceCards({
  evidenceItems,
  realityCheck,
}: CitedEvidenceCardsProps) {
  if (evidenceItems.length === 0) {
    return (
      <div className="p-4 rounded-xl border border-[#E5E0D8] bg-[#FBF9F5] text-xs text-[#57534E]">
        No matching evidence in the library.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {evidenceItems.map((item) => {
        const strength = getEvidenceStrengthBadge(item.evidenceStrength);
        const effectMeta = classifyCitedEvidenceEffect(item, realityCheck);
        const EffectIcon =
          effectMeta.effect === 'risks'
            ? AlertTriangle
            : effectMeta.effect === 'neutral'
              ? MinusCircle
              : CheckCircle2;

        return (
          <article
            key={item.id}
            data-testid={`cited-evidence-card-${item.id}`}
            className="p-4 rounded-xl border border-[#E5E0D8] bg-[#FBF9F5]"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h4 className="font-serif text-sm font-semibold text-[#1C1917]">
                {item.name}
              </h4>
              <span className="text-[11px] font-mono text-[#78716C]">
                {item.id}
              </span>
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 text-[11px] font-semibold rounded-md border ${strength.badgeClass}`}
              >
                Strength: {strength.label}
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold rounded-md border ${effectMeta.badgeClass}`}
              >
                <EffectIcon className="w-3 h-3" aria-hidden="true" />
                <span>Effect: {effectMeta.label}</span>
              </span>
            </div>

            <p className="text-xs text-[#44403C] leading-relaxed mt-2.5">
              {effectMeta.rationale}
            </p>
            <p className="text-[11px] text-[#78716C] mt-2">
              Source: {item.source}
            </p>
          </article>
        );
      })}
    </div>
  );
}
