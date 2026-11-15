import type { User } from 'firebase/auth';
import { LogOut } from 'lucide-react';

interface HeaderProps {
  savedCount: number;
  user: User | null;
  authLoading: boolean;
  onSignInWithGoogle: () => void;
  onSignOut: () => void;
  onTriggerUpload: () => void;
  onNavigateSection: (sectionId: string) => void;
}

export function Header({
  savedCount,
  user,
  authLoading,
  onSignInWithGoogle,
  onSignOut,
  onTriggerUpload,
  onNavigateSection,
}: HeaderProps) {
  const shortName =
    user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'Account';

  return (
    <header className="sticky top-0 z-30 bg-[#F8F8F7]/95 backdrop-blur-sm border-b border-[#E4E4E7]">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-6">
        <a
          href="#style-studio"
          onClick={(e) => {
            e.preventDefault();
            onNavigateSection('style-studio');
          }}
          className="font-display text-xl sm:text-2xl font-semibold tracking-tight text-[#141413] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#141413]"
        >
          Atelier Edit
        </a>

        <nav
          aria-label="Primary navigation"
          className="hidden lg:flex items-center gap-6 text-sm font-medium text-[#575652]"
        >
          <a
            href="#style-studio"
            onClick={(e) => {
              e.preventDefault();
              onNavigateSection('style-studio');
            }}
            className="hover:text-[#141413] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Style Studio
          </a>
          <a
            href="#outfit-looks"
            onClick={(e) => {
              e.preventDefault();
              onNavigateSection('outfit-looks');
            }}
            className="hover:text-[#141413] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Styled Looks
          </a>
          <a
            href="#create-edit"
            onClick={(e) => {
              e.preventDefault();
              onNavigateSection('create-edit');
            }}
            className="hover:text-[#141413] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Create &amp; Edit
          </a>
          <a
            href="#voice-stylist"
            onClick={(e) => {
              e.preventDefault();
              onNavigateSection('voice-stylist');
            }}
            className="hover:text-[#141413] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Voice Stylist
          </a>
          <a
            href="#saved-looks"
            onClick={(e) => {
              e.preventDefault();
              onNavigateSection('saved-looks');
            }}
            className="hover:text-[#141413] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 tabular-nums"
          >
            {savedCount > 0 ? `Saved Looks (${savedCount})` : 'Saved Looks'}
          </a>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {!authLoading &&
            (user ? (
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline text-xs font-medium text-[#575652] whitespace-nowrap">
                  {shortName}
                </span>
                <button
                  type="button"
                  onClick={onSignOut}
                  aria-label="Sign out of Google account"
                  className="inline-flex items-center gap-1.5 min-h-10 sm:min-h-9 px-2.5 sm:px-3 py-2 text-xs font-medium text-[#141413] bg-white border border-[#E4E4E7] rounded-lg hover:bg-[#EFEFEF] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onSignInWithGoogle}
                aria-label="Sign in with Google"
                className="min-h-10 sm:min-h-9 px-3 sm:px-3.5 py-2 text-xs font-medium text-[#141413] bg-white border border-[#E4E4E7] rounded-lg hover:bg-[#EFEFEF] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#141413]"
              >
                <span className="hidden sm:inline">Sign in with Google</span>
                <span className="sm:hidden">Sign in</span>
              </button>
            ))}

          <button
            type="button"
            onClick={onTriggerUpload}
            className="min-h-10 sm:min-h-9 px-3 sm:px-4 py-2 text-xs font-semibold tracking-wide text-white bg-[#141413] rounded-lg hover:bg-[#2C2C2A] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#141413]"
          >
            Upload Piece
          </button>
        </div>
      </div>
    </header>
  );
}
