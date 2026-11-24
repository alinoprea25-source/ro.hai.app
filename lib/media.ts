import type { StaticImageData } from 'next/image';
import type { PhotoKey } from '@/types/hai';

import welcomeClujImg from '@/src/assets/images/welcome_cluj_1795430066710.jpg';
import portraitIoanaImg from '@/src/assets/images/portrait_ioana_1795430066580.jpg';
import portraitAndreiImg from '@/src/assets/images/portrait_andrei_1795430066726.jpg';
import portraitMariaImg from '@/src/assets/images/portrait_maria_1795430066756.jpg';
import portraitRazvanImg from '@/src/assets/images/portrait_razvan_1795430067245.jpg';
import portraitElenaImg from '@/src/assets/images/portrait_elena_1795430066707.jpg';
import activityPadelImg from '@/src/assets/images/activity_padel_1795430067233.jpg';
import activityHikingImg from '@/src/assets/images/activity_hiking_1795430066329.jpg';
import activityCoffeeImg from '@/src/assets/images/activity_coffee_1795430066630.jpg';
import activityCinemaImg from '@/src/assets/images/activity_cinema_social_1795430066272.jpg';

export const PHOTO_ASSETS: Record<PhotoKey, StaticImageData> = {
  welcome: welcomeClujImg,
  ioana: portraitIoanaImg,
  andrei: portraitAndreiImg,
  maria: portraitMariaImg,
  razvan: portraitRazvanImg,
  elena: portraitElenaImg,
  padel: activityPadelImg,
  hiking: activityHikingImg,
  coffee: activityCoffeeImg,
  cinema: activityCinemaImg,
};

export function getPhotoAsset(key: PhotoKey): StaticImageData {
  return PHOTO_ASSETS[key] ?? welcomeClujImg;
}
