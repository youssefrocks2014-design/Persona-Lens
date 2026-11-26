import type {
  Analysis,
  EvidenceItem,
  Persona,
  Rehearsal,
  Situation,
  UserProfile,
} from '../types/personaLens.ts';

export const MANDATORY_INTERPRETATION_NOTE =
  'An interpretation based on public writings, not their actual words.';

export const ADMIN_EMAILS = [
  'youssef.elshafei1@gmail.com',
  'youssef.rocks2014@gmail.com',
] as const;

export const ADMIN_EMAIL = ADMIN_EMAILS[0];

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return ADMIN_EMAILS.some((admin) => admin.toLowerCase() === normalized);
}

export const SEED_PERSONAS: Persona[] = [
  {
    id: 'marcus-aurelius',
    name: 'Marcus Aurelius',
    lensSummary:
      'Focus only on what you control, act from duty, stay calm under provocation.',
    corePrinciples: [
      'Separate what is in your control from what is not',
      'Judge events by your response, not the event',
      'Remember that people act from their own limits',
      'Think of the larger picture',
    ],
    decisionPattern:
      'Reflects in writing first, acts deliberately, weighs duty to others over comfort.',
    communicationStyle:
      'Measured, restrained, rarely reactive.',
    blindSpots: [
      'Can suppress emotion',
      'His writings were private notes, not advice on negotiating with others',
    ],
    sources: [
      'Meditations (Hays or Hammond translation)',
    ],
  },
  {
    id: 'nelson-mandela',
    name: 'Nelson Mandela',
    lensSummary:
      'Strategic patience, talking to opponents, reconciliation with a long-term aim.',
    corePrinciples: [
      'Negotiate with adversaries',
      'Protect the other side’s dignity',
      'Collective decision-making',
      'Adapt tactics, keep the goal',
    ],
    decisionPattern:
      'Listens at length, consults, then decides; changed methods over time.',
    communicationStyle:
      'Courteous, calm, deliberately inclusive.',
    blindSpots: [
      'Critics say reconciliation left economic inequality largely untouched',
      'His government was slow to respond to the HIV/AIDS crisis',
    ],
    sources: [
      'Long Walk to Freedom',
      'Stengel, Mandela’s Way',
    ],
  },
  {
    id: 'abraham-lincoln',
    name: 'Abraham Lincoln',
    lensSummary:
      'Manage rivals, stay patient under pressure, persuade with plain language.',
    corePrinciples: [
      'Bring rivals into the team',
      'Hold firm on core aims, flex on method',
      'Respond to evidence',
    ],
    decisionPattern:
      'Waits and gathers views; documented habit of writing angry letters and not sending them.',
    communicationStyle:
      'Plain, story-based, humorous, precise.',
    blindSpots: [
      'Critics at the time found him too cautious',
      'His views on race evolved over time',
    ],
    sources: [
      'Goodwin, Team of Rivals',
      'His letters and speeches',
    ],
  },
  {
    id: 'marie-curie',
    name: 'Marie Curie',
    lensSummary:
      'Persistence, rigor and focus when the field doubts you.',
    corePrinciples: [
      'Measure carefully',
      'Trust repeated results over opinion',
      'Keep working through obstacles',
    ],
    decisionPattern:
      'Methodical, evidence-first, stays focused on the work.',
    communicationStyle:
      'Reserved, precise, private.',
    blindSpots: [
      'Reluctance to seek publicity or support',
      'Downplayed risks of her materials',
    ],
    sources: [
      'Her Nobel lectures',
      'Goldsmith, Obsessive Genius',
    ],
  },
  {
    id: 'ibn-khaldun',
    name: 'Ibn Khaldun',
    lensSummary:
      'Read the structure and incentives behind a situation instead of blaming individuals.',
    corePrinciples: [
      'Events have causes in group dynamics and conditions',
      'Verify reports instead of accepting them',
      'Look at long cycles',
    ],
    decisionPattern:
      'Analyzes first, asks what incentives drive each party.',
    communicationStyle:
      'Analytical, big-picture, evidence-minded.',
    blindSpots: [
      'His own career involved shifting allegiances',
      'Theories describe pre-modern North African societies and don’t map neatly onto modern workplaces',
    ],
    sources: [
      'Muqaddimah (Rosenthal translation)',
      'Irwin, Ibn Khaldun: An Intellectual Biography',
    ],
  },
  {
    id: 'benjamin-franklin',
    name: 'Benjamin Franklin',
    lensSummary:
      'Practical self-improvement and tactful persuasion.',
    corePrinciples: [
      'Track habits daily against chosen virtues',
      'Avoid direct contradiction',
      'Ask questions instead of asserting',
      'Value usefulness',
    ],
    decisionPattern:
      'Pros-and-cons weighing, experiments, adjusts with results.',
    communicationStyle:
      'Modest, curious, humor-friendly.',
    blindSpots: [
      'Can be calculating and image-conscious',
      'Owned enslaved people for part of his life',
    ],
    sources: [
      'The Autobiography of Benjamin Franklin',
    ],
  },
  {
    id: 'frederick-douglass',
    name: 'Frederick Douglass',
    lensSummary:
      'Clear, evidence-backed moral argument delivered with force.',
    corePrinciples: [
      'Self-education as power',
      'Name injustice plainly',
      'Use facts and irony together',
      'Change tactics when evidence demands',
    ],
    decisionPattern:
      'Shifted strategy over time based on results.',
    communicationStyle:
      'Eloquent, direct, rhetorically strong.',
    blindSpots: [
      'Sharp rhetoric can polarize audiences',
    ],
    sources: [
      'Narrative of the Life of Frederick Douglass',
      'My Bondage and My Freedom',
      'The 1852 speech “What to the Slave Is the Fourth of July?”',
    ],
  },
];

