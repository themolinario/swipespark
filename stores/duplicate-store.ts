import { PhotoAsset, mediaLibraryService } from "@/services/media-library.service";
import { DuplicateGroup, findDuplicatesByHash } from "@/utils/duplicate-detection";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import * as MediaLibrary from "expo-media-library";
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

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Timeout')), ms);
        promise.then(value => {
            clearTimeout(timer);
            resolve(value);
        }).catch(err => {
            clearTimeout(timer);
            reject(err);
        });
    });
};

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

                set({ isScanning: true, progress: 0, scanStatusText: "Starting scanner..." });

                try {
                    let cursor: string | undefined = undefined;
                    let hasNext = true;
                    let scannedCount = 0;
                    let totalCount = 1;
                    let allAvailableAssets: PhotoAsset[] = [];

                    // 1. Fetch all assets from MediaLibrary (represents 0% to 50% of progress)
                    while (hasNext) {
                        const result = await mediaLibraryService.fetchPhotos(500, cursor);
                        const filteredAssets = result.assets.filter(
                            (p) => !usePhotoStore.getState().isPhotoMarkedForDeletion(p.id)
                        );

                        allAvailableAssets = [...allAvailableAssets, ...filteredAssets];
                        cursor = result.endCursor;
                        hasNext = result.hasNextPage;
                        totalCount = result.totalCount || 1;

                        // Fetching is the first 50%
                        set({
                            progress: (allAvailableAssets.length / totalCount) * 0.5,
                            scanStatusText: `Reading library: ${allAvailableAssets.length} photos...`
                        });
                        // Give a tiny tick back to JS thread for UI redraw
                        await new Promise(resolve => setTimeout(resolve, 0));
                    }
                    console.log(`[DuplicateStore] Fetched ${allAvailableAssets.length} total assets.`);

                    // 2. Pre-filter by exact dimensions so we ONLY hash photos that MIGHT be duplicates
                    const potentialDuplicateGroups = new Map<string, PhotoAsset[]>();
                    for (const photo of allAvailableAssets) {
                        const dimKey = `${photo.width}x${photo.height}`;
                        if (!potentialDuplicateGroups.has(dimKey)) {
                            potentialDuplicateGroups.set(dimKey, []);
                        }
                        potentialDuplicateGroups.get(dimKey)!.push(photo);
                    }

                    // Flatten only the photos that share dimensions with at least one other photo
                    // DO NOT use push(...group) as it causes a stack overflow on libraries with 20,000 items
                    const photosToHash: PhotoAsset[] = [];
                    for (const group of potentialDuplicateGroups.values()) {
                        if (group.length > 1) {
                            for (const p of group) {
                                photosToHash.push(p);
                            }
                        }
                    }

                    console.log(`[DuplicateStore] Found ${photosToHash.length} potential duplicate candidates by dimension.`);
                    const currentHashes = { ...get().hashedAssets };

                    if (photosToHash.length === 0) {
                        set({ duplicateGroups: [], progress: 1, isScanning: false, scanStatusText: "Complete" });
                        return;
                    }

                    // PHASE 1: OS file stat reads are instantaneous and take zero RAM. We can process 100 at a time safely.
                    const CONCURRENCY = 100;
                    for (let i = 0; i < photosToHash.length; i += CONCURRENCY) {
                        const batch = photosToHash.slice(i, i + CONCURRENCY);

                        await Promise.all(batch.map(async (photo) => {
                            if (!currentHashes[photo.id]) {
                                try {
                                    const info = await withTimeout(
                                        MediaLibrary.getAssetInfoAsync(photo.id, { shouldDownloadFromNetwork: false }),
                                        2000
                                    ) as MediaLibrary.AssetInfo;

                                    if (info && info.localUri) {
                                        const fileInfo = await FileSystem.getInfoAsync(info.localUri);
                                        if (fileInfo.exists && fileInfo.size) {
                                            // width + height + exact byte size = guaranteed perfect identical content
                                            currentHashes[photo.id] = `${photo.width}x${photo.height}_${fileInfo.size}`;
                                        } else {
                                            // Fallback to absolute unique ID to prevent false-positive matching
                                            currentHashes[photo.id] = `UNIQUE_${photo.id}`;
                                        }
                                    } else {
                                        // Network asset (iCloud) or inaccessible
                                        currentHashes[photo.id] = `UNIQUE_${photo.id}`;
                                    }
                                } catch (err) {
                                    // Complete fallback safety
                                    currentHashes[photo.id] = `UNIQUE_${photo.id}`;
                                }
                            }
                        }));

                        scannedCount += batch.length;

                        // Inform UI
                        if (i % (CONCURRENCY * 2) === 0 || scannedCount === photosToHash.length) {
                            // Fetch took 50%, Phase 1 takes 40%
                            const hashProgress = scannedCount / photosToHash.length;
                            set({
                                progress: 0.5 + (hashProgress * 0.4),
                                scanStatusText: `Checking file sizes: ${scannedCount} of ${photosToHash.length}`,
                                hashedAssets: { ...currentHashes }
                            });
                            await new Promise(resolve => setTimeout(resolve, 5));
                        }
                    }

                    // PHASE 2: Resolve False Positives
                    // Because 25,000 photos might naturally share the exact same byte size by pure chance,
                    // we MUST run a visual hash (ImageManipulator) on any photos that collided in Phase 1.
                    const sizeGroups = new Map<string, PhotoAsset[]>();
                    for (const photo of photosToHash) {
                        const hash = currentHashes[photo.id];
                        if (hash.startsWith('UNIQUE_')) continue;
                        if (!sizeGroups.has(hash)) sizeGroups.set(hash, []);
                        sizeGroups.get(hash)!.push(photo);
                    }

                    const collisionsToDeepCheck: PhotoAsset[] = [];
                    for (const group of sizeGroups.values()) {
                        // Only check if multiple photos share the exact same byte size (collisions)
                        if (group.length > 1) {
                            collisionsToDeepCheck.push(...group);
                        }
                    }

                    console.log(`[DuplicateStore] Found ${collisionsToDeepCheck.length} photos requiring deep visual check.`);

                    if (collisionsToDeepCheck.length > 0) {
                        let deepScanCount = 0;
                        const DEEP_CONCURRENCY = 3;
                        set({ scanStatusText: `Verifying ${collisionsToDeepCheck.length} deep matches...` });

                        for (let i = 0; i < collisionsToDeepCheck.length; i += DEEP_CONCURRENCY) {
                            const batch = collisionsToDeepCheck.slice(i, i + DEEP_CONCURRENCY);

                            await Promise.all(batch.map(async (photo) => {
                                // If the hash does NOT include a visual component yet, compute it
                                if (!currentHashes[photo.id].includes('_VISUAL_')) {
                                    try {
                                        const manipResult = await withTimeout(
                                            ImageManipulator.manipulateAsync(
                                                photo.uri,
                                                [{ resize: { width: 16, height: 16 } }],
                                                { compress: 0, format: ImageManipulator.SaveFormat.JPEG, base64: true }
                                            ),
                                            3000
                                        );
                                        if (manipResult.base64) {
                                            // Append visual hash to the size hash
                                            currentHashes[photo.id] = `${currentHashes[photo.id]}_VISUAL_${manipResult.base64}`;
                                        } else {
                                            currentHashes[photo.id] = `UNIQUE_${photo.id}`;
                                        }
                                    } catch (err) {
                                        currentHashes[photo.id] = `UNIQUE_${photo.id}`;
                                    }
                                }
                            }));

                            deepScanCount += batch.length;
                            const deepProgress = deepScanCount / collisionsToDeepCheck.length;
                            set({
                                // Phase 2 takes the final 10%
                                progress: 0.9 + (deepProgress * 0.1),
                                scanStatusText: `Verifying ${deepScanCount} of ${collisionsToDeepCheck.length} deep matches...`
                            });
                            await new Promise(resolve => setTimeout(resolve, 5));
                        }
                    }

                    console.log(`[DuplicateStore] Two-Phase Hash processing complete. Grouping matches...`);

                    // 4. Compute the final duplicate groups using ONLY the relevant photos
                    // (findDuplicatesByHash will filter them correctly)
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
                hashedAssets: state.hashedAssets, // Only persist hashes
            }),
        }
    )
);
