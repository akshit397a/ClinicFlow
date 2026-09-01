import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'ClinicFlow — Modern Clinic Scheduling',
  description: 'Fast, type-safe clinical appointment scheduling and provider workflow management.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className}>
      <body className="min-h-screen bg-[#fafafa] text-[#111111] antialiased">
        {children}
      </body>
    </html>
  );
}