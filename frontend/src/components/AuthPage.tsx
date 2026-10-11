'use client';

import React, { useState } from 'react';
import {
  Brain,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Zap,
  Database,
  Layers,
  AlertCircle,
  Cpu,
  FileSearch,
  CheckCircle2
} from 'lucide-react';
import { api, AuthUser } from '../lib/api';
import { signInWithGoogle } from '../lib/firebase';

interface AuthPageProps {
  onAuthSuccess: (user: AuthUser) => void;
  onContinueAsGuest: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess, onContinueAsGuest }) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Email / Password submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'signup') {
        const res = await api.signup(email.trim(), password, username.trim() || undefined);
        onAuthSuccess(res.user);
      } else {
        const res = await api.signin(email.trim(), password);
        onAuthSuccess(res.user);
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Authentication failed. Please try again.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Google OAuth via Firebase
  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setIsGoogleLoading(true);

    try {
      const googleData = await signInWithGoogle();
      if (!googleData.email) {
        throw new Error('Could not retrieve email from Google Account');
      }

      const res = await api.continueWithGoogle({
        email: googleData.email,
        displayName: googleData.displayName,
        photoURL: googleData.photoURL || undefined,
        uid: googleData.uid,
        idToken: googleData.idToken,
      });

      onAuthSuccess(res.user);
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setErrorMessage('Google sign-in popup was cancelled.');
      } else {
        setErrorMessage(err.response?.data?.error || err.message || 'Failed to sign in with Google');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col lg:flex-row relative overflow-hidden select-none">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/15 rounded-full blur-[140px] pointer-events-none" />

      {/* ========================================================================= */}
      {/* LEFT SIDE: VIDEO SHOWCASE PANEL (frontend/resources/NeuroChat_AI.mp4)     */}
      {/* ========================================================================= */}
      <div className="relative w-full lg:w-1/2 min-h-[380px] lg:min-h-screen flex flex-col justify-between p-6 sm:p-10 lg:p-12 overflow-hidden border-b lg:border-b-0 lg:border-r border-white/10 shrink-0">
        {/* Background Video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-80"
        >
          <source src="/resources/NeuroChat_AI.mp4" type="video/mp4" />
          <source src="/NeuroChat_AI.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>

        {/* Video Overlays for Contrast & Seamless Dark UI Blending */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-slate-950/70 pointer-events-none" />
        <div className="hidden lg:block absolute inset-y-0 right-0 w-32 bg-gradient-to-r from-transparent to-slate-950 pointer-events-none" />
        <div className="absolute inset-0 bg-indigo-950/20 mix-blend-color pointer-events-none" />

        {/* Top Header on Left Panel */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 p-[1.5px] shadow-glow-cyan shrink-0">
              <div className="w-full h-full bg-slate-950/90 rounded-[14px] flex items-center justify-center">
                <Brain className="w-6 h-6 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-xl text-white tracking-wide">
                  NeuroChat <span className="text-gradient">AI</span>
                </span>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  v2.0
                </span>
              </div>
              <p className="text-xs text-gray-400">Neural Vector Architecture</p>
            </div>
          </div>

          <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-full glass-pill text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-300 font-medium">Neural Engine Active</span>
          </div>
        </div>

        {/* Bottom Hero Tagline & Stats on Left Panel */}
        <div className="relative z-10 mt-auto pt-8">
          <div className="max-w-lg">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-cyan-300 mb-3 backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Persistent Cross-Session Vector Memory</span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white leading-tight tracking-wide">
              Intelligence That Remembers Every Detail.
            </h2>
            <p className="text-xs sm:text-sm text-gray-300 mt-2.5 leading-relaxed">
              Equipped with PostgreSQL pgvector embeddings, Groq ultra-low latency inference, and multi-format document RAG analysis.
            </p>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3 mt-6">
              <div className="glass-panel p-3 rounded-2xl border border-white/10 flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                  <Cpu className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <div className="text-xs font-bold text-white">Groq Llama 3</div>
                  <div className="text-[10px] text-gray-400">Sub-second Speed</div>
                </div>
              </div>

              <div className="glass-panel p-3 rounded-2xl border border-white/10 flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                  <Database className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <div className="text-xs font-bold text-white">Vector Memory</div>
                  <div className="text-[10px] text-gray-400">384-D HF Embeddings</div>
                </div>
              </div>

              <div className="glass-panel p-3 rounded-2xl border border-white/10 flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                  <FileSearch className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <div className="text-xs font-bold text-white">Doc RAG Engine</div>
                  <div className="text-[10px] text-gray-400">PDF, DOCX & Text</div>
                </div>
              </div>

              <div className="glass-panel p-3 rounded-2xl border border-white/10 flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <div className="text-xs font-bold text-white">Bcrypt Protected</div>
                  <div className="text-[10px] text-gray-400">Encrypted Credentials</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RIGHT SIDE: SIGN IN & SIGN UP FORM PANEL                                  */}
      {/* ========================================================================= */}
      <div className="w-full lg:w-1/2 min-h-screen flex flex-col justify-center items-center px-4 sm:px-8 lg:px-12 py-8 lg:py-12 z-10 relative overflow-y-auto">
        <div className="w-full max-w-md flex flex-col items-center">
          {/* Form Header */}
          <div className="w-full mb-6 text-center">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-wide">
              {mode === 'signin' ? 'Welcome Back' : 'Create an Account'}
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">
              {mode === 'signin'
                ? 'Sign in to access your chat history and memory vectors'
                : 'Join NeuroChat AI to unlock persistent cross-session memory'}
            </p>
          </div>

          {/* Glass Form Card */}
          <div className="w-full glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl backdrop-blur-2xl relative">
            {/* Sign In / Sign Up Mode Switcher Tabs */}
            <div className="flex p-1 bg-slate-950/70 border border-white/10 rounded-2xl mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setErrorMessage(null);
                }}
                className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-200 cursor-pointer ${
                  mode === 'signin'
                    ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-glow-cyan'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setErrorMessage(null);
                }}
                className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-200 cursor-pointer ${
                  mode === 'signup'
                    ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-glow-cyan'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Error Message Alert */}
            {errorMessage && (
              <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start space-x-2 text-red-300 text-xs animate-shake">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span className="flex-1">{errorMessage}</span>
              </div>
            )}

            {/* 1. Continue with Google Button (Firebase Auth) */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading || isLoading}
              className="w-full flex items-center justify-center space-x-3 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/15 hover:border-white/25 text-white font-medium text-sm transition-all duration-200 shadow-md group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mb-5"
            >
              {isGoogleLoading ? (
                <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.97 0 12c0 2.03.45 3.84 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
              )}
              <span className="group-hover:text-cyan-300 transition-colors">
                {isGoogleLoading ? 'Connecting to Google...' : 'Continue with Google'}
              </span>
            </button>

            {/* Divider */}
            <div className="flex items-center my-5">
              <div className="flex-1 h-[1px] bg-white/10" />
              <span className="px-3 text-[11px] uppercase tracking-wider font-semibold text-gray-400">
                Or with email
              </span>
              <div className="flex-1 h-[1px] bg-white/10" />
            </div>

            {/* 2. Email & Password Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">
                    Display Name (Optional)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. Alex Turing"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-white/10 focus:border-cyan-500 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-white/10 focus:border-cyan-500 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-medium text-gray-300">Password</label>
                  {mode === 'signin' && (
                    <span className="text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors">
                      Hashed with Bcrypt
                    </span>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950/80 border border-white/10 focus:border-cyan-500 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {mode === 'signup' && (
                  <p className="text-[11px] text-gray-400 mt-1">
                    At least 6 characters. Passwords are securely hashed with Bcrypt.
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading || isGoogleLoading}
                className="w-full mt-2 py-3 px-4 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 active:scale-[0.99] transition-all shadow-glow-cyan flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{mode === 'signup' ? 'Create Account' : 'Sign In to NeuroChat'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo / Guest Mode */}
            <div className="mt-5 pt-4 border-t border-white/10 text-center">
              <button
                type="button"
                onClick={onContinueAsGuest}
                className="text-xs text-gray-400 hover:text-cyan-300 font-medium transition-colors flex items-center justify-center space-x-1 mx-auto cursor-pointer"
              >
                <span>Explore as Guest without account</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-400 inline" />
              </button>
            </div>
          </div>

          {/* Security & Architecture Badges */}
          <div className="mt-6 flex flex-wrap justify-center items-center gap-2.5 sm:gap-3 text-[11px] text-gray-400">
            <div className="flex items-center space-x-1.5 glass-pill px-3 py-1 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Bcrypt Hashing</span>
            </div>
            <div className="flex items-center space-x-1.5 glass-pill px-3 py-1 rounded-full">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>Node Load Balancer</span>
            </div>
            <div className="flex items-center space-x-1.5 glass-pill px-3 py-1 rounded-full">
              <Database className="w-3.5 h-3.5 text-purple-400" />
              <span>Read Replicas & GIN</span>
            </div>
            <div className="flex items-center space-x-1.5 glass-pill px-3 py-1 rounded-full">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Redis & BullMQ</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
