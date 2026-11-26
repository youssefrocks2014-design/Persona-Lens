import type { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  isAdminEmail,
  SEED_EVIDENCE_LIBRARY,
  SEED_PERSONAS,
} from '../data/seedCatalog.ts';
import { auth, db } from '../firebase.ts';
import type {
  Analysis,
  EvidenceItem,
  Persona,
  Rehearsal,
  RehearsalMessage,
  Situation,
  SituationInput,
} from '../types/personaLens.ts';
import {
  ANALYSIS_LIMITS,
  clampText,
  createFirestoreSafeId,
  normalizeEvidenceIds,
  sanitizeSituationInput,
} from '../utils/validation.ts';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

function toIsoDate(value: unknown): string {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (typeof value === 'string') {
    return value;
  }
  return new Date().toISOString();
}

export async function ensureUserProfile(user: User): Promise<void> {
  const userPath = `users/${user.uid}`;
  const ref = doc(db, 'users', user.uid);
  const displayName = (user.displayName || user.email?.split('@')[0] || 'PersonaLens Member').slice(
    0,
    120
  );
  const email = (user.email || '').slice(0, 254);

  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        id: user.uid,
        name: displayName,
        email,
        createdAt: serverTimestamp(),
      });
    } else {
      const existing = snap.data();
      if (existing.name !== displayName || existing.email !== email) {
        await updateDoc(ref, {
          name: displayName,
          email,
        });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }
}

const PERSONA_ORDER = new Map(SEED_PERSONAS.map((p, idx) => [p.id, idx]));
const EVIDENCE_ORDER = new Map(SEED_EVIDENCE_LIBRARY.map((e, idx) => [e.id, idx]));

function isStringListEqual(a: unknown, b: string[]): boolean {
  return (
    Array.isArray(a) &&
    a.length === b.length &&
    a.every((item, idx) => item === b[idx])
  );
}

function isPersonaEqual(existing: Record<string, unknown>, target: Persona): boolean {
  return (
    existing.id === target.id &&
    existing.name === target.name &&
    existing.lensSummary === target.lensSummary &&
    existing.decisionPattern === target.decisionPattern &&
    existing.communicationStyle === target.communicationStyle &&
    isStringListEqual(existing.corePrinciples, target.corePrinciples) &&
    isStringListEqual(existing.blindSpots, target.blindSpots) &&
    isStringListEqual(existing.sources, target.sources) &&
    Object.keys(existing).length === 8
  );
}

function isEvidenceEqual(existing: Record<string, unknown>, target: EvidenceItem): boolean {
  return (
    existing.id === target.id &&
    existing.name === target.name &&
    existing.summary === target.summary &&
    existing.whenItHelps === target.whenItHelps &&
    existing.limits === target.limits &&
    existing.evidenceStrength === target.evidenceStrength &&
    existing.source === target.source &&
    Object.keys(existing).length === 7
  );
}

export async function ensureCatalogSeeded(user: User): Promise<void> {
  if (!user.emailVerified) {
    return;
  }

  const adminUser = isAdminEmail(user.email);
  const targetPersonaIds = new Set(SEED_PERSONAS.map((p) => p.id));
  const targetEvidenceIds = new Set(SEED_EVIDENCE_LIBRARY.map((e) => e.id));

  try {
    const [personasSnap, evidenceSnap] = await Promise.all([
      getDocs(collection(db, 'personas')),
      getDocs(collection(db, 'evidenceLibrary')),
    ]);

    const existingPersonasById = new Map(
      personasSnap.docs.map((d) => [d.id, d.data() as Record<string, unknown>])
    );
    const personaOps: Promise<void>[] = [];
    for (const persona of SEED_PERSONAS) {
      const existing = existingPersonasById.get(persona.id);
      const needsWrite = !existing || (adminUser && !isPersonaEqual(existing, persona));
      if (needsWrite) {
        personaOps.push(setDoc(doc(db, 'personas', persona.id), persona));
      }
    }
    if (adminUser) {
      for (const existingDoc of personasSnap.docs) {
        if (!targetPersonaIds.has(existingDoc.id)) {
          personaOps.push(deleteDoc(doc(db, 'personas', existingDoc.id)));
        }
      }
    }

    const existingEvidenceById = new Map(
      evidenceSnap.docs.map((d) => [d.id, d.data() as Record<string, unknown>])
    );
    const evidenceOps: Promise<void>[] = [];
    for (const item of SEED_EVIDENCE_LIBRARY) {
      const existing = existingEvidenceById.get(item.id);
      const needsWrite = !existing || (adminUser && !isEvidenceEqual(existing, item));
      if (needsWrite) {
        evidenceOps.push(setDoc(doc(db, 'evidenceLibrary', item.id), item));
      }
    }
    if (adminUser) {
      for (const existingDoc of evidenceSnap.docs) {
        if (!targetEvidenceIds.has(existingDoc.id)) {
          evidenceOps.push(deleteDoc(doc(db, 'evidenceLibrary', existingDoc.id)));
        }
      }
    }

    if (personaOps.length > 0 || evidenceOps.length > 0) {
      await Promise.all([...personaOps, ...evidenceOps]);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'personas/evidenceLibrary');
  }
}

