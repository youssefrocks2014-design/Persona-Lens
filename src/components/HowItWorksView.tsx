import { ArrowRight, BookOpen, GitCompare, MessageSquare, Scale, ShieldCheck } from 'lucide-react';
import { MANDATORY_INTERPRETATION_NOTE } from '../data/seedCatalog.ts';
import type { EvidenceItem } from '../types/personaLens.ts';
import { getEvidenceStrengthBadge } from '../utils/evidenceDisplay.ts';

interface HowItWorksViewProps {
  evidenceLibrary: EvidenceItem[];
  isSignedIn: boolean;
  onStartNewSituation: () => void;
  onBackHome: () => void;
  onSignIn: () => void;
}

export function HowItWorksView({
  evidenceLibrary,
  isSignedIn,
  onStartNewSituation,
  onBackHome,
  onSignIn,
}: HowItWorksViewProps) {
  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 pb-24 md:pb-14">
      <div className="pb-6 border-b border-[#E5E0D8]">
        <p className="text-xs font-mono uppercase tracking-widest text-[#78350F] mb-2">
          Method &amp; Transparency
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight text-[#1C1917] [text-wrap:balance]">
          How PersonaLens Works
        </h1>
        <p className="text-sm sm:text-base text-[#57534E] mt-2.5 leading-relaxed max-w-2xl">
          PersonaLens helps you reflect on real conversations and tough decisions by pairing
          historical perspective-taking with empirical communication research—without
          inventing quotes or hiding weak evidence.
        </p>
      </div>

      {/* Core Method Pillars */}
      <section className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <article className="bg-white border border-[#E5E0D8] rounded-xl p-6">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#78350F] mb-2">
            <BookOpen className="w-4 h-4" aria-hidden="true" />
            <span>01. Interpretations, Not Actual Quotes</span>
          </div>
          <h2 className="font-serif text-xl font-semibold text-[#1C1917] mb-2.5">
            Grounded strictly in documented persona cards
          </h2>
          <p className="text-sm text-[#57534E] leading-relaxed">
            Every historical figure in PersonaLens is represented by a curated card built from
            their public writings, core principles, decision patterns, communication style, and
            documented blind spots. Analyses are written in the third person (
            <span className="italic">“Through the lens of...”</span>) and never invent quotes
            or claim what the person would literally say.
          </p>
          <p className="mt-4 pt-3 border-t border-[#E5E0D8] text-xs font-medium text-[#1C1917] italic">
            “{MANDATORY_INTERPRETATION_NOTE}”
          </p>
        </article>

        <article className="bg-white border border-[#E5E0D8] rounded-xl p-6">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#14532D] mb-2">
            <Scale className="w-4 h-4" aria-hidden="true" />
            <span>02. Evidence-Based Reality Check</span>
          </div>
          <h2 className="font-serif text-xl font-semibold text-[#1C1917] mb-2.5">
            Honest strength labels from research
          </h2>
          <p className="text-sm text-[#57534E] leading-relaxed">
            Historical habits are not automatically good modern advice. Every suggested
            response is cross-checked solely against our curated 9-entry communication research
            library. Each cited framework is labeled honestly by evidence strength—and if no
            entry fits, PersonaLens states{' '}
            <span className="font-medium text-[#1C1917]">
              “No matching evidence in the library.”
            </span>
          </p>
          <div className="mt-4 pt-3 border-t border-[#E5E0D8] flex flex-wrap gap-2 text-[11px] font-semibold">
            <span className="px-2.5 py-0.5 rounded-md border bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]">
              Strong: replicated / meta-analytic support
            </span>
            <span className="px-2.5 py-0.5 rounded-md border bg-[#EFF6FF] text-[#1E3A8A] border-[#BFDBFE]">
              Moderate: context-dependent or lab/field evidence
            </span>
            <span className="px-2.5 py-0.5 rounded-md border bg-[#FFF7ED] text-[#9A3412] border-[#FED7AA]">
              Low to limited: popular, thin empirical backing
            </span>
          </div>
        </article>

        <article className="bg-white border border-[#E5E0D8] rounded-xl p-6">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#1E3A8A] mb-2">
            <GitCompare className="w-4 h-4" aria-hidden="true" />
            <span>03. Compare Two Personas</span>
          </div>
          <h2 className="font-serif text-xl font-semibold text-[#1C1917] mb-2.5">
            Test the same situation side by side
          </h2>
          <p className="text-sm text-[#57534E] leading-relaxed">
            Use Compare View on New Situation, on any analysis result, or from History to run
            the exact same dilemma through two different historical minds. Both analyses are
            saved together under the same situation so you can weigh blind spots and evidence
            side by side.
          </p>
        </article>

        <article className="bg-white border border-[#E5E0D8] rounded-xl p-6">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#14532D] mb-2">
            <MessageSquare className="w-4 h-4" aria-hidden="true" />
            <span>04. Practice &amp; Safety Scope</span>
          </div>
          <h2 className="font-serif text-xl font-semibold text-[#1C1917] mb-2.5">
            Reflection practice, not clinical care
          </h2>
          <p className="text-sm text-[#57534E] leading-relaxed">
            Larp Mode lets you rehearse a difficult reply before sending it. PersonaLens is built
            for reflection and communication practice—never therapy, medical, or legal advice.
            If a message describes self-harm, abuse, or immediate danger, PersonaLens pauses
            analysis, surfaces a calm support notice, and does not save that entry to History.
          </p>
        </article>
      </section>

      {/* Evidence Library Strength Breakdown */}
      <section className="mt-10 bg-white border border-[#E5E0D8] rounded-xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 pb-5 border-b border-[#E5E0D8]">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#14532D] mb-1">
              <ShieldCheck className="w-4 h-4" aria-hidden="true" />
              <span>Curated Evidence Library</span>
            </div>
            <h2 className="font-serif text-2xl font-semibold text-[#1C1917]">
              Frameworks &amp; Honest Strength Ratings
            </h2>
          </div>
          <p className="text-xs text-[#78716C]">
            Popular does not mean well supported
          </p>
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          {evidenceLibrary.map((item) => {
            const strength = getEvidenceStrengthBadge(item.evidenceStrength);
            return (
              <article
                key={item.id}
                className="p-4 rounded-xl border border-[#E5E0D8] bg-[#FBF9F5]"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-serif text-base font-semibold text-[#1C1917]">
                    {item.name}
                  </h3>
                  <span className="text-[11px] font-mono text-[#78716C]">
                    {item.id}
                  </span>
                </div>
                <div className="mt-2">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 text-[11px] font-semibold rounded-md border ${strength.badgeClass}`}
                  >
                    Strength: {strength.label}
                  </span>
                </div>
                <p className="text-xs text-[#292524] leading-relaxed mt-2.5">
                  {item.summary}
                </p>
                <p className="text-xs text-[#57534E] leading-relaxed mt-1.5">
                  <span className="font-medium text-[#1C1917]">Limits:</span> {item.limits}
                </p>
                <p className="text-[11px] text-[#78716C] mt-1.5">
                  Source: {item.source}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      {/* Bottom CTA */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-[#E5E0D8]">
        <p className="text-xs text-[#78716C] italic">
          {MANDATORY_INTERPRETATION_NOTE}
        </p>
        <div className="flex items-center gap-3">
          {isSignedIn ? (
            <>
              <button
                type="button"
                onClick={onBackHome}
                className="px-4 py-2 text-xs sm:text-sm font-medium text-[#1C1917] bg-white border border-[#D6CEBE] rounded-lg hover:bg-[#F2EFE9] transition-colors whitespace-nowrap"
              >
                Back to Home
              </button>
              <button
                type="button"
                onClick={onStartNewSituation}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-[#1E3A8A] rounded-lg hover:bg-[#1E3A8A]/90 transition-colors whitespace-nowrap"
              >
                <span>Describe a Situation</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#1E3A8A] rounded-lg hover:bg-[#1E3A8A]/90 transition-colors whitespace-nowrap"
            >
              <span>Sign in with Google</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
