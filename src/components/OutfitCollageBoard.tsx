import { useState } from 'react';
import { Maximize2, Download } from 'lucide-react';
import type { OutfitOption, OutfitPiece, WardrobeItem } from '../types/stylist';
import { normalizeHexColor } from '../utils/stylist';

interface OutfitCollageBoardProps {
  outfit: OutfitOption;
  closetItems: WardrobeItem[];
  anchorImageUrl?: string;
  anchorItemName?: string;
  compact?: boolean;
  onInspect?: () => void;
  onDownloadPng?: () => void;
}

export function OutfitCollageBoard({
  outfit,
  closetItems,
  anchorImageUrl,
  anchorItemName,
  compact = false,
  onInspect,
  onDownloadPng,
}: OutfitCollageBoardProps) {
  const [failedUrls, setFailedUrls] = useState<Record<string, boolean>>({});
  const itemById = new Map(closetItems.map((item) => [item.id, item]));

  const resolvedPieces: Array<OutfitPiece & { resolvedImg?: string }> = outfit.pieces
    .map((p) => {
      const matched = p.wardrobeItemId ? itemById.get(p.wardrobeItemId) : undefined;
      return {
        ...p,
        resolvedImg: matched?.imageUrl ?? p.imageUrl,
      };
    })
    .slice(0, 6);

  // If outfit has a generated or precomputed flat-lay photo and no closet piece images, display it
  if (
    outfit.flatLayImageUrl &&
    outfit.flatLayStatus === 'ready' &&
    resolvedPieces.every((p) => !p.resolvedImg)
  ) {
    return (
      <div className="relative w-full h-full bg-[#F9F8F5] overflow-hidden group">
        <img
          src={outfit.flatLayImageUrl}
          alt={`${outfit.occasion} look: ${outfit.title}`}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // Build gallery tiles: if no resolved piece images exist yet (legacy single-piece fallback), include anchor
  const hasRealPieceImages = resolvedPieces.some((p) => Boolean(p.resolvedImg));
  const displayTiles = hasRealPieceImages
    ? resolvedPieces
    : [
        ...(anchorImageUrl
          ? [
              {
                slot: 'Anchor Piece',
                name: anchorItemName || 'Featured Garment',
                colorName: 'Uploaded',
                colorHex: '#4A4945',
                material: '',
                stylingTip: '',
                resolvedImg: anchorImageUrl,
              },
            ]
          : []),
        ...resolvedPieces.slice(0, 3),
      ];

  const count = displayTiles.length;
  const gridClass =
    count <= 2
      ? 'grid-cols-2 grid-rows-1'
      : count === 3
        ? 'grid-cols-2 grid-rows-2'
        : count === 4
          ? 'grid-cols-2 grid-rows-2'
          : 'grid-cols-6 grid-rows-2';

  return (
    <div
      className={`relative w-full h-full bg-[#F6F3EE] ${
        compact ? 'p-2.5 gap-2' : 'p-3.5 sm:p-4 gap-2.5'
      } flex flex-col justify-between group`}
    >
      <div className="flex items-center justify-between text-[11px] text-[#5E5A54]">
        <span className="font-semibold text-[#191816] truncate">
          {hasRealPieceImages ? 'Your Real Wardrobe Pairing' : 'Stylist Composition Board'}
        </span>
        <span className="tabular-nums shrink-0">{displayTiles.length} pieces</span>
      </div>

      <div className={`grid ${gridClass} gap-2 flex-1 min-h-0`}>
        {displayTiles.map((tile, idx) => {
          const hex = normalizeHexColor(tile.colorHex);
          const imgOk = Boolean(tile.resolvedImg) && !failedUrls[tile.resolvedImg!];
          let spanClass = '';
          if (count === 3 && idx === 0) {
            spanClass = 'row-span-2';
          } else if (count >= 5) {
            spanClass = idx < 2 ? 'col-span-3' : count === 5 ? 'col-span-2' : idx < 4 ? 'col-span-2' : 'col-span-1';
            if (count === 6 && idx >= 2) {
              // 4 small tiles in row 2
              spanClass = idx === 2 || idx === 3 ? 'col-span-2' : 'col-span-1';
            }
          }

          return (
            <div
              key={`${tile.slot}-${idx}`}
              className={`${spanClass} bg-white border border-[#E5E0D8] rounded-xl overflow-hidden flex flex-col min-h-0`}
            >
              <div className="flex-1 min-h-0 bg-[#FAF9F6] flex items-center justify-center p-1.5 overflow-hidden">
                {imgOk ? (
                  <img
                    src={tile.resolvedImg}
                    alt={`${tile.slot}: ${tile.name}`}
                    referrerPolicy="no-referrer"
                    onError={() =>
                      setFailedUrls((prev) => ({
                        ...prev,
                        [tile.resolvedImg!]: true,
                      }))
                    }
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div
                    className="w-full h-full rounded-lg flex items-center justify-center p-2 text-center"
                    style={{ backgroundColor: `${hex}22` }}
                  >
                    <span className="text-[11px] font-medium text-[#191816] line-clamp-2">
                      {tile.name}
                    </span>
                  </div>
                )}
              </div>

              {!compact && (
                <div className="px-2 py-1.5 border-t border-[#EFECE6] bg-white flex items-center justify-between gap-1.5 shrink-0">
                  <div className="min-w-0">
                    <span className="block text-[9px] font-medium text-[#78746D] truncate">
                      {tile.slot}
                    </span>
                    <span className="block text-[11px] font-semibold text-[#191816] truncate">
                      {tile.name}
                    </span>
                  </div>
                  <span
                    className="w-3 h-3 rounded-sm border border-black/15 shrink-0"
                    style={{ backgroundColor: hex }}
                    title={tile.colorName}
                    aria-hidden="true"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {(onInspect || onDownloadPng) && (
        <div className="flex items-center justify-between gap-2 pt-0.5">
          {onDownloadPng && (
            <button
              type="button"
              onClick={onDownloadPng}
              className="min-h-10 sm:min-h-8 px-3 sm:px-2.5 py-1.5 rounded-lg sm:rounded-md bg-white border border-[#E5E0D8] text-xs sm:text-[11px] font-medium text-[#191816] hover:border-[#191816] inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Download className="w-3.5 h-3.5 sm:w-3 sm:h-3" aria-hidden="true" />
              Save Image
            </button>
          )}
          {onInspect && (
            <button
              type="button"
              onClick={onInspect}
              className="ml-auto min-h-10 sm:min-h-8 px-3 sm:px-2.5 py-1.5 rounded-lg sm:rounded-md bg-[#191816] text-white text-xs sm:text-[11px] font-medium hover:bg-[#312E2A] inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Maximize2 className="w-3.5 h-3.5 sm:w-3 sm:h-3" aria-hidden="true" />
              Inspect
            </button>
          )}
        </div>
      )}
    </div>
  );
}
