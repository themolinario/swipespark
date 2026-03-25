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
    (set) => ({
      totalPhotosDeleted: 0,
      totalBytesFreed: 0,

      recordDeletion: (count, bytes) =>
        set((state) => ({
          totalPhotosDeleted: state.totalPhotosDeleted + count,
          totalBytesFreed: state.totalBytesFreed + bytes,
        })),
    }),
    {
      name: "stats-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
