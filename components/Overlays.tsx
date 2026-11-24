'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, Calendar, Check, Flag, Heart, MessageCircle, X } from 'lucide-react';
import { useHai } from '@/components/HaiContext';
import { HaiImage } from '@/components/HaiImage';
import { VerifiedBadge } from '@/components/VerifiedBadge';

const REPORT_REASONS = [
  'Comportament nepotrivit sau hărțuire',
  'Profil fals sau informații înșelătoare',
  'Spam sau promovare comercială',
  'Activitate nesigură sau ilegală',
  'Conținut ofensator sau discriminatoriu',
];

export function Overlays() {
  const {
    toasts,
    confirmDialog,
    closeConfirm,
    reportModal,
    closeReportModal,
    submitReport,
    activeMatchModal,
    dismissMatchModal,
    user,
    openConversationWithPartner,
    proposeMeetup,
  } = useHai();

  const [reportReason, setReportReason] = useState(REPORT_REASONS[0]);
  const [reportDetails, setReportDetails] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  const [showMeetupProposer, setShowMeetupProposer] = useState(false);
  const [meetupTitle, setMeetupTitle] = useState('Cafea în centru');
  const [meetupDate, setMeetupDate] = useState('Sâmbătă, 28 nov');
  const [meetupTime, setMeetupTime] = useState('17:30');
  const [meetupLocation, setMeetupLocation] = useState('Piața Unirii · Cafenea');

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingReport(true);
    const ok = await submitReport(reportReason, reportDetails);
    setSubmittingReport(false);
    if (ok) {
      setReportDetails('');
    }
  };

  return (
    <>
      {/* Accessible Toast Notifications */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed top-[calc(16px+env(safe-area-inset-top,0px))] inset-x-0 z-50 flex flex-col items-center gap-2 px-4 pointer-events-none"
      >
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.18 }}
              className={`pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-sm font-medium shadow-lg border backdrop-blur-md max-w-md ${
                toast.tone === 'error'
                  ? 'bg-[#DC2626] text-white border-red-500/40'
                  : toast.tone === 'success'
                  ? 'bg-[#18191D] text-white border-white/10 dark:bg-white dark:text-[#18191D]'
                  : 'bg-[#18191D]/92 text-white border-white/10 dark:bg-[#22242A] dark:text-[#F5F5F4]'
              }`}
            >
              {toast.tone === 'success' && (
                <Check className="h-4 w-4 text-[#34D399] dark:text-[#21866F] shrink-0" />
              )}
              {toast.tone === 'error' && (
                <AlertTriangle className="h-4 w-4 text-white shrink-0" />
              )}
              <span>{toast.title}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {confirmDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.18 }}
              className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] p-6 shadow-2xl"
            >
              <h2
                id="confirm-title"
                className="font-display text-lg font-semibold text-[#18191D] dark:text-[#F5F5F4]"
              >
                {confirmDialog.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[#717680] dark:text-[#9CA3AF]">
                {confirmDialog.description}
              </p>
              <div className="mt-6 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={closeConfirm}
                  className="min-h-[44px] px-4 rounded-xl text-sm font-medium text-[#18191D] dark:text-[#F5F5F4] bg-[#F3F3F1] dark:bg-[#22242A] hover:bg-[#E9E9EC] dark:hover:bg-[#2E313A] transition-colors"
                >
                  Renunță
                </button>
                <button
                  type="button"
                  onClick={() => {
                    confirmDialog.onConfirm();
                    closeConfirm();
                  }}
                  className={`min-h-[44px] px-4 rounded-xl text-sm font-medium text-white transition-colors ${
                    confirmDialog.destructive
                      ? 'bg-[#DC2626] hover:bg-red-700'
                      : 'bg-[#18191D] hover:bg-black dark:bg-[#F26B82] dark:hover:bg-[#E2556E]'
                  }`}
                >
                  {confirmDialog.confirmLabel}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Safety Report Modal */}
      <AnimatePresence>
        {reportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-modal-title"
          >
            <motion.form
              onSubmit={handleReportSubmit}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ duration: 0.2 }}
              className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] p-6 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <div className="h-10 w-10 rounded-full bg-[#FFF0F3] dark:bg-[#2D161C] text-[#F26B82] flex items-center justify-center shrink-0">
                    <Flag className="h-5 w-5" />
                  </div>
                  <div>
                    <h2
                      id="report-modal-title"
                      className="font-display text-lg font-semibold text-[#18191D] dark:text-[#F5F5F4]"
                    >
                      Raportează
                    </h2>
                    <p className="text-xs text-[#717680] dark:text-[#9CA3AF]">
                      {reportModal.targetTitle}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeReportModal}
                  aria-label="Închide fereastra de raportare"
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-[#717680] hover:bg-[#F3F3F1] dark:hover:bg-[#22242A]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#717680] dark:text-[#9CA3AF] mb-2">
                    Motivul raportării
                  </label>
                  <div className="space-y-1.5">
                    {REPORT_REASONS.map((reason) => (
                      <label
                        key={reason}
                        className={`flex items-center gap-3 min-h-[44px] px-3.5 py-2 rounded-xl border text-sm cursor-pointer transition-colors ${
                          reportReason === reason
                            ? 'border-[#F26B82] bg-[#FFF0F3] dark:bg-[#2D161C] text-[#18191D] dark:text-[#F5F5F4]'
                            : 'border-[#E9E9EC] dark:border-[#272930] text-[#18191D] dark:text-[#F5F5F4] hover:bg-[#FAFAF9] dark:hover:bg-[#22242A]'
                        }`}
                      >
                        <input
                          type="radio"
                          name="reportReason"
                          value={reason}
                          checked={reportReason === reason}
                          onChange={() => setReportReason(reason)}
                          className="accent-[#F26B82]"
                        />
                        <span>{reason}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="report-details"
                    className="block text-xs font-medium text-[#717680] dark:text-[#9CA3AF] mb-1.5"
                  >
                    Detalii suplimentare (opțional)
                  </label>
                  <textarea
                    id="report-details"
                    rows={3}
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder="Descrie pe scurt ce s-a întâmplat..."
                    className="w-full rounded-xl border border-[#E9E9EC] dark:border-[#272930] bg-[#FAFAF9] dark:bg-[#0E0F12] px-3.5 py-2.5 text-sm text-[#18191D] dark:text-[#F5F5F4] focus:outline-none focus:ring-2 focus:ring-[#F26B82]"
                  />
                </div>
              </div>

              <p className="mt-3 text-xs text-[#717680] dark:text-[#9CA3AF]">
                Raportarea este confidențială și gratuită. Echipa de moderare nu notifică persoana raportată cu privire la identitatea ta.
              </p>

              <div className="mt-5 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={closeReportModal}
                  className="min-h-[44px] px-4 rounded-xl text-sm font-medium bg-[#F3F3F1] dark:bg-[#22242A] text-[#18191D] dark:text-[#F5F5F4]"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  disabled={submittingReport}
                  className="min-h-[44px] px-5 rounded-xl text-sm font-semibold bg-[#F26B82] hover:bg-[#E2556E] text-white disabled:opacity-60 transition-colors"
                >
                  {submittingReport ? 'Se trimite...' : 'Trimite raportarea'}
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SCREEN 4 — MUTUAL MATCH MODAL */}
      <AnimatePresence>
        {activeMatchModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-md p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="match-modal-title"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              className="relative w-full max-w-md rounded-3xl bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] p-6 sm:p-7 shadow-2xl text-center"
            >
              <button
                type="button"
                onClick={() => {
                  setShowMeetupProposer(false);
                  dismissMatchModal();
                }}
                aria-label="Închide fereastra de match"
                className="absolute top-4 right-4 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-[#717680] hover:bg-[#F3F3F1] dark:hover:bg-[#22242A]"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="mx-auto mt-2 flex items-center justify-center -space-x-4">
                <div className="relative h-24 w-24 sm:h-28 sm:w-28 rounded-full overflow-hidden border-4 border-white dark:border-[#18191D] shadow-md -rotate-6">
                  <HaiImage
                    photoKey={user.photoKey}
                    customUrl={user.customPhotoUrl}
                    alt={user.name}
                    fill
                    sizes="112px"
                  />
                </div>
                <div className="relative z-10 h-10 w-10 rounded-full bg-[#F26B82] text-white flex items-center justify-center shadow-md border-2 border-white dark:border-[#18191D]">
                  <Heart className="h-5 w-5 fill-current" />
                </div>
                <div className="relative h-24 w-24 sm:h-28 sm:w-28 rounded-full overflow-hidden border-4 border-white dark:border-[#18191D] shadow-md rotate-6">
                  <HaiImage
                    photoKey={activeMatchModal.photoKey}
                    alt={activeMatchModal.name}
                    fill
                    sizes="112px"
                  />
                </div>
              </div>

              <h2
                id="match-modal-title"
                className="mt-5 font-display text-2xl font-bold tracking-tight text-[#18191D] dark:text-[#F5F5F4]"
              >
                V-ați plăcut reciproc!
              </h2>
              <p className="mt-1.5 text-sm text-[#717680] dark:text-[#9CA3AF] inline-flex items-center justify-center gap-1.5 flex-wrap">
                <span>
                  Tu și {activeMatchModal.name} ({activeMatchModal.age}, {activeMatchModal.city}) aveți un match nou.
                </span>
                {activeMatchModal.isVerified && <VerifiedBadge />}
              </p>

              {!showMeetupProposer ? (
                <div className="mt-6 space-y-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      const partner = activeMatchModal;
                      dismissMatchModal();
                      openConversationWithPartner({
                        id: partner.id,
                        name: partner.name,
                        age: partner.age,
                        city: partner.city,
                        photoKey: partner.photoKey,
                      });
                    }}
                    className="flex items-center justify-center gap-2 w-full min-h-[48px] rounded-2xl bg-[#F26B82] hover:bg-[#E2556E] text-white font-semibold text-sm transition-colors"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>Trimite un mesaj</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowMeetupProposer(true)}
                    className="flex items-center justify-center gap-2 w-full min-h-[48px] rounded-2xl bg-[#18191D] dark:bg-white text-white dark:text-[#18191D] font-semibold text-sm hover:opacity-90 transition-opacity"
                  >
                    <Calendar className="h-4 w-4" />
                    <span>Propune o întâlnire</span>
                  </button>

                  <button
                    type="button"
                    onClick={dismissMatchModal}
                    className="w-full min-h-[44px] text-sm font-medium text-[#717680] dark:text-[#9CA3AF] hover:text-[#18191D] dark:hover:text-white transition-colors"
                  >
                    Continuă descoperirea
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    proposeMeetup(
                      {
                        id: activeMatchModal.id,
                        name: activeMatchModal.name,
                        photoKey: activeMatchModal.photoKey,
                        city: activeMatchModal.city,
                      },
                      {
                        title: meetupTitle,
                        dateLabel: meetupDate,
                        time: meetupTime,
                        location: meetupLocation,
                      }
                    );
                    setShowMeetupProposer(false);
                    dismissMatchModal();
                  }}
                  className="mt-5 text-left space-y-3 border-t border-[#E9E9EC] dark:border-[#272930] pt-4"
                >
                  <div>
                    <label className="block text-xs font-medium text-[#717680] mb-1">
                      Propunere de plan
                    </label>
                    <input
                      type="text"
                      required
                      value={meetupTitle}
                      onChange={(e) => setMeetupTitle(e.target.value)}
                      className="w-full min-h-[44px] rounded-xl border border-[#E9E9EC] dark:border-[#272930] bg-[#FAFAF9] dark:bg-[#0E0F12] px-3 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-medium text-[#717680] mb-1">
                        Ziua
                      </label>
                      <input
                        type="text"
                        required
                        value={meetupDate}
                        onChange={(e) => setMeetupDate(e.target.value)}
                        className="w-full min-h-[44px] rounded-xl border border-[#E9E9EC] dark:border-[#272930] bg-[#FAFAF9] dark:bg-[#0E0F12] px-3 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#717680] mb-1">
                        Ora
                      </label>
                      <input
                        type="time"
                        required
                        value={meetupTime}
                        onChange={(e) => setMeetupTime(e.target.value)}
                        className="w-full min-h-[44px] rounded-xl border border-[#E9E9EC] dark:border-[#272930] bg-[#FAFAF9] dark:bg-[#0E0F12] px-3 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#717680] mb-1">
                      Loc public recomandat
                    </label>
                    <input
                      type="text"
                      required
                      value={meetupLocation}
                      onChange={(e) => setMeetupLocation(e.target.value)}
                      className="w-full min-h-[44px] rounded-xl border border-[#E9E9EC] dark:border-[#272930] bg-[#FAFAF9] dark:bg-[#0E0F12] px-3 text-sm"
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowMeetupProposer(false)}
                      className="flex-1 min-h-[44px] rounded-xl bg-[#F3F3F1] dark:bg-[#22242A] text-sm font-medium"
                    >
                      Înapoi
                    </button>
                    <button
                      type="submit"
                      className="flex-1 min-h-[44px] rounded-xl bg-[#F26B82] text-white text-sm font-semibold"
                    >
                      Trimite propunerea
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
