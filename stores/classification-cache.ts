import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface CachedLabel {
    identifier: string;
    confidence: number;
}

interface CachedClassification {
    labels: CachedLabel[];
    timestamp: number;
}

interface ClassificationCacheStore {
    cache: Record<string, CachedClassification>;

    getCachedLabels: (assetId: string) => CachedLabel[] | null;
    setCachedLabels: (assetId: string, labels: CachedLabel[]) => void;
    setCachedLabelsBatch: (entries: { assetId: string; labels: CachedLabel[] }[]) => void;
    clearExpired: () => void;
    clearAll: () => void;
}

// Cache entries older than 30 days are considered expired
const CACHE_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

export const useClassificationCache = create<ClassificationCacheStore>()(
    persist(
        (set, get) => ({
            cache: {},

            getCachedLabels: (assetId: string) => {
                const entry = get().cache[assetId];
                if (!entry) return null;

                // Check expiry
                if (Date.now() - entry.timestamp > CACHE_EXPIRY_MS) {
                    return null;
                }

                return entry.labels;
            },

            setCachedLabels: (assetId: string, labels: CachedLabel[]) => {
                set((state) => ({
                    cache: {
                        ...state.cache,
                        [assetId]: { labels, timestamp: Date.now() },
                    },
                }));
            },

            setCachedLabelsBatch: (entries: { assetId: string; labels: CachedLabel[] }[]) => {
                set((state) => {
                    const newCache = { ...state.cache };
                    const now = Date.now();
                    for (const entry of entries) {
                        newCache[entry.assetId] = { labels: entry.labels, timestamp: now };
                    }
                    return { cache: newCache };
                });
            },

            clearExpired: () => {
                set((state) => {
                    const now = Date.now();
                    const newCache: Record<string, CachedClassification> = {};
                    for (const [key, value] of Object.entries(state.cache)) {
                        if (now - value.timestamp < CACHE_EXPIRY_MS) {
                            newCache[key] = value;
                        }
                    }
                    return { cache: newCache };
                });
            },

            clearAll: () => {
                set({ cache: {} });
            },
        }),
        {
            name: "classification-cache-storage",
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);

