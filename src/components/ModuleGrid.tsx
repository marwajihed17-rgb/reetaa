'use client';

import { useRouter } from 'next/navigation';
import { memo, useCallback, useMemo, useEffect, useState } from 'react';
import { ModuleType, MODULE_CONFIG } from '@/types';
import AdminPanelModal from './AdminPanelModal';

interface ModuleGridProps {
  allModules: ModuleType[];
  userModules: ModuleType[];
  isAdmin?: boolean;
  currentUserId?: string;
}

// Memoized module card component
const ModuleCard = memo(({ 
  module, 
  config, 
  isEnabled, 
  onClick,
  index 
}: { 
  module: ModuleType;
  config: typeof MODULE_CONFIG[ModuleType];
  isEnabled: boolean;
  onClick: () => void;
  index: number;
}) => {
  return (
    <button
      onClick={onClick}
      disabled={!isEnabled}
      className={`
        module-card group relative p-6 rounded-2xl border text-left transition-all duration-300
        animate-fade-in opacity-0
        ${isEnabled 
          ? 'bg-[#1a1f2e]/50 border-[#2a3144] hover:border-[#4A90F5]/50 hover:bg-[#1a1f2e]/80 cursor-pointer hover:shadow-xl hover:shadow-[#4A90F5]/10' 
          : 'bg-[#1a1f2e]/20 border-[#2a3144]/50 cursor-not-allowed opacity-50'
        }
      `}
      style={{ 
        animationDelay: `${index * 0.1}s`,
        animationFillMode: 'forwards'
      }}
    >
      {/* Icon */}
      <div className={`
        w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-all duration-300
        ${isEnabled 
          ? 'bg-gradient-to-br from-[#4A90F5] to-[#C74AFF] shadow-lg shadow-[#4A90F5]/20 group-hover:scale-110 group-hover:shadow-[#4A90F5]/30' 
          : 'bg-[#242938]'
        }
      `}>
        <span className="text-2xl">{config.icon}</span>
      </div>

      {/* Content */}
      <h3 className="text-lg font-semibold text-white mb-1">{config.name}</h3>
      <p className="text-sm text-gray-400">{config.description}</p>

      {/* Status indicator */}
      <div className="absolute top-4 right-4">
        {isEnabled ? (
          <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            Active
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs text-gray-500 bg-[#242938] px-2 py-1 rounded-full">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            Locked
          </span>
        )}
      </div>

      {/* Hover arrow */}
      {isEnabled && (
        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </div>
      )}
    </button>
  );
});
ModuleCard.displayName = 'ModuleCard';

// Admin Module Card
const AdminModuleCard = memo(({ 
  onClick,
  index 
}: { 
  onClick: () => void;
  index: number;
}) => {
  return (
    <button
      onClick={onClick}
      className={`
        module-card group relative p-6 rounded-2xl border text-left transition-all duration-300
        animate-fade-in opacity-0
        bg-[#1a1f2e]/50 border-amber-500/30 hover:border-amber-500/60 hover:bg-[#1a1f2e]/80 cursor-pointer hover:shadow-xl hover:shadow-amber-500/10
      `}
      style={{ 
        animationDelay: `${index * 0.1}s`,
        animationFillMode: 'forwards'
      }}
    >
      {/* Icon */}
      <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/20 group-hover:scale-110 group-hover:shadow-amber-500/30">
        <span className="text-2xl">⚙️</span>
      </div>

      {/* Content */}
      <h3 className="text-lg font-semibold text-white mb-1">Admin Panel</h3>
      <p className="text-sm text-gray-400">Manage users, permissions & settings</p>

      {/* Status indicator */}
      <div className="absolute top-4 right-4">
        <span className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 px-2 py-1 rounded-full">
          <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
          Admin
        </span>
      </div>

      {/* Hover arrow */}
      <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </div>
    </button>
  );
});
AdminModuleCard.displayName = 'AdminModuleCard';

function ModuleGrid({ allModules, userModules, isAdmin = false, currentUserId = '' }: ModuleGridProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);

  // Trigger animation on mount
  useEffect(() => {
    setMounted(true);
    // Prefetch all enabled module pages
    userModules.forEach((module) => {
      router.prefetch(`/chat/${module}`);
    });
  }, [userModules, router]);

  // Memoized click handler factory
  const createClickHandler = useCallback((module: ModuleType, isEnabled: boolean) => {
    return () => {
      if (isEnabled) {
        router.push(`/chat/${module}`);
      }
    };
  }, [router]);

  // Memoized user modules set for O(1) lookup
  const userModulesSet = useMemo(() => new Set(userModules), [userModules]);

  const openAdminPanel = useCallback(() => {
    setAdminPanelOpen(true);
  }, []);

  const closeAdminPanel = useCallback(() => {
    setAdminPanelOpen(false);
  }, []);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {allModules.map((module, index) => {
          const config = MODULE_CONFIG[module];
          const isEnabled = userModulesSet.has(module);

          return (
            <ModuleCard
              key={module}
              module={module}
              config={config}
              isEnabled={isEnabled}
              onClick={createClickHandler(module, isEnabled)}
              index={index}
            />
          );
        })}
        
        {/* Admin Module - Only show for admin users */}
        {isAdmin && (
          <AdminModuleCard 
            onClick={openAdminPanel}
            index={allModules.length}
          />
        )}
      </div>

      {/* Admin Panel Modal */}
      {isAdmin && (
        <AdminPanelModal
          isOpen={adminPanelOpen}
          onClose={closeAdminPanel}
          currentUserId={currentUserId}
        />
      )}
    </>
  );
}

export default memo(ModuleGrid);
