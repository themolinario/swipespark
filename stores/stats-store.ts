import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface StatsStore {
  totalPhotosDeleted: number;
  totalBytesFreed: number;
  recordDeletion: (count: number, bytes: number) => void;
}

export const useStatsStore = create<StatsStore>()(
  persist(
    (set, get) => ({
      totalPhotosDeleted: 0,
      totalBytesFreed: 0,

      recordDeletion: (count, bytes) => {
        const newTotal = get().totalPhotosDeleted + count;
        const newBytes = get().totalBytesFreed + bytes;
        set({ totalPhotosDeleted: newTotal, totalBytesFreed: newBytes });
        const { useAchievementStore } = require("@/stores/achievement-store");
        useAchievementStore.getState().checkDeletionAchievements(newTotal, newBytes);
      },
    }),
    {
      name: "stats-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
