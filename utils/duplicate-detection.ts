import { PhotoAsset } from "@/services/media-library.service";

export interface DuplicateGroup {
    id: string; // The hash key
    photos: PhotoAsset[];
}

/**
 * Groups a list of photos into sets of duplicates.
 * A duplicate is defined as photos having the exact same filename, width, and height.
 * Only returns groups that have more than 1 photo.
 */
export function findDuplicates(photos: PhotoAsset[]): DuplicateGroup[] {
    const groups = new Map<string, PhotoAsset[]>();

    for (const photo of photos) {
        // We use filename, width, and height as a heuristic for exact duplicates regardless of timestamp.
        const key = `${photo.filename}_${photo.width}_${photo.height}`;

        if (!groups.has(key)) {
            groups.set(key, []);
        }

        // We know it's defined because we just set it if it was missing
        groups.get(key)!.push(photo);
    }

    // Filter out any entries that only have 1 photo (not a duplicate)
    const duplicates: DuplicateGroup[] = [];
    for (const [key, similarPhotos] of groups.entries()) {
        if (similarPhotos.length > 1) {
            // Sort within the group so the newest is first, or keep them as is (usually chronologically)
            duplicates.push({
                id: key,
                photos: similarPhotos.sort((a, b) => b.modificationTime - a.modificationTime),
            });
        }
    }

    // Sort groups by time (newest creation time first)
    return duplicates.sort((a, b) => b.photos[0].creationTime - a.photos[0].creationTime);
}

/**
 * Groups a list of photos into sets of duplicates based on a pre-computed hash map.
 */
export function findDuplicatesByHash(
    photos: PhotoAsset[],
    hashedAssets: Record<string, string>
): DuplicateGroup[] {
    const groups = new Map<string, PhotoAsset[]>();

    for (const photo of photos) {
        const hash = hashedAssets[photo.id];
        // If it doesn't have a hash, it wasn't processed yet or failed, skip or use fallback
        if (!hash) continue;

        if (!groups.has(hash)) {
            groups.set(hash, []);
        }

        groups.get(hash)!.push(photo);
    }

    const duplicates: DuplicateGroup[] = [];
    for (const [key, similarPhotos] of groups.entries()) {
        if (similarPhotos.length > 1) {
            duplicates.push({
                id: key,
                photos: similarPhotos.sort((a, b) => b.modificationTime - a.modificationTime),
            });
        }
    }

    return duplicates.sort((a, b) => b.photos[0].creationTime - a.photos[0].creationTime);
}