export const SEED_EVIDENCE_LIBRARY: EvidenceItem[] = [
  {
    id: 'active-reflective-listening',
    name: 'Active (reflective) listening',
    summary:
      'Restating what the other person said and the feeling behind it before responding.',
    whenItHelps:
      'The other person feels understood and tension drops before problem-solving begins.',
    limits:
      'Can feel scripted or mechanical if overused or paired with insincere agreement.',
    evidenceStrength: 'moderate',
    source:
      'Client-centered counseling research (Rogers); used in motivational interviewing.',
  },
  {
    id: 'motivational-interviewing',
    name: 'Motivational interviewing',
    summary:
      'Open questions, affirmations, reflections, and summaries that help a person find their own reasons to change instead of being pushed.',
    whenItHelps:
      'Persuasion and behavior change without pressure, lectures, or defensive resistance.',
    limits:
      'Strongest evidence is in health and counseling settings; use in everyday conversation is an extension.',
    evidenceStrength: 'strong (in clinical contexts)',
    source: 'Miller and Rollnick, Motivational Interviewing; meta-analyses.',
  },
  {
    id: 'dear-man-assertiveness',
    name: 'DEAR MAN assertiveness',
    summary:
      'Describe, Express, Assert, Reinforce, stay Mindful, Appear confident, Negotiate.',
    whenItHelps:
      'Making a clear request or setting a firm boundary without aggression or avoidance.',
    limits:
      'Tested mostly as part of the wider DBT program, with less empirical evaluation on its own.',
    evidenceStrength: 'moderate',
    source: 'Linehan, DBT Skills Training.',
  },
  {
    id: 'principled-negotiation',
    name: 'Principled negotiation',
    summary:
      'Separate people from the problem, focus on interests not positions, generate options, and use objective criteria.',
    whenItHelps:
      'Disagreements where both sides must keep working together over time.',
    limits:
      'Less effective against bad-faith counterparts who conceal interests or exploit concessions.',
    evidenceStrength: 'moderate; widely used, empirical support mixed',
    source: 'Fisher, Ury and Patton, Getting to Yes.',
  },
  {
    id: 'softened-startup-repair',
    name: 'Softened start-up and repair attempts',
    summary:
      'Raise a problem gently, without blame, and use small gestures to de-escalate mid-conflict.',
    whenItHelps:
      'Close relationships; harsh openings predict worse conflict outcomes and stonewalling.',
    limits:
      'Observational research conducted mainly on couples rather than formal workplace hierarchies.',
    evidenceStrength: 'moderate',
    source: 'Gottman’s longitudinal couples research.',
  },
  {
    id: 'perspective-getting',
    name: 'Perspective-getting over perspective-taking',
    summary:
      'Guessing what someone thinks is often inaccurate; asking them directly tends to work better.',
    whenItHelps:
      'Avoiding wrong assumptions about the other person.',
    limits:
      'Needs the other person to be willing to answer.',
    evidenceStrength: 'moderate; lab and field studies',
    source: 'Eyal, Steffel and Epley (2018), journal article on perspective-taking accuracy.',
  },
  {
    id: 'affect-labeling',
    name: 'Affect labeling',
    summary:
      'Naming your own emotion (“I’m feeling frustrated”) can reduce its intensity.',
    whenItHelps:
      'Staying calm before a hard conversation.',
    limits:
      'Mostly lab evidence.',
    evidenceStrength: 'moderate',
    source: 'Lieberman et al. (2007).',
  },
  {
    id: 'implementation-intentions',
    name: 'Implementation intentions (if-then planning)',
    summary:
      'Deciding in advance “If X happens, I will do Y” makes follow-through more likely.',
    whenItHelps:
      'Rehearsal, because it prepares specific responses.',
    limits:
      'Works best for clear, specific goals.',
    evidenceStrength: 'strong',
    source: 'Gollwitzer; Gollwitzer and Sheeran meta-analysis (2006).',
  },
  {
    id: 'nonviolent-communication',
    name: 'Nonviolent Communication (NVC)',
    summary:
      'Observation, feeling, need, request.',
    whenItHelps:
      'Structure for expressing feelings without blame.',
    limits:
      'Popular, but direct empirical support is thin; label it honestly.',
    evidenceStrength: 'low to limited',
    source: 'Rosenberg, Nonviolent Communication.',
  },
];

