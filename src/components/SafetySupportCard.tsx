import { HeartHandshake } from 'lucide-react';

interface SafetySupportCardProps {
  message: string;
  onDismiss?: () => void;
  actionLabel?: string;
}

export function SafetySupportCard({
  message,
  onDismiss,
  actionLabel = 'Edit Situation',
}: SafetySupportCardProps) {
  return (
    <section
      role="status"
      aria-live="polite"
      data-testid="safety-support-card"
      className="bg-[#F2F7F4] border border-[#B7D3C0] rounded-xl p-6 sm:p-7 text-[#1C1917]"
    >
      <div className="flex items-start gap-3.5">
        <div
          aria-hidden="true"
          className="w-10 h-10 shrink-0 rounded-full bg-[#E1EFE6] border border-[#B7D3C0] flex items-center justify-center text-[#14532D]"
        >
          <HeartHandshake className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-mono uppercase tracking-wider text-[#14532D] mb-1">
            Support &amp; Immediate Care
          </p>
          <h2 className="font-serif text-xl font-semibold text-[#1C1917] mb-2">
            Take care of your safety first
          </h2>
          <p className="text-sm sm:text-base text-[#292524] leading-relaxed">
            {message}
          </p>
          <p className="text-xs text-[#57534E] mt-3 leading-relaxed">
            PersonaLens is a tool for reflection and communication practice, not therapy,
            medical, or crisis care. This entry was not saved to your History.
          </p>
          {onDismiss && (
            <div className="mt-4">
              <button
                type="button"
                onClick={onDismiss}
                className="px-4 py-2 text-xs font-semibold text-[#14532D] bg-white border border-[#B7D3C0] rounded-lg hover:bg-[#E1EFE6]/50 transition-colors"
              >
                {actionLabel}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
