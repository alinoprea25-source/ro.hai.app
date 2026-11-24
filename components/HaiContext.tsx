'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  deleteUser,
  onAuthStateChanged,
  reauthenticateWithPopup,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { authorizedFetch } from '@/lib/api-client';
import {
  deleteFirebaseAccountDocs,
  loadOrBootstrapFirebaseUser,
  saveFirebaseProfileAndAccount,
  updateFirebasePreferencesOnly,
} from '@/lib/firebase-account';
import {
  DEMO_ACTIVITIES,
  DEMO_CONVERSATIONS,
  DEMO_DATING_PROFILES,
  DEMO_MATCHES,
  DEMO_NOTIFICATIONS,
  DEMO_PLANS,
  DEMO_TRUSTED_CONTACTS,
  INITIAL_USER_PROFILE,
} from '@/lib/demo-data';
import type {
  ActivityCategory,
  ActivityItem,
  ConversationItem,
  DatingProfile,
  MainTab,
  MatchItem,
  NotificationItem,
  PhotoKey,
  PlanChangeProposal,
  PlanItem,
  PlanProposedSlot,
  PlanStatusEvent,
  ReliabilityBreakdown,
  ReliabilitySummary,
  RomanianCity,
  SafetyReport,
  ScreenId,
  TrustedContact,
  UserProfile,
  VerificationStatus,
  WaitlistEntry,
  WaitlistOffer,
} from '@/types/hai';

export interface ToastMessage {
  id: string;
  title: string;
  tone?: 'default' | 'success' | 'error';
}

interface ConfirmDialogState {
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
}

interface ReportModalState {
  targetType: 'user' | 'activity' | 'comment' | 'review';
  targetId: string;
  targetTitle: string;
}

interface HaiContextValue {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  screen: ScreenId;
  setScreen: (screen: ScreenId) => void;
  activeTab: MainTab;
  navigateTab: (tab: MainTab) => void;
  profileSubView: 'profile' | 'plans' | 'moderation';
  setProfileSubView: (view: 'profile' | 'plans' | 'moderation') => void;
  openPlans: () => void;
  isAuthenticated: boolean;
  isServerAdmin: boolean;
  authReady: boolean;
  authLoading: boolean;
  authUid: string | null;
  authMode: 'login' | 'register';
  setAuthMode: (mode: 'login' | 'register') => void;
  signInWithGoogle: () => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  startOnboarding: () => void;
  completeOnboarding: (patch: Partial<UserProfile>, discoveryCity?: RomanianCity | 'Toate') => Promise<void>;
  skipOnboarding: () => Promise<void>;
  verificationModalOpen: boolean;
  openVerificationModal: () => void;
  closeVerificationModal: () => void;
  submitVerification: (poseId: string, photoDataUrl: string) => Promise<{ ok: boolean; error?: string }>;
  applyVerificationDecision: (targetUserId: string, decision: 'verified' | 'rejected', note?: string) => void;
  user: UserProfile;
  updateUserProfile: (patch: Partial<UserProfile>) => Promise<void>;
  updateDiscoveryPrefs: (patch: Partial<UserProfile['discoveryPreferences']>) => Promise<void>;
  updateReconfirmationSettings: (patch: Partial<UserProfile['reconfirmationSettings']>) => Promise<void>;
  selectedCity: RomanianCity | 'Toate';
  setSelectedCity: (city: RomanianCity | 'Toate') => void;

  // Dating
  datingQueue: DatingProfile[];
  allProfiles: DatingProfile[];
  likedIds: string[];
  passedIds: string[];
  blockedIds: string[];
  activeMatchModal: DatingProfile | null;
  dismissMatchModal: () => void;
  likeProfile: (profileId: string, forceMutual?: boolean) => void;
  passProfile: (profileId: string) => void;
  resetDiscoveryDeck: () => void;
  blockUser: (userId: string, userName: string) => void;
  unblockUser: (userId: string) => void;

