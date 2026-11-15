import { useEffect, useState } from 'react';
import {
  Bookmark,
  Download,
  FileDown,
  RefreshCw,
} from 'lucide-react';
import type {
  OutfitOption,
  PaletteFilterOption,
  PaletteSwatch,
  SavedLook,
  WardrobeItem,
} from '../types/stylist';
import {
  countOutfitsByPalette,
  filterOutfitsByPalette,
  getOutfitPaletteCategory,
  isOutfitSaved,
  normalizeHexColor,
  PALETTE_FILTER_OPTIONS,
} from '../utils/stylist';
import { renderOutfitCollageDataUrl } from '../utils/collageExport';
import { OutfitCollageBoard } from './OutfitCollageBoard';

interface OutfitGridProps {
  outfits: OutfitOption[];
  closetItems: WardrobeItem[];
  anchorPalette: PaletteSwatch[];
  anchorImageUrl: string;
  anchorItemName: string;
  savedLooks: SavedLook[];
  isRefreshingAll: boolean;
  onSwapPiece: (outfitId: string, pieceIndex: number, nextItemId: string) => void;
  onToggleSave: (outfit: OutfitOption) => void;
  onInspectLook: (outfit: OutfitOption) => void;
  onRefreshAllOutfits: () => void;
  onExportAllToPdf: (visibleOutfits: OutfitOption[]) => Promise<{ ok: boolean; message: string }>;
}

