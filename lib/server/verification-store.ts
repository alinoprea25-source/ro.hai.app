import { POSE_CHALLENGES, type PoseChallenge } from '@/lib/constants/verification';
import type { VerificationStatus, VerificationSubmission } from '@/types/hai';

export { POSE_CHALLENGES, type PoseChallenge };

declare global {
  var __haiVerificationStore: Map<string, VerificationSubmission> | undefined;
}

function getVerificationStore(): Map<string, VerificationSubmission> {
  if (!globalThis.__haiVerificationStore) {
    globalThis.__haiVerificationStore = new Map<string, VerificationSubmission>();
  }
  return globalThis.__haiVerificationStore;
}

export function saveVerificationSubmission(
  submission: VerificationSubmission
): VerificationSubmission {
  getVerificationStore().set(submission.id, submission);
  return submission;
}

export function getVerificationStatusForUser(userId: string): {
  status: VerificationStatus;
  reviewNote?: string;
  latestId?: string;
} {
  const userSubs = Array.from(getVerificationStore().values())
    .filter((s) => s.userId === userId)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

  if (userSubs.length === 0) {
    return { status: 'unverified' };
  }

  return {
    status: userSubs[0].status,
    reviewNote: userSubs[0].reviewNote,
    latestId: userSubs[0].id,
  };
}

export function listVerificationSubmissionsForAdmin(): VerificationSubmission[] {
  return Array.from(getVerificationStore().values()).sort((a, b) =>
    b.submittedAt.localeCompare(a.submittedAt)
  );
}

export function reviewVerificationSubmission(
  submissionId: string,
  decision: 'verified' | 'rejected',
  reviewNote?: string
): VerificationSubmission | null {
  const store = getVerificationStore();
  const existing = store.get(submissionId);
  if (!existing) return null;

  const updated: VerificationSubmission = {
    ...existing,
    status: decision,
    reviewNote:
      reviewNote ||
      (decision === 'verified' ? 'Fotografie validată.' : 'Postura nu este clar vizibilă.'),
    reviewedAt: new Date().toISOString(),
  };
  store.set(submissionId, updated);
  return updated;
}

export function resetVerificationStoreForTests(): void {
  globalThis.__haiVerificationStore = new Map<string, VerificationSubmission>();
}
