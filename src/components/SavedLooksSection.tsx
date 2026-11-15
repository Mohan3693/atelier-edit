import { Trash2, Maximize2, RotateCcw } from 'lucide-react';
import type { ItemAnalysis, OutfitOption, SavedLook, WardrobeItem } from '../types/stylist';
import { OutfitCollageBoard } from './OutfitCollageBoard';

export interface HistoryAnalysisEntry {
  id: number;
  itemName: string;
  category: string;
  season: string;
  aesthetic: string;
  stylePersonality: string;
  createdAt: string;
  itemAnalysis?: ItemAnalysis;
  outfits?: OutfitOption[];
}

interface SavedLooksSectionProps {
  savedLooks: SavedLook[];
  closetItems: WardrobeItem[];
  isSignedIn: boolean;
  recentAnalyses: HistoryAnalysisEntry[];
  onSignInPrompt: () => void;
  onRestoreAnalysis: (entry: HistoryAnalysisEntry) => void;
  onRemoveSavedLook: (lookId: string) => void;
  onInspectSavedLook: (outfit: OutfitOption, anchorItemName: string) => void;
}

export function SavedLooksSection({
  savedLooks,
  closetItems,
  isSignedIn,
  recentAnalyses,
  onSignInPrompt,
  onRestoreAnalysis,
  onRemoveSavedLook,
  onInspectSavedLook,
}: SavedLooksSectionProps) {
  return (
    <section
      id="saved-looks"
      aria-label="Saved outfits collection"
      className="max-w-[1240px] mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8 sm:space-y-10"
    >
      <div>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div>
            <p className="text-xs font-medium text-[#5E5A54]">Personal Lookbook</p>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#191816] tracking-tight mt-1">
              Saved Outfits
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-[#5E5A54] tabular-nums">
            <span>
              {savedLooks.length} {savedLooks.length === 1 ? 'saved look' : 'saved looks'}
              {isSignedIn ? ' synced to your account' : ' in this browser'}
            </span>
            {!isSignedIn && (
              <button
                type="button"
                onClick={onSignInPrompt}
                className="min-h-10 sm:min-h-0 px-2 -mx-2 text-xs font-semibold text-[#8E1B35] hover:underline cursor-pointer inline-flex items-center"
              >
                Sign in with Google to sync
              </button>
            )}
          </div>
        </div>

        {savedLooks.length === 0 ? (
          <div className="bg-white border border-[#E5E0D8] shadow-[0_2px_14px_-6px_rgba(25,24,22,0.08)] rounded-2xl p-6 sm:p-10 text-center">
            <p className="font-display text-2xl text-[#191816]">No Saved Looks Yet</p>
            <p className="text-sm text-[#5E5A54] mt-1.5 max-w-md mx-auto">
              Tap &ldquo;Save Look&rdquo; on any generated outfit in My Closet to keep your
              favorite wardrobe pairings here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedLooks.map((entry) => (
              <article
                key={entry.id}
                className="bg-white border border-[#E5E0D8] shadow-[0_2px_14px_-6px_rgba(25,24,22,0.08)] rounded-2xl overflow-hidden flex flex-col"
              >
                <div className="aspect-[4/3] bg-[#F6F3EE] border-b border-[#EFECE6] overflow-hidden">
                  <OutfitCollageBoard
                    outfit={entry.outfit}
                    closetItems={closetItems}
                    anchorImageUrl={entry.anchorImageUrl}
                    anchorItemName={entry.anchorItemName}
                    compact
                  />
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                  <div>
                    <p className="text-xs text-[#5E5A54]">
                      <span className="font-semibold text-[#8E1B35]">
                        {entry.outfit.occasion}
                      </span>
                      <span aria-hidden="true"> · </span>
                      <span>{entry.anchorItemName}</span>
                    </p>
                    <h3 className="font-display text-xl font-semibold text-[#191816] mt-1">
                      {entry.outfit.title}
                    </h3>
                    <p className="text-xs text-[#5E5A54] mt-1 line-clamp-2">
                      {entry.outfit.moodSummary}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[#EFECE6] flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        onInspectSavedLook(entry.outfit, entry.anchorItemName)
                      }
                      className="inline-flex items-center gap-1.5 min-h-11 sm:min-h-8 px-2 -mx-2 text-xs font-medium text-[#191816] hover:underline cursor-pointer"
                    >
                      <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
                      Inspect Look
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveSavedLook(entry.id)}
                      aria-label={`Remove saved look ${entry.outfit.title}`}
                      className="inline-flex items-center gap-1 min-h-11 sm:min-h-8 px-2 -mx-2 text-xs font-medium text-[#5E5A54] hover:text-[#8E1B35] cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      Remove
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {isSignedIn && recentAnalyses.length > 0 && (
        <div className="pt-6 border-t border-[#E5E0D8]">
          <div className="flex items-end justify-between gap-4 mb-4">
            <div>
              <p className="text-xs font-medium text-[#5E5A54]">Account Wardrobe Archive</p>
              <h3 className="font-display text-2xl font-semibold text-[#191816]">
                Recent Closet Sessions
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recentAnalyses.slice(0, 6).map((item) => (
              <div
                key={item.id}
                className="bg-white border border-[#E5E0D8] shadow-[0_2px_14px_-6px_rgba(25,24,22,0.08)] rounded-xl p-4 flex flex-col justify-between gap-3"
              >
                <div>
                  <p className="text-xs text-[#5E5A54]">
                    {item.category}
                    <span aria-hidden="true"> · </span>
                    {item.season}
                  </p>
                  <p className="font-display text-lg font-semibold text-[#191816] mt-0.5">
                    {item.itemName}
                  </p>
                  <p className="text-xs text-[#5E5A54] mt-1">{item.stylePersonality}</p>
                </div>
                {item.itemAnalysis && item.outfits && item.outfits.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onRestoreAnalysis(item)}
                    className="inline-flex items-center gap-1.5 min-h-10 sm:min-h-0 px-2 -mx-2 text-xs font-semibold text-[#8E1B35] hover:underline cursor-pointer self-start"
                  >
                    <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                    Load Styled Looks
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
