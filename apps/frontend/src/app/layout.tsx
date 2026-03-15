import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';
import { LayoutSwitcher } from '@/components/LayoutSwitcher';

export const metadata: Metadata = {
  title: 'Platform — HR, Migration & Education',
  description: 'Corporate HR, Migration and Education Operating System',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-gray-50 text-gray-800 antialiased dark:bg-gray-900 dark:text-gray-100">
        <Providers>
          <LayoutSwitcher>{children}</LayoutSwitcher>
        </Providers>
      </body>
    </html>
  );
}
