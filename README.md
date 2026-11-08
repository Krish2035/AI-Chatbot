# ⚡ AI Chatbot Vercel — NeuroChat AI

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FKrish2035%2FAI-Chatbot)
[![Next.js 14](https://img.shields.io/badge/Next.js-14-black?style=flat&logo=next.js)](https://nextjs.org/)
[![Groq LLaMA 3](https://img.shields.io/badge/Groq-LLaMA%203-orange?style=flat)](https://groq.com/)
[![PostgreSQL pgvector](https://img.shields.io/badge/PostgreSQL-pgvector-blue?style=flat&logo=postgresql)](https://github.com/pgvector/pgvector)
[![PWA Ready](https://img.shields.io/badge/PWA-Offline%20Ready-green?style=flat)](https://web.dev/progressive-web-apps/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **The premier open-source AI Chatbot on Vercel.** Built with **Next.js 14 App Router**, **Groq LLaMA 3** ultra-fast inference (500+ tokens/sec), **PostgreSQL pgvector** persistent cross-session memory recall, **Hugging Face** embeddings, and an **offline Progressive Web App (PWA)** fallback engine.
>
> 🌐 **Live Website**: [https://ai-chatbot-nine-delta.vercel.app](https://ai-chatbot-nine-delta.vercel.app)

---

## 🌟 Key Features

* **⚡ Ultra-Low Latency Inference**: Powered by Groq LLaMA 3 compound models streaming answers in sub-seconds.
* **🧠 Persistent Vector Memory**: Every conversation is converted into 384-dimensional dense vectors using Hugging Face `sentence-transformers` and recalled via PostgreSQL `pgvector` Cosine Similarity (`<=>`).
* **▲ Optimized for Vercel**: 100% compatible with Vercel Serverless & Edge deployment with instant static pre-rendering and dynamic SEO metadata.
* **📱 Offline Progressive Web App (PWA)**: Fully installable on iOS, Android, macOS, and Windows with a client-side neural pattern fallback engine when disconnected.
* **📄 Document Intelligence RAG**: Upload and query PDFs, DOCX, and text documents with vector chunk retrieval.
* **🔒 Enterprise Security**: Bcrypt salted passwords, JWT token rotation, and Firebase Google OAuth authentication.

---

## 🚀 One-Click Deploy to Vercel

You can deploy the frontend to Vercel in seconds:

1. Click the **Deploy with Vercel** button above or import this repository in your [Vercel Dashboard](https://vercel.com/new).
2. Set the Root Directory to `frontend`.
3. Configure your Environment Variables:
   * `NEXT_PUBLIC_SITE_URL`: Your Vercel production domain (`https://ai-chatbot-nine-delta.vercel.app`)
   * `NEXT_PUBLIC_API_URL`: Your backend API endpoint URL
   * `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`: Your Google Search Console verification code (optional)
   * `NEXT_PUBLIC_FIREBASE_*`: Your Firebase authentication credentials

---

## 🔍 SEO & Search Engine Optimization

This project includes an end-to-end SEO architecture specifically optimized for **Google Search** ranking for the query **`ai chatbot vercel`**:

1. **Exact-Match Title Tag**: `AI Chatbot Vercel | NeuroChat AI - Next.js Chatbot with Persistent Vector Memory`
2. **Click-Optimized Meta Description**: Keyword-targeted description designed to capture search intent.
3. **Structured Data (Schema.org JSON-LD)**:
   * `WebApplication` schema with software specs and pricing (0 USD).
   * `WebSite` schema with search action.
   * `FAQPage` schema answering the top 5 questions directly in Google rich snippets.
4. **Crawlable SSR Semantic HTML**: Server-rendered `<h1>` and `<article>` tags delivered directly on `GET /` before JavaScript hydration.
5. **OpenGraph & Twitter Cards**: 1200x630 branded social cards (`/og-image.svg`).
6. **Sitemap & Robots**: `/sitemap.xml` and `/robots.txt` automatically accessible at the domain root.

---

## 🛠️ Local Development

### 1. Clone the repository
```bash
git clone https://github.com/Krish2035/AI-Chatbot.git
cd AI-Chatbot
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

### 3. Full Stack Docker Setup
To run the full stack (Frontend, Backend, PostgreSQL pgvector, Redis, Nginx Gateway):
```bash
cp .env.example .env
docker compose up -d --build
```
For complete Docker documentation, see [DOCKER.md](file:///f:/krish/AI-Chatbot/DOCKER.md).

---

## 📄 License
MIT License. Free to use, modify, and deploy.

