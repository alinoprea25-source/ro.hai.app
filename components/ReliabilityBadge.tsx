'use client';

import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Scale,
  ShieldCheck,
  X,
} from 'lucide-react';
import type { ReliabilityBreakdown, ReliabilitySummary } from '@/types/hai';

interface InlineProps {
  summary?: ReliabilitySummary | null;
  compact?: boolean;
  onOpenExplain?: () => void;
}

/**
 * Unboxed inline reliability indicator adhering to zero-pill metadata rules.
 */
export function ReliabilityInlineLabel({
  summary,
  compact = false,
  onOpenExplain,
}: InlineProps) {
  if (!summary) return null;

  const isNew = summary.isNewUser || summary.score === null;

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-[#717680] dark:text-[#9CA3AF] tabular-nums">
      <ShieldCheck
        className={`h-3.5 w-3.5 shrink-0 ${
          isNew
            ? 'text-[#717680]'
            : (summary.score ?? 0) >= 85
            ? 'text-[#21866F] dark:text-[#34D399]'
            : 'text-[#D97706]'
        }`}
      />
      <span>
        {isNew ? (
          compact ? (
            'Utilizator nou'
          ) : (
            'Utilizator nou · Punctajul va apărea după suficiente activități evaluate'
          )
        ) : (
          <>
            Fiabilitate la activități:{' '}
            <strong className="font-semibold text-[#18191D] dark:text-[#F5F5F4]">
              {summary.score}/100
            </strong>
          </>
        )}
      </span>
      {onOpenExplain && (
        <button
          type="button"
          onClick={onOpenExplain}
          className="inline-flex items-center gap-0.5 font-medium text-[#21866F] dark:text-[#34D399] hover:underline ml-0.5"
        >
          <HelpCircle className="h-3.5 w-3.5" />
          <span>Cum este calculat?</span>
        </button>
      )}
    </span>
  );
}

interface ProfileCardProps {
  breakdown: ReliabilityBreakdown | null;
  onOpenModal: () => void;
}

