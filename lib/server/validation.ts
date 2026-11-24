import type { ActivityCategory, RomanianCity } from '@/types/hai';

export const ALLOWED_CITIES: RomanianCity[] = [
  'Cluj-Napoca',
  'București',
  'Timișoara',
  'Brașov',
  'Sibiu',
  'Iași',
];

export const ALLOWED_CATEGORIES: ActivityCategory[] = [
  'Sport',
  'Social',
  'Outdoor',
  'Cultură',
];

export function sanitizePlainText(input: unknown, maxLength: number): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export interface ActivityPayloadInput {
  title: unknown;
  category: unknown;
  description: unknown;
  isoDate: unknown;
  time: unknown;
  city: unknown;
  location: unknown;
  maxParticipants: unknown;
  priceLei: unknown;
  requiresApproval: unknown;
}

export function validateActivityPayload(payload: ActivityPayloadInput): {
  valid: boolean;
  errors: string[];
  sanitized?: {
    title: string;
    category: ActivityCategory;
    description: string;
    isoDate: string;
    time: string;
    city: RomanianCity;
    location: string;
    maxParticipants: number;
    priceLei: number | null;
    requiresApproval: boolean;
  };
} {
  const errors: string[] = [];

  const title = sanitizePlainText(payload.title, 80);
  if (title.length < 4) {
    errors.push('Titlul activității trebuie să conțină cel puțin 4 caractere.');
  }

  const category = String(payload.category) as ActivityCategory;
  if (!ALLOWED_CATEGORIES.includes(category)) {
    errors.push('Categoria selectată nu este validă.');
  }

  const description = sanitizePlainText(payload.description, 600);
  if (description.length < 15) {
    errors.push('Descrierea trebuie să aibă cel puțin 15 caractere.');
  }

  const city = String(payload.city) as RomanianCity;
  if (!ALLOWED_CITIES.includes(city)) {
    errors.push('Orașul selectat nu este suportat.');
  }

  const location = sanitizePlainText(payload.location, 120);
  if (location.length < 4) {
    errors.push('Locația (cartier / punct de întâlnire) este obligatorie.');
  }

  const isoDate = sanitizePlainText(payload.isoDate, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    errors.push('Formatul datei este invalid.');
  }

  const time = sanitizePlainText(payload.time, 5);
  if (!/^\d{2}:\d{2}$/.test(time)) {
    errors.push('Formatul orei este invalid (HH:MM).');
  }

  const maxParticipants = Number(payload.maxParticipants);
  if (!Number.isInteger(maxParticipants) || maxParticipants < 2 || maxParticipants > 30) {
    errors.push('Numărul maxim de participanți trebuie să fie între 2 și 30.');
  }

  let priceLei: number | null = null;
  if (payload.priceLei !== null && payload.priceLei !== undefined && payload.priceLei !== '') {
    const parsedPrice = Number(payload.priceLei);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0 || parsedPrice > 2000) {
      errors.push('Costul estimat trebuie să fie între 0 și 2000 lei.');
    } else {
      priceLei = parsedPrice === 0 ? null : Math.round(parsedPrice);
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    sanitized: {
      title,
      category,
      description,
      isoDate,
      time,
      city,
      location,
      maxParticipants,
      priceLei,
      requiresApproval: Boolean(payload.requiresApproval),
    },
  };
}

export interface ReportPayloadInput {
  targetType: unknown;
  targetId: unknown;
  targetTitle: unknown;
  reason: unknown;
  details: unknown;
}

export function validateReportPayload(payload: ReportPayloadInput): {
  valid: boolean;
  errors: string[];
  sanitized?: {
    targetType: 'user' | 'activity' | 'comment' | 'review';
    targetId: string;
    targetTitle: string;
    reason: string;
    details: string;
  };
} {
  const errors: string[] = [];
  const targetType =
    payload.targetType === 'user' ||
    payload.targetType === 'activity' ||
    payload.targetType === 'comment' ||
    payload.targetType === 'review'
      ? payload.targetType
      : null;

  if (!targetType) {
    errors.push('Tipul raportării este invalid.');
  }

  const targetId = sanitizePlainText(payload.targetId, 80);
  if (!targetId) {
    errors.push('Identificatorul țintei lipsește.');
  }

  const targetTitle = sanitizePlainText(payload.targetTitle, 100) || 'Element raportat';
  const reason = sanitizePlainText(payload.reason, 100);
  if (reason.length < 3) {
    errors.push('Selectează un motiv valid pentru raportare.');
  }

  const details = sanitizePlainText(payload.details, 500);

  if (errors.length > 0 || !targetType) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    sanitized: {
      targetType,
      targetId,
      targetTitle,
      reason,
      details,
    },
  };
}
