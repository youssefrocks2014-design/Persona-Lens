import type { SituationInput } from '../types/personaLens.ts';

export interface SampleSituationPreset {
  id: string;
  label: string;
  input: SituationInput;
}

export const SAMPLE_SITUATIONS: SampleSituationPreset[] = [
  {
    id: 'client-unpaid-work',
    label: 'Client keeps adding unpaid work',
    input: {
      title: 'Client keeps adding unpaid work',
      otherPersonRole: 'Retainer Client (Marketing Lead)',
      description:
        'For the third week in a row, my client asked for extra deliverables "as a quick favor" outside our signed scope, while expecting the same monthly invoice and Friday turnaround.',
      desiredOutcome:
        'Hold a clear scope boundary and price additional work fairly without souring the working relationship.',
    },
  },
  {
    id: 'friend-cancels-last-minute',
    label: 'Friend cancels last minute',
    input: {
      title: 'Friend cancels last minute',
      otherPersonRole: 'Close Friend',
      description:
        'My close friend canceled our dinner plans an hour before we were supposed to meet—for the second time this month—with a brief text saying something came up.',
      desiredOutcome:
        'Express how the repeated last-minute cancellations affect me honestly while keeping the friendship warm and intact.',
    },
  },
  {
    id: 'tough-feedback-from-boss',
    label: 'Tough feedback from boss',
    input: {
      title: 'Tough feedback from boss',
      otherPersonRole: 'Engineering Director (My Manager)',
      description:
        'In our 1-on-1 today, my boss said my last project update felt defensive and disorganized in front of leadership. I was caught off guard because I thought the slide deck was solid.',
      desiredOutcome:
        'Respond constructively, clarify what leadership actually needed, and rebuild confidence before next week’s review.',
    },
  },
];