export function ReliabilityProfileCard({
  breakdown,
  onOpenModal,
}: ProfileCardProps) {
  const isNew = !breakdown || breakdown.isNewUser || breakdown.score === null;

  return (
    <section className="rounded-3xl bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-[#21866F] dark:text-[#34D399] shrink-0" />
          <h3 className="font-display text-base font-bold">
            Fiabilitate la activități
          </h3>
        </div>
        <span className="text-lg font-display font-bold tabular-nums">
          {isNew ? 'Utilizator nou' : `${breakdown.score}/100`}
        </span>
      </div>

      {isNew ? (
        <p className="text-xs leading-relaxed text-[#717680] dark:text-[#9CA3AF]">
          Punctajul va apărea după suficiente activități evaluate (minimum 5
          activități eligibile în ultimele 6 luni).
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2 pt-1 text-center rounded-2xl bg-[#FAFAF9] dark:bg-[#0E0F12] p-3 tabular-nums">
          <div>
            <p className="text-base font-bold text-[#21866F] dark:text-[#34D399]">
              {breakdown.verifiedAttendanceCount}
            </p>
            <p className="text-[11px] text-[#717680]">Prezențe</p>
          </div>
          <div>
            <p className="text-base font-bold">
              {breakdown.lateCancellationCount}
            </p>
            <p className="text-[11px] text-[#717680]">Anulări tardive</p>
          </div>
          <div>
            <p className="text-base font-bold">{breakdown.excludedCount}</p>
            <p className="text-[11px] text-[#717680]">Excluse corect</p>
          </div>
        </div>
      )}

      <p className="text-[11px] leading-relaxed text-[#717680] dark:text-[#9CA3AF]">
        Calculează exclusiv consecvența participării la activitățile de grup din
        ultimele 6 luni. Nu măsoară siguranța personală și nu reprezintă o garanție.
      </p>

      <button
        type="button"
        onClick={onOpenModal}
        className="w-full min-h-[44px] px-4 rounded-2xl bg-[#F3F3F1] dark:bg-[#22242A] text-xs font-semibold flex items-center justify-center gap-2 hover:opacity-90"
      >
        <HelpCircle className="h-4 w-4" />
        <span>Cum este calculat? & Istoric privat</span>
      </button>
    </section>
  );
}

interface ModalProps {
  open: boolean;
  breakdown: ReliabilityBreakdown | null;
  onClose: () => void;
  onSubmitDispute: (recordId: string, reason: string) => Promise<boolean>;
}

const RECORD_STATUS_LABELS: Record<string, string> = {
  VERIFIED_ATTENDANCE: 'Prezență verificată (+1,0)',
  LATE_CANCELLATION: 'Anulare tardivă (+0,5)',
  VERIFIED_NO_SHOW: 'Neprezentare confirmată (0,0)',
  EARLY_CANCELLATION: 'Anulare timpurie (Exclusă)',
  SAFETY_CANCELLATION: 'Anulare de siguranță (Exclusă)',
  ORGANIZER_CANCELLED: 'Anulat de organizator (Exclusă)',
  UNCONFIRMED_INVITATION: 'Invitație neconfirmată (Exclusă)',
  TECHNICAL_FAILURE: 'Eroare tehnică / Scutit (Exclusă)',
  DISPUTED: 'În contestație (Exclusă temporar)',
};

export function ReliabilityTransparencyModal({
  open,
  breakdown,
  onClose,
  onSubmitDispute,
}: ModalProps) {
  const [disputingRecordId, setDisputingRecordId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!open || !breakdown) return null;

  const handleDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputingRecordId) return;
    setSubmitting(true);
    const ok = await onSubmitDispute(disputingRecordId, reason);
    setSubmitting(false);
    if (ok) {
      setDisputingRecordId(null);
      setReason('');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reliability-modal-title"
    >
      <div className="w-full sm:max-w-xl max-h-[90dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-[#21866F] dark:text-[#34D399]">
              Transparență & Echitate (Vizibil doar ție)
            </p>
            <h2
              id="reliability-modal-title"
              className="mt-1 font-display text-xl font-bold"
            >
              Cum este calculată fiabilitatea
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Închide fereastra"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-[#F3F3F1] dark:hover:bg-[#22242A]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="rounded-2xl bg-[#FAFAF9] dark:bg-[#0E0F12] border border-[#E9E9EC] dark:border-[#272930] p-4 space-y-2 tabular-nums">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#717680]">Scor curent</span>
            <span className="font-display text-xl font-bold">
              {breakdown.isNewUser || breakdown.score === null
                ? 'Utilizator nou'
                : `${breakdown.score}/100`}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-[#717680]">
            <span>Fereastră de calcul</span>
            <span>Ultimele 6 luni (180 de zile)</span>
          </div>
          <div className="flex items-center justify-between text-xs text-[#717680]">
            <span>Activități eligibile / Excluse</span>
            <span>
              {breakdown.eligibleCount} eligibile · {breakdown.excludedCount}{' '}
              excluse
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-[#717680]">
            <span>Ultimul calcul</span>
            <span>
              {new Date(breakdown.lastCalculatedAt).toLocaleString('ro-RO')}
            </span>
          </div>
        </div>

        <div className="space-y-2 text-xs leading-relaxed text-[#717680] dark:text-[#9CA3AF]">
          <p className="font-semibold text-[#18191D] dark:text-[#F5F5F4]">
            Ponderi și reguli de echitate
          </p>
          <ul className="space-y-1 list-disc pl-4 tabular-nums">
            <li>Prezență verificată la activitatea de grup: pondere 1,0</li>
            <li>Anulare tardivă nejustificată (&lt;12h înainte): pondere 0,5</li>
            <li>Neprezentare confirmată fără anunț: pondere 0,0</li>
            <li>
              Excluse complet: anulări timpurii, anulări din motive de siguranță,
              anulări ale organizatorului, invitații neconfirmate, erori tehnice
              și înregistrări în contestație.
            </li>
          </ul>
          <p className="pt-1">{breakdown.policySummaryRo}</p>
        </div>

        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-bold">
              Istoric operațional privat ({breakdown.records.length})
            </h3>
            <span className="text-[11px] text-[#717680]">
              Public se afișează doar rezumatul
            </span>
          </div>

          <div className="divide-y divide-[#E9E9EC] dark:divide-[#272930] rounded-2xl border border-[#E9E9EC] dark:border-[#272930] overflow-hidden">
            {breakdown.records.map((rec) => {
              const canDispute =
                (rec.status === 'LATE_CANCELLATION' ||
                  rec.status === 'VERIFIED_NO_SHOW') &&
                rec.disputeStatus !== 'OPEN';

              return (
                <div key={rec.id} className="p-3.5 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{rec.activityTitle}</p>
                      <p className="text-xs text-[#717680] tabular-nums">
                        {rec.eventDateIso} · {rec.eventTime}
                      </p>
                      <p className="mt-1 text-xs font-medium inline-flex items-center gap-1.5">
                        {rec.status === 'VERIFIED_ATTENDANCE' ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-[#21866F] dark:text-[#34D399]" />
                        ) : (
                          <AlertCircle className="h-3.5 w-3.5 text-[#717680]" />
                        )}
                        <span>
                          {RECORD_STATUS_LABELS[rec.status] ?? rec.status}
                        </span>
                      </p>
                    </div>

                    {canDispute && (
                      <button
                        type="button"
                        onClick={() => setDisputingRecordId(rec.id)}
                        className="min-h-[38px] px-3 rounded-xl bg-[#F3F3F1] dark:bg-[#22242A] text-xs font-semibold flex items-center gap-1.5 shrink-0"
                      >
                        <Scale className="h-3.5 w-3.5" />
                        <span>Contestă</span>
                      </button>
                    )}
                  </div>

                  {disputingRecordId === rec.id && (
                    <form onSubmit={handleDispute} className="pt-2 space-y-2">
                      <textarea
                        rows={2}
                        required
                        minLength={10}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Explică motivul (ex: urgență, problemă tehnică, anulare comunicată organizatorului)..."
                        className="w-full rounded-xl border border-[#E9E9EC] dark:border-[#272930] bg-[#FAFAF9] dark:bg-[#0E0F12] px-3 py-2 text-xs"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setDisputingRecordId(null);
                            setReason('');
                          }}
                          className="min-h-[36px] px-3 rounded-lg text-xs font-medium bg-[#F3F3F1] dark:bg-[#22242A]"
                        >
                          Renunță
                        </button>
                        <button
                          type="submit"
                          disabled={submitting}
                          className="min-h-[36px] px-3.5 rounded-lg text-xs font-semibold bg-[#21866F] text-white disabled:opacity-50"
                        >
                          {submitting ? 'Se trimite...' : 'Trimite contestația'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