  // Activities & Waitlist
  activities: ActivityItem[];
  savedActivityIds: string[];
  selectedActivityId: string | null;
  openActivityDetail: (activityId: string) => void;
  toggleSaveActivity: (activityId: string) => void;
  joinOrLeaveActivity: (activityId: string) => void;
  joinWaitlistOrActivity: (activityId: string) => Promise<void>;
  waitlistEntries: WaitlistEntry[];
  waitlistOffers: WaitlistOffer[];
  respondWaitlistOffer: (offerId: string, decision: 'ACCEPT' | 'DECLINE') => Promise<void>;
  submitGroupCheckIn: (activityId: string, code: string) => Promise<{ ok: boolean; error?: string }>;
  createActivity: (input: {
    title: string;
    category: ActivityCategory;
    description: string;
    isoDate: string;
    dateLabel: string;
    time: string;
    city: RomanianCity;
    location: string;
    maxParticipants: number;
    priceLei: number | null;
    requiresApproval: boolean;
    autoReleaseWaitlistSpot?: boolean;
    photoKey: PhotoKey;
    customImageUrl?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  updateActivity: (activityId: string, patch: Partial<ActivityItem>) => void;

  // Plans & Lifecycle
  plans: PlanItem[];
  selectedPlanId: string | null;
  openPlanDetail: (planId: string) => void;
  planProposals: PlanChangeProposal[];
  planStatusEvents: PlanStatusEvent[];
  cancelPlan: (planId: string) => void;
  cancelPlanSafe: (
    planId: string,
    options?: { safetyReason?: boolean; reasonText?: string }
  ) => Promise<boolean>;
  confirmOrReconfirmPlan: (planId: string, mode?: 'confirm' | 'reconfirm') => Promise<boolean>;
  proposeReschedule: (
    planId: string,
    kind: PlanChangeProposal['kind'],
    slots: PlanProposedSlot[],
    note?: string
  ) => Promise<boolean>;
  respondRescheduleProposal: (
    proposalId: string,
    decision: 'ACCEPT' | 'REJECT',
    selectedSlotId?: string
  ) => Promise<boolean>;
  evaluateServerReminders: () => Promise<void>;
  proposeMeetup: (
    partner: {
      id: string;
      name: string;
      photoKey: PhotoKey;
      city: RomanianCity;
    },
    details: { title: string; dateLabel: string; time: string; location: string }
  ) => void;
  checkInPlan: (planId: string) => void;
  sharePlanWithContact: (planId: string, contactName: string) => void;

  // Reliability
  userReliability: ReliabilityBreakdown | null;
  publicReliabilities: Record<string, ReliabilitySummary>;
  refreshUserReliability: () => Promise<void>;
  fetchPublicReliability: (targetUserId: string) => Promise<ReliabilitySummary | null>;
  submitDispute: (recordId: string, reason: string) => Promise<boolean>;

  // Matches & Messages
  matches: MatchItem[];
  conversations: ConversationItem[];
  activeConversationId: string | null;
  openConversation: (conversationId: string) => void;
  openConversationWithPartner: (partner: {
    id: string;
    name: string;
    age: number;
    city: RomanianCity;
    photoKey: PhotoKey;
  }) => void;
  sendMessage: (conversationId: string, text: string) => void;
  unreadTotal: number;

  // Notifications & Safety
  notifications: NotificationItem[];
  markAllNotificationsRead: () => void;
  trustedContacts: TrustedContact[];
  addTrustedContact: (contact: Omit<TrustedContact, 'id'>) => void;
  removeTrustedContact: (id: string) => void;
  reports: SafetyReport[];
  openReportModal: (target: ReportModalState) => void;
  reportModal: ReportModalState | null;
  closeReportModal: () => void;
  submitReport: (reason: string, details: string) => Promise<boolean>;

  // UI Feedback
  toasts: ToastMessage[];
  showToast: (title: string, tone?: ToastMessage['tone']) => void;
  confirmDialog: ConfirmDialogState | null;
  askConfirm: (dialog: ConfirmDialogState) => void;
  closeConfirm: () => void;
}

const HaiContext = createContext<HaiContextValue | null>(null);

export function HaiProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [screen, setScreen] = useState<ScreenId>('welcome');
  const [activeTab, setActiveTab] = useState<MainTab>('home');
  const [profileSubView, setProfileSubView] = useState<'profile' | 'plans' | 'moderation'>('profile');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isServerAdmin, setIsServerAdmin] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authUid, setAuthUid] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');

  const [user, setUser] = useState<UserProfile>(INITIAL_USER_PROFILE);
  const userRef = useRef<UserProfile>(INITIAL_USER_PROFILE);
  const [selectedCity, setSelectedCity] = useState<RomanianCity | 'Toate'>('Cluj-Napoca');

  const [allProfiles] = useState<DatingProfile[]>(DEMO_DATING_PROFILES);
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [passedIds, setPassedIds] = useState<string[]>([]);
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
  const [activeMatchModal, setActiveMatchModal] = useState<DatingProfile | null>(null);

  const [activities, setActivities] = useState<ActivityItem[]>(DEMO_ACTIVITIES);
  const [savedActivityIds, setSavedActivityIds] = useState<string[]>(['act-cinema-grup']);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);

  const [plans, setPlans] = useState<PlanItem[]>(DEMO_PLANS);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [planProposals, setPlanProposals] = useState<PlanChangeProposal[]>([]);
  const [planStatusEvents, setPlanStatusEvents] = useState<PlanStatusEvent[]>([]);
  const [waitlistEntries, setWaitlistEntries] = useState<WaitlistEntry[]>([]);
  const [waitlistOffers, setWaitlistOffers] = useState<WaitlistOffer[]>([]);

  const [userReliability, setUserReliability] = useState<ReliabilityBreakdown | null>(null);
  const [publicReliabilities, setPublicReliabilities] = useState<Record<string, ReliabilitySummary>>({});

  const [matches, setMatches] = useState<MatchItem[]>(DEMO_MATCHES);
  const [conversations, setConversations] = useState<ConversationItem[]>(DEMO_CONVERSATIONS);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const [notifications, setNotifications] = useState<NotificationItem[]>(DEMO_NOTIFICATIONS);
  const [trustedContacts, setTrustedContacts] = useState<TrustedContact[]>(DEMO_TRUSTED_CONTACTS);
  const [reports, setReports] = useState<SafetyReport[]>([]);
  const [reportModal, setReportModal] = useState<ReportModalState | null>(null);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!active) return;
      if (!fbUser) {
        setIsAuthenticated(false);
        setIsServerAdmin(false);
        setAuthUid(null);
        setProfileSubView('profile');
        setUserReliability(null);
        setUser(INITIAL_USER_PROFILE);
        setScreen((curr) => (curr === 'auth' ? 'auth' : 'welcome'));
        setAuthReady(true);
        return;
      }

      try {
        const loadedProfile = await loadOrBootstrapFirebaseUser(fbUser);
        if (!active) return;
        userRef.current = loadedProfile;
        setUser(loadedProfile);
        setSelectedCity(loadedProfile.discoveryPreferences.city);
        setAuthUid(fbUser.uid);
        setIsAuthenticated(true);

        try {
          const sessionRes = await authorizedFetch('/api/auth/session');
          if (active && sessionRes.ok) {
            const sessionData = await sessionRes.json();
            setIsServerAdmin(Boolean(sessionData?.isAdmin));
          } else if (active) {
            setIsServerAdmin(false);
          }
        } catch {
          if (active) setIsServerAdmin(false);
        }

        if (!active) return;
        setScreen((curr) => {
          if (!loadedProfile.hasCompletedOnboarding) {
            return 'onboarding';
          }
          if (curr === 'welcome' || curr === 'auth' || curr === 'onboarding') {
            return 'main';
          }
          return curr;
        });
      } catch (err) {
        console.error('Firebase user bootstrap error:', err);
        setIsAuthenticated(false);
        setIsServerAdmin(false);
        setAuthUid(null);
        setProfileSubView('profile');
        setScreen('auth');
      } finally {
        if (active) setAuthReady(true);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const refreshUserReliability = useCallback(async () => {
    if (!auth.currentUser) return;
    try {
      const res = await authorizedFetch(`/api/reliability?userId=${encodeURIComponent(user.id)}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.breakdown) {
        setUserReliability(data.breakdown);
      }
      if (data.summary) {
        setPublicReliabilities((prev) => ({ ...prev, [user.id]: data.summary }));
      }
    } catch {
      // Ignore network errors during bootstrap
    }
  }, [user.id]);

  const fetchPublicReliability = useCallback(
    async (targetUserId: string): Promise<ReliabilitySummary | null> => {
      if (!auth.currentUser) return null;
      try {
        const res = await authorizedFetch(
          `/api/reliability?userId=${encodeURIComponent(targetUserId)}`
        );
        if (!res.ok) return null;
        const data = await res.json();
        if (data.summary) {
          setPublicReliabilities((prev) => ({ ...prev, [targetUserId]: data.summary }));
          return data.summary as ReliabilitySummary;
        }
      } catch {
        // Ignore network failure
      }
      return null;
    },
    []
  );

  useEffect(() => {
    if (!isAuthenticated || !authReady || !authUid) return;
    let cancelled = false;
    async function hydrateTrustState() {
      try {
        const [plansRes, waitlistRes, relRes] = await Promise.all([
          authorizedFetch('/api/plans'),
          authorizedFetch('/api/waitlist'),
          authorizedFetch(`/api/reliability?userId=${encodeURIComponent(user.id)}`),
        ]);
        if (cancelled) return;
        if (plansRes.ok) {
          const pData = await plansRes.json();
          if (Array.isArray(pData.plans)) setPlans(pData.plans);
          if (Array.isArray(pData.proposals)) setPlanProposals(pData.proposals);
          if (Array.isArray(pData.events)) setPlanStatusEvents(pData.events);
          if (Array.isArray(pData.notifications) && pData.notifications.length > 0) {
            setNotifications(pData.notifications);
          }
        }
        if (waitlistRes.ok) {
          const wData = await waitlistRes.json();
          if (Array.isArray(wData.entries)) setWaitlistEntries(wData.entries);
          if (Array.isArray(wData.offers)) setWaitlistOffers(wData.offers);
        }
        if (relRes.ok) {
          const rData = await relRes.json();
          if (rData.breakdown) setUserReliability(rData.breakdown);
          if (rData.summary) {
            setPublicReliabilities((prev) => ({ ...prev, [user.id]: rData.summary }));
          }
        }
      } catch {
        // Fallback silently to initial seed data
      }
    }
    void hydrateTrustState();
    return () => {
      cancelled = true;
    };
  }, [authReady, authUid, isAuthenticated, user.id]);

  const showToast = useCallback((title: string, tone: ToastMessage['tone'] = 'default') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-2), { id, title, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3400);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const navigateTab = useCallback((tab: MainTab) => {
    setActiveTab(tab);
    setScreen('main');
  }, []);

  const openPlans = useCallback(() => {
    setProfileSubView('plans');
    setActiveTab('profile');
    setScreen('main');
  }, []);

  const openPlanDetail = useCallback((planId: string) => {
    setSelectedPlanId(planId);
    setScreen('plan-detail');
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    setAuthLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      showToast('Autentificare reușită cu Google!', 'success');
      return { ok: true };
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        return { ok: false, error: 'Fereastra Google Sign-In a fost închisă înainte de finalizare.' };
      }
      if (code === 'auth/popup-blocked') {
        return { ok: false, error: 'Browserul a blocat fereastra pop-up. Permite ferestrele pop-up și încearcă din nou.' };
      }
      return { ok: false, error: 'Autentificarea cu Google nu a putut fi finalizată.' };
    } finally {
      setAuthLoading(false);
    }
  }, [showToast]);

  const startOnboarding = useCallback(() => {
    setScreen('onboarding');
  }, []);

  const completeOnboarding = useCallback(
    async (patch: Partial<UserProfile>, discoveryCity?: RomanianCity | 'Toate') => {
      const nextCity = discoveryCity ?? patch.city ?? userRef.current.discoveryPreferences.city;
      const merged: UserProfile = {
        ...userRef.current,
        ...patch,
        hasCompletedOnboarding: true,
        discoveryPreferences: {
          ...userRef.current.discoveryPreferences,
          ...(patch.discoveryPreferences ?? {}),
          city: nextCity,
        },
      };

      userRef.current = merged;
      setUser(merged);
      if (nextCity) {
        setSelectedCity(nextCity);
      }

      const fbUser = auth.currentUser;
      if (fbUser) {
        await saveFirebaseProfileAndAccount(fbUser.uid, merged, {
          markOnboardingCompleted: true,
        });
      }

      setActiveTab('home');
      setScreen('main');
      showToast('Profil configurat și salvat în contul tău HAI.', 'success');
    },
    [showToast]
  );

  const skipOnboarding = useCallback(async () => {
    const merged: UserProfile = {
      ...userRef.current,
      hasCompletedOnboarding: true,
    };
    userRef.current = merged;
    setUser(merged);
    const fbUser = auth.currentUser;
    if (fbUser) {
      await saveFirebaseProfileAndAccount(fbUser.uid, merged, {
        markOnboardingCompleted: true,
      });
    }
    setActiveTab('home');
    setScreen('main');
    showToast('Poți completa oricând profilul din secțiunea Profil.');
  }, [showToast]);

  const submitVerification = useCallback(
    async (
      poseId: string,
      photoDataUrl: string
    ): Promise<{ ok: boolean; error?: string }> => {
      try {
        const res = await authorizedFetch('/api/verification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userName: user.name,
            poseId,
            photoDataUrl,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          return { ok: false, error: data.error || 'Verificarea a eșuat.' };
        }
        setUser((prev) => ({
          ...prev,
          verificationStatus: 'pending',
          verificationNote: 'Fotografia a fost trimisă și așteaptă revizia administrativă.',
        }));
        setVerificationModalOpen(false);
        showToast('Cererea de verificare a fost trimisă pentru analiză!', 'success');
        return { ok: true };
      } catch {
        return { ok: false, error: 'Eroare de rețea la trimiterea fotografiei.' };
      }
    },
    [showToast, user.name]
  );

  const applyVerificationDecision = useCallback(
    (targetUserId: string, decision: 'verified' | 'rejected', note?: string) => {
      if (targetUserId === user.id) {
        const isVerified = decision === 'verified';
        setUser((prev) => ({
          ...prev,
          verificationStatus: decision as VerificationStatus,
          verificationNote:
            note ||
            (isVerified
              ? 'Profil verificat de echipa de moderare.'
              : 'Te rugăm să retrimiți o fotografie mai clară.'),
        }));
        setActivities((prev) =>
          prev.map((a) => ({
            ...a,
            organizerVerified: a.organizerId === user.id ? isVerified : a.organizerVerified,
            participants: a.participants.map((p) =>
              p.id === user.id ? { ...p, isVerified } : p
            ),
          }))
        );
      }
      showToast(
        decision === 'verified'
          ? 'Verificare aprobată! Insigna de profil verificat este activă.'
          : 'Verificare respinsă.',
        decision === 'verified' ? 'success' : 'default'
      );
    },
    [showToast, user.id]
  );

  const logout = useCallback(async () => {
    await signOut(auth);
    setIsAuthenticated(false);
    setIsServerAdmin(false);
    setAuthUid(null);
    setProfileSubView('profile');
    setUserReliability(null);
    setUser(INITIAL_USER_PROFILE);
    setScreen('welcome');
    showToast('Te-ai deconectat din contul HAI.');
  }, [showToast]);

  const deleteAccount = useCallback(async () => {
    const fbUser = auth.currentUser;
    if (!fbUser) return;
    try {
      await deleteFirebaseAccountDocs(fbUser.uid);
      await deleteUser(fbUser);
      setIsAuthenticated(false);
      setIsServerAdmin(false);
      setAuthUid(null);
      setProfileSubView('profile');
      setUserReliability(null);
      setUser(INITIAL_USER_PROFILE);
      setLikedIds([]);
      setPassedIds([]);
      setBlockedIds([]);
      setScreen('welcome');
      showToast('Contul și datele de profil au fost șterse definitiv.', 'success');
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/requires-recent-login') {
        try {
          await reauthenticateWithPopup(fbUser, googleProvider);
          await deleteFirebaseAccountDocs(fbUser.uid);
          await deleteUser(fbUser);
          setIsAuthenticated(false);
          setIsServerAdmin(false);
          setAuthUid(null);
          setProfileSubView('profile');
          setUserReliability(null);
          setUser(INITIAL_USER_PROFILE);
          setScreen('welcome');
          showToast('Contul a fost reautentificat și șters definitiv.', 'success');
          return;
        } catch {
          showToast('Reautentificarea cu Google este necesară pentru ștergerea contului.', 'error');
          return;
        }
      }
      showToast('Nu am putut finaliza ștergerea contului.', 'error');
    }
  }, [showToast]);

  const updateUserProfile = useCallback(
    async (patch: Partial<UserProfile>) => {
      const merged: UserProfile = { ...userRef.current, ...patch };
      userRef.current = merged;
      setUser(merged);
      const fbUser = auth.currentUser;
      if (fbUser) {
        await saveFirebaseProfileAndAccount(fbUser.uid, merged);
      }
      showToast('Profil actualizat și salvat.', 'success');
    },
    [showToast]
  );

  const updateDiscoveryPrefs = useCallback(
    async (patch: Partial<UserProfile['discoveryPreferences']>) => {
      const merged: UserProfile = {
        ...userRef.current,
        discoveryPreferences: { ...userRef.current.discoveryPreferences, ...patch },
      };
      userRef.current = merged;
      setUser(merged);
      if (patch.city) {
        setSelectedCity(patch.city);
      }
      const fbUser = auth.currentUser;
      if (fbUser) {
        await updateFirebasePreferencesOnly(fbUser.uid, merged);
      }
      showToast('Preferințe salvate în cont.', 'success');
    },
    [showToast]
  );

  const updateReconfirmationSettings = useCallback(
    async (patch: Partial<UserProfile['reconfirmationSettings']>) => {
      const merged: UserProfile = {
        ...userRef.current,
        reconfirmationSettings: { ...userRef.current.reconfirmationSettings, ...patch },
      };
      userRef.current = merged;
      setUser(merged);
      const fbUser = auth.currentUser;
      if (fbUser) {
        await updateFirebasePreferencesOnly(fbUser.uid, merged);
      }
      showToast('Preferințele de reconfirmare au fost salvate.', 'success');
    },
    [showToast]
  );

  const datingQueue = useMemo(() => {
    return allProfiles.filter((profile) => {
      if (profile.id === user.id) return false;
      if (blockedIds.includes(profile.id)) return false;
      if (likedIds.includes(profile.id) || passedIds.includes(profile.id)) return false;
      if (selectedCity !== 'Toate' && profile.city !== selectedCity) return false;
      if (
        profile.age < user.discoveryPreferences.minAge ||
        profile.age > user.discoveryPreferences.maxAge
      ) {
        return false;
      }
      return true;
    });
  }, [allProfiles, blockedIds, likedIds, passedIds, selectedCity, user.discoveryPreferences.maxAge, user.discoveryPreferences.minAge, user.id]);

  const likeProfile = useCallback(
    (profileId: string, forceMutual = false) => {
      if (profileId === user.id) {
        showToast('Nu îți poți aprecia propriul profil.', 'error');
        return;
      }
      const target = allProfiles.find((p) => p.id === profileId);
      if (!target || blockedIds.includes(profileId)) return;

      setLikedIds((prev) => (prev.includes(profileId) ? prev : [...prev, profileId]));

      if (target.likesCurrentUser || forceMutual) {
        setMatches((prev) => {
          if (prev.some((m) => m.partnerId === target.id)) return prev;
          return [
            {
              id: `match-${target.id}`,
              partnerId: target.id,
              partnerName: target.name,
              partnerAge: target.age,
              partnerCity: target.city,
              partnerPhotoKey: target.photoKey,
              partnerVerified: target.isVerified,
              matchedAt: 'Chiar acum',
              hasConversation: conversations.some((c) => c.partnerId === target.id),
            },
            ...prev,
          ];
        });
        setActiveMatchModal(target);
      } else {
        showToast(`Ai apreciat profilul ${target.name}.`);
      }
    },
    [allProfiles, blockedIds, conversations, showToast, user.id]
  );

  const passProfile = useCallback((profileId: string) => {
    setPassedIds((prev) => (prev.includes(profileId) ? prev : [...prev, profileId]));
  }, []);

  const resetDiscoveryDeck = useCallback(() => {
    setLikedIds([]);
    setPassedIds([]);
    showToast('Lista de descoperire a fost reîmprospătată.');
  }, [showToast]);

  const blockUser = useCallback(
    (userId: string, userName: string) => {
      setBlockedIds((prev) => (prev.includes(userId) ? prev : [...prev, userId]));
      setMatches((prev) => prev.filter((m) => m.partnerId !== userId));
      setConversations((prev) => prev.filter((c) => c.partnerId !== userId));
      setPlans((prev) =>
        prev.map((p) =>
          p.type === 'meetup' && p.partnerId === userId
            ? {
                ...p,
                status: 'cancelled',
                lifecycleStatus: 'CANCELLED',
                cancelledBySafety: true,
                subtitle: 'Întâlnire închisă în siguranță',
                lastUpdatedAt: new Date().toISOString(),
              }
            : p
        )
      );
      if (auth.currentUser) {
        void authorizedFetch('/api/plans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'safe_block_transition',
            blockedUserId: userId,
            blockedUserName: userName,
          }),
        });
      }
      if (activeConversationId) {
        const conv = conversations.find((c) => c.id === activeConversationId);
        if (conv?.partnerId === userId) {
          setActiveConversationId(null);
          setScreen('main');
          setActiveTab('messages');
        }
      }
      showToast(`${userName} a fost blocat(ă). Comunicația și planurile comune 1-la-1 au fost închise.`);
    },
    [activeConversationId, conversations, showToast]
  );

  const unblockUser = useCallback(
    (userId: string) => {
      setBlockedIds((prev) => prev.filter((id) => id !== userId));
      showToast('Utilizatorul a fost deblocat.');
    },
    [showToast]
  );

  const openActivityDetail = useCallback((activityId: string) => {
    setSelectedActivityId(activityId);
    setScreen('activity-detail');
  }, []);

  const toggleSaveActivity = useCallback(
    (activityId: string) => {
      setSavedActivityIds((prev) => {
        const exists = prev.includes(activityId);
        showToast(exists ? 'Eliminată din salvate.' : 'Activitate salvată.');
        return exists ? prev.filter((id) => id !== activityId) : [...prev, activityId];
      });
    },
    [showToast]
  );

  const joinWaitlistOrActivity = useCallback(
    async (activityId: string) => {
      try {
        const res = await authorizedFetch('/api/waitlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'join',
            activityId,
            userName: user.name,
            photoKey: user.photoKey,
            isVerified: user.verificationStatus === 'verified',
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          showToast(data.error || 'Nu am putut procesa înscrierea.', 'error');
          return;
        }
        if (data.activity) {
          setActivities((prev) =>
            prev.map((a) => (a.id === activityId ? data.activity : a))
          );
        }
        if (Array.isArray(data.entries)) {
          setWaitlistEntries((prev) => [
            ...prev.filter((e) => e.activityId !== activityId),
            ...data.entries,
          ]);
        }
        if (Array.isArray(data.offers)) {
          setWaitlistOffers((prev) => [
            ...prev.filter((o) => o.activityId !== activityId),
            ...data.offers,
          ]);
        }
        if (data.resultMode === 'waitlisted') {
          showToast(
            `Te-ai înscris pe lista de așteptare (poziția ${data.waitlistEntry?.position ?? 1}).`,
            'success'
          );
        } else if (data.resultMode === 'already_waitlisted') {
          showToast('Ești deja pe lista de așteptare pentru această activitate.');
        } else if (data.resultMode === 'joined') {
          showToast('Loc confirmat la activitate!', 'success');
        }
      } catch {
        showToast('Eroare de rețea la înscrierea pe lista de așteptare.', 'error');
      }
    },
    [showToast, user.name, user.photoKey, user.verificationStatus]
  );

  const respondWaitlistOffer = useCallback(
    async (offerId: string, decision: 'ACCEPT' | 'DECLINE') => {
      try {
        const res = await authorizedFetch('/api/waitlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: decision === 'ACCEPT' ? 'accept_offer' : 'decline_offer',
            offerId,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          showToast(data.error || 'Nu am putut procesa oferta.', 'error');
          return;
        }
        if (data.activity) {
          setActivities((prev) =>
            prev.map((a) => (a.id === data.activity.id ? data.activity : a))
          );
          setWaitlistEntries((prev) => [
            ...prev.filter((e) => e.activityId !== data.activity.id),
            ...(data.entries || []),
          ]);
          setWaitlistOffers((prev) => [
            ...prev.filter((o) => o.activityId !== data.activity.id),
            ...(data.offers || []),
          ]);
        }
        if (Array.isArray(data.notifications)) {
          setNotifications(data.notifications);
        }
        const plansRes = await authorizedFetch('/api/plans');
        if (plansRes.ok) {
          const pData = await plansRes.json();
          if (Array.isArray(pData.plans)) setPlans(pData.plans);
        }
        showToast(
          decision === 'ACCEPT'
            ? 'Loc acceptat și confirmat! Organizatorul a fost notificat.'
            : 'Ai refuzat locul; oferta a trecut la următoarea persoană eligibilă.',
          decision === 'ACCEPT' ? 'success' : 'default'
        );
      } catch {
        showToast('Eroare de rețea la răspunsul pentru lista de așteptare.', 'error');
      }
    },
    [showToast]
  );

  const submitGroupCheckIn = useCallback(
    async (activityId: string, code: string): Promise<{ ok: boolean; error?: string }> => {
      try {
        const res = await authorizedFetch('/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'check_in_code',
            activityId,
            code,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          showToast(data.error || 'Cod invalid.', 'error');
          return { ok: false, error: data.error };
        }
        setPlans((prev) =>
          prev.map((p) => (p.activityId === activityId ? { ...p, checkedIn: true } : p))
        );
        await refreshUserReliability();
        showToast('Prezență confirmată voluntar! Scorul tău a fost actualizat.', 'success');
        return { ok: true };
      } catch {
        return { ok: false, error: 'Eroare de rețea la check-in.' };
      }
    },
    [refreshUserReliability, showToast]
  );

  const joinOrLeaveActivity = useCallback(
    (activityId: string) => {
      const target = activities.find((a) => a.id === activityId);
      if (!target) return;

      const isAlreadyIn = target.participants.some((p) => p.id === user.id);

      if (isAlreadyIn) {
        if (target.organizerId === user.id) {
          showToast('Ești organizatorul acestei activități.', 'error');
          return;
        }
        setActivities((prev) =>
          prev.map((a) =>
            a.id === activityId
              ? { ...a, participants: a.participants.filter((p) => p.id !== user.id) }
              : a
          )
        );
        setPlans((prev) =>
          prev.map((pl) =>
            pl.activityId === activityId && pl.status !== 'cancelled'
              ? {
                  ...pl,
                  status: 'cancelled',
                  lifecycleStatus: 'CANCELLED',
                  subtitle: 'Participare anulată',
                  lastUpdatedAt: new Date().toISOString(),
                }
              : pl
          )
        );
        showToast('Ai anulat participarea la activitate.');
        return;
      }

      if (target.participants.length >= target.maxParticipants) {
        void joinWaitlistOrActivity(activityId);
        return;
      }

      setActivities((prev) =>
        prev.map((a) =>
          a.id === activityId
            ? {
                ...a,
                participants: [
                  ...a.participants,
                  {
                    id: user.id,
                    name: user.name,
                    photoKey: user.photoKey,
                    customPhotoUrl: user.customPhotoUrl,
                    isVerified: user.verificationStatus === 'verified',
                  },
                ],
              }
            : a
        )
      );

      const nowIso = new Date().toISOString();
      setPlans((prev) => {
        const existing = prev.find((p) => p.activityId === activityId);
        const newStatus = target.requiresApproval ? 'pending' : 'upcoming';
        const lifecycleStatus = target.requiresApproval ? 'AWAITING_CONFIRMATION' : 'CONFIRMED';
        const subtitle = target.requiresApproval
          ? `Organizat de ${target.organizerName} · În așteptarea aprobării`
          : `Organizat de ${target.organizerName} · Confirmat reciproc`;
        if (existing) {
          return prev.map((p) =>
            p.activityId === activityId
              ? { ...p, status: newStatus, lifecycleStatus, subtitle, lastUpdatedAt: nowIso }
              : p
          );
        }
        return [
          {
            id: `plan-${Date.now()}`,
            type: 'activity',
            activityId: target.id,
            title: target.title,
            subtitle,
            dateLabel: target.dateLabel,
            isoDate: target.isoDate,
            time: target.time,
            city: target.city,
            location: target.location,
            status: newStatus,
            lifecycleStatus,
            photoKey: target.photoKey,
            organizerId: target.organizerId,
            autoReleaseWaitlistSpot: target.autoReleaseWaitlistSpot,
            reconfirmationDeadlineIso: target.reconfirmationDeadlineIso,
            confirmations: [
              {
                userId: target.organizerId,
                userName: target.organizerName,
                photoKey: target.organizerPhotoKey,
                isVerified: target.organizerVerified,
                confirmed: true,
                reconfirmed: true,
              },
              {
                userId: user.id,
                userName: user.name,
                photoKey: user.photoKey,
                confirmed: true,
                reconfirmed: false,
                confirmedAt: nowIso,
              },
            ],
            lastUpdatedAt: nowIso,
          },
          ...prev,
        ];
      });

      showToast(
        target.requiresApproval
          ? 'Cererea ta de participare a fost trimisă organizatorului.'
          : 'Loc confirmat! Activitatea a fost adăugată la Planurile mele.',
        'success'
      );
    },
    [activities, joinWaitlistOrActivity, showToast, user.customPhotoUrl, user.id, user.name, user.photoKey, user.verificationStatus]
  );

  const createActivity = useCallback(
    async (input: {
      title: string;
      category: ActivityCategory;
      description: string;
      isoDate: string;
      dateLabel: string;
      time: string;
      city: RomanianCity;
      location: string;
      maxParticipants: number;
      priceLei: number | null;
      requiresApproval: boolean;
      autoReleaseWaitlistSpot?: boolean;
      photoKey: PhotoKey;
      customImageUrl?: string;
    }): Promise<{ ok: boolean; error?: string }> => {
      try {
        const res = await authorizedFetch('/api/activities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });
        const data = await res.json();
        if (!res.ok) {
          return { ok: false, error: data.error || 'Eroare la validarea activității.' };
        }

        const nowIso = new Date().toISOString();
        const newId = data.validatedActivity?.id || `act-${Date.now()}`;
        const created: ActivityItem = {
          id: newId,
          title: data.validatedActivity.title,
          category: data.validatedActivity.category,
          description: data.validatedActivity.description,
          dateLabel: input.dateLabel,
          isoDate: data.validatedActivity.isoDate,
          time: data.validatedActivity.time,
          city: data.validatedActivity.city,
          location: data.validatedActivity.location,
          organizerId: user.id,
          organizerName: `${user.name} (Tu)`,
          organizerPhotoKey: user.photoKey,
          organizerVerified: user.verificationStatus === 'verified',
          maxParticipants: data.validatedActivity.maxParticipants,
          participants: [
            {
              id: user.id,
              name: user.name,
              photoKey: user.photoKey,
              customPhotoUrl: user.customPhotoUrl,
              isVerified: user.verificationStatus === 'verified',
            },
          ],
          priceLei: data.validatedActivity.priceLei,
          requiresApproval: data.validatedActivity.requiresApproval,
          privacyShowParticipants: true,
          autoReleaseWaitlistSpot: input.autoReleaseWaitlistSpot ?? true,
          rules: [
            'Respect reciproc și punctualitate.',
            'Anunță din timp dacă intervin schimbări.',
          ],
          photoKey: input.photoKey,
          customImageUrl: input.customImageUrl,
        };

        setActivities((prev) => [created, ...prev]);
        setPlans((prev) => [
          {
            id: `plan-org-${newId}`,
            type: 'organized',
            activityId: newId,
            title: created.title,
            subtitle: `Organizat de tine · 1/${created.maxParticipants} participanți`,
            dateLabel: created.dateLabel,
            isoDate: created.isoDate,
            time: created.time,
            city: created.city,
            location: created.location,
            status: 'upcoming',
            lifecycleStatus: 'CONFIRMED',
            photoKey: created.photoKey,
            organizerId: user.id,
            autoReleaseWaitlistSpot: created.autoReleaseWaitlistSpot,
            confirmations: [
              {
                userId: user.id,
                userName: user.name,
                photoKey: user.photoKey,
                isVerified: user.verificationStatus === 'verified',
                confirmed: true,
                reconfirmed: true,
                confirmedAt: nowIso,
              },
            ],
            lastUpdatedAt: nowIso,
          },
          ...prev,
        ]);

        showToast('Activitate publicată în feed (Mod demonstrativ)!', 'success');
        setActiveTab('activities');
        setScreen('main');
        return { ok: true };
      } catch {
        return { ok: false, error: 'Nu am putut comunica cu serverul de validare.' };
      }
    },
    [showToast, user.customPhotoUrl, user.id, user.name, user.photoKey, user.verificationStatus]
  );

  const updateActivity = useCallback(
    (activityId: string, patch: Partial<ActivityItem>) => {
      const nowIso = new Date().toISOString();
      setActivities((prev) =>
        prev.map((a) => (a.id === activityId ? { ...a, ...patch } : a))
      );
      const scheduleChanged = Boolean(patch.location || patch.time || patch.isoDate);
      setPlans((prev) =>
        prev.map((p) =>
          p.activityId === activityId
            ? {
                ...p,
                title: patch.title ?? p.title,
                location: patch.location ?? p.location,
                time: patch.time ?? p.time,
                lifecycleStatus: scheduleChanged ? 'RECONFIRMATION_REQUIRED' : p.lifecycleStatus,
                confirmations: scheduleChanged
                  ? p.confirmations.map((c) => ({ ...c, reconfirmed: c.userId === user.id }))
                  : p.confirmations,
                lastUpdatedAt: nowIso,
              }
            : p
        )
      );
      showToast(
        scheduleChanged
          ? 'Activitate actualizată. Participanții vor primi solicitare de reconfirmare.'
          : 'Activitatea a fost actualizată.',
        'success'
      );
    },
    [showToast, user.id]
  );

  const cancelPlanSafe = useCallback(
    async (
      planId: string,
      options?: { safetyReason?: boolean; reasonText?: string }
    ): Promise<boolean> => {
      try {
        const res = await authorizedFetch('/api/plans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'cancel',
            planId,
            userName: user.name,
            safetyReason: Boolean(options?.safetyReason),
            reasonText: options?.reasonText,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          showToast(data.error || 'Nu am putut anula planul.', 'error');
          return false;
        }
        if (data.plan) {
          setPlans((prev) => prev.map((p) => (p.id === planId ? data.plan : p)));
        }
        if (Array.isArray(data.events)) {
          setPlanStatusEvents((prev) => [
            ...prev.filter((e) => e.planId !== planId),
            ...data.events,
          ]);
        }
        if (Array.isArray(data.notifications)) {
          setNotifications(data.notifications);
        }
        await refreshUserReliability();
        showToast(
          options?.safetyReason
            ? 'Plan anulat în siguranță. Motivul rămâne confidențial și nu afectează fiabilitatea.'
            : 'Planul a fost anulat.'
        );
        return true;
      } catch {
        showToast('Eroare de rețea la anularea planului.', 'error');
        return false;
      }
    },
    [refreshUserReliability, showToast, user.name]
  );

  const cancelPlan = useCallback(
    (planId: string) => {
      void cancelPlanSafe(planId);
    },
    [cancelPlanSafe]
  );

  const confirmOrReconfirmPlan = useCallback(
    async (planId: string, mode: 'confirm' | 'reconfirm' = 'confirm'): Promise<boolean> => {
      try {
        const res = await authorizedFetch('/api/plans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: mode,
            planId,
            userName: user.name,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          showToast(data.error || 'Confirmarea nu a putut fi salvată.', 'error');
          return false;
        }
        if (data.plan) {
          setPlans((prev) => prev.map((p) => (p.id === planId ? data.plan : p)));
        }
        if (Array.isArray(data.events)) {
          setPlanStatusEvents((prev) => [
            ...prev.filter((e) => e.planId !== planId),
            ...data.events,
          ]);
        }
        if (Array.isArray(data.notifications)) {
          setNotifications(data.notifications);
        }
        showToast(
          data.plan?.lifecycleStatus === 'CONFIRMED'
            ? 'Plan confirmat reciproc!'
            : 'Confirmarea ta a fost înregistrată.',
          'success'
        );
        return true;
      } catch {
        showToast('Eroare de rețea la confirmare.', 'error');
        return false;
      }
    },
    [showToast, user.name]
  );

  const proposeReschedule = useCallback(
    async (
      planId: string,
      kind: PlanChangeProposal['kind'],
      slots: PlanProposedSlot[],
      note?: string
    ): Promise<boolean> => {
      try {
        const res = await authorizedFetch('/api/plans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'propose_changes',
            planId,
            userName: user.name,
            kind,
            slots,
            note,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          showToast(data.error || 'Nu am putut trimite propunerea.', 'error');
          return false;
        }
        if (data.plan) {
          setPlans((prev) => prev.map((p) => (p.id === planId ? data.plan : p)));
        }
        if (data.proposal) {
          setPlanProposals((prev) => [data.proposal, ...prev]);
        }
        if (Array.isArray(data.events)) {
          setPlanStatusEvents((prev) => [
            ...prev.filter((e) => e.planId !== planId),
            ...data.events,
          ]);
        }
        if (Array.isArray(data.notifications)) {
          setNotifications(data.notifications);
        }
        showToast(
          'Alternative trimise! Planul nu se modifică unilateral până la acceptul celuilalt participant.',
          'success'
        );
        return true;
      } catch {
        showToast('Eroare de rețea la trimiterea alternativelor.', 'error');
        return false;
      }
    },
    [showToast, user.name]
  );

  const respondRescheduleProposal = useCallback(
    async (
      proposalId: string,
      decision: 'ACCEPT' | 'REJECT',
      selectedSlotId?: string
    ): Promise<boolean> => {
      try {
        const res = await authorizedFetch('/api/plans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'respond_proposal',
            proposalId,
            userName: user.name,
            decision,
            selectedSlotId,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          showToast(data.error || 'Nu am putut procesa răspunsul.', 'error');
          return false;
        }
        if (data.plan) {
          setPlans((prev) =>
            prev.map((p) => (p.id === data.plan.id ? data.plan : p))
          );
        }
        if (data.proposal) {
          setPlanProposals((prev) =>
            prev.map((pr) => (pr.id === proposalId ? data.proposal : pr))
          );
        }
        if (Array.isArray(data.events) && data.plan) {
          setPlanStatusEvents((prev) => [
            ...prev.filter((e) => e.planId !== data.plan.id),
            ...data.events,
          ]);
        }
        if (Array.isArray(data.notifications)) {
          setNotifications(data.notifications);
        }
        showToast(
          decision === 'ACCEPT'
            ? 'Noua variantă a fost confirmată reciproc!'
            : 'Propunerea a fost refuzată.',
          decision === 'ACCEPT' ? 'success' : 'default'
        );
        return true;
      } catch {
        showToast('Eroare de rețea la răspunsul pentru reprogramare.', 'error');
        return false;
      }
    },
    [showToast, user.name]
  );

  const evaluateServerReminders = useCallback(async () => {
    try {
      const res = await authorizedFetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'evaluate_reminders' }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.plans)) setPlans(data.plans);
      if (Array.isArray(data.notifications)) setNotifications(data.notifications);
      showToast(
        `Evaluare server finalizată (Mod demonstrativ): ${data.triggeredNotifications ?? 0} notificări noi, ${data.autoReleasedCount ?? 0} locuri eliberate.`,
        'success'
      );
    } catch {
      showToast('Nu am putut rula evaluarea reconfirmărilor.', 'error');
    }
  }, [showToast]);

  const proposeMeetup = useCallback(
    (
      partner: { id: string; name: string; photoKey: PhotoKey; city: RomanianCity },
      details: { title: string; dateLabel: string; time: string; location: string }
    ) => {
      const nowIso = new Date().toISOString();
      const newPlan: PlanItem = {
        id: `plan-meetup-${Date.now()}`,
        type: 'meetup',
        title: details.title,
        subtitle: `Întâlnire propusă cu ${partner.name} · Așteaptă confirmarea ambilor`,
        dateLabel: details.dateLabel,
        time: details.time,
        city: partner.city,
        location: details.location,
        status: 'pending',
        lifecycleStatus: 'AWAITING_CONFIRMATION',
        photoKey: partner.photoKey,
        partnerId: partner.id,
        partnerName: partner.name,
        confirmations: [
          {
            userId: user.id,
            userName: user.name,
            photoKey: user.photoKey,
            confirmed: true,
            reconfirmed: false,
            confirmedAt: nowIso,
          },
          {
            userId: partner.id,
            userName: partner.name,
            photoKey: partner.photoKey,
            confirmed: false,
            reconfirmed: false,
          },
        ],
        autoReleaseWaitlistSpot: false,
        lastUpdatedAt: nowIso,
      };
      setPlans((prev) => [newPlan, ...prev]);
      if (auth.currentUser) {
        void authorizedFetch('/api/plans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create_plan',
            type: 'meetup',
            title: details.title,
            dateLabel: details.dateLabel,
            time: details.time,
            city: partner.city,
            location: details.location,
            photoKey: partner.photoKey,
            creatorName: user.name,
            creatorPhotoKey: user.photoKey,
            partnerId: partner.id,
            partnerName: partner.name,
            partnerPhotoKey: partner.photoKey,
          }),
        });
      }
      showToast(`Propunerea de întâlnire cu ${partner.name} a fost adăugată în Planuri.`, 'success');
    },
    [showToast, user.id, user.name, user.photoKey]
  );

  const checkInPlan = useCallback(
    (planId: string) => {
      setPlans((prev) =>
        prev.map((p) => (p.id === planId ? { ...p, checkedIn: true } : p))
      );
      showToast('Check-in de siguranță confirmat pentru acest plan.', 'success');
    },
    [showToast]
  );

  const sharePlanWithContact = useCallback(
    (planId: string, contactName: string) => {
      setPlans((prev) =>
        prev.map((p) =>
          p.id === planId ? { ...p, sharedWithTrustedContact: contactName } : p
        )
      );
      showToast(`Detaliile planului au fost pregătite pentru ${contactName}.`, 'success');
    },
    [showToast]
  );

  const submitDispute = useCallback(
    async (recordId: string, reason: string): Promise<boolean> => {
      try {
        const res = await authorizedFetch('/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'dispute_record',
            recordId,
            userName: user.name,
            reason,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          showToast(data.error || 'Nu am putut înregistra contestația.', 'error');
          return false;
        }
        await refreshUserReliability();
        showToast(
          'Contestația a fost înregistrată. Înregistrarea este exclusă din scor până la analiza moderatorului.',
          'success'
        );
        return true;
      } catch {
        showToast('Eroare de rețea la trimiterea contestației.', 'error');
        return false;
      }
    },
    [refreshUserReliability, showToast, user.name]
  );

  const openConversation = useCallback((conversationId: string) => {
    setActiveConversationId(conversationId);
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c))
    );
    setScreen('conversation');
  }, []);

  const openConversationWithPartner = useCallback(
    (partner: {
      id: string;
      name: string;
      age: number;
      city: RomanianCity;
      photoKey: PhotoKey;
    }) => {
      const existing = conversations.find((c) => c.partnerId === partner.id);
      if (existing) {
        openConversation(existing.id);
        return;
      }

      const matchedProfile = allProfiles.find((p) => p.id === partner.id);
      const newConv: ConversationItem = {
        id: `conv-${partner.id}`,
        matchId: `match-${partner.id}`,
        partnerId: partner.id,
        partnerName: partner.name,
        partnerAge: partner.age,
        partnerCity: partner.city,
        partnerPhotoKey: partner.photoKey,
        partnerVerified: matchedProfile?.isVerified,
        lastMessage: 'Începe conversația',
        lastTime: 'Acum',
        unreadCount: 0,
        messages: [],
      };
      setConversations((prev) => [newConv, ...prev]);
      setMatches((prev) =>
        prev.map((m) => (m.partnerId === partner.id ? { ...m, hasConversation: true } : m))
      );
      setActiveConversationId(newConv.id);
      setScreen('conversation');
    },
    [allProfiles, conversations, openConversation]
  );

  const sendMessage = useCallback((conversationId: string, text: string) => {
    const clean = text.trim();
    if (!clean) return;
    const now = new Date();
    const timestamp = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              lastMessage: clean,
              lastTime: timestamp,
              messages: [
                ...c.messages,
                {
                  id: `msg-${Date.now()}`,
                  senderId: 'me',
                  text: clean,
                  timestamp,
                },
              ],
            }
          : c
      )
    );
  }, []);

  const unreadTotal = useMemo(
    () => conversations.reduce((sum, c) => sum + c.unreadCount, 0),
    [conversations]
  );

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const addTrustedContact = useCallback(
    (contact: Omit<TrustedContact, 'id'>) => {
      setTrustedContacts((prev) => [
        ...prev,
        { id: `tc-${Date.now()}`, ...contact },
      ]);
      showToast('Contact de încredere adăugat.', 'success');
    },
    [showToast]
  );

  const removeTrustedContact = useCallback(
    (id: string) => {
      setTrustedContacts((prev) => prev.filter((c) => c.id !== id));
      showToast('Contact eliminat.');
    },
    [showToast]
  );

  const openReportModal = useCallback((target: ReportModalState) => {
    setReportModal(target);
  }, []);

  const closeReportModal = useCallback(() => {
    setReportModal(null);
  }, []);

  const submitReport = useCallback(
    async (reason: string, details: string): Promise<boolean> => {
      if (!reportModal) return false;
      try {
        const res = await authorizedFetch('/api/moderation/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetType: reportModal.targetType,
            targetId: reportModal.targetId,
            targetTitle: reportModal.targetTitle,
            reason,
            details,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          showToast(data.error || 'Nu am putut trimite raportarea.', 'error');
          return false;
        }
        setReports((prev) => [data.report, ...prev]);
        setReportModal(null);
        showToast('Raportarea a fost înregistrată pentru analiză.', 'success');
        return true;
      } catch {
        showToast('Eroare de rețea la trimiterea raportării.', 'error');
        return false;
      }
    },
    [reportModal, showToast]
  );

  const value: HaiContextValue = {
    theme,
    toggleTheme,
    screen,
    setScreen,
    activeTab,
    navigateTab,
    profileSubView,
    setProfileSubView,
    openPlans,
    isAuthenticated,
    isServerAdmin,
    authReady,
    authLoading,
    authUid,
    authMode,
    setAuthMode,
    signInWithGoogle,
    logout,
    deleteAccount,
    startOnboarding,
    completeOnboarding,
    skipOnboarding,
    verificationModalOpen,
    openVerificationModal: () => setVerificationModalOpen(true),
    closeVerificationModal: () => setVerificationModalOpen(false),
    submitVerification,
    applyVerificationDecision,
    user,
    updateUserProfile,
    updateDiscoveryPrefs,
    updateReconfirmationSettings,
    selectedCity,
    setSelectedCity,
    datingQueue,
    allProfiles,
    likedIds,
    passedIds,
    blockedIds,
    activeMatchModal,
    dismissMatchModal: () => setActiveMatchModal(null),
    likeProfile,
    passProfile,
    resetDiscoveryDeck,
    blockUser,
    unblockUser,
    activities,
    savedActivityIds,
    selectedActivityId,
    openActivityDetail,
    toggleSaveActivity,
    joinOrLeaveActivity,
    joinWaitlistOrActivity,
    waitlistEntries,
    waitlistOffers,
    respondWaitlistOffer,
    submitGroupCheckIn,
    createActivity,
    updateActivity,
    plans,
    selectedPlanId,
    openPlanDetail,
    planProposals,
    planStatusEvents,
    cancelPlan,
    cancelPlanSafe,
    confirmOrReconfirmPlan,
    proposeReschedule,
    respondRescheduleProposal,
    evaluateServerReminders,
    proposeMeetup,
    checkInPlan,
    sharePlanWithContact,
    userReliability,
    publicReliabilities,
    refreshUserReliability,
    fetchPublicReliability,
    submitDispute,
    matches,
    conversations,
    activeConversationId,
    openConversation,
    openConversationWithPartner,
    sendMessage,
    unreadTotal,
    notifications,
    markAllNotificationsRead,
    trustedContacts,
    addTrustedContact,
    removeTrustedContact,
    reports,
    openReportModal,
    reportModal,
    closeReportModal,
    submitReport,
    toasts,
    showToast,
    confirmDialog,
    askConfirm: (d) => setConfirmDialog(d),
    closeConfirm: () => setConfirmDialog(null),
  };

  return <HaiContext.Provider value={value}>{children}</HaiContext.Provider>;
}

export function useHai() {
  const ctx = useContext(HaiContext);
  if (!ctx) {
    throw new Error('useHai must be used within HaiProvider');
  }
  return ctx;
}
