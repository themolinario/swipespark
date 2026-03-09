import { PhotoAsset, mediaLibraryService } from "@/services/media-library.service";
import { DuplicateGroup, findDuplicatesByHash } from "@/utils/duplicate-detection";
import { DuplicateDetectorModule } from "@/modules/duplicate-detector";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { usePhotoStore } from "./photo-store";

interface DuplicateStore {
    hashedAssets: Record<string, string>;
    duplicateGroups: DuplicateGroup[];
    isScanning: boolean;
    progress: number;
    scanStatusText: string;

    startScan: () => Promise<void>;
    removeDuplicatesLocally: (ids: string[]) => void;
}

function isLegacyHash(hash: string): boolean {
    return hash.includes("x") || hash.startsWith("UNIQUE_") || hash.includes("_VISUAL_");
}

export const useDuplicateStore = create<DuplicateStore>()(
    persist(
        (set, get) => ({
            hashedAssets: {},
            duplicateGroups: [],
            isScanning: false,
            progress: 0,
            scanStatusText: "",

            removeDuplicatesLocally: (ids: string[]) => {
                set((state) => {
                    const newGroups: DuplicateGroup[] = [];
                    for (const group of state.duplicateGroups) {
                        const remainingPhotos = group.photos.filter((p) => !ids.includes(p.id));
                        if (remainingPhotos.length > 1) {
                            newGroups.push({ ...group, photos: remainingPhotos });
                        }
                    }
                    return { duplicateGroups: newGroups };
                });
            },

            startScan: async () => {
                const state = get();
                if (state.isScanning) return;

                const permissionStatus = await mediaLibraryService.getPermissionStatus();
                if (permissionStatus !== "granted") return;

                const existingHashes = state.hashedAssets;
                const hasLegacy = Object.values(existingHashes).some(isLegacyHash);
                if (hasLegacy) {
                    set({ hashedAssets: {} });
                }

                set({ isScanning: true, progress: 0, scanStatusText: "Starting scanner..." });

                try {
                    let cursor: string | undefined = undefined;
                    let hasNext = true;
                    let totalCount = 1;
                    let allAvailableAssets: PhotoAsset[] = [];

                    while (hasNext) {
                        const result = await mediaLibraryService.fetchPhotos(500, cursor);
                        const filteredAssets = result.assets.filter(
                            (p) => !usePhotoStore.getState().isPhotoMarkedForDeletion(p.id)
                        );

                        allAvailableAssets = [...allAvailableAssets, ...filteredAssets];
                        cursor = result.endCursor;
                        hasNext = result.hasNextPage;
                        totalCount = result.totalCount || 1;

                        set({
                            progress: (allAvailableAssets.length / totalCount) * 0.3,
                            scanStatusText: `Reading library: ${allAvailableAssets.length} photos...`
                        });
                        await new Promise(resolve => setTimeout(resolve, 0));
                    }
                    console.log(`[DuplicateStore] Fetched ${allAvailableAssets.length} total assets.`);

                    const potentialDuplicateGroups = new Map<string, PhotoAsset[]>();
                    for (const photo of allAvailableAssets) {
                        const dimKey = `${photo.width}x${photo.height}`;
                        if (!potentialDuplicateGroups.has(dimKey)) {
                            potentialDuplicateGroups.set(dimKey, []);
                        }
                        potentialDuplicateGroups.get(dimKey)!.push(photo);
                    }

                    const photosToHash: PhotoAsset[] = [];
                    for (const group of potentialDuplicateGroups.values()) {
                        if (group.length > 1) {
                            for (const p of group) {
                                photosToHash.push(p);
                            }
                        }
                    }

                    console.log(`[DuplicateStore] Found ${photosToHash.length} potential duplicate candidates by dimension.`);

                    if (photosToHash.length === 0) {
                        set({ duplicateGroups: [], hashedAssets: {}, progress: 1, isScanning: false, scanStatusText: "Complete" });
                        return;
                    }

                    const cachedHashes = get().hashedAssets;
                    const idsToHash = photosToHash
                        .filter((p) => !cachedHashes[p.id])
                        .map((p) => p.id);

                    console.log(`[DuplicateStore] ${idsToHash.length} assets need native hashing (${photosToHash.length - idsToHash.length} cached).`);

                    set({ progress: 0.3, scanStatusText: `Hashing ${idsToHash.length} photos natively...` });

                    let currentHashes = { ...cachedHashes };

                    if (idsToHash.length > 0) {
                        const progressSubscription = DuplicateDetectorModule.addListener(
                            "onProgress",
                            (event) => {
                                const hashProgress = event.completed / event.total;
                                set({
                                    progress: 0.3 + hashProgress * 0.6,
                                    scanStatusText: `Hashing: ${event.completed} of ${event.total} photos...`
                                });
                            }
                        );

                        try {
                            const nativeHashes = await DuplicateDetectorModule.computeHashes(idsToHash);
                            currentHashes = { ...currentHashes, ...nativeHashes };
                        } finally {
                            progressSubscription.remove();
                        }
                    }

                    set({
                        progress: 0.9,
                        scanStatusText: "Grouping duplicates...",
                        hashedAssets: currentHashes
                    });

                    console.log(`[DuplicateStore] Native hashing complete. Grouping matches...`);

                    const duplicates = findDuplicatesByHash(photosToHash, currentHashes);
                    set({ duplicateGroups: duplicates, progress: 1, isScanning: false, scanStatusText: "Complete" });

                } catch (error) {
                    console.error("Failed to scan for duplicates:", error);
                    set({ isScanning: false, progress: 1, scanStatusText: "Error occurred" });
                }
            }
        }),
        {
            name: "duplicate-storage",
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                hashedAssets: state.hashedAssets,
            }),
        }
    )
);