export function subscribePersonas(
  onData: (personas: Persona[]) => void,
  onFatalError: (err: Error) => void
): () => void {
  const path = 'personas';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const items = snapshot.docs.map((d) => d.data() as Persona);
      items.sort((a, b) => {
        const orderA = PERSONA_ORDER.get(a.id) ?? Number.MAX_SAFE_INTEGER;
        const orderB = PERSONA_ORDER.get(b.id) ?? Number.MAX_SAFE_INTEGER;
        return orderA !== orderB ? orderA - orderB : a.name.localeCompare(b.name);
      });
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onFatalError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export function subscribeEvidenceLibrary(
  onData: (items: EvidenceItem[]) => void,
  onFatalError: (err: Error) => void
): () => void {
  const path = 'evidenceLibrary';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const items = snapshot.docs.map((d) => d.data() as EvidenceItem);
      items.sort((a, b) => {
        const orderA = EVIDENCE_ORDER.get(a.id) ?? Number.MAX_SAFE_INTEGER;
        const orderB = EVIDENCE_ORDER.get(b.id) ?? Number.MAX_SAFE_INTEGER;
        return orderA !== orderB ? orderA - orderB : a.name.localeCompare(b.name);
      });
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onFatalError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export function subscribeUserSituations(
  userId: string,
  onData: (situations: Situation[]) => void,
  onFatalError: (err: Error) => void
): () => void {
  const path = 'situations';
  const q = query(collection(db, path), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: Situation[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: String(data.id ?? d.id),
          userId: String(data.userId),
          title: String(data.title),
          description: String(data.description),
          desiredOutcome: String(data.desiredOutcome),
          otherPersonRole: String(data.otherPersonRole),
          createdAt: toIsoDate(data.createdAt),
        };
      });
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onFatalError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export function subscribeUserAnalyses(
  userId: string,
  onData: (analyses: Analysis[]) => void,
  onFatalError: (err: Error) => void
): () => void {
  const path = 'analyses';
  const q = query(collection(db, path), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: Analysis[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: String(data.id ?? d.id),
          userId: String(data.userId),
          situationId: String(data.situationId),
          personaId: String(data.personaId),
          personaView: data.personaView as Analysis['personaView'],
          suggestedResponse: String(data.suggestedResponse),
          realityCheck: data.realityCheck as Analysis['realityCheck'],
          createdAt: toIsoDate(data.createdAt),
        };
      });
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onFatalError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export function subscribeUserRehearsals(
  userId: string,
  onData: (rehearsals: Rehearsal[]) => void,
  onFatalError: (err: Error) => void
): () => void {
  const path = 'rehearsals';
  const q = query(collection(db, path), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: Rehearsal[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: String(data.id ?? d.id),
          userId: String(data.userId),
          situationId: String(data.situationId),
          personaId: String(data.personaId),
          messages: Array.isArray(data.messages) ? (data.messages as RehearsalMessage[]) : [],
          feedback: String(data.feedback ?? ''),
          createdAt: toIsoDate(data.createdAt),
          updatedAt: toIsoDate(data.updatedAt),
        };
      });
      items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onFatalError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export async function createSituationDoc(
  userId: string,
  input: SituationInput,
  pregeneratedId?: string
): Promise<Situation> {
  const clean = sanitizeSituationInput(input);
  const id = pregeneratedId ?? createFirestoreSafeId('sit');
  const docPath = `situations/${id}`;
  try {
    await setDoc(doc(db, 'situations', id), {
      id,
      userId,
      title: clean.title.slice(0, 160),
      description: clean.description.slice(0, 4000),
      desiredOutcome: clean.desiredOutcome.slice(0, 1000),
      otherPersonRole: clean.otherPersonRole.slice(0, 200),
      createdAt: serverTimestamp(),
    });
    return {
      id,
      userId,
      ...clean,
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
  }
}

export async function createAnalysisDoc(
  userId: string,
  situationId: string,
  personaId: string,
  payload: Pick<Analysis, 'personaView' | 'suggestedResponse' | 'realityCheck'>,
  evidenceLibrary: EvidenceItem[],
  pregeneratedId?: string
): Promise<Analysis> {
  const id = pregeneratedId ?? createFirestoreSafeId('ana');
  const docPath = `analyses/${id}`;

  const safePersonaView = {
    framing: clampText(payload.personaView.framing, ANALYSIS_LIMITS.framingMax, 'Framing interpretation unavailable.'),
    principleApplication: clampText(
      payload.personaView.principleApplication,
      ANALYSIS_LIMITS.principleApplicationMax,
      'Principle application unavailable.'
    ),
    blindSpotWarning: clampText(
      payload.personaView.blindSpotWarning,
      ANALYSIS_LIMITS.blindSpotWarningMax,
      'Consider potential historical blind spots carefully.'
    ),
  };

  const safeSuggestedResponse = clampText(
    payload.suggestedResponse,
    ANALYSIS_LIMITS.suggestedResponseMax,
    'Acknowledge their concern directly and propose a concrete next step.'
  );

  const safeRealityCheck = {
    assessment: clampText(
      payload.realityCheck.assessment,
      ANALYSIS_LIMITS.assessmentMax,
      'Evidence-based comparison generated from the database library.'
    ),
    evidenceIdsUsed: normalizeEvidenceIds(payload.realityCheck.evidenceIdsUsed, evidenceLibrary),
    researchComparison: clampText(
      payload.realityCheck.researchComparison,
      ANALYSIS_LIMITS.researchComparisonMax,
      'Aligned with structured communication and de-escalation principles.'
    ),
    risksAndLimits: clampText(
      payload.realityCheck.risksAndLimits,
      ANALYSIS_LIMITS.risksAndLimitsMax,
      'Adapt tone and boundaries to real-world power dynamics.'
    ),
  };

  try {
    await setDoc(doc(db, 'analyses', id), {
      id,
      userId,
      situationId,
      personaId,
      personaView: safePersonaView,
      suggestedResponse: safeSuggestedResponse,
      realityCheck: safeRealityCheck,
      createdAt: serverTimestamp(),
    });
    return {
      id,
      userId,
      situationId,
      personaId,
      personaView: safePersonaView,
      suggestedResponse: safeSuggestedResponse,
      realityCheck: safeRealityCheck,
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
  }
}

export async function createRehearsalDoc(
  userId: string,
  situationId: string,
  personaId: string,
  messages: RehearsalMessage[]
): Promise<Rehearsal> {
  const id = createFirestoreSafeId('reh');
  const docPath = `rehearsals/${id}`;
  const boundedMessages = messages.slice(0, 60).map((m) => ({
    role: m.role,
    text: m.text.slice(0, 4000),
    timestamp: m.timestamp.slice(0, 64),
  }));

  try {
    await setDoc(doc(db, 'rehearsals', id), {
      id,
      userId,
      situationId,
      personaId,
      messages: boundedMessages,
      feedback: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    const now = new Date().toISOString();
    return {
      id,
      userId,
      situationId,
      personaId,
      messages: boundedMessages,
      feedback: '',
      createdAt: now,
      updatedAt: now,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
  }
}

export async function updateRehearsalMessages(
  rehearsalId: string,
  messages: RehearsalMessage[]
): Promise<void> {
  const docPath = `rehearsals/${rehearsalId}`;
  const boundedMessages = messages.slice(0, 60).map((m) => ({
    role: m.role,
    text: m.text.slice(0, 4000),
    timestamp: m.timestamp.slice(0, 64),
  }));

  try {
    await updateDoc(doc(db, 'rehearsals', rehearsalId), {
      messages: boundedMessages,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docPath);
  }
}

export async function finalizeRehearsalFeedback(
  rehearsalId: string,
  feedback: string
): Promise<void> {
  const docPath = `rehearsals/${rehearsalId}`;
  const safeFeedback = clampText(
    feedback,
    4900,
    'Rehearsal concluded. Continue balancing calm inquiry with clear boundaries.'
  );

  try {
    await updateDoc(doc(db, 'rehearsals', rehearsalId), {
      feedback: safeFeedback,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docPath);
  }
}

export async function deleteSituationCascade(
  situationId: string,
  relatedAnalyses: Analysis[],
  relatedRehearsals: Rehearsal[]
): Promise<void> {
  try {
    await Promise.all([
      ...relatedAnalyses.map((analysis) => deleteDoc(doc(db, 'analyses', analysis.id))),
      ...relatedRehearsals.map((rehearsal) => deleteDoc(doc(db, 'rehearsals', rehearsal.id))),
    ]);
    await deleteDoc(doc(db, 'situations', situationId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `situations/${situationId}`);
  }
}
