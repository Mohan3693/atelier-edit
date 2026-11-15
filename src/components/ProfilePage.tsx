import { useEffect, useState, type FormEvent } from 'react';
import type { User } from 'firebase/auth';
import {
  AlertTriangle,
  Check,
  Download,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import type { WardrobeGender } from '../types/stylist';
import { AVAILABLE_STYLIST_VOICES, type StylistVoiceName } from '../utils/liveAudio';
import type { AppPageId } from './Header';

interface ProfilePageProps {
  user: User;
  gender: WardrobeGender;
  season: string;
  aesthetic: string;
  preferredVoice: StylistVoiceName;
  closetCount: number;
  savedCount: number;
  analysisCount: number;
  onUpdateDisplayName: (displayName: string) => Promise<void>;
  onGenderChange: (gender: 'male' | 'female') => void;
  onSeasonChange: (season: string) => void;
  onAestheticChange: (aesthetic: string) => void;
  onVoiceChange: (voice: StylistVoiceName) => void;
  onNavigatePage: (pageId: AppPageId) => void;
  onExportData: () => void;
  onClearCloset: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onDeleteAccount: () => Promise<void>;
}

function formatAccountDate(raw?: string | null): string {
  if (!raw) return 'Unavailable';
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return 'Unavailable';
  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getInitials(user: User): string {
  const source = user.displayName || user.email || 'A';
  const parts = source.trim().split(/[\s@._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export function ProfilePage({
  user,
  gender,
  season,
  aesthetic,
  preferredVoice,
  closetCount,
  savedCount,
  analysisCount,
  onUpdateDisplayName,
  onGenderChange,
  onSeasonChange,
  onAestheticChange,
  onVoiceChange,
  onNavigatePage,
  onExportData,
  onClearCloset,
  onSignOut,
  onDeleteAccount,
}: ProfilePageProps) {
  const [nameInput, setNameInput] = useState(user.displayName ?? '');
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameFeedback, setNameFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [avatarFailed, setAvatarFailed] = useState(false);

  const [prefsSavedNotice, setPrefsSavedNotice] = useState<string | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const [confirmClearStep, setConfirmClearStep] = useState(false);
  const [isClearingCloset, setIsClearingCloset] = useState(false);
  const [clearFeedback, setClearFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [confirmDeleteStep, setConfirmDeleteStep] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    setNameInput(user.displayName ?? '');
    setAvatarFailed(false);
  }, [user.displayName, user.photoURL]);

  const handleNameSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setNameFeedback(null);
    const trimmed = nameInput.trim();
    if (!trimmed) {
      setNameFeedback({ type: 'error', text: 'Please enter a display name.' });
      return;
    }
    setIsSavingName(true);
    try {
      await onUpdateDisplayName(trimmed);
      setNameFeedback({ type: 'success', text: 'Display name updated.' });
    } catch (err) {
      setNameFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to update display name.',
      });
    } finally {
      setIsSavingName(false);
    }
  };

  const showPrefsNotice = (label: string) => {
    setPrefsSavedNotice(`${label} saved to your profile.`);
    window.setTimeout(() => {
      setPrefsSavedNotice((prev) => (prev === `${label} saved to your profile.` ? null : prev));
    }, 3000);
  };

  const handleClearConfirm = async () => {
    setIsClearingCloset(true);
    setClearFeedback(null);
    try {
      await onClearCloset();
      setConfirmClearStep(false);
      setClearFeedback({ type: 'success', text: 'All uploaded closet items have been removed.' });
    } catch (err) {
      setClearFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not clear closet items.',
      });
    } finally {
      setIsClearingCloset(false);
    }
  };

  const handleDeleteAccountConfirm = async () => {
    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') {
      setDeleteError('Type DELETE in uppercase to confirm permanent account deletion.');
      return;
    }
    setIsDeletingAccount(true);
    setDeleteError(null);
    try {
      await onDeleteAccount();
    } catch (err) {
      setIsDeletingAccount(false);
      setDeleteError(
        err instanceof Error
          ? err.message
          : 'Unable to delete account right now. Please sign out, sign back in, and retry.',
      );
    }
  };

  const memberSince = formatAccountDate(user.metadata?.creationTime);
  const lastSignIn = formatAccountDate(user.metadata?.lastSignInTime);

  return (
    <section
      id="profile-page"
      aria-label="Account profile and settings"
      className="max-w-[1040px] mx-auto px-4 sm:px-6 pt-6 pb-12 sm:pt-10 sm:pb-16 space-y-6 sm:space-y-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E4E4E7] pb-5">
        <div>
          <p className="text-xs font-medium text-[#575652]">Account &amp; Wardrobe Settings</p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#141413] tracking-tight mt-1">
            Your Profile
          </h1>
        </div>
        <button
          type="button"
          onClick={() => void onSignOut()}
          className="min-h-11 px-4 py-2 text-xs font-semibold text-[#141413] bg-white border border-[#E4E4E7] rounded-xl hover:bg-[#EFEFEF] transition-colors inline-flex items-center justify-center gap-2 self-start sm:self-auto cursor-pointer whitespace-nowrap"
        >
          <LogOut className="w-4 h-4" aria-hidden="true" />
          Sign Out
        </button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => onNavigatePage('closet')}
          className="text-left bg-white border border-[#E4E4E7] rounded-2xl p-5 hover:border-[#141413] transition-colors cursor-pointer"
        >
          <p className="text-xs font-medium text-[#575652]">Uploaded Wardrobe Pieces</p>
          <p className="font-display text-3xl font-semibold text-[#141413] mt-1.5 tabular-nums">
            {closetCount}
          </p>
          <p className="text-xs font-medium text-[#9E1B32] mt-2">Open My Closet &rarr;</p>
        </button>

        <button
          type="button"
          onClick={() => onNavigatePage('saved')}
          className="text-left bg-white border border-[#E4E4E7] rounded-2xl p-5 hover:border-[#141413] transition-colors cursor-pointer"
        >
          <p className="text-xs font-medium text-[#575652]">Saved Outfits</p>
          <p className="font-display text-3xl font-semibold text-[#141413] mt-1.5 tabular-nums">
            {savedCount}
          </p>
          <p className="text-xs font-medium text-[#9E1B32] mt-2">View Saved Looks &rarr;</p>
        </button>

        <button
          type="button"
          onClick={() => onNavigatePage('saved')}
          className="text-left bg-white border border-[#E4E4E7] rounded-2xl p-5 hover:border-[#141413] transition-colors cursor-pointer"
        >
          <p className="text-xs font-medium text-[#575652]">Styled Sessions</p>
          <p className="font-display text-3xl font-semibold text-[#141413] mt-1.5 tabular-nums">
            {analysisCount}
          </p>
          <p className="text-xs font-medium text-[#9E1B32] mt-2">Browse History &rarr;</p>
        </button>
      </div>

      {/* Identity & Account Details */}
      <div className="bg-white border border-[#E4E4E7] rounded-2xl p-5 sm:p-7 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 pb-5 border-b border-[#EFEFEF]">
          {user.photoURL && !avatarFailed ? (
            <img
              src={user.photoURL}
              alt={user.displayName || 'Profile avatar'}
              referrerPolicy="no-referrer"
              onError={() => setAvatarFailed(true)}
              className="w-16 h-16 rounded-full object-cover border border-[#E4E4E7] shrink-0"
            />
          ) : (
            <div
              aria-hidden="true"
              className="w-16 h-16 rounded-full bg-[#141413] text-white font-display text-xl font-semibold flex items-center justify-center shrink-0"
            >
              {getInitials(user)}
            </div>
          )}

          <div className="min-w-0 space-y-1">
            <h2 className="font-display text-2xl font-semibold text-[#141413] truncate">
              {user.displayName || user.email?.split('@')[0] || 'Atelier Member'}
            </h2>
            <p className="text-sm text-[#575652] truncate">{user.email}</p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#575652]">
              <span className="inline-flex items-center gap-1 text-[#141413] font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-[#141413]" aria-hidden="true" />
                {user.emailVerified ? 'Verified Google Account' : 'Google Account'}
              </span>
              <span aria-hidden="true">&middot;</span>
              <span>Member since {memberSince}</span>
              <span aria-hidden="true">&middot;</span>
              <span>Last sign-in {lastSignIn}</span>
            </div>
          </div>
        </div>

        <form onSubmit={(e) => void handleNameSubmit(e)} className="space-y-3 max-w-lg">
          <label
            htmlFor="profile-display-name"
            className="block text-xs font-medium text-[#575652]"
          >
            Display Name
          </label>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              id="profile-display-name"
              type="text"
              maxLength={120}
              value={nameInput}
              onChange={(e) => {
                setNameInput(e.target.value);
                if (nameFeedback) setNameFeedback(null);
              }}
              placeholder="Your name"
              className="flex-1 h-11 px-3.5 text-base sm:text-sm bg-[#F8F8F7] border border-[#E4E4E7] rounded-xl text-[#141413] focus-visible:outline-2 focus-visible:outline-[#141413]"
            />
            <button
              type="submit"
              disabled={isSavingName}
              className="min-h-11 px-5 py-2.5 text-xs font-semibold text-white bg-[#141413] rounded-xl hover:bg-[#2C2C2A] disabled:opacity-50 inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
            >
              {isSavingName ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                  Saving...
                </>
              ) : (
                'Save Name'
              )}
            </button>
          </div>
          {nameFeedback && (
            <p
              role={nameFeedback.type === 'error' ? 'alert' : 'status'}
              className={`text-xs font-medium inline-flex items-center gap-1.5 ${
                nameFeedback.type === 'error' ? 'text-[#9E1B32]' : 'text-[#141413]'
              }`}
            >
              {nameFeedback.type === 'success' && (
                <Check className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              {nameFeedback.text}
            </p>
          )}
        </form>
      </div>

      {/* Wardrobe & Styling Preferences */}
      <div className="bg-white border border-[#E4E4E7] rounded-2xl p-5 sm:p-7 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-2xl font-semibold text-[#141413]">
              Wardrobe &amp; Styling Preferences
            </h2>
            <p className="text-xs text-[#575652] mt-0.5">
              Changes sync automatically across your sessions and tailor your categories and outfits.
            </p>
          </div>
          {prefsSavedNotice && (
            <span
              role="status"
              className="text-xs font-medium text-[#141413] inline-flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" aria-hidden="true" />
              {prefsSavedNotice}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <span className="block text-xs font-medium text-[#575652] mb-2">
              Wardrobe Category Profile
            </span>
            <div
              role="group"
              aria-label="Wardrobe gender profile"
              className="grid grid-cols-2 gap-2 p-1 bg-[#F8F8F7] border border-[#E4E4E7] rounded-xl"
            >
              <button
                type="button"
                onClick={() => {
                  onGenderChange('male');
                  showPrefsNotice('Wardrobe profile');
                }}
                className={`min-h-10 px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  gender === 'male'
                    ? 'bg-[#141413] text-white'
                    : 'text-[#575652] hover:text-[#141413]'
                }`}
              >
                Male Closet
              </button>
              <button
                type="button"
                onClick={() => {
                  onGenderChange('female');
                  showPrefsNotice('Wardrobe profile');
                }}
                className={`min-h-10 px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  gender === 'female'
                    ? 'bg-[#141413] text-white'
                    : 'text-[#575652] hover:text-[#141413]'
                }`}
              >
                Female Closet
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="profile-season-select"
              className="block text-xs font-medium text-[#575652] mb-2"
            >
              Default Season
            </label>
            <select
              id="profile-season-select"
              value={season}
              onChange={(e) => {
                onSeasonChange(e.target.value);
                showPrefsNotice('Season preference');
              }}
              className="w-full h-11 px-3 text-base sm:text-sm bg-[#F8F8F7] border border-[#E4E4E7] rounded-xl text-[#141413] focus-visible:outline-2 focus-visible:outline-[#141413]"
            >
              <option value="All-Season">All-Season Versatility</option>
              <option value="Spring / Summer">Spring / Summer</option>
              <option value="Autumn / Winter">Autumn / Winter</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="profile-aesthetic-select"
              className="block text-xs font-medium text-[#575652] mb-2"
            >
              Default Styling Direction
            </label>
            <select
              id="profile-aesthetic-select"
              value={aesthetic}
              onChange={(e) => {
                onAestheticChange(e.target.value);
                showPrefsNotice('Styling direction');
              }}
              className="w-full h-11 px-3 text-base sm:text-sm bg-[#F8F8F7] border border-[#E4E4E7] rounded-xl text-[#141413] focus-visible:outline-2 focus-visible:outline-[#141413]"
            >
              <option value="Modern Editorial">Modern Editorial</option>
              <option value="Minimalist Classic">Minimalist Classic</option>
              <option value="Smart Casual">Smart Casual</option>
              <option value="Streetwear">Clean Streetwear</option>
              <option value="Evening Luxury">Evening Tailored</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="profile-voice-select"
              className="block text-xs font-medium text-[#575652] mb-2"
            >
              Voice Stylist Persona
            </label>
            <select
              id="profile-voice-select"
              value={preferredVoice}
              onChange={(e) => {
                onVoiceChange(e.target.value as StylistVoiceName);
                showPrefsNotice('Voice persona');
              }}
              className="w-full h-11 px-3 text-base sm:text-sm bg-[#F8F8F7] border border-[#E4E4E7] rounded-xl text-[#141413] focus-visible:outline-2 focus-visible:outline-[#141413]"
            >
              {AVAILABLE_STYLIST_VOICES.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label} — {v.tone}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Data & Privacy */}
      <div className="bg-white border border-[#E4E4E7] rounded-2xl p-5 sm:p-7 space-y-5">
        <div>
          <h2 className="font-display text-2xl font-semibold text-[#141413]">
            Data &amp; Wardrobe Management
          </h2>
          <p className="text-xs text-[#575652] mt-0.5">
            Download a portable copy of your wardrobe data or clear stored garment photos.
          </p>
        </div>

        <div className="divide-y divide-[#EFEFEF]">
          <div className="py-4 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#141413]">Export Wardrobe Data</p>
              <p className="text-xs text-[#575652] mt-0.5">
                Download a JSON archive of your profile settings, item catalog, and saved looks.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                onExportData();
                setExportNotice('Wardrobe archive downloaded.');
                window.setTimeout(() => setExportNotice(null), 3000);
              }}
              className="min-h-11 px-4 py-2 text-xs font-semibold text-[#141413] bg-[#F8F8F7] border border-[#E4E4E7] rounded-xl hover:bg-[#EFEFEF] inline-flex items-center justify-center gap-2 shrink-0 cursor-pointer whitespace-nowrap"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              Export JSON
            </button>
          </div>

          {exportNotice && (
            <p role="status" className="py-2 text-xs font-medium text-[#141413]">
              {exportNotice}
            </p>
          )}

          <div className="pt-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#141413]">
                  Clear All Uploaded Closet Items
                </p>
                <p className="text-xs text-[#575652] mt-0.5">
                  Removes all {closetCount} uploaded clothes and accessories from this browser and
                  cloud sync. Your account and saved looks stay intact.
                </p>
              </div>
              {!confirmClearStep && (
                <button
                  type="button"
                  disabled={closetCount === 0}
                  onClick={() => {
                    setConfirmClearStep(true);
                    setClearFeedback(null);
                  }}
                  className="min-h-11 px-4 py-2 text-xs font-semibold text-[#141413] bg-white border border-[#E4E4E7] rounded-xl hover:bg-[#F8F8F7] disabled:opacity-45 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 shrink-0 cursor-pointer whitespace-nowrap"
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                  Clear Closet
                </button>
              )}
            </div>

            {confirmClearStep && (
              <div className="bg-[#FAF3F4] border border-[#E7C6CC] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-xs font-medium text-[#881327]">
                  Remove all {closetCount} closet items permanently? This cannot be undone.
                </p>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={isClearingCloset}
                    onClick={() => setConfirmClearStep(false)}
                    className="min-h-10 px-3.5 py-2 text-xs font-medium text-[#141413] bg-white border border-[#E4E4E7] rounded-lg hover:bg-[#F8F8F7] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isClearingCloset}
                    onClick={() => void handleClearConfirm()}
                    className="min-h-10 px-4 py-2 text-xs font-semibold text-white bg-[#9E1B32] rounded-lg hover:bg-[#821529] disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    {isClearingCloset ? 'Clearing...' : 'Yes, Clear Closet'}
                  </button>
                </div>
              </div>
            )}

            {clearFeedback && (
              <p
                role={clearFeedback.type === 'error' ? 'alert' : 'status'}
                className={`text-xs font-medium ${
                  clearFeedback.type === 'error' ? 'text-[#9E1B32]' : 'text-[#141413]'
                }`}
              >
                {clearFeedback.text}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Danger Zone: Account Deletion */}
      <div className="bg-[#FDF7F8] border border-[#E7C6CC] rounded-2xl p-5 sm:p-7 space-y-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-[#9E1B32] shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <h2 className="font-display text-2xl font-semibold text-[#141413]">
              Delete Account Permanently
            </h2>
            <p className="text-xs sm:text-sm text-[#575652] mt-1 leading-relaxed">
              Permanently deletes your Atelier Edit account, uploaded wardrobe items, saved looks,
              style preferences, styling history, and local browser data. You may be asked to
              confirm Google sign-in before deletion finishes.
            </p>
          </div>
        </div>

        {!confirmDeleteStep ? (
          <div>
            <button
              type="button"
              onClick={() => {
                setConfirmDeleteStep(true);
                setDeleteConfirmText('');
                setDeleteError(null);
              }}
              className="min-h-11 px-5 py-2.5 text-xs font-semibold text-white bg-[#9E1B32] rounded-xl hover:bg-[#821529] transition-colors inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
              Delete My Account
            </button>
          </div>
        ) : (
          <div className="bg-white border border-[#E7C6CC] rounded-xl p-4 sm:p-5 space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="delete-confirm-input"
                className="block text-xs font-semibold text-[#141413]"
              >
                Type <span className="font-mono text-[#9E1B32]">DELETE</span> to confirm permanent
                account removal
              </label>
              <input
                id="delete-confirm-input"
                type="text"
                value={deleteConfirmText}
                onChange={(e) => {
                  setDeleteConfirmText(e.target.value);
                  if (deleteError) setDeleteError(null);
                }}
                placeholder="DELETE"
                autoComplete="off"
                className="w-full sm:max-w-xs h-11 px-3.5 text-base sm:text-sm bg-[#F8F8F7] border border-[#E4E4E7] rounded-xl text-[#141413] focus-visible:outline-2 focus-visible:outline-[#9E1B32]"
              />
            </div>

            {deleteError && (
              <p role="alert" className="text-xs font-medium text-[#9E1B32]">
                {deleteError}
              </p>
            )}

            <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-2.5">
              <button
                type="button"
                disabled={isDeletingAccount}
                onClick={() => {
                  setConfirmDeleteStep(false);
                  setDeleteConfirmText('');
                  setDeleteError(null);
                }}
                className="min-h-11 px-4 py-2.5 text-xs font-semibold text-[#141413] bg-white border border-[#E4E4E7] rounded-xl hover:bg-[#F8F8F7] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingAccount || deleteConfirmText.trim().toUpperCase() !== 'DELETE'}
                onClick={() => void handleDeleteAccountConfirm()}
                className="min-h-11 px-5 py-2.5 text-xs font-semibold text-white bg-[#9E1B32] rounded-xl hover:bg-[#821529] disabled:opacity-45 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                {isDeletingAccount ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
                    Deleting Account...
                  </>
                ) : (
                  'Confirm Permanent Deletion'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
