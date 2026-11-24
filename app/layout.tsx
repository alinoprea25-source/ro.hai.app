import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HAI. — Cunoaște oameni. Fă planuri. Ieși din casă.',
  description:
    'Aplicație socială și de dating pentru adulți din România. Descoperă oameni compatibili, activități reale și experiențe în orașul tău.',
  openGraph: {
    title: 'HAI. — Cunoaște oameni. Fă planuri. Ieși din casă.',
    description:
      'Aplicație socială și de dating pentru adulți din România. Descoperă oameni compatibili, activități reale și experiențe în orașul tău.',
    type: 'website',
    locale: 'ro_RO',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HAI. — Cunoaște oameni. Fă planuri. Ieși din casă.',
    description:
      'Aplicație socială și de dating pentru adulți din România.',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAFAF9' },
    { media: '(prefers-color-scheme: dark)', color: '#0E0F12' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro" suppressHydrationWarning>
      <body className="min-h-dvh bg-[#FAFAF9] text-[#18191D] dark:bg-[#0E0F12] dark:text-[#F5F5F4] selection:bg-[#FFF0F3] selection:text-[#F26B82]">
        {children}
      </body>
    </html>
  );
}
