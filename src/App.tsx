import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { AnalysisResultView } from './components/AnalysisResultView.tsx';
import { CompareView } from './components/CompareView.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { HistoryView } from './components/HistoryView.tsx';
import { HomeView } from './components/HomeView.tsx';
import { HowItWorksView } from './components/HowItWorksView.tsx';
import { LarpModeView } from './components/LarpModeView.tsx';
import { NewSituationView } from './components/NewSituationView.tsx';
import { SignInLanding } from './components/SignInLanding.tsx';
import { TopNav, type NavSection } from './components/TopNav.tsx';
import {
  DEMO_PREVIEW_ANALYSES,
  DEMO_PREVIEW_REHEARSALS,
  DEMO_PREVIEW_SITUATIONS,
  DEMO_PREVIEW_USER,
  SEED_EVIDENCE_LIBRARY,
  SEED_PERSONAS,
} from './data/seedCatalog.ts';
import { auth, googleProvider } from './firebase.ts';
import {
  fetchServerHealth,
  requestCompareAnalysis,
  requestLivingYourDayAnalysis,
  requestRehearsalFeedback,
  requestRehearsalTurn,
} from './services/apiClient.ts';
import {
  createAnalysisDoc,
  createRehearsalDoc,
  createSituationDoc,
  deleteSituationCascade,
  ensureCatalogSeeded,
  ensureUserProfile,
  finalizeRehearsalFeedback,
  subscribeEvidenceLibrary,
  subscribePersonas,
  subscribeUserAnalyses,
  subscribeUserRehearsals,
  subscribeUserSituations,
  updateRehearsalMessages,
} from './services/firestoreService.ts';
import type {
  Analysis,
  EvidenceItem,
  Persona,
  Rehearsal,
  RehearsalMessage,
  Situation,
  SituationInput,
  UserProfile,
} from './types/personaLens.ts';
import { createFirestoreSafeId, sanitizeSituationInput } from './utils/validation.ts';

type WorkspaceView =
  | { kind: 'home' }
  | {
      kind: 'new-situation';
      preselectedPersonaId?: string;
      prefillSituation?: Situation;
      initialMode?: 'single' | 'compare';
    }
  | { kind: 'history' }
  | { kind: 'how-it-works' }
  | { kind: 'analysis'; situationId: string; analysisId: string }
  | {
      kind: 'compare';
      situationId: string;
      leftAnalysisId?: string;
      rightAnalysisId?: string;
    }
  | { kind: 'larp'; situationId: string; personaId: string; rehearsalId?: string };

function isLocalhostAutostart(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return (
    window.location.hostname === 'localhost' && params.get('autostart') === '1'
  );
}

function resolvePersonaOrArchived(
  personas: Persona[],
  personaId: string
): Persona {
  const found = personas.find((p) => p.id === personaId);
  if (found) return found;
  const displayName = personaId
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
  return {
    id: personaId,
    name: displayName || 'Archived Persona',
    lensSummary: 'Archived persona profile from an earlier catalog.',
    corePrinciples: ['Archived persona card preserved for historical context.'],
    decisionPattern: 'Historical lens replaced in the current curated catalog.',
    communicationStyle: 'Archived historical lens.',
    blindSpots: ['This persona card is no longer active for new analyses.'],
    sources: ['Archived PersonaLens catalog'],
  };
}

