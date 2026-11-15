import { ArrowRight, LogOut } from 'lucide-react';
import type { WardrobeGender } from '../types/stylist';

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
    <div className="min-h-screen bg-[#F8F8F7] text-[#141413] flex flex-col">
      <header className="sticky top-0 z-30 bg-[#F8F8F7]/95 backdrop-blur-md border-b border-[#E4E4E7]">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 h-13 lg:h-16 flex items-center justify-between gap-4">
          <span className="font-display text-xl sm:text-2xl font-semibold tracking-tight text-[#141413] whitespace-nowrap">
            Atelier Edit
          </span>
          <div className="flex items-center gap-2.5">
            <span className="hidden sm:inline text-xs font-medium text-[#575652]">
              {userName}
            </span>
            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex items-center gap-1.5 min-h-10 sm:min-h-9 px-3 py-1.5 text-xs font-medium text-[#141413] bg-white border border-[#E4E4E7] rounded-lg hover:bg-[#EFEFEF] transition-colors whitespace-nowrap cursor-pointer"
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
            <p className="text-xs font-medium tracking-wide text-[#575652]">
              Welcome, {userName} · Quick Setup
            </p>
            <h1 className="font-display text-[clamp(2.1rem,4.5vw,3.3rem)] font-semibold leading-[1.08] tracking-tight text-[#141413] text-balance">
              Select your wardrobe style
            </h1>
            <p className="text-sm sm:text-[15px] text-[#575652] max-w-lg mx-auto leading-relaxed">
              Choose Male or Female so we organize your closet categories—clothes, shoes, watches,
              specs, and bags—for you right away.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => onSelectGender('male')}
              className={`group text-left bg-white border rounded-2xl p-6 transition-all cursor-pointer flex flex-col justify-between gap-5 min-h-[168px] hover:border-[#141413] active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-[#141413] ${
                previousGender === 'male'
                  ? 'border-[#9E1B32] ring-1 ring-[#9E1B32]/20'
                  : 'border-[#E4E4E7]'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-3xl font-semibold text-[#141413]">
                    Male
                  </span>
                  {previousGender === 'male' && (
                    <span className="text-[11px] font-semibold text-[#9E1B32]">
                      Last selected
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#575652] leading-relaxed">
                  Shirts &amp; Tops · Jackets &amp; Blazers · Trousers &amp; Shorts · Shoes · Watches
                  · Specs · Bags · Accessories
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#141413] group-hover:text-[#9E1B32] transition-colors">
                Enter Men&apos;s Closet
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </span>
            </button>

            <button
              type="button"
              onClick={() => onSelectGender('female')}
              className={`group text-left bg-white border rounded-2xl p-6 transition-all cursor-pointer flex flex-col justify-between gap-5 min-h-[168px] hover:border-[#141413] active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-[#141413] ${
                previousGender === 'female'
                  ? 'border-[#9E1B32] ring-1 ring-[#9E1B32]/20'
                  : 'border-[#E4E4E7]'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-3xl font-semibold text-[#141413]">
                    Female
                  </span>
                  {previousGender === 'female' && (
                    <span className="text-[11px] font-semibold text-[#9E1B32]">
                      Last selected
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#575652] leading-relaxed">
                  Tops &amp; Blouses · Dresses &amp; Jumpsuits · Coats &amp; Blazers · Skirts &amp;
                  Trousers · Shoes · Bags · Watches · Specs
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#141413] group-hover:text-[#9E1B32] transition-colors">
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
