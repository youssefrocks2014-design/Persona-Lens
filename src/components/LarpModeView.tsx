import { useState, type FormEvent } from 'react';
import { ArrowLeft, CheckCircle2, Loader2, Send } from 'lucide-react';
import { MANDATORY_INTERPRETATION_NOTE } from '../data/seedCatalog.ts';
import type {
  Persona,
  Rehearsal,
  RehearsalMessage,
  Situation,
} from '../types/personaLens.ts';
import { PersonaCrest } from './PersonaCrest.tsx';
import { SafetySupportCard } from './SafetySupportCard.tsx';

interface LarpModeViewProps {
  situation: Situation;
  persona: Persona;
  rehearsal: Rehearsal | null;
  suggestedDraft?: string;
  sendingTurn: boolean;
  endingRehearsal: boolean;
  error: string | null;
  safetyAlert?: string | null;
  onClearSafetyAlert?: () => void;
  onSendTurn: (userMessage: string) => Promise<void>;
  onFinishAndGetFeedback: () => Promise<void>;
  onBack: () => void;
}

export function LarpModeView({
  situation,
  persona,
  rehearsal,
  suggestedDraft,
  sendingTurn,
  endingRehearsal,
  error,
  safetyAlert,
  onClearSafetyAlert,
  onSendTurn,
  onFinishAndGetFeedback,
  onBack,
}: LarpModeViewProps) {
  const [draft, setDraft] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);

  const messages: RehearsalMessage[] = rehearsal?.messages ?? [];
  const isCompleted = Boolean(rehearsal?.feedback && rehearsal.feedback.length > 0);
  const canSendMore = !isCompleted && messages.length < 57;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (sendingTurn || endingRehearsal) return;
    const trimmed = draft.trim();
    if (trimmed.length === 0) {
      setInputError('Write your practice reply before sending.');
      return;
    }
    setInputError(null);
    setDraft('');
    await onSendTurn(trimmed);
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 pb-24 md:pb-14">
      <div className="mb-5">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#57534E] hover:text-[#1C1917]"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Back to Analysis</span>
        </button>
      </div>

      {/* Mandatory Interpretation Note */}
      <div
        role="note"
        className="mb-6 px-4 py-3 bg-[#F2EFE9] border border-[#D6CEBE] rounded-xl text-xs text-[#1C1917] font-medium"
      >
        {MANDATORY_INTERPRETATION_NOTE}
      </div>

      {/* Header */}
      <section className="pb-6 border-b border-[#E5E0D8] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-mono uppercase tracking-widest text-[#1E3A8A] mb-1">
            Mode 2 · Larp Mode Rehearsal
          </p>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-[#1C1917] break-words">
            {situation.title}
          </h1>
          <p className="text-xs text-[#57534E] mt-1 break-words">
            Counterpart: {situation.otherPersonRole} · Coach: {persona.name}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <PersonaCrest personaId={persona.id} name={persona.name} size="sm" />
          {!isCompleted && messages.length > 0 && (
            <button
              type="button"
              disabled={endingRehearsal || sendingTurn}
              onClick={onFinishAndGetFeedback}
              className="px-4 py-2 text-xs font-semibold text-[#14532D] bg-[#ECFDF5] border border-[#A7F3D0] rounded-lg hover:bg-[#D1FAE5] disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {endingRehearsal ? 'Summarizing...' : 'End & Get Feedback'}
            </button>
          )}
        </div>
      </section>

      {/* Transcript Area */}
      <section className="mt-6 space-y-4">
        {messages.length === 0 ? (
          <div className="bg-white border border-[#E5E0D8] rounded-xl p-7 text-center">
            <h2 className="font-serif text-xl font-semibold text-[#1C1917] mb-2">
              Begin Your Rehearsal
            </h2>
            <p className="text-sm text-[#57534E] max-w-lg mx-auto leading-relaxed mb-4">
              Send your opening message below. Gemini will respond in character as{' '}
              <strong className="font-medium text-[#1C1917]">
                {situation.otherPersonRole}
              </strong>
              , and{' '}
              <strong className="font-medium text-[#1C1917]">
                {persona.name}
              </strong>{' '}
              will give a brief coaching note after each turn.
            </p>
            {suggestedDraft && (
              <button
                type="button"
                onClick={() => setDraft(suggestedDraft)}
                className="px-4 py-2 text-xs font-medium text-[#1E3A8A] bg-[#F2EFE9] border border-[#D6CEBE] rounded-lg hover:bg-[#EBE6DF] transition-colors"
              >
                Load Suggested Response Draft
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, idx) => {
              const timeLabel = new Date(msg.timestamp).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
              });

              if (msg.role === 'user') {
                return (
                  <div
                    key={idx}
                    className="ml-auto max-w-2xl bg-[#1E3A8A] text-white rounded-xl p-4 sm:p-5"
                  >
                    <div className="flex items-center justify-between gap-4 text-xs text-white/75 mb-1.5">
                      <span className="font-medium">You (Practice Reply)</span>
                      <span className="font-mono tabular-nums">{timeLabel}</span>
                    </div>
                    <p className="text-sm leading-relaxed whitespace-pre-line break-words">
                      {msg.text}
                    </p>
                  </div>
                );
              }

              if (msg.role === 'other_person') {
                return (
                  <div
                    key={idx}
                    className="mr-auto max-w-2xl bg-white border border-[#E5E0D8] rounded-xl p-4 sm:p-5"
                  >
                    <div className="flex items-center justify-between gap-4 text-xs text-[#78716C] mb-1.5">
                      <span className="font-semibold text-[#1C1917] min-w-0 truncate">
                        {situation.otherPersonRole}
                      </span>
                      <span className="font-mono tabular-nums shrink-0">{timeLabel}</span>
                    </div>
                    <p className="text-sm text-[#292524] leading-relaxed whitespace-pre-line break-words">
                      {msg.text}
                    </p>
                  </div>
                );
              }

              return (
                <div
                  key={idx}
                  className="mr-auto max-w-2xl bg-[#F2EFE9] border border-[#D6CEBE] rounded-xl p-4 sm:p-5"
                >
                  <div className="flex items-center justify-between gap-4 text-xs text-[#78350F] mb-1.5">
                    <span className="font-mono uppercase tracking-wider min-w-0 truncate">
                      Coach Note · {persona.name}
                    </span>
                    <span className="font-mono tabular-nums shrink-0">{timeLabel}</span>
                  </div>
                  <p className="text-sm text-[#292524] leading-relaxed whitespace-pre-line break-words">
                    {msg.text}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Final Feedback Card */}
      {isCompleted && rehearsal && (
        <section className="mt-8 bg-white border border-[#A7F3D0] rounded-xl p-6 sm:p-7">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#14532D] mb-2">
            <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
            <span>Rehearsal Concluded · Final Coaching Feedback</span>
          </div>
          <h2 className="font-serif text-xl font-semibold text-[#1C1917] mb-3">
            Debrief from {persona.name} &amp; Evidence Library
          </h2>
          <p className="text-sm text-[#292524] leading-relaxed whitespace-pre-line break-words">
            {rehearsal.feedback}
          </p>
        </section>
      )}

      {safetyAlert && (
        <div className="mt-6">
          <SafetySupportCard
            message={safetyAlert}
            onDismiss={onClearSafetyAlert}
            actionLabel="Dismiss"
          />
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-4 p-3.5 bg-[#FEF2F2] border border-[#FECACA] rounded-lg text-sm text-[#991B1B]"
        >
          {error}
        </div>
      )}

      {/* Composer */}
      {canSendMore && (
        <form onSubmit={handleSubmit} className="mt-6 bg-white border border-[#E5E0D8] rounded-xl p-4">
          <label
            htmlFor="rehearsal-reply-input"
            className="block text-xs font-semibold text-[#1C1917] mb-2"
          >
            Your Practice Reply
          </label>
          <textarea
            id="rehearsal-reply-input"
            rows={3}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={3900}
            disabled={sendingTurn || endingRehearsal}
            placeholder="Write what you would actually say next..."
            className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-[#D6CEBE] rounded-lg text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#1E3A8A]"
          />
          {inputError && (
            <p role="alert" className="text-xs text-[#991B1B] mt-1.5">
              {inputError}
            </p>
          )}
          <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs text-[#78716C] italic">
              {MANDATORY_INTERPRETATION_NOTE}
            </span>
            <button
              type="submit"
              disabled={sendingTurn || endingRehearsal}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#1E3A8A] rounded-lg hover:bg-[#1E3A8A]/90 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 self-end sm:self-auto"
            >
              {sendingTurn ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  <span>Responding...</span>
                </>
              ) : (
                <>
                  <span>Send Reply</span>
                  <Send className="w-3.5 h-3.5" aria-hidden="true" />
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
