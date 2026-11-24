'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  BadgeCheck,
  Camera,
  Check,
  Lock,
  RefreshCw,
  ShieldAlert,
  Upload,
  X,
} from 'lucide-react';
import { useHai } from '@/components/HaiContext';
import { POSE_CHALLENGES } from '@/lib/constants/verification';

export function VerificationModal() {
  const {
    verificationModalOpen,
    closeVerificationModal,
    submitVerification,
    user,
    showToast,
  } = useHai();

  const [poseIndex, setPoseIndex] = useState(0);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const currentPose = POSE_CHALLENGES[poseIndex % POSE_CHALLENGES.length];

  const stopCameraTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const stopCamera = () => {
    stopCameraTracks();
    setCameraActive(false);
  };

  const handleClose = () => {
    stopCamera();
    setCapturedPhoto(null);
    setCameraError(null);
    closeVerificationModal();
  };

  useEffect(() => {
    if (!verificationModalOpen) {
      stopCameraTracks();
    }
    return () => {
      stopCameraTracks();
    };
  }, [verificationModalOpen]);

  const startCamera = async () => {
    setCameraError(null);
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        'Camera live nu este disponibilă în acest browser. Poți încărca o fotografie făcută acum din butonul de mai jos.'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 960 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraActive(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      });
    } catch {
      setCameraError(
        'Accesul la cameră a fost refuzat sau nu există o cameră conectată. Folosește opțiunea de încărcare fotografie.'
      );
    }
  };

  const captureFromVideo = () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    const width = Math.min(720, video.videoWidth || 640);
    const height = Math.min(960, video.videoHeight || 800);
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedPhoto(dataUrl);
    stopCamera();
  };

  const handleFileFallback = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showToast('Selectează o imagine JPG, PNG sau WebP.', 'error');
      return;
    }
    if (file.size > 2.5 * 1024 * 1024) {
      showToast('Imaginea trebuie să aibă cel mult 2.5 MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        stopCamera();
        setCapturedPhoto(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!capturedPhoto) return;
    setSubmitting(true);
    const res = await submitVerification(currentPose.id, capturedPhoto);
    setSubmitting(false);
    if (res.ok) {
      stopCamera();
      setCapturedPhoto(null);
      setCameraError(null);
    } else {
      showToast(res.error || 'Eroare la trimitere.', 'error');
    }
  };

  return (
    <AnimatePresence>
      {verificationModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="verification-title"
        >
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            className="w-full sm:max-w-md max-h-[90dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] p-6 space-y-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-full bg-[#21866F]/12 text-[#21866F] dark:text-[#34D399] flex items-center justify-center shrink-0">
                  <BadgeCheck className="h-5 w-5" />
                </div>
                <div>
                  <h2 id="verification-title" className="font-display text-lg font-bold">
                    Verificare profil
                  </h2>
                  <p className="text-xs text-[#717680] dark:text-[#9CA3AF]">
                    Confirmă că ești persoana din fotografii
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Închide fereastra de verificare"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-[#F3F3F1] dark:hover:bg-[#22242A]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Pose Challenge Card */}
            <div className="rounded-2xl bg-[#FAFAF9] dark:bg-[#0E0F12] border border-[#E9E9EC] dark:border-[#272930] p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#F26B82]">
                  Gest solicitat
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setPoseIndex((i) => i + 1);
                    setCapturedPhoto(null);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#717680] hover:text-[#18191D] dark:hover:text-white"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Schimbă gestul</span>
                </button>
              </div>
              <p className="text-sm font-bold">{currentPose.title}</p>
              <p className="text-xs leading-relaxed text-[#717680] dark:text-[#9CA3AF]">
                {currentPose.instruction}
              </p>
            </div>

            {cameraError && (
              <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{cameraError}</span>
              </div>
            )}

            {/* Camera / Preview Viewport */}
            <div className="relative aspect-[3/4] max-h-[300px] mx-auto w-full max-w-[240px] rounded-3xl overflow-hidden bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] flex items-center justify-center">
              {capturedPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={capturedPhoto}
                  alt="Fotografie de verificare capturată"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              ) : cameraActive ? (
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="h-full w-full object-cover scale-x-[-1]"
                />
              ) : (
                <div className="p-5 text-center text-white/75 space-y-2">
                  <Camera className="h-8 w-8 mx-auto opacity-80" />
                  <p className="text-xs leading-relaxed">
                    Pornește camera frontală sau încarcă o fotografie realizată acum cu gestul indicat.
                  </p>
                </div>
              )}
            </div>

            {/* Capture Actions */}
            <div className="space-y-2.5">
              {capturedPhoto ? (
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setCapturedPhoto(null)}
                    className="flex-1 min-h-[46px] rounded-2xl bg-[#F3F3F1] dark:bg-[#22242A] text-sm font-medium"
                  >
                    Refă poza
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleSubmit}
                    className="flex-1 min-h-[46px] rounded-2xl bg-[#21866F] hover:opacity-95 text-white text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60"
                  >
                    <Check className="h-4 w-4" />
                    <span>{submitting ? 'Se trimite...' : 'Trimite la verificare'}</span>
                  </button>
                </div>
              ) : cameraActive ? (
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="min-h-[46px] px-4 rounded-2xl bg-[#F3F3F1] dark:bg-[#22242A] text-sm font-medium"
                  >
                    Oprește
                  </button>
                  <button
                    type="button"
                    onClick={captureFromVideo}
                    className="flex-1 min-h-[46px] rounded-2xl bg-[#F26B82] text-white text-sm font-semibold flex items-center justify-center gap-2"
                  >
                    <Camera className="h-4 w-4" />
                    <span>Fă fotografia</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="w-full min-h-[46px] rounded-2xl bg-[#18191D] dark:bg-[#F26B82] text-white text-sm font-semibold flex items-center justify-center gap-2"
                  >
                    <Camera className="h-4 w-4" />
                    <span>Pornește camera frontală</span>
                  </button>

                  <label className="w-full min-h-[46px] rounded-2xl bg-[#F3F3F1] dark:bg-[#22242A] text-sm font-medium flex items-center justify-center gap-2 cursor-pointer hover:opacity-90">
                    <Upload className="h-4 w-4" />
                    <span>Încarcă fotografie / Cameră mobil</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      capture="user"
                      onChange={handleFileFallback}
                      className="sr-only"
                    />
                  </label>
                </div>
              )}
            </div>

            <div className="flex items-start gap-2 text-[11px] leading-relaxed text-[#717680] dark:text-[#9CA3AF]">
              <Lock className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>
                Fotografia de verificare ({user.name}) este stocată separat în coada privată de moderare și nu este afișată public pe profilul tău.
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
