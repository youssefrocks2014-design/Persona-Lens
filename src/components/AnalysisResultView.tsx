import { useState } from 'react';
import {
  Check,
  Copy,
  GitCompare,
  Loader2,
  MessageSquare,
  RefreshCw,
  Scale,
} from 'lucide-react';
import { MANDATORY_INTERPRETATION_NOTE } from '../data/seedCatalog.ts';
import type {
  Analysis,
  EvidenceItem,
  Persona,
  Situation,
} from '../types/personaLens.ts';
import { copyTextToClipboard } from '../utils/evidenceDisplay.ts';
import { CitedEvidenceCards } from './CitedEvidenceCards.tsx';
import { PersonaCrest } from './PersonaCrest.tsx';
import { SafetySupportCard } from './SafetySupportCard.tsx';

interface AnalysisResultViewProps {
  situation: Situation;
  analysis: Analysis;
  persona: Persona;
  allPersonas: Persona[];
  evidenceLibrary: EvidenceItem[];
  reanalyzing: boolean;
  reanalyzeError: string | null;
  safetyAlert?: string | null;
  onClearSafetyAlert?: () => void;
  onReanalyzeWithPersona: (persona: Persona) => Promise<void>;
  onOpenCompareView: () => void;
  onStartLarpMode: () => void;
  onBackToHistory: () => void;
}

