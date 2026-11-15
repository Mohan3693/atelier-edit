import type { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import type { ColorPaletteCategory, ItemAnalysis, SavedLook } from '../types/stylist';
import { db } from './firebase';
import { handleFirestoreError, OperationType } from './firestoreErrors';

export interface UserStylePreferences {
  preferredSeason: 'All-Season' | 'Spring / Summer' | 'Autumn / Winter';
  preferredAesthetic: string;
  preferredVoice: 'Zephyr' | 'Kore' | 'Puck' | 'Charon' | 'Fenrir';
}

export interface FirestoreSavedLookSummary {
  id: string;
  uid: string;
  anchorItemName: string;
  anchorImageRef: string;
  occasion: 'Casual' | 'Business' | 'Night Out';
  title: string;
  moodSummary: string;
  colorHarmonyNote: string;
  colorPaletteCategory: ColorPaletteCategory;
  piecesSummary: string;
  paletteHexes: string[];
}

export function sanitizeFirestoreId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
  return cleaned || `item-${Date.now()}`;
}

function clampString(value: string | undefined | null, maxLength: number, fallback = ''): string {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, maxLength);
}

export function toSafeImageRef(imageUrl: string | undefined | null): string {
  if (!imageUrl) return '';
  if (imageUrl.startsWith('data:')) return 'uploaded-garment';
  return clampString(imageUrl, 500, '');
}

function normalizePaletteCategory(cat: unknown): ColorPaletteCategory {
  if (
    cat === 'Monochromatic' ||
    cat === 'Complementary' ||
    cat === 'Neutral Tones' ||
    cat === 'Analogous'
  ) {
    return cat;
  }
  return 'Neutral Tones';
}

