import { useEffect, useRef, useState } from 'react';
import { Header, type AppPageId } from './components/Header';
import { AuthGateView } from './components/AuthGateView';
import { GenderOnboardingView } from './components/GenderOnboardingView';
import { ClosetStudio } from './components/ClosetStudio';
import { AnalysisStrip } from './components/AnalysisStrip';
import { OutfitGrid } from './components/OutfitGrid';
import { MixMatchStudio } from './components/MixMatchStudio';
import {
  SavedLooksSection,
  type HistoryAnalysisEntry,
} from './components/SavedLooksSection';
import { ProfilePage } from './components/ProfilePage';
import { LookLightboxModal } from './components/LookLightboxModal';
import { useAuth } from './contexts/AuthContext';
import { SAMPLE_WARDROBE } from './data/sampleWardrobe';
import {
  deleteAllUserDataFromFirestore,
  deleteAllUserWardrobeItemsFromFirestore,
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
  categorizeWardrobeItemsApi,
  composeClosetOutfitsApi,
  deleteSavedLookSqlApi,
  deleteUserAccountSqlApi,
  fetchWardrobeHistorySqlApi,
  recordAnalysisSqlApi,
  syncUserSqlApi,
  upsertSavedLookSqlApi,
  type CategorizedWardrobeResult,
} from './utils/api';
import {
  getOutfitPaletteCategory,
  parseSavedLooksJson,
  SAVED_LOOKS_STORAGE_KEY,
  toggleSavedOutfit,
} from './utils/stylist';
import {
  cleanFileLabel,
  clearClosetItemsLocal,
  deleteClosetItemLocal,
  getCategoryLabel,
  loadClosetItemsLocal,
  mergeUniqueWardrobeItems,
  normalizeCategoryForGender,
  prepareWardrobeImagePair,
  prepareWardrobeImagePairFromUrl,
  resolveOutfitPiecesWithCloset,
  saveClosetItemLocal,
} from './utils/wardrobe';
import { renderOutfitCollageDataUrl } from './utils/collageExport';
import { exportOutfitsToPdf } from './utils/pdfExport';

const GENDER_STORAGE_KEY = 'atelier_edit_gender_v1';

function sessionGenderKey(uid: string): string {
  return `atelier_edit_session_gender_${uid}`;
}