export function AnalysisResultView({
  situation,
  analysis,
  persona,
  allPersonas,
  evidenceLibrary,
  reanalyzing,
  reanalyzeError,
  safetyAlert,
  onClearSafetyAlert,
  onReanalyzeWithPersona,
  onOpenCompareView,
  onStartLarpMode,
  onBackToHistory,
}: AnalysisResultViewProps) {
  const [copied, setCopied] = useState(false);
  const [showPersonaSwitcher, setShowPersonaSwitcher] = useState(false);

  const matchedEvidence = analysis.realityCheck.evidenceIdsUsed
    .map((id) => evidenceLibrary.find((item) => item.id === id))
    .filter((item): item is EvidenceItem => Boolean(item));

  const otherPersonas = allPersonas.filter((p) => p.id !== persona.id);
  const formattedDate = new Date(analysis.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  async function handleCopyDraft() {
    const ok = await copyTextToClipboard(analysis.suggestedResponse);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      setCopied(false);
    }
  }

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 pb-24 md:pb-14">
      {/* Mandatory Interpretation Banner */}
      <div
        role="note"
        className="mb-6 px-4 py-3 bg-[#F2EFE9] border border-[#D6CEBE] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#57534E]"
      >
        <span className="font-medium text-[#1C1917]">
          {MANDATORY_INTERPRETATION_NOTE}
        </span>
        <span className="font-mono tabular-nums text-[#78716C]">
          Analyzed {formattedDate}
        </span>
      </div>

      {/* Situation & Persona Header */}
      <section className="pb-6 border-b border-[#E5E0D8] flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="max-w-3xl min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#78716C] mb-2">
            <span className="break-words">{situation.otherPersonRole}</span>
            <span aria-hidden="true">·</span>
            <span className="break-words">Goal: {situation.desiredOutcome}</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight text-[#1C1917] [text-wrap:balance] break-words">
            {situation.title}
          </h1>
          <p className="text-sm text-[#57534E] leading-relaxed mt-3 break-words">
            {situation.description}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onOpenCompareView}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium text-[#1E3A8A] bg-white border border-[#1E3A8A]/35 rounded-lg hover:bg-[#EFF6FF] transition-colors whitespace-nowrap"
          >
            <GitCompare className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Compare View</span>
          </button>

          <button
            type="button"
            disabled={reanalyzing}
            onClick={() => setShowPersonaSwitcher((v) => !v)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium text-[#1C1917] bg-white border border-[#D6CEBE] rounded-lg hover:bg-[#F2EFE9] disabled:opacity-60 transition-colors whitespace-nowrap"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Try Another Persona</span>
          </button>

          <button
            type="button"
            onClick={onStartLarpMode}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#1E3A8A] rounded-lg hover:bg-[#1E3A8A]/90 transition-colors whitespace-nowrap"
          >
            <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Practice in Larp Mode</span>
          </button>
        </div>
      </section>

      {safetyAlert && (
        <div className="mt-6">
          <SafetySupportCard
            message={safetyAlert}
            onDismiss={onClearSafetyAlert}
            actionLabel="Dismiss"
          />
        </div>
      )}

      {/* Optional Switcher Panel */}
      {showPersonaSwitcher && otherPersonas.length > 0 && (
        <section className="mt-6 p-5 bg-white border border-[#E5E0D8] rounded-xl">
          <div className="flex items-center justify-between gap-4 mb-3">
            <h2 className="font-serif text-base font-semibold text-[#1C1917]">
              Re-analyze this situation through another lens
            </h2>
            {reanalyzing && (
              <span className="inline-flex items-center gap-1.5 text-xs text-[#1E3A8A]">
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                Generating comparison...
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {otherPersonas.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                disabled={reanalyzing}
                onClick={async () => {
                  await onReanalyzeWithPersona(candidate);
                  setShowPersonaSwitcher(false);
                }}
                className="text-left p-3.5 rounded-lg border border-[#E5E0D8] bg-[#FBF9F5] hover:bg-[#F2EFE9] disabled:opacity-50 transition-colors flex items-center gap-3"
              >
                <PersonaCrest personaId={candidate.id} name={candidate.name} size="sm" />
                <div className="min-w-0">
                  <span className="block font-serif text-sm font-semibold text-[#1C1917]">
                    {candidate.name}
                  </span>
                  <span className="block text-xs text-[#78716C] truncate">
                    {candidate.sources[0]}
                  </span>
                </div>
              </button>
            ))}
          </div>
          {reanalyzeError && (
            <p role="alert" className="text-xs text-[#991B1B] mt-3">
              {reanalyzeError}
            </p>
          )}
        </section>
      )}

      {/* Main Two-Column Reading Canvas */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Persona View + Suggested Response */}
        <section className="lg:col-span-7 space-y-6 min-w-0">
          <article className="bg-white border border-[#E5E0D8] rounded-xl p-6 sm:p-8 min-w-0">
            <div className="flex items-center gap-3.5 pb-5 border-b border-[#E5E0D8]">
              <PersonaCrest personaId={persona.id} name={persona.name} />
              <div className="min-w-0">
                <p className="text-xs font-mono uppercase tracking-wider text-[#78350F]">
                  Living Your Day · Persona Lens
                </p>
                <h2 className="font-serif text-2xl font-semibold text-[#1C1917] break-words">
                  {persona.name}
                </h2>
              </div>
            </div>

            <div className="mt-6 space-y-6 text-sm sm:text-base text-[#1C1917]">
              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider text-[#57534E] mb-2">
                  Framing the Tension
                </h3>
                <p className="leading-relaxed text-[#292524] break-words">
                  {analysis.personaView.framing}
                </p>
              </div>

              <div className="pt-5 border-t border-[#E5E0D8]">
                <h3 className="text-xs font-mono uppercase tracking-wider text-[#57534E] mb-2">
                  Core Principles Applied
                </h3>
                <p className="leading-relaxed text-[#292524] break-words">
                  {analysis.personaView.principleApplication}
                </p>
              </div>

              <div className="pt-5 border-t border-[#E5E0D8]">
                <h3 className="text-xs font-mono uppercase tracking-wider text-[#9A3412] mb-2">
                  Persona Blind Spot Warning
                </h3>
                <p className="leading-relaxed text-[#57534E] break-words">
                  {analysis.personaView.blindSpotWarning}
                </p>
              </div>
            </div>
          </article>

          {/* Suggested Response */}
          <article className="bg-white border border-[#E5E0D8] rounded-xl p-6 sm:p-8">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-[#1E3A8A]">
                  Suggested Response Draft
                </p>
                <h2 className="font-serif text-xl font-semibold text-[#1C1917] mt-0.5">
                  Practical Reply to Adapt
                </h2>
              </div>

              <button
                type="button"
                onClick={handleCopyDraft}
                aria-label="Copy suggested response draft"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1C1917] bg-[#F2EFE9] border border-[#D6CEBE] rounded-lg hover:bg-[#EBE6DF] transition-colors whitespace-nowrap shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#14532D]" aria-hidden="true" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Copy Draft</span>
                  </>
                )}
              </button>
            </div>

            <blockquote className="p-5 bg-[#FBF9F5] rounded-lg text-sm sm:text-base text-[#1C1917] leading-relaxed whitespace-pre-line break-words overflow-x-auto">
              {analysis.suggestedResponse}
            </blockquote>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[#78716C]">
              <span className="min-w-0 break-words">Sources: {persona.sources.join(' · ')}</span>
              <button
                type="button"
                onClick={onStartLarpMode}
                className="font-semibold text-[#1E3A8A] hover:underline whitespace-nowrap shrink-0"
              >
                Rehearse this reply in Larp Mode
              </button>
            </div>
          </article>
        </section>

        {/* Right: Reality Check */}
        <aside className="lg:col-span-5 bg-white border border-[#E5E0D8] rounded-xl p-6 sm:p-7 space-y-6 min-w-0">
          <div className="pb-4 border-b border-[#E5E0D8]">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#14532D] mb-1">
              <Scale className="w-4 h-4" aria-hidden="true" />
              <span>Evidence-Based Reality Check</span>
            </div>
            <h2 className="font-serif text-2xl font-semibold text-[#1C1917]">
              How Research Compares
            </h2>
          </div>

          <div className="space-y-5 text-sm">
            <div>
              <h3 className="text-xs font-mono uppercase tracking-wider text-[#57534E] mb-1.5">
                Empirical Assessment
              </h3>
              <p className="text-[#292524] leading-relaxed break-words">
                {analysis.realityCheck.assessment}
              </p>
            </div>

            <div className="pt-4 border-t border-[#E5E0D8]">
              <h3 className="text-xs font-mono uppercase tracking-wider text-[#57534E] mb-1.5">
                Alignment &amp; Divergence
              </h3>
              <p className="text-[#292524] leading-relaxed break-words">
                {analysis.realityCheck.researchComparison}
              </p>
            </div>

            <div className="pt-4 border-t border-[#E5E0D8]">
              <h3 className="text-xs font-mono uppercase tracking-wider text-[#9A3412] mb-1.5">
                Research Risks &amp; Limits
              </h3>
              <p className="text-[#57534E] leading-relaxed break-words">
                {analysis.realityCheck.risksAndLimits}
              </p>
            </div>

            <div className="pt-4 border-t border-[#E5E0D8]">
              <h3 className="text-xs font-mono uppercase tracking-wider text-[#14532D] mb-2.5">
                Cited Database Frameworks
              </h3>
              <CitedEvidenceCards
                evidenceItems={matchedEvidence}
                realityCheck={analysis.realityCheck}
              />
            </div>
          </div>
        </aside>
      </div>

      {/* Bottom Disclaimer & Back Link */}
      <footer className="mt-10 pt-6 border-t border-[#E5E0D8] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-[#78716C]">
        <p className="italic">{MANDATORY_INTERPRETATION_NOTE}</p>
        <button
          type="button"
          onClick={onBackToHistory}
          className="text-xs font-medium text-[#1E3A8A] hover:underline self-start sm:self-auto"
        >
          Back to History
        </button>
      </footer>
    </main>
  );
}
