import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  Bookmark,
  ChevronRight,
  Layers,
  LogOut,
  Menu,
  Plus,
  Shirt,
  User as UserIcon,
  X,
} from 'lucide-react';
import type { WardrobeGender } from '../types/stylist';

export type AppPageId = 'closet' | 'mix' | 'saved' | 'profile';

interface HeaderProps {
  savedCount: number;
  closetCount: number;
  activePage: AppPageId;
  gender: WardrobeGender;
  user: User;
  onSignOut: () => void;
  onTriggerUpload: () => void;
  onNavigatePage: (pageId: AppPageId) => void;
}

export function Header({
  savedCount,
  closetCount,
  activePage,
  gender,
  user,
  onSignOut,
  onTriggerUpload,
  onNavigatePage,
}: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const shortName =
    user.displayName?.split(' ')[0] || user.email?.split('@')[0] || 'Profile';

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen]);

  const handleNavSelect = (pageId: AppPageId) => {
    setIsMobileMenuOpen(false);
    onNavigatePage(pageId);
  };

  const desktopNavItems: Array<{
    id: AppPageId;
    label: string;
  }> = [
    {
      id: 'closet',
      label: closetCount > 0 ? `My Closet (${closetCount})` : 'My Closet',
    },
    {
      id: 'mix',
      label: 'Mix & Match',
    },
    {
      id: 'saved',
      label: savedCount > 0 ? `Saved (${savedCount})` : 'Saved Looks',
    },
  ];

  const mobileNavItems: Array<{
    id: AppPageId;
    label: string;
    icon: typeof Shirt;
  }> = [
    {
      id: 'closet',
      label: closetCount > 0 ? `My Closet (${closetCount})` : 'My Closet',
      icon: Shirt,
    },
    {
      id: 'mix',
      label: 'Mix & Match',
      icon: Layers,
    },
    {
      id: 'saved',
      label: savedCount > 0 ? `Saved Looks (${savedCount})` : 'Saved Looks',
      icon: Bookmark,
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: UserIcon,
    },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E5E0D8] shadow-[0_1px_8px_-4px_rgba(25,24,22,0.06)]">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 h-14 lg:h-16 flex items-center justify-between gap-4 lg:gap-8">
        <a
          href="#closet"
          onClick={(e) => {
            e.preventDefault();
            handleNavSelect('closet');
          }}
          className="font-display text-xl sm:text-2xl font-semibold tracking-tight text-[#191816] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#191816]"
        >
          OutfitVault
        </a>

        <nav
          aria-label="Primary navigation"
          className="hidden lg:flex items-center gap-7 text-sm font-medium text-[#5E5A54]"
        >
          {desktopNavItems.map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavSelect(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`hover:text-[#191816] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 tabular-nums cursor-pointer ${
                  isActive ? 'text-[#191816] font-semibold underline underline-offset-4' : ''
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="hidden lg:flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => handleNavSelect('profile')}
            aria-label="Open profile"
            aria-current={activePage === 'profile' ? 'page' : undefined}
            title="Profile"
            className={`w-10 h-10 rounded-full inline-flex items-center justify-center border transition-colors shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#191816] ${
              activePage === 'profile'
                ? 'bg-[#8E1B35] text-white border-[#8E1B35] shadow-xs'
                : 'bg-white text-[#191816] border-[#E5E0D8] hover:border-[#191816]'
            }`}
          >
            <UserIcon className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-menu-drawer"
          aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
          className="lg:hidden inline-flex items-center justify-center gap-1.5 min-h-10 px-3.5 py-2 text-xs font-semibold text-[#191816] bg-white border border-[#E5E0D8] rounded-lg active:bg-[#EFECE6] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          {isMobileMenuOpen ? (
            <>
              <X className="w-4 h-4" aria-hidden="true" />
              Close
            </>
          ) : (
            <>
              <Menu className="w-4 h-4" aria-hidden="true" />
              Menu
            </>
          )}
        </button>
      </div>

      {isMobileMenuOpen && (
        <>
          <div
            aria-hidden="true"
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden fixed inset-0 top-14 z-30 bg-black/35 backdrop-blur-xs"
          />
          <div
            id="mobile-menu-drawer"
            role="dialog"
            aria-label="Navigation menu"
            className="lg:hidden absolute inset-x-0 top-full z-40 bg-white border-b border-[#E5E0D8] shadow-xl px-4 py-4 space-y-4 max-h-[calc(100dvh-3.5rem)] overflow-y-auto"
          >
            <nav aria-label="App pages" className="divide-y divide-[#EFECE6]">
              {mobileNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavSelect(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`w-full min-h-12 py-3 px-2.5 flex items-center justify-between gap-3 text-left text-sm rounded-lg transition-colors cursor-pointer ${
                      isActive
                        ? 'text-[#8E1B35] font-semibold bg-[#FAF2F4]'
                        : 'text-[#191816] font-medium hover:bg-[#F9F8F5]'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span className="tabular-nums">{item.label}</span>
                    </span>
                    <ChevronRight
                      className="w-4 h-4 text-[#78746D] shrink-0"
                      aria-hidden="true"
                    />
                  </button>
                );
              })}
            </nav>

            <div className="pt-2 border-t border-[#E5E0D8] flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onTriggerUpload();
                }}
                className="w-full min-h-12 inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-[#191816] rounded-xl active:bg-[#2F2D2A] cursor-pointer"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                Add Clothes &amp; Accessories
              </button>

              <div className="flex items-center justify-between gap-3 bg-[#F9F8F5] border border-[#E5E0D8] rounded-xl px-3.5 py-2.5">
                <button
                  type="button"
                  onClick={() => handleNavSelect('profile')}
                  className="min-w-0 text-left cursor-pointer"
                >
                  <span className="block text-[11px] text-[#5E5A54]">
                    {gender === 'female' ? "Women's Closet" : "Men's Closet"} &middot; View Profile
                  </span>
                  <span className="block text-xs font-semibold text-[#191816] truncate">
                    {user.displayName || user.email || shortName}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onSignOut();
                  }}
                  className="min-h-10 px-3 py-2 text-xs font-medium text-[#191816] bg-white border border-[#E5E0D8] rounded-lg inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
