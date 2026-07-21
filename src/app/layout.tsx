import type { Metadata } from 'next';
import './globals.css';
import ClientLayout from '@/components/ClientLayout';

export const metadata: Metadata = {
  title: 'DailyTask – Productivity Dashboard',
  description: 'A powerful daily task manager with analytics, dark mode, and smart filtering.',
  keywords: ['task manager', 'productivity', 'daily tasks', 'todo app', 'dashboard'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
