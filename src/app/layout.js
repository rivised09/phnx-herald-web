import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Header from '../components/Layout/Header';
import Footer from '../components/Layout/Footer';
import LocaleProvider from '../components/i18n/LocaleProvider';
import { getLocale } from '../lib/i18n/server';
import { Analytics } from '@vercel/analytics/next';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata = {
  title: 'Phoenix Herald — Manage Alliance Events',
  description: 'Create, manage, and announce alliance events to Discord.',
};

export default async function RootLayout({ children }) {
  // The saved language cookie makes the first server render match the picker;
  // this opts every route into rendering per request, which the roster page
  // already does.
  const locale = await getLocale();

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="flex min-h-screen flex-col overflow-x-hidden">
        <LocaleProvider initialLocale={locale}>
          <Header />
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">{children}</main>
          <Footer />
        </LocaleProvider>
        <Analytics />
      </body>
    </html>
  );
}