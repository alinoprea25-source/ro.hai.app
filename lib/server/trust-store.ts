import { DEMO_ACTIVITIES, DEMO_NOTIFICATIONS, DEMO_PLANS } from '@/lib/demo-data';
import {
  RELIABILITY_WINDOW_DAYS,
  calculateReliability,
  hoursUntilBucharestEvent,
  toPublicReliabilitySummary,
} from '@/lib/server/reliability';
import type {
  ActivityComment,
  ActivityItem,
  ActivityReview,
  AttendanceDispute,
  AttendanceRecord,
  ModerationActionLog,
  NotificationCategory,
  NotificationItem,
  PhotoKey,
  PlanChangeProposal,
  PlanConfirmation,
  PlanItem,
  PlanLifecycleStatus,
  PlanProposedSlot,
  PlanStatus,
  PlanStatusEvent,
  ReliabilityBreakdown,
  ReliabilitySummary,
  SafetyReport,
  TrustAnalyticsMetrics,
  WaitlistEntry,
  WaitlistOffer,
} from '@/types/hai';

export const WAITLIST_OFFER_WINDOW_MINUTES = 120;
export const LATE_CANCEL_CUTOFF_HOURS = 12;

export interface TrustStoreState {
  activities: ActivityItem[];
  plans: PlanItem[];
  planProposals: PlanChangeProposal[];
  planStatusEvents: PlanStatusEvent[];
  waitlistEntries: WaitlistEntry[];
  waitlistOffers: WaitlistOffer[];
  attendanceRecords: AttendanceRecord[];
  attendanceDisputes: AttendanceDispute[];
  comments: ActivityComment[];
  reviews: ActivityReview[];
  reports: SafetyReport[];
  moderationActions: ModerationActionLog[];
  notifications: NotificationItem[];
  notificationIdempotencyKeys: Set<string>;
  blockedUsersByViewer: Record<string, string[]>;
  analyticsCounters: {
    reconfirmationRequestsCount: number;
    reconfirmationResponsesCount: number;
    waitlistSpotsOpenedCount: number;
    waitlistReplacementsAcceptedCount: number;
    rescheduleProposalsCount: number;
    rescheduleSuccessCount: number;
  };
}

declare global {
  var __haiTrustStore: TrustStoreState | undefined;
  var __haiResourceLocks: Map<string, Promise<unknown>> | undefined;
}

function getLockMap(): Map<string, Promise<unknown>> {
  if (!globalThis.__haiResourceLocks) {
    globalThis.__haiResourceLocks = new Map();
  }
  return globalThis.__haiResourceLocks;
}

/**
 * Per-resource async mutex so waitlist capacity transitions, plan changes, and
 * attendance mutations are serialized atomically without overbooking or races.
 */
export async function withResourceLock<T>(
  resourceKey: string,
  fn: () => Promise<T> | T
): Promise<T> {
  const locks = getLockMap();
  const prev = locks.get(resourceKey) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  locks.set(resourceKey, prev.then(() => current));

  await prev;
  try {
    return await fn();
  } finally {
    release();
    if (locks.get(resourceKey) === current) {
      locks.delete(resourceKey);
    }
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function daysAgoIsoDate(daysAgo: number, now: Date = new Date()): string {
  const d = new Date(now.getTime() - daysAgo * 86_400_000);
  return d.toISOString().slice(0, 10);
}

function hoursFromNowIso(hours: number, now: Date = new Date()): string {
  return new Date(now.getTime() + hours * 3_600_000).toISOString();
}

function createSeedState(now: Date = new Date()): TrustStoreState {
  const activities = clone(DEMO_ACTIVITIES);
  const plans = clone(DEMO_PLANS);

  const planStatusEvents: PlanStatusEvent[] = [
    {
      id: 'evt-seed-1',
      planId: 'plan-1',
      fromStatus: 'CONFIRMED',
      toStatus: 'RECONFIRMATION_REQUIRED',
      actorId: 'system',
      actorName: 'HAI. Programare inteligentă',
      summary: 'Reconfirmare solicitată cu 24h înaintea meciului de padel.',
      createdAt: hoursFromNowIso(-4, now),
    },
    {
      id: 'evt-seed-2',
      planId: 'plan-2',
      fromStatus: 'AWAITING_CONFIRMATION',
      toStatus: 'CONFIRMED',
      actorId: 'profile-ioana',
      actorName: 'Ioana',
      summary: 'Data, ora și locația întâlnirii au fost confirmate reciproc.',
      createdAt: hoursFromNowIso(-12, now),
    },
    {
      id: 'evt-seed-3',
      planId: 'plan-5',
      fromStatus: 'PROPOSED',
      toStatus: 'AWAITING_CONFIRMATION',
      actorId: 'profile-maria',
      actorName: 'Maria',
      summary: 'Maria a propus ziua, ora și cinematograful. Așteaptă confirmarea ta.',
      createdAt: hoursFromNowIso(-3, now),
    },
    {
      id: 'evt-seed-4',
      planId: 'plan-6',
      fromStatus: 'PROPOSED',
      toStatus: 'AWAITING_CONFIRMATION',
      actorId: 'system',
      actorName: 'Listă de așteptare',
      summary: 'S-a eliberat un loc la Cafea și conversație; așteaptă acceptarea ta.',
      createdAt: hoursFromNowIso(-1, now),
    },
    {
      id: 'evt-seed-5',
      planId: 'plan-7',
      fromStatus: 'CONFIRMED',
      toStatus: 'COMPLETED',
      actorId: 'demo-user-vlad',
      actorName: 'Vlad',
      summary: 'Prezență verificată prin codul activității.',
      createdAt: hoursFromNowIso(-180, now),
    },
    {
      id: 'evt-seed-6',
      planId: 'plan-8',
      fromStatus: 'CONFIRMED',
      toStatus: 'CANCELLED',
      actorId: 'profile-razvan',
      actorName: 'Organizator',
      summary: 'Activitatea a fost anulată de organizator; alternative disponibile.',
      createdAt: hoursFromNowIso(-240, now),
    },
  ];

  const waitlistEntries: WaitlistEntry[] = [
    {
      id: 'wl-cafea-vlad',
      activityId: 'act-cafea-conversatie',
      userId: 'demo-user-vlad',
      userName: 'Vlad',
      photoKey: 'andrei',
      joinedAt: hoursFromNowIso(-5, now),
      position: 1,
      status: 'OFFERED',
    },
    {
      id: 'wl-cafea-tudor',
      activityId: 'act-cafea-conversatie',
      userId: 'profile-tudor',
      userName: 'Tudor',
      photoKey: 'razvan',
      joinedAt: hoursFromNowIso(-4, now),
      position: 2,
      status: 'WAITING',
    },
  ];

  const waitlistOffers: WaitlistOffer[] = [
    {
      id: 'offer-cafea-vlad',
      activityId: 'act-cafea-conversatie',
      userId: 'demo-user-vlad',
      userName: 'Vlad',
      offeredAt: hoursFromNowIso(-0.5, now),
      expiresAt: hoursFromNowIso(2, now),
      status: 'PENDING',
    },
  ];

  const attendanceRecords: AttendanceRecord[] = [
    // Vlad: 5 VERIFIED_ATTENDANCE + 1 LATE_CANCELLATION = 5.5/6 => 92/100 + 2 excluded records
    {
      id: 'att-vlad-1',
      userId: 'demo-user-vlad',
      activityId: 'act-tur-cetatuie',
      activityTitle: 'Tur foto în Cetățuie',
      eventDateIso: daysAgoIsoDate(8, now),
      eventTime: '16:30',
      status: 'VERIFIED_ATTENDANCE',
      verifiedBy: 'event_code',
      checkInCodeUsed: 'CET815',
      recordedAt: hoursFromNowIso(-190, now),
      disputeStatus: 'NONE',
    },
    {
      id: 'att-vlad-2',
      userId: 'demo-user-vlad',
      activityId: 'act-padel-prev',
      activityTitle: 'Padel amical Gheorgheni',
      eventDateIso: daysAgoIsoDate(31, now),
      eventTime: '18:00',
      status: 'VERIFIED_ATTENDANCE',
      verifiedBy: 'organizer_confirmation',
      recordedAt: hoursFromNowIso(-740, now),
      disputeStatus: 'NONE',
    },
    {
      id: 'att-vlad-3',
      userId: 'demo-user-vlad',
      activityId: 'act-hike-oct',
      activityTitle: 'Drumeție Feleacu',
      eventDateIso: daysAgoIsoDate(49, now),
      eventTime: '09:30',
      status: 'VERIFIED_ATTENDANCE',
      verifiedBy: 'event_code',
      checkInCodeUsed: 'FEL104',
      recordedAt: hoursFromNowIso(-1170, now),
      disputeStatus: 'NONE',
    },
    {
      id: 'att-vlad-4',
      userId: 'demo-user-vlad',
      activityId: 'act-board-sep',
      activityTitle: 'Boardgames în Mărăști',
      eventDateIso: daysAgoIsoDate(65, now),
      eventTime: '19:00',
      status: 'VERIFIED_ATTENDANCE',
      verifiedBy: 'organizer_confirmation',
      recordedAt: hoursFromNowIso(-1550, now),
      disputeStatus: 'NONE',
    },
    {
      id: 'att-vlad-5',
      userId: 'demo-user-vlad',
      activityId: 'act-coffee-aug',
      activityTitle: 'Cafea de duminică Centru',
      eventDateIso: daysAgoIsoDate(85, now),
      eventTime: '11:00',
      status: 'VERIFIED_ATTENDANCE',
      verifiedBy: 'event_code',
      checkInCodeUsed: 'CAF229',
      recordedAt: hoursFromNowIso(-2030, now),
      disputeStatus: 'NONE',
    },
    {
      id: 'att-vlad-6',
      userId: 'demo-user-vlad',
      activityId: 'act-run-aug',
      activityTitle: 'Alergare pe Someș',
      eventDateIso: daysAgoIsoDate(102, now),
      eventTime: '18:30',
      status: 'LATE_CANCELLATION',
      verifiedBy: 'system_cancellation',
      recordedAt: hoursFromNowIso(-2440, now),
      disputeStatus: 'NONE',
    },
    {
      id: 'att-vlad-7',
      userId: 'demo-user-vlad',
      activityId: 'act-cinema-jul',
      activityTitle: 'Cinema Victoria de grup',
      eventDateIso: daysAgoIsoDate(124, now),
      eventTime: '19:30',
      status: 'EARLY_CANCELLATION',
      verifiedBy: 'system_cancellation',
      recordedAt: hoursFromNowIso(-2970, now),
      disputeStatus: 'NONE',
    },
    {
      id: 'att-vlad-8',
      userId: 'demo-user-vlad',
      activityId: 'act-safe-sep',
      activityTitle: 'Ieșire socială de seară',
      eventDateIso: daysAgoIsoDate(81, now),
      eventTime: '20:00',
      status: 'SAFETY_CANCELLATION',
      verifiedBy: 'safety_override',
      recordedAt: hoursFromNowIso(-1940, now),
      disputeStatus: 'NONE',
    },

    // Ioana: 6 VERIFIED_ATTENDANCE -> 100/100
    ...Array.from({ length: 6 }, (_, i) => ({
      id: `att-ioana-${i + 1}`,
      userId: 'profile-ioana',
      activityId: i === 0 ? 'act-tur-cetatuie' : `act-ioana-hist-${i}`,
      activityTitle: i === 0 ? 'Tur foto în Cetățuie' : `Activitate de grup #${i + 1}`,
      eventDateIso: daysAgoIsoDate(8 + i * 18, now),
      eventTime: '17:00',
      status: 'VERIFIED_ATTENDANCE' as const,
      verifiedBy: 'event_code' as const,
      recordedAt: hoursFromNowIso(-(8 + i * 18) * 24, now),
      disputeStatus: 'NONE' as const,
    })),

    // Elena: 5 VERIFIED_ATTENDANCE + 1 LATE_CANCELLATION -> 92/100
    ...Array.from({ length: 6 }, (_, i) => ({
      id: `att-elena-${i + 1}`,
      userId: 'profile-elena',
      activityId: i === 0 ? 'act-tur-cetatuie' : `act-elena-hist-${i}`,
      activityTitle: i === 0 ? 'Tur foto în Cetățuie' : `Drumeție de grup #${i + 1}`,
      eventDateIso: daysAgoIsoDate(8 + i * 20, now),
      eventTime: '09:00',
      status: (i === 4 ? 'LATE_CANCELLATION' : 'VERIFIED_ATTENDANCE') as AttendanceRecord['status'],
      verifiedBy: (i === 4 ? 'system_cancellation' : 'event_code') as AttendanceRecord['verifiedBy'],
      recordedAt: hoursFromNowIso(-(8 + i * 20) * 24, now),
      disputeStatus: 'NONE' as const,
    })),

    // Razvan: 5 VERIFIED_ATTENDANCE + 1 LATE_CANCELLATION -> 92/100
    ...Array.from({ length: 6 }, (_, i) => ({
      id: `att-razvan-${i + 1}`,
      userId: 'profile-razvan',
      activityId: i === 0 ? 'act-tur-cetatuie' : `act-razvan-hist-${i}`,
      activityTitle: i === 0 ? 'Tur foto în Cetățuie' : `Sport de grup #${i + 1}`,
      eventDateIso: daysAgoIsoDate(8 + i * 21, now),
      eventTime: '19:00',
      status: (i === 3 ? 'LATE_CANCELLATION' : 'VERIFIED_ATTENDANCE') as AttendanceRecord['status'],
      verifiedBy: (i === 3 ? 'system_cancellation' : 'organizer_confirmation') as AttendanceRecord['verifiedBy'],
      recordedAt: hoursFromNowIso(-(8 + i * 21) * 24, now),
      disputeStatus: 'NONE' as const,
    })),

    // Maria: 2 VERIFIED_ATTENDANCE (< 5) -> Utilizator nou
    {
      id: 'att-maria-1',
      userId: 'profile-maria',
      activityId: 'act-cinema-jul',
      activityTitle: 'Cinema independent',
      eventDateIso: daysAgoIsoDate(14, now),
      eventTime: '19:00',
      status: 'VERIFIED_ATTENDANCE',
      verifiedBy: 'organizer_confirmation',
      recordedAt: hoursFromNowIso(-330, now),
      disputeStatus: 'NONE',
    },
    {
      id: 'att-maria-2',
      userId: 'profile-maria',
      activityId: 'act-galerie-prev',
      activityTitle: 'Tur galerie artă',
      eventDateIso: daysAgoIsoDate(34, now),
      eventTime: '18:00',
      status: 'VERIFIED_ATTENDANCE',
      verifiedBy: 'organizer_confirmation',
      recordedAt: hoursFromNowIso(-810, now),
      disputeStatus: 'NONE',
    },

    // Tudor: 4 VERIFIED_ATTENDANCE + 1 VERIFIED_NO_SHOW -> 80/100 (disputed sample)
    ...Array.from({ length: 4 }, (_, i) => ({
      id: `att-tudor-${i + 1}`,
      userId: 'profile-tudor',
      activityId: `act-tudor-hist-${i}`,
      activityTitle: `Activitate Cluj #${i + 1}`,
      eventDateIso: daysAgoIsoDate(15 + i * 19, now),
      eventTime: '18:30',
      status: 'VERIFIED_ATTENDANCE' as const,
      verifiedBy: 'event_code' as const,
      recordedAt: hoursFromNowIso(-(15 + i * 19) * 24, now),
      disputeStatus: 'NONE' as const,
    })),
    {
      id: 'att-tudor-5',
      userId: 'profile-tudor',
      activityId: 'act-tudor-noshow',
      activityTitle: 'Alergare pe Someș',
      eventDateIso: daysAgoIsoDate(12, now),
      eventTime: '18:30',
      status: 'VERIFIED_NO_SHOW',
      verifiedBy: 'organizer_confirmation',
      recordedAt: hoursFromNowIso(-280, now),
      disputeNote: 'A plouat torențial și codul de check-in nu s-a afișat la timp.',
      disputeStatus: 'OPEN',
    },
  ];

  const attendanceDisputes: AttendanceDispute[] = [
    {
      id: 'disp-seed-1',
      recordId: 'att-tudor-5',
      userId: 'profile-tudor',
      userName: 'Tudor',
      activityId: 'act-tudor-noshow',
      activityTitle: 'Alergare pe Someș',
      reason: 'Am fost la punctul de întâlnire, însă grupul s-a mutat din cauza ploii torențiale și nu am primit notificarea.',
      status: 'OPEN',
      createdAt: hoursFromNowIso(-48, now),
    },
  ];

  const comments: ActivityComment[] = [
    {
      id: 'cmt-padel-1',
      activityId: 'act-padel-cluj',
      authorId: 'profile-razvan',
      authorName: 'Răzvan',
      authorPhotoKey: 'razvan',
      authorVerified: true,
      authorRole: 'Participant',
      content: 'Salut! Mai e nevoie de mingi de rezervă sau aduc eu un tub nou?',
      createdAt: hoursFromNowIso(-18, now),
    },
    {
      id: 'cmt-padel-2',
      activityId: 'act-padel-cluj',
      parentId: 'cmt-padel-1',
      authorId: 'profile-ioana',
      authorName: 'Ioana M.',
      authorPhotoKey: 'ioana',
      authorVerified: true,
      authorRole: 'Organizator',
      content: 'Am luat deja două tuburi noi și două rachete de rezervă. Ne vedem cu 10 minute înainte!',
      createdAt: hoursFromNowIso(-16, now),
    },
    {
      id: 'cmt-padel-3',
      activityId: 'act-padel-cluj',
      authorId: 'profile-tudor',
      authorName: 'Tudor',
      authorPhotoKey: 'razvan',
      authorRole: 'Membru',
      content: 'Există vestiare cu duș disponibile la terenurile din Gheorgheni?',
      createdAt: hoursFromNowIso(-7, now),
    },
    {
      id: 'cmt-hike-1',
      activityId: 'act-drumetie-weekend',
      authorId: 'profile-bogdan',
      authorName: 'Bogdan',
      authorPhotoKey: 'andrei',
      authorVerified: true,
      authorRole: 'Participant',
      content: 'Traseul prin Chei este accesibil și fără bețe de trekking în perioada asta?',
      createdAt: hoursFromNowIso(-10, now),
    },
    {
      id: 'cmt-hike-2',
      activityId: 'act-drumetie-weekend',
      parentId: 'cmt-hike-1',
      authorId: 'profile-elena',
      authorName: 'Elena D.',
      authorPhotoKey: 'elena',
      authorVerified: true,
      authorRole: 'Organizator',
      content: 'Da, poteca e uscată, dar bocancii cu aderență bună sunt recomandați pe urcarea spre platou.',
      createdAt: hoursFromNowIso(-9, now),
    },
  ];

  const reviews: ActivityReview[] = [
    {
      id: 'rev-cet-elena',
      activityId: 'act-tur-cetatuie',
      activityTitle: 'Tur foto în Cetățuie',
      organizerId: 'profile-ioana',
      authorId: 'profile-elena',
      authorName: 'Elena',
      authorPhotoKey: 'elena',
      authorVerified: true,
      rating: 5,
      categories: { organization: 5, accuracy: 5, overall: 5 },
      feedback: 'Ioana a ales un punct superb pentru apus și tot grupul a fost punctual. Atmosferă relaxată.',
      createdAt: hoursFromNowIso(-160, now),
    },
    {
      id: 'rev-cet-razvan',
      activityId: 'act-tur-cetatuie',
      activityTitle: 'Tur foto în Cetățuie',
      organizerId: 'profile-ioana',
      authorId: 'profile-razvan',
      authorName: 'Răzvan',
      authorPhotoKey: 'razvan',
      authorVerified: true,
      rating: 5,
      categories: { organization: 5, accuracy: 4, overall: 5 },
      feedback: 'Organizare clară, am primit mesajul cu punctul exact cu o zi înainte.',
      createdAt: hoursFromNowIso(-155, now),
    },
    {
      id: 'rev-vlad-org-1',
      activityId: 'act-padel-prev',
      activityTitle: 'Padel amical Gheorgheni',
      organizerId: 'demo-user-vlad',
      authorId: 'profile-ioana',
      authorName: 'Ioana',
      authorPhotoKey: 'ioana',
      authorVerified: true,
      rating: 5,
      categories: { organization: 5, accuracy: 5, overall: 5 },
      feedback: 'Teren rezervat din timp, comunicare rapidă și echipe echilibrate.',
      createdAt: hoursFromNowIso(-700, now),
    },
  ];

  const reports: SafetyReport[] = [
    {
      id: 'rep-seed-1',
      targetType: 'activity',
      targetId: 'act-sample-archived',
      targetTitle: 'Eveniment promoțional neautorizat',
      reason: 'Spam sau promovare comercială',
      details: 'Anunț comercial mascat ca activitate socială în mod demonstrativ.',
      createdAt: '2026-11-22T16:40:00.000Z',
      status: 'revizuit',
      appealStatus: 'NONE',
    },
  ];

  return {
    activities,
    plans,
    planProposals: [],
    planStatusEvents,
    waitlistEntries,
    waitlistOffers,
    attendanceRecords,
    attendanceDisputes,
    comments,
    reviews,
    reports,
    moderationActions: [
      {
        id: 'mod-seed-1',
        moderatorId: 'moderator-preview',
        targetType: 'activity',
        targetId: 'act-sample-archived',
        action: 'REMOVED',
        reason: 'Spam comercial neautorizat.',
        createdAt: '2026-11-22T16:45:00.000Z',
      },
    ],
    notifications: clone(DEMO_NOTIFICATIONS),
    notificationIdempotencyKeys: new Set(),
    blockedUsersByViewer: {},
    analyticsCounters: {
      reconfirmationRequestsCount: 4,
      reconfirmationResponsesCount: 3,
      waitlistSpotsOpenedCount: 2,
      waitlistReplacementsAcceptedCount: 1,
      rescheduleProposalsCount: 1,
      rescheduleSuccessCount: 1,
    },
  };
}

export function getTrustStore(): TrustStoreState {
  if (!globalThis.__haiTrustStore) {
    globalThis.__haiTrustStore = createSeedState();
  }
  return globalThis.__haiTrustStore;
}

export function resetTrustStoreForTests(now?: Date): TrustStoreState {
  globalThis.__haiTrustStore = createSeedState(now);
  return globalThis.__haiTrustStore;
}

function mapLifecycleToTabStatus(status: PlanLifecycleStatus): PlanStatus {
  if (status === 'CANCELLED') return 'cancelled';
  if (status === 'COMPLETED') return 'completed';
  if (
    status === 'PROPOSED' ||
    status === 'AWAITING_CONFIRMATION' ||
    status === 'CHANGE_PROPOSED'
  ) {
    return 'pending';
  }
  return 'upcoming';
}

export function emitNotificationOnce(
  store: TrustStoreState,
  input: {
    idempotencyKey: string;
    title: string;
    body: string;
    type: NotificationCategory;
    planId?: string;
    activityId?: string;
    userId?: string;
  }
): NotificationItem | null {
  if (store.notificationIdempotencyKeys.has(input.idempotencyKey)) {
    return null;
  }
  store.notificationIdempotencyKeys.add(input.idempotencyKey);
  const item: NotificationItem = {
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: input.title,
    body: input.body,
    time: 'Chiar acum',
    read: false,
    type: input.type,
    planId: input.planId,
    activityId: input.activityId,
    userId: input.userId,
    idempotencyKey: input.idempotencyKey,
  };
  store.notifications.unshift(item);
  return item;
}

function appendPlanEvent(
  store: TrustStoreState,
  input: {
    planId: string;
    fromStatus?: PlanLifecycleStatus;
    toStatus: PlanLifecycleStatus;
    actorId: string;
    actorName: string;
    summary: string;
    now?: Date;
  }
) {
  store.planStatusEvents.unshift({
    id: `pevt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    planId: input.planId,
    fromStatus: input.fromStatus,
    toStatus: input.toStatus,
    actorId: input.actorId,
    actorName: input.actorName,
    summary: input.summary,
    createdAt: (input.now ?? new Date()).toISOString(),
  });
}

export function isPlanParticipant(plan: PlanItem, userId: string): boolean {
  if (!userId) return false;
  if (plan.organizerId === userId) return true;
  if (plan.partnerId === userId) return true;
  return plan.confirmations.some((c) => c.userId === userId);
}

// --- PLAN LIFECYCLE OPERATIONS ---

export async function createPlanRecord(input: {
  type: PlanItem['type'];
  activityId?: string;
  title: string;
  dateLabel: string;
  isoDate?: string;
  time: string;
  city: PlanItem['city'];
  location: string;
  photoKey: PhotoKey;
  creatorId: string;
  creatorName: string;
  creatorPhotoKey: PhotoKey;
  partnerId?: string;
  partnerName?: string;
  partnerPhotoKey?: PhotoKey;
  autoConfirm?: boolean;
}): Promise<PlanItem> {
  const planId = `plan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  return withResourceLock(`plan:${planId}`, () => {
    const store = getTrustStore();
    const now = new Date().toISOString();

    const confirmations: PlanConfirmation[] = [
      {
        userId: input.creatorId,
        userName: input.creatorName,
        photoKey: input.creatorPhotoKey,
        confirmed: true,
        reconfirmed: false,
        confirmedAt: now,
      },
    ];
    if (input.partnerId && input.partnerName) {
      confirmations.push({
        userId: input.partnerId,
        userName: input.partnerName,
        photoKey: input.partnerPhotoKey ?? input.photoKey,
        confirmed: Boolean(input.autoConfirm),
        reconfirmed: false,
      });
    }

    const lifecycleStatus: PlanLifecycleStatus = input.autoConfirm
      ? 'CONFIRMED'
      : 'AWAITING_CONFIRMATION';

    const plan: PlanItem = {
      id: planId,
      type: input.type,
      activityId: input.activityId,
      title: input.title,
      subtitle:
        lifecycleStatus === 'CONFIRMED'
          ? 'Confirmat reciproc'
          : input.partnerName
          ? `Propus pentru ${input.partnerName} · Așteaptă confirmarea ambilor`
          : 'Așteaptă confirmarea participanților',
      dateLabel: input.dateLabel,
      isoDate: input.isoDate,
      time: input.time,
      city: input.city,
      location: input.location,
      status: mapLifecycleToTabStatus(lifecycleStatus),
      lifecycleStatus,
      photoKey: input.photoKey,
      partnerId: input.partnerId,
      partnerName: input.partnerName,
      organizerId: input.type === 'organized' ? input.creatorId : undefined,
      confirmations,
      autoReleaseWaitlistSpot: input.type !== 'meetup',
      reconfirmationPolicyRo:
        input.type === 'meetup'
          ? 'Pentru întâlnirile 1-la-1, confirmarea trebuie să fie reciprocă; nicio persoană nu este înlocuită automat.'
          : 'Confirmă data, ora și locația. Reconfirmarea se solicită cu ~24h înainte.',
      lastUpdatedAt: now,
    };

    store.plans.unshift(plan);
    appendPlanEvent(store, {
      planId: plan.id,
      fromStatus: 'PROPOSED',
      toStatus: lifecycleStatus,
      actorId: input.creatorId,
      actorName: input.creatorName,
      summary:
        lifecycleStatus === 'CONFIRMED'
          ? 'Plan creat și confirmat.'
          : 'Invitație trimisă — așteaptă acceptarea datei, orei și locației.',
    });

    emitNotificationOnce(store, {
      idempotencyKey: `plan_invite:${plan.id}`,
      title: 'Propunere nouă de plan',
      body: `${input.title} (${input.dateLabel}, ${input.time}) așteaptă confirmarea.`,
      type: 'plan_invite',
      planId: plan.id,
      activityId: input.activityId,
    });

    return clone(plan);
  });
}

export async function confirmPlanParticipant(input: {
  planId: string;
  userId: string;
  userName: string;
  mode?: 'confirm' | 'reconfirm';
}): Promise<{ ok: boolean; statusCode?: number; error?: string; plan?: PlanItem }> {
  return withResourceLock(`plan:${input.planId}`, () => {
    const store = getTrustStore();
    const plan = store.plans.find((p) => p.id === input.planId);
    if (!plan) return { ok: false, statusCode: 404, error: 'Planul nu a fost găsit.' };
    if (!isPlanParticipant(plan, input.userId)) {
      return {
        ok: false,
        statusCode: 403,
        error: 'Acces interzis. Nu ești participant la acest plan.',
      };
    }
    if (plan.lifecycleStatus === 'CANCELLED' || plan.lifecycleStatus === 'COMPLETED') {
      return { ok: false, statusCode: 400, error: 'Planul nu mai poate fi confirmat în această stare.' };
    }

    const now = new Date().toISOString();
    const prevStatus = plan.lifecycleStatus;
    const entry = plan.confirmations.find((c) => c.userId === input.userId);
    if (entry) {
      entry.confirmed = true;
      if (input.mode === 'reconfirm' || prevStatus === 'RECONFIRMATION_REQUIRED') {
        entry.reconfirmed = true;
      }
      entry.confirmedAt = now;
    } else {
      plan.confirmations.push({
        userId: input.userId,
        userName: input.userName,
        photoKey: plan.photoKey,
        confirmed: true,
        reconfirmed: input.mode === 'reconfirm' || prevStatus === 'RECONFIRMATION_REQUIRED',
        confirmedAt: now,
      });
    }

    const allConfirmed =
      plan.confirmations.length > 0 && plan.confirmations.every((c) => c.confirmed);
    const isReconfirmFlow =
      input.mode === 'reconfirm' || prevStatus === 'RECONFIRMATION_REQUIRED';
    const allReconfirmed =
      !isReconfirmFlow ||
      (plan.confirmations.length > 0 && plan.confirmations.every((c) => c.reconfirmed));

    if (allConfirmed && allReconfirmed) {
      plan.lifecycleStatus = 'CONFIRMED';
      plan.status = 'upcoming';
      plan.subtitle = 'Confirmat reciproc';
    } else if (allConfirmed && isReconfirmFlow) {
      plan.lifecycleStatus = 'RECONFIRMATION_REQUIRED';
      plan.status = 'upcoming';
      plan.subtitle = 'Reconfirmarea ta a fost salvată · Așteaptă și ceilalți participanți';
    } else {
      plan.lifecycleStatus = 'AWAITING_CONFIRMATION';
      plan.status = 'pending';
      plan.subtitle = 'Așteaptă confirmarea tuturor participanților';
    }

    plan.lastUpdatedAt = now;

    if (isReconfirmFlow) {
      store.analyticsCounters.reconfirmationResponsesCount += 1;
    }

    appendPlanEvent(store, {
      planId: plan.id,
      fromStatus: prevStatus,
      toStatus: plan.lifecycleStatus,
      actorId: input.userId,
      actorName: input.userName,
      summary:
        plan.lifecycleStatus === 'CONFIRMED'
          ? 'Toți participanții au confirmat data, ora și locația.'
          : `${input.userName} a confirmat participarea.`,
    });

    if (plan.lifecycleStatus === 'CONFIRMED') {
      emitNotificationOnce(store, {
        idempotencyKey: `plan_confirmed:${plan.id}:${now.slice(0, 16)}`,
        title: 'Plan confirmat',
        body: `„${plan.title}” este confirmat pentru ${plan.dateLabel}, ${plan.time}.`,
        type: 'plan_confirmed',
        planId: plan.id,
        activityId: plan.activityId,
      });
    } else {
      emitNotificationOnce(store, {
        idempotencyKey: `plan_accepted:${plan.id}:${input.userId}:${now.slice(0, 16)}`,
        title: 'Confirmare înregistrată',
        body: `${input.userName} a acceptat propunerea pentru „${plan.title}”.`,
        type: 'plan_accepted',
        planId: plan.id,
        activityId: plan.activityId,
      });
    }

    return { ok: true, plan: clone(plan) };
  });
}

export async function proposePlanChange(input: {
  planId: string;
  userId: string;
  userName: string;
  kind: PlanChangeProposal['kind'];
  slots: PlanProposedSlot[];
  note?: string;
}): Promise<{
  ok: boolean;
  statusCode?: number;
  error?: string;
  proposal?: PlanChangeProposal;
  plan?: PlanItem;
}> {
  return withResourceLock(`plan:${input.planId}`, () => {
    const store = getTrustStore();
    const plan = store.plans.find((p) => p.id === input.planId);
    if (!plan) return { ok: false, statusCode: 404, error: 'Planul nu a fost găsit.' };
    if (!isPlanParticipant(plan, input.userId)) {
      return {
        ok: false,
        statusCode: 403,
        error: 'Acces interzis. Doar participanții la plan pot propune modificări.',
      };
    }
    if (plan.lifecycleStatus === 'CANCELLED' || plan.lifecycleStatus === 'COMPLETED') {
      return {
        ok: false,
        statusCode: 400,
        error: 'Nu poți propune modificări pentru un plan anulat sau finalizat.',
      };
    }
    if (!input.slots || input.slots.length === 0 || input.slots.length > 3) {
      return {
        ok: false,
        statusCode: 400,
        error: 'Poți propune între 1 și 3 opțiuni alternative de dată/oră/locație.',
      };
    }

    const now = new Date().toISOString();
    const prevStatus = plan.lifecycleStatus;
    const proposal: PlanChangeProposal = {
      id: `prop-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      planId: plan.id,
      proposedByUserId: input.userId,
      proposedByName: input.userName,
      kind: input.kind,
      slots: input.slots,
      note: input.note,
      status: 'PENDING',
      createdAt: now,
    };

    store.planProposals.unshift(proposal);
    store.analyticsCounters.rescheduleProposalsCount += 1;

    // Crucial rule: changing a confirmed plan invalidates prior confirmations and cannot be unilateral!
    plan.lifecycleStatus = 'CHANGE_PROPOSED';
    plan.status = 'pending';
    plan.subtitle = `${input.userName} a propus ${input.slots.length} alternative · Așteaptă răspuns`;
    plan.confirmations = plan.confirmations.map((c) => ({
      ...c,
      confirmed: c.userId === input.userId,
      reconfirmed: false,
    }));
    plan.lastUpdatedAt = now;

    appendPlanEvent(store, {
      planId: plan.id,
      fromStatus: prevStatus,
      toStatus: 'CHANGE_PROPOSED',
      actorId: input.userId,
      actorName: input.userName,
      summary: `A propus reprogramarea (${input.slots.length} opțiuni). Confirmările anterioare au fost resetate până la acceptul reciproc.`,
    });

    emitNotificationOnce(store, {
      idempotencyKey: `plan_change:${proposal.id}`,
      title: 'Propunere de reprogramare',
      body: `${input.userName} a propus noi opțiuni pentru „${plan.title}”. Poți accepta sau refuza.`,
      type: 'plan_change_proposed',
      planId: plan.id,
      activityId: plan.activityId,
    });

    return { ok: true, proposal: clone(proposal), plan: clone(plan) };
  });
}

export async function respondToPlanProposal(input: {
  proposalId: string;
  userId: string;
  userName: string;
  decision: 'ACCEPT' | 'REJECT';
  selectedSlotId?: string;
}): Promise<{
  ok: boolean;
  statusCode?: number;
  error?: string;
  proposal?: PlanChangeProposal;
  plan?: PlanItem;
}> {
  const store = getTrustStore();
  const foundProp = store.planProposals.find((p) => p.id === input.proposalId);
  if (!foundProp) return { ok: false, statusCode: 404, error: 'Propunerea nu a fost găsită.' };

  return withResourceLock(`plan:${foundProp.planId}`, () => {
    const proposal = store.planProposals.find((p) => p.id === input.proposalId);
    if (!proposal) return { ok: false, statusCode: 404, error: 'Propunerea nu a fost găsită.' };
    const plan = store.plans.find((p) => p.id === proposal.planId);
    if (!plan) return { ok: false, statusCode: 404, error: 'Planul asociat nu a fost găsit.' };
    if (!isPlanParticipant(plan, input.userId)) {
      return {
        ok: false,
        statusCode: 403,
        error: 'Acces interzis. Doar participanții la plan pot răspunde la această propunere.',
      };
    }
    if (proposal.status !== 'PENDING') {
      return { ok: false, statusCode: 400, error: 'Această propunere a primit deja un răspuns.' };
    }
    if (proposal.proposedByUserId === input.userId) {
      return {
        ok: false,
        statusCode: 400,
        error: 'Nu îți poți accepta unilateral propria propunere; celălalt participant trebuie să accepte.',
      };
    }

    const now = new Date().toISOString();
    const prevStatus = plan.lifecycleStatus;

    if (input.decision === 'ACCEPT') {
      const slot =
        proposal.slots.find((s) => s.id === input.selectedSlotId) ?? proposal.slots[0];
      if (!slot) return { ok: false, error: 'Opțiunea selectată nu este validă.' };

      proposal.status = 'ACCEPTED';
      proposal.acceptedSlotId = slot.id;
      proposal.resolvedAt = now;

      plan.dateLabel = slot.dateLabel;
      plan.isoDate = slot.isoDate;
      plan.time = slot.time;
      plan.location = slot.location;
      plan.lifecycleStatus = 'RESCHEDULED';
      plan.status = 'upcoming';
      plan.subtitle = `Reprogramat și confirmat reciproc · ${slot.dateLabel}, ${slot.time}`;
      plan.confirmations = plan.confirmations.map((c) => ({
        ...c,
        confirmed:
          c.userId === input.userId || c.userId === proposal.proposedByUserId
            ? true
            : c.confirmed,
        reconfirmed: false,
        confirmedAt: now,
      }));
      plan.lastUpdatedAt = now;

      // Sync linked activity if organizer rescheduled it
      if (plan.activityId && plan.type === 'organized') {
        const act = store.activities.find((a) => a.id === plan.activityId);
        if (act) {
          act.dateLabel = slot.dateLabel;
          act.isoDate = slot.isoDate;
          act.time = slot.time;
          act.location = slot.location;
        }
      }

      store.analyticsCounters.rescheduleSuccessCount += 1;

      appendPlanEvent(store, {
        planId: plan.id,
        fromStatus: prevStatus,
        toStatus: 'RESCHEDULED',
        actorId: input.userId,
        actorName: input.userName,
        summary: `Reprogramare acceptată: ${slot.dateLabel}, ${slot.time} · ${slot.location}.`,
      });

      emitNotificationOnce(store, {
        idempotencyKey: `rescheduled:${proposal.id}`,
        title: 'Plan reprogramat cu succes',
        body: `„${plan.title}” a fost confirmat pentru ${slot.dateLabel}, ${slot.time}.`,
        type: 'activity_rescheduled',
        planId: plan.id,
        activityId: plan.activityId,
      });
    } else {
      proposal.status = 'REJECTED';
      proposal.resolvedAt = now;

      plan.lifecycleStatus = 'AWAITING_CONFIRMATION';
      plan.status = 'pending';
      plan.subtitle = 'Propunerea de modificare a fost refuzată · Necesită reconfirmare sau anulare';
      plan.lastUpdatedAt = now;

      appendPlanEvent(store, {
        planId: plan.id,
        fromStatus: prevStatus,
        toStatus: 'AWAITING_CONFIRMATION',
        actorId: input.userId,
        actorName: input.userName,
        summary: `${input.userName} a refuzat alternativele propuse. Planul inițial nu a fost modificat unilateral.`,
      });
    }

    return { ok: true, proposal: clone(proposal), plan: clone(plan) };
  });
}

export async function cancelPlanWithTrustPolicy(input: {
  planId: string;
  userId: string;
  userName: string;
  safetyReason?: boolean;
  reasonText?: string;
  now?: Date;
}): Promise<{
  ok: boolean;
  statusCode?: number;
  error?: string;
  plan?: PlanItem;
  attendanceClassification?: AttendanceRecord['status'];
  offeredWaitlistUser?: string;
}> {
  return withResourceLock(`plan:${input.planId}`, async () => {
    const store = getTrustStore();
    const plan = store.plans.find((p) => p.id === input.planId);
    if (!plan) return { ok: false, statusCode: 404, error: 'Planul nu a fost găsit.' };
    if (!isPlanParticipant(plan, input.userId)) {
      return {
        ok: false,
        statusCode: 403,
        error: 'Acces interzis. Nu poți anula un plan la care nu participi.',
      };
    }
    if (plan.lifecycleStatus === 'CANCELLED') {
      return { ok: false, statusCode: 400, error: 'Planul este deja anulat.' };
    }

    const now = input.now ?? new Date();
    const prevStatus = plan.lifecycleStatus;
    const isOrganizerCancelling = plan.organizerId === input.userId;

    plan.lifecycleStatus = 'CANCELLED';
    plan.status = 'cancelled';
    plan.cancelledBySafety = Boolean(input.safetyReason);
    // Safety rule: never expose raw safety reason to the other party
    plan.subtitle = input.safetyReason
      ? 'Plan anulat (motiv confidențial)'
      : isOrganizerCancelling
      ? 'Anulat de organizator · Alternative disponibile'
      : 'Anulat de tine';
    plan.lastUpdatedAt = now.toISOString();

    let classification: AttendanceRecord['status'] = 'EARLY_CANCELLATION';
    const hoursLeft =
      plan.isoDate && plan.time
        ? hoursUntilBucharestEvent(plan.isoDate, plan.time, now)
        : 48;

    const wasConfirmed =
      prevStatus === 'CONFIRMED' ||
      prevStatus === 'RECONFIRMATION_REQUIRED' ||
      prevStatus === 'RESCHEDULED';

    if (input.safetyReason) {
      classification = 'SAFETY_CANCELLATION';
    } else if (isOrganizerCancelling) {
      classification = 'ORGANIZER_CANCELLED';
    } else if (!wasConfirmed) {
      classification = 'UNCONFIRMED_INVITATION';
    } else if (hoursLeft < LATE_CANCEL_CUTOFF_HOURS) {
      classification = 'LATE_CANCELLATION';
    } else {
      classification = 'EARLY_CANCELLATION';
    }

    // Only group activities feed operational reliability records (never private 1-to-1 dating meetups)
    if (plan.type !== 'meetup' && plan.activityId) {
      store.attendanceRecords.unshift({
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        userId: input.userId,
        activityId: plan.activityId,
        activityTitle: plan.title,
        eventDateIso: plan.isoDate ?? now.toISOString().slice(0, 10),
        eventTime: plan.time,
        status: classification,
        verifiedBy: input.safetyReason ? 'safety_override' : 'system_cancellation',
        recordedAt: now.toISOString(),
        disputeStatus: 'NONE',
      });
    }

    appendPlanEvent(store, {
      planId: plan.id,
      fromStatus: prevStatus,
      toStatus: 'CANCELLED',
      actorId: input.userId,
      actorName: input.safetyReason ? 'Utilizator' : input.userName,
      summary: input.safetyReason
        ? 'Plan anulat. Motivul nu este divulgat și nu afectează scorul de fiabilitate.'
        : isOrganizerCancelling
        ? 'Activitatea a fost anulată de organizator.'
        : 'Participarea a fost anulată.',
      now,
    });

    emitNotificationOnce(store, {
      idempotencyKey: `plan_cancelled:${plan.id}:${input.userId}`,
      title: 'Plan anulat',
      body: input.safetyReason
        ? `Planul „${plan.title}” a fost anulat. Poți vedea opțiuni alternative în siguranță.`
        : `Planul „${plan.title}” a fost anulat.`,
      type: 'plan_cancelled',
      planId: plan.id,
      activityId: plan.activityId,
    });

    let offeredWaitlistUser: string | undefined;
    if (plan.activityId) {
      const activity = store.activities.find((a) => a.id === plan.activityId);
      if (activity) {
        if (isOrganizerCancelling) {
          activity.isCancelled = true;
        } else {
          const hadSpot = activity.participants.some((pt) => pt.id === input.userId);
          if (hadSpot) {
            activity.participants = activity.participants.filter(
              (pt) => pt.id !== input.userId
            );
            const offerRes = await offerNextWaitlistSpotUnlocked(store, activity, now);
            offeredWaitlistUser = offerRes?.userName;
          }
        }
      }
    }

    return {
      ok: true,
      plan: clone(plan),
      attendanceClassification: classification,
      offeredWaitlistUser,
    };
  });
}

// --- SMART RECONFIRMATION SERVER EVALUATION ---

export function evaluateReconfirmationReminders(
  now: Date = new Date(),
  options?: { filterUserId?: string }
): {
  evaluatedPlans: number;
  triggeredNotifications: number;
  autoReleasedCount: number;
} {
  const store = getTrustStore();
  let evaluatedPlans = 0;
  let triggeredNotifications = 0;
  let autoReleasedCount = 0;

  for (const plan of store.plans) {
    if (options?.filterUserId && !isPlanParticipant(plan, options.filterUserId)) {
      continue;
    }
    if (
      plan.lifecycleStatus !== 'CONFIRMED' &&
      plan.lifecycleStatus !== 'RECONFIRMATION_REQUIRED'
    ) {
      continue;
    }
    if (!plan.isoDate || !plan.time) continue;
    evaluatedPlans += 1;

    const hoursLeft = hoursUntilBucharestEvent(plan.isoDate, plan.time, now);

    // ~24h before event -> transition to RECONFIRMATION_REQUIRED & send reminder
    if (hoursLeft <= 24 && hoursLeft > 0 && plan.lifecycleStatus === 'CONFIRMED') {
      const prevStatus = plan.lifecycleStatus;
      plan.lifecycleStatus = 'RECONFIRMATION_REQUIRED';
      plan.reconfirmationDeadlineIso =
        plan.reconfirmationDeadlineIso ??
        new Date(now.getTime() + Math.min(hoursLeft, 12) * 3_600_000).toISOString();
      plan.lastUpdatedAt = now.toISOString();
      store.analyticsCounters.reconfirmationRequestsCount += 1;

      appendPlanEvent(store, {
        planId: plan.id,
        fromStatus: prevStatus,
        toStatus: 'RECONFIRMATION_REQUIRED',
        actorId: 'system',
        actorName: 'HAI. Programare inteligentă',
        summary: 'Reconfirmare solicitată (~24h înainte de întâlnire).',
        now,
      });

      const n = emitNotificationOnce(store, {
        idempotencyKey: `reconfirm_24h:${plan.id}`,
        title: `Reconfirmă planul „${plan.title}”`,
        body: `Întâlnirea are loc peste ~${Math.max(1, Math.round(hoursLeft))}h. Confirmă, propune o altă oră sau anulează.`,
        type: 'reconfirmation_upcoming',
        planId: plan.id,
        activityId: plan.activityId,
      });
      if (n) triggeredNotifications += 1;
    }

    // Follow-up reminder if unanswered and <= 6h before deadline
    if (plan.lifecycleStatus === 'RECONFIRMATION_REQUIRED' && plan.reconfirmationDeadlineIso) {
      const deadlineMs = new Date(plan.reconfirmationDeadlineIso).getTime();
      const msToDeadline = deadlineMs - now.getTime();
      const hasPending = plan.confirmations.some((c) => !c.reconfirmed);
      if (hasPending && msToDeadline > 0 && msToDeadline <= 6 * 3_600_000) {
        const n = emitNotificationOnce(store, {
          idempotencyKey: `reconfirm_followup:${plan.id}`,
          title: `Reminder final: ${plan.title}`,
          body: 'Termenul de reconfirmare se apropie. Te rugăm să răspunzi din Planurile mele.',
          type: 'reconfirmation_deadline',
          planId: plan.id,
          activityId: plan.activityId,
        });
        if (n) triggeredNotifications += 1;
      }

      // Past deadline + disclosed policy on group activities ONLY (NEVER auto-replace 1-to-1 dating!)
      if (
        msToDeadline <= 0 &&
        hasPending &&
        plan.type !== 'meetup' &&
        plan.autoReleaseWaitlistSpot &&
        plan.activityId
      ) {
        const activity = store.activities.find((a) => a.id === plan.activityId);
        if (activity) {
          const unconfirmedUsers = plan.confirmations.filter(
            (c) => !c.reconfirmed && c.userId !== activity.organizerId
          );
          for (const unc of unconfirmedUsers) {
            const existsInAct = activity.participants.some((p) => p.id === unc.userId);
            if (existsInAct) {
              activity.participants = activity.participants.filter(
                (p) => p.id !== unc.userId
              );
              autoReleasedCount += 1;
              store.analyticsCounters.waitlistSpotsOpenedCount += 1;
              void offerNextWaitlistSpotUnlocked(store, activity, now);
            }
          }
        }
      }
    }
  }

  return { evaluatedPlans, triggeredNotifications, autoReleasedCount };
}

// --- WAITLIST ENGINE (ATOMIC PER ACTIVITY) ---

function expireStaleOffersUnlocked(
  store: TrustStoreState,
  activityId: string,
  now: Date
): boolean {
  let expiredAny = false;
  const activity = store.activities.find((a) => a.id === activityId);
  for (const offer of store.waitlistOffers) {
    if (
      offer.activityId === activityId &&
      offer.status === 'PENDING' &&
      new Date(offer.expiresAt).getTime() <= now.getTime()
    ) {
      offer.status = 'EXPIRED';
      expiredAny = true;
      const entry = store.waitlistEntries.find(
        (e) => e.activityId === activityId && e.userId === offer.userId
      );
      if (entry) entry.status = 'EXPIRED';
    }
  }
  if (expiredAny && activity) {
    void offerNextWaitlistSpotUnlocked(store, activity, now);
  }
  return expiredAny;
}

function offerNextWaitlistSpotUnlocked(
  store: TrustStoreState,
  activity: ActivityItem,
  now: Date
): WaitlistOffer | null {
  if (activity.isCancelled || activity.isEnded) return null;
  const activeOfferExists = store.waitlistOffers.some(
    (o) => o.activityId === activity.id && o.status === 'PENDING'
  );
  if (activeOfferExists) return null;

  const freeSpots = activity.maxParticipants - activity.participants.length;
  if (freeSpots <= 0) return null;

  const waitingEntries = store.waitlistEntries
    .filter((e) => e.activityId === activity.id && e.status === 'WAITING')
    .sort((a, b) => a.position - b.position);

  const next = waitingEntries.find(
    (e) => !activity.participants.some((p) => p.id === e.userId)
  );
  if (!next) return null;

  next.status = 'OFFERED';
  const expiresAt = new Date(
    now.getTime() + WAITLIST_OFFER_WINDOW_MINUTES * 60_000
  ).toISOString();
  const offer: WaitlistOffer = {
    id: `wlo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    activityId: activity.id,
    userId: next.userId,
    userName: next.userName,
    offeredAt: now.toISOString(),
    expiresAt,
    status: 'PENDING',
  };
  store.waitlistOffers.unshift(offer);
  store.analyticsCounters.waitlistSpotsOpenedCount += 1;

  emitNotificationOnce(store, {
    idempotencyKey: `waitlist_offer:${offer.id}`,
    title: `Loc disponibil la ${activity.title}`,
    body: `${next.userName}, ai primit un loc de pe lista de așteptare! Confirmă explicit în ${WAITLIST_OFFER_WINDOW_MINUTES} minute.`,
    type: 'waitlist_offer',
    activityId: activity.id,
    userId: next.userId,
  });

  return offer;
}

export async function joinActivityOrWaitlist(input: {
  activityId: string;
  userId: string;
  userName: string;
  photoKey: PhotoKey;
  customPhotoUrl?: string;
  isVerified?: boolean;
}): Promise<{
  ok: boolean;
  mode?: 'joined' | 'waitlisted' | 'already_joined' | 'already_waitlisted';
  error?: string;
  activity?: ActivityItem;
  waitlistEntry?: WaitlistEntry;
}> {
  return withResourceLock(`activity:${input.activityId}`, () => {
    const store = getTrustStore();
    const activity = store.activities.find((a) => a.id === input.activityId);
    if (!activity) return { ok: false, error: 'Activitatea nu a fost găsită.' };
    if (activity.isCancelled) {
      return { ok: false, error: 'Această activitate a fost anulată.' };
    }

    const now = new Date();
    expireStaleOffersUnlocked(store, activity.id, now);

    if (activity.participants.some((p) => p.id === input.userId)) {
      return { ok: true, mode: 'already_joined', activity: clone(activity) };
    }

    const existingWait = store.waitlistEntries.find(
      (e) =>
        e.activityId === input.activityId &&
        e.userId === input.userId &&
        (e.status === 'WAITING' || e.status === 'OFFERED')
    );
    if (existingWait) {
      return {
        ok: true,
        mode: 'already_waitlisted',
        activity: clone(activity),
        waitlistEntry: clone(existingWait),
      };
    }

    // Reserve spots held by active pending waitlist offers to prevent overbooking
    const activeOffersCount = store.waitlistOffers.filter(
      (o) => o.activityId === activity.id && o.status === 'PENDING'
    ).length;

    if (activity.participants.length + activeOffersCount < activity.maxParticipants) {
      activity.participants.push({
        id: input.userId,
        name: input.userName,
        photoKey: input.photoKey,
        customPhotoUrl: input.customPhotoUrl,
        isVerified: input.isVerified,
      });

      return { ok: true, mode: 'joined', activity: clone(activity) };
    }

    // Activity full -> append to waitlist atomically with monotonic position
    const currentEntries = store.waitlistEntries.filter(
      (e) => e.activityId === activity.id
    );
    const maxPos = currentEntries.reduce((m, e) => Math.max(m, e.position), 0);
    const entry: WaitlistEntry = {
      id: `wl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      activityId: activity.id,
      userId: input.userId,
      userName: input.userName,
      photoKey: input.photoKey,
      isVerified: input.isVerified,
      joinedAt: now.toISOString(),
      position: maxPos + 1,
      status: 'WAITING',
    };
    store.waitlistEntries.push(entry);

    return {
      ok: true,
      mode: 'waitlisted',
      activity: clone(activity),
      waitlistEntry: clone(entry),
    };
  });
}

export async function respondToWaitlistOffer(input: {
  offerId: string;
  userId: string;
  decision: 'ACCEPT' | 'DECLINE';
  now?: Date;
}): Promise<{
  ok: boolean;
  statusCode?: number;
  error?: string;
  activity?: ActivityItem;
  offer?: WaitlistOffer;
  nextOfferedUser?: string;
}> {
  const store = getTrustStore();
  const lookup = store.waitlistOffers.find((o) => o.id === input.offerId);
  if (!lookup) {
    return { ok: false, statusCode: 404, error: 'Oferta de pe lista de așteptare nu există.' };
  }

  return withResourceLock(`activity:${lookup.activityId}`, () => {
    const now = input.now ?? new Date();
    const offer = store.waitlistOffers.find((o) => o.id === input.offerId);
    if (!offer) return { ok: false, statusCode: 404, error: 'Oferta nu există.' };
    if (offer.userId !== input.userId) {
      return {
        ok: false,
        statusCode: 403,
        error: 'Această ofertă este destinată unui alt utilizator.',
      };
    }

    const activity = store.activities.find((a) => a.id === offer.activityId);
    if (!activity) return { ok: false, statusCode: 404, error: 'Activitatea nu a fost găsită.' };

    if (offer.status !== 'PENDING') {
      return { ok: false, error: 'Această ofertă nu mai este activă.' };
    }

    const entry = store.waitlistEntries.find(
      (e) => e.activityId === offer.activityId && e.userId === input.userId
    );

    if (new Date(offer.expiresAt).getTime() <= now.getTime()) {
      offer.status = 'EXPIRED';
      if (entry) entry.status = 'EXPIRED';
      const next = offerNextWaitlistSpotUnlocked(store, activity, now);
      return {
        ok: false,
        error: 'Fereastra de acceptare a expirat. Locul a fost oferit următorului utilizator.',
        nextOfferedUser: next?.userName,
      };
    }

    if (input.decision === 'DECLINE') {
      offer.status = 'DECLINED';
      if (entry) entry.status = 'DECLINED';
      const next = offerNextWaitlistSpotUnlocked(store, activity, now);
      return {
        ok: true,
        activity: clone(activity),
        offer: clone(offer),
        nextOfferedUser: next?.userName,
      };
    }

    // ACCEPT path: strictly guard against duplicate participation and overbooking
    if (activity.participants.some((p) => p.id === input.userId)) {
      offer.status = 'ACCEPTED';
      if (entry) entry.status = 'ACCEPTED';
      return { ok: false, error: 'Ești deja înscris(ă) la această activitate.' };
    }

    if (activity.participants.length >= activity.maxParticipants) {
      return {
        ok: false,
        error: 'Capacitatea maximă a fost atinsă între timp. Nu se poate depăși limita.',
      };
    }

    offer.status = 'ACCEPTED';
    if (entry) entry.status = 'ACCEPTED';
    activity.participants.push({
      id: input.userId,
      name: offer.userName,
      photoKey: entry?.photoKey ?? 'andrei',
      isVerified: entry?.isVerified,
    });
    store.analyticsCounters.waitlistReplacementsAcceptedCount += 1;

    // Also update or add matching plan for user
    const linkedPlan = store.plans.find((p) => p.activityId === activity.id);
    if (linkedPlan) {
      linkedPlan.lifecycleStatus = 'CONFIRMED';
      linkedPlan.status = 'upcoming';
      linkedPlan.subtitle = `Organizat de ${activity.organizerName} · Loc confirmat de pe lista de așteptare`;
      linkedPlan.lastUpdatedAt = now.toISOString();
      const conf = linkedPlan.confirmations.find((c) => c.userId === input.userId);
      if (conf) {
        conf.confirmed = true;
        conf.confirmedAt = now.toISOString();
      } else {
        linkedPlan.confirmations.push({
          userId: input.userId,
          userName: offer.userName,
          photoKey: entry?.photoKey ?? 'andrei',
          confirmed: true,
          reconfirmed: true,
          confirmedAt: now.toISOString(),
        });
      }
    }

    emitNotificationOnce(store, {
      idempotencyKey: `waitlist_accepted:${offer.id}`,
      title: 'Loc confirmat de pe lista de așteptare',
      body: `${offer.userName} a acceptat locul eliberat la „${activity.title}”. Organizatorul a fost notificat.`,
      type: 'waitlist_accepted',
      activityId: activity.id,
      planId: linkedPlan?.id,
    });

    return { ok: true, activity: clone(activity), offer: clone(offer) };
  });
}

export async function expireWaitlistOffersForActivity(
  activityId: string,
  now: Date = new Date()
): Promise<{ expired: boolean; nextOffer?: WaitlistOffer | null }> {
  return withResourceLock(`activity:${activityId}`, () => {
    const store = getTrustStore();
    const expired = expireStaleOffersUnlocked(store, activityId, now);
    const nextOffer = store.waitlistOffers.find(
      (o) => o.activityId === activityId && o.status === 'PENDING'
    );
    return { expired, nextOffer: nextOffer ? clone(nextOffer) : null };
  });
}

// --- VOLUNTARY GROUP CHECK-IN & ATTENDANCE ---

export async function generateGroupCheckInCode(input: {
  activityId: string;
  organizerId: string;
}): Promise<{ ok: boolean; error?: string; code?: string; expiresAt?: string }> {
  return withResourceLock(`activity:${input.activityId}`, () => {
    const store = getTrustStore();
    const activity = store.activities.find((a) => a.id === input.activityId);
    if (!activity) return { ok: false, error: 'Activitatea nu a fost găsită.' };
    if (activity.organizerId !== input.organizerId) {
      return { ok: false, error: 'Doar organizatorul poate genera codul de check-in.' };
    }
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    const expiresAt = new Date(Date.now() + 4 * 3_600_000).toISOString();
    activity.checkInCode = code;
    activity.checkInCodeExpiresAt = expiresAt;
    return { ok: true, code, expiresAt };
  });
}

export async function submitVoluntaryCheckIn(input: {
  activityId?: string;
  planId?: string;
  userId: string;
  code?: string;
  now?: Date;
}): Promise<{ ok: boolean; error?: string; record?: AttendanceRecord }> {
  const store = getTrustStore();

  // Privacy guard: NEVER track private 1-to-1 dating meetups with attendance codes/tracking
  if (input.planId) {
    const plan = store.plans.find((p) => p.id === input.planId);
    if (plan?.type === 'meetup') {
      return {
        ok: false,
        error:
          'Întâlnirile 1-la-1 nu folosesc urmărirea prezenței sau coduri de verificare; poți folosi exclusiv partajarea voluntară cu un contact de încredere.',
      };
    }
  }

  const targetActivityId = input.activityId;
  if (!targetActivityId) {
    return { ok: false, error: 'Identificatorul activității de grup lipsește.' };
  }

  return withResourceLock(`activity:${targetActivityId}`, () => {
    const activity = store.activities.find((a) => a.id === targetActivityId);
    if (!activity) return { ok: false, error: 'Activitatea nu a fost găsită.' };
    const isParticipant = activity.participants.some((p) => p.id === input.userId);
    if (!isParticipant) {
      return { ok: false, error: 'Doar participanții înscriși pot face check-in la activitate.' };
    }

    const now = input.now ?? new Date();
    if (activity.checkInCode) {
      const provided = (input.code ?? '').trim().toUpperCase();
      if (provided !== activity.checkInCode.toUpperCase()) {
        return {
          ok: false,
          error: 'Codul de prezență este incorect. Solicită codul afișat de organizator.',
        };
      }
      if (
        activity.checkInCodeExpiresAt &&
        new Date(activity.checkInCodeExpiresAt).getTime() < now.getTime()
      ) {
        return { ok: false, error: 'Codul de prezență a expirat.' };
      }
    }

    const existing = store.attendanceRecords.find(
      (r) =>
        r.userId === input.userId &&
        r.activityId === activity.id &&
        r.status === 'VERIFIED_ATTENDANCE'
    );
    if (existing) {
      return { ok: true, record: clone(existing) };
    }

    const record: AttendanceRecord = {
      id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: input.userId,
      activityId: activity.id,
      activityTitle: activity.title,
      eventDateIso: activity.isoDate,
      eventTime: activity.time,
      status: 'VERIFIED_ATTENDANCE',
      verifiedBy: 'event_code',
      checkInCodeUsed: input.code?.trim().toUpperCase(),
      recordedAt: now.toISOString(),
      disputeStatus: 'NONE',
    };
    store.attendanceRecords.unshift(record);

    const linkedPlan = store.plans.find((p) => p.activityId === activity.id);
    if (linkedPlan) {
      linkedPlan.checkedIn = true;
      linkedPlan.lastUpdatedAt = now.toISOString();
    }

    return { ok: true, record: clone(record) };
  });
}

export async function organizerConfirmAttendance(input: {
  activityId: string;
  organizerId: string;
  targetUserId: string;
  status: 'VERIFIED_ATTENDANCE' | 'VERIFIED_NO_SHOW';
}): Promise<{ ok: boolean; error?: string; record?: AttendanceRecord }> {
  return withResourceLock(`activity:${input.activityId}`, () => {
    const store = getTrustStore();
    const activity = store.activities.find((a) => a.id === input.activityId);
    if (!activity) return { ok: false, error: 'Activitatea nu a fost găsită.' };
    if (activity.organizerId !== input.organizerId) {
      return { ok: false, error: 'Doar organizatorul poate confirma prezența participanților.' };
    }
    const isParticipant = activity.participants.some((p) => p.id === input.targetUserId);
    if (!isParticipant) {
      return { ok: false, error: 'Utilizatorul selectat nu este participant la această activitate.' };
    }

    const now = new Date().toISOString();
    const existing = store.attendanceRecords.find(
      (r) => r.activityId === activity.id && r.userId === input.targetUserId
    );
    if (existing) {
      existing.status = input.status;
      existing.verifiedBy = 'organizer_confirmation';
      existing.recordedAt = now;
      return { ok: true, record: clone(existing) };
    }

    const record: AttendanceRecord = {
      id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: input.targetUserId,
      activityId: activity.id,
      activityTitle: activity.title,
      eventDateIso: activity.isoDate,
      eventTime: activity.time,
      status: input.status,
      verifiedBy: 'organizer_confirmation',
      recordedAt: now,
      disputeStatus: 'NONE',
    };
    store.attendanceRecords.unshift(record);
    return { ok: true, record: clone(record) };
  });
}

// --- DISPUTES & MODERATION ---

export async function submitAttendanceDispute(input: {
  recordId: string;
  userId: string;
  userName: string;
  reason: string;
}): Promise<{ ok: boolean; statusCode?: number; error?: string; dispute?: AttendanceDispute }> {
  return withResourceLock(`dispute:${input.recordId}`, () => {
    const store = getTrustStore();
    const record = store.attendanceRecords.find((r) => r.id === input.recordId);
    if (!record) {
      return { ok: false, statusCode: 404, error: 'Înregistrarea de prezență nu a fost găsită.' };
    }
    if (record.userId !== input.userId) {
      return {
        ok: false,
        statusCode: 403,
        error: 'Poți contesta doar propriile înregistrări de prezență.',
      };
    }
    if (record.disputeStatus === 'OPEN') {
      return {
        ok: false,
        statusCode: 409,
        error: 'Există deja o contestație în analiză pentru această înregistrare.',
      };
    }
    const cleanReason = input.reason.trim();
    if (cleanReason.length < 10) {
      return { ok: false, error: 'Explică motivul contestației în cel puțin 10 caractere.' };
    }

    record.disputeStatus = 'OPEN';
    record.disputeNote = cleanReason;
    record.status = 'DISPUTED';

    const dispute: AttendanceDispute = {
      id: `disp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      recordId: record.id,
      userId: input.userId,
      userName: input.userName,
      activityId: record.activityId,
      activityTitle: record.activityTitle,
      reason: cleanReason,
      status: 'OPEN',
      createdAt: new Date().toISOString(),
    };
    store.attendanceDisputes.unshift(dispute);
    return { ok: true, dispute: clone(dispute) };
  });
}

export async function resolveAttendanceDispute(input: {
  disputeId: string;
  moderatorId: string;
  outcome: 'RESOLVED_EXCUSED' | 'RESOLVED_UPHELD';
  moderatorNote?: string;
}): Promise<{ ok: boolean; error?: string; dispute?: AttendanceDispute }> {
  return withResourceLock(`dispute-resolve:${input.disputeId}`, () => {
    const store = getTrustStore();
    const dispute = store.attendanceDisputes.find((d) => d.id === input.disputeId);
    if (!dispute) return { ok: false, error: 'Contestația nu a fost găsită.' };

    const record = store.attendanceRecords.find((r) => r.id === dispute.recordId);
    const now = new Date().toISOString();

    dispute.status = input.outcome;
    dispute.moderatorNote = input.moderatorNote;
    dispute.resolvedAt = now;

    if (record) {
      record.disputeStatus = input.outcome;
      if (input.outcome === 'RESOLVED_EXCUSED') {
        record.status = 'TECHNICAL_FAILURE'; // Permanently excluded from penalty
      } else if (record.status === 'DISPUTED') {
        record.status = 'LATE_CANCELLATION';
      }
    }

    store.moderationActions.unshift({
      id: `mod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      moderatorId: input.moderatorId,
      targetType: 'dispute',
      targetId: dispute.id,
      action: input.outcome === 'RESOLVED_EXCUSED' ? 'DISPUTE_EXCUSED' : 'DISPUTE_UPHELD',
      reason:
        input.moderatorNote ||
        (input.outcome === 'RESOLVED_EXCUSED'
          ? 'Contestație aprobată — înregistrarea este exclusă din calculul scorului.'
          : 'Contestație respinsă conform evidenței organizatorului.'),
      createdAt: now,
    });

    return { ok: true, dispute: clone(dispute) };
  });
}

// --- RELIABILITY ACCESSORS ---

export function getReliabilityForViewer(
  targetUserId: string,
  viewerId: string,
  now: Date = new Date()
): { isOwner: boolean; summary: ReliabilitySummary; breakdown?: ReliabilityBreakdown } {
  const store = getTrustStore();
  const breakdown = calculateReliability(
    targetUserId,
    store.attendanceRecords,
    store.attendanceDisputes,
    now
  );
  const summary = toPublicReliabilitySummary(breakdown);
  if (viewerId === targetUserId) {
    return { isOwner: true, summary, breakdown };
  }
  return { isOwner: false, summary };
}

// --- COMMENTS & VERIFIED REVIEWS ---

export function getCommentsForActivity(input: {
  activityId: string;
  viewerId: string;
  page?: number;
  pageSize?: number;
}): {
  ok: boolean;
  error?: string;
  statusCode?: number;
  comments: ActivityComment[];
  total: number;
  hasMore: boolean;
} {
  const store = getTrustStore();
  const activity = store.activities.find((a) => a.id === input.activityId);
  if (!activity) {
    return {
      ok: false,
      error: 'Activitatea nu a fost găsită.',
      statusCode: 404,
      comments: [],
      total: 0,
      hasMore: false,
    };
  }

  const isMember =
    activity.organizerId === input.viewerId ||
    activity.participants.some((p) => p.id === input.viewerId);

  // Private activity discussion restriction when organizer restricts visibility
  if (!activity.privacyShowParticipants && !isMember) {
    return {
      ok: false,
      error: 'Comentariile acestei activități sunt vizibile doar participanților confirmați.',
      statusCode: 403,
      comments: [],
      total: 0,
      hasMore: false,
    };
  }

  const blocked = new Set(store.blockedUsersByViewer[input.viewerId] ?? []);
  const allVisible = store.comments
    .filter((c) => c.activityId === input.activityId && !c.isDeleted && !c.removedByModerator)
    .filter((c) => !blocked.has(c.authorId));

  // Chronological top-level parents, paginated
  const topLevel = allVisible
    .filter((c) => !c.parentId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(20, Math.max(1, input.pageSize ?? 6));
  const slice = topLevel.slice(0, page * pageSize);
  const parentIds = new Set(slice.map((c) => c.id));
  const replies = allVisible
    .filter((c) => c.parentId && parentIds.has(c.parentId))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return {
    ok: true,
    comments: clone([...slice, ...replies]),
    total: topLevel.length,
    hasMore: slice.length < topLevel.length,
  };
}

export async function addActivityComment(input: {
  activityId: string;
  authorId: string;
  authorName: string;
  authorPhotoKey: PhotoKey;
  authorCustomPhotoUrl?: string;
  authorVerified?: boolean;
  content: string;
  parentId?: string;
}): Promise<{ ok: boolean; statusCode?: number; error?: string; comment?: ActivityComment }> {
  return withResourceLock(`comments:${input.activityId}`, () => {
    const store = getTrustStore();
    const activity = store.activities.find((a) => a.id === input.activityId);
    if (!activity) {
      return { ok: false, statusCode: 404, error: 'Activitatea nu a fost găsită.' };
    }

    const isOrganizer = activity.organizerId === input.authorId;
    const isParticipant = activity.participants.some((p) => p.id === input.authorId);

    if (!activity.privacyShowParticipants && !isOrganizer && !isParticipant) {
      return {
        ok: false,
        statusCode: 403,
        error: 'Doar participanții confirmați pot comenta la o activitate cu vizibilitate privată.',
      };
    }

    const clean = input.content.replace(/<[^>]*>/g, '').trim();
    if (clean.length < 2 || clean.length > 500) {
      return {
        ok: false,
        statusCode: 400,
        error: 'Comentariul trebuie să conțină între 2 și 500 de caractere.',
      };
    }

    // Simple anti-spam duplicate detection within 2 minutes
    const duplicate = store.comments.find(
      (c) =>
        c.activityId === input.activityId &&
        c.authorId === input.authorId &&
        !c.isDeleted &&
        c.content.toLowerCase() === clean.toLowerCase() &&
        Date.now() - new Date(c.createdAt).getTime() < 120_000
    );
    if (duplicate) {
      return {
        ok: false,
        statusCode: 429,
        error: 'Comentariu duplicat detectat. Așteaptă câteva momente înainte de a posta din nou.',
      };
    }

    let parentAuthorId: string | undefined;
    if (input.parentId) {
      const parent = store.comments.find(
        (c) => c.id === input.parentId && c.activityId === input.activityId && !c.isDeleted
      );
      if (!parent) {
        return { ok: false, statusCode: 404, error: 'Comentariul părinte nu există.' };
      }
      if (parent.parentId) {
        return {
          ok: false,
          statusCode: 400,
          error: 'Sunt permise cel mult răspunsuri pe un singur nivel.',
        };
      }
      parentAuthorId = parent.authorId;
    }

    const authorRole: ActivityComment['authorRole'] = isOrganizer
      ? 'Organizator'
      : isParticipant
      ? 'Participant'
      : 'Membru';

    const comment: ActivityComment = {
      id: `cmt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      activityId: input.activityId,
      parentId: input.parentId,
      authorId: input.authorId,
      authorName: input.authorName,
      authorPhotoKey: input.authorPhotoKey,
      authorCustomPhotoUrl: input.authorCustomPhotoUrl,
      authorVerified: input.authorVerified,
      authorRole,
      content: clean,
      createdAt: new Date().toISOString(),
    };
    store.comments.push(comment);

    if (parentAuthorId && parentAuthorId !== input.authorId) {
      emitNotificationOnce(store, {
        idempotencyKey: `comment_reply:${comment.id}`,
        title: `Răspuns nou la ${activity.title}`,
        body: `${input.authorName} a răspuns la comentariul tău: „${clean.slice(0, 80)}”`,
        type: 'comment_reply',
        activityId: activity.id,
        userId: parentAuthorId,
      });
    }

    return { ok: true, comment: clone(comment) };
  });
}

export async function editActivityComment(input: {
  activityId?: string;
  commentId: string;
  actorId: string;
  content: string;
}): Promise<{ ok: boolean; statusCode?: number; error?: string; comment?: ActivityComment }> {
  const store = getTrustStore();
  const comment = store.comments.find(
    (c) =>
      c.id === input.commentId &&
      !c.isDeleted &&
      (!input.activityId || c.activityId === input.activityId)
  );
  if (!comment) return { ok: false, statusCode: 404, error: 'Comentariul nu a fost găsit.' };
  if (comment.authorId !== input.actorId) {
    return {
      ok: false,
      statusCode: 403,
      error: 'Poți edita exclusiv propriile comentarii.',
    };
  }
  const clean = input.content.replace(/<[^>]*>/g, '').trim();
  if (clean.length < 2 || clean.length > 500) {
    return {
      ok: false,
      statusCode: 400,
      error: 'Comentariul trebuie să aibă între 2 și 500 de caractere.',
    };
  }
  comment.content = clean;
  comment.updatedAt = new Date().toISOString();
  return { ok: true, comment: clone(comment) };
}

export async function deleteActivityComment(input: {
  activityId?: string;
  commentId: string;
  actorId: string;
  isModerator: boolean;
}): Promise<{ ok: boolean; statusCode?: number; error?: string }> {
  const store = getTrustStore();
  const comment = store.comments.find(
    (c) =>
      c.id === input.commentId &&
      !c.isDeleted &&
      (!input.activityId || c.activityId === input.activityId)
  );
  if (!comment) return { ok: false, statusCode: 404, error: 'Comentariul nu a fost găsit.' };
  if (comment.authorId !== input.actorId && !input.isModerator) {
    return {
      ok: false,
      statusCode: 403,
      error: 'Doar autorul sau un moderator poate șterge acest comentariu.',
    };
  }
  comment.isDeleted = true;
  if (input.isModerator && comment.authorId !== input.actorId) {
    comment.removedByModerator = true;
  }
  return { ok: true };
}

export function getReviewsForActivity(activityId: string, viewerId?: string): ActivityReview[] {
  const store = getTrustStore();
  const blocked = new Set(viewerId ? store.blockedUsersByViewer[viewerId] ?? [] : []);
  return clone(
    store.reviews
      .filter((r) => r.activityId === activityId && !r.removedByModerator)
      .filter((r) => !blocked.has(r.authorId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  );
}

export function getReviewsForOrganizer(organizerId: string): ActivityReview[] {
  const store = getTrustStore();
  return clone(
    store.reviews
      .filter((r) => r.organizerId === organizerId && !r.removedByModerator)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  );
}

export function canUserReviewActivity(activityId: string, userId: string): {
  eligible: boolean;
  reason?: string;
  hasExistingReview: boolean;
} {
  const store = getTrustStore();
  const activity = store.activities.find((a) => a.id === activityId);
  if (!activity) {
    return { eligible: false, reason: 'Activitatea nu există.', hasExistingReview: false };
  }
  const hasExistingReview = store.reviews.some(
    (r) => r.activityId === activityId && r.authorId === userId && !r.removedByModerator
  );
  if (activity.organizerId === userId) {
    return {
      eligible: false,
      reason: 'Organizatorul nu poate lăsa recenzie la propria activitate.',
      hasExistingReview,
    };
  }
  if (!activity.isEnded) {
    return {
      eligible: false,
      reason: 'Recenziile devin disponibile doar după încheierea activității.',
      hasExistingReview,
    };
  }
  const verifiedAtt = store.attendanceRecords.some(
    (r) =>
      r.activityId === activityId &&
      r.userId === userId &&
      r.status === 'VERIFIED_ATTENDANCE'
  );
  if (!verifiedAtt) {
    return {
      eligible: false,
      reason: 'Doar participanții cu prezență verificată pot lăsa o recenzie.',
      hasExistingReview,
    };
  }
  return { eligible: !hasExistingReview, hasExistingReview };
}

export async function submitActivityReview(input: {
  activityId: string;
  authorId: string;
  authorName: string;
  authorPhotoKey: PhotoKey;
  authorVerified?: boolean;
  rating?: number;
  categories?: ActivityReview['categories'];
  feedback: string;
}): Promise<{ ok: boolean; statusCode?: number; error?: string; review?: ActivityReview }> {
  return withResourceLock(`reviews:${input.activityId}:${input.authorId}`, () => {
    const store = getTrustStore();
    const activity = store.activities.find((a) => a.id === input.activityId);
    if (!activity) return { ok: false, statusCode: 404, error: 'Activitatea nu există.' };

    const check = canUserReviewActivity(input.activityId, input.authorId);
    if (check.hasExistingReview) {
      return {
        ok: false,
        statusCode: 409,
        error: 'Ai trimis deja o recenzie pentru această activitate; o poți edita mai jos.',
      };
    }
    if (!check.eligible) {
      return {
        ok: false,
        statusCode: 403,
        error: check.reason || 'Nu îndeplinești criteriile pentru a trimite o recenzie.',
      };
    }

    const cleanFeedback = input.feedback.replace(/<[^>]*>/g, '').trim();
    if (cleanFeedback.length < 10 || cleanFeedback.length > 600) {
      return {
        ok: false,
        statusCode: 400,
        error: 'Recenzia trebuie să conțină între 10 și 600 de caractere.',
      };
    }

    if (
      input.rating !== undefined &&
      (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5)
    ) {
      return { ok: false, statusCode: 400, error: 'Evaluarea cu stele trebuie să fie între 1 și 5.' };
    }

    const review: ActivityReview = {
      id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      activityId: activity.id,
      activityTitle: activity.title,
      organizerId: activity.organizerId,
      authorId: input.authorId,
      authorName: input.authorName,
      authorPhotoKey: input.authorPhotoKey,
      authorVerified: input.authorVerified,
      rating: input.rating,
      categories: input.categories,
      feedback: cleanFeedback,
      createdAt: new Date().toISOString(),
    };
    store.reviews.unshift(review);
    return { ok: true, review: clone(review) };
  });
}

export async function editActivityReview(input: {
  activityId?: string;
  reviewId: string;
  actorId: string;
  rating?: number;
  categories?: ActivityReview['categories'];
  feedback: string;
}): Promise<{ ok: boolean; statusCode?: number; error?: string; review?: ActivityReview }> {
  const store = getTrustStore();
  const review = store.reviews.find(
    (r) =>
      r.id === input.reviewId &&
      !r.removedByModerator &&
      (!input.activityId || r.activityId === input.activityId)
  );
  if (!review) return { ok: false, statusCode: 404, error: 'Recenzia nu a fost găsită.' };

  // Strict requirement: organizers CANNOT edit or delete reviews left by others
  if (review.authorId !== input.actorId) {
    return {
      ok: false,
      statusCode: 403,
      error:
        'Organizatorii și ceilalți utilizatori nu pot edita sau șterge recenziile altor participanți.',
    };
  }

  const cleanFeedback = input.feedback.replace(/<[^>]*>/g, '').trim();
  if (cleanFeedback.length < 10 || cleanFeedback.length > 600) {
    return {
      ok: false,
      statusCode: 400,
      error: 'Recenzia trebuie să conțină între 10 și 600 de caractere.',
    };
  }

  if (input.rating !== undefined) review.rating = input.rating;
  if (input.categories !== undefined) review.categories = input.categories;
  review.feedback = cleanFeedback;
  review.updatedAt = new Date().toISOString();
  return { ok: true, review: clone(review) };
}

// --- BLOCKING TRANSITION & MODERATION ---

export async function handleSafetyBlockTransition(input: {
  viewerId: string;
  blockedUserId: string;
  blockedUserName: string;
}): Promise<{ transitionedPlans: string[] }> {
  const store = getTrustStore();
  const existing = store.blockedUsersByViewer[input.viewerId] ?? [];
  if (!existing.includes(input.blockedUserId)) {
    store.blockedUsersByViewer[input.viewerId] = [...existing, input.blockedUserId];
  }

  const transitionedPlans: string[] = [];
  for (const plan of store.plans) {
    const viewerInPlan = isPlanParticipant(plan, input.viewerId);
    const blockedInPlan =
      plan.partnerId === input.blockedUserId ||
      plan.confirmations.some((c) => c.userId === input.blockedUserId);

    if (
      plan.lifecycleStatus !== 'CANCELLED' &&
      plan.lifecycleStatus !== 'COMPLETED' &&
      viewerInPlan &&
      blockedInPlan
    ) {
      if (plan.type === 'meetup') {
        plan.lifecycleStatus = 'CANCELLED';
        plan.status = 'cancelled';
        plan.cancelledBySafety = true;
        plan.subtitle = 'Întâlnire închisă în siguranță';
        plan.lastUpdatedAt = new Date().toISOString();
        appendPlanEvent(store, {
          planId: plan.id,
          toStatus: 'CANCELLED',
          actorId: 'system',
          actorName: 'Centru de siguranță',
          summary: 'Planul 1-la-1 a fost închis automat la activarea blocării.',
        });
        transitionedPlans.push(plan.id);
      }
    }
  }

  return { transitionedPlans };
}

export function getAggregateAnalytics(): TrustAnalyticsMetrics {
  const store = getTrustStore();
  const totalPlansCount = store.plans.length;
  const confirmedPlansCount = store.plans.filter(
    (p) =>
      p.lifecycleStatus === 'CONFIRMED' ||
      p.lifecycleStatus === 'RESCHEDULED' ||
      p.lifecycleStatus === 'COMPLETED' ||
      p.lifecycleStatus === 'RECONFIRMATION_REQUIRED'
  ).length;
  const completedPlansCount = store.plans.filter(
    (p) => p.lifecycleStatus === 'COMPLETED'
  ).length;
  const cancelledAfterConfirmCount = store.plans.filter(
    (p) => p.lifecycleStatus === 'CANCELLED'
  ).length;

  const lateCancellationCount = store.attendanceRecords.filter(
    (r) => r.status === 'LATE_CANCELLATION'
  ).length;
  const verifiedNoShowCount = store.attendanceRecords.filter(
    (r) => r.status === 'VERIFIED_NO_SHOW'
  ).length;
  const eligibleAttendancesCount = store.attendanceRecords.filter(
    (r) =>
      r.status === 'VERIFIED_ATTENDANCE' ||
      r.status === 'LATE_CANCELLATION' ||
      r.status === 'VERIFIED_NO_SHOW'
  ).length;

  return {
    windowLabel: `Ultimele ${RELIABILITY_WINDOW_DAYS} de zile (Mod demonstrativ)`,
    windowDays: RELIABILITY_WINDOW_DAYS,
    confirmedPlansCount,
    totalPlansCount,
    completedPlansCount,
    cancelledAfterConfirmCount,
    lateCancellationCount,
    verifiedNoShowCount,
    eligibleAttendancesCount,
    ...store.analyticsCounters,
  };
}
