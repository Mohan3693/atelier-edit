import { useState } from 'react';
import {
  AlertTriangle,
  Download,
  LogOut,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import type { AppPageId } from './Header';

interface ProfilePageProps {
  closetCount: number;
  savedCount: number;
  analysisCount: number;
  onNavigatePage: (pageId: AppPageId) => void;
  onExportData: () => void;
  onClearCloset: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onDeleteAccount: () => Promise<void>;
}

export function ProfilePage({
  closetCount,
  savedCount,
  analysisCount,
  onNavigatePage,
  onExportData,
  onClearCloset,
  onSignOut,
  onDeleteAccount,
}: ProfilePageProps) {
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

  return (
    <section
      id="profile-page"
      aria-label="Profile"
      className="max-w-[1040px] mx-auto px-4 sm:px-6 pt-6 pb-12 sm:pt-10 sm:pb-16 space-y-6 sm:space-y-8"
    >
      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => onNavigatePage('closet')}
          className="text-left bg-white border border-[#E5E0D8] shadow-[0_2px_14px_-6px_rgba(25,24,22,0.08)] rounded-2xl p-5 hover:border-[#191816] transition-all cursor-pointer"
        >
          <p className="text-xs font-medium text-[#5E5A54]">Uploaded Wardrobe Pieces</p>
          <p className="font-display text-3xl font-semibold text-[#191816] mt-1.5 tabular-nums">
            {closetCount}
          </p>
          <p className="text-xs font-medium text-[#8E1B35] mt-2">Open My Closet &rarr;</p>
        </button>

        <button
          type="button"
          onClick={() => onNavigatePage('saved')}
          className="text-left bg-white border border-[#E5E0D8] shadow-[0_2px_14px_-6px_rgba(25,24,22,0.08)] rounded-2xl p-5 hover:border-[#191816] transition-all cursor-pointer"
        >
          <p className="text-xs font-medium text-[#5E5A54]">Saved Outfits</p>
          <p className="font-display text-3xl font-semibold text-[#191816] mt-1.5 tabular-nums">
            {savedCount}
          </p>
          <p className="text-xs font-medium text-[#8E1B35] mt-2">View Saved Looks &rarr;</p>
        </button>

        <button
          type="button"
          onClick={() => onNavigatePage('saved')}
          className="text-left bg-white border border-[#E5E0D8] shadow-[0_2px_14px_-6px_rgba(25,24,22,0.08)] rounded-2xl p-5 hover:border-[#191816] transition-all cursor-pointer"
        >
          <p className="text-xs font-medium text-[#5E5A54]">Styled Sessions</p>
          <p className="font-display text-3xl font-semibold text-[#191816] mt-1.5 tabular-nums">
            {analysisCount}
          </p>
          <p className="text-xs font-medium text-[#8E1B35] mt-2">Browse History &rarr;</p>
        </button>
      </div>

      {/* Data & Privacy */}
      <div className="bg-white border border-[#E5E0D8] shadow-[0_2px_14px_-6px_rgba(25,24,22,0.08)] rounded-2xl p-5 sm:p-7 space-y-5">
        <div>
          <h2 className="font-display text-2xl font-semibold text-[#191816]">
            Data &amp; Wardrobe Management
          </h2>
          <p className="text-xs text-[#5E5A54] mt-0.5">
            Download a portable copy of your wardrobe data or clear stored garment photos.
          </p>
        </div>

        <div className="divide-y divide-[#EFECE6]">
          <div className="py-4 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#191816]">Export Wardrobe Data</p>
              <p className="text-xs text-[#5E5A54] mt-0.5">
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
              className="min-h-11 px-4 py-2 text-xs font-semibold text-[#191816] bg-[#F9F8F5] border border-[#E5E0D8] rounded-xl hover:bg-[#EFECE6] inline-flex items-center justify-center gap-2 shrink-0 cursor-pointer whitespace-nowrap transition-colors"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              Export JSON
            </button>
          </div>

          {exportNotice && (
            <p role="status" className="py-2 text-xs font-medium text-[#191816]">
              {exportNotice}
            </p>
          )}

          <div className="pt-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#191816]">
                  Clear All Uploaded Closet Items
                </p>
                <p className="text-xs text-[#5E5A54] mt-0.5">
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
                  className="min-h-11 px-4 py-2 text-xs font-semibold text-[#191816] bg-white border border-[#E5E0D8] rounded-xl hover:bg-[#F9F8F5] disabled:opacity-45 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 shrink-0 cursor-pointer whitespace-nowrap transition-colors"
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                  Clear Closet
                </button>
              )}
            </div>

            {confirmClearStep && (
              <div className="bg-[#FAF2F4] border border-[#E7C8D0] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-xs font-medium text-[#72152A]">
                  Remove all {closetCount} closet items permanently? This cannot be undone.
                </p>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={isClearingCloset}
                    onClick={() => setConfirmClearStep(false)}
                    className="min-h-10 px-3.5 py-2 text-xs font-medium text-[#191816] bg-white border border-[#E5E0D8] rounded-lg hover:bg-[#F9F8F5] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isClearingCloset}
                    onClick={() => void handleClearConfirm()}
                    className="min-h-10 px-4 py-2 text-xs font-semibold text-white bg-[#8E1B35] rounded-lg hover:bg-[#72152A] disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
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
                  clearFeedback.type === 'error' ? 'text-[#8E1B35]' : 'text-[#191816]'
                }`}
              >
                {clearFeedback.text}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Account Actions & Deletion */}
      <div className="bg-[#FBF6F7] border border-[#E7C8D0] shadow-[0_2px_14px_-6px_rgba(25,24,22,0.06)] rounded-2xl p-5 sm:p-7 space-y-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-[#8E1B35] shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <h2 className="font-display text-2xl font-semibold text-[#191816]">
              Account &amp; Permanent Deletion
            </h2>
            <p className="text-xs sm:text-sm text-[#5E5A54] mt-1 leading-relaxed">
              Sign out of this device or permanently delete your OutfitVault account, uploaded
              wardrobe items, saved looks, styling history, and local browser data.
            </p>
          </div>
        </div>

        {!confirmDeleteStep ? (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void onSignOut()}
              className="min-h-11 px-5 py-2.5 text-xs font-semibold text-[#191816] bg-white border border-[#E5E0D8] rounded-xl hover:bg-[#F4F1EC] transition-colors inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
              Sign Out
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmDeleteStep(true);
                setDeleteConfirmText('');
                setDeleteError(null);
              }}
              className="min-h-11 px-5 py-2.5 text-xs font-semibold text-white bg-[#8E1B35] rounded-xl hover:bg-[#72152A] transition-colors inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
              Delete My Account
            </button>
          </div>
        ) : (
          <div className="bg-white border border-[#E7C8D0] rounded-xl p-4 sm:p-5 space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="delete-confirm-input"
                className="block text-xs font-semibold text-[#191816]"
              >
                Type <span className="font-mono text-[#8E1B35]">DELETE</span> to confirm permanent
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
                className="w-full sm:max-w-xs h-11 px-3.5 text-base sm:text-sm bg-[#F9F8F5] border border-[#E5E0D8] rounded-xl text-[#191816] focus-visible:outline-2 focus-visible:outline-[#8E1B35]"
              />
            </div>

            {deleteError && (
              <p role="alert" className="text-xs font-medium text-[#8E1B35]">
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
                className="min-h-11 px-4 py-2.5 text-xs font-semibold text-[#191816] bg-white border border-[#E5E0D8] rounded-xl hover:bg-[#F9F8F5] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingAccount || deleteConfirmText.trim().toUpperCase() !== 'DELETE'}
                onClick={() => void handleDeleteAccountConfirm()}
                className="min-h-11 px-5 py-2.5 text-xs font-semibold text-white bg-[#8E1B35] rounded-xl hover:bg-[#72152A] disabled:opacity-45 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 cursor-pointer"
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
