export interface PoseChallenge {
  id: string;
  title: string;
  instruction: string;
}

export const POSE_CHALLENGES: PoseChallenge[] = [
  {
    id: 'pose-peace-left',
    title: 'Semnul păcii lângă obraz',
    instruction: 'Privește spre cameră și ridică două degete (semnul păcii) lângă obrazul stâng.',
  },
  {
    id: 'pose-open-palm-chin',
    title: 'Palmă deschisă sub bărbie',
    instruction: 'Privește clar spre cameră și atinge-ți ușor bărbia cu dosul palmei.',
  },
  {
    id: 'pose-ok-right',
    title: 'Semnul OK cu mâna dreaptă',
    instruction: 'Zâmbește natural și formează semnul OK cu mâna dreaptă în dreptul umărului.',
  },
];
