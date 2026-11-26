import { useState } from 'react';
import { ArrowRight, BookOpen, Scale, MessageSquare } from 'lucide-react';
import heroLibraryImage from '../assets/images/editorial_library_hero_1795295770055.jpg';
import { MANDATORY_INTERPRETATION_NOTE, SEED_PERSONAS } from '../data/seedCatalog.ts';
import { PersonaCrest } from './PersonaCrest.tsx';

interface SignInLandingProps {
  onSignIn: () => void;
  authLoading: boolean;
  authError: string | null;
}

export function SignInLanding({
  onSignIn,
  authLoading,
  authError,
}: SignInLandingProps) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
      {/* Hero Split */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
        <div className="lg:col-span-6 flex flex-col justify-center">
          <p className="text-xs font-mono uppercase tracking-widest text-[#78350F] mb-4">
            Philosophical Reflection &amp; Empirical Reality Check
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl font-semibold tracking-tight text-[#1C1917] leading-[1.12] [text-wrap:balance] mb-5">
            Live your day through someone else’s mind.
          </h1>
          <p className="text-base sm:text-lg text-[#57534E] leading-relaxed max-w-xl mb-8">
            Describe a real conversation, conflict, or tough decision. PersonaLens
            examines it through the documented writings of a historical figure, drafts
            a grounded response, and tests that lens against evidence-based
            communication research.
          </p>

          <div className="flex flex-wrap items-center gap-4 mb-6">
            <button
              type="button"
              disabled={authLoading}
              onClick={onSignIn}
              className="inline-flex items-center gap-2.5 px-6 py-3 text-sm font-semibold text-white bg-[#1E3A8A] rounded-lg hover:bg-[#1E3A8A]/90 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E3A8A]"
            >
              <span>{authLoading ? 'Connecting to Google...' : 'Sign in with Google'}</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
            <span className="text-xs text-[#57534E]">
              Private per-user workspace · Saved in Cloud Firestore
            </span>
          </div>

          {authError && (
            <div
              role="alert"
              className="p-3.5 bg-[#FEF2F2] border border-[#FECACA] rounded-lg text-sm text-[#991B1B] mb-4"
            >
              {authError}
            </div>
          )}

          <p className="text-xs text-[#78716C] italic">
            {MANDATORY_INTERPRETATION_NOTE}
          </p>
        </div>

        <div className="lg:col-span-6">
          <div className="h-full min-h-[280px] sm:min-h-[360px] rounded-xl overflow-hidden border border-[#E5E0D8] bg-[#EBE6DF]">
            {!imageFailed ? (
              <img
                src={heroLibraryImage}
                alt="Sunlit classical study desk with an open philosophical journal, fountain pen, and brass compass"
                referrerPolicy="no-referrer"
                onError={() => setImageFailed(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-[#EBE6DF] to-[#D6CEBE]">
                <BookOpen className="w-10 h-10 text-[#78350F] mb-3" aria-hidden="true" />
                <p className="font-serif text-lg text-[#1C1917]">
                  Curated Historical Lenses &amp; Research Library
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Three-Step Mechanism Strip */}
      <section className="mt-14 pt-10 border-t border-[#E5E0D8]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#78350F] mb-2">
              <BookOpen className="w-4 h-4" aria-hidden="true" />
              <span>01. Living Your Day</span>
            </div>
            <h2 className="font-serif text-xl font-semibold text-[#1C1917] mb-2">
              Structured Persona Analysis
            </h2>
            <p className="text-sm text-[#57534E] leading-relaxed">
              See your dilemma reframed through documented core principles,
              decision-making patterns, and historical blind spots—never generic
              platitudes.
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#14532D] mb-2">
              <Scale className="w-4 h-4" aria-hidden="true" />
              <span>02. Evidence Reality Check</span>
            </div>
            <h2 className="font-serif text-xl font-semibold text-[#1C1917] mb-2">
              Research Comparison
            </h2>
            <p className="text-sm text-[#57534E] leading-relaxed">
              Every interpretation is cross-checked against our curated database of
              communication studies—highlighting where philosophy aligns with or
              diverges from empirical findings.
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#1E3A8A] mb-2">
              <MessageSquare className="w-4 h-4" aria-hidden="true" />
              <span>03. Larp Mode Rehearsal</span>
            </div>
            <h2 className="font-serif text-xl font-semibold text-[#1C1917] mb-2">
              Practice Before You Reply
            </h2>
            <p className="text-sm text-[#57534E] leading-relaxed">
              Test your wording in a back-and-forth simulation. One voice plays the
              other person while your chosen historical persona coaches your next move.
            </p>
          </div>
        </div>
      </section>

      {/* Curated Figures Index */}
      <section className="mt-14 pt-10 border-t border-[#E5E0D8]">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-6">
          <h2 className="font-serif text-2xl font-semibold text-[#1C1917]">
            Included Historical Lenses
          </h2>
          <p className="text-xs text-[#78716C]">
            Sign in with Google to access the full database and save private analyses
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {SEED_PERSONAS.map((persona) => (
            <article
              key={persona.id}
              className="bg-white border border-[#E5E0D8] rounded-xl p-5 flex items-start gap-3.5"
            >
              <PersonaCrest personaId={persona.id} name={persona.name} size="md" />
              <div className="min-w-0">
                <h3 className="font-serif text-lg font-semibold text-[#1C1917] mb-1">
                  {persona.name}
                </h3>
                <p className="text-sm text-[#57534E] leading-relaxed mb-3">
                  {persona.lensSummary}
                </p>
                <p className="text-xs text-[#78716C]">
                  Primary source · {persona.sources[0]}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
