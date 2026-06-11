import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '@/components/sidebar';

export const metadata: Metadata = {
  title: 'SeedGuard | PMO Freedom Tracker',
  description: 'Track your progress, build discipline, and reclaim your freedom.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <div className="min-h-screen bg-background flex flex-col md:flex-row">
          <Sidebar />
          <main className="flex-1 overflow-y-auto page-entry">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
