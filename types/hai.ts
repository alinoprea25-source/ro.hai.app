export type MainTab = 'home' | 'activities' | 'create' | 'messages' | 'profile';

export type ScreenId =
  | 'welcome'
  | 'auth'
  | 'onboarding'
  | 'main'
  | 'activity-detail'
  | 'plan-detail'
  | 'conversation'
  | 'safety'
  | 'settings';

export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export type ActivityCategory = 'Sport' | 'Social' | 'Outdoor' | 'Cultură';

export type RomanianCity =
  | 'Cluj-Napoca'
  | 'București'
  | 'Timișoara'
  | 'Brașov'
  | 'Sibiu'
  | 'Iași';

export type PhotoKey =
  | 'welcome'
  | 'ioana'
  | 'andrei'
  | 'maria'
  | 'razvan'
  | 'elena'
  | 'padel'
  | 'hiking'
  | 'coffee'
  | 'cinema';

// --- PLAN LIFECYCLE & TRUST TYPES ---

export type PlanLifecycleStatus =
  | 'PROPOSED'
  | 'AWAITING_CONFIRMATION'
  | 'CONFIRMED'
  | 'RECONFIRMATION_REQUIRED'
  | 'CHANGE_PROPOSED'
  | 'RESCHEDULED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'DISPUTED';

export interface PlanConfirmation {
  userId: string;
  userName: string;
  photoKey: PhotoKey;
  isVerified?: boolean;
  confirmed: boolean;
  reconfirmed: boolean;
  confirmedAt?: string;
}

export interface PlanProposedSlot {
  id: string;
  dateLabel: string;
  isoDate: string;
  time: string;
  location: string;
}

