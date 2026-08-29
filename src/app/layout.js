import '@fontsource-variable/inter';
import './globals.css';
import Header from '../components/Layout/Header';
import Footer from '../components/Layout/Footer';

export const metadata = {
  title: 'Phoenix Herald — Manage Alliance Events',
  description: 'Create, manage, and announce alliance events to Discord.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col overflow-x-hidden">
        <Header />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">{children}</main>
        <Footer />
      </body>
    </html>
  );
}