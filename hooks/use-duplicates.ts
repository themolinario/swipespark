import { getAssetsSize, getAssetsSizeByIds } from "@/modules/image-classifier";
import { mediaLibraryService } from "@/services/media-library.service";
import { useDuplicateStore } from "@/stores/duplicate-store";
import { usePhotoStore } from "@/stores/photo-store";
import { useStatsStore } from "@/stores/stats-store";
import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";

export function useDuplicates() {
    const duplicateGroups = useDuplicateStore((s) => s.duplicateGroups);
    const isScanning = useDuplicateStore((s) => s.isScanning);
    const progress = useDuplicateStore((s) => s.progress);
    const scanStatusText = useDuplicateStore((s) => s.scanStatusText);
    const startScan = useDuplicateStore((s) => s.startScan);
    const hasScannedOnce = useDuplicateStore((s) => s.hasScannedOnce);

    const [hasPermission, setHasPermission] = useState<boolean | null>(null);

    useEffect(() => {
        mediaLibraryService.getPermissionStatus().then((status) => {
            setHasPermission(status === "granted");
        });
    }, []);

    const scanDuplicates = useCallback(async (forceRefresh = false) => {
        const permissionStatus = await mediaLibraryService.getPermissionStatus();
        if (permissionStatus !== "granted") {
            const granted = await mediaLibraryService.requestPermission();
            setHasPermission(granted);
            if (!granted) {
                return;
            }
        } else {
            setHasPermission(true);
        }

        startScan(forceRefresh);
    }, [startScan]);

    const deleteDuplicates = useCallback(async (photoIds: string[], photoUris?: string[]): Promise<{ success: boolean; freedBytes: number }> => {
        if (photoIds.length === 0) return { success: true, freedBytes: 0 };

        try {
            let freedBytes = 0;
            try {
                freedBytes = await getAssetsSizeByIds(photoIds);
                if (freedBytes <= 0 && photoUris) {
                    freedBytes = await getAssetsSize(photoUris);
                }
            } catch {
            }

            const success = await mediaLibraryService.deleteAssets(photoIds);
            if (success) {
                useDuplicateStore.getState().removeDuplicatesLocally(photoIds);
                usePhotoStore.getState().removePhotosPermanently(photoIds);
                usePhotoStore.getState().bumpDeletionVersion();
                useStatsStore.getState().recordDeletion(photoIds.length, freedBytes);
                const { useAchievementStore } = require("@/stores/achievement-store");
                useAchievementStore.getState().recordDuplicatesRemoved(photoIds.length);
            }
            return { success, freedBytes };
        } catch (error) {
            console.error("Failed to delete duplicate photos:", error);
            return { success: false, freedBytes: 0 };
        }
    }, []);

    return {
        duplicateGroups,
        isScanning,
        progress,
        scanStatusText,
        hasPermission,
        hasScannedOnce,
        scanDuplicates,
        deleteDuplicates,
    };
}
