'use client';

import React, { useMemo, useState } from 'react';
import { Lock, MessageCircle, Search } from 'lucide-react';
import { useHai } from '@/components/HaiContext';
import { HaiImage } from '@/components/HaiImage';
import { VerifiedBadge } from '@/components/VerifiedBadge';

export function MessagesScreen() {
  const {
    matches,
    conversations,
    openConversation,
    openConversationWithPartner,
  } = useHai();

  const [query, setQuery] = useState('');

  const filteredConversations = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) =>
        c.partnerName.toLowerCase().includes(q) ||
        c.lastMessage.toLowerCase().includes(q)
    );
  }, [conversations, query]);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <header>
        <p className="text-xs text-[#717680] dark:text-[#9CA3AF]">
          Mod demonstrativ — date fictive
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Mesaje</h1>
      </header>

      {/* Security / E2EE Disclosure */}
      <div className="rounded-2xl bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] p-4 flex items-start gap-3">
        <Lock className="h-4 w-4 text-[#717680] shrink-0 mt-0.5" />
        <p className="text-xs leading-relaxed text-[#717680] dark:text-[#9CA3AF]">
          Conversațiile afișate sunt <strong>simulate în mod demonstrativ</strong>. În producție, mesageria privată rămâne dezactivată până la implementarea și auditul independent al unui protocol complet de criptare E2EE.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="h-4 w-4 text-[#717680] absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Caută conversații sau match-uri..."
          className="w-full min-h-[44px] rounded-2xl bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#F26B82]"
        />
      </div>

      {/* Match-uri noi */}
      <section aria-labelledby="new-matches-heading">
        <h2
          id="new-matches-heading"
          className="text-xs font-semibold text-[#717680] dark:text-[#9CA3AF] mb-3"
        >
          Match-uri noi ({matches.length})
        </h2>

        {matches.length === 0 ? (
          <p className="text-sm text-[#717680]">
            Niciun match nou momentan. Descoperă profile în Acasă.
          </p>
        ) : (
          <div className="flex items-center gap-4 overflow-x-auto no-scrollbar pb-2">
            {matches.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() =>
                  openConversationWithPartner({
                    id: m.partnerId,
                    name: m.partnerName,
                    age: m.partnerAge,
                    city: m.partnerCity,
                    photoKey: m.partnerPhotoKey,
                  })
                }
                className="flex flex-col items-center gap-1.5 shrink-0 min-w-[72px] group focus-visible:outline-none"
              >
                <div className="relative h-16 w-16 rounded-full overflow-hidden ring-2 ring-[#F26B82] ring-offset-2 ring-offset-[#FAFAF9] dark:ring-offset-[#0E0F12] transition-transform group-hover:scale-105">
                  <HaiImage
                    photoKey={m.partnerPhotoKey}
                    alt={m.partnerName}
                    fill
                    sizes="64px"
                  />
                </div>
                <span className="text-xs font-semibold text-[#18191D] dark:text-[#F5F5F4] inline-flex items-center gap-1">
                  <span>{m.partnerName}</span>
                  {m.partnerVerified && <VerifiedBadge />}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Conversații */}
      <section aria-labelledby="conversations-heading">
        <h2
          id="conversations-heading"
          className="text-xs font-semibold text-[#717680] dark:text-[#9CA3AF] mb-2"
        >
          Conversații ({filteredConversations.length})
        </h2>

        {filteredConversations.length === 0 ? (
          <div className="rounded-3xl bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] p-8 text-center">
            <MessageCircle className="h-7 w-7 mx-auto text-[#717680]" strokeWidth={1.6} />
            <p className="mt-2.5 text-sm font-medium">Nicio conversație găsită</p>
          </div>
        ) : (
          <div className="rounded-3xl bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] divide-y divide-[#E9E9EC] dark:divide-[#272930] overflow-hidden">
            {filteredConversations.map((conv) => (
              <button
                key={conv.id}
                type="button"
                onClick={() => openConversation(conv.id)}
                className="w-full px-4 py-3.5 flex items-center gap-3.5 text-left hover:bg-[#FAFAF9] dark:hover:bg-[#22242A] transition-colors min-h-[72px]"
              >
                <div className="relative h-12 w-12 rounded-full overflow-hidden shrink-0">
                  <HaiImage
                    photoKey={conv.partnerPhotoKey}
                    alt={conv.partnerName}
                    fill
                    sizes="48px"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-sm truncate inline-flex items-center gap-1.5 min-w-0">
                      <span className="truncate">
                        {conv.partnerName}, {conv.partnerAge}
                      </span>
                      {conv.partnerVerified && <VerifiedBadge />}
                    </p>
                    <span className="text-xs text-[#717680] tabular-nums shrink-0">
                      {conv.lastTime}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <p
                      className={`text-xs truncate ${
                        conv.unreadCount > 0
                          ? 'font-semibold text-[#18191D] dark:text-[#F5F5F4]'
                          : 'text-[#717680] dark:text-[#9CA3AF]'
                      }`}
                    >
                      {conv.lastMessage}
                    </p>
                    {conv.unreadCount > 0 && (
                      <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#F26B82] text-white text-[11px] font-semibold tabular-nums flex items-center justify-center shrink-0">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
