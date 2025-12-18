import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap', // Prevent FOIT
  preload: true,
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'PAA Solutions Chat',
  description: 'Chat application powered by PAA Solutions',
  icons: {
    icon: '/logo.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0a0e1a',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        {/* Preconnect to Supabase for faster auth */}
        <link rel="preconnect" href="https://rpkehwskmgkhhggaiort.supabase.co" />
        <link rel="dns-prefetch" href="https://rpkehwskmgkhhggaiort.supabase.co" />
      </head>
      <body className={`${inter.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}
