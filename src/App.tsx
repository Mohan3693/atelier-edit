import { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { MobileBottomNav, type AppSectionId } from './components/MobileBottomNav';
import { ClosetStudio } from './components/ClosetStudio';
import { AnalysisStrip } from './components/AnalysisStrip';
import { OutfitGrid } from './components/OutfitGrid';
import { MixMatchStudio } from './components/MixMatchStudio';
import { VoiceStylistSection } from './components/VoiceStylistSection';
import {
  SavedLooksSection,
  type HistoryAnalysisEntry,
} from './components/SavedLooksSection';
import { LookLightboxModal } from './components/LookLightboxModal';
import { useAuth } from './contexts/AuthContext';
import { SAMPLE_WARDROBE } from './data/sampleWardrobe';
import {
  deleteSavedLookInFirestore,
  deleteWardrobeItemInFirestore,
  loadUserPreferencesFromFirestore,
  recordAnalysisInFirestore,
  saveUserPreferencesToFirestore,
  subscribeSavedLooksInFirestore,
  subscribeWardrobeItemsInFirestore,
  syncUserProfileToFirestore,
  upsertSavedLookInFirestore,
  upsertWardrobeItemInFirestore,
} from './lib/firestoreLooks';
import type {
  ItemAnalysis,
  OccasionType,
  OutfitOption,
  SavedLook,
  WardrobeCategoryId,
  WardrobeGender,
  WardrobeItem,
} from './types/stylist';
import {
  composeClosetOutfitsApi,
  deleteSavedLookSqlApi,
  fetchWardrobeHistorySqlApi,
  recordAnalysisSqlApi,
  recordVoiceSessionSqlApi,
  syncUserSqlApi,
  upsertSavedLookSqlApi,
} from './utils/api';
import type { StylistVoiceName } from './utils/liveAudio';
import {
  getOutfitPaletteCategory,
  parseSavedLooksJson,
  SAVED_LOOKS_STORAGE_KEY,
  toggleSavedOutfit,
} from './utils/stylist';
import {
  cleanFileLabel,
  deleteClosetItemLocal,
  getCategoryLabel,
  loadClosetItemsLocal,
  prepareWardrobeImagePair,
  prepareWardrobeImagePairFromUrl,
  resolveOutfitPiecesWithCloset,
  saveClosetItemLocal,
} from './utils/wardrobe';
import { renderOutfitCollageDataUrl } from './utils/collageExport';
import { exportOutfitsToPdf } from './utils/pdfExport';

const GENDER_STORAGE_KEY = 'atelier_edit_gender_v1';

export default function App() {
  const {
    user,
    loading: authLoading,
    authError,
    clearAuthError,
    signInWithGoogle,
    signOutUser,
    getIdToken,
  } = useAuth();

  const [gender, setGender] = useState<WardrobeGender>(() => {
    if (typeof window === 'undefined') return 'male';
    const raw = window.localStorage.getItem(GENDER_STORAGE_KEY);
    return raw === 'female' || raw === 'unisex' ? raw : 'male';
  });
  const [season, setSeason] = useState<string>('All-Season');
  const [aesthetic, setAesthetic] = useState<string>('Modern Editorial');
  const [preferredVoice, setPreferredVoice] = useState<StylistVoiceName>('Zephyr');

  const [closetItems, setClosetItems] = useState<WardrobeItem[]>([]);
  const [anchorItemId, setAnchorItemId] = useState<string | null>(null);

  const [analysis, setAnalysis] = useState<ItemAnalysis | null>(null);
  const [outfits, setOutfits] = useState<OutfitOption[]>([]);
  const [isComposing, setIsComposing] = useState<boolean>(false);
  const [composeError, setComposeError] = useState<string | null>(null);
  const [recentAnalyses, setRecentAnalyses] = useState<HistoryAnalysisEntry[]>([]);

  const [savedLooks, setSavedLooks] = useState<SavedLook[]>(() => {
    if (typeof window === 'undefined') return [];
    return parseSavedLooksJson(window.localStorage.getItem(SAVED_LOOKS_STORAGE_KEY));
  });

  const [lightboxState, setLightboxState] = useState<{
    outfit: OutfitOption;
    anchorItemName: string;
  } | null>(null);
  const [activeSection, setActiveSection] = useState<AppSectionId>('style-studio');

  useEffect(() => {
    void loadClosetItemsLocal().then((localItems) => {
      if (localItems.length > 0) {
        setClosetItems(localItems);
      }
    });
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(GENDER_STORAGE_KEY, gender);
    } catch {
      // Ignore storage errors
    }
  }, [gender]);

  useEffect(() => {
    try {
      window.localStorage.setItem(SAVED_LOOKS_STORAGE_KEY, JSON.stringify(savedLooks));
    } catch {
      // Ignore storage quota errors
    }
  }, [savedLooks]);

  useEffect(() => {
    if (!user) {
      setRecentAnalyses([]);
      return;
    }

    let cancelled = false;
    let unsubscribeLooks: (() => void) | null = null;
    let unsubscribeCloset: (() => void) | null = null;

    const bootstrapUserData = async () => {
      try {
        await syncUserProfileToFirestore(user);
        const prefs = await loadUserPreferencesFromFirestore(user.uid);
        if (!cancelled && prefs) {
          if (prefs.preferredGender) {
            setGender(prefs.preferredGender);
          }
          setSeason(prefs.preferredSeason);
          setAesthetic(prefs.preferredAesthetic);
          setPreferredVoice(prefs.preferredVoice);
        }

        unsubscribeCloset = subscribeWardrobeItemsInFirestore(user.uid, (remoteItems) => {
          if (cancelled || remoteItems.length === 0) return;
          setClosetItems((prevLocal) => {
            const merged = new Map<string, WardrobeItem>();
            for (const remote of remoteItems) {
              merged.set(remote.id, remote);
            }
            for (const local of prevLocal) {
              const existingRemote = merged.get(local.id);
              if (existingRemote) {
                merged.set(local.id, {
                  ...existingRemote,
                  imageUrl: local.imageUrl || existingRemote.imageUrl,
                });
              } else {
                merged.set(local.id, local);
              }
            }
            return Array.from(merged.values()).sort((a, b) =>
              (b.createdAt || '').localeCompare(a.createdAt || ''),
            );
          });
        });

        unsubscribeLooks = subscribeSavedLooksInFirestore(user.uid, () => {
          // Real-time Firestore listener active for verified owner
        });

        const token = await getIdToken();
        if (token && !cancelled) {
          await syncUserSqlApi(token);
          const history = await fetchWardrobeHistorySqlApi(token);
          if (cancelled) return;

          setRecentAnalyses(
            history.analyses.map((a) => ({
              id: a.id,
              itemName: a.itemName,
              category: a.category,
              season: a.season,
              aesthetic: a.aesthetic,
              stylePersonality: a.stylePersonality,
              createdAt: a.createdAt,
              itemAnalysis: a.analysisJson?.itemAnalysis,
              outfits: a.analysisJson?.outfits,
            })),
          );

          if (history.savedLooks.length > 0) {
            setSavedLooks((localPrev) => {
              const map = new Map<string, SavedLook>();
              for (const item of localPrev) {
                map.set(item.id, item);
              }
              for (const row of history.savedLooks) {
                if (row.outfitJson && !map.has(row.clientLookId)) {
                  map.set(row.clientLookId, {
                    id: row.clientLookId,
                    savedAt: row.createdAt,
                    anchorItemName: row.anchorItemName,
                    anchorImageUrl: row.anchorImageRef || SAMPLE_WARDROBE[0].imageUrl,
                    palette: Array.isArray(row.paletteJson) ? row.paletteJson : [],
                    outfit: row.outfitJson,
                  });
                }
              }
              return Array.from(map.values());
            });
          }
        }
      } catch (err) {
        console.error('Account sync notice:', err);
      }
    };

    void bootstrapUserData();

    return () => {
      cancelled = true;
      unsubscribeLooks?.();
      unsubscribeCloset?.();
    };
  }, [user, getIdToken]);

  const persistUserPrefs = async (
    nextGender: WardrobeGender,
    nextSeason: string,
    nextAesthetic: string,
    nextVoice: StylistVoiceName,
  ) => {
    if (!user) return;
    try {
      await saveUserPreferencesToFirestore(user.uid, {
        preferredGender: nextGender,
        preferredSeason:
          nextSeason === 'Spring / Summer' || nextSeason === 'Autumn / Winter'
            ? nextSeason
            : 'All-Season',
        preferredAesthetic: nextAesthetic,
        preferredVoice: nextVoice,
      });
    } catch {
      // Non-blocking preference sync
    }
  };

  useEffect(() => {
    const sectionIds: AppSectionId[] = [
      'style-studio',
      'outfit-looks',
      'create-edit',
      'voice-stylist',
      'saved-looks',
    ];
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.id as AppSectionId;
            if (sectionIds.includes(id)) {
              setActiveSection(id);
            }
          }
        }
      },
      { rootMargin: '-35% 0px -50% 0px', threshold: 0.01 },
    );
    for (const id of sectionIds) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [outfits.length]);

  const handleNavigateSection = (sectionId: AppSectionId) => {
    setActiveSection(sectionId);
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleUploadFilesToCategory = async (
    files: FileList | File[],
    category: WardrobeCategoryId,
  ) => {
    setComposeError(null);
    const fileArray = Array.from(files);
    const created: WardrobeItem[] = [];

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      try {
        const pair = await prepareWardrobeImagePair(file);
        const item: WardrobeItem = {
          id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${i}`,
          gender,
          category,
          label: cleanFileLabel(file.name, getCategoryLabel(category, gender)),
          imageUrl: pair.imageUrl,
          syncThumbnailUrl: pair.syncThumbnailUrl,
          colorName: 'Uploaded',
          colorHex: pair.colorHex,
          createdAt: new Date().toISOString(),
        };
        created.push(item);
        await saveClosetItemLocal(item);
        if (user) {
          void upsertWardrobeItemInFirestore(user.uid, item).catch(() => {});
        }
      } catch (err) {
        setComposeError(
          err instanceof Error ? err.message : 'Unable to process one of the selected photos.',
        );
      }
    }

    if (created.length > 0) {
      setClosetItems((prev) => [...created, ...prev]);
    }
  };

  const handleUpdateItemLabel = (itemId: string, label: string) => {
    let updated: WardrobeItem | undefined;
    setClosetItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        updated = { ...item, label };
        return updated;
      }),
    );
    if (updated) {
      void saveClosetItemLocal(updated);
      if (user) {
        void upsertWardrobeItemInFirestore(user.uid, updated).catch(() => {});
      }
    }
  };

  const handleMoveItemCategory = (itemId: string, category: WardrobeCategoryId) => {
    let updated: WardrobeItem | undefined;
    setClosetItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        updated = { ...item, category };
        return updated;
      }),
    );
    if (updated) {
      void saveClosetItemLocal(updated);
      if (user) {
        void upsertWardrobeItemInFirestore(user.uid, updated).catch(() => {});
      }
    }
  };

  const handleDeleteItem = (itemId: string) => {
    setClosetItems((prev) => prev.filter((item) => item.id !== itemId));
    if (anchorItemId === itemId) setAnchorItemId(null);
    void deleteClosetItemLocal(itemId);
    if (user) {
      void deleteWardrobeItemInFirestore(user.uid, itemId).catch(() => {});
    }
  };

  const handleLoadStarterCloset = async () => {
    setComposeError(null);
    const starterSpecs: Array<{
      label: string;
      category: WardrobeCategoryId;
      imageUrl: string;
    }> = [
      {
        label: 'Emerald Silk Slip Dress',
        category: 'dresses',
        imageUrl: SAMPLE_WARDROBE[1].imageUrl,
      },
      {
        label: 'Rust Houndstooth Wool Blazer',
        category: 'outerwear',
        imageUrl: SAMPLE_WARDROBE[2].imageUrl,
      },
      {
        label: 'Botanical Jacquard Midi Skirt',
        category: 'bottoms',
        imageUrl: SAMPLE_WARDROBE[0].imageUrl,
      },
    ];

    if (gender === 'male') {
      setGender('unisex');
    }

    const added: WardrobeItem[] = [];
    for (let i = 0; i < starterSpecs.length; i++) {
      const spec = starterSpecs[i];
      try {
        const pair = await prepareWardrobeImagePairFromUrl(spec.imageUrl);
        const item: WardrobeItem = {
          id: `starter-${Date.now()}-${i}`,
          gender: 'unisex',
          category: spec.category,
          label: spec.label,
          imageUrl: pair.imageUrl,
          syncThumbnailUrl: pair.syncThumbnailUrl,
          colorName: 'Curated',
          colorHex: pair.colorHex,
          createdAt: new Date().toISOString(),
        };
        added.push(item);
        await saveClosetItemLocal(item);
        if (user) {
          void upsertWardrobeItemInFirestore(user.uid, item).catch(() => {});
        }
      } catch {
        // Ignore single sample asset error
      }
    }

    if (added.length > 0) {
      setClosetItems((prev) => [...added, ...prev]);
    }
  };

  const handleGenerateOutfitsFromCloset = async () => {
    if (closetItems.length < 2) {
      setComposeError('Upload at least 2 wardrobe items across your categories first.');
      return;
    }

    setComposeError(null);
    setIsComposing(true);

    try {
      // Keep payload fast and safely under Vercel 4.5MB limit by sending compact 360px sync thumbnails
      const payloadItems = closetItems.slice(0, 20).map((item) => ({
        id: item.id,
        category: item.category,
        label: item.label,
        imageDataUrl: item.syncThumbnailUrl || item.imageUrl,
      }));

      const result = await composeClosetOutfitsApi({
        gender,
        season,
        aesthetic,
        anchorItemId: anchorItemId ?? undefined,
        items: payloadItems,
      });

      const batchStamp = Date.now();
      const hydratedOutfits: OutfitOption[] = result.outfits.slice(0, 3).map((item, idx) => {
        const occasion: OccasionType =
          item.occasion === 'Business' || item.occasion === 'Night Out'
            ? item.occasion
            : idx === 1
              ? 'Business'
              : idx === 2
                ? 'Night Out'
                : 'Casual';
        const resolvedPieces = resolveOutfitPiecesWithCloset(item.pieces, closetItems);
        return {
          ...item,
          occasion,
          pieces: resolvedPieces,
          colorPaletteCategory: getOutfitPaletteCategory(
            { ...item, pieces: resolvedPieces },
            result.itemAnalysis.palette,
          ),
          id: `look-${occasion.toLowerCase().replace(/\s+/g, '-')}-${batchStamp}-${idx}`,
          flatLayImageUrl: null,
          flatLayStatus: 'ready',
          editHistory: [],
        };
      });

      setAnalysis(result.itemAnalysis);
      setOutfits(hydratedOutfits);

      if (user) {
        const analysisId = `analysis-${batchStamp}`;
        void recordAnalysisInFirestore(
          user.uid,
          analysisId,
          result.itemAnalysis,
          season,
          aesthetic,
        ).catch(() => {});

        void getIdToken().then(async (token) => {
          if (!token) return;
          try {
            await recordAnalysisSqlApi(token, {
              analysis: result.itemAnalysis,
              outfits: hydratedOutfits,
              season,
              aesthetic,
            });
            const history = await fetchWardrobeHistorySqlApi(token);
            setRecentAnalyses(
              history.analyses.map((a) => ({
                id: a.id,
                itemName: a.itemName,
                category: a.category,
                season: a.season,
                aesthetic: a.aesthetic,
                stylePersonality: a.stylePersonality,
                createdAt: a.createdAt,
                itemAnalysis: a.analysisJson?.itemAnalysis,
                outfits: a.analysisJson?.outfits,
              })),
            );
          } catch {
            // Non-blocking SQL sync
          }
        });
      }

      setTimeout(() => {
        handleNavigateSection('outfit-looks');
      }, 120);
    } catch (err) {
      setComposeError(
        err instanceof Error
          ? err.message
          : 'Could not compose outfits from your closet. Please try again.',
      );
    } finally {
      setIsComposing(false);
    }
  };

  const handleSwapPiece = (outfitId: string, pieceIndex: number, nextItemId: string) => {
    const nextItem = closetItems.find((i) => i.id === nextItemId);
    if (!nextItem) return;

    setOutfits((prev) =>
      prev.map((outfit) => {
        if (outfit.id !== outfitId) return outfit;
        const nextPieces = outfit.pieces.map((p, idx) =>
          idx === pieceIndex
            ? {
                ...p,
                wardrobeItemId: nextItem.id,
                category: nextItem.category,
                imageUrl: nextItem.imageUrl,
                name: nextItem.label,
                colorHex: nextItem.colorHex,
                colorName: nextItem.colorName,
              }
            : p,
        );
        return {
          ...outfit,
          pieces: nextPieces,
          flatLayImageUrl: null,
        };
      }),
    );
  };

  const getRepresentativeAnchorImage = (): string => {
    if (anchorItemId) {
      const pinned = closetItems.find((i) => i.id === anchorItemId);
      if (pinned) return pinned.imageUrl;
    }
    if (closetItems[0]) return closetItems[0].imageUrl;
    return SAMPLE_WARDROBE[0].imageUrl;
  };

  const handleExportAllToPdf = async (
    visibleOutfits: OutfitOption[],
  ): Promise<{ ok: boolean; message: string }> => {
    if (!analysis || visibleOutfits.length === 0) {
      return { ok: false, message: 'Generate outfits from your closet before exporting PDF.' };
    }
    try {
      const outfitsWithCollages = await Promise.all(
        visibleOutfits.map(async (outfit) => {
          if (outfit.flatLayImageUrl) return outfit;
          const rendered = await renderOutfitCollageDataUrl(outfit, closetItems);
          return {
            ...outfit,
            flatLayImageUrl: rendered || null,
          };
        }),
      );

      const result = await exportOutfitsToPdf({
        analysis,
        anchorImageUrl: getRepresentativeAnchorImage(),
        outfits: outfitsWithCollages,
      });
      return {
        ok: true,
        message: `Exported ${visibleOutfits.length} ${visibleOutfits.length === 1 ? 'look' : 'looks'} to ${result.filename}`,
      };
    } catch (err) {
      return {
        ok: false,
        message:
          err instanceof Error ? err.message : 'Unable to generate PDF lookbook.',
      };
    }
  };

  const handleToggleSave = async (outfit: OutfitOption) => {
    const capsuleAnalysis: ItemAnalysis = analysis ?? {
      itemName: 'Personal Closet Look',
      category: gender === 'male' ? 'Menswear' : gender === 'female' ? 'Womenswear' : 'Closet Edit',
      silhouette: 'Custom Closet Pairing',
      fabricAndTexture: 'Personal Wardrobe',
      patternDescription: 'Curated from your uploaded pieces',
      stylePersonality: aesthetic,
      stylingStrategy: 'Styled from your stored items.',
      palette: outfit.pieces.slice(0, 4).map((p, i) => ({
        name: p.colorName,
        hex: p.colorHex,
        role: i === 0 ? 'Primary' : 'Neutral',
      })),
    };

    const renderedUrl =
      outfit.flatLayImageUrl || (await renderOutfitCollageDataUrl(outfit, closetItems));
    const outfitToSave: OutfitOption = {
      ...outfit,
      flatLayImageUrl: renderedUrl || null,
      flatLayStatus: renderedUrl ? 'ready' : outfit.flatLayStatus,
    };

    const anchorImg =
      outfit.pieces[0]?.imageUrl || getRepresentativeAnchorImage();

    const result = toggleSavedOutfit(savedLooks, {
      outfit: outfitToSave,
      anchorItemName: capsuleAnalysis.itemName,
      anchorImageUrl: anchorImg,
      palette: capsuleAnalysis.palette,
    });
    setSavedLooks(result.next);

    if (user) {
      if (result.saved) {
        const added = result.next[0];
        if (added) {
          void upsertSavedLookInFirestore(user.uid, added).catch(() => {});
          void getIdToken().then((token) => {
            if (token) void upsertSavedLookSqlApi(token, added).catch(() => {});
          });
        }
      } else {
        const removed = savedLooks.find((item) => item.outfit.id === outfit.id);
        if (removed) {
          void deleteSavedLookInFirestore(user.uid, removed.id).catch(() => {});
          void getIdToken().then((token) => {
            if (token) void deleteSavedLookSqlApi(token, removed.id).catch(() => {});
          });
        }
      }
    }
  };

  const handleSaveCustomLook = (customOutfit: OutfitOption) => {
    void handleToggleSave(customOutfit);
  };

  const handleRemoveSavedLook = (lookId: string) => {
    setSavedLooks((prev) => prev.filter((item) => item.id !== lookId));
    if (user) {
      void deleteSavedLookInFirestore(user.uid, lookId).catch(() => {});
      void getIdToken().then((token) => {
        if (token) void deleteSavedLookSqlApi(token, lookId).catch(() => {});
      });
    }
  };

  const handleRestoreAnalysis = (entry: HistoryAnalysisEntry) => {
    if (!entry.itemAnalysis || !entry.outfits) return;
    setAnalysis(entry.itemAnalysis);
    setOutfits(
      entry.outfits.map((o) => ({
        ...o,
        pieces: resolveOutfitPiecesWithCloset(o.pieces, closetItems),
      })),
    );
    handleNavigateSection('outfit-looks');
  };

  const handleVoiceSessionEnded = (summary: {
    anchorItemName: string;
    voiceName: StylistVoiceName;
    transcriptSummary: string;
    durationSeconds: number;
  }) => {
    if (!user) return;
    void getIdToken().then((token) => {
      if (token) {
        void recordVoiceSessionSqlApi(token, summary).catch(() => {});
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#F8F8F7] text-[#141413] flex flex-col pb-16 lg:pb-0">
      <Header
        savedCount={savedLooks.length}
        closetCount={closetItems.length}
        hasOutfits={outfits.length > 0}
        activeSection={activeSection}
        user={user}
        authLoading={authLoading}
        onSignInWithGoogle={signInWithGoogle}
        onSignOut={signOutUser}
        onTriggerUpload={() => {
          handleNavigateSection('style-studio');
          document.getElementById('closet-multi-file-input')?.click();
        }}
        onNavigateSection={handleNavigateSection}
      />

      {authError && (
        <div
          role="alert"
          className="bg-[#FAF3F4] border-b border-[#E7C6CC] px-4 sm:px-6 py-2.5 text-xs text-[#9E1B32] flex items-center justify-between gap-4 max-w-[1240px] w-full mx-auto"
        >
          <span>{authError}</span>
          <button
            type="button"
            onClick={clearAuthError}
            className="min-h-10 px-2 font-semibold underline cursor-pointer shrink-0 inline-flex items-center"
          >
            Dismiss
          </button>
        </div>
      )}

      <main className="flex-1">

        <ClosetStudio
          gender={gender}
          season={season}
          aesthetic={aesthetic}
          closetItems={closetItems}
          anchorItemId={anchorItemId}
          isComposing={isComposing}
          composeError={composeError}
          onGenderChange={(nextGender) => {
            setGender(nextGender);
            void persistUserPrefs(nextGender, season, aesthetic, preferredVoice);
          }}
          onSeasonChange={(nextSeason) => {
            setSeason(nextSeason);
            void persistUserPrefs(gender, nextSeason, aesthetic, preferredVoice);
          }}
          onAestheticChange={(nextAesthetic) => {
            setAesthetic(nextAesthetic);
            void persistUserPrefs(gender, season, nextAesthetic, preferredVoice);
          }}
          onUploadFilesToCategory={handleUploadFilesToCategory}
          onUpdateItemLabel={handleUpdateItemLabel}
          onMoveItemCategory={handleMoveItemCategory}
          onDeleteItem={handleDeleteItem}
          onToggleAnchorItem={(id) =>
            setAnchorItemId((curr) => (curr === id ? null : id))
          }
          onLoadStarterCloset={handleLoadStarterCloset}
          onGenerateOutfits={() => void handleGenerateOutfitsFromCloset()}
        />

        {analysis && (
          <AnalysisStrip
            analysis={analysis}
            anchorImageUrl={getRepresentativeAnchorImage()}
          />
        )}

        {outfits.length > 0 && analysis && (
          <OutfitGrid
            outfits={outfits}
            closetItems={closetItems}
            anchorPalette={analysis.palette}
            anchorImageUrl={getRepresentativeAnchorImage()}
            anchorItemName={analysis.itemName}
            savedLooks={savedLooks}
            isRefreshingAll={isComposing}
            onSwapPiece={handleSwapPiece}
            onToggleSave={(o) => void handleToggleSave(o)}
            onInspectLook={(outfit) =>
              setLightboxState({ outfit, anchorItemName: analysis.itemName })
            }
            onRefreshAllOutfits={() => void handleGenerateOutfitsFromCloset()}
            onExportAllToPdf={handleExportAllToPdf}
          />
        )}

        <MixMatchStudio
          gender={gender}
          closetItems={closetItems}
          onSaveCustomLook={handleSaveCustomLook}
        />

        <VoiceStylistSection
          analysis={analysis}
          outfits={outfits}
          preferredVoice={preferredVoice}
          onVoiceChange={(nextVoice) => {
            setPreferredVoice(nextVoice);
            void persistUserPrefs(gender, season, aesthetic, nextVoice);
          }}
          onVoiceSessionEnded={handleVoiceSessionEnded}
        />

        <SavedLooksSection
          savedLooks={savedLooks}
          closetItems={closetItems}
          isSignedIn={Boolean(user)}
          recentAnalyses={recentAnalyses}
          onSignInPrompt={signInWithGoogle}
          onRestoreAnalysis={handleRestoreAnalysis}
          onRemoveSavedLook={handleRemoveSavedLook}
          onInspectSavedLook={(outfit, anchorItemName) =>
            setLightboxState({ outfit, anchorItemName })
          }
        />
      </main>

      <footer className="border-t border-[#E4E4E7] bg-white">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 text-center sm:text-left text-xs text-[#575652]">
          <span className="font-display text-base font-semibold text-[#141413]">
            Atelier Edit
          </span>
          <span>
            Personal Wardrobe Vault · Real-Photo Outfit Composer &amp; Lookbook Studio
          </span>
        </div>
      </footer>

      <LookLightboxModal
        outfit={
          lightboxState
            ? outfits.find((o) => o.id === lightboxState.outfit.id) ??
              lightboxState.outfit
            : null
        }
        closetItems={closetItems}
        anchorItemName={lightboxState?.anchorItemName ?? ''}
        anchorImageUrl={getRepresentativeAnchorImage()}
        onClose={() => setLightboxState(null)}
      />

      <MobileBottomNav
        activeSection={activeSection}
        hasOutfits={outfits.length > 0}
        closetCount={closetItems.length}
        savedCount={savedLooks.length}
        onNavigateSection={handleNavigateSection}
      />
    </div>
  );
}
