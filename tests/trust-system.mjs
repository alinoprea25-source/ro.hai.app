import assert from 'node:assert/strict';

const BASE = 'http://localhost:3000';

async function api(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('Running HAI. Plan Lifecycle, Waitlist, Reliability, Comments & Reviews tests...\n');

  // 1. Health check
  const health = await api('/api/health');
  assert.equal(health.status, 200, 'Health endpoint should return 200');

  // 2. Mutual Plan Confirmation
  const created = await api('/api/plans', {
    method: 'POST',
    body: JSON.stringify({
      action: 'create_plan',
      type: 'meetup',
      title: 'Test Cafea Test',
      dateLabel: 'Sâmbătă, 5 dec',
      isoDate: '2026-12-05',
      time: '18:00',
      city: 'Cluj-Napoca',
      location: 'Piața Muzeului',
      creatorId: 'demo-user-vlad',
      creatorName: 'Vlad',
      partnerId: 'profile-ioana',
      partnerName: 'Ioana',
    }),
  });
  assert.equal(created.status, 200);
  assert.equal(
    created.data.plan.lifecycleStatus,
    'AWAITING_CONFIRMATION',
    'New meetup must start in AWAITING_CONFIRMATION until partner confirms'
  );
  const planId = created.data.plan.id;

  const confirmedByIoana = await api('/api/plans', {
    method: 'POST',
    body: JSON.stringify({
      action: 'confirm',
      planId,
      userId: 'profile-ioana',
      userName: 'Ioana',
    }),
  });
  assert.equal(confirmedByIoana.status, 200);
  assert.equal(
    confirmedByIoana.data.plan.lifecycleStatus,
    'CONFIRMED',
    'Plan becomes CONFIRMED only after both participants accept'
  );

  // 3. One-Tap Reschedule resets confirmations & prevents unilateral self-accept
  const proposalRes = await api('/api/plans', {
    method: 'POST',
    body: JSON.stringify({
      action: 'propose_changes',
      planId,
      userId: 'demo-user-vlad',
      userName: 'Vlad',
      kind: 'day',
      slots: [
        {
          id: 'opt-1',
          dateLabel: 'Duminică, 6 dec',
          isoDate: '2026-12-06',
          time: '17:00',
          location: 'Parcul Central',
        },
        {
          id: 'opt-2',
          dateLabel: 'Luni, 7 dec',
          isoDate: '2026-12-07',
          time: '19:00',
          location: 'Str. Eroilor',
        },
      ],
    }),
  });
  assert.equal(proposalRes.status, 200);
  assert.equal(proposalRes.data.plan.lifecycleStatus, 'CHANGE_PROPOSED');
  const proposalId = proposalRes.data.proposal.id;

  const selfAccept = await api('/api/plans', {
    method: 'POST',
    body: JSON.stringify({
      action: 'respond_proposal',
      proposalId,
      userId: 'demo-user-vlad',
      userName: 'Vlad',
      decision: 'ACCEPT',
      selectedSlotId: 'opt-1',
    }),
  });
  assert.equal(selfAccept.status, 400, 'Proposer cannot unilaterally accept their own proposal');

  const partnerAccept = await api('/api/plans', {
    method: 'POST',
    body: JSON.stringify({
      action: 'respond_proposal',
      proposalId,
      userId: 'profile-ioana',
      userName: 'Ioana',
      decision: 'ACCEPT',
      selectedSlotId: 'opt-2',
    }),
  });
  assert.equal(partnerAccept.status, 200);
  assert.equal(partnerAccept.data.plan.lifecycleStatus, 'RESCHEDULED');
  assert.equal(partnerAccept.data.plan.time, '19:00');
  assert.equal(partnerAccept.data.plan.location, 'Str. Eroilor');

  // 4. Safety cancellation masking
  const safetyCancel = await api('/api/plans', {
    method: 'POST',
    body: JSON.stringify({
      action: 'cancel',
      planId,
      userId: 'demo-user-vlad',
      userName: 'Vlad',
      safetyReason: true,
      reasonText: 'Disconfort major',
    }),
  });
  assert.equal(safetyCancel.status, 200);
  assert.equal(safetyCancel.data.plan.lifecycleStatus, 'CANCELLED');
  assert.equal(
    safetyCancel.data.plan.subtitle,
    'Plan anulat (motiv confidențial)',
    'Safety reason must be masked from subtitle'
  );
  assert.equal(safetyCancel.data.attendanceClassification, 'SAFETY_CANCELLATION');

  // 5. Private 1-to-1 dating check-in blocked + Group check-in works
  const datingCheckIn = await api('/api/attendance', {
    method: 'POST',
    body: JSON.stringify({
      action: 'check_in_code',
      planId: 'plan-2',
      userId: 'demo-user-vlad',
      code: 'ANY123',
    }),
  });
  assert.equal(datingCheckIn.status, 400, '1-to-1 dating meetups must refuse check-in tracking');

  const badGroupCheckIn = await api('/api/attendance', {
    method: 'POST',
    body: JSON.stringify({
      action: 'check_in_code',
      activityId: 'act-padel-cluj',
      userId: 'demo-user-vlad',
      code: 'WRONG',
    }),
  });
  assert.equal(badGroupCheckIn.status, 400);

  const okGroupCheckIn = await api('/api/attendance', {
    method: 'POST',
    body: JSON.stringify({
      action: 'check_in_code',
      activityId: 'act-padel-cluj',
      userId: 'demo-user-vlad',
      code: 'PAD428',
    }),
  });
  assert.equal(okGroupCheckIn.status, 200);
  assert.equal(okGroupCheckIn.data.record.status, 'VERIFIED_ATTENDANCE');

  // 6. Waitlist ordering, concurrency & expiry advancement
  const wlJoin1 = await api('/api/waitlist', {
    method: 'POST',
    body: JSON.stringify({
      action: 'join',
      activityId: 'act-cafea-conversatie',
      userId: 'profile-stefan',
      userName: 'Ștefan',
    }),
  });
  assert.equal(wlJoin1.status, 200);
  assert.equal(wlJoin1.data.resultMode, 'waitlisted');

  // Concurrent duplicate join test
  const [c1, c2] = await Promise.all([
    api('/api/waitlist', {
      method: 'POST',
      body: JSON.stringify({
        action: 'join',
        activityId: 'act-cafea-conversatie',
        userId: 'profile-daria',
        userName: 'Daria',
      }),
    }),
    api('/api/waitlist', {
      method: 'POST',
      body: JSON.stringify({
        action: 'join',
        activityId: 'act-cafea-conversatie',
        userId: 'profile-daria',
        userName: 'Daria',
      }),
    }),
  ]);
  const modes = [c1.data.resultMode, c2.data.resultMode];
  assert.ok(
    modes.includes('waitlisted') && modes.includes('already_waitlisted'),
    'Atomic waitlist lock must prevent duplicate waitlist entries under concurrency'
  );

  // Expire Vlad's seeded pending offer using a future simulated timestamp -> advances to Tudor
  const expireRes = await api('/api/waitlist', {
    method: 'POST',
    body: JSON.stringify({
      action: 'expire_stale',
      activityId: 'act-cafea-conversatie',
      simulatedNowIso: new Date(Date.now() + 5 * 3600_000).toISOString(),
    }),
  });
  assert.equal(expireRes.status, 200);
  assert.equal(expireRes.data.expired, true);
  assert.equal(
    expireRes.data.nextOffer?.userId,
    'profile-tudor',
    'Expired offer must automatically advance to next waiting person (Tudor)'
  );

  // 7. Reliability math, <5 threshold, public privacy & read-only enforcement
  const mariaRel = await api('/api/reliability?userId=profile-maria&viewerId=demo-user-vlad');
  assert.equal(mariaRel.status, 200);
  assert.equal(mariaRel.data.summary.isNewUser, true);
  assert.equal(mariaRel.data.summary.score, null);
  assert.equal(mariaRel.data.breakdown, undefined, 'Non-owner must never see private attendance breakdown');

  const ioanaFromOther = await api('/api/reliability?userId=profile-ioana&viewerId=demo-user-vlad');
  assert.equal(ioanaFromOther.status, 200);
  assert.equal(ioanaFromOther.data.summary.score, 100);
  assert.equal(ioanaFromOther.data.isOwner, false);
  assert.equal(ioanaFromOther.data.breakdown, undefined);

  const tamperRel = await api('/api/reliability', { method: 'POST', body: JSON.stringify({ score: 100 }) });
  assert.equal(tamperRel.status, 403, 'Direct score modification must be blocked with 403');

  // 8. Comments: Private restriction, 1-level reply enforcement, and author ownership
  const privateCommentsDenied = await api(
    '/api/activities/act-atelier-ceramica/comments?viewerId=demo-user-vlad'
  );
  assert.equal(
    privateCommentsDenied.status,
    403,
    'Non-member cannot read comments on private activity'
  );

  const postParent = await api('/api/activities/act-padel-cluj/comments', {
    method: 'POST',
    body: JSON.stringify({
      authorId: 'demo-user-vlad',
      authorName: 'Vlad',
      content: 'Întrebare test: avem apă disponibilă la teren?',
    }),
  });
  assert.equal(postParent.status, 200);
  const parentId = postParent.data.comment.id;

  const postReply = await api('/api/activities/act-padel-cluj/comments', {
    method: 'POST',
    body: JSON.stringify({
      authorId: 'profile-ioana',
      authorName: 'Ioana',
      content: 'Da, există dozator la recepție.',
      parentId,
    }),
  });
  assert.equal(postReply.status, 200);
  const replyId = postReply.data.comment.id;

  const postNestedReply = await api('/api/activities/act-padel-cluj/comments', {
    method: 'POST',
    body: JSON.stringify({
      authorId: 'demo-user-vlad',
      authorName: 'Vlad',
      content: 'Încercare nivel 2',
      parentId: replyId,
    }),
  });
  assert.equal(postNestedReply.status, 400, 'Nested reply deeper than 1 level must fail');

  const unauthorizedEditComment = await api('/api/activities/act-padel-cluj/comments', {
    method: 'PATCH',
    body: JSON.stringify({
      commentId: parentId,
      actorId: 'profile-ioana',
      content: 'Modificare neautorizată',
    }),
  });
  assert.equal(unauthorizedEditComment.status, 403);

  // 9. Verified Post-Event Reviews & Organizer Edit Prohibition
  const reviewNotEnded = await api('/api/activities/act-padel-cluj/reviews', {
    method: 'POST',
    body: JSON.stringify({
      authorId: 'demo-user-vlad',
      authorName: 'Vlad',
      rating: 5,
      feedback: 'Activitatea nici măcar nu s-a încheiat încă.',
    }),
  });
  assert.equal(reviewNotEnded.status, 403, 'Cannot submit review before activity ends');

  const reviewNonAttendee = await api('/api/activities/act-tur-cetatuie/reviews', {
    method: 'POST',
    body: JSON.stringify({
      authorId: 'profile-maria',
      authorName: 'Maria',
      rating: 5,
      feedback: 'Nu am participat dar încerc să las o recenzie.',
    }),
  });
  assert.equal(reviewNonAttendee.status, 403, 'Non-verified attendee cannot submit review');

  const reviewOk = await api('/api/activities/act-tur-cetatuie/reviews', {
    method: 'POST',
    body: JSON.stringify({
      authorId: 'demo-user-vlad',
      authorName: 'Vlad',
      rating: 5,
      feedback: 'Organizare foarte bună, priveliște excelentă și grup punctual.',
    }),
  });
  assert.equal(reviewOk.status, 200);
  const reviewId = reviewOk.data.review.id;

  const duplicateReview = await api('/api/activities/act-tur-cetatuie/reviews', {
    method: 'POST',
    body: JSON.stringify({
      authorId: 'demo-user-vlad',
      authorName: 'Vlad',
      rating: 4,
      feedback: 'A doua recenzie ar trebui respinsă cu 409.',
    }),
  });
  assert.equal(duplicateReview.status, 409);

  const organizerTamperReview = await api('/api/activities/act-tur-cetatuie/reviews', {
    method: 'PATCH',
    body: JSON.stringify({
      reviewId,
      actorId: 'profile-ioana',
      feedback: 'Organizatorul încearcă să modifice recenzia participantului.',
    }),
  });
  assert.equal(
    organizerTamperReview.status,
    403,
    'Organizer must NEVER be able to edit another participant review'
  );

  // 10. Attendance Dispute & Moderator Recalculation
  const disputeRes = await api('/api/attendance', {
    method: 'POST',
    body: JSON.stringify({
      action: 'dispute_record',
      recordId: 'att-vlad-6',
      userId: 'demo-user-vlad',
      userName: 'Vlad',
      reason: 'Anunțasem în comentarii cu 15 ore înainte că nu ajung.',
    }),
  });
  assert.equal(disputeRes.status, 200);
  const disputeId = disputeRes.data.dispute.id;

  const vladAfterDispute = await api('/api/reliability?userId=demo-user-vlad&viewerId=demo-user-vlad');
  assert.equal(
    vladAfterDispute.data.summary.score,
    100,
    'Disputed record must be temporarily excluded until resolved, elevating score cleanly'
  );

  const nonModResolve = await api('/api/attendance', {
    method: 'POST',
    body: JSON.stringify({
      action: 'resolve_dispute',
      disputeId,
      outcome: 'RESOLVED_EXCUSED',
    }),
  });
  assert.equal(nonModResolve.status, 403, 'Non-moderator cannot resolve disputes');

  const modResolve = await api('/api/attendance', {
    method: 'POST',
    headers: { 'x-hai-demo-role': 'moderator-preview' },
    body: JSON.stringify({
      action: 'resolve_dispute',
      disputeId,
      outcome: 'RESOLVED_EXCUSED',
    }),
  });
  assert.equal(modResolve.status, 200);

  // 11. Reconfirmation scheduler evaluation idempotency
  const simFuture = '2026-11-26T20:00:00.000Z'; // ~22h before Nov 27 18:00 plan
  const eval1 = await api('/api/plans', {
    method: 'POST',
    body: JSON.stringify({ action: 'evaluate_reminders', simulatedNowIso: simFuture }),
  });
  assert.equal(eval1.status, 200);
  const eval2 = await api('/api/plans', {
    method: 'POST',
    body: JSON.stringify({ action: 'evaluate_reminders', simulatedNowIso: simFuture }),
  });
  assert.equal(eval2.status, 200);
  assert.equal(
    eval2.data.triggeredNotifications,
    0,
    'Idempotency key must prevent duplicate reconfirmation notifications'
  );

  console.log('ALL 11 END-TO-END TRUST & RELIABILITY TEST SUITES PASSED!');
}

runTests().catch((err) => {
  console.error('TEST FAILURE:', err);
  process.exit(1);
});
