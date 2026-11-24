import type {
  AttendanceDispute,
  AttendanceRecord,
  AttendanceRecordStatus,
  ReliabilityBreakdown,
  ReliabilitySummary,
} from '@/types/hai';

export const RELIABILITY_WINDOW_DAYS = 180;
export const RELIABILITY_MIN_RECORDS = 5;

export const RELIABILITY_WEIGHTS = {
  verifiedAttendance: 1.0,
  lateCancellation: 0.5,
  verifiedNoShow: 0.0,
} as const;

export const RELIABILITY_POLICY_RO =
  'Scorul „Fiabilitate la activități” măsoară exclusiv consecvența participării la activitățile de grup din ultimele 6 luni (180 de zile). Nu reprezintă o evaluare morală, nu măsoară siguranța personală și nu garantează comportamentul altor persoane. Anulările timpurii, anulările din motive de siguranță, anulările organizatorului, invitațiile neconfirmate, erorile tehnice și înregistrările aflate în contestație sunt excluse automat.';

const BUCHAREST_TZ = 'Europe/Bucharest';

function getTimeZoneOffsetMinutes(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = dtf.formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== 'literal') map[p.type] = p.value;
  }
  const hour = map.hour === '24' ? '00' : map.hour;
  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(hour),
    Number(map.minute),
    Number(map.second)
  );
  return Math.round((asUtc - date.getTime()) / 60_000);
}

/**
 * Converts a local date & time in Europe/Bucharest into an accurate UTC Date,
 * accounting for EET (+02:00) and EEST (+03:00) DST transitions.
 */
export function parseBucharestDateTime(isoDate: string, time: string): Date {
  const [y, m, d] = isoDate.split('-').map((n) => Number(n));
  const [hh, mm] = time.split(':').map((n) => Number(n));
  if (!y || !m || !d || Number.isNaN(hh) || Number.isNaN(mm)) {
    return new Date();
  }
  const utcGuess = new Date(Date.UTC(y, m - 1, d, hh, mm, 0));
  const offset1 = getTimeZoneOffsetMinutes(utcGuess, BUCHAREST_TZ);
  const adjusted1 = new Date(utcGuess.getTime() - offset1 * 60_000);
  // Re-evaluate at adjusted instant to catch DST boundary crossings accurately
  const offset2 = getTimeZoneOffsetMinutes(adjusted1, BUCHAREST_TZ);
  if (offset2 !== offset1) {
    return new Date(utcGuess.getTime() - offset2 * 60_000);
  }
  return adjusted1;
}

export function formatBucharestDateTime(isoString: string): string {
  try {
    return new Intl.DateTimeFormat('ro-RO', {
      timeZone: BUCHAREST_TZ,
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(isoString));
  } catch {
    return isoString;
  }
}

export function hoursUntilBucharestEvent(
  isoDate: string,
  time: string,
  now: Date = new Date()
): number {
  const eventInstant = parseBucharestDateTime(isoDate, time);
  return (eventInstant.getTime() - now.getTime()) / 3_600_000;
}

const EXCLUDED_STATUSES: Set<AttendanceRecordStatus> = new Set([
  'EARLY_CANCELLATION',
  'SAFETY_CANCELLATION',
  'ORGANIZER_CANCELLED',
  'UNCONFIRMED_INVITATION',
  'TECHNICAL_FAILURE',
  'DISPUTED',
]);

export function calculateReliability(
  userId: string,
  allRecords: AttendanceRecord[],
  allDisputes: AttendanceDispute[],
  now: Date = new Date()
): ReliabilityBreakdown {
  const windowEnd = new Date(now.getTime());
  const windowStart = new Date(
    now.getTime() - RELIABILITY_WINDOW_DAYS * 24 * 60 * 60 * 1000
  );

  const userRecords = allRecords
    .filter((r) => r.userId === userId)
    .filter((r) => {
      const eventTime = parseBucharestDateTime(r.eventDateIso, r.eventTime);
      return eventTime.getTime() >= windowStart.getTime() && eventTime.getTime() <= windowEnd.getTime() + 86_400_000 * 30;
    })
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));

  const openDisputedRecordIds = new Set(
    allDisputes
      .filter((d) => d.userId === userId && d.status === 'OPEN')
      .map((d) => d.recordId)
  );

  let eligibleCount = 0;
  let verifiedAttendanceCount = 0;
  let lateCancellationCount = 0;
  let verifiedNoShowCount = 0;
  let excludedCount = 0;
  let weightedSum = 0;

  for (const record of userRecords) {
    const hasOpenDispute =
      record.disputeStatus === 'OPEN' || openDisputedRecordIds.has(record.id);
    const excusedByDispute = record.disputeStatus === 'RESOLVED_EXCUSED';

    if (hasOpenDispute || excusedByDispute || EXCLUDED_STATUSES.has(record.status)) {
      excludedCount += 1;
      continue;
    }

    if (record.status === 'VERIFIED_ATTENDANCE') {
      eligibleCount += 1;
      verifiedAttendanceCount += 1;
      weightedSum += RELIABILITY_WEIGHTS.verifiedAttendance;
    } else if (record.status === 'LATE_CANCELLATION') {
      eligibleCount += 1;
      lateCancellationCount += 1;
      weightedSum += RELIABILITY_WEIGHTS.lateCancellation;
    } else if (record.status === 'VERIFIED_NO_SHOW') {
      eligibleCount += 1;
      verifiedNoShowCount += 1;
      weightedSum += RELIABILITY_WEIGHTS.verifiedNoShow;
    } else {
      excludedCount += 1;
    }
  }

  const isNewUser = eligibleCount < RELIABILITY_MIN_RECORDS;
  const score = isNewUser
    ? null
    : Math.max(0, Math.min(100, Math.round((100 * weightedSum) / eligibleCount)));

  const userDisputes = allDisputes
    .filter((d) => d.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return {
    userId,
    isNewUser,
    score,
    eligibleCount,
    verifiedAttendanceCount,
    lateCancellationCount,
    verifiedNoShowCount,
    excludedCount,
    lastCalculatedAt: now.toISOString(),
    windowStartIso: windowStart.toISOString(),
    windowEndIso: windowEnd.toISOString(),
    weights: { ...RELIABILITY_WEIGHTS },
    records: userRecords,
    disputes: userDisputes,
    policySummaryRo: RELIABILITY_POLICY_RO,
  };
}

export function toPublicReliabilitySummary(
  breakdown: ReliabilityBreakdown
): ReliabilitySummary {
  return {
    userId: breakdown.userId,
    isNewUser: breakdown.isNewUser,
    score: breakdown.score,
    eligibleCount: breakdown.eligibleCount,
    verifiedAttendanceCount: breakdown.verifiedAttendanceCount,
    lateCancellationCount: breakdown.lateCancellationCount,
    verifiedNoShowCount: breakdown.verifiedNoShowCount,
    excludedCount: breakdown.excludedCount,
    lastCalculatedAt: breakdown.lastCalculatedAt,
  };
}
