'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  Flag,
  Lock,
  Send,
  ShieldBan,
  X,
} from 'lucide-react';
import { useHai } from '@/components/HaiContext';
import { HaiImage } from '@/components/HaiImage';
import { VerifiedBadge } from '@/components/VerifiedBadge';

export function ConversationScreen() {
  const {
    conversations,
    activeConversationId,
    setScreen,
    navigateTab,
    sendMessage,
    proposeMeetup,
    openReportModal,
    blockUser,
    askConfirm,
  } = useHai();

  const [draft, setDraft] = useState('');
  const [showMeetupForm, setShowMeetupForm] = useState(false);
  const [meetupTitle, setMeetupTitle] = useState('Cafea în centru');
  const [meetupDate, setMeetupDate] = useState('Sâmbătă, 28 nov');
  const [meetupTime, setMeetupTime] = useState('17:00');
  const [meetupLocation, setMeetupLocation] = useState('Str. Universității · Cafenea');

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const conversation = conversations.find((c) => c.id === activeConversationId);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages.length]);

  if (!conversation) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center p-6 text-center">
        <p className="text-sm text-[#717680]">Conversația nu este disponibilă.</p>
        <button
          type="button"
          onClick={() => navigateTab('messages')}
          className="mt-4 min-h-[44px] px-5 rounded-xl bg-[#18191D] text-white text-sm font-semibold"
        >
          Înapoi la mesaje
        </button>
      </div>
    );
  }

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    sendMessage(conversation.id, draft);
    setDraft('');
  };

  return (
    <div className="h-dvh flex flex-col bg-[#FAFAF9] dark:bg-[#0E0F12] text-[#18191D] dark:text-[#F5F5F4]">
      {/* Header */}
      <header className="shrink-0 bg-white/92 dark:bg-[#18191D]/92 backdrop-blur-md border-b border-[#E9E9EC] dark:border-[#272930] pt-[env(safe-area-inset-top,0px)]">
        <div className="max-w-3xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => {
                setScreen('main');
                navigateTab('messages');
              }}
              aria-label="Înapoi la conversații"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-[#F3F3F1] dark:hover:bg-[#22242A]"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div className="relative h-10 w-10 rounded-full overflow-hidden shrink-0">
              <HaiImage
                photoKey={conversation.partnerPhotoKey}
                alt={conversation.partnerName}
                fill
                sizes="40px"
              />
            </div>

            <div className="min-w-0">
              <h1 className="font-display text-sm sm:text-base font-bold truncate tabular-nums inline-flex items-center gap-1.5">
                <span className="truncate">
                  {conversation.partnerName}, {conversation.partnerAge}
                </span>
                {conversation.partnerVerified && <VerifiedBadge />}
              </h1>
              <p className="text-xs text-[#717680] dark:text-[#9CA3AF] truncate">
                {conversation.partnerCity} · Conversație simulată
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setShowMeetupForm(true)}
              className="min-h-[40px] px-3 rounded-xl bg-[#FFF0F3] dark:bg-[#2D161C] text-[#F26B82] text-xs font-semibold flex items-center gap-1.5"
            >
              <Calendar className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Propune întâlnire</span>
              <span className="sm:hidden">Întâlnire</span>
            </button>

            <button
              type="button"
              onClick={() =>
                openReportModal({
                  targetType: 'user',
                  targetId: conversation.partnerId,
                  targetTitle: conversation.partnerName,
                })
              }
              aria-label="Raportează utilizatorul"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-[#717680] hover:bg-[#F3F3F1] dark:hover:bg-[#22242A]"
            >
              <Flag className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() =>
                askConfirm({
                  title: `Blochezi pe ${conversation.partnerName}?`,
                  description:
                    'Conversația va fi eliminată și persoana nu te va mai putea contacta.',
                  confirmLabel: 'Blochează',
                  destructive: true,
                  onConfirm: () => blockUser(conversation.partnerId, conversation.partnerName),
                })
              }
              aria-label="Blochează utilizatorul"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-[#717680] hover:text-red-600 hover:bg-[#F3F3F1] dark:hover:bg-[#22242A]"
            >
              <ShieldBan className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Messages Feed */}
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="rounded-2xl bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] px-3.5 py-2.5 flex items-start gap-2.5 text-xs text-[#717680] dark:text-[#9CA3AF]">
            <Lock className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>
              Mod demonstrativ: mesajele sunt simulate local și nu folosesc criptare E2EE. Mesageria reală va fi disponibilă în producție doar după auditul E2EE.
            </span>
          </div>

          {conversation.messages.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#717680]">
              Trimite primul mesaj către {conversation.partnerName} sau propune o ieșire la cafea.
            </div>
          ) : (
            <div className="space-y-2.5">
              {conversation.messages.map((msg) => {
                const isMe = msg.senderId === 'me';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[82%] sm:max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        isMe
                          ? 'bg-[#18191D] text-white dark:bg-[#F26B82] rounded-br-md'
                          : 'bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] rounded-bl-md'
                      }`}
                    >
                      {msg.text}
                    </div>
                    <span className="mt-1 px-1 text-[11px] text-[#717680] tabular-nums">
                      {msg.timestamp}
                    </span>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </main>

      {/* Composer */}
      <footer className="shrink-0 bg-white dark:bg-[#18191D] border-t border-[#E9E9EC] dark:border-[#272930] px-4 py-3 pb-[calc(12px+env(safe-area-inset-bottom,0px))]">
        <form
          onSubmit={handleSend}
          className="max-w-3xl mx-auto flex items-center gap-2.5"
        >
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Scrie un mesaj pentru ${conversation.partnerName}...`}
            className="flex-1 min-h-[46px] rounded-full border border-[#E9E9EC] dark:border-[#272930] bg-[#FAFAF9] dark:bg-[#0E0F12] px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#F26B82]"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            aria-label="Trimite mesajul"
            className="h-11 w-11 rounded-full bg-[#F26B82] hover:bg-[#E2556E] disabled:opacity-45 text-white flex items-center justify-center shrink-0 transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </footer>

      {/* Contextual Meetup Sheet */}
      {showMeetupForm && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              proposeMeetup(
                {
                  id: conversation.partnerId,
                  name: conversation.partnerName,
                  photoKey: conversation.partnerPhotoKey,
                  city: conversation.partnerCity,
                },
                {
                  title: meetupTitle,
                  dateLabel: meetupDate,
                  time: meetupTime,
                  location: meetupLocation,
                }
              );
              sendMessage(
                conversation.id,
                `Propunere de întâlnire: ${meetupTitle} — ${meetupDate}, ${meetupTime}, ${meetupLocation}`
              );
              setShowMeetupForm(false);
            }}
            className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">
                Propune o întâlnire cu {conversation.partnerName}
              </h2>
              <button
                type="button"
                onClick={() => setShowMeetupForm(false)}
                aria-label="Închide"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#717680] mb-1">Activitate</label>
              <input
                type="text"
                required
                value={meetupTitle}
                onChange={(e) => setMeetupTitle(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-[#E9E9EC] dark:border-[#272930] bg-[#FAFAF9] dark:bg-[#0E0F12] px-3 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#717680] mb-1">Data</label>
                <input
                  type="text"
                  required
                  value={meetupDate}
                  onChange={(e) => setMeetupDate(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-[#E9E9EC] dark:border-[#272930] bg-[#FAFAF9] dark:bg-[#0E0F12] px-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#717680] mb-1">Ora</label>
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
                Loc public sigur
              </label>
              <input
                type="text"
                required
                value={meetupLocation}
                onChange={(e) => setMeetupLocation(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-[#E9E9EC] dark:border-[#272930] bg-[#FAFAF9] dark:bg-[#0E0F12] px-3 text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowMeetupForm(false)}
                className="min-h-[44px] px-4 rounded-xl bg-[#F3F3F1] dark:bg-[#22242A] text-sm font-medium"
              >
                Anulează
              </button>
              <button
                type="submit"
                className="min-h-[44px] px-5 rounded-xl bg-[#F26B82] text-white text-sm font-semibold"
              >
                Trimite propunerea
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
