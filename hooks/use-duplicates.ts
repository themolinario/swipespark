import { mediaLibraryService } from "@/services/media-library.service";
import { useDuplicateStore } from "@/stores/duplicate-store";
import { usePhotoStore } from "@/stores/photo-store";
import { useCallback, useEffect, useState } from "react";

export function useDuplicates() {
    const duplicateGroups = useDuplicateStore((s) => s.duplicateGroups);
    const isScanning = useDuplicateStore((s) => s.isScanning);
    const progress = useDuplicateStore((s) => s.progress);
    const scanStatusText = useDuplicateStore((s) => s.scanStatusText);
    const startScan = useDuplicateStore((s) => s.startScan);

    const [hasPermission, setHasPermission] = useState<boolean | null>(null);

    useEffect(() => {
        mediaLibraryService.getPermissionStatus().then((status) => {
            setHasPermission(status === "granted");
        });
    }, []);

    const scanDuplicates = useCallback(async () => {
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

        startScan();
    }, [startScan]);

    const deleteDuplicates = useCallback(async (photoIds: string[]) => {
        if (photoIds.length === 0) return true;

        try {
            const success = await mediaLibraryService.deleteAssets(photoIds);
            if (success) {
                // Update local visual UI state
                useDuplicateStore.getState().removeDuplicatesLocally(photoIds);
                // Ensure they don't appear in Kept/Delete tabs anymore
                usePhotoStore.getState().removePhotosPermanently(photoIds);
            }
            return success;
        } catch (error) {
            console.error("Failed to delete duplicate photos:", error);
            return false;
        }
    }, []);

    return {
        duplicateGroups,
        isScanning,
        progress,
        scanStatusText,
        hasPermission,
        scanDuplicates,
        deleteDuplicates,
    };
}
