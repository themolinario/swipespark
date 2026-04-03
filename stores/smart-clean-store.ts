import * as MediaLibrary from "expo-media-library";
import { create } from "zustand";
import { SmartCategory } from "@/utils/category-mapper";

interface SmartCleanStore {
    isSearchRunning: boolean;
    searchProgress: number;
    searchStatusText: string;
    matchedPhotos: MediaLibrary.Asset[];
    scanComplete: boolean;
    selectedCategory: SmartCategory | null;
    customQuery: string;

    setSearchRunning: (running: boolean) => void;
    setProgress: (progress: number, statusText: string) => void;
    addMatchedPhotos: (photos: MediaLibrary.Asset[]) => void;
    completeSearch: () => void;
    stopSearch: () => void;
    resetSearch: () => void;
    setSelectedCategory: (category: SmartCategory | null) => void;
    setCustomQuery: (query: string) => void;
}

export const useSmartCleanStore = create<SmartCleanStore>()((set) => ({
    isSearchRunning: false,
    searchProgress: 0,
    searchStatusText: "",
    matchedPhotos: [],
    scanComplete: false,
    selectedCategory: null,
    customQuery: "",

    setSearchRunning: (running) => set({ isSearchRunning: running }),

    setProgress: (progress, statusText) =>
        set({ searchProgress: progress, searchStatusText: statusText }),

    addMatchedPhotos: (photos) =>
        set((state) => ({ matchedPhotos: [...state.matchedPhotos, ...photos] })),

    completeSearch: () =>
        set({ scanComplete: true, searchProgress: 100, isSearchRunning: false }),

    stopSearch: () => set({ isSearchRunning: false }),

    resetSearch: () =>
        set({
            isSearchRunning: false,
            searchProgress: 0,
            searchStatusText: "",
            matchedPhotos: [],
            scanComplete: false,
        }),

    setSelectedCategory: (category) => set({ selectedCategory: category }),

    setCustomQuery: (query) => set({ customQuery: query }),
}));
