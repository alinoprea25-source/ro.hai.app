'use client';

import React from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { HaiProvider, useHai } from '@/components/HaiContext';
import { FloatingNav } from '@/components/FloatingNav';
import { Overlays } from '@/components/Overlays';
import { WelcomeScreen } from '@/components/screens/WelcomeScreen';
import { AuthScreen } from '@/components/screens/AuthScreen';
import { OnboardingScreen } from '@/components/screens/OnboardingScreen';
import { VerificationModal } from '@/components/screens/VerificationModal';
import { DatingScreen } from '@/components/screens/DatingScreen';
import { ActivitiesScreen } from '@/components/screens/ActivitiesScreen';
import { ActivityDetailScreen } from '@/components/screens/ActivityDetailScreen';
import { PlanDetailScreen } from '@/components/screens/PlanDetailScreen';
import { CreateActivityScreen } from '@/components/screens/CreateActivityScreen';
import { MessagesScreen } from '@/components/screens/MessagesScreen';
import { ConversationScreen } from '@/components/screens/ConversationScreen';
import { ProfileScreen } from '@/components/screens/ProfileScreen';
import { SafetyCenterScreen } from '@/components/screens/SafetyCenterScreen';
import { SettingsScreen } from '@/components/screens/SettingsScreen';

export interface HaiAppShellProps {
  children?: React.ReactNode;
}

function HaiRouter({ children }: { children?: React.ReactNode }) {
  const { screen, activeTab, isAuthenticated, authReady, user } = useHai();

  if (!authReady) {
    return (
      <div className="min-h-dvh bg-[#FAFAF9] dark:bg-[#0E0F12] text-[#18191D] dark:text-[#F5F5F4] flex flex-col items-center justify-center p-6">
        <span className="font-display text-3xl font-bold tracking-tight">
          hai<span className="text-[#F26B82]">.</span>
        </span>
        <p className="mt-2 text-xs text-[#717680] dark:text-[#9CA3AF]">
          Se verifică sesiunea securizată...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (screen === 'auth') {
      return <AuthScreen />;
    }
    return <WelcomeScreen />;
  }

  if (screen === 'onboarding') {
    return <OnboardingScreen key={user.id} />;
  }

  if (screen === 'welcome') {
    return <WelcomeScreen />;
  }

  if (screen === 'auth') {
    return <AuthScreen />;
  }

  if (screen === 'activity-detail') {
    return <ActivityDetailScreen />;
  }

  if (screen === 'plan-detail') {
    return <PlanDetailScreen />;
  }

  if (screen === 'conversation') {
    return <ConversationScreen />;
  }

  if (screen === 'safety') {
    return <SafetyCenterScreen />;
  }

  if (screen === 'settings') {
    return <SettingsScreen />;
  }

  return (
    <div className="min-h-dvh flex flex-col bg-[#FAFAF9] dark:bg-[#0E0F12] text-[#18191D] dark:text-[#F5F5F4] lg:pl-[272px]">
      <main
        id="main-content"
        className="flex-1 w-full px-4 sm:px-6 lg:px-8 pt-[calc(14px+env(safe-area-inset-top,0px))] pb-[calc(96px+env(safe-area-inset-bottom,0px))] lg:pt-8 lg:pb-12"
      >
        {children ?? (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
              className="w-full"
            >
              {activeTab === 'home' && <DatingScreen />}
              {activeTab === 'activities' && <ActivitiesScreen />}
              {activeTab === 'create' && <CreateActivityScreen />}
              {activeTab === 'messages' && <MessagesScreen />}
              {activeTab === 'profile' && <ProfileScreen />}
            </motion.div>
          </AnimatePresence>
        )}
      </main>
      <FloatingNav />
    </div>
  );
}

export function HaiAppShell({ children }: HaiAppShellProps) {
  return (
    <ErrorBoundary>
      <MotionConfig reducedMotion="user">
        <HaiProvider>
          <HaiRouter>{children}</HaiRouter>
          <VerificationModal />
          <Overlays />
        </HaiProvider>
      </MotionConfig>
    </ErrorBoundary>
  );
}
