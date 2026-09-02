import type { Metadata, Viewport } from 'next';
import './globals.css';
import { PwaRegistrar } from '../components/PwaRegistrar';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#06b6d4',
};

export const metadata: Metadata = {
  title: 'NeuroChat AI - Chatbot with Persistent Vector Memory & Offline PWA',
  description: 'AI Chatbot powered by Groq LLM, Hugging Face Vector Embeddings, and PostgreSQL pgvector memory recall. Fully installable as an offline Progressive Web App.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'NeuroChat AI',
  },
  icons: {
    icon: '/icons/icon-192.svg',
    apple: '/icons/icon-192.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="NeuroChat AI" />
      </head>
      <body className="bg-slate-950 text-gray-100 min-h-screen font-sans antialiased selection:bg-cyan-500 selection:text-slate-950">
        <PwaRegistrar />
        {children}
      </body>
    </html>
  );
}
