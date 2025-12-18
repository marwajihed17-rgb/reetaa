'use client';

import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Chat, Attachment, ModuleType, MODULE_CONFIG } from '@/types';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface ChatInterfaceProps {
  userId: string;
  username: string;
  module: ModuleType;
}

// Loading skeleton component
const MessageSkeleton = memo(() => (
  <div className="space-y-4">
    {[1, 2, 3].map((i) => (
      <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-[60%] ${i % 2 === 0 ? 'order-2' : 'order-1'}`}>
          <div className="skeleton rounded-2xl px-4 py-3 h-16 w-48" />
        </div>
      </div>
    ))}
  </div>
));
MessageSkeleton.displayName = 'MessageSkeleton';

// Empty state component
const EmptyState = memo(({ moduleName }: { moduleName: string }) => (
  <div className="flex-1 flex items-center justify-center p-8">
    <div className="text-center max-w-md">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#4A90F5] to-[#C74AFF] flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[#4A90F5]/20">
        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">
        Start a conversation
      </h3>
      <p className="text-gray-400">
        Send a message to begin using {moduleName}
      </p>
    </div>
  </div>
));
EmptyState.displayName = 'EmptyState';

// Module icon component - matching the modules page
const ModuleIcon = memo(({ module }: { module: ModuleType }) => {
  const config = MODULE_CONFIG[module];
  return <span className="text-2xl">{config.icon}</span>;
});
ModuleIcon.displayName = 'ModuleIcon';

export default function ChatInterface({ userId, username, module }: ChatInterfaceProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const sentMessageIdsRef = useRef<Set<string>>(new Set());
  const supabase = createClient();
  const router = useRouter();
  
  const moduleConfig = useMemo(() => MODULE_CONFIG[module], [module]);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback((instant = false) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: instant ? 'auto' : 'smooth',
        block: 'end' 
      });
    }
  }, []);

  // Fetch initial chats
  useEffect(() => {
    let isMounted = true;
    
    const fetchChats = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('chats')
          .select('*')
          .eq('user_id', userId)
          .eq('module', module)
          .order('created_at', { ascending: true })
          .limit(100);

        if (fetchError) throw fetchError;
        
        if (isMounted) {
          setChats(data || []);
          // Track existing message IDs
          data?.forEach(chat => sentMessageIdsRef.current.add(chat.id));
          setLoading(false);
          setTimeout(() => scrollToBottom(true), 50);
        }
      } catch (err) {
        console.error('[ChatInterface] Error fetching chats:', err);
        if (isMounted) {
          setError('Failed to load messages');
          setLoading(false);
        }
      }
    };

    fetchChats();
    
    return () => {
      isMounted = false;
    };
  }, [userId, module, supabase, scrollToBottom]);

  // Real-time subscription - only for BOT messages (user messages are added optimistically)
  useEffect(() => {
    const channel = supabase
      .channel(`chats:${userId}:${module}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chats',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newChat = payload.new as Chat;
          
          // Only process if it's for this module
          if (newChat.module !== module) return;
          
          // Skip if we already have this message (prevents duplicates)
          if (sentMessageIdsRef.current.has(newChat.id)) {
            return;
          }
          
          // Only add bot messages via realtime (user messages are added optimistically)
          if (newChat.sender === 'bot') {
            sentMessageIdsRef.current.add(newChat.id);
            setChats((prev) => [...prev, newChat]);
            setTimeout(() => scrollToBottom(false), 50);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, module, supabase, scrollToBottom]);

  // Clear all chats for this module
  const handleClearChats = useCallback(async () => {
    if (clearing) return;
    
    const confirmed = window.confirm('Are you sure you want to clear all messages in this chat? This action cannot be undone.');
    if (!confirmed) return;
    
    setClearing(true);
    setError(null);
    
    try {
      const { error: deleteError } = await supabase
        .from('chats')
        .delete()
        .eq('user_id', userId)
        .eq('module', module);
      
      if (deleteError) throw deleteError;
      
      // Clear local state
      setChats([]);
      sentMessageIdsRef.current.clear();
      
    } catch (err) {
      console.error('[ChatInterface] Error clearing chats:', err);
      setError('Failed to clear messages');
    } finally {
      setClearing(false);
    }
  }, [clearing, userId, module, supabase]);

  // Logout handler
  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }, [supabase, router]);

  // Send message handler
  const handleSend = useCallback(async (message: string, attachments: Attachment[]) => {
    if (sending) return;
    
    setSending(true);
    setError(null);

    // Create optimistic message
    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticChat: Chat = {
      id: optimisticId,
      user_id: userId,
      module,
      sender: 'user',
      message,
      attachments: attachments.length > 0 ? attachments : null,
      created_at: new Date().toISOString(),
    };

    // Add optimistic message immediately
    setChats((prev) => [...prev, optimisticChat]);
    setTimeout(() => scrollToBottom(false), 50);

    try {
      const response = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module, message, attachments }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      const { chat: savedChat } = await response.json();
      
      // Track the real message ID to prevent duplicate from realtime
      sentMessageIdsRef.current.add(savedChat.id);
      
      // Replace optimistic message with real one
      setChats((prev) => 
        prev.map((c) => c.id === optimisticId ? savedChat : c)
      );
    } catch (err) {
      console.error('[ChatInterface] Send error:', err);
      setChats((prev) => prev.filter((c) => c.id !== optimisticId));
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  }, [sending, userId, module, scrollToBottom]);

  // Memoized chat list
  const chatList = useMemo(() => {
    return chats.map((chat, index) => (
      <ChatMessage 
        key={chat.id} 
        chat={chat} 
        isLast={index === chats.length - 1}
      />
    ));
  }, [chats]);

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-[#0a0e1a] via-[#1a1233] to-[#0f1419] relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#4A90F5] opacity-10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#C74AFF] opacity-10 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="flex-shrink-0 border-b border-[#2a3144]/50 bg-[#0d1117]/80 backdrop-blur-xl relative z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Left side - Back + Module info */}
          <div className="flex items-center gap-3">
            <Link 
              href="/modules"
              className="p-2 rounded-lg hover:bg-[#1a1f2e] text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4A90F5] to-[#C74AFF] flex items-center justify-center shadow-lg">
              <ModuleIcon module={module} />
            </div>
            
            <div>
              <h1 className="text-white font-semibold">{moduleConfig.name}</h1>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-emerald-400 text-xs">Online</span>
              </div>
            </div>
          </div>

          {/* Right side - User info + Actions */}
          <div className="flex items-center gap-2">
            {/* Username */}
            <div className="flex items-center gap-2 text-gray-300 mr-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              <span className="text-sm">{username}</span>
            </div>
            
            {/* Clear Chat Button */}
            <button 
              onClick={handleClearChats}
              disabled={clearing || chats.length === 0}
              className="p-2 rounded-lg hover:bg-[#1a1f2e] text-gray-400 hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Clear chat"
            >
              {clearing ? (
                <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              )}
            </button>
            
            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#1a1f2e] text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
              <span className="text-sm">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div className="flex-shrink-0 bg-red-500/10 border-b border-red-500/20 px-4 py-2 relative z-10">
          <p className="text-red-400 text-sm text-center">{error}</p>
        </div>
      )}

      {/* Messages area - hidden scrollbar */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto hide-scrollbar relative z-10"
        style={{ overscrollBehavior: 'contain' }}
      >
        {loading ? (
          <div className="max-w-4xl mx-auto px-4 py-6">
            <MessageSkeleton />
          </div>
        ) : chats.length === 0 ? (
          <EmptyState moduleName={moduleConfig.name} />
        ) : (
          <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
            {chatList}
            <div ref={messagesEndRef} className="h-1" />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="relative z-10">
        <ChatInput onSend={handleSend} disabled={sending} />
      </div>
    </div>
  );
}
