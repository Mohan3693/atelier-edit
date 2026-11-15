import { Bookmark, Layers, LayoutGrid, Mic, Shirt } from 'lucide-react';

export type AppSectionId =
  | 'style-studio'
  | 'outfit-looks'
  | 'create-edit'
  | 'voice-stylist'
  | 'saved-looks';

interface MobileBottomNavProps {
  activeSection: AppSectionId;
  hasOutfits: boolean;
  closetCount: number;
  savedCount: number;
  onNavigateSection: (sectionId: AppSectionId) => void;
}

export function MobileBottomNav({
  activeSection,
  hasOutfits,
  closetCount,
  savedCount,
  onNavigateSection,
}: MobileBottomNavProps) {
  const items: Array<{
    id: AppSectionId;
    label: string;
    badge?: number;
    disabled?: boolean;
    icon: typeof Shirt;
  }> = [
    {
      id: 'style-studio',
      label: 'Closet',
      badge: closetCount > 0 ? closetCount : undefined,
      icon: Shirt,
    },
    {
      id: 'outfit-looks',
      label: 'Outfits',
      disabled: !hasOutfits,
      icon: LayoutGrid,
    },
    {
      id: 'create-edit',
      label: 'Mix',
      icon: Layers,
    },
    {
      id: 'voice-stylist',
      label: 'Stylist',
      icon: Mic,
    },
    {
      id: 'saved-looks',
      label: 'Saved',
      badge: savedCount > 0 ? savedCount : undefined,
      icon: Bookmark,
    },
  ];

  return (
    <nav
      aria-label="Mobile bottom menu bar"
      className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#E4E4E7]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="grid grid-cols-5 h-13">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              disabled={item.disabled}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onNavigateSection(item.id)}
              className={`relative flex flex-col items-center justify-center gap-0.5 min-h-11 px-1 transition-colors cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed ${
                isActive ? 'text-[#9E1B32]' : 'text-[#575652] active:text-[#141413]'
              }`}
            >
              <span className="relative inline-flex items-center justify-center">
                <Icon
                  className={`w-[18px] h-[18px] ${isActive ? 'stroke-[2.2]' : 'stroke-[1.75]'}`}
                  aria-hidden="true"
                />
                {typeof item.badge === 'number' && (
                  <span className="ml-1 text-[10px] font-semibold tabular-nums leading-none">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </span>
              <span
                className={`text-[10px] leading-none tracking-tight whitespace-nowrap ${
                  isActive ? 'font-semibold' : 'font-medium'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
