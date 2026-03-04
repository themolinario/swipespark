import { PhotoAsset } from "@/services/media-library.service";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface PhotoStore {
  keptPhotos: PhotoAsset[];

  deletionPhotos: PhotoAsset[];

  addKeptPhoto: (photo: PhotoAsset) => void;
  removeKeptPhoto: (id: string) => void;
  clearKeptPhotos: () => void;

  addDeletionPhoto: (photo: PhotoAsset) => void;
  removeDeletionPhoto: (id: string) => void;
  clearDeletionPhotos: () => void;

  isPhotoKept: (id: string) => boolean;
  isPhotoMarkedForDeletion: (id: string) => boolean;

  removePhotosPermanently: (ids: string[]) => void;

  restoredPhotos: PhotoAsset[];
  consumeRestoredPhotos: () => PhotoAsset[];
}

export const usePhotoStore = create<PhotoStore>()(
  persist(
    (set, get) => ({
      keptPhotos: [],
      deletionPhotos: [],
      restoredPhotos: [],

      addKeptPhoto: (photo) =>
        set((state) => {
          if (state.keptPhotos.some((p) => p.id === photo.id)) {
            return state;
          }
          return { keptPhotos: [...state.keptPhotos, photo] };
        }),

      removeKeptPhoto: (id) =>
        set((state) => {
          const photo = state.keptPhotos.find((p) => p.id === id);
          return {
            keptPhotos: state.keptPhotos.filter((p) => p.id !== id),
            restoredPhotos: photo
              ? [photo, ...state.restoredPhotos]
              : state.restoredPhotos,
          };
        }),

      clearKeptPhotos: () => set({ keptPhotos: [] }),

      addDeletionPhoto: (photo) =>
        set((state) => {
          if (state.deletionPhotos.some((p) => p.id === photo.id)) {
            return state;
          }
          return { deletionPhotos: [...state.deletionPhotos, photo] };
        }),

      removeDeletionPhoto: (id) =>
        set((state) => {
          const photo = state.deletionPhotos.find((p) => p.id === id);
          return {
            deletionPhotos: state.deletionPhotos.filter((p) => p.id !== id),
            restoredPhotos: photo
              ? [photo, ...state.restoredPhotos]
              : state.restoredPhotos,
          };
        }),

      clearDeletionPhotos: () => set({ deletionPhotos: [] }),

      removePhotosPermanently: (ids) =>
        set((state) => ({
          keptPhotos: state.keptPhotos.filter((p) => !ids.includes(p.id)),
          deletionPhotos: state.deletionPhotos.filter((p) => !ids.includes(p.id)),
        })),

      consumeRestoredPhotos: () => {
        const restored = get().restoredPhotos;
        set({ restoredPhotos: [] });
        return restored;
      },

      isPhotoKept: (id) => get().keptPhotos.some((p) => p.id === id),

      isPhotoMarkedForDeletion: (id) =>
        get().deletionPhotos.some((p) => p.id === id),
    }),
    {
      name: "photo-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        keptPhotos: state.keptPhotos,
        deletionPhotos: state.deletionPhotos,
      }),
    }
  )
);