function PersonaLensWorkspace() {
  const [previewMode, setPreviewMode] = useState<boolean>(() => isLocalhostAutostart());
  const [authReady, setAuthReady] = useState<boolean>(() => isLocalhostAutostart());
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [user, setUser] = useState<UserProfile | null>(() =>
    isLocalhostAutostart() ? DEMO_PREVIEW_USER : null
  );
  const [personas, setPersonas] = useState<Persona[]>(() =>
    isLocalhostAutostart() ? SEED_PERSONAS : []
  );
  const [evidenceLibrary, setEvidenceLibrary] = useState<EvidenceItem[]>(() =>
    isLocalhostAutostart() ? SEED_EVIDENCE_LIBRARY : []
  );
  const [situations, setSituations] = useState<Situation[]>(() =>
    isLocalhostAutostart() ? DEMO_PREVIEW_SITUATIONS : []
  );
  const [analyses, setAnalyses] = useState<Analysis[]>(() =>
    isLocalhostAutostart() ? DEMO_PREVIEW_ANALYSES : []
  );
  const [rehearsals, setRehearsals] = useState<Rehearsal[]>(() =>
    isLocalhostAutostart() ? DEMO_PREVIEW_REHEARSALS : []
  );

  const [catalogLoading, setCatalogLoading] = useState<boolean>(
    () => !isLocalhostAutostart()
  );
  const [fatalError, setFatalError] = useState<Error | null>(null);

  const [view, setView] = useState<WorkspaceView>({ kind: 'home' });
  const [submittingSituation, setSubmittingSituation] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [safetyAlert, setSafetyAlert] = useState<string | null>(null);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [reanalyzeError, setReanalyzeError] = useState<string | null>(null);
  const [compareGeneratingSlot, setCompareGeneratingSlot] = useState<'left' | 'right' | null>(null);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [sendingTurn, setSendingTurn] = useState(false);
  const [endingRehearsal, setEndingRehearsal] = useState(false);
  const [larpError, setLarpError] = useState<string | null>(null);
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(
    () => (isLocalhostAutostart() ? true : null)
  );
  const [setupBannerDismissed, setSetupBannerDismissed] = useState(false);
  const pendingSituationSavesRef = useRef(new Map<string, Promise<void>>());

  if (fatalError) {
    throw fatalError;
  }

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [view]);

  useEffect(() => {
    if (previewMode) return;
    let cancelled = false;
    void fetchServerHealth().then((status) => {
      if (!cancelled && status) {
        setAiConfigured(status.aiConfigured);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [previewMode]);

  useEffect(() => {
    if (previewMode) {
      return;
    }

    let unsubCatalogPersonas: (() => void) | null = null;
    let unsubCatalogEvidence: (() => void) | null = null;
    let unsubSituations: (() => void) | null = null;
    let unsubAnalyses: (() => void) | null = null;
    let unsubRehearsals: (() => void) | null = null;

    const cleanupSubscriptions = () => {
      unsubCatalogPersonas?.();
      unsubCatalogEvidence?.();
      unsubSituations?.();
      unsubAnalyses?.();
      unsubRehearsals?.();
      unsubCatalogPersonas = null;
      unsubCatalogEvidence = null;
      unsubSituations = null;
      unsubAnalyses = null;
      unsubRehearsals = null;
    };

    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      cleanupSubscriptions();

      if (!firebaseUser) {
        setUser(null);
        setPersonas([]);
        setEvidenceLibrary([]);
        setSituations([]);
        setAnalyses([]);
        setRehearsals([]);
        setCatalogLoading(false);
        setAuthReady(true);
        return;
      }

      setCatalogLoading(true);
      try {
        await Promise.all([
          ensureUserProfile(firebaseUser),
          ensureCatalogSeeded(firebaseUser),
        ]);

        setUser({
          id: firebaseUser.uid,
          name:
            firebaseUser.displayName ||
            firebaseUser.email?.split('@')[0] ||
            'PersonaLens Member',
          email: firebaseUser.email || '',
          createdAt: new Date().toISOString(),
        });

        let personasLoaded = false;
        let evidenceLoaded = false;
        const markLoaded = () => {
          if (personasLoaded && evidenceLoaded) {
            setCatalogLoading(false);
          }
        };

        unsubCatalogPersonas = subscribePersonas(
          (items) => {
            setPersonas(items);
            personasLoaded = true;
            markLoaded();
          },
          (err) => setFatalError(err)
        );
        unsubCatalogEvidence = subscribeEvidenceLibrary(
          (items) => {
            setEvidenceLibrary(items);
            evidenceLoaded = true;
            markLoaded();
          },
          (err) => setFatalError(err)
        );
        unsubSituations = subscribeUserSituations(
          firebaseUser.uid,
          setSituations,
          (err) => setFatalError(err)
        );
        unsubAnalyses = subscribeUserAnalyses(
          firebaseUser.uid,
          setAnalyses,
          (err) => setFatalError(err)
        );
        unsubRehearsals = subscribeUserRehearsals(
          firebaseUser.uid,
          setRehearsals,
          (err) => setFatalError(err)
        );
      } catch (err) {
        setAuthError(
          err instanceof Error ? err.message : 'Unable to initialize your session.'
        );
        setCatalogLoading(false);
      } finally {
        setAuthReady(true);
      }
    });

    return () => {
      cleanupSubscriptions();
      unsubAuth();
    };
  }, [previewMode]);

  async function handleSignIn() {
    setAuthLoading(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Google Sign-In could not complete.';
      if (msg.includes('popup-closed-by-user')) {
        setAuthError('Sign-in popup was closed before completing.');
      } else {
        setAuthError(msg);
      }
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleSignOut() {
    if (previewMode) {
      setPreviewMode(false);
      setUser(null);
      setPersonas([]);
      setEvidenceLibrary([]);
      setSituations([]);
      setAnalyses([]);
      setRehearsals([]);
      setView({ kind: 'home' });
      return;
    }
    await signOut(auth);
    setView({ kind: 'home' });
  }

  function handleNavigate(section: NavSection) {
    setSubmitError(null);
    setSafetyAlert(null);
    setReanalyzeError(null);
    setCompareError(null);
    setLarpError(null);
    if (section === 'home') {
      setView({ kind: 'home' });
    } else if (section === 'new-situation') {
      setView({ kind: 'new-situation' });
    } else if (section === 'history') {
      setView({ kind: 'history' });
    } else {
      setView({ kind: 'how-it-works' });
    }
  }

  async function handleCreateAndAnalyzeSituation(
    input: SituationInput,
    persona: Persona,
    existingSituation?: Situation
  ) {
    if (!user) return;
    setSubmittingSituation(true);
    setSubmitError(null);
    setSafetyAlert(null);

    try {
      const cleanInput = sanitizeSituationInput(input);
      const generated = await requestLivingYourDayAnalysis(
        cleanInput,
        persona,
        evidenceLibrary,
        previewMode
      );

      if (generated.isSafetyAlert) {
        setSafetyAlert(generated.safetyMessage);
        return;
      }

      const analysisPayload = {
        personaView: generated.personaView,
        suggestedResponse: generated.suggestedResponse,
        realityCheck: generated.realityCheck,
      };

      const now = new Date().toISOString();
      const targetSit: Situation = existingSituation ?? {
        id: createFirestoreSafeId('sit'),
        userId: user.id,
        ...cleanInput,
        createdAt: now,
      };
      const newAna: Analysis = {
        id: createFirestoreSafeId('ana'),
        userId: user.id,
        situationId: targetSit.id,
        personaId: persona.id,
        ...analysisPayload,
        createdAt: now,
      };

      if (!existingSituation) {
        setSituations((prev) => [targetSit, ...prev.filter((s) => s.id !== targetSit.id)]);
      }
      setAnalyses((prev) => [newAna, ...prev.filter((a) => a.id !== newAna.id)]);
      setView({ kind: 'analysis', situationId: targetSit.id, analysisId: newAna.id });

      if (!previewMode) {
        const persistPromise = (async () => {
          const priorSave = pendingSituationSavesRef.current.get(targetSit.id);
          if (priorSave) {
            await priorSave;
          } else if (!existingSituation) {
            await createSituationDoc(user.id, cleanInput, targetSit.id);
          }
          await createAnalysisDoc(
            user.id,
            targetSit.id,
            persona.id,
            analysisPayload,
            evidenceLibrary,
            newAna.id
          );
        })();
        pendingSituationSavesRef.current.set(targetSit.id, persistPromise);
        persistPromise
          .catch((persistErr) => {
            setReanalyzeError(
              persistErr instanceof Error
                ? persistErr.message
                : 'Analysis rendered, but saving to History failed.'
            );
          })
          .finally(() => {
            if (pendingSituationSavesRef.current.get(targetSit.id) === persistPromise) {
              pendingSituationSavesRef.current.delete(targetSit.id);
            }
          });
      }
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Unable to complete situation analysis.'
      );
    } finally {
      setSubmittingSituation(false);
    }
  }

  async function handleReanalyzeWithPersona(
    situation: Situation,
    persona: Persona
  ) {
    if (!user) return;
    setReanalyzing(true);
    setReanalyzeError(null);
    setSafetyAlert(null);

    try {
      const generated = await requestLivingYourDayAnalysis(
        {
          title: situation.title,
          description: situation.description,
          desiredOutcome: situation.desiredOutcome,
          otherPersonRole: situation.otherPersonRole,
        },
        persona,
        evidenceLibrary,
        previewMode
      );

      if (generated.isSafetyAlert) {
        setSafetyAlert(generated.safetyMessage);
        return;
      }

      const analysisPayload = {
        personaView: generated.personaView,
        suggestedResponse: generated.suggestedResponse,
        realityCheck: generated.realityCheck,
      };

      const newAna: Analysis = {
        id: createFirestoreSafeId('ana'),
        userId: user.id,
        situationId: situation.id,
        personaId: persona.id,
        ...analysisPayload,
        createdAt: new Date().toISOString(),
      };
      setAnalyses((prev) => [newAna, ...prev.filter((a) => a.id !== newAna.id)]);
      setView({ kind: 'analysis', situationId: situation.id, analysisId: newAna.id });

      if (!previewMode) {
        const priorSave = pendingSituationSavesRef.current.get(situation.id);
        if (priorSave) {
          await priorSave;
        }
        await createAnalysisDoc(
          user.id,
          situation.id,
          persona.id,
          analysisPayload,
          evidenceLibrary,
          newAna.id
        );
      }
    } catch (err) {
      setReanalyzeError(
        err instanceof Error ? err.message : 'Unable to analyze with that persona.'
      );
    } finally {
      setReanalyzing(false);
    }
  }

  async function handleCompareTwoPersonas(
    input: SituationInput,
    personaA: Persona,
    personaB: Persona,
    existingSituation?: Situation
  ) {
    if (!user) return;
    setSubmittingSituation(true);
    setSubmitError(null);
    setSafetyAlert(null);

    try {
      const cleanInput = sanitizeSituationInput(input);
      const { left: genA, right: genB } = await requestCompareAnalysis(
        cleanInput,
        personaA,
        personaB,
        evidenceLibrary,
        previewMode
      );

      if (genA.isSafetyAlert || genB.isSafetyAlert) {
        setSafetyAlert(
          genA.isSafetyAlert ? genA.safetyMessage : genB.safetyMessage
        );
        return;
      }

      const payloadA = {
        personaView: genA.personaView,
        suggestedResponse: genA.suggestedResponse,
        realityCheck: genA.realityCheck,
      };
      const payloadB = {
        personaView: genB.personaView,
        suggestedResponse: genB.suggestedResponse,
        realityCheck: genB.realityCheck,
      };

      const now = new Date().toISOString();
      const targetSit: Situation = existingSituation ?? {
        id: createFirestoreSafeId('sit'),
        userId: user.id,
        ...cleanInput,
        createdAt: now,
      };
      const anaA: Analysis = {
        id: createFirestoreSafeId('ana'),
        userId: user.id,
        situationId: targetSit.id,
        personaId: personaA.id,
        ...payloadA,
        createdAt: now,
      };
      const anaB: Analysis = {
        id: createFirestoreSafeId('ana'),
        userId: user.id,
        situationId: targetSit.id,
        personaId: personaB.id,
        ...payloadB,
        createdAt: new Date(Date.now() + 1).toISOString(),
      };
      if (!existingSituation) {
        setSituations((prev) => [targetSit, ...prev.filter((s) => s.id !== targetSit.id)]);
      }
      setAnalyses((prev) => [
        anaB,
        anaA,
        ...prev.filter((a) => a.id !== anaA.id && a.id !== anaB.id),
      ]);
      setView({
        kind: 'compare',
        situationId: targetSit.id,
        leftAnalysisId: anaA.id,
        rightAnalysisId: anaB.id,
      });

      if (!previewMode) {
        const persistPromise = (async () => {
          const priorSave = pendingSituationSavesRef.current.get(targetSit.id);
          if (priorSave) {
            await priorSave;
          } else if (!existingSituation) {
            await createSituationDoc(user.id, cleanInput, targetSit.id);
          }
          await Promise.all([
            createAnalysisDoc(
              user.id,
              targetSit.id,
              personaA.id,
              payloadA,
              evidenceLibrary,
              anaA.id
            ),
            createAnalysisDoc(
              user.id,
              targetSit.id,
              personaB.id,
              payloadB,
              evidenceLibrary,
              anaB.id
            ),
          ]);
        })();
        pendingSituationSavesRef.current.set(targetSit.id, persistPromise);
        persistPromise
          .catch((persistErr) => {
            setCompareError(
              persistErr instanceof Error
                ? persistErr.message
                : 'Comparison rendered, but saving to History failed.'
            );
          })
          .finally(() => {
            if (pendingSituationSavesRef.current.get(targetSit.id) === persistPromise) {
              pendingSituationSavesRef.current.delete(targetSit.id);
            }
          });
      }
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Unable to complete side-by-side comparison.'
      );
    } finally {
      setSubmittingSituation(false);
    }
  }

  async function handleGenerateCompareSlot(
    situation: Situation,
    slot: 'left' | 'right',
    persona: Persona
  ) {
    if (!user) return;
    setCompareGeneratingSlot(slot);
    setCompareError(null);
    setSafetyAlert(null);

    try {
      const generated = await requestLivingYourDayAnalysis(
        {
          title: situation.title,
          description: situation.description,
          desiredOutcome: situation.desiredOutcome,
          otherPersonRole: situation.otherPersonRole,
        },
        persona,
        evidenceLibrary,
        previewMode
      );

      if (generated.isSafetyAlert) {
        setSafetyAlert(generated.safetyMessage);
        return;
      }

      const payload = {
        personaView: generated.personaView,
        suggestedResponse: generated.suggestedResponse,
        realityCheck: generated.realityCheck,
      };

      const savedAnalysis = previewMode
        ? (() => {
            const localAna: Analysis = {
              id: createFirestoreSafeId('ana'),
              userId: user.id,
              situationId: situation.id,
              personaId: persona.id,
              ...payload,
              createdAt: new Date().toISOString(),
            };
            setAnalyses((prev) => [localAna, ...prev]);
            return localAna;
          })()
        : await createAnalysisDoc(
            user.id,
            situation.id,
            persona.id,
            payload,
            evidenceLibrary
          );

      setView((prev) => {
        if (prev.kind !== 'compare' || prev.situationId !== situation.id) {
          return prev;
        }
        return slot === 'left'
          ? { ...prev, leftAnalysisId: savedAnalysis.id }
          : { ...prev, rightAnalysisId: savedAnalysis.id };
      });
    } catch (err) {
      setCompareError(
        err instanceof Error ? err.message : 'Unable to generate comparison analysis.'
      );
    } finally {
      setCompareGeneratingSlot(null);
    }
  }

  async function handleSendRehearsalTurn(
    situation: Situation,
    persona: Persona,
    activeRehearsal: Rehearsal | null,
    userMessage: string
  ) {
    if (!user) return;
    setSendingTurn(true);
    setLarpError(null);
    setSafetyAlert(null);

    try {
      const priorMessages = activeRehearsal?.messages ?? [];
      const turn = await requestRehearsalTurn(
        {
          title: situation.title,
          description: situation.description,
          desiredOutcome: situation.desiredOutcome,
          otherPersonRole: situation.otherPersonRole,
        },
        persona,
        evidenceLibrary,
        priorMessages,
        userMessage,
        previewMode
      );

      if (turn.isSafetyAlert) {
        setSafetyAlert(turn.safetyMessage);
        return;
      }

      const now = new Date().toISOString();
      const nextMessages: RehearsalMessage[] = [
        ...priorMessages,
        { role: 'user', text: userMessage, timestamp: now },
        { role: 'other_person', text: turn.otherPersonReply, timestamp: now },
        { role: 'coach', text: turn.coachNote, timestamp: now },
      ];

      if (previewMode) {
        if (activeRehearsal) {
          setRehearsals((prev) =>
            prev.map((r) =>
              r.id === activeRehearsal.id
                ? { ...r, messages: nextMessages, updatedAt: now }
                : r
            )
          );
        } else {
          const newReh: Rehearsal = {
            id: createFirestoreSafeId('reh'),
            userId: user.id,
            situationId: situation.id,
            personaId: persona.id,
            messages: nextMessages,
            feedback: '',
            createdAt: now,
            updatedAt: now,
          };
          setRehearsals((prev) => [newReh, ...prev]);
          setView({
            kind: 'larp',
            situationId: situation.id,
            personaId: persona.id,
            rehearsalId: newReh.id,
          });
        }
      } else {
        const pendingSitSave = pendingSituationSavesRef.current.get(situation.id);
        if (pendingSitSave) {
          await pendingSitSave;
        }
        if (activeRehearsal) {
          await updateRehearsalMessages(activeRehearsal.id, nextMessages);
        } else {
          const created = await createRehearsalDoc(
            user.id,
            situation.id,
            persona.id,
            nextMessages
          );
          setView({
            kind: 'larp',
            situationId: situation.id,
            personaId: persona.id,
            rehearsalId: created.id,
          });
        }
      }
    } catch (err) {
      setLarpError(
        err instanceof Error ? err.message : 'Unable to send rehearsal turn.'
      );
    } finally {
      setSendingTurn(false);
    }
  }

  async function handleFinishRehearsal(
    situation: Situation,
    persona: Persona,
    activeRehearsal: Rehearsal
  ) {
    setEndingRehearsal(true);
    setLarpError(null);
    try {
      const { feedback } = await requestRehearsalFeedback(
        {
          title: situation.title,
          description: situation.description,
          desiredOutcome: situation.desiredOutcome,
          otherPersonRole: situation.otherPersonRole,
        },
        persona,
        evidenceLibrary,
        activeRehearsal.messages,
        previewMode
      );

      if (previewMode) {
        const now = new Date().toISOString();
        setRehearsals((prev) =>
          prev.map((r) =>
            r.id === activeRehearsal.id ? { ...r, feedback, updatedAt: now } : r
          )
        );
      } else {
        await finalizeRehearsalFeedback(activeRehearsal.id, feedback);
      }
    } catch (err) {
      setLarpError(
        err instanceof Error ? err.message : 'Unable to generate coaching feedback.'
      );
    } finally {
      setEndingRehearsal(false);
    }
  }

  async function handleDeleteSituation(
    situationId: string,
    relatedAnalyses: Analysis[],
    relatedRehearsals: Rehearsal[]
  ) {
    if (previewMode) {
      setSituations((prev) => prev.filter((s) => s.id !== situationId));
      setAnalyses((prev) => prev.filter((a) => a.situationId !== situationId));
      setRehearsals((prev) => prev.filter((r) => r.situationId !== situationId));
      return;
    }
    await deleteSituationCascade(situationId, relatedAnalyses, relatedRehearsals);
  }

  const activeNavSection: NavSection =
    view.kind === 'new-situation'
      ? 'new-situation'
      : view.kind === 'history'
        ? 'history'
        : view.kind === 'how-it-works'
          ? 'how-it-works'
          : 'home';

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#FBF9F5] flex items-center justify-center p-6">
        <p className="font-serif text-lg text-[#57534E]">Loading PersonaLens...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-[#1C1917] flex flex-col overflow-x-clip">
      <TopNav
        activeSection={activeNavSection}
        onNavigate={handleNavigate}
        user={user}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        authLoading={authLoading}
      />

      {!previewMode && aiConfigured === false && !setupBannerDismissed && (
        <div
          role="status"
          aria-live="polite"
          data-testid="missing-ai-key-banner"
          className="bg-[#FFFBEB] border-b border-[#FDE68A] px-4 sm:px-6 py-3"
        >
          <div className="max-w-6xl mx-auto flex items-start justify-between gap-3 text-xs sm:text-sm text-[#78350F]">
            <div className="flex items-start gap-2.5 min-w-0">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#9A3412]" aria-hidden="true" />
              <p className="leading-relaxed min-w-0 break-words">
                <strong className="font-semibold">Server AI setup required:</strong>{' '}
                <code className="font-mono text-xs bg-white/80 px-1.5 py-0.5 rounded border border-[#FDE68A]">
                  GEMINI_API_KEY
                </code>{' '}
                is not configured on the server yet. Add it in AI Studio{' '}
                <span className="font-medium">Settings &gt; Secrets</span> or your local{' '}
                <code className="font-mono text-xs bg-white/80 px-1.5 py-0.5 rounded border border-[#FDE68A]">
                  .env
                </code>{' '}
                file, then restart the server to run analyses and Larp Mode rehearsals.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSetupBannerDismissed(true)}
              aria-label="Dismiss setup notice"
              className="p-1 rounded-md text-[#78350F] hover:bg-[#FDE68A]/50 transition-colors shrink-0"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0">
        {!user ? (
          view.kind === 'how-it-works' ? (
            <HowItWorksView
              evidenceLibrary={SEED_EVIDENCE_LIBRARY}
              isSignedIn={false}
              onStartNewSituation={() => setView({ kind: 'new-situation' })}
              onBackHome={() => setView({ kind: 'home' })}
              onSignIn={handleSignIn}
            />
          ) : (
            <SignInLanding
              onSignIn={handleSignIn}
              authLoading={authLoading}
              authError={authError}
            />
          )
        ) : view.kind === 'home' ? (
          <HomeView
            user={user}
            personas={personas}
            evidenceLibrary={evidenceLibrary}
            situations={situations}
            analyses={analyses}
            rehearsals={rehearsals}
            catalogLoading={catalogLoading}
            onStartNewSituation={(preselectedPersonaId) =>
              setView({ kind: 'new-situation', preselectedPersonaId })
            }
            onStartCompare={() =>
              setView({ kind: 'new-situation', initialMode: 'compare' })
            }
            onAnalyzeSavedSituation={(situation) =>
              setView({ kind: 'new-situation', prefillSituation: situation })
            }
            onOpenAnalysis={(situation, analysis) =>
              setView({
                kind: 'analysis',
                situationId: situation.id,
                analysisId: analysis.id,
              })
            }
            onOpenRehearsal={(situation, rehearsal) =>
              setView({
                kind: 'larp',
                situationId: situation.id,
                personaId: rehearsal.personaId,
                rehearsalId: rehearsal.id,
              })
            }
            onOpenHistory={() => setView({ kind: 'history' })}
          />
        ) : view.kind === 'new-situation' ? (
          <NewSituationView
            personas={personas}
            initialPersonaId={view.preselectedPersonaId}
            initialSituation={view.prefillSituation}
            initialMode={view.initialMode}
            submitting={submittingSituation}
            submitError={submitError}
            safetyAlert={safetyAlert}
            onClearSafetyAlert={() => setSafetyAlert(null)}
            onSubmit={(input, persona) =>
              handleCreateAndAnalyzeSituation(input, persona, view.prefillSituation)
            }
            onCompareSubmit={(input, personaA, personaB) =>
              handleCompareTwoPersonas(input, personaA, personaB, view.prefillSituation)
            }
          />
        ) : view.kind === 'history' ? (
          <HistoryView
            situations={situations}
            analyses={analyses}
            rehearsals={rehearsals}
            personas={personas}
            onOpenAnalysis={(situation, analysis) =>
              setView({
                kind: 'analysis',
                situationId: situation.id,
                analysisId: analysis.id,
              })
            }
            onOpenCompare={(situation, sitAnalyses) =>
              setView({
                kind: 'compare',
                situationId: situation.id,
                leftAnalysisId: sitAnalyses[0]?.id,
                rightAnalysisId: sitAnalyses[1]?.id,
              })
            }
            onOpenRehearsal={(situation, rehearsal) =>
              setView({
                kind: 'larp',
                situationId: situation.id,
                personaId: rehearsal.personaId,
                rehearsalId: rehearsal.id,
              })
            }
            onDeleteSituation={handleDeleteSituation}
            onStartNewSituation={() => setView({ kind: 'new-situation' })}
          />
        ) : view.kind === 'how-it-works' ? (
          <HowItWorksView
            evidenceLibrary={evidenceLibrary.length > 0 ? evidenceLibrary : SEED_EVIDENCE_LIBRARY}
            isSignedIn={true}
            onStartNewSituation={() => setView({ kind: 'new-situation' })}
            onBackHome={() => setView({ kind: 'home' })}
            onSignIn={handleSignIn}
          />
        ) : view.kind === 'compare' ? (
          (() => {
            const situation = situations.find((s) => s.id === view.situationId);
            if (!situation) {
              return (
                <main className="max-w-3xl mx-auto px-6 py-16 text-center">
                  <p className="font-serif text-xl text-[#1C1917] mb-4">
                    This situation comparison is no longer available.
                  </p>
                  <button
                    type="button"
                    onClick={() => setView({ kind: 'history' })}
                    className="px-4 py-2 text-sm font-medium bg-[#1E3A8A] text-white rounded-lg"
                  >
                    Return to History
                  </button>
                </main>
              );
            }
            const situationAnalyses = analyses.filter(
              (a) => a.situationId === situation.id
            );

            return (
              <CompareView
                situation={situation}
                situationAnalyses={situationAnalyses}
                personas={personas}
                evidenceLibrary={evidenceLibrary}
                leftAnalysisId={view.leftAnalysisId}
                rightAnalysisId={view.rightAnalysisId}
                generatingSlot={compareGeneratingSlot}
                compareError={compareError}
                safetyAlert={safetyAlert}
                onClearSafetyAlert={() => setSafetyAlert(null)}
                onGenerateAnalysisForSlot={(slot, persona) =>
                  handleGenerateCompareSlot(situation, slot, persona)
                }
                onSelectSlotAnalysis={(slot, analysisId) =>
                  setView((prev) =>
                    prev.kind === 'compare'
                      ? slot === 'left'
                        ? { ...prev, leftAnalysisId: analysisId }
                        : { ...prev, rightAnalysisId: analysisId }
                      : prev
                  )
                }
                onOpenSingleAnalysis={(targetAnalysis) =>
                  setView({
                    kind: 'analysis',
                    situationId: situation.id,
                    analysisId: targetAnalysis.id,
                  })
                }
                onStartLarpMode={(personaId) => {
                  const existingRehearsal = rehearsals.find(
                    (r) => r.situationId === situation.id && r.personaId === personaId
                  );
                  setView({
                    kind: 'larp',
                    situationId: situation.id,
                    personaId,
                    rehearsalId: existingRehearsal?.id,
                  });
                }}
                onBackToHistory={() => setView({ kind: 'history' })}
              />
            );
          })()
        ) : view.kind === 'analysis' ? (
          (() => {
            const situation = situations.find((s) => s.id === view.situationId);
            const analysis = analyses.find((a) => a.id === view.analysisId);
            const persona = analysis
              ? personas.find((p) => p.id === analysis.personaId)
              : undefined;

            if (!situation || !analysis) {
              return (
                <main className="max-w-3xl mx-auto px-6 py-16 text-center">
                  <p className="font-serif text-xl text-[#1C1917] mb-4">
                    This analysis is no longer available.
                  </p>
                  <button
                    type="button"
                    onClick={() => setView({ kind: 'history' })}
                    className="px-4 py-2 text-sm font-medium bg-[#1E3A8A] text-white rounded-lg"
                  >
                    Return to History
                  </button>
                </main>
              );
            }
            const resolvedPersona =
              persona ?? resolvePersonaOrArchived(personas, analysis.personaId);

            const existingRehearsal = rehearsals.find(
              (r) =>
                r.situationId === situation.id && r.personaId === resolvedPersona.id
            );
            const siblingAnalysis = analyses.find(
              (a) => a.situationId === situation.id && a.id !== analysis.id
            );

            return (
              <AnalysisResultView
                situation={situation}
                analysis={analysis}
                persona={resolvedPersona}
                allPersonas={personas}
                evidenceLibrary={evidenceLibrary}
                reanalyzing={reanalyzing}
                reanalyzeError={reanalyzeError}
                safetyAlert={safetyAlert}
                onClearSafetyAlert={() => setSafetyAlert(null)}
                onReanalyzeWithPersona={(nextPersona) =>
                  handleReanalyzeWithPersona(situation, nextPersona)
                }
                onOpenCompareView={() =>
                  setView({
                    kind: 'compare',
                    situationId: situation.id,
                    leftAnalysisId: analysis.id,
                    rightAnalysisId: siblingAnalysis?.id,
                  })
                }
                onStartLarpMode={() =>
                  setView({
                    kind: 'larp',
                    situationId: situation.id,
                    personaId: resolvedPersona.id,
                    rehearsalId: existingRehearsal?.id,
                  })
                }
                onBackToHistory={() => setView({ kind: 'history' })}
              />
            );
          })()
        ) : (
          (() => {
            const situation = situations.find((s) => s.id === view.situationId);
            const persona = personas.find((p) => p.id === view.personaId);
            const activeRehearsal = view.rehearsalId
              ? rehearsals.find((r) => r.id === view.rehearsalId) ?? null
              : rehearsals.find(
                  (r) =>
                    r.situationId === view.situationId &&
                    r.personaId === view.personaId
                ) ?? null;
            const relatedAnalysis = analyses.find(
              (a) =>
                a.situationId === view.situationId &&
                a.personaId === view.personaId
            );

            if (!situation) {
              return (
                <main className="max-w-3xl mx-auto px-6 py-16 text-center">
                  <p className="font-serif text-xl text-[#1C1917] mb-4">
                    Rehearsal context not found.
                  </p>
                  <button
                    type="button"
                    onClick={() => setView({ kind: 'history' })}
                    className="px-4 py-2 text-sm font-medium bg-[#1E3A8A] text-white rounded-lg"
                  >
                    Return to History
                  </button>
                </main>
              );
            }
            const resolvedPersona =
              persona ?? resolvePersonaOrArchived(personas, view.personaId);

            return (
              <LarpModeView
                situation={situation}
                persona={resolvedPersona}
                rehearsal={activeRehearsal}
                suggestedDraft={relatedAnalysis?.suggestedResponse}
                sendingTurn={sendingTurn}
                endingRehearsal={endingRehearsal}
                error={larpError}
                safetyAlert={safetyAlert}
                onClearSafetyAlert={() => setSafetyAlert(null)}
                onSendTurn={(msg) =>
                  handleSendRehearsalTurn(situation, resolvedPersona, activeRehearsal, msg)
                }
                onFinishAndGetFeedback={async () => {
                  if (activeRehearsal) {
                    await handleFinishRehearsal(situation, resolvedPersona, activeRehearsal);
                  }
                }}
                onBack={() => {
                  if (relatedAnalysis) {
                    setView({
                      kind: 'analysis',
                      situationId: situation.id,
                      analysisId: relatedAnalysis.id,
                    });
                  } else {
                    setView({ kind: 'history' });
                  }
                }}
              />
            );
          })()
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <PersonaLensWorkspace />
    </ErrorBoundary>
  );
}
