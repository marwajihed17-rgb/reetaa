import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ModuleType, MODULE_CONFIG } from '@/types';
import ModuleGrid from '@/components/ModuleGrid';
import LogoutButton from '@/components/LogoutButton';
import Image from 'next/image';

export default async function ModulesPage() {
  const supabase = await createServerSupabaseClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }

  // Fetch user's modules and admin status from the users table
  const { data: userData, error } = await supabase
    .from('users')
    .select('username, modules, is_admin, is_active')
    .eq('id', user.id)
    .single();

  if (error || !userData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0e1a] via-[#1a1233] to-[#0f1419]">
        <div className="text-center animate-fade-in">
          <h1 className="text-2xl font-bold text-white mb-2">Account Setup Required</h1>
          <p className="text-gray-400">Please contact your administrator to complete your account setup.</p>
        </div>
      </div>
    );
  }

  // Check if user is active
  if (userData.is_active === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0e1a] via-[#1a1233] to-[#0f1419]">
        <div className="text-center animate-fade-in">
          <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Account Disabled</h1>
          <p className="text-gray-400">Your account has been disabled. Please contact your administrator.</p>
        </div>
      </div>
    );
  }

  const userModules = (userData.modules || []) as ModuleType[];
  const allModules = Object.keys(MODULE_CONFIG) as ModuleType[];
  const isAdmin = userData.is_admin === true;

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#0a0e1a] via-[#1a1233] to-[#0f1419]" />
      
      {/* Animated background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#4A90F5] opacity-10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-[#C74AFF] opacity-10 rounded-full blur-3xl animate-pulse-slow animation-delay-1000" />
      </div>
      
      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-[#2a3144] bg-[#0d1117]/80 backdrop-blur-xl">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image 
                src="/logo.png" 
                alt="PAA Solutions" 
                width={80}
                height={42}
                className="w-[80px] h-auto"
                priority
              />
              <div className="h-8 w-px bg-[#2a3144] mx-2" />
              <div>
                <h1 className="text-lg font-semibold text-white">Dashboard</h1>
                <p className="text-sm text-gray-400">Welcome, {userData.username}</p>
              </div>
            </div>
            <LogoutButton />
          </div>
        </header>

        {/* Module Grid */}
        <main className="max-w-6xl mx-auto px-4 py-8">
          <div className="mb-8 animate-fade-in">
            <h2 className="text-2xl font-bold text-white mb-2">Your Modules</h2>
            <p className="text-gray-400">Select a module to start a conversation</p>
          </div>
          
          <ModuleGrid 
            allModules={allModules} 
            userModules={userModules} 
            isAdmin={isAdmin}
            currentUserId={user.id}
          />
        </main>

        {/* Signature */}
        <div className="fixed bottom-4 right-4">
          <div className="flex items-center gap-4">
            <div className="h-0.5 w-48 bg-gradient-to-r from-[#4A90F5] to-[#C74AFF] animated-gradient" />
            <div className="text-right">
              <p className="text-gray-400 text-sm">PAA--Solutions Tool</p>
              <p className="text-gray-500 text-xs">WWW.PAA-Solutions.com</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
