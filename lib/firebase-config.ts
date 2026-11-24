export interface FirebaseReadinessStatus {
  isConfigured: boolean;
  mode: 'demo' | 'firebase';
  messagingProductionEnabled: boolean;
  reason: string;
}

export function getFirebaseReadiness(): FirebaseReadinessStatus {
  return {
    isConfigured: false,
    mode: 'demo',
    messagingProductionEnabled: false,
    reason:
      'Firebase Authentication și Cloud Firestore nu au fost încă configurate pentru acest proiect. Aplicația rulează în Mod demonstrativ cu date fictive.',
  };
}
