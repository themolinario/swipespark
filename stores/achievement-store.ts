import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type AchievementId =
  | "first_delete"
  | "clean_100"
  | "clean_500"
  | "clean_1000"
  | "space_100mb"
  | "space_1gb"
  | "space_5gb"
  | "duplicate_hunter_10"
  | "duplicate_hunter_50"
  | "all_reviewed"
  | "smart_cleaner"
  | "category_master";

export interface AchievementDef {
  id: AchievementId;
  icon: string;
  color: string;
  tier?: "bronze" | "silver" | "gold";
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first_delete", icon: "Trash2", color: "#4ade80" },
  { id: "clean_100", icon: "Flame", color: "#cd7f32", tier: "bronze" },
  { id: "clean_500", icon: "Flame", color: "#c0c0c0", tier: "silver" },
  { id: "clean_1000", icon: "Flame", color: "#ffd700", tier: "gold" },
  { id: "space_100mb", icon: "HardDrive", color: "#cd7f32", tier: "bronze" },
  { id: "space_1gb", icon: "HardDrive", color: "#c0c0c0", tier: "silver" },
  { id: "space_5gb", icon: "HardDrive", color: "#ffd700", tier: "gold" },
  { id: "duplicate_hunter_10", icon: "Copy", color: "#cd7f32", tier: "bronze" },
  { id: "duplicate_hunter_50", icon: "Copy", color: "#ffd700", tier: "gold" },
  { id: "all_reviewed", icon: "CheckCircle", color: "#4da6ff" },
  { id: "smart_cleaner", icon: "Sparkles", color: "#a855f7" },
  { id: "category_master", icon: "Crown", color: "#ffd700" },
];

interface UnlockedAchievement {
  id: AchievementId;
  unlockedAt: number;
}

interface AchievementStore {
  unlocked: Record<AchievementId, UnlockedAchievement | undefined>;
  duplicatesRemoved: number;
  smartCleanCategories: string[];
  toastQueue: AchievementId[];

  isUnlocked: (id: AchievementId) => boolean;
  tryUnlock: (id: AchievementId) => boolean;
  consumeToast: () => AchievementId | undefined;
  checkDeletionAchievements: (totalDeleted: number, totalBytes: number) => void;
  recordDuplicatesRemoved: (count: number) => void;
  recordSmartCleanCategory: (category: string) => void;
  recordAllReviewed: () => void;
}

export const useAchievementStore = create<AchievementStore>()(
  persist(
    (set, get) => ({
      unlocked: {} as Record<AchievementId, UnlockedAchievement | undefined>,
      duplicatesRemoved: 0,
      smartCleanCategories: [],
      toastQueue: [],

      isUnlocked: (id) => !!get().unlocked[id],

      tryUnlock: (id) => {
        if (get().unlocked[id]) return false;
        set((state) => ({
          unlocked: {
            ...state.unlocked,
            [id]: { id, unlockedAt: Date.now() },
          },
          toastQueue: [...state.toastQueue, id],
        }));
        return true;
      },

      consumeToast: () => {
        const queue = get().toastQueue;
        if (queue.length === 0) return undefined;
        const [first, ...rest] = queue;
        set({ toastQueue: rest });
        return first;
      },

      checkDeletionAchievements: (totalDeleted, totalBytes) => {
        const { tryUnlock } = get();
        if (totalDeleted >= 1) tryUnlock("first_delete");
        if (totalDeleted >= 100) tryUnlock("clean_100");
        if (totalDeleted >= 500) tryUnlock("clean_500");
        if (totalDeleted >= 1000) tryUnlock("clean_1000");

        const MB = 1024 * 1024;
        const GB = 1024 * MB;
        if (totalBytes >= 100 * MB) tryUnlock("space_100mb");
        if (totalBytes >= GB) tryUnlock("space_1gb");
        if (totalBytes >= 5 * GB) tryUnlock("space_5gb");
      },

      recordDuplicatesRemoved: (count) => {
        const newTotal = get().duplicatesRemoved + count;
        set({ duplicatesRemoved: newTotal });
        const { tryUnlock } = get();
        if (newTotal >= 10) tryUnlock("duplicate_hunter_10");
        if (newTotal >= 50) tryUnlock("duplicate_hunter_50");
      },

      recordSmartCleanCategory: (category) => {
        const current = get().smartCleanCategories;
        if (current.includes(category)) return;
        const updated = [...current, category];
        set({ smartCleanCategories: updated });
        get().tryUnlock("smart_cleaner");
        const allCategories = ["People", "Landscapes", "Documents", "Animals", "Food", "Vehicles", "Interiors"];
        if (allCategories.every((c) => updated.includes(c))) {
          get().tryUnlock("category_master");
        }
      },

      recordAllReviewed: () => {
        get().tryUnlock("all_reviewed");
      },
    }),
    {
      name: "achievement-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        unlocked: state.unlocked,
        duplicatesRemoved: state.duplicatesRemoved,
        smartCleanCategories: state.smartCleanCategories,
      }),
    }
  )
);
