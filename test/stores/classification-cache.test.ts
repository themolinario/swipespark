import { useClassificationCache, CachedLabel } from "@/stores/classification-cache";

const mockLabels: CachedLabel[] = [
    { identifier: "dog", confidence: 0.95 },
    { identifier: "animal", confidence: 0.8 },
];

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

describe("classification-cache", () => {
    beforeEach(() => {
        useClassificationCache.getState().clearAll();
        jest.restoreAllMocks();
    });

    describe("setCachedLabels / getCachedLabels", () => {
        it("should store and retrieve labels", () => {
            useClassificationCache.getState().setCachedLabels("asset1", mockLabels);
            const result = useClassificationCache.getState().getCachedLabels("asset1");
            expect(result).toEqual(mockLabels);
        });

        it("should return null for unknown asset", () => {
            expect(useClassificationCache.getState().getCachedLabels("unknown")).toBeNull();
        });

        it("should return null for expired entry", () => {
            const now = 1000000;
            jest.spyOn(Date, "now").mockReturnValue(now);
            useClassificationCache.getState().setCachedLabels("asset1", mockLabels);

            jest.spyOn(Date, "now").mockReturnValue(now + THIRTY_DAYS_MS + 1);
            expect(useClassificationCache.getState().getCachedLabels("asset1")).toBeNull();
        });

        it("should return labels for non-expired entry", () => {
            const now = 1000000;
            jest.spyOn(Date, "now").mockReturnValue(now);
            useClassificationCache.getState().setCachedLabels("asset1", mockLabels);

            jest.spyOn(Date, "now").mockReturnValue(now + THIRTY_DAYS_MS - 1);
            expect(useClassificationCache.getState().getCachedLabels("asset1")).toEqual(mockLabels);
        });
    });

    describe("setCachedLabelsBatch", () => {
        it("should store multiple entries at once", () => {
            const labels2: CachedLabel[] = [{ identifier: "sky", confidence: 0.9 }];
            useClassificationCache.getState().setCachedLabelsBatch([
                { assetId: "a1", labels: mockLabels },
                { assetId: "a2", labels: labels2 },
            ]);

            expect(useClassificationCache.getState().getCachedLabels("a1")).toEqual(mockLabels);
            expect(useClassificationCache.getState().getCachedLabels("a2")).toEqual(labels2);
        });
    });

    describe("clearExpired", () => {
        it("should remove only expired entries", () => {
            const now = 1000000;
            jest.spyOn(Date, "now").mockReturnValue(now);
            useClassificationCache.getState().setCachedLabels("old", mockLabels);

            jest.spyOn(Date, "now").mockReturnValue(now + THIRTY_DAYS_MS + 1);
            useClassificationCache.getState().setCachedLabels("fresh", mockLabels);

            useClassificationCache.getState().clearExpired();

            expect(useClassificationCache.getState().cache["old"]).toBeUndefined();
            expect(useClassificationCache.getState().cache["fresh"]).toBeDefined();
        });
    });

    describe("clearAll", () => {
        it("should empty the entire cache", () => {
            useClassificationCache.getState().setCachedLabels("a1", mockLabels);
            useClassificationCache.getState().setCachedLabels("a2", mockLabels);
            useClassificationCache.getState().clearAll();
            expect(useClassificationCache.getState().cache).toEqual({});
        });
    });
});