export default function App() {
  const {
    user,
    loading: authLoading,
    authError,
    clearAuthError,
    signInWithGoogle,
    signOutUser,
    deleteAccount,
    getIdToken,
  } = useAuth();

  const [gender, setGender] = useState<WardrobeGender>(() => {
    if (typeof window === 'undefined') return 'male';
    const raw = window.localStorage.getItem(GENDER_STORAGE_KEY);
    return raw === 'female' ? 'female' : 'male';
  });
  const [savedServerGender, setSavedServerGender] = useState<WardrobeGender | undefined>(
    undefined,
  );
  const [genderConfirmed, setGenderConfirmed] = useState<boolean>(false);
  const [season, setSeason] = useState<string>('All-Season');
  const [aesthetic, setAesthetic] = useState<string>('Modern Editorial');

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
  const [activePage, setActivePage] = useState<AppPageId>('closet');
  const isLoadingStarterRef = useRef(false);

  useEffect(() => {
    void loadClosetItemsLocal().then((localItems) => {
      if (localItems.length > 0) {
        setClosetItems((prev) => mergeUniqueWardrobeItems(localItems, prev));
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
      setGenderConfirmed(false);
      setSavedServerGender(undefined);
      setActivePage('closet');
      return;
    }

    try {
      const sessionChoice = window.sessionStorage.getItem(sessionGenderKey(user.uid));
      if (sessionChoice === 'male' || sessionChoice === 'female') {
        setGender(sessionChoice);
        setGenderConfirmed(true);
      } else {
        setGenderConfirmed(false);
      }
    } catch {
      setGenderConfirmed(false);
    }

    let cancelled = false;
    let unsubscribeLooks: (() => void) | null = null;
    let unsubscribeCloset: (() => void) | null = null;

    const bootstrapUserData = async () => {
      try {
        await syncUserProfileToFirestore(user);
        const prefs = await loadUserPreferencesFromFirestore(user.uid);
        if (!cancelled && prefs) {
          if (prefs.preferredGender === 'male' || prefs.preferredGender === 'female') {
            setSavedServerGender(prefs.preferredGender);
            const alreadyChosen = window.sessionStorage.getItem(sessionGenderKey(user.uid));
            if (!alreadyChosen) {
              setGender(prefs.preferredGender);
            }
          }
          setSeason(prefs.preferredSeason);
          setAesthetic(prefs.preferredAesthetic);
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
        preferredVoice: 'Zephyr',
      });
    } catch {
      // Non-blocking preference sync
    }
  };

  const navigateToPage = (pageId: AppPageId) => {
    setActivePage(pageId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectLoginGender = (chosenGender: 'male' | 'female') => {
    setGender(chosenGender);
    setSavedServerGender(chosenGender);
    setGenderConfirmed(true);
    setActivePage('closet');
    if (user) {
      try {
        window.sessionStorage.setItem(sessionGenderKey(user.uid), chosenGender);
      } catch {
        // Ignore session storage errors
      }
    }
    void persistUserPrefs(chosenGender, season, aesthetic);
  };

  const handleSignOutClick = async () => {
    if (user) {
      try {
        window.sessionStorage.removeItem(sessionGenderKey(user.uid));
      } catch {
        // Ignore session storage errors
      }
    }
    setGenderConfirmed(false);
    setAnalysis(null);
    setOutfits([]);
    setActivePage('closet');
    await signOutUser();
  };

  const handleExportProfileData = () => {
    if (!user) return;
    const exportPayload = {
      exportedAt: new Date().toISOString(),
      account: {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        emailVerified: user.emailVerified,
        createdAt: user.metadata?.creationTime ?? null,
      },
      preferences: {
        gender,
        season,
        aesthetic,
      },
      closetItems: closetItems.map(({ id, gender: itemGender, category, label, colorName, colorHex, createdAt }) => ({
        id,
        gender: itemGender,
        category,
        label,
        colorName,
        colorHex,
        createdAt,
      })),
      savedLooks: savedLooks.map((look) => ({
        id: look.id,
        savedAt: look.savedAt,
        anchorItemName: look.anchorItemName,
        occasion: look.outfit.occasion,
        title: look.outfit.title,
        moodSummary: look.outfit.moodSummary,
        colorHarmonyNote: look.outfit.colorHarmonyNote,
        pieces: look.outfit.pieces.map((p) => ({
          slot: p.slot,
          name: p.name,
          colorName: p.colorName,
          material: p.material,
        })),
      })),
      recentSessions: recentAnalyses.map(({ id, itemName, category, season: s, aesthetic: a, createdAt }) => ({
        id,
        itemName,
        category,
        season: s,
        aesthetic: a,
        createdAt,
      })),
    };

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `outfitvault-wardrobe-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleClearAllCloset = async () => {
    if (user) {
      await deleteAllUserWardrobeItemsFromFirestore(user.uid);
    }
    await clearClosetItemsLocal();
    setClosetItems([]);
    setAnchorItemId(null);
    setOutfits([]);
    setAnalysis(null);
    setComposeError(null);
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    const uid = user.uid;

    await deleteAllUserDataFromFirestore(uid);

    const token = await getIdToken();
    if (token) {
      await deleteUserAccountSqlApi(token).catch(() => {});
    }

    await deleteAccount();

    await clearClosetItemsLocal();
    try {
      window.localStorage.removeItem(SAVED_LOOKS_STORAGE_KEY);
      window.localStorage.removeItem(GENDER_STORAGE_KEY);
      window.sessionStorage.removeItem(sessionGenderKey(uid));
    } catch {
      // Ignore storage cleanup errors
    }

    setClosetItems([]);
    setAnchorItemId(null);
    setSavedLooks([]);
    setOutfits([]);
    setAnalysis(null);
    setRecentAnalyses([]);
    setGenderConfirmed(false);
    setActivePage('closet');
  };

  const handleUploadFilesToCategory = async (
    files: FileList | File[],
    fallbackCategory: WardrobeCategoryId,
  ): Promise<{
    uploadedItems: WardrobeItem[];
    notice?: string;
  }> => {
    setComposeError(null);
    const fileArray = Array.from(files);

    const prepared: Array<{
      tempId: string;
      file: File;
      pair: { imageUrl: string; syncThumbnailUrl: string; colorHex: string };
    }> = [];

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      try {
        const pair = await prepareWardrobeImagePair(file);
        prepared.push({
          tempId: `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${i}`,
          file,
          pair,
        });
      } catch (err) {
        setComposeError(
          err instanceof Error ? err.message : 'Unable to process one of the selected photos.',
        );
      }
    }

    if (prepared.length === 0) {
      return { uploadedItems: [] };
    }

    const analyzedByTempId = new Map<string, CategorizedWardrobeResult>();
    let analyzeErrorMessage: string | null = null;

    // Analyze uploaded photos in small fast batches to auto-detect category, label, and color
    for (let start = 0; start < prepared.length; start += 6) {
      const batch = prepared.slice(start, start + 6);
      try {
        const res = await categorizeWardrobeItemsApi({
          gender,
          items: batch.map((entry) => ({
            tempId: entry.tempId,
            imageDataUrl: entry.pair.syncThumbnailUrl || entry.pair.imageUrl,
            filename: entry.file.name,
          })),
        });
        for (const classified of res.items) {
          analyzedByTempId.set(classified.tempId, classified);
        }
      } catch (err) {
        analyzeErrorMessage =
          err instanceof Error
            ? err.message
            : 'Could not auto-categorize photos via image analysis.';
      }
    }

    if (analyzeErrorMessage) {
      setComposeError(
        `${analyzeErrorMessage} Placed uploaded item(s) into ${getCategoryLabel(
          fallbackCategory,
          gender,
        )} so you can still use or adjust them.`,
      );
    }

    const created: WardrobeItem[] = [];
    for (const entry of prepared) {
      const analyzed = analyzedByTempId.get(entry.tempId);
      const resolvedCategory = analyzed
        ? normalizeCategoryForGender(analyzed.category, gender, fallbackCategory)
        : fallbackCategory;
      const resolvedLabel =
        analyzed?.label?.trim() ||
        cleanFileLabel(entry.file.name, getCategoryLabel(resolvedCategory, gender));
      const resolvedColorName = analyzed?.colorName?.trim() || 'Uploaded';
      const resolvedColorHex = analyzed?.colorHex?.trim() || entry.pair.colorHex;

      const item: WardrobeItem = {
        id: entry.tempId,
        gender,
        category: resolvedCategory,
        label: resolvedLabel.slice(0, 120),
        imageUrl: entry.pair.imageUrl,
        syncThumbnailUrl: entry.pair.syncThumbnailUrl,
        colorName: resolvedColorName.slice(0, 60),
        colorHex: resolvedColorHex.slice(0, 16),
        createdAt: new Date().toISOString(),
      };
      created.push(item);
      await saveClosetItemLocal(item);
      if (user) {
        void upsertWardrobeItemInFirestore(user.uid, item).catch(() => {});
      }
    }

    if (created.length > 0) {
      setClosetItems((prev) => mergeUniqueWardrobeItems(created, prev));
    }

    let notice: string | undefined;
    if (created.length === 1 && analyzedByTempId.size > 0) {
      notice = `Analyzed "${created[0].label}" and placed in ${getCategoryLabel(
        created[0].category,
        gender,
      )}.`;
    } else if (created.length > 1 && analyzedByTempId.size > 0) {
      const tally = new Map<WardrobeCategoryId, number>();
      for (const item of created) {
        tally.set(item.category, (tally.get(item.category) ?? 0) + 1);
      }
      const breakdown = Array.from(tally.entries())
        .map(([cat, count]) => `${count} in ${getCategoryLabel(cat, gender)}`)
        .join(', ');
      notice = `Analyzed & categorized ${created.length} items: ${breakdown}.`;
    }

    return { uploadedItems: created, notice };
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
    if (isLoadingStarterRef.current) return;
    isLoadingStarterRef.current = true;
    setComposeError(null);
    const starterSpecs: Array<{
      label: string;
      category: WardrobeCategoryId;
      imageUrl: string;
    }> =
      gender === 'male'
        ? [
            {
              label: 'Rust Houndstooth Wool Blazer',
              category: 'outerwear',
              imageUrl: SAMPLE_WARDROBE[2].imageUrl,
            },
            {
              label: 'Botanical Jacquard Statement',
              category: 'tops',
              imageUrl: SAMPLE_WARDROBE[0].imageUrl,
            },
          ]
        : [
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

    const batchStamp = Date.now();
    const added: WardrobeItem[] = [];
    try {
      for (let i = 0; i < starterSpecs.length; i++) {
        const spec = starterSpecs[i];
        try {
          const pair = await prepareWardrobeImagePairFromUrl(spec.imageUrl);
          const item: WardrobeItem = {
            id: `starter-${batchStamp}-${Math.random().toString(36).slice(2, 7)}-${i}`,
            gender: 'unisex',
            category: spec.category,
            label: spec.label,
            imageUrl: pair.imageUrl,
            syncThumbnailUrl: pair.syncThumbnailUrl,
            colorName: 'Curated',
            colorHex: pair.colorHex,
            createdAt: new Date(batchStamp + i).toISOString(),
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
        setClosetItems((prev) => mergeUniqueWardrobeItems(added, prev));
      }
    } finally {
      isLoadingStarterRef.current = false;
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
      const payloadItems = closetItems.slice(0, 20).map((item) => ({
        id: item.id,
        category: item.category,
        label: item.label,
        imageDataUrl: item.syncThumbnailUrl || item.imageUrl,
      }));

      const previousCombinations = outfits.map(
        (existing) =>
          `${existing.title} (${existing.pieces.map((p) => `${p.wardrobeItemId ?? ''}:${p.name}`).join(', ')})`,
      );

      const result = await composeClosetOutfitsApi({
        gender,
        season,
        aesthetic,
        anchorItemId: anchorItemId ?? undefined,
        variationSeed: Date.now(),
        previousCombinations: previousCombinations.length > 0 ? previousCombinations : undefined,
        items: payloadItems,
      });

      const batchStamp = Date.now();
      const hydratedOutfits: OutfitOption[] = result.outfits.slice(0, 2).map((item, idx) => {
        const occasion: OccasionType =
          item.occasion === 'Business' || item.occasion === 'Night Out' || item.occasion === 'Casual'
            ? item.occasion
            : idx === 1
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

      setActivePage('closet');
      window.setTimeout(() => {
        document.getElementById('outfit-looks')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 90);
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
      entry.outfits.slice(0, 2).map((o) => ({
        ...o,
        pieces: resolveOutfitPiecesWithCloset(o.pieces, closetItems),
      })),
    );
    setActivePage('closet');
    window.setTimeout(() => {
      document.getElementById('outfit-looks')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 90);
  };

  if (!user) {
    return (
      <AuthGateView
        authLoading={authLoading}
        authError={authError}
        onClearAuthError={clearAuthError}
        onSignInWithGoogle={() => void signInWithGoogle()}
      />
    );
  }

  const firstName =
    user.displayName?.split(' ')[0] || user.email?.split('@')[0] || 'there';

  if (!genderConfirmed) {
    return (
      <GenderOnboardingView
        userName={firstName}
        previousGender={savedServerGender}
        onSelectGender={handleSelectLoginGender}
        onSignOut={() => void handleSignOutClick()}
      />
    );
  }

  return (
    <div className="min-h-screen atelier-surface text-[#191816] flex flex-col">
      <Header
        savedCount={savedLooks.length}
        closetCount={closetItems.length}
        activePage={activePage}
        gender={gender}
        user={user}
        onSignOut={() => void handleSignOutClick()}
        onTriggerUpload={() => {
          navigateToPage('closet');
          window.setTimeout(() => {
            document.getElementById('closet-multi-file-input')?.click();
          }, 60);
        }}
        onNavigatePage={navigateToPage}
      />

      {authError && (
        <div
          role="alert"
          className="bg-[#FAF2F4] border-b border-[#E7C8D0] px-4 sm:px-6 py-2.5 text-xs text-[#8E1B35] flex items-center justify-between gap-4 max-w-[1240px] w-full mx-auto"
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
        {activePage === 'closet' && (
          <>
            <ClosetStudio
              gender={gender}
              season={season}
              aesthetic={aesthetic}
              closetItems={closetItems}
              anchorItemId={anchorItemId}
              hasOutfits={outfits.length > 0}
              isComposing={isComposing}
              composeError={composeError}
              onSeasonChange={(nextSeason) => {
                setSeason(nextSeason);
                void persistUserPrefs(gender, nextSeason, aesthetic);
              }}
              onAestheticChange={(nextAesthetic) => {
                setAesthetic(nextAesthetic);
                void persistUserPrefs(gender, season, nextAesthetic);
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
          </>
        )}

        {activePage === 'mix' && (
          <MixMatchStudio
            gender={gender}
            closetItems={closetItems}
            onSaveCustomLook={handleSaveCustomLook}
          />
        )}

        {activePage === 'saved' && (
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
        )}

        {activePage === 'profile' && (
          <ProfilePage
            closetCount={closetItems.length}
            savedCount={savedLooks.length}
            analysisCount={recentAnalyses.length}
            onNavigatePage={navigateToPage}
            onExportData={handleExportProfileData}
            onClearCloset={handleClearAllCloset}
            onSignOut={handleSignOutClick}
            onDeleteAccount={handleDeleteAccount}
          />
        )}
      </main>

      <footer className="border-t border-[#E5E0D8] bg-white/95 backdrop-blur-sm">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 text-center sm:text-left text-xs text-[#5E5A54]">
          <span className="font-display text-base font-semibold text-[#191816]">
            OutfitVault
          </span>
          <span>
            Personal Wardrobe Vault &middot; Real-Photo Outfit Composer &amp; Lookbook Studio
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
    </div>
  );
}
