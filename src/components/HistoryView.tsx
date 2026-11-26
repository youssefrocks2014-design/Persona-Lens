import { useState } from 'react';
import { ArrowRight, GitCompare, MessageSquare, Search, Trash2 } from 'lucide-react';
import type {
  Analysis,
  Persona,
  Rehearsal,
  Situation,
} from '../types/personaLens.ts';
import { filterHistorySituations, getPersonaShortLabel } from '../utils/validation.ts';
import { PersonaCrest } from './PersonaCrest.tsx';

interface HistoryViewProps {
  situations: Situation[];
  analyses: Analysis[];
  rehearsals: Rehearsal[];
  personas: Persona[];
  onOpenAnalysis: (situation: Situation, analysis: Analysis) => void;
  onOpenCompare: (situation: Situation, analysesForSituation: Analysis[]) => void;
  onOpenRehearsal: (situation: Situation, rehearsal: Rehearsal) => void;
  onDeleteSituation: (
    situationId: string,
    relatedAnalyses: Analysis[],
    relatedRehearsals: Rehearsal[]
  ) => Promise<void>;
  onStartNewSituation: () => void;
}

export function HistoryView({
  situations,
  analyses,
  rehearsals,
  personas,
  onOpenAnalysis,
  onOpenCompare,
  onOpenRehearsal,
  onDeleteSituation,
  onStartNewSituation,
}: HistoryViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [personaFilter, setPersonaFilter] = useState('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const items = filterHistorySituations(
    situations,
    analyses,
    searchQuery,
    personaFilter
  );

  async function handleConfirmDelete(
    situation: Situation,
    relatedAnalyses: Analysis[],
    relatedRehearsals: Rehearsal[]
  ) {
    setDeletingId(situation.id);
    try {
      await onDeleteSituation(situation.id, relatedAnalyses, relatedRehearsals);
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  }

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 pb-24 md:pb-14">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[#E5E0D8]">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-[#78350F] mb-2">
            Private Archive
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight text-[#1C1917]">
            Situation &amp; Analysis History
          </h1>
          <p className="text-sm text-[#57534E] mt-1.5">
            Only visible to your signed-in account. Search past dilemmas, analyses, and
            rehearsal transcripts.
          </p>
        </div>

        <button
          type="button"
          onClick={onStartNewSituation}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white bg-[#1E3A8A] rounded-lg hover:bg-[#1E3A8A]/90 transition-colors whitespace-nowrap shrink-0"
        >
          <span>New Situation</span>
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      {/* Filter & Search Bar */}
      <section className="mt-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search
            className="w-4 h-4 text-[#78716C] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <label htmlFor="history-search" className="sr-only">
            Search saved situations
          </label>
          <input
            id="history-search"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, role, or outcome..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-[#D6CEBE] rounded-lg text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#1E3A8A]"
          />
        </div>

        <div
          role="group"
          aria-label="Filter by persona lens"
          className="flex flex-wrap items-center gap-1.5"
        >
          <button
            type="button"
            onClick={() => setPersonaFilter('all')}
            aria-pressed={personaFilter === 'all'}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
              personaFilter === 'all'
                ? 'bg-[#1C1917] text-white border-[#1C1917]'
                : 'bg-white text-[#57534E] border-[#E5E0D8] hover:text-[#1C1917]'
            }`}
          >
            All Lenses
          </button>
          {personas.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPersonaFilter(p.id)}
              aria-pressed={personaFilter === p.id}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                personaFilter === p.id
                  ? 'bg-[#1C1917] text-white border-[#1C1917]'
                  : 'bg-white text-[#57534E] border-[#E5E0D8] hover:text-[#1C1917]'
              }`}
            >
              <PersonaCrest personaId={p.id} name={p.name} size="xs" />
              <span>{getPersonaShortLabel(p.name)}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Results List */}
      <section className="mt-6">
        {situations.length === 0 ? (
          <div className="bg-white border border-[#E5E0D8] rounded-xl p-10 text-center">
            <h2 className="font-serif text-xl font-semibold text-[#1C1917] mb-2">
              Your archive is empty
            </h2>
            <p className="text-sm text-[#57534E] max-w-md mx-auto mb-5">
              Situations you analyze and Larp Mode rehearsals you run will appear here
              automatically.
            </p>
            <button
              type="button"
              onClick={onStartNewSituation}
              className="px-4 py-2 text-sm font-semibold text-white bg-[#1E3A8A] rounded-lg hover:bg-[#1E3A8A]/90 transition-colors"
            >
              Create First Situation
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white border border-[#E5E0D8] rounded-xl p-8 text-center text-sm text-[#57534E]">
            No situations matched your search or lens filter.
          </div>
        ) : (
          <div className="space-y-4">
            {items.map(({ situation, analyses: sitAnalyses }) => {
              const sitRehearsals = rehearsals.filter(
                (r) => r.situationId === situation.id
              );
              const formattedDate = new Date(situation.createdAt).toLocaleDateString(
                'en-US',
                {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                }
              );

              return (
                <article
                  key={situation.id}
                  className="bg-white border border-[#E5E0D8] rounded-xl p-5 sm:p-6"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#78716C] tabular-nums mb-1.5">
                        <span>{formattedDate}</span>
                        <span aria-hidden="true">·</span>
                        <span>{situation.otherPersonRole}</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {sitAnalyses.length}{' '}
                          {sitAnalyses.length === 1 ? 'analysis' : 'analyses'}
                        </span>
                      </div>
                      <h2 className="font-serif text-xl font-semibold text-[#1C1917] break-words">
                        {situation.title}
                      </h2>
                    </div>

                    <div className="shrink-0">
                      {confirmDeleteId === situation.id ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={deletingId === situation.id}
                            onClick={() =>
                              handleConfirmDelete(situation, sitAnalyses, sitRehearsals)
                            }
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-[#991B1B] rounded-lg hover:bg-[#991B1B]/90"
                          >
                            {deletingId === situation.id ? 'Deleting...' : 'Confirm'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-3 py-1.5 text-xs font-medium text-[#57534E] bg-[#F2EFE9] rounded-lg hover:text-[#1C1917]"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          aria-label={`Delete ${situation.title}`}
                          onClick={() => setConfirmDeleteId(situation.id)}
                          className="p-2 text-[#78716C] hover:text-[#991B1B] rounded-lg hover:bg-[#FEF2F2] transition-colors"
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-[#57534E] mt-1.5 leading-relaxed line-clamp-2 break-words">
                    {situation.description}
                  </p>

                  {/* Linked Analyses & Rehearsals */}
                  <div className="mt-4 pt-4 border-t border-[#E5E0D8] flex flex-wrap items-center gap-3">
                    {sitAnalyses.map((analysis) => {
                      const persona = personas.find((p) => p.id === analysis.personaId);
                      return (
                        <button
                          key={analysis.id}
                          type="button"
                          onClick={() => onOpenAnalysis(situation, analysis)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#1E3A8A] bg-[#FBF9F5] border border-[#D6CEBE] rounded-lg hover:bg-[#F2EFE9] transition-colors"
                        >
                          <PersonaCrest
                            personaId={analysis.personaId}
                            name={persona?.name ?? analysis.personaId}
                            size="xs"
                          />
                          <span>View {persona?.name ?? analysis.personaId}</span>
                        </button>
                      );
                    })}

                    {sitAnalyses.length > 0 && (
                      <button
                        type="button"
                        onClick={() => onOpenCompare(situation, sitAnalyses)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#14532D] bg-[#F2F7F4] border border-[#B7D3C0] rounded-lg hover:bg-[#E1EFE6] transition-colors"
                      >
                        <GitCompare className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>
                          {sitAnalyses.length >= 2 ? 'Compare Side-by-Side' : 'Compare Lenses'}
                        </span>
                      </button>
                    )}

                    {sitRehearsals.map((rehearsal) => {
                      const persona = personas.find((p) => p.id === rehearsal.personaId);
                      return (
                        <button
                          key={rehearsal.id}
                          type="button"
                          onClick={() => onOpenRehearsal(situation, rehearsal)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#78350F] bg-[#FBF9F5] border border-[#D6CEBE] rounded-lg hover:bg-[#F2EFE9] transition-colors"
                        >
                          <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>
                            Larp ({persona ? getPersonaShortLabel(persona.name) : rehearsal.personaId} ·{' '}
                            {rehearsal.messages.length} msgs)
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
