import type { User as FirebaseUser } from 'firebase/auth';
import {
  deleteField,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import type {
  ActivityCategory,
  PhotoKey,
  RomanianCity,
  UserProfile,
} from '@/types/hai';

const VALID_CITIES: RomanianCity[] = [
  'Cluj-Napoca',
  'București',
  'Timișoara',
  'Brașov',
  'Sibiu',
  'Iași',
];

const VALID_PHOTO_KEYS: PhotoKey[] = [
  'welcome',
  'ioana',
  'andrei',
  'maria',
  'razvan',
  'elena',
  'padel',
  'hiking',
  'coffee',
  'cinema',
];

const VALID_CATEGORIES: ActivityCategory[] = ['Sport', 'Social', 'Outdoor', 'Cultură'];

function clampCity(city: string | undefined): RomanianCity {
  return VALID_CITIES.includes(city as RomanianCity) ? (city as RomanianCity) : 'Cluj-Napoca';
}

function clampPhotoKey(key: string | undefined): PhotoKey {
  return VALID_PHOTO_KEYS.includes(key as PhotoKey) ? (key as PhotoKey) : 'andrei';
}

function clampName(raw: string | null | undefined, email: string | null | undefined): string {
  const base = (raw || email?.split('@')[0] || 'Membru HAI').trim().slice(0, 60);
  return base.length >= 2 ? base : 'Membru';
}

function sanitizeInterests(items: string[] | undefined): string[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((s) => String(s).trim().slice(0, 40))
    .filter((s) => s.length >= 1)
    .slice(0, 8);
}

function sanitizeActivityPrefs(items: ActivityCategory[] | undefined): ActivityCategory[] {
  if (!Array.isArray(items)) return ['Social'];
  const clean = items.filter((c) => VALID_CATEGORIES.includes(c)).slice(0, 4);
  return clean.length > 0 ? clean : ['Social'];
}

export async function loadOrBootstrapFirebaseUser(
  fbUser: FirebaseUser
): Promise<UserProfile> {
  const uid = fbUser.uid;
  const email = fbUser.email || `${uid}@users.hai.ro`;

  const userRef = doc(db, 'users', uid);
  const profileRef = doc(db, 'profiles', uid);
  const prefsRef = doc(db, 'dating_preferences', uid);

  let userSnap;
  let profileSnap;
  let prefsSnap;

  try {
    [userSnap, profileSnap, prefsSnap] = await Promise.all([
      getDoc(userRef),
      getDoc(profileRef),
      getDoc(prefsRef),
    ]);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${uid}`);
  }

  const batch = writeBatch(db);
  let needsBootstrap = false;

  const defaultName = clampName(fbUser.displayName, email);

  if (!userSnap.exists()) {
    needsBootstrap = true;
    batch.set(userRef, {
      uid,
      email: email.slice(0, 160),
      isAdultConfirmed: true,
      hasCompletedOnboarding: false,
      verificationStatus: 'unverified',
      reconfirmationEnabled: true,
      reconfirmationHoursBefore: 24,
      reconfirmationFollowUp: true,
      autoReleaseWaitlistSpot: true,
      notificationsMatches: true,
      notificationsActivities: true,
      notificationsSafety: true,
      accountStatus: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  if (!profileSnap.exists()) {
    needsBootstrap = true;
    const photoUrl =
      fbUser.photoURL && fbUser.photoURL.length <= 2048 ? fbUser.photoURL : undefined;

    batch.set(profileRef, {
      uid,
      name: defaultName,
      age: 26,
      city: 'Cluj-Napoca',
      occupation: '',
      bio: '',
      interests: ['Cafea de specialitate', 'Social'],
      activityPreferences: ['Social', 'Outdoor'],
      photoKey: 'andrei',
      ...(photoUrl ? { customPhotoUrl: photoUrl } : {}),
      lookingFor: 'Conexiuni reale și activități în oraș',
      isVerified: false,
      showMeInDiscovery: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  if (!prefsSnap.exists()) {
    needsBootstrap = true;
    batch.set(prefsRef, {
      uid,
      city: 'Cluj-Napoca',
      minAge: 21,
      maxAge: 38,
      maxDistanceKm: 25,
      showMeInDiscovery: true,
      showParticipantsOnJoinedActivities: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  if (needsBootstrap) {
    try {
      await batch.commit();
      [userSnap, profileSnap, prefsSnap] = await Promise.all([
        getDoc(userRef),
        getDoc(profileRef),
        getDoc(prefsRef),
      ]);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
    }
  }

  const uData = userSnap.data() || {};
  const pData = profileSnap.data() || {};
  const dData = prefsSnap.data() || {};

  return {
    id: uid,
    email: typeof uData.email === 'string' ? uData.email : email,
    name: typeof pData.name === 'string' ? pData.name : defaultName,
    age: typeof pData.age === 'number' ? pData.age : 26,
    city: clampCity(pData.city),
    occupation: typeof pData.occupation === 'string' ? pData.occupation : '',
    bio: typeof pData.bio === 'string' ? pData.bio : '',
    interests: Array.isArray(pData.interests) ? pData.interests : [],
    activityPreferences: sanitizeActivityPrefs(pData.activityPreferences),
    photoKey: clampPhotoKey(pData.photoKey),
    customPhotoUrl:
      typeof pData.customPhotoUrl === 'string' ? pData.customPhotoUrl : undefined,
    isAdultConfirmed: Boolean(uData.isAdultConfirmed ?? true),
    hasCompletedOnboarding: Boolean(uData.hasCompletedOnboarding),
    verificationStatus:
      uData.verificationStatus === 'pending' ||
      uData.verificationStatus === 'verified' ||
      uData.verificationStatus === 'rejected'
        ? uData.verificationStatus
        : 'unverified',
    verificationNote:
      typeof uData.verificationNote === 'string' ? uData.verificationNote : undefined,
    reconfirmationSettings: {
      enabled: Boolean(uData.reconfirmationEnabled ?? true),
      hoursBefore:
        typeof uData.reconfirmationHoursBefore === 'number'
          ? uData.reconfirmationHoursBefore
          : 24,
      sendFollowUpReminder: Boolean(uData.reconfirmationFollowUp ?? true),
      autoReleaseWaitlistSpot: Boolean(uData.autoReleaseWaitlistSpot ?? true),
    },
    discoveryPreferences: {
      city:
        dData.city === 'Toate' ? 'Toate' : clampCity(dData.city as string | undefined),
      minAge: typeof dData.minAge === 'number' ? dData.minAge : 21,
      maxAge: typeof dData.maxAge === 'number' ? dData.maxAge : 38,
      maxDistanceKm: typeof dData.maxDistanceKm === 'number' ? dData.maxDistanceKm : 25,
      showMeInDiscovery: Boolean(dData.showMeInDiscovery ?? true),
      showParticipantsOnJoinedActivities: Boolean(
        dData.showParticipantsOnJoinedActivities ?? true
      ),
      notificationsMatches: Boolean(uData.notificationsMatches ?? true),
      notificationsActivities: Boolean(uData.notificationsActivities ?? true),
      notificationsSafety: Boolean(uData.notificationsSafety ?? true),
    },
  };
}

export async function saveFirebaseProfileAndAccount(
  uid: string,
  nextUser: UserProfile,
  options?: { markOnboardingCompleted?: boolean }
): Promise<void> {
  const batch = writeBatch(db);
  const profileRef = doc(db, 'profiles', uid);
  const userRef = doc(db, 'users', uid);
  const prefsRef = doc(db, 'dating_preferences', uid);

  const safeName = clampName(nextUser.name, nextUser.email);
  const safeAge = Math.max(18, Math.min(99, Math.round(nextUser.age || 26)));
  const safeCity = clampCity(nextUser.city);
  const safeOccupation = (nextUser.occupation || '').trim().slice(0, 80);
  const safeBio = (nextUser.bio || '').trim().slice(0, 300);
  const safeInterests = sanitizeInterests(nextUser.interests);
  const safeActPrefs = sanitizeActivityPrefs(nextUser.activityPreferences);
  const safePhotoKey = clampPhotoKey(nextUser.photoKey);

  const profilePatch: Record<string, unknown> = {
    name: safeName,
    age: safeAge,
    city: safeCity,
    occupation: safeOccupation,
    bio: safeBio,
    interests: safeInterests,
    activityPreferences: safeActPrefs,
    photoKey: safePhotoKey,
    showMeInDiscovery: Boolean(nextUser.discoveryPreferences.showMeInDiscovery),
    updatedAt: serverTimestamp(),
  };

  if (
    nextUser.customPhotoUrl &&
    nextUser.customPhotoUrl.startsWith('http') &&
    nextUser.customPhotoUrl.length <= 2048
  ) {
    profilePatch.customPhotoUrl = nextUser.customPhotoUrl;
  } else if (!nextUser.customPhotoUrl) {
    profilePatch.customPhotoUrl = deleteField();
  }

  batch.update(profileRef, profilePatch);

  const userPatch: Record<string, unknown> = {
    isAdultConfirmed: Boolean(nextUser.isAdultConfirmed),
    hasCompletedOnboarding: Boolean(
      options?.markOnboardingCompleted ?? nextUser.hasCompletedOnboarding
    ),
    reconfirmationEnabled: Boolean(nextUser.reconfirmationSettings.enabled),
    reconfirmationHoursBefore: Math.max(
      1,
      Math.min(72, Math.round(nextUser.reconfirmationSettings.hoursBefore || 24))
    ),
    reconfirmationFollowUp: Boolean(nextUser.reconfirmationSettings.sendFollowUpReminder),
    autoReleaseWaitlistSpot: Boolean(nextUser.reconfirmationSettings.autoReleaseWaitlistSpot),
    notificationsMatches: Boolean(nextUser.discoveryPreferences.notificationsMatches),
    notificationsActivities: Boolean(nextUser.discoveryPreferences.notificationsActivities),
    notificationsSafety: Boolean(nextUser.discoveryPreferences.notificationsSafety),
    updatedAt: serverTimestamp(),
  };

  batch.update(userRef, userPatch);

  const minAge = Math.max(18, Math.min(99, Math.round(nextUser.discoveryPreferences.minAge || 21)));
  const maxAge = Math.max(
    minAge,
    Math.min(99, Math.round(nextUser.discoveryPreferences.maxAge || 38))
  );

  batch.update(prefsRef, {
    city:
      nextUser.discoveryPreferences.city === 'Toate'
        ? 'Toate'
        : clampCity(nextUser.discoveryPreferences.city),
    minAge,
    maxAge,
    maxDistanceKm: Math.max(
      1,
      Math.min(500, Math.round(nextUser.discoveryPreferences.maxDistanceKm || 25))
    ),
    showMeInDiscovery: Boolean(nextUser.discoveryPreferences.showMeInDiscovery),
    showParticipantsOnJoinedActivities: Boolean(
      nextUser.discoveryPreferences.showParticipantsOnJoinedActivities
    ),
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `profiles/${uid}`);
  }
}

export async function updateFirebasePreferencesOnly(
  uid: string,
  nextUser: UserProfile
): Promise<void> {
  try {
    const batch = writeBatch(db);
    const minAge = Math.max(18, Math.min(99, Math.round(nextUser.discoveryPreferences.minAge || 21)));
    const maxAge = Math.max(
      minAge,
      Math.min(99, Math.round(nextUser.discoveryPreferences.maxAge || 38))
    );

    batch.update(doc(db, 'dating_preferences', uid), {
      city:
        nextUser.discoveryPreferences.city === 'Toate'
          ? 'Toate'
          : clampCity(nextUser.discoveryPreferences.city),
      minAge,
      maxAge,
      maxDistanceKm: Math.max(
        1,
        Math.min(500, Math.round(nextUser.discoveryPreferences.maxDistanceKm || 25))
      ),
      showMeInDiscovery: Boolean(nextUser.discoveryPreferences.showMeInDiscovery),
      showParticipantsOnJoinedActivities: Boolean(
        nextUser.discoveryPreferences.showParticipantsOnJoinedActivities
      ),
      updatedAt: serverTimestamp(),
    });

    batch.update(doc(db, 'profiles', uid), {
      showMeInDiscovery: Boolean(nextUser.discoveryPreferences.showMeInDiscovery),
      updatedAt: serverTimestamp(),
    });

    batch.update(doc(db, 'users', uid), {
      reconfirmationEnabled: Boolean(nextUser.reconfirmationSettings.enabled),
      reconfirmationHoursBefore: Math.max(
        1,
        Math.min(72, Math.round(nextUser.reconfirmationSettings.hoursBefore || 24))
      ),
      reconfirmationFollowUp: Boolean(nextUser.reconfirmationSettings.sendFollowUpReminder),
      autoReleaseWaitlistSpot: Boolean(nextUser.reconfirmationSettings.autoReleaseWaitlistSpot),
      notificationsMatches: Boolean(nextUser.discoveryPreferences.notificationsMatches),
      notificationsActivities: Boolean(nextUser.discoveryPreferences.notificationsActivities),
      notificationsSafety: Boolean(nextUser.discoveryPreferences.notificationsSafety),
      updatedAt: serverTimestamp(),
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `dating_preferences/${uid}`);
  }
}

export async function deleteFirebaseAccountDocs(uid: string): Promise<void> {
  try {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'dating_preferences', uid));
    batch.delete(doc(db, 'profiles', uid));
    batch.delete(doc(db, 'users', uid));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${uid}`);
  }
}

// Unused import guards for future helpers
export { doc, setDoc, updateDoc };
