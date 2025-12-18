'use client';

import { useState, useCallback, memo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';

// Memoized loading spinner component
const LoadingSpinner = memo(() => (
  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
));
LoadingSpinner.displayName = 'LoadingSpinner';

// Memoized background orbs - prevents re-render on state changes
const BackgroundOrbs = memo(() => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#4A90F5] opacity-10 rounded-full blur-3xl animate-pulse-slow" />
    <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#C74AFF] opacity-10 rounded-full blur-3xl animate-pulse-slow animation-delay-1000" />
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#5EC5E5] opacity-5 rounded-full blur-3xl animate-pulse-slow animation-delay-2000" />
  </div>
));
BackgroundOrbs.displayName = 'BackgroundOrbs';

// Memoized signature component
const Signature = memo(() => (
  <div className="fixed bottom-4 right-4 z-20">
    <div className="flex items-center gap-4">
      <div className="h-0.5 w-64 bg-gradient-to-r from-[#4A90F5] to-[#C74AFF] animated-gradient" />
      <div className="text-right">
        <p className="text-gray-400 text-lg">PAA--Solutions Tool</p>
        <p className="text-gray-500 text-base">WWW.PAA-Solutions.com</p>
      </div>
    </div>
  </div>
));
Signature.displayName = 'Signature';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  // Memoized handlers to prevent unnecessary re-renders
  const handleUsernameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
  }, []);

  const handlePasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
  }, []);

  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    
    setLoading(true);
    setError(null);

    try {
      const email = username.includes('@') ? username : `${username}@app.local`;
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError('Invalid username or password');
        return;
      }

      // Prefetch modules page for faster navigation
      router.prefetch('/modules');
      router.push('/modules');
      router.refresh();
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [username, password, loading, router, supabase.auth]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0e1a] via-[#1a1233] to-[#0f1419] relative overflow-hidden">
      <BackgroundOrbs />

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md transform transition-all duration-300 ease-out">
          <div className="bg-[#1a1f2e]/80 backdrop-blur-xl border border-[#2a3144] rounded-lg p-8 shadow-2xl">
            {/* Logo */}
            <div className="flex items-center justify-center mb-8">
              <Image 
                src="/logo.png" 
                alt="PAA Solutions" 
                width={121}
                height={64}
                className="w-[121px] h-[64px]"
                priority
                loading="eager"
              />
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label htmlFor="username" className="block text-white mb-2 text-sm font-medium">
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  placeholder="Enter your username"
                  value={username}
                  onChange={handleUsernameChange}
                  disabled={loading}
                  required
                  autoComplete="username"
                  className="w-full h-12 px-4 bg-[#242938] border border-[#2a3144] rounded-md text-white text-base placeholder:text-gray-500 outline-none transition-colors duration-200 focus:border-[#4A90F5] focus:ring-2 focus:ring-[#4A90F5]/30 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-white mb-2 text-sm font-medium">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={handlePasswordChange}
                  disabled={loading}
                  required
                  autoComplete="current-password"
                  className="w-full h-12 px-4 bg-[#242938] border border-[#2a3144] rounded-md text-white text-base placeholder:text-gray-500 outline-none transition-colors duration-200 focus:border-[#4A90F5] focus:ring-2 focus:ring-[#4A90F5]/30 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md animate-shake">
                  <p className="text-red-400 text-sm text-center">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-gradient-to-r from-[#4A90F5] to-[#C74AFF] hover:opacity-90 text-white text-sm font-medium rounded-md transition-all duration-200 animated-gradient disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <LoadingSpinner />
                    <span>Logging in...</span>
                  </>
                ) : (
                  'Login'
                )}
              </button>
            </form>
          </div>
        </div>

        <Signature />
      </div>
    </div>
  );
}
