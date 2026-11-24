'use client';

import React, { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Flag,
  HeartHandshake,
  Lock,
  PhoneCall,
  Plus,
  Shield,
  ShieldBan,
  Trash2,
} from 'lucide-react';
import { useHai } from '@/components/HaiContext';

export function SafetyCenterScreen() {
  const {
    setScreen,
    blockedIds,
    allProfiles,
    unblockUser,
    trustedContacts,
    addTrustedContact,
    removeTrustedContact,
    plans,
    checkInPlan,
    sharePlanWithContact,
    openReportModal,
    reports,
  } = useHai();

  const [contactName, setContactName] = useState('');
  const [contactRelation, setContactRelation] = useState('');
  const [contactInfo, setContactInfo] = useState('');

  const upcomingPlans = plans.filter((p) => p.status === 'upcoming');
  const blockedProfiles = allProfiles.filter((p) => blockedIds.includes(p.id));

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactInfo.trim()) return;
    addTrustedContact({
      name: contactName.trim(),
      relation: contactRelation.trim() || 'Prieten(ă)',
      contactInfo: contactInfo.trim(),
    });
    setContactName('');
    setContactRelation('');
    setContactInfo('');
  };

  return (
    <div className="min-h-dvh bg-[#FAFAF9] dark:bg-[#0E0F12] text-[#18191D] dark:text-[#F5F5F4] pb-[calc(40px+env(safe-area-inset-bottom,0px))]">
      <header className="sticky top-0 z-30 bg-[#FAFAF9]/90 dark:bg-[#0E0F12]/90 backdrop-blur-md border-b border-[#E9E9EC] dark:border-[#272930]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setScreen('main')}
            className="min-h-[44px] min-w-[44px] -ml-2 flex items-center justify-center rounded-full hover:bg-[#F3F3F1] dark:hover:bg-[#22242A]"
            aria-label="Înapoi"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-display text-base font-bold">Centru de siguranță</h1>
          <div className="w-11" aria-hidden="true" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Core Principles Banner */}
        <section className="rounded-3xl bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] p-6 space-y-3">
          <div className="flex items-center gap-2.5 text-[#21866F] dark:text-[#34D399]">
            <Shield className="h-5 w-5" />
            <h2 className="font-display text-lg font-bold text-[#18191D] dark:text-[#F5F5F4]">
              Siguranța ta este gratuită și sub controlul tău
            </h2>
          </div>
          <p className="text-sm leading-relaxed text-[#717680] dark:text-[#9CA3AF]">
            Blocarea, raportarea și funcțiile de siguranță sunt și vor rămâne întotdeauna gratuite. HAI. nu partajează niciodată locația ta GPS exactă în timp real și nu poate garanta siguranța fizică la întâlniri — întâlnește-te întotdeauna în locuri publice și anunță o persoană de încredere.
          </p>
        </section>

        {/* Voluntary Meeting Check-in & Sharing */}
        <section className="rounded-3xl bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-[#F26B82]" />
            <h2 className="font-display text-lg font-bold">
              Check-in și partajare voluntară pentru întâlniri
            </h2>
          </div>

          {upcomingPlans.length === 0 ? (
            <p className="text-sm text-[#717680]">Nu ai planuri viitoare momentan.</p>
          ) : (
            <div className="space-y-3">
              {upcomingPlans.slice(0, 3).map((plan) => (
                <div
                  key={plan.id}
                  className="p-4 rounded-2xl bg-[#FAFAF9] dark:bg-[#0E0F12] border border-[#E9E9EC] dark:border-[#272930] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-sm font-semibold">{plan.title}</p>
                    <p className="text-xs text-[#717680] dark:text-[#9CA3AF] tabular-nums">
                      {plan.dateLabel}, {plan.time} · {plan.location}
                    </p>
                    {plan.checkedIn && (
                      <p className="mt-1 text-xs font-medium text-[#21866F] dark:text-[#34D399]">
                        Check-in confirmat: ai ajuns în siguranță
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {!plan.checkedIn && (
                      <button
                        type="button"
                        onClick={() => checkInPlan(plan.id)}
                        className="min-h-[40px] px-3.5 rounded-xl bg-[#21866F] text-white text-xs font-semibold"
                      >
                        Confirmă check-in
                      </button>
                    )}
                    {trustedContacts[0] && (
                      <button
                        type="button"
                        onClick={() =>
                          sharePlanWithContact(plan.id, trustedContacts[0].name)
                        }
                        className="min-h-[40px] px-3.5 rounded-xl bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] text-xs font-medium"
                      >
                        Trimite către {trustedContacts[0].name}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Trusted Contacts */}
        <section className="rounded-3xl bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <HeartHandshake className="h-5 w-5 text-[#F26B82]" />
            <h2 className="font-display text-lg font-bold">Contacte de încredere</h2>
          </div>

          <div className="space-y-2">
            {trustedContacts.map((tc) => (
              <div
                key={tc.id}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-[#FAFAF9] dark:bg-[#0E0F12] border border-[#E9E9EC] dark:border-[#272930]"
              >
                <div>
                  <p className="text-sm font-semibold">
                    {tc.name} · <span className="font-normal text-[#717680]">{tc.relation}</span>
                  </p>
                  <p className="text-xs text-[#717680]">{tc.contactInfo}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeTrustedContact(tc.id)}
                  aria-label={`Șterge contactul ${tc.name}`}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-[#717680] hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddContact} className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
            <input
              type="text"
              required
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Nume complet"
              className="min-h-[44px] rounded-xl border border-[#E9E9EC] dark:border-[#272930] bg-[#FAFAF9] dark:bg-[#0E0F12] px-3 text-sm"
            />
            <input
              type="text"
              value={contactRelation}
              onChange={(e) => setContactRelation(e.target.value)}
              placeholder="Relație (ex: Prietenă)"
              className="min-h-[44px] rounded-xl border border-[#E9E9EC] dark:border-[#272930] bg-[#FAFAF9] dark:bg-[#0E0F12] px-3 text-sm"
            />
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={contactInfo}
                onChange={(e) => setContactInfo(e.target.value)}
                placeholder="E-mail sau telefon"
                className="flex-1 min-w-0 min-h-[44px] rounded-xl border border-[#E9E9EC] dark:border-[#272930] bg-[#FAFAF9] dark:bg-[#0E0F12] px-3 text-sm"
              />
              <button
                type="submit"
                aria-label="Adaugă contact de încredere"
                className="min-h-[44px] px-4 rounded-xl bg-[#18191D] dark:bg-[#F26B82] text-white text-sm font-semibold flex items-center gap-1 shrink-0"
              >
                <Plus className="h-4 w-4" />
                <span>Adaugă</span>
              </button>
            </div>
          </form>
        </section>

        {/* Reporting & Blocked Users */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="rounded-3xl bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <ShieldBan className="h-5 w-5 text-[#717680]" />
              <h2 className="font-display text-base font-bold">
                Utilizatori blocați ({blockedProfiles.length})
              </h2>
            </div>
            {blockedProfiles.length === 0 ? (
              <p className="text-xs text-[#717680]">
                Nu ai blocat niciun utilizator momentan.
              </p>
            ) : (
              <div className="space-y-2">
                {blockedProfiles.map((bp) => (
                  <div
                    key={bp.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-[#FAFAF9] dark:bg-[#0E0F12]"
                  >
                    <span className="text-sm font-medium">
                      {bp.name}, {bp.age}
                    </span>
                    <button
                      type="button"
                      onClick={() => unblockUser(bp.id)}
                      className="min-h-[38px] px-3 rounded-lg bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] text-xs font-medium"
                    >
                      Deblochează
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <Flag className="h-5 w-5 text-[#F26B82]" />
              <h2 className="font-display text-base font-bold">
                Raportare și suport
              </h2>
            </div>
            <p className="text-xs leading-relaxed text-[#717680] dark:text-[#9CA3AF]">
              Raportările trimise în sesiunea curentă: {reports.length}. Poți semnala oricând un comportament suspect sau o activitate neconformă.
            </p>
            <button
              type="button"
              onClick={() =>
                openReportModal({
                  targetType: 'user',
                  targetId: 'general-safety-report',
                  targetTitle: 'Sesizare generală de siguranță',
                })
              }
              className="min-h-[44px] px-4 rounded-xl bg-[#FFF0F3] dark:bg-[#2D161C] text-[#F26B82] text-sm font-semibold"
            >
              Trimite o sesizare nouă
            </button>
          </section>
        </div>

        {/* Emergency & Privacy Resources */}
        <section className="rounded-3xl bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] p-6 space-y-3">
          <div className="flex items-center gap-2.5">
            <PhoneCall className="h-5 w-5 text-[#F26B82]" />
            <h2 className="font-display text-base font-bold">
              Resurse de urgență și recomandări (România)
            </h2>
          </div>
          <ul className="space-y-2 text-xs sm:text-sm text-[#717680] dark:text-[#9CA3AF]">
            <li>
              <strong>112</strong> — Număr unic de urgență în România în caz de pericol imediat.
            </li>
            <li>
              <strong>0800 500 333</strong> — Linie telefonică gratuită ANES pentru sprijin și consiliere.
            </li>
            <li className="flex items-start gap-2 pt-1">
              <Lock className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Confidențialitate: nu trimite documente de identitate, date bancare sau adresa de domiciliu în conversații.
              </span>
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}