export function OutfitGrid({
  outfits,
  closetItems,
  anchorPalette,
  anchorImageUrl,
  anchorItemName,
  savedLooks,
  isRefreshingAll,
  onSwapPiece,
  onToggleSave,
  onInspectLook,
  onRefreshAllOutfits,
  onExportAllToPdf,
}: OutfitGridProps) {
  const [activePaletteFilter, setActivePaletteFilter] =
    useState<PaletteFilterOption>('All');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [downloadingOutfitId, setDownloadingOutfitId] = useState<string | null>(null);
  const [quickActionNotice, setQuickActionNotice] = useState<string | null>(null);

  useEffect(() => {
    setActivePaletteFilter('All');
  }, [anchorItemName]);

  const paletteCounts = countOutfitsByPalette(outfits, anchorPalette);
  const filteredOutfits = filterOutfitsByPalette(
    outfits,
    activePaletteFilter,
    anchorPalette,
  );

  const handleRefreshAllClick = () => {
    setQuickActionNotice(null);
    onRefreshAllOutfits();
  };

  const handleExportPdfClick = async () => {
    setIsExportingPdf(true);
    setQuickActionNotice(null);
    const targetList = filteredOutfits.length > 0 ? filteredOutfits : outfits;
    const result = await onExportAllToPdf(targetList);
    setIsExportingPdf(false);
    setQuickActionNotice(result.message);
  };

  const handleDownloadCollage = async (outfit: OutfitOption) => {
    setDownloadingOutfitId(outfit.id);
    try {
      const url = await renderOutfitCollageDataUrl(outfit, closetItems);
      if (url) {
        const a = document.createElement('a');
        a.href = url;
        a.download = `${outfit.occasion.toLowerCase().replace(/\s+/g, '-')}-${outfit.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
        a.click();
      }
    } finally {
      setDownloadingOutfitId(null);
    }
  };

  return (
    <section
      id="outfit-looks"
      aria-label="Three styled closet outfit options"
      className="max-w-[1240px] mx-auto px-4 sm:px-6 py-8 sm:py-12 border-b border-[#E4E4E7]"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4 mb-5 sm:mb-6">
        <div>
          <p className="text-xs font-medium text-[#575652]">
            Real-Wardrobe Lookbook · 03 Occasions
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#141413] tracking-tight mt-1">
            Three Outfits Styled From What You Own
          </h2>
        </div>
        <p className="text-sm text-[#575652] max-w-md">
          Each card arranges your exact uploaded clothes, shoes, watches, specs, and bags. Swap any
          piece directly or save a high-res outfit board PNG.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-6 sm:mb-8">
        <div
          role="group"
          aria-label="Filter looks by color palette category"
          className="w-full lg:w-auto flex sm:inline-flex items-center gap-1 p-1 bg-[#EFEFEF] rounded-xl overflow-x-auto no-scrollbar"
        >
          {PALETTE_FILTER_OPTIONS.map((option) => {
            const count = paletteCounts[option];
            const isActive = activePaletteFilter === option;
            return (
              <button
                key={option}
                type="button"
                aria-pressed={isActive}
                onClick={() => setActivePaletteFilter(option)}
                className={`min-h-10 sm:min-h-8 px-3.5 sm:px-3 py-2 sm:py-1.5 text-xs font-medium rounded-lg sm:rounded-md transition-colors whitespace-nowrap shrink-0 tabular-nums cursor-pointer focus-visible:outline-2 focus-visible:outline-[#141413] ${
                  isActive
                    ? 'bg-white text-[#141413] shadow-xs'
                    : 'text-[#575652] hover:text-[#141413]'
                }`}
              >
                {option} ({count})
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between lg:justify-end gap-2.5">
          <span className="text-xs text-[#575652] tabular-nums mr-1">
            {filteredOutfits.length} of {outfits.length} looks
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isRefreshingAll}
              onClick={handleRefreshAllClick}
              className="min-h-10 sm:min-h-9 px-3 py-2 text-xs font-medium text-[#141413] bg-white border border-[#E4E4E7] rounded-lg hover:border-[#141413] disabled:opacity-50 inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isRefreshingAll ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              {isRefreshingAll ? 'Restyling...' : 'Re-Style'}
            </button>
            <button
              type="button"
              disabled={isExportingPdf}
              onClick={handleExportPdfClick}
              className="min-h-10 sm:min-h-9 px-3.5 py-2 text-xs font-semibold text-white bg-[#141413] rounded-lg hover:bg-[#2C2C2A] disabled:opacity-50 inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors"
            >
              <FileDown className="w-3.5 h-3.5" aria-hidden="true" />
              {isExportingPdf ? 'Exporting...' : 'Export PDF'}
            </button>
          </div>
        </div>
      </div>

      {quickActionNotice && (
        <div
          role="status"
          className="mb-6 bg-white border border-[#E4E4E7] rounded-xl px-4 py-3 flex items-center justify-between gap-3 text-xs text-[#141413]"
        >
          <span className="min-w-0 break-words">{quickActionNotice}</span>
          <button
            type="button"
            onClick={() => setQuickActionNotice(null)}
            className="min-h-9 px-2 text-[#575652] hover:text-[#141413] font-semibold shrink-0 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {filteredOutfits.length === 0 ? (
        <div className="bg-white border border-[#E4E4E7] rounded-2xl p-10 text-center">
          <p className="font-display text-2xl text-[#141413]">
            No {activePaletteFilter} Looks in This Set
          </p>
          <p className="text-sm text-[#575652] mt-1.5 max-w-md mx-auto">
            None of the current outfits use a {activePaletteFilter} palette strategy. View all
            looks or re-generate fresh combinations from your closet.
          </p>
          <button
            type="button"
            onClick={() => setActivePaletteFilter('All')}
            className="mt-5 px-4 py-2 text-xs font-semibold text-white bg-[#141413] rounded-lg hover:bg-[#2C2C2A] transition-colors cursor-pointer"
          >
            Show All Looks
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-start">
          {filteredOutfits.map((outfit) => {
            const originalIndex = outfits.findIndex((o) => o.id === outfit.id);
            const lookNumber = originalIndex >= 0 ? originalIndex + 1 : 1;
            const paletteCategory = getOutfitPaletteCategory(outfit, anchorPalette);
            const saved = isOutfitSaved(savedLooks, outfit.id);
            const isDownloading = downloadingOutfitId === outfit.id;

            return (
              <article
                key={outfit.id}
                data-testid={`outfit-card-${outfit.occasion.toLowerCase().replace(/\s+/g, '-')}`}
                className="bg-white border border-[#E4E4E7] rounded-2xl overflow-hidden flex flex-col"
              >
                <div className="relative aspect-[3/4] bg-[#F5F4F0] border-b border-[#EFEFEF] overflow-hidden">
                  <OutfitCollageBoard
                    outfit={outfit}
                    closetItems={closetItems}
                    anchorImageUrl={anchorImageUrl}
                    anchorItemName={anchorItemName}
                    onInspect={() => onInspectLook(outfit)}
                    onDownloadPng={() => void handleDownloadCollage(outfit)}
                  />
                </div>

                <div className="p-4 sm:p-6 flex-1 flex flex-col gap-4 sm:gap-5">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#575652]">
                      <span className="font-semibold text-[#9E1B32]">{outfit.occasion}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-tabular">Look 0{lookNumber}</span>
                      <span aria-hidden="true">·</span>
                      <span>{paletteCategory}</span>
                    </div>
                    <h3 className="font-display text-2xl font-semibold text-[#141413] tracking-tight">
                      {outfit.title}
                    </h3>
                    <p className="text-sm text-[#575652] leading-relaxed">
                      {outfit.moodSummary}
                    </p>
                  </div>

                  <div className="border-t border-[#EFEFEF] pt-4">
                    <h4 className="text-xs font-semibold text-[#575652] mb-2.5">
                      Pieces From Your Closet
                    </h4>
                    <ul className="divide-y divide-[#EFEFEF]">
                      {outfit.pieces.map((piece, pIdx) => {
                        const hex = normalizeHexColor(piece.colorHex);
                        const swapCandidates = piece.category
                          ? closetItems.filter((item) => item.category === piece.category)
                          : [];

                        return (
                          <li
                            key={`${piece.slot}-${pIdx}`}
                            className="py-2.5 first:pt-0 last:pb-0 flex items-start justify-between gap-3"
                          >
                            <div className="min-w-0 flex-1">
                              <span className="block text-[11px] font-medium text-[#787772]">
                                {piece.slot}
                              </span>
                              <span className="block text-sm font-medium text-[#141413] mt-0.5">
                                {piece.name}
                              </span>
                              <span className="block text-xs text-[#575652] mt-0.5">
                                {piece.stylingTip}
                              </span>

                              {swapCandidates.length > 1 && piece.wardrobeItemId && (
                                <div className="mt-2">
                                  <select
                                    aria-label={`Swap ${piece.slot} piece`}
                                    value={piece.wardrobeItemId}
                                    onChange={(e) =>
                                      onSwapPiece(outfit.id, pIdx, e.target.value)
                                    }
                                    className="w-full sm:w-auto min-h-10 sm:min-h-8 px-2.5 text-xs bg-[#F8F8F7] border border-[#E4E4E7] rounded-lg sm:rounded text-[#141413] cursor-pointer"
                                  >
                                    {swapCandidates.map((cand) => (
                                      <option key={cand.id} value={cand.id}>
                                        Swap: {cand.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                              <span
                                className="w-3.5 h-3.5 rounded-sm border border-black/15"
                                style={{ backgroundColor: hex }}
                                aria-hidden="true"
                              />
                              <span className="text-[11px] text-[#575652] whitespace-nowrap">
                                {piece.colorName}
                              </span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  <p className="text-xs leading-relaxed text-[#575652] bg-[#F8F8F7] rounded-lg p-3">
                    <strong className="font-semibold text-[#141413]">Color Harmony: </strong>
                    {outfit.colorHarmonyNote}
                  </p>

                  {outfit.missingNote && outfit.missingNote.trim().length > 0 && (
                    <p className="text-[11px] text-[#575652] border border-[#E4E4E7] rounded-lg px-3 py-2">
                      <strong className="font-semibold text-[#141413]">Closet tip: </strong>
                      {outfit.missingNote}
                    </p>
                  )}

                  <div className="mt-auto pt-4 border-t border-[#EFEFEF] flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      disabled={isDownloading}
                      onClick={() => void handleDownloadCollage(outfit)}
                      className="inline-flex items-center justify-center gap-1.5 min-h-11 sm:min-h-9 px-3.5 sm:px-3 py-2 text-xs font-medium text-[#141413] bg-[#F8F8F7] border border-[#E4E4E7] rounded-lg hover:border-[#141413] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" aria-hidden="true" />
                      {isDownloading ? 'Saving...' : 'Download PNG'}
                    </button>

                    <div className="flex items-center gap-2 shrink-0 ml-auto">
                      <button
                        type="button"
                        onClick={() => onInspectLook(outfit)}
                        className="min-h-11 sm:min-h-9 px-3 py-2 text-xs font-medium text-[#575652] hover:text-[#141413] transition-colors whitespace-nowrap shrink-0 cursor-pointer inline-flex items-center"
                      >
                        Inspect
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleSave(outfit)}
                        aria-pressed={saved}
                        className={`inline-flex items-center justify-center gap-1.5 min-h-11 sm:min-h-9 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          saved
                            ? 'bg-[#141413] text-white'
                            : 'bg-white border border-[#E4E4E7] text-[#141413] hover:border-[#141413]'
                        }`}
                      >
                        <Bookmark
                          className={`w-3.5 h-3.5 ${saved ? 'fill-current' : ''}`}
                          aria-hidden="true"
                        />
                        {saved ? 'Saved' : 'Save Look'}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
