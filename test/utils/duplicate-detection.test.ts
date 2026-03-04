import { PhotoAsset } from "@/services/media-library.service";
import {
    findDuplicates,
    findDuplicatesByHash,
} from "@/utils/duplicate-detection";

describe("duplicate-detection.ts", () => {
    describe("findDuplicates (Basic heuristic)", () => {
        it("should group identical photos by filename, width, and height", () => {
            const mockPhotos = [
                {
                    id: "1",
                    filename: "photo1.jpg",
                    width: 100,
                    height: 100,
                    creationTime: 1000,
                    modificationTime: 1000,
                },
                {
                    id: "2", // duplicate
                    filename: "photo1.jpg",
                    width: 100,
                    height: 100,
                    creationTime: 2000,
                    modificationTime: 2000,
                },
                {
                    id: "3", // different name
                    filename: "photo2.jpg",
                    width: 100,
                    height: 100,
                    creationTime: 3000,
                    modificationTime: 3000,
                },
                {
                    id: "4", // different size
                    filename: "photo1.jpg",
                    width: 200,
                    height: 200,
                    creationTime: 4000,
                    modificationTime: 4000,
                },
            ] as PhotoAsset[];

            const duplicates = findDuplicates(mockPhotos);

            expect(duplicates.length).toBe(1); // Only 1 group
            expect(duplicates[0].id).toBe("photo1.jpg_100_100");
            expect(duplicates[0].photos.length).toBe(2);
            // Sorting is newest first by modificationTime
            expect(duplicates[0].photos[0].id).toBe("2");
            expect(duplicates[0].photos[1].id).toBe("1");
        });

        it("should return empty array if no duplicates found", () => {
            const mockPhotos = [
                {
                    id: "1",
                    filename: "photo1.jpg",
                    width: 100,
                    height: 100,
                },
                {
                    id: "2",
                    filename: "photo2.jpg",
                    width: 200,
                    height: 200,
                },
            ] as PhotoAsset[];

            const duplicates = findDuplicates(mockPhotos);
            expect(duplicates.length).toBe(0);
        });
    });

    describe("findDuplicatesByHash", () => {
        it("should group identical photos by hash", () => {
            const mockPhotos = [
                {
                    id: "p1",
                    filename: "photoA.jpg",
                    creationTime: 1000,
                    modificationTime: 1000,
                },
                {
                    id: "p2",
                    filename: "photoB.jpg", // Different name but same hash
                    creationTime: 2000,
                    modificationTime: 2000,
                },
                {
                    id: "p3",
                    filename: "photoC.jpg",
                    creationTime: 3000,
                    modificationTime: 3000,
                },
            ] as PhotoAsset[];

            const hashTable = {
                "p1": "hash_123",
                "p2": "hash_123", // Duplicate!
                "p3": "hash_456", // Unique
            };

            const duplicates = findDuplicatesByHash(mockPhotos, hashTable);

            expect(duplicates.length).toBe(1);
            expect(duplicates[0].id).toBe("hash_123");
            expect(duplicates[0].photos.length).toBe(2);
            // Check sorting by modification time (newest first)
            expect(duplicates[0].photos[0].id).toBe("p2");
            expect(duplicates[0].photos[1].id).toBe("p1");
        });

        it("should ignore photos without a hash", () => {
            const mockPhotos = [
                {
                    id: "p1",
                    filename: "photoA.jpg",
                    creationTime: 1000,
                    modificationTime: 1000,
                },
                {
                    id: "p2",
                    filename: "photoB.jpg",
                    creationTime: 2000,
                    modificationTime: 2000,
                },
            ] as PhotoAsset[];

            const hashTable = {
                "p1": "hash_123",
                // p2 is missing
            };

            const duplicates = findDuplicatesByHash(mockPhotos, hashTable);
            expect(duplicates.length).toBe(0); // Because p1 alone is not a duplicate group
        });
    });
});