export interface PlanChangeProposal {
  id: string;
  planId: string;
  proposedByUserId: string;
  proposedByName: string;
  kind: 'day' | 'time' | 'location' | 'mixed';
  slots: PlanProposedSlot[];
  note?: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  acceptedSlotId?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface PlanStatusEvent {
  id: string;
  planId: string;
  fromStatus?: PlanLifecycleStatus;
  toStatus: PlanLifecycleStatus;
  actorId: string;
  actorName: string;
  summary: string;
  createdAt: string;
}

export interface ReconfirmationSettings {
  enabled: boolean;
  hoursBefore: number; // e.g. 24
  sendFollowUpReminder: boolean;
  autoReleaseWaitlistSpot: boolean; // group activities only
}

// --- WAITLIST TYPES ---

export interface WaitlistEntry {
  id: string;
  activityId: string;
  userId: string;
  userName: string;
  photoKey: PhotoKey;
  isVerified?: boolean;
  joinedAt: string;
  position: number;
  status: 'WAITING' | 'OFFERED' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
}

export interface WaitlistOffer {
  id: string;
  activityId: string;
  userId: string;
  userName: string;
  offeredAt: string;
  expiresAt: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
}

// --- ATTENDANCE & RELIABILITY TYPES ---

export type AttendanceRecordStatus =
  | 'VERIFIED_ATTENDANCE'
  | 'EARLY_CANCELLATION'
  | 'LATE_CANCELLATION'
  | 'VERIFIED_NO_SHOW'
  | 'SAFETY_CANCELLATION'
  | 'ORGANIZER_CANCELLED'
  | 'UNCONFIRMED_INVITATION'
  | 'TECHNICAL_FAILURE'
  | 'DISPUTED';

export interface AttendanceRecord {
  id: string;
  userId: string;
  activityId: string;
  activityTitle: string;
  eventDateIso: string; // YYYY-MM-DD
  eventTime: string; // HH:MM
  status: AttendanceRecordStatus;
  verifiedBy: 'event_code' | 'organizer_confirmation' | 'system_cancellation' | 'safety_override';
  checkInCodeUsed?: string;
  recordedAt: string;
  disputeNote?: string;
  disputeStatus?: 'NONE' | 'OPEN' | 'RESOLVED_EXCUSED' | 'RESOLVED_UPHELD';
}

export interface AttendanceDispute {
  id: string;
  recordId: string;
  userId: string;
  userName: string;
  activityId: string;
  activityTitle: string;
  reason: string;
  status: 'OPEN' | 'RESOLVED_EXCUSED' | 'RESOLVED_UPHELD';
  moderatorNote?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface ReliabilitySummary {
  userId: string;
  isNewUser: boolean;
  score: number | null; // 0..100 when eligibleCount >= 5, else null
  eligibleCount: number;
  verifiedAttendanceCount: number;
  lateCancellationCount: number;
  verifiedNoShowCount: number;
  excludedCount: number;
  lastCalculatedAt: string;
}

export interface ReliabilityBreakdown extends ReliabilitySummary {
  windowStartIso: string;
  windowEndIso: string;
  weights: {
    verifiedAttendance: number;
    lateCancellation: number;
    verifiedNoShow: number;
  };
  records: AttendanceRecord[];
  disputes: AttendanceDispute[];
  policySummaryRo: string;
}

// --- COMMENTS & VERIFIED REVIEWS ---

export interface ActivityComment {
  id: string;
  activityId: string;
  parentId?: string; // 1 reply level max
  authorId: string;
  authorName: string;
  authorPhotoKey: PhotoKey;
  authorCustomPhotoUrl?: string;
  authorVerified?: boolean;
  authorRole: 'Organizator' | 'Participant' | 'Membru';
  content: string;
  createdAt: string;
  updatedAt?: string;
  isDeleted?: boolean;
  removedByModerator?: boolean;
}

export interface ActivityReview {
  id: string;
  activityId: string;
  activityTitle: string;
  organizerId: string;
  authorId: string;
  authorName: string;
  authorPhotoKey: PhotoKey;
  authorVerified?: boolean;
  rating?: number; // 1..5 optional
  categories?: {
    organization?: number;
    accuracy?: number;
    overall?: number;
  };
  feedback: string;
  createdAt: string;
  updatedAt?: string;
  removedByModerator?: boolean;
}

export interface ModerationActionLog {
  id: string;
  moderatorId: string;
  targetType: 'comment' | 'review' | 'user' | 'activity' | 'dispute';
  targetId: string;
  action: 'REMOVED' | 'DISMISSED_REPORT' | 'APPEAL_GRANTED' | 'DISPUTE_EXCUSED' | 'DISPUTE_UPHELD';
  reason: string;
  createdAt: string;
}

export interface TrustAnalyticsMetrics {
  windowLabel: string;
  windowDays: number;
  confirmedPlansCount: number;
  totalPlansCount: number;
  completedPlansCount: number;
  cancelledAfterConfirmCount: number;
  lateCancellationCount: number;
  verifiedNoShowCount: number;
  eligibleAttendancesCount: number;
  reconfirmationRequestsCount: number;
  reconfirmationResponsesCount: number;
  waitlistSpotsOpenedCount: number;
  waitlistReplacementsAcceptedCount: number;
  rescheduleProposalsCount: number;
  rescheduleSuccessCount: number;
}

export interface DatingProfile {
  id: string;
  name: string;
  age: number;
  city: RomanianCity;
  occupation: string;
  bio: string;
  interests: string[];
  photoKey: PhotoKey;
  galleryKeys: PhotoKey[];
  verifiedDemo: boolean;
  isVerified: boolean;
  likesCurrentUser: boolean;
  lookingFor: string;
  distanceKm: number;
}

export interface ActivityItem {
  id: string;
  title: string;
  category: ActivityCategory;
  description: string;
  dateLabel: string;
  isoDate: string;
  time: string;
  city: RomanianCity;
  location: string;
  organizerId: string;
  organizerName: string;
  organizerPhotoKey: PhotoKey;
  organizerVerified?: boolean;
  maxParticipants: number;
  participants: {
    id: string;
    name: string;
    photoKey: PhotoKey;
    customPhotoUrl?: string;
    isVerified?: boolean;
  }[];
  priceLei: number | null;
  requiresApproval: boolean;
  privacyShowParticipants: boolean;
  autoReleaseWaitlistSpot?: boolean;
  reconfirmationDeadlineIso?: string;
  isEnded?: boolean;
  isCancelled?: boolean;
  checkInCode?: string;
  checkInCodeExpiresAt?: string;
  rules: string[];
  photoKey: PhotoKey;
  customImageUrl?: string;
}

export type PlanStatus = 'upcoming' | 'pending' | 'completed' | 'cancelled';

export interface PlanItem {
  id: string;
  type: 'activity' | 'organized' | 'meetup';
  activityId?: string;
  title: string;
  subtitle: string;
  dateLabel: string;
  isoDate?: string;
  time: string;
  city: RomanianCity;
  location: string;
  status: PlanStatus;
  lifecycleStatus: PlanLifecycleStatus;
  photoKey: PhotoKey;
  partnerId?: string;
  partnerName?: string;
  organizerId?: string;
  confirmations: PlanConfirmation[];
  reconfirmationDeadlineIso?: string;
  reconfirmationPolicyRo?: string;
  autoReleaseWaitlistSpot?: boolean;
  lastUpdatedAt: string;
  cancelledBySafety?: boolean;
  checkedIn?: boolean;
  sharedWithTrustedContact?: string;
}

export interface ChatMessage {
  id: string;
  senderId: 'me' | string;
  text: string;
  timestamp: string;
}

export interface ConversationItem {
  id: string;
  matchId: string;
  partnerId: string;
  partnerName: string;
  partnerAge: number;
  partnerCity: RomanianCity;
  partnerPhotoKey: PhotoKey;
  partnerVerified?: boolean;
  lastMessage: string;
  lastTime: string;
  unreadCount: number;
  messages: ChatMessage[];
}

export interface MatchItem {
  id: string;
  partnerId: string;
  partnerName: string;
  partnerAge: number;
  partnerCity: RomanianCity;
  partnerPhotoKey: PhotoKey;
  partnerVerified?: boolean;
  matchedAt: string;
  hasConversation: boolean;
}

export type NotificationCategory =
  | 'match'
  | 'activity'
  | 'plan'
  | 'safety'
  | 'plan_invite'
  | 'plan_accepted'
  | 'plan_confirmed'
  | 'reconfirmation_upcoming'
  | 'reconfirmation_deadline'
  | 'plan_change_proposed'
  | 'plan_cancelled'
  | 'waitlist_offer'
  | 'waitlist_accepted'
  | 'activity_rescheduled'
  | 'comment_reply';

export interface NotificationItem {
  id: string;
  userId?: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
  type: NotificationCategory;
  planId?: string;
  activityId?: string;
  idempotencyKey?: string;
}

export interface TrustedContact {
  id: string;
  name: string;
  relation: string;
  contactInfo: string;
}

export interface SafetyReport {
  id: string;
  reporterId?: string;
  targetType: 'user' | 'activity' | 'comment' | 'review';
  targetId: string;
  targetTitle: string;
  reason: string;
  details: string;
  createdAt: string;
  status: 'în analiză' | 'revizuit' | 'eliminat' | 'respins';
  appealNote?: string;
  appealStatus?: 'NONE' | 'PENDING' | 'GRANTED';
}

export interface VerificationSubmission {
  id: string;
  userId: string;
  userName: string;
  poseId: string;
  poseInstruction: string;
  photoDataUrl: string;
  status: VerificationStatus;
  reviewNote?: string;
  submittedAt: string;
  reviewedAt?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  age: number;
  city: RomanianCity;
  occupation: string;
  bio: string;
  interests: string[];
  activityPreferences: ActivityCategory[];
  photoKey: PhotoKey;
  customPhotoUrl?: string;
  email: string;
  isAdultConfirmed: boolean;
  hasCompletedOnboarding: boolean;
  verificationStatus: VerificationStatus;
  verificationNote?: string;
  reconfirmationSettings: ReconfirmationSettings;
  discoveryPreferences: {
    city: RomanianCity | 'Toate';
    minAge: number;
    maxAge: number;
    maxDistanceKm: number;
    showMeInDiscovery: boolean;
    showParticipantsOnJoinedActivities: boolean;
    notificationsMatches: boolean;
    notificationsActivities: boolean;
    notificationsSafety: boolean;
  };
}

export type SubscriptionTier = 'free' | 'hai_plus';

export type SubscriptionPlatform = 'android' | 'ios' | 'web' | 'none';

export interface SubscriptionStatusSnapshot {
  tier: SubscriptionTier;
  isActive: boolean;
  entitlementId: string;
  productId?: string;
  platform: SubscriptionPlatform;
  expiresAt?: string;
  willRenew: boolean;
  managementUrl?: string;
  source: 'revenuecat_sdk' | 'revenuecat_server' | 'unconfigured';
}

export interface SubscriptionPackageOption {
  identifier: string;
  packageType: string;
  title: string;
  description: string;
  priceString: string;
  periodLabel: string;
}

