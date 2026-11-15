import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  Bookmark,
  ChevronRight,
  Layers,
  LayoutGrid,
  LogOut,
  Menu,
  Mic,
  Plus,
  Shirt,
  User as UserIcon,
  X,
} from 'lucide-react';
import type { WardrobeGender } from '../types/stylist';

export type AppPageId = 'closet' | 'outfits' | 'mix' | 'voice' | 'saved' | 'profile';

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

  const navItems: Array<{
    id: AppPageId;
    label: string;
    desktopLabel: string;
    icon: typeof Shirt;
  }> = [
    {
      id: 'closet',
      label: closetCount > 0 ? `My Closet (${closetCount})` : 'My Closet',
      desktopLabel: closetCount > 0 ? `My Closet (${closetCount})` : 'My Closet',
      icon: Shirt,
    },
    {
      id: 'outfits',
      label: '3 Outfits',
      desktopLabel: '3 Outfits',
      icon: LayoutGrid,
    },
    {
      id: 'mix',
      label: 'Mix & Match',
      desktopLabel: 'Mix & Match',
      icon: Layers,
    },
    {
      id: 'voice',
      label: 'Voice Stylist',
      desktopLabel: 'Voice Stylist',
      icon: Mic,
    },
    {
      id: 'saved',
      label: savedCount > 0 ? `Saved Looks (${savedCount})` : 'Saved Looks',
      desktopLabel: savedCount > 0 ? `Saved (${savedCount})` : 'Saved Looks',
      icon: Bookmark,
    },
    {
      id: 'profile',
      label: 'Profile',
      desktopLabel: 'Profile',
      icon: UserIcon,
    },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#F8F8F7]/95 backdrop-blur-md border-b border-[#E4E4E7]">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 h-14 lg:h-16 flex items-center justify-between gap-4 lg:gap-8">
        <a
          href="#closet"
          onClick={(e) => {
            e.preventDefault();
            handleNavSelect('closet');
          }}
          className="font-display text-xl sm:text-2xl font-semibold tracking-tight text-[#141413] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#141413]"
        >
          Atelier Edit
        </a>

        <nav
          aria-label="Primary navigation"
          className="hidden lg:flex items-center gap-6 text-sm font-medium text-[#575652]"
        >
          {navItems.map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavSelect(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`hover:text-[#141413] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 tabular-nums cursor-pointer ${
                  isActive ? 'text-[#141413] font-semibold underline underline-offset-4' : ''
                }`}
              >
                {item.desktopLabel}
              </button>
            );
          })}
        </nav>

        <div className="hidden lg:flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onTriggerUpload}
            className="min-h-9 px-4 py-2 text-xs font-semibold tracking-wide text-white bg-[#141413] rounded-lg hover:bg-[#2C2C2A] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#141413]"
          >
            Add Clothes
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-menu-drawer"
          aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
          className="lg:hidden inline-flex items-center justify-center gap-1.5 min-h-10 px-3.5 py-2 text-xs font-semibold text-[#141413] bg-white border border-[#E4E4E7] rounded-lg active:bg-[#EFEFEF] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
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
            className="lg:hidden absolute inset-x-0 top-full z-40 bg-white border-b border-[#E4E4E7] shadow-xl px-4 py-4 space-y-4 max-h-[calc(100dvh-3.5rem)] overflow-y-auto"
          >
            <nav aria-label="App pages" className="divide-y divide-[#EFEFEF]">
              {navItems.map((item) => {
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
                        ? 'text-[#9E1B32] font-semibold bg-[#FAF3F4]/70'
                        : 'text-[#141413] font-medium hover:bg-[#F8F8F7]'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span className="tabular-nums">{item.label}</span>
                    </span>
                    <ChevronRight
                      className="w-4 h-4 text-[#787772] shrink-0"
                      aria-hidden="true"
                    />
                  </button>
                );
              })}
            </nav>

            <div className="pt-2 border-t border-[#E4E4E7] flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onTriggerUpload();
                }}
                className="w-full min-h-12 inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-[#141413] rounded-xl active:bg-[#2C2C2A] cursor-pointer"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                Add Clothes &amp; Accessories
              </button>

              <div className="flex items-center justify-between gap-3 bg-[#F8F8F7] border border-[#E4E4E7] rounded-xl px-3.5 py-2.5">
                <button
                  type="button"
                  onClick={() => handleNavSelect('profile')}
                  className="min-w-0 text-left cursor-pointer"
                >
                  <span className="block text-[11px] text-[#575652]">
                    {gender === 'female' ? "Women's Closet" : "Men's Closet"} &middot; View Profile
                  </span>
                  <span className="block text-xs font-semibold text-[#141413] truncate">
                    {user.displayName || user.email || shortName}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onSignOut();
                  }}
                  className="min-h-10 px-3 py-2 text-xs font-medium text-[#141413] bg-white border border-[#E4E4E7] rounded-lg inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
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
