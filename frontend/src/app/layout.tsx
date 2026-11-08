import type { Metadata, Viewport } from 'next';
import './globals.css';
import { PwaRegistrar } from '../components/PwaRegistrar';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ai-chatbot-nine-delta.vercel.app';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#06b6d4',
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'AI Chatbot Vercel | NeuroChat AI - Next.js Chatbot with Persistent Vector Memory',
    template: '%s | AI Chatbot Vercel',
  },
  description:
    'Experience the fastest AI Chatbot on Vercel. NeuroChat AI combines Groq LLM inference, Hugging Face vector embeddings, PostgreSQL pgvector long-term memory, and offline Progressive Web App (PWA) support.',
  applicationName: 'AI Chatbot Vercel',
  authors: [{ name: 'Krish2035', url: 'https://github.com/Krish2035/AI-Chatbot' }],
  generator: 'Next.js',
  keywords: [
    'ai chatbot vercel',
    'ai chatbot',
    'vercel ai chatbot',
    'nextjs ai chatbot vercel',
    'free ai chatbot vercel',
    'open source ai chatbot vercel',
    'groq ai chatbot',
    'neurochat ai',
    'pgvector chatbot',
    'ai chatbot with persistent memory',
    'offline ai chatbot pwa',
    'vercel chatbot template',
    'document rag chatbot vercel',
  ],
  referrer: 'origin-when-cross-origin',
  creator: 'Krish2035',
  publisher: 'NeuroChat AI',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: siteUrl,
  },
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icons/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
      { url: '/icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml' },
    ],
    shortcut: '/icons/icon-192.svg',
    apple: [
      { url: '/icons/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
      { url: '/icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'AI Chatbot Vercel',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: 'AI Chatbot Vercel - NeuroChat AI',
    title: 'AI Chatbot Vercel | NeuroChat AI - Ultra-Fast Next.js Chatbot',
    description:
      'The premier AI Chatbot deployed on Vercel featuring Groq LLM inference, pgvector persistent long-term memory, and offline PWA support.',
    images: [
      {
        url: '/og-image.svg',
        width: 1200,
        height: 630,
        alt: 'AI Chatbot Vercel - NeuroChat AI Preview',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Chatbot Vercel | NeuroChat AI',
    description:
      'Ultra-fast Next.js AI Chatbot deployed on Vercel with Groq LLM and PostgreSQL pgvector memory.',
    creator: '@Krish2035',
    images: ['/og-image.svg'],
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  category: 'technology',
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || '',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const webAppSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'AI Chatbot Vercel - NeuroChat AI',
    alternateName: ['AI Chatbot Vercel', 'Next.js AI Chatbot Vercel', 'NeuroChat AI'],
    url: siteUrl,
    applicationCategory: 'MultimediaApplication, CommunicationApplication, DeveloperApplication',
    operatingSystem: 'All (Web, iOS, Android, Windows, macOS, Linux)',
    browserRequirements: 'Requires JavaScript. Requires HTML5.',
    softwareVersion: '2.0.0',
    description:
      'Ultra-fast Next.js AI Chatbot deployed on Vercel with persistent PostgreSQL pgvector memory, Groq LLaMA 3 compound model, Hugging Face vector embeddings, and offline Progressive Web App (PWA) support.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    author: {
      '@type': 'Person',
      name: 'Krish2035',
      url: 'https://github.com/Krish2035/AI-Chatbot',
    },
    featureList: [
      'Ultra-low latency AI Chatbot hosted on Vercel',
      'Built with Next.js 14 App Router and Tailwind CSS',
      'Persistent Vector Memory powered by PostgreSQL pgvector',
      'Groq LLaMA 3 ultra-fast inference',
      'Hugging Face sentence-transformers vector embeddings',
      'Installable Progressive Web App (PWA) with offline neural fallback engine',
      'Document Intelligence RAG analyzer for PDF, TXT and DOCX',
    ],
  };

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'AI Chatbot Vercel',
    url: siteUrl,
    description: 'Ultra-fast AI Chatbot deployed on Vercel with persistent vector memory and offline PWA capabilities.',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${siteUrl}/?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is AI Chatbot Vercel (NeuroChat AI)?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'AI Chatbot Vercel (NeuroChat AI) is a full-stack, open-source AI conversational platform built with Next.js 14, Groq LLaMA 3, PostgreSQL with pgvector, and Hugging Face vector embeddings for persistent long-term memory recall.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can I deploy this AI Chatbot on Vercel for free?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes! NeuroChat AI Chatbot is 100% free and open-source. You can deploy it to Vercel on their free tier with instant edge deployment, connecting to free Groq API keys and managed Postgres with pgvector.',
        },
      },
      {
        '@type': 'Question',
        name: 'How does persistent vector memory work in this Vercel AI Chatbot?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Conversations are vectorized into 384-dimensional dense embeddings via Hugging Face sentence-transformers and indexed in PostgreSQL using the pgvector extension with Cosine Distance (<=>). Semantic search automatically recalls relevant previous conversations to maintain personalized context across sessions.',
        },
      },
      {
        '@type': 'Question',
        name: 'Does this AI Chatbot on Vercel work offline?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes! NeuroChat AI is built as an installable Progressive Web App (PWA) with Service Workers. If you disconnect from the internet, an embedded client-side neural pattern engine seamlessly takes over.',
        },
      },
      {
        '@type': 'Question',
        name: 'What AI models power this AI Chatbot on Vercel?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'NeuroChat AI natively supports Groq LLaMA 3 compound models with ultra-fast token streaming, Hugging Face all-MiniLM-L6-v2 embeddings, and client-side offline neural pattern fallback.',
        },
      },
    ],
  };

  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="AI Chatbot Vercel" />
        {/* JSON-LD Structured Data for Google Rich Snippets & Knowledge Graph */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      </head>
      <body className="bg-slate-950 text-gray-100 min-h-screen font-sans antialiased selection:bg-cyan-500 selection:text-slate-950">
        <PwaRegistrar />

        {/* Crawlable Semantic SSR SEO Section (Essential for Googlebot indexing before client hydration) */}
        <article className="sr-only" aria-label="AI Chatbot Vercel - NeuroChat AI Technical Overview">
          <header>
            <h1>AI Chatbot Vercel - NeuroChat AI with Persistent Vector Memory</h1>
            <p>
              Welcome to NeuroChat AI, the premier high-performance AI Chatbot deployed on Vercel. Built with Next.js 14,
              Groq LLaMA 3, Hugging Face Vector Embeddings, PostgreSQL pgvector, and offline Progressive Web App (PWA) capabilities.
            </p>
          </header>
          <section>
            <h2>Key Features of NeuroChat AI Chatbot on Vercel</h2>
            <ul>
              <li>Ultra-Fast Groq LLaMA 3 Compound LLM inference with sub-second streaming responses.</li>
              <li>Persistent Long-Term Memory powered by PostgreSQL pgvector and cosine distance recall.</li>
              <li>Hugging Face sentence-transformers for semantic text vectorization.</li>
              <li>Document Analyzer RAG (Retrieval-Augmented Generation) for PDF, DOCX, and Text analysis.</li>
              <li>Offline Progressive Web App (PWA) with client-side fallback neural response engine.</li>
              <li>Fully responsive dark futuristic glassmorphism user interface built with Tailwind CSS.</li>
              <li>Optimized for one-click deployment on Vercel edge and serverless runtime.</li>
            </ul>
          </section>
          <section>
            <h2>Frequently Asked Questions About AI Chatbot Vercel</h2>
            <h3>What makes this AI Chatbot on Vercel unique?</h3>
            <p>
              Unlike stateless chatbot templates, NeuroChat AI incorporates pgvector persistent memory, enabling the bot
              to remember context across conversations and days, alongside instant Groq inference and offline resilience.
            </p>
            <h3>How do I deploy this AI Chatbot to Vercel?</h3>
            <p>
              Deploy the Next.js frontend directly to Vercel with zero configuration. Connect environment variables for your
              backend API, Groq LLM API key, and database connection strings to get started instantly.
            </p>
          </section>
        </article>

        {children}
      </body>
    </html>
  );
}
