import { useState, type FormEvent } from 'react';
import { ArrowRight, GitCompare, Loader2 } from 'lucide-react';
import { SAMPLE_SITUATIONS } from '../data/sampleSituations.ts';
import { MANDATORY_INTERPRETATION_NOTE } from '../data/seedCatalog.ts';
import type { Persona, Situation, SituationInput } from '../types/personaLens.ts';
import { getPersonaShortLabel, SITUATION_LIMITS, validateSituationInput } from '../utils/validation.ts';
import { PersonaCrest } from './PersonaCrest.tsx';
import { SafetySupportCard } from './SafetySupportCard.tsx';

interface NewSituationViewProps {
  personas: Persona[];
  initialPersonaId?: string;
  initialSituation?: Situation;
  initialMode?: 'single' | 'compare';
  submitting: boolean;
  submitError: string | null;
  safetyAlert?: string | null;
  onClearSafetyAlert?: () => void;
  onSubmit: (input: SituationInput, persona: Persona) => Promise<void>;
  onCompareSubmit: (
    input: SituationInput,
    personaA: Persona,
    personaB: Persona
  ) => Promise<void>;
}

export function NewSituationView({
  personas,
  initialPersonaId,
  initialSituation,
  initialMode = 'single',
  submitting,
  submitError,
  safetyAlert,
  onClearSafetyAlert,
  onSubmit,
  onCompareSubmit,
}: NewSituationViewProps) {
  const defaultFirstId = initialPersonaId ?? personas[0]?.id ?? '';
  const defaultSecondId =
    personas.find((p) => p.id !== defaultFirstId)?.id ?? personas[1]?.id ?? '';

  const [mode, setMode] = useState<'single' | 'compare'>(initialMode);
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);
  const [title, setTitle] = useState(initialSituation?.title ?? '');
  const [otherPersonRole, setOtherPersonRole] = useState(
    initialSituation?.otherPersonRole ?? ''
  );
  const [description, setDescription] = useState(
    initialSituation?.description ?? ''
  );
  const [desiredOutcome, setDesiredOutcome] = useState(
    initialSituation?.desiredOutcome ?? ''
  );
  const [personaId, setPersonaId] = useState(defaultFirstId);
  const [comparePersonaBId, setComparePersonaBId] = useState(defaultSecondId);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const activePersonaId = personaId || personas[0]?.id || '';
  const activePersonaBId =
    comparePersonaBId && comparePersonaBId !== activePersonaId
      ? comparePersonaBId
      : personas.find((p) => p.id !== activePersonaId)?.id || '';

  const selectedPersona = personas.find((p) => p.id === activePersonaId);
  const selectedPersonaB = personas.find((p) => p.id === activePersonaBId);

  function handleApplySample(presetId: string) {
    if (submitting) return;
    const preset = SAMPLE_SITUATIONS.find((s) => s.id === presetId);
    if (!preset) return;
    setSelectedSampleId(preset.id);
    setTitle(preset.input.title);
    setOtherPersonRole(preset.input.otherPersonRole);
    setDescription(preset.input.description);
    setDesiredOutcome(preset.input.desiredOutcome);
    setFieldErrors({});
    onClearSafetyAlert?.();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const input: SituationInput = {
      title,
      otherPersonRole,
      description,
      desiredOutcome,
    };
    const errors = validateSituationInput(input, activePersonaId);
    if (mode === 'compare') {
      if (!activePersonaBId || activePersonaBId === activePersonaId) {
        errors.personaBId = 'Please choose two distinct personas to compare.';
      }
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0 || !selectedPersona) {
      return;
    }

    if (mode === 'compare') {
      if (!selectedPersonaB) return;
      await onCompareSubmit(input, selectedPersona, selectedPersonaB);
    } else {
      await onSubmit(input, selectedPersona);
    }
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 pb-24 md:pb-14">
      <div className="pb-6 border-b border-[#E5E0D8] mb-7 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-[#78350F] mb-2">
            Mode 1 · Living Your Day
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight text-[#1C1917]">
            Describe a Real Situation
          </h1>
          <p className="text-sm sm:text-base text-[#57534E] mt-2 leading-relaxed max-w-2xl">
            Share a difficult message, interpersonal friction, or decision. Analyze it
            through one database persona or compare two lenses side-by-side.
          </p>
        </div>

        {/* Single vs Compare Mode Switch */}
        <div
          role="group"
          aria-label="Analysis mode"
          className="inline-flex items-center p-1 bg-[#EBE6DF] rounded-lg shrink-0 self-start sm:self-auto"
        >
          <button
            type="button"
            disabled={submitting}
            onClick={() => {
              setMode('single');
              setFieldErrors((prev) => {
                const next = { ...prev };
                delete next.personaBId;
                return next;
              });
            }}
            aria-pressed={mode === 'single'}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap disabled:opacity-60 ${
              mode === 'single'
                ? 'bg-white text-[#1C1917] shadow-sm'
                : 'text-[#57534E] hover:text-[#1C1917]'
            }`}
          >
            Single Persona
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => setMode('compare')}
            aria-pressed={mode === 'compare'}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap disabled:opacity-60 ${
              mode === 'compare'
                ? 'bg-white text-[#1E3A8A] shadow-sm'
                : 'text-[#57534E] hover:text-[#1C1917]'
            }`}
          >
            <GitCompare className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Compare View</span>
          </button>
        </div>
      </div>

      {/* Try a Sample Situation Quick-Fill Pills */}
      <section aria-label="Sample situations" className="mb-7">
        <p className="text-xs font-mono uppercase tracking-wider text-[#57534E] mb-2.5">
          Try a Sample Situation
        </p>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_SITUATIONS.map((preset) => {
            const active = selectedSampleId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                disabled={submitting}
                data-testid={`sample-pill-${preset.id}`}
                onClick={() => handleApplySample(preset.id)}
                aria-pressed={active}
                className={`px-3.5 py-2 text-xs font-medium rounded-full border transition-colors whitespace-nowrap disabled:opacity-60 ${
                  active
                    ? 'bg-[#1E3A8A] text-white border-[#1E3A8A]'
                    : 'bg-white text-[#1C1917] border-[#D6CEBE] hover:bg-[#F2EFE9]'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </section>

      <form onSubmit={handleSubmit} noValidate className="space-y-7">
        <fieldset disabled={submitting} className="space-y-7 min-w-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label
              htmlFor="situation-title"
              className="block text-sm font-semibold text-[#1C1917] mb-1.5"
            >
              Situation Title
            </label>
            <input
              id="situation-title"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setSelectedSampleId(null);
              }}
              maxLength={SITUATION_LIMITS.titleMax}
              placeholder="e.g., Pushing back on last-minute scope"
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#D6CEBE] rounded-lg text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#1E3A8A]"
            />
            {fieldErrors.title && (
              <p role="alert" className="text-xs text-[#991B1B] mt-1.5">
                {fieldErrors.title}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="other-person-role"
              className="block text-sm font-semibold text-[#1C1917] mb-1.5"
            >
              Other Person’s Role
            </label>
            <input
              id="other-person-role"
              type="text"
              value={otherPersonRole}
              onChange={(e) => {
                setOtherPersonRole(e.target.value);
                setSelectedSampleId(null);
              }}
              maxLength={SITUATION_LIMITS.otherPersonRoleMax}
              placeholder="e.g., Engineering Manager, Co-founder, Client"
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#D6CEBE] rounded-lg text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#1E3A8A]"
            />
            {fieldErrors.otherPersonRole && (
              <p role="alert" className="text-xs text-[#991B1B] mt-1.5">
                {fieldErrors.otherPersonRole}
              </p>
            )}
          </div>
        </div>

        <div>
          <label
            htmlFor="situation-description"
            className="block text-sm font-semibold text-[#1C1917] mb-1.5"
          >
            What Happened or Needs a Response?
          </label>
          <textarea
            id="situation-description"
            rows={5}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setSelectedSampleId(null);
            }}
            maxLength={SITUATION_LIMITS.descriptionMax}
            placeholder="Include the message you received, the context, and what makes this moment tense or unclear..."
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#D6CEBE] rounded-lg text-[#1C1917] placeholder:text-[#A8A29E] leading-relaxed focus:outline-none focus:border-[#1E3A8A]"
          />
          <div className="flex items-center justify-between gap-4 mt-1">
            {fieldErrors.description ? (
              <p role="alert" className="text-xs text-[#991B1B]">
                {fieldErrors.description}
              </p>
            ) : (
              <span className="text-xs text-[#78716C]">
                Saved privately to your account
              </span>
            )}
            <span className="text-xs font-mono tabular-nums text-[#78716C]">
              {description.length}/{SITUATION_LIMITS.descriptionMax}
            </span>
          </div>
        </div>

        <div>
          <label
            htmlFor="desired-outcome"
            className="block text-sm font-semibold text-[#1C1917] mb-1.5"
          >
            Desired Outcome
          </label>
          <textarea
            id="desired-outcome"
            rows={2}
            value={desiredOutcome}
            onChange={(e) => {
              setDesiredOutcome(e.target.value);
              setSelectedSampleId(null);
            }}
            maxLength={SITUATION_LIMITS.desiredOutcomeMax}
            placeholder="e.g., Protect release quality without damaging trust or sounding defensive"
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#D6CEBE] rounded-lg text-[#1C1917] placeholder:text-[#A8A29E] leading-relaxed focus:outline-none focus:border-[#1E3A8A]"
          />
          {fieldErrors.desiredOutcome && (
            <p role="alert" className="text-xs text-[#991B1B] mt-1.5">
              {fieldErrors.desiredOutcome}
            </p>
          )}
        </div>

        {/* Persona Selection (Single vs Compare Two Personas) */}
        {mode === 'single' ? (
          <fieldset>
            <legend className="text-sm font-semibold text-[#1C1917] mb-1">
              Choose a Historical Persona Lens
            </legend>
            <p className="text-xs text-[#78716C] mb-3">
              Select one documented figure from the PersonaLens library
            </p>

            {personas.length === 0 ? (
              <p className="text-sm text-[#991B1B]">
                No persona cards are available in the database yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {personas.map((persona) => {
                  const checked = activePersonaId === persona.id;
                  return (
                    <label
                      key={persona.id}
                      className={`cursor-pointer p-4 rounded-xl border transition-colors flex items-start gap-3 ${
                        checked
                          ? 'bg-white border-[#1E3A8A]'
                          : 'bg-[#F2EFE9]/55 border-[#E5E0D8] hover:bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="personaId"
                        value={persona.id}
                        checked={checked}
                        onChange={() => setPersonaId(persona.id)}
                        className="mt-1 accent-[#1E3A8A]"
                      />
                      <PersonaCrest personaId={persona.id} name={persona.name} size="sm" />
                      <div className="min-w-0">
                        <span className="block font-serif text-base font-semibold text-[#1C1917]">
                          {persona.name}
                        </span>
                        <span className="block text-xs text-[#57534E] leading-relaxed mt-0.5 line-clamp-2">
                          {persona.lensSummary}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            {fieldErrors.personaId && (
              <p role="alert" className="text-xs text-[#991B1B] mt-2">
                {fieldErrors.personaId}
              </p>
            )}
          </fieldset>
        ) : (
          <fieldset>
            <legend className="text-sm font-semibold text-[#1C1917] mb-1">
              Choose Two Personas to Compare Side-by-Side
            </legend>
            <p className="text-xs text-[#78716C] mb-3">
              Both analyses run on this exact situation and save together under the same entry in History.
            </p>

            {personas.length < 2 ? (
              <p className="text-sm text-[#991B1B]">
                At least two persona cards are required for Compare View.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-white border border-[#D6CEBE] rounded-xl space-y-3">
                  <label
                    htmlFor="compare-persona-a"
                    className="block text-xs font-mono uppercase tracking-wider text-[#78350F]"
                  >
                    First Persona (Lens A)
                  </label>
                  <select
                    id="compare-persona-a"
                    value={activePersonaId}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      setPersonaId(nextId);
                      if (nextId === activePersonaBId) {
                        const alt = personas.find((p) => p.id !== nextId);
                        if (alt) setComparePersonaBId(alt.id);
                      }
                    }}
                    className="w-full px-3 py-2 text-sm font-medium bg-[#FBF9F5] border border-[#D6CEBE] rounded-lg text-[#1C1917] focus:outline-none focus:border-[#1E3A8A]"
                  >
                    {personas.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  {selectedPersona && (
                    <div className="flex items-start gap-2.5 pt-1">
                      <PersonaCrest
                        personaId={selectedPersona.id}
                        name={selectedPersona.name}
                        size="sm"
                      />
                      <p className="text-xs text-[#57534E] leading-relaxed">
                        {selectedPersona.lensSummary}
                      </p>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-white border border-[#D6CEBE] rounded-xl space-y-3">
                  <label
                    htmlFor="compare-persona-b"
                    className="block text-xs font-mono uppercase tracking-wider text-[#1E3A8A]"
                  >
                    Second Persona (Lens B)
                  </label>
                  <select
                    id="compare-persona-b"
                    value={activePersonaBId}
                    onChange={(e) => setComparePersonaBId(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-medium bg-[#FBF9F5] border border-[#D6CEBE] rounded-lg text-[#1C1917] focus:outline-none focus:border-[#1E3A8A]"
                  >
                    {personas.map((p) => (
                      <option key={p.id} value={p.id} disabled={p.id === activePersonaId}>
                        {p.name}
                        {p.id === activePersonaId ? ' (Selected in Lens A)' : ''}
                      </option>
                    ))}
                  </select>
                  {selectedPersonaB && (
                    <div className="flex items-start gap-2.5 pt-1">
                      <PersonaCrest
                        personaId={selectedPersonaB.id}
                        name={selectedPersonaB.name}
                        size="sm"
                      />
                      <p className="text-xs text-[#57534E] leading-relaxed">
                        {selectedPersonaB.lensSummary}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {fieldErrors.personaBId && (
              <p role="alert" className="text-xs text-[#991B1B] mt-2">
                {fieldErrors.personaBId}
              </p>
            )}
          </fieldset>
        )}
        </fieldset>

        {safetyAlert && (
          <SafetySupportCard
            message={safetyAlert}
            onDismiss={onClearSafetyAlert}
            actionLabel="Dismiss & Edit"
          />
        )}

        {submitError && (
          <div
            role="alert"
            className="p-4 bg-[#FEF2F2] border border-[#FECACA] rounded-xl text-sm text-[#991B1B]"
          >
            {submitError}
          </div>
        )}

        {submitting && (
          <div
            role="status"
            aria-live="polite"
            className="p-4 bg-[#F2EFE9] border border-[#D6CEBE] rounded-xl flex items-center gap-3 text-xs sm:text-sm text-[#1C1917]"
          >
            <Loader2 className="w-4 h-4 animate-spin text-[#1E3A8A] shrink-0" aria-hidden="true" />
            <span>
              {mode === 'compare'
                ? 'Running both persona lenses in parallel and cross-checking the Evidence Library...'
                : 'Interpreting your situation through the persona card and checking the Evidence Library...'}
            </span>
          </div>
        )}

        <div className="pt-4 border-t border-[#E5E0D8] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-xs text-[#78716C] italic">
            {MANDATORY_INTERPRETATION_NOTE}
          </p>

          <button
            type="submit"
            disabled={submitting || personas.length === 0}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[#1E3A8A] rounded-lg hover:bg-[#1E3A8A]/90 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E3A8A]"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                <span>
                  {mode === 'compare' && selectedPersona && selectedPersonaB
                    ? `Comparing ${getPersonaShortLabel(selectedPersona.name)} & ${getPersonaShortLabel(selectedPersonaB.name)}...`
                    : `Analyzing through ${selectedPersona ? getPersonaShortLabel(selectedPersona.name) : 'Persona'}...`}
                </span>
              </>
            ) : mode === 'compare' ? (
              <>
                <GitCompare className="w-4 h-4" aria-hidden="true" />
                <span>Compare Two Personas</span>
              </>
            ) : (
              <>
                <span>Analyze Situation</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </>
            )}
          </button>
        </div>
      </form>
    </main>
  );
}
