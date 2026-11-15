import { ArrowRight, LogOut } from 'lucide-react';
import type { WardrobeGender } from '../types/stylist';
import { BrandMark } from './BrandMark';

interface GenderOnboardingViewProps {
  userName: string;
  previousGender?: WardrobeGender;
  onSelectGender: (gender: 'male' | 'female') => void;
  onSignOut: () => void;
}

export function GenderOnboardingView({
  userName,
  previousGender,
  onSelectGender,
  onSignOut,
}: GenderOnboardingViewProps) {
  return (
    <div className="min-h-screen atelier-surface text-[#191816] flex flex-col">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E5E0D8] shadow-[0_1px_8px_-4px_rgba(25,24,22,0.06)]">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 h-14 lg:h-16 flex items-center justify-between gap-4">
          <span className="inline-flex items-center gap-2.5 font-display text-xl sm:text-2xl font-semibold tracking-tight text-[#191816] whitespace-nowrap">
            <BrandMark className="w-7 h-7 sm:w-8 sm:h-8 shrink-0" />
            <span>OutfitVault</span>
          </span>
          <div className="flex items-center gap-2.5">
            <span className="hidden sm:inline text-xs font-medium text-[#5E5A54]">
              {userName}
            </span>
            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex items-center gap-1.5 min-h-10 sm:min-h-9 px-3 py-1.5 text-xs font-medium text-[#191816] bg-white border border-[#E5E0D8] rounded-lg hover:bg-[#EFECE6] transition-colors whitespace-nowrap cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-10 sm:py-16">
        <div className="max-w-2xl w-full space-y-8">
          <div className="space-y-3 text-center">
            <p className="text-xs font-medium tracking-wide text-[#5E5A54]">
              Welcome, {userName} · Quick Setup
            </p>
            <h1 className="font-display text-[clamp(2.1rem,4.5vw,3.3rem)] font-semibold leading-[1.08] tracking-tight text-[#191816] text-balance">
              Select your wardrobe style
            </h1>
            <p className="text-sm sm:text-[15px] text-[#5E5A54] max-w-lg mx-auto leading-relaxed">
              Choose Male or Female so we organize your closet categories—clothes, shoes, watches,
              specs, and bags—for you right away.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => onSelectGender('male')}
              className={`group text-left bg-white border shadow-[0_2px_14px_-6px_rgba(25,24,22,0.08)] rounded-2xl p-6 transition-all cursor-pointer flex flex-col justify-between gap-5 min-h-[168px] hover:border-[#191816] active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-[#191816] ${
                previousGender === 'male'
                  ? 'border-[#8E1B35] ring-1 ring-[#8E1B35]/20'
                  : 'border-[#E5E0D8]'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-3xl font-semibold text-[#191816]">
                    Male
                  </span>
                  {previousGender === 'male' && (
                    <span className="text-[11px] font-semibold text-[#8E1B35]">
                      Last selected
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#5E5A54] leading-relaxed">
                  Shirts &amp; Tops · Jackets &amp; Blazers · Trousers &amp; Shorts · Shoes · Watches
                  · Specs · Bags · Accessories
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#191816] group-hover:text-[#8E1B35] transition-colors">
                Enter Men&apos;s Closet
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </span>
            </button>

            <button
              type="button"
              onClick={() => onSelectGender('female')}
              className={`group text-left bg-white border shadow-[0_2px_14px_-6px_rgba(25,24,22,0.08)] rounded-2xl p-6 transition-all cursor-pointer flex flex-col justify-between gap-5 min-h-[168px] hover:border-[#191816] active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-[#191816] ${
                previousGender === 'female'
                  ? 'border-[#8E1B35] ring-1 ring-[#8E1B35]/20'
                  : 'border-[#E5E0D8]'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-3xl font-semibold text-[#191816]">
                    Female
                  </span>
                  {previousGender === 'female' && (
                    <span className="text-[11px] font-semibold text-[#8E1B35]">
                      Last selected
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#5E5A54] leading-relaxed">
                  Tops &amp; Blouses · Dresses &amp; Jumpsuits · Coats &amp; Blazers · Skirts &amp;
                  Trousers · Shoes · Bags · Watches · Specs
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#191816] group-hover:text-[#8E1B35] transition-colors">
                Enter Women&apos;s Closet
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
