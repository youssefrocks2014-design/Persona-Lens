import { useState } from 'react';
import { ArrowRight, BookOpen, ChevronDown, ChevronUp, GitCompare, Scale } from 'lucide-react';
import type {
  Analysis,
  EvidenceItem,
  Persona,
  Rehearsal,
  Situation,
  UserProfile,
} from '../types/personaLens.ts';
import { getPersonaShortLabel } from '../utils/validation.ts';
import { PersonaCrest } from './PersonaCrest.tsx';

interface HomeViewProps {
  user: UserProfile;
  personas: Persona[];
  evidenceLibrary: EvidenceItem[];
  situations: Situation[];
  analyses: Analysis[];
  rehearsals: Rehearsal[];
  catalogLoading: boolean;
  onStartNewSituation: (preselectedPersonaId?: string) => void;
  onStartCompare: () => void;
  onAnalyzeSavedSituation: (situation: Situation) => void;
  onOpenAnalysis: (situation: Situation, analysis: Analysis) => void;
  onOpenRehearsal: (situation: Situation, rehearsal: Rehearsal) => void;
  onOpenHistory: () => void;
}

export function HomeView({
  user,
  personas,
  evidenceLibrary,
  situations,
  analyses,
  rehearsals,
  catalogLoading,
  onStartNewSituation,
  onStartCompare,
  onAnalyzeSavedSituation,
  onOpenAnalysis,
  onOpenRehearsal,
  onOpenHistory,
}: HomeViewProps) {
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
  const [expandedEvidenceId, setExpandedEvidenceId] = useState<string | null>(null);

  const selectedPersona =
    personas.find((p) => p.id === selectedPersonaId) ?? personas[0] ?? null;

  const recentSituations = situations.slice(0, 3);

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 pb-24 md:pb-14">
      {/* Editorial Header */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-[#E5E0D8]">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-[#78350F] mb-2">
            Living Your Day · Personal Workspace
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight text-[#1C1917] [text-wrap:balance]">
            Welcome back, {user.name.split(' ')[0]}
          </h1>
          <p className="text-sm sm:text-base text-[#57534E] mt-2 max-w-2xl leading-relaxed">
            Bring a real conversation, message, or decision. Examine it through a
            documented historical mind, then test that approach against communication
            science.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onStartCompare}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-[#1E3A8A] bg-white border border-[#D6CEBE] rounded-lg hover:bg-[#F2EFE9] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E3A8A]"
          >
            <GitCompare className="w-4 h-4" aria-hidden="true" />
            <span>Compare View</span>
          </button>

          <button
            type="button"
            onClick={() => onStartNewSituation()}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#1E3A8A] rounded-lg hover:bg-[#1E3A8A]/90 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E3A8A]"
          >
            <span>New Situation</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </section>

      {/* Catalog Pending Notice (only if DB catalog empty after load) */}
      {!catalogLoading && (personas.length === 0 || evidenceLibrary.length === 0) && (
        <section
          role="status"
          className="mt-6 p-5 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl text-sm text-[#78350F]"
        >
          The read-only Persona &amp; Evidence database catalog has not been populated yet.
          Sign in with the workspace administrator account to initialize the reference
          collections.
        </section>
      )}

      {/* Recent Situations */}
      <section className="mt-10">
        <div className="flex items-baseline justify-between gap-4 mb-4">
          <h2 className="font-serif text-xl sm:text-2xl font-semibold text-[#1C1917]">
            Recent Reflections
          </h2>
          {situations.length > 0 && (
            <button
              type="button"
              onClick={onOpenHistory}
              className="text-xs font-medium text-[#1E3A8A] hover:underline whitespace-nowrap shrink-0"
            >
              View all ({situations.length})
            </button>
          )}
        </div>

        {recentSituations.length === 0 ? (
          <div className="bg-white border border-[#E5E0D8] rounded-xl p-8 text-center">
            <p className="font-serif text-lg text-[#1C1917] mb-2">
              No situations analyzed yet
            </p>
            <p className="text-sm text-[#57534E] max-w-md mx-auto mb-5">
              Describe a real message you need to send or a tension you are navigating to
              generate your first persona analysis and Reality Check.
            </p>
            <button
              type="button"
              onClick={() => onStartNewSituation()}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#1E3A8A] bg-[#F2EFE9] border border-[#D6CEBE] rounded-lg hover:bg-[#EBE6DF] transition-colors"
            >
              <span>Describe a Situation</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {recentSituations.map((situation) => {
              const sitAnalyses = analyses.filter((a) => a.situationId === situation.id);
              const latestAnalysis = sitAnalyses[0];
              const latestRehearsal = rehearsals.find((r) => r.situationId === situation.id);
              const persona = latestAnalysis
                ? personas.find((p) => p.id === latestAnalysis.personaId)
                : undefined;
              const dateLabel = new Date(situation.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });

              return (
                <article
                  key={situation.id}
                  className="bg-white border border-[#E5E0D8] rounded-xl p-5 flex flex-col justify-between gap-4 min-w-0"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs text-[#78716C] tabular-nums mb-2">
                      <span className="shrink-0">{dateLabel}</span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate">{situation.otherPersonRole}</span>
                    </div>
                    <h3 className="font-serif text-lg font-semibold text-[#1C1917] leading-snug mb-2 break-words">
                      {situation.title}
                    </h3>
                    <p className="text-sm text-[#57534E] line-clamp-2 leading-relaxed break-words">
                      {situation.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[#E5E0D8] flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-[#57534E]">
                      {persona ? `Lens: ${persona.name}` : 'Saved situation'}
                    </span>
                    <div className="flex items-center gap-3">
                      {latestRehearsal && (
                        <button
                          type="button"
                          onClick={() => onOpenRehearsal(situation, latestRehearsal)}
                          className="text-xs font-medium text-[#78350F] hover:underline whitespace-nowrap"
                        >
                          Resume Larp
                        </button>
                      )}
                      {latestAnalysis ? (
                        <button
                          type="button"
                          onClick={() => onOpenAnalysis(situation, latestAnalysis)}
                          className="text-xs font-semibold text-[#1E3A8A] hover:underline whitespace-nowrap"
                        >
                          Open Analysis
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onAnalyzeSavedSituation(situation)}
                          className="text-xs font-semibold text-[#1E3A8A] hover:underline whitespace-nowrap"
                        >
                          Choose Lens
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Historical Personas Catalog */}
      <section className="mt-12 pt-10 border-t border-[#E5E0D8]">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-6">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#78350F]" aria-hidden="true" />
            <h2 className="font-serif text-xl sm:text-2xl font-semibold text-[#1C1917]">
              Historical Persona Lenses
            </h2>
          </div>
          <p className="text-xs text-[#78716C]">
            Read-only database profiles · Grounded in primary writings
          </p>
        </div>

        {catalogLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-32 bg-[#F2EFE9] border border-[#E5E0D8] rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : personas.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Persona selector grid */}
            <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5">
              {personas.map((persona) => {
                const isSelected = selectedPersona?.id === persona.id;
                return (
                  <button
                    key={persona.id}
                    type="button"
                    onClick={() => setSelectedPersonaId(persona.id)}
                    aria-pressed={isSelected}
                    className={`w-full text-left p-4 rounded-xl border transition-colors flex items-start gap-3.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E3A8A] ${
                      isSelected
                        ? 'bg-white border-[#1E3A8A]'
                        : 'bg-[#F2EFE9]/55 border-[#E5E0D8] hover:bg-white'
                    }`}
                  >
                    <PersonaCrest personaId={persona.id} name={persona.name} size="sm" />
                    <div className="min-w-0">
                      <p className="font-serif text-base font-semibold text-[#1C1917]">
                        {persona.name}
                      </p>
                      <p className="text-xs text-[#57534E] line-clamp-2 mt-0.5 leading-relaxed">
                        {persona.lensSummary}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected persona detail panel */}
            {selectedPersona && (
              <article className="lg:col-span-7 bg-white border border-[#E5E0D8] rounded-xl p-6 sm:p-7 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E5E0D8]">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <PersonaCrest
                      personaId={selectedPersona.id}
                      name={selectedPersona.name}
                      size="lg"
                    />
                    <div className="min-w-0">
                      <h3 className="font-serif text-2xl font-semibold text-[#1C1917] break-words">
                        {selectedPersona.name}
                      </h3>
                      <p className="text-xs text-[#78716C] mt-0.5">
                        Primary sources · {selectedPersona.sources.length} documented{' '}
                        {selectedPersona.sources.length === 1 ? 'work' : 'works'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onStartNewSituation(selectedPersona.id)}
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#1E3A8A] rounded-lg hover:bg-[#1E3A8A]/90 transition-colors whitespace-nowrap shrink-0"
                  >
                    Analyze with {getPersonaShortLabel(selectedPersona.name)}
                  </button>
                </div>

                <p className="text-sm text-[#1C1917] leading-relaxed mt-5 mb-6">
                  {selectedPersona.lensSummary}
                </p>

                <div className="space-y-5 text-sm">
                  <div>
                    <h4 className="text-xs font-mono uppercase tracking-wider text-[#78350F] mb-2">
                      Core Principles
                    </h4>
                    <ul className="space-y-1.5 text-[#57534E] list-disc pl-5">
                      {selectedPersona.corePrinciples.map((principle, idx) => (
                        <li key={idx} className="leading-relaxed">
                          {principle}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4 border-t border-[#E5E0D8]">
                    <div>
                      <h4 className="text-xs font-mono uppercase tracking-wider text-[#57534E] mb-1.5">
                        Decision Pattern
                      </h4>
                      <p className="text-[#57534E] leading-relaxed">
                        {selectedPersona.decisionPattern}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-xs font-mono uppercase tracking-wider text-[#57534E] mb-1.5">
                        Communication Style
                      </h4>
                      <p className="text-[#57534E] leading-relaxed">
                        {selectedPersona.communicationStyle}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#E5E0D8]">
                    <h4 className="text-xs font-mono uppercase tracking-wider text-[#9A3412] mb-2">
                      Documented Blind Spots
                    </h4>
                    <ul className="space-y-1.5 text-[#57534E] list-disc pl-5">
                      {selectedPersona.blindSpots.map((spot, idx) => (
                        <li key={idx} className="leading-relaxed">
                          {spot}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-4 border-t border-[#E5E0D8]">
                    <h4 className="text-xs font-mono uppercase tracking-wider text-[#78716C] mb-1.5">
                      Public Writings Referenced
                    </h4>
                    <p className="text-xs text-[#57534E] leading-relaxed">
                      {selectedPersona.sources.join(' · ')}
                    </p>
                  </div>
                </div>
              </article>
            )}
          </div>
        )}
      </section>

      {/* Evidence Library Reference */}
      <section className="mt-12 pt-10 border-t border-[#E5E0D8]">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-6">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-[#14532D]" aria-hidden="true" />
            <h2 className="font-serif text-xl sm:text-2xl font-semibold text-[#1C1917]">
              Communication Evidence Library
            </h2>
          </div>
          <p className="text-xs text-[#78716C]">
            Empirical frameworks used to ground every Reality Check
          </p>
        </div>

        <div className="divide-y divide-[#E5E0D8] bg-white border border-[#E5E0D8] rounded-xl">
          {evidenceLibrary.map((item) => {
            const isExpanded = expandedEvidenceId === item.id;
            return (
              <div key={item.id} className="p-5">
                <button
                  type="button"
                  aria-expanded={isExpanded}
                  onClick={() =>
                    setExpandedEvidenceId(isExpanded ? null : item.id)
                  }
                  className="w-full flex items-start justify-between gap-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E3A8A]"
                >
                  <div>
                    <h3 className="font-serif text-base sm:text-lg font-semibold text-[#1C1917]">
                      {item.name}
                    </h3>
                    <p className="text-xs text-[#14532D] mt-1">
                      Evidence strength: {item.evidenceStrength}
                      <span aria-hidden="true"> · </span>
                      <span className="text-[#78716C]">{item.source}</span>
                    </p>
                  </div>
                  <span className="shrink-0 p-1 text-[#57534E]" aria-hidden="true">
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </span>
                </button>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-[#E5E0D8] grid grid-cols-1 md:grid-cols-3 gap-5 text-sm">
                    <div>
                      <p className="text-xs font-mono uppercase tracking-wider text-[#57534E] mb-1">
                        Mechanism Summary
                      </p>
                      <p className="text-[#57534E] leading-relaxed">{item.summary}</p>
                    </div>
                    <div>
                      <p className="text-xs font-mono uppercase tracking-wider text-[#14532D] mb-1">
                        When It Helps
                      </p>
                      <p className="text-[#57534E] leading-relaxed">{item.whenItHelps}</p>
                    </div>
                    <div>
                      <p className="text-xs font-mono uppercase tracking-wider text-[#9A3412] mb-1">
                        Limits &amp; Caveats
                      </p>
                      <p className="text-[#57534E] leading-relaxed">{item.limits}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