export const DEMO_PREVIEW_USER: UserProfile = {
  id: 'preview-user-01',
  name: 'Elena Vance',
  email: 'elena.vance@example.org',
  createdAt: '2026-11-18T09:15:00.000Z',
};

export const DEMO_PREVIEW_SITUATIONS: Situation[] = [
  {
    id: 'sit-demo-01',
    userId: 'preview-user-01',
    title: 'VP keeps adding unreviewed scope right before Friday release',
    description:
      'My VP sent a terse message in Slack asking to add three new reporting widgets to tomorrow’s release without pushing the deadline. Engineering is already stretched thin, and rushing it risks breaking billing.',
    desiredOutcome:
      'Protect release stability and team capacity while preserving trust and keeping the VP aligned on realistic timing.',
    otherPersonRole: 'VP of Product (senior stakeholder)',
    createdAt: '2026-11-20T14:30:00.000Z',
  },
  {
    id: 'sit-demo-02',
    userId: 'preview-user-01',
    title: 'Co-founder shuts down product critique in team meetings',
    description:
      'Twice this week my co-founder dismissed engineering risk concerns during all-hands with sarcasm, making junior engineers hesitant to speak up.',
    desiredOutcome:
      'Hold a candid 1-on-1 that restores psychological safety without triggering a defensive power struggle.',
    otherPersonRole: 'Co-founder & Head of Design',
    createdAt: '2026-11-19T10:12:00.000Z',
  },
];

export const DEMO_PREVIEW_ANALYSES: Analysis[] = [
  {
    id: 'ana-demo-01',
    userId: 'preview-user-01',
    situationId: 'sit-demo-01',
    personaId: 'abraham-lincoln',
    personaView: {
      framing:
        'Through Lincoln’s lens, the terse Slack message is less a personal attack than a symptom of downstream pressure the VP is absorbing. Answering frustration with frustration will harden their position; your leverage comes from aligning around the shared stake—a reliable release that reflects well on leadership.',
      principleApplication:
        'Apply his rule of letting heat cool before replying and preserving the stakeholder’s dignity. Instead of saying "no, that is impossible," present the concrete trade-off neutrally and invite them to choose which priority wins.',
      blindSpotWarning:
        'Lincoln’s patience and understatement can sometimes signal flexibility where a hard quality line exists. Make sure the billing-stability constraint is stated unambiguously rather than softened by humor or deference.',
    },
    suggestedResponse:
      'Thanks for flagging the reporting widgets. We want those live cleanly for you. Given billing QA runs tonight, adding all three before tomorrow’s cutoff introduces a real regression risk on invoices. We can either (A) ship the core release on schedule tomorrow and deliver the three widgets in Monday’s patch, or (B) shift the full release to Tuesday with all three included. Which option best fits what you need to show stakeholders?',
    realityCheck: {
      assessment:
        'Lincoln’s instinct to cool down and present two workable paths aligns with negotiation, boundary-setting, and emotion-regulation research.',
      evidenceIdsUsed: [
        'principled-negotiation',
        'dear-man-assertiveness',
        'affect-labeling',
      ],
      researchComparison:
        'Principled negotiation supports shifting from positional resistance ("we cannot do this") to shared interests (reliable billing and stakeholder visibility) anchored in objective QA constraints. DEAR MAN assertiveness reinforces stating facts concisely and offering structured choices.',
      risksAndLimits:
        'Empirical support for principled negotiation is mixed when counterparts act in bad faith. If the VP insists on both Friday delivery and all three widgets regardless of risk, escalate clearly to documented sign-off rather than absorbing silent failure risk.',
    },
    createdAt: '2026-11-20T14:32:00.000Z',
  },
];

export const DEMO_PREVIEW_REHEARSALS: Rehearsal[] = [
  {
    id: 'reh-demo-01',
    userId: 'preview-user-01',
    situationId: 'sit-demo-01',
    personaId: 'abraham-lincoln',
    messages: [
      {
        role: 'user',
        text: 'Thanks for flagging the reporting widgets. Because billing QA finishes tonight, shipping all three tomorrow risks an invoice regression. Would you prefer we ship core tomorrow and widgets Monday, or move everything to Tuesday?',
        timestamp: '2026-11-20T14:35:00.000Z',
      },
      {
        role: 'other_person',
        text: 'I promised the board at least one revenue chart in Friday’s demo. Tuesday is too late, and Monday misses the board deck.',
        timestamp: '2026-11-20T14:35:15.000Z',
      },
      {
        role: 'coach',
        text: 'Notice how their real constraint just surfaced—it is the Friday board demo, not all three widgets. Narrow the question to the single chart that serves that demo while holding the billing boundary.',
        timestamp: '2026-11-20T14:35:16.000Z',
      },
    ],
    feedback: '',
    createdAt: '2026-11-20T14:35:00.000Z',
    updatedAt: '2026-11-20T14:35:16.000Z',
  },
];