export async function syncUserProfileToFirestore(user: User): Promise<void> {
  if (!user.emailVerified) return;
  const path = `users/${user.uid}/private/profile`;
  const ref = doc(db, 'users', user.uid, 'private', 'profile');
  const email = clampString(user.email, 320, 'user@example.com');
  const displayName = clampString(user.displayName, 120, '');

  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, {
        email,
        displayName,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        uid: user.uid,
        email,
        displayName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function loadUserPreferencesFromFirestore(
  uid: string,
): Promise<UserStylePreferences | null> {
  const path = `users/${uid}/preferences/default`;
  const ref = doc(db, 'users', uid, 'preferences', 'default');
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      preferredSeason:
        data.preferredSeason === 'Spring / Summer' || data.preferredSeason === 'Autumn / Winter'
          ? data.preferredSeason
          : 'All-Season',
      preferredAesthetic: clampString(data.preferredAesthetic, 64, 'Modern Editorial'),
      preferredVoice:
        data.preferredVoice === 'Kore' ||
        data.preferredVoice === 'Puck' ||
        data.preferredVoice === 'Charon' ||
        data.preferredVoice === 'Fenrir'
          ? data.preferredVoice
          : 'Zephyr',
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveUserPreferencesToFirestore(
  uid: string,
  prefs: UserStylePreferences,
): Promise<void> {
  const path = `users/${uid}/preferences/default`;
  const ref = doc(db, 'users', uid, 'preferences', 'default');
  const payload = {
    preferredSeason:
      prefs.preferredSeason === 'Spring / Summer' || prefs.preferredSeason === 'Autumn / Winter'
        ? prefs.preferredSeason
        : 'All-Season',
    preferredAesthetic: clampString(prefs.preferredAesthetic, 64, 'Modern Editorial'),
    preferredVoice:
      prefs.preferredVoice === 'Kore' ||
      prefs.preferredVoice === 'Puck' ||
      prefs.preferredVoice === 'Charon' ||
      prefs.preferredVoice === 'Fenrir'
        ? prefs.preferredVoice
        : 'Zephyr',
  };

  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, {
        ...payload,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        uid,
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function upsertSavedLookInFirestore(
  uid: string,
  look: SavedLook,
): Promise<void> {
  const safeId = sanitizeFirestoreId(look.id);
  const path = `users/${uid}/savedLooks/${safeId}`;
  const ref = doc(db, 'users', uid, 'savedLooks', safeId);

  const piecesSummary = clampString(
    look.outfit.pieces
      .map((p) => `${p.slot}: ${p.name} (${p.colorName})`)
      .join(' | '),
    1600,
    look.outfit.title,
  );
  const paletteHexes = look.palette
    .map((sw) => clampString(sw.hex, 16))
    .filter((hex) => hex.length >= 4)
    .slice(0, 6);

  const fields = {
    anchorItemName: clampString(look.anchorItemName, 140, 'Anchor Piece'),
    anchorImageRef: toSafeImageRef(look.anchorImageUrl),
    occasion:
      look.outfit.occasion === 'Business' || look.outfit.occasion === 'Night Out'
        ? look.outfit.occasion
        : 'Casual',
    title: clampString(look.outfit.title, 140, 'Styled Outfit'),
    moodSummary: clampString(look.outfit.moodSummary, 400, 'Curated lookbook pairing.'),
    colorHarmonyNote: clampString(
      look.outfit.colorHarmonyNote,
      500,
      'Harmonized with the anchor garment palette.',
    ),
    colorPaletteCategory: normalizePaletteCategory(look.outfit.colorPaletteCategory),
    piecesSummary,
    paletteHexes,
  };

  try {
    const existingSnap = await getDoc(ref);
    if (existingSnap.exists()) {
      await updateDoc(ref, {
        ...fields,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        id: safeId,
        uid,
        ...fields,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteSavedLookInFirestore(
  uid: string,
  lookId: string,
): Promise<void> {
  const safeId = sanitizeFirestoreId(lookId);
  const path = `users/${uid}/savedLooks/${safeId}`;
  const ref = doc(db, 'users', uid, 'savedLooks', safeId);
  try {
    await deleteDoc(ref);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeSavedLooksInFirestore(
  uid: string,
  onData: (items: FirestoreSavedLookSummary[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const path = `users/${uid}/savedLooks`;
  const q = query(collection(db, 'users', uid, 'savedLooks'), where('uid', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: FirestoreSavedLookSummary[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: String(d.id ?? docSnap.id),
          uid: String(d.uid ?? uid),
          anchorItemName: String(d.anchorItemName ?? ''),
          anchorImageRef: String(d.anchorImageRef ?? ''),
          occasion:
            d.occasion === 'Business' || d.occasion === 'Night Out'
              ? d.occasion
              : 'Casual',
          title: String(d.title ?? ''),
          moodSummary: String(d.moodSummary ?? ''),
          colorHarmonyNote: String(d.colorHarmonyNote ?? ''),
          colorPaletteCategory: normalizePaletteCategory(d.colorPaletteCategory),
          piecesSummary: String(d.piecesSummary ?? ''),
          paletteHexes: Array.isArray(d.paletteHexes)
            ? d.paletteHexes.filter((x): x is string => typeof x === 'string')
            : [],
        };
      });
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) {
          onError(wrapped);
        }
      }
    },
  );
}

export async function recordAnalysisInFirestore(
  uid: string,
  analysisId: string,
  analysis: ItemAnalysis,
  season: string,
  aesthetic: string,
): Promise<void> {
  const safeId = sanitizeFirestoreId(analysisId);
  const path = `users/${uid}/analyses/${safeId}`;
  const ref = doc(db, 'users', uid, 'analyses', safeId);

  try {
    await setDoc(ref, {
      id: safeId,
      uid,
      itemName: clampString(analysis.itemName, 140, 'Garment Piece'),
      category: clampString(analysis.category, 80, 'Apparel'),
      season: clampString(season, 64, 'All-Season'),
      aesthetic: clampString(aesthetic, 64, 'Modern Editorial'),
      stylePersonality: clampString(analysis.stylePersonality, 120, 'Editorial'),
      stylingStrategy: clampString(analysis.stylingStrategy, 600, 'Balanced styling'),
      paletteHexes: analysis.palette
        .map((s) => clampString(s.hex, 16))
        .filter((h) => h.length >= 4)
        .slice(0, 6),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}
