import { useState } from 'react';
import {
  ArrowLeft,
  Check,
  Copy,
  GitCompare,
  Loader2,
  MessageSquare,
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

interface CompareViewProps {
  situation: Situation;
  situationAnalyses: Analysis[];
  personas: Persona[];
  evidenceLibrary: EvidenceItem[];
  leftAnalysisId?: string;
  rightAnalysisId?: string;
  generatingSlot: 'left' | 'right' | null;
  compareError: string | null;
  safetyAlert: string | null;
  onClearSafetyAlert: () => void;
  onGenerateAnalysisForSlot: (slot: 'left' | 'right', persona: Persona) => Promise<void>;
  onSelectSlotAnalysis: (slot: 'left' | 'right', analysisId: string) => void;
  onOpenSingleAnalysis: (analysis: Analysis) => void;
  onStartLarpMode: (personaId: string) => void;
  onBackToHistory: () => void;
}

function CompareColumn({
  slotLabel,
  analysis,
  persona,
  allPersonas,
  savedAnalyses,
  otherSelectedPersonaId,
  evidenceLibrary,
  isGenerating,
  onSelectSavedAnalysis,
  onRunNewPersona,
  onOpenSingleAnalysis,
  onStartLarpMode,
}: {
  slotLabel: string;
  analysis?: Analysis;
  persona?: Persona;
  allPersonas: Persona[];
  savedAnalyses: Analysis[];
  otherSelectedPersonaId?: string;
  evidenceLibrary: EvidenceItem[];
  isGenerating: boolean;
  onSelectSavedAnalysis: (analysisId: string) => void;
  onRunNewPersona: (persona: Persona) => Promise<void>;
  onOpenSingleAnalysis: (analysis: Analysis) => void;
  onStartLarpMode: (personaId: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>(() => {
    if (analysis) return analysis.personaId;
    const fallback = allPersonas.find((p) => p.id !== otherSelectedPersonaId);
    return fallback?.id ?? allPersonas[0]?.id ?? '';
  });

  const savedByPersona = new Map(savedAnalyses.map((a) => [a.personaId, a]));

  const matchedEvidence = analysis
    ? analysis.realityCheck.evidenceIdsUsed
        .map((id) => evidenceLibrary.find((item) => item.id === id))
        .filter((item): item is EvidenceItem => Boolean(item))
    : [];

  async function handleCopy() {
    if (!analysis) return;
    const ok = await copyTextToClipboard(analysis.suggestedResponse);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handlePersonaChange(nextPersonaId: string) {
    setSelectedCandidateId(nextPersonaId);
    const existing = savedByPersona.get(nextPersonaId);
    if (existing) {
      onSelectSavedAnalysis(existing.id);
    } else {
      const targetPersona = allPersonas.find((p) => p.id === nextPersonaId);
      if (targetPersona) {
        await onRunNewPersona(targetPersona);
      }
    }
  }

  const activePersonaId = analysis?.personaId ?? selectedCandidateId;

  return (
    <section
      aria-label={`${slotLabel} comparison column`}
      className="bg-white border border-[#E5E0D8] rounded-xl p-5 sm:p-6 space-y-6 min-w-0"
    >
      {/* Slot Persona Selector */}
      <div className="pb-4 border-b border-[#E5E0D8]">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <span className="text-xs font-mono uppercase tracking-wider text-[#78350F]">
            {slotLabel}
          </span>
          {analysis && (
            <button
              type="button"
              onClick={() => onOpenSingleAnalysis(analysis)}
              className="text-xs font-medium text-[#1E3A8A] hover:underline"
            >
              Open Full View
            </button>
          )}
        </div>

        <label className="sr-only" htmlFor={`compare-select-${slotLabel}`}>
          Choose persona for {slotLabel}
        </label>
        <select
          id={`compare-select-${slotLabel}`}
          value={activePersonaId}
          disabled={isGenerating}
          onChange={(e) => handlePersonaChange(e.target.value)}
          className="w-full px-3.5 py-2 text-sm font-medium bg-[#FBF9F5] border border-[#D6CEBE] rounded-lg text-[#1C1917] focus:outline-none focus:border-[#1E3A8A]"
        >
          {allPersonas.map((p) => {
            const isSaved = savedByPersona.has(p.id);
            const isSameAsOther = p.id === otherSelectedPersonaId;
            return (
              <option key={p.id} value={p.id} disabled={isSameAsOther}>
                {p.name}
                {isSaved ? ' (Saved)' : ' (Analyze & Save)'}
                {isSameAsOther ? ' — in other column' : ''}
              </option>
            );
          })}
        </select>

        {persona && (
          <div className="mt-4 flex items-center gap-3">
            <PersonaCrest personaId={persona.id} name={persona.name} size="sm" />
            <div className="min-w-0">
              <h2 className="font-serif text-xl font-semibold text-[#1C1917]">
                {persona.name}
              </h2>
              <p className="text-xs text-[#57534E] line-clamp-2">
                {persona.lensSummary}
              </p>
            </div>
          </div>
        )}
      </div>

      {isGenerating ? (
        <div className="py-12 flex flex-col items-center justify-center text-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-[#1E3A8A]" aria-hidden="true" />
          <p className="text-sm text-[#57534E]">
            Analyzing this situation through {persona?.name ?? 'selected persona'}...
          </p>
        </div>
      ) : !analysis ? (
        <div className="py-8 text-center space-y-4">
          <p className="text-sm text-[#57534E]">
            Choose a second persona above to run this same situation through another mind and
            compare side-by-side.
          </p>
          {selectedCandidateId && (
            <button
              type="button"
              disabled={isGenerating}
              onClick={() => {
                const target = allPersonas.find((p) => p.id === selectedCandidateId);
                if (target) onRunNewPersona(target);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#1E3A8A] rounded-lg hover:bg-[#1E3A8A]/90 disabled:opacity-60 transition-colors"
            >
              <GitCompare className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Run &amp; Compare</span>
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Persona View */}
          <div className="space-y-4 text-sm">
            <div>
              <h3 className="text-xs font-mono uppercase tracking-wider text-[#57534E] mb-1">
                Framing the Tension
              </h3>
              <p className="text-[#292524] leading-relaxed break-words">
                {analysis.personaView.framing}
              </p>
            </div>

            <div className="pt-3 border-t border-[#E5E0D8]">
              <h3 className="text-xs font-mono uppercase tracking-wider text-[#57534E] mb-1">
                Core Principles Applied
              </h3>
              <p className="text-[#292524] leading-relaxed break-words">
                {analysis.personaView.principleApplication}
              </p>
            </div>

            <div className="pt-3 border-t border-[#E5E0D8]">
              <h3 className="text-xs font-mono uppercase tracking-wider text-[#9A3412] mb-1">
                Persona Blind Spot Warning
              </h3>
              <p className="text-[#57534E] leading-relaxed break-words">
                {analysis.personaView.blindSpotWarning}
              </p>
            </div>
          </div>

          {/* Suggested Response with 1-Click Copy */}
          <div className="pt-4 border-t border-[#E5E0D8]">
            <div className="flex items-center justify-between gap-3 mb-2.5">
              <h3 className="text-xs font-mono uppercase tracking-wider text-[#1E3A8A]">
                Suggested Response
              </h3>
              <button
                type="button"
                onClick={handleCopy}
                aria-label={`Copy ${persona?.name ?? slotLabel} suggested response`}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-[#1C1917] bg-[#F2EFE9] border border-[#D6CEBE] rounded-lg hover:bg-[#EBE6DF] transition-colors whitespace-nowrap shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#14532D]" aria-hidden="true" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <blockquote className="p-4 bg-[#FBF9F5] border border-[#E5E0D8] rounded-lg text-sm text-[#1C1917] leading-relaxed whitespace-pre-line break-words overflow-x-auto">
              {analysis.suggestedResponse}
            </blockquote>

            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-[#78716C]">
              <span className="truncate min-w-0">
                Sources: {persona?.sources.join(' · ') ?? 'Curated persona card'}
              </span>
              <button
                type="button"
                onClick={() => onStartLarpMode(analysis.personaId)}
                className="inline-flex items-center gap-1 font-semibold text-[#1E3A8A] hover:underline whitespace-nowrap shrink-0"
              >
                <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Practice in Larp</span>
              </button>
            </div>
          </div>

          {/* Reality Check */}
          <div className="pt-4 border-t border-[#E5E0D8] space-y-4">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#14532D]">
              <Scale className="w-4 h-4" aria-hidden="true" />
              <span>Evidence-Based Reality Check</span>
            </div>

            <p className="text-xs sm:text-sm text-[#292524] leading-relaxed break-words">
              {analysis.realityCheck.assessment}
            </p>

            <p className="text-xs text-[#57534E] leading-relaxed break-words">
              <span className="font-semibold text-[#1C1917]">Comparison:</span>{' '}
              {analysis.realityCheck.researchComparison}
            </p>

            <p className="text-xs text-[#9A3412] leading-relaxed break-words">
              <span className="font-semibold">Risks &amp; limits:</span>{' '}
              {analysis.realityCheck.risksAndLimits}
            </p>

            <div>
              <h4 className="text-[11px] font-mono uppercase tracking-wider text-[#14532D] mb-2">
                Cited Evidence Frameworks
              </h4>
              <CitedEvidenceCards
                evidenceItems={matchedEvidence}
                realityCheck={analysis.realityCheck}
              />
            </div>
          </div>
        </>
      )}
    </section>
  );
}

export function CompareView({
  situation,
  situationAnalyses,
  personas,
  evidenceLibrary,
  leftAnalysisId,
  rightAnalysisId,
  generatingSlot,
  compareError,
  safetyAlert,
  onClearSafetyAlert,
  onGenerateAnalysisForSlot,
  onSelectSlotAnalysis,
  onOpenSingleAnalysis,
  onStartLarpMode,
  onBackToHistory,
}: CompareViewProps) {
  const leftAnalysis =
    situationAnalyses.find((a) => a.id === leftAnalysisId) ?? situationAnalyses[0];
  const rightAnalysis =
    situationAnalyses.find(
      (a) => a.id === rightAnalysisId && a.id !== leftAnalysis?.id
    ) ?? situationAnalyses.find((a) => a.id !== leftAnalysis?.id);

  const leftPersona = leftAnalysis
    ? personas.find((p) => p.id === leftAnalysis.personaId)
    : undefined;
  const rightPersona = rightAnalysis
    ? personas.find((p) => p.id === rightAnalysis.personaId)
    : undefined;

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 pb-24 md:pb-14">
      <div
        role="note"
        className="mb-6 px-4 py-3 bg-[#F2EFE9] border border-[#D6CEBE] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#57534E]"
      >
        <span className="font-medium text-[#1C1917]">
          {MANDATORY_INTERPRETATION_NOTE}
        </span>
        <span className="font-mono tabular-nums text-[#78716C]">
          Side-by-Side Comparison · {situationAnalyses.length} saved{' '}
          {situationAnalyses.length === 1 ? 'analysis' : 'analyses'}
        </span>
      </div>

      {/* Header */}
      <section className="pb-6 border-b border-[#E5E0D8] flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="max-w-3xl min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#78716C] mb-2">
            <span>Compare View</span>
            <span aria-hidden="true">·</span>
            <span className="break-words">{situation.otherPersonRole}</span>
            <span aria-hidden="true">·</span>
            <span className="break-words">Goal: {situation.desiredOutcome}</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight text-[#1C1917] [text-wrap:balance] break-words">
            {situation.title}
          </h1>
          <p className="text-sm text-[#57534E] leading-relaxed mt-2.5 break-words">
            {situation.description}
          </p>
        </div>

        <button
          type="button"
          onClick={onBackToHistory}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium text-[#1C1917] bg-white border border-[#D6CEBE] rounded-lg hover:bg-[#F2EFE9] transition-colors whitespace-nowrap shrink-0 self-start lg:self-auto"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Back to History</span>
        </button>
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

      {compareError && (
        <div
          role="alert"
          className="mt-6 p-4 bg-[#FEF2F2] border border-[#FECACA] rounded-xl text-sm text-[#991B1B]"
        >
          {compareError}
        </div>
      )}

      {/* Side-by-Side Comparison Grid */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <CompareColumn
          slotLabel="Lens A"
          analysis={leftAnalysis}
          persona={leftPersona}
          allPersonas={personas}
          savedAnalyses={situationAnalyses}
          otherSelectedPersonaId={rightAnalysis?.personaId}
          evidenceLibrary={evidenceLibrary}
          isGenerating={generatingSlot === 'left'}
          onSelectSavedAnalysis={(id) => onSelectSlotAnalysis('left', id)}
          onRunNewPersona={(p) => onGenerateAnalysisForSlot('left', p)}
          onOpenSingleAnalysis={onOpenSingleAnalysis}
          onStartLarpMode={onStartLarpMode}
        />

        <CompareColumn
          slotLabel="Lens B"
          analysis={rightAnalysis}
          persona={rightPersona}
          allPersonas={personas}
          savedAnalyses={situationAnalyses}
          otherSelectedPersonaId={leftAnalysis?.personaId}
          evidenceLibrary={evidenceLibrary}
          isGenerating={generatingSlot === 'right'}
          onSelectSavedAnalysis={(id) => onSelectSlotAnalysis('right', id)}
          onRunNewPersona={(p) => onGenerateAnalysisForSlot('right', p)}
          onOpenSingleAnalysis={onOpenSingleAnalysis}
          onStartLarpMode={onStartLarpMode}
        />
      </div>

      <footer className="mt-10 pt-6 border-t border-[#E5E0D8] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-[#78716C]">
        <p className="italic">{MANDATORY_INTERPRETATION_NOTE}</p>
        <button
          type="button"
          onClick={onBackToHistory}
          className="text-xs font-medium text-[#1E3A8A] hover:underline self-start sm:self-auto"
        >
          View all saved comparisons in History
        </button>
      </footer>
    </main>
  );
}
