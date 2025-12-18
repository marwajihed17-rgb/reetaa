import { redirect, notFound } from 'next/navigation';
import dynamic from 'next/dynamic';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ModuleType, MODULE_CONFIG } from '@/types';
import Link from 'next/link';

// Lazy load ChatInterface
const ChatInterface = dynamic(() => import('@/components/ChatInterface'), {
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-[#0a0e1a] via-[#1a1233] to-[#0f1419]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-[#4A90F5]/30 border-t-[#4A90F5] rounded-full animate-spin" />
        <p className="text-gray-400">Loading chat...</p>
      </div>
    </div>
  ),
  ssr: false,
});

interface ChatPageProps {
  params: Promise<{
    module: string;
  }>;
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { module } = await params;
  
  // Validate module
  if (!Object.keys(MODULE_CONFIG).includes(module)) {
    notFound();
  }

  const supabase = await createServerSupabaseClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }

  // Fetch user's modules and username
  const { data: userData, error } = await supabase
    .from('users')
    .select('username, modules')
    .eq('id', user.id)
    .single();

  if (error || !userData) {
    redirect('/login');
  }

  const userModules = (userData.modules || []) as ModuleType[];
  
  // Check if user has access to this module
  if (!userModules.includes(module as ModuleType)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0e1a] via-[#1a1233] to-[#0f1419]">
        <div className="text-center animate-fade-in">
          <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-gray-400 mb-6">You don&apos;t have permission to access this module.</p>
          <Link 
            href="/modules"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#4A90F5] to-[#C74AFF] text-white font-medium rounded-xl transition-all duration-200 hover:opacity-90"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Modules
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ChatInterface 
      userId={user.id} 
      username={userData.username}
      module={module as ModuleType} 
    />
  );
}

// Generate static params for better performance
export async function generateStaticParams() {
  return Object.keys(MODULE_CONFIG).map((module) => ({
    module,
  }));
}
