import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NeuroChat AI - Chatbot with Persistent Vector Memory',
  description: 'AI Chatbot powered by Groq LLM, Hugging Face Vector Embeddings, and PostgreSQL pgvector memory recall.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-gray-100 min-h-screen font-sans antialiased selection:bg-cyan-500 selection:text-slate-950">
        {children}
      </body>
    </html>
  );
}
