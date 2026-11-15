import { RefreshCw } from 'lucide-react';
import type { OutfitOption } from '../types/stylist';
import { normalizeHexColor } from '../utils/stylist';

interface FlatLayFallbackBoardProps {
  outfit: OutfitOption;
  anchorImageUrl: string;
  anchorItemName: string;
  onRetryPhoto: () => void;
}

export function FlatLayFallbackBoard({
  outfit,
  anchorImageUrl,
  anchorItemName,
  onRetryPhoto,
}: FlatLayFallbackBoardProps) {
  if (outfit.flatLayStatus === 'loading') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-[#F8F8F7] text-center">
        <RefreshCw className="w-6 h-6 text-[#141413] animate-spin mb-3" aria-hidden="true" />
        <p className="font-display text-xl font-semibold text-[#141413]">
          Composing {outfit.occasion} Flat-Lay
        </p>
        <p className="text-xs text-[#575652] mt-1 max-w-[240px]">
          Arranging pieces on seamless alabaster paper with matching studio lighting...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-[#F8F8F7] p-4 flex flex-col justify-between gap-3">
      <div className="flex items-center justify-between text-[11px] text-[#575652]">
        <span className="font-medium text-[#141413]">Stylist Composition Board</span>
        <span>{outfit.occasion}</span>
      </div>

      <div className="grid grid-cols-2 gap-2.5 flex-1">
        <div className="col-span-1 row-span-2 bg-white rounded-lg border border-[#E4E4E7] p-2.5 flex flex-col justify-between">
          <div className="flex-1 flex items-center justify-center overflow-hidden rounded bg-[#F8F8F7]">
            <img
              src={anchorImageUrl}
              alt={anchorItemName}
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain p-1"
            />
          </div>
          <div className="pt-2">
            <span className="block text-[10px] text-[#787772]">Anchor Piece</span>
            <span className="block text-xs font-semibold text-[#141413] truncate">
              {anchorItemName}
            </span>
          </div>
        </div>

        {outfit.pieces.slice(0, 4).map((piece, i) => {
          const hex = normalizeHexColor(piece.colorHex);
          return (
            <div
              key={`${piece.slot}-${i}`}
              className="bg-white rounded-lg border border-[#E4E4E7] p-2.5 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-medium text-[#787772] truncate">
                  {piece.slot}
                </span>
                <span
                  className="w-4 h-4 rounded-sm border border-black/10 shrink-0"
                  style={{ backgroundColor: hex }}
                  aria-hidden="true"
                />
              </div>
              <div className="mt-1">
                <span className="block text-xs font-semibold text-[#141413] leading-snug line-clamp-2">
                  {piece.name}
                </span>
                <span className="block text-[10px] text-[#575652] truncate mt-0.5">
                  {piece.colorName}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {outfit.flatLayError && (
        <div className="bg-white border border-[#E4E4E7] rounded-lg px-3 py-2 flex items-center justify-between gap-2">
          <p className="text-[11px] text-[#575652] leading-snug line-clamp-2">
            {outfit.flatLayError}
          </p>
          <button
            type="button"
            onClick={onRetryPhoto}
            className="text-[11px] font-semibold text-[#9E1B32] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
          >
            Retry Photo
          </button>
        </div>
      )}
    </div>
  );
}
