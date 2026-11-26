export interface UserProfile {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface Persona {
  id: string;
  name: string;
  lensSummary: string;
  corePrinciples: string[];
  decisionPattern: string;
  communicationStyle: string;
  blindSpots: string[];
  sources: string[];
}

export interface EvidenceItem {
  id: string;
  name: string;
  summary: string;
  whenItHelps: string;
  limits: string;
  evidenceStrength: string;
  source: string;
}

export interface Situation {
  id: string;
  userId: string;
  title: string;
  description: string;
  desiredOutcome: string;
  otherPersonRole: string;
  createdAt: string;
}

export interface PersonaView {
  framing: string;
  principleApplication: string;
  blindSpotWarning: string;
}

export interface RealityCheck {
  assessment: string;
  evidenceIdsUsed: string[];
  researchComparison: string;
  risksAndLimits: string;
}

export interface Analysis {
  id: string;
  userId: string;
  situationId: string;
  personaId: string;
  personaView: PersonaView;
  suggestedResponse: string;
  realityCheck: RealityCheck;
  createdAt: string;
}

export type RehearsalRole = 'user' | 'other_person' | 'coach';

export interface RehearsalMessage {
  role: RehearsalRole;
  text: string;
  timestamp: string;
}

export interface Rehearsal {
  id: string;
  userId: string;
  situationId: string;
  personaId: string;
  messages: RehearsalMessage[];
  feedback: string;
  createdAt: string;
  updatedAt: string;
}

export interface SituationInput {
  title: string;
  description: string;
  desiredOutcome: string;
  otherPersonRole: string;
}

export interface AnalysisGenerationResult {
  isSafetyAlert: boolean;
  safetyMessage: string;
  note: string;
  personaView: PersonaView;
  suggestedResponse: string;
  realityCheck: RealityCheck;
}

export interface RehearsalTurnResult {
  isSafetyAlert: boolean;
  safetyMessage: string;
  otherPersonReply: string;
  coachNote: string;
}
