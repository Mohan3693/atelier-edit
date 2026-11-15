import { ArrowRight, Check, Lock, Sparkles } from 'lucide-react';
import { SAMPLE_WARDROBE } from '../data/sampleWardrobe';

interface AuthGateViewProps {
  authLoading: boolean;
  authError: string | null;
  onClearAuthError: () => void;
  onSignInWithGoogle: () => void;
}

export function AuthGateView({
  authLoading,
  authError,
  onClearAuthError,
  onSignInWithGoogle,
}: AuthGateViewProps) {
  const casualLookImg =
    SAMPLE_WARDROBE[0].precomputedOutfits?.[0]?.flatLayImageUrl ??
    SAMPLE_WARDROBE[0].imageUrl;
  const secondGarmentImg = SAMPLE_WARDROBE[1].imageUrl;
  const thirdGarmentImg = SAMPLE_WARDROBE[2].imageUrl;

  return (
    <div className="min-h-screen bg-[#F8F8F7] text-[#141413] flex flex-col">
      <header className="sticky top-0 z-30 bg-[#F8F8F7]/95 backdrop-blur-md border-b border-[#E4E4E7]">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 h-13 lg:h-16 flex items-center justify-between gap-4">
          <span className="font-display text-xl sm:text-2xl font-semibold tracking-tight text-[#141413] whitespace-nowrap">
            Atelier Edit
          </span>
          <button
            type="button"
            disabled={authLoading}
            onClick={onSignInWithGoogle}
            className="min-h-10 sm:min-h-9 px-4 py-2 text-xs font-semibold text-white bg-[#141413] rounded-lg hover:bg-[#2C2C2A] disabled:opacity-50 transition-colors whitespace-nowrap cursor-pointer"
          >
            {authLoading ? 'Checking...' : 'Sign in'}
          </button>
        </div>
      </header>

      {authError && (
        <div
          role="alert"
          className="bg-[#FAF3F4] border-b border-[#E7C6CC] px-4 sm:px-6 py-2.5 text-xs text-[#9E1B32] flex items-center justify-between gap-4 max-w-[1240px] w-full mx-auto"
        >
          <span>{authError}</span>
          <button
            type="button"
            onClick={onClearAuthError}
            className="min-h-10 px-2 font-semibold underline cursor-pointer shrink-0 inline-flex items-center"
          >
            Dismiss
          </button>
        </div>
      )}

      <main className="flex-1 flex items-center">
        <div className="max-w-[1240px] w-full mx-auto px-4 sm:px-6 py-8 sm:py-14 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <div className="space-y-3">
              <p className="text-xs font-medium tracking-wide text-[#575652]">
                Personal Wardrobe Vault · Private Closet Studio
              </p>
              <h1 className="font-display text-[clamp(2.25rem,4.5vw,3.75rem)] font-semibold leading-[1.06] tracking-tight text-[#141413] text-balance max-w-xl">
                Style complete outfits strictly from what you own.
              </h1>
              <p className="text-[15px] leading-relaxed text-[#575652] max-w-lg">
                Sign in to unlock your private wardrobe vault. Upload your real shirts, dresses,
                trousers, shoes, watches, specs, and bags—and compose Casual, Business, and Night
                Out pairings using your exact photos.
              </p>
            </div>

            <div className="space-y-3 max-w-md">
              <button
                type="button"
                disabled={authLoading}
                onClick={onSignInWithGoogle}
                className="w-full sm:w-auto min-h-12 inline-flex items-center justify-center gap-2.5 px-6 py-3 text-sm font-semibold text-white bg-[#9E1B32] rounded-xl hover:bg-[#821529] disabled:opacity-50 transition-colors cursor-pointer"
              >
                <Lock className="w-4 h-4" aria-hidden="true" />
                {authLoading ? 'Loading account...' : 'Continue with Google to Enter'}
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
              <p className="text-xs text-[#575652]">
                Your wardrobe stays private to your account and syncs across mobile and desktop.
              </p>
            </div>

            <ol className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#E4E4E7]">
              <li className="bg-white border border-[#E4E4E7] rounded-xl p-3.5 space-y-1">
                <span className="font-mono-tabular text-[11px] font-semibold text-[#9E1B32]">
                  01
                </span>
                <p className="text-xs font-semibold text-[#141413]">Sign in &amp; choose style</p>
                <p className="text-[11px] text-[#575652] leading-relaxed">
                  Pick Male or Female right after signing in to tailor your categories.
                </p>
              </li>
              <li className="bg-white border border-[#E4E4E7] rounded-xl p-3.5 space-y-1">
                <span className="font-mono-tabular text-[11px] font-semibold text-[#9E1B32]">
                  02
                </span>
                <p className="text-xs font-semibold text-[#141413]">Upload your items</p>
                <p className="text-[11px] text-[#575652] leading-relaxed">
                  Add clothes, shoes, bags, watches, and specs once—kept saved for you.
                </p>
              </li>
              <li className="bg-white border border-[#E4E4E7] rounded-xl p-3.5 space-y-1">
                <span className="font-mono-tabular text-[11px] font-semibold text-[#9E1B32]">
                  03
                </span>
                <p className="text-xs font-semibold text-[#141413]">Generate 3 outfits</p>
                <p className="text-[11px] text-[#575652] leading-relaxed">
                  View editorial look boards made exclusively with your own pieces.
                </p>
              </li>
            </ol>
          </div>

          <div className="lg:col-span-6">
            <div className="bg-white border border-[#E4E4E7] rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between text-xs text-[#575652]">
                <span className="font-semibold text-[#141413] inline-flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#9E1B32]" aria-hidden="true" />
                  Your Private Lookbook Studio
                </span>
                <span>Casual · Business · Night Out</span>
              </div>

              <div className="grid grid-cols-12 gap-2.5">
                <div className="col-span-8 aspect-[4/5] rounded-xl overflow-hidden bg-[#F5F4F0] border border-[#EFEFEF]">
                  <img
                    src={casualLookImg}
                    alt="Editorial wardrobe flat-lay preview"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="col-span-4 flex flex-col gap-2.5">
                  <div className="flex-1 rounded-xl overflow-hidden bg-[#FAF9F6] border border-[#EFEFEF] p-2 flex items-center justify-center">
                    <img
                      src={secondGarmentImg}
                      alt="Curated dress piece"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex-1 rounded-xl overflow-hidden bg-[#FAF9F6] border border-[#EFEFEF] p-2 flex items-center justify-center">
                    <img
                      src={thirdGarmentImg}
                      alt="Curated tailored blazer"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-xs text-[#575652]">
                <span className="inline-flex items-center gap-1 text-[#141413] font-medium">
                  <Check className="w-3.5 h-3.5 text-[#9E1B32]" aria-hidden="true" />
                  Uses only your uploaded items
                </span>
                <span className="inline-flex items-center gap-1 text-[#141413] font-medium">
                  <Check className="w-3.5 h-3.5 text-[#9E1B32]" aria-hidden="true" />
                  Download PNG &amp; PDF lookbooks
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
