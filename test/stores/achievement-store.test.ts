import { useAchievementStore, AchievementId } from "@/stores/achievement-store";

const resetStore = () => {
    useAchievementStore.setState({
        unlocked: {} as Record<AchievementId, undefined>,
        duplicatesRemoved: 0,
        smartCleanCategories: [],
        toastQueue: [],
    });
};

describe("achievement-store", () => {
    beforeEach(resetStore);

    describe("tryUnlock", () => {
        it("should return true on first unlock", () => {
            const result = useAchievementStore.getState().tryUnlock("first_delete");
            expect(result).toBe(true);
        });

        it("should return false when already unlocked", () => {
            useAchievementStore.getState().tryUnlock("first_delete");
            const result = useAchievementStore.getState().tryUnlock("first_delete");
            expect(result).toBe(false);
        });

        it("should add achievement to toastQueue", () => {
            useAchievementStore.getState().tryUnlock("first_delete");
            expect(useAchievementStore.getState().toastQueue).toEqual(["first_delete"]);
        });

        it("should not add duplicate to toastQueue", () => {
            useAchievementStore.getState().tryUnlock("first_delete");
            useAchievementStore.getState().tryUnlock("first_delete");
            expect(useAchievementStore.getState().toastQueue).toEqual(["first_delete"]);
        });
    });

    describe("isUnlocked", () => {
        it("should return false before unlock", () => {
            expect(useAchievementStore.getState().isUnlocked("first_delete")).toBe(false);
        });

        it("should return true after unlock", () => {
            useAchievementStore.getState().tryUnlock("first_delete");
            expect(useAchievementStore.getState().isUnlocked("first_delete")).toBe(true);
        });
    });

    describe("consumeToast", () => {
        it("should return undefined on empty queue", () => {
            expect(useAchievementStore.getState().consumeToast()).toBeUndefined();
        });

        it("should return first item and remove it", () => {
            useAchievementStore.getState().tryUnlock("first_delete");
            useAchievementStore.getState().tryUnlock("clean_100");

            const first = useAchievementStore.getState().consumeToast();
            expect(first).toBe("first_delete");
            expect(useAchievementStore.getState().toastQueue).toEqual(["clean_100"]);
        });
    });

    describe("checkDeletionAchievements", () => {
        it("should unlock first_delete at count >= 1", () => {
            useAchievementStore.getState().checkDeletionAchievements(1, 0);
            expect(useAchievementStore.getState().isUnlocked("first_delete")).toBe(true);
        });

        it("should NOT unlock clean_100 at 99", () => {
            useAchievementStore.getState().checkDeletionAchievements(99, 0);
            expect(useAchievementStore.getState().isUnlocked("clean_100")).toBe(false);
        });

        it("should unlock clean_100 at exactly 100", () => {
            useAchievementStore.getState().checkDeletionAchievements(100, 0);
            expect(useAchievementStore.getState().isUnlocked("clean_100")).toBe(true);
        });

        it("should unlock clean_500 and clean_1000 at thresholds", () => {
            useAchievementStore.getState().checkDeletionAchievements(1000, 0);
            expect(useAchievementStore.getState().isUnlocked("clean_500")).toBe(true);
            expect(useAchievementStore.getState().isUnlocked("clean_1000")).toBe(true);
        });

        it("should unlock space_100mb at 100MB", () => {
            const MB = 1024 * 1024;
            useAchievementStore.getState().checkDeletionAchievements(0, 100 * MB);
            expect(useAchievementStore.getState().isUnlocked("space_100mb")).toBe(true);
        });

        it("should unlock space_1gb at 1GB", () => {
            const GB = 1024 * 1024 * 1024;
            useAchievementStore.getState().checkDeletionAchievements(0, GB);
            expect(useAchievementStore.getState().isUnlocked("space_1gb")).toBe(true);
        });

        it("should unlock space_5gb at 5GB", () => {
            const GB = 1024 * 1024 * 1024;
            useAchievementStore.getState().checkDeletionAchievements(0, 5 * GB);
            expect(useAchievementStore.getState().isUnlocked("space_5gb")).toBe(true);
        });
    });

    describe("recordDuplicatesRemoved", () => {
        it("should accumulate count", () => {
            useAchievementStore.getState().recordDuplicatesRemoved(5);
            useAchievementStore.getState().recordDuplicatesRemoved(3);
            expect(useAchievementStore.getState().duplicatesRemoved).toBe(8);
        });

        it("should unlock duplicate_hunter_10 at 10", () => {
            useAchievementStore.getState().recordDuplicatesRemoved(10);
            expect(useAchievementStore.getState().isUnlocked("duplicate_hunter_10")).toBe(true);
        });

        it("should NOT unlock duplicate_hunter_10 at 9", () => {
            useAchievementStore.getState().recordDuplicatesRemoved(9);
            expect(useAchievementStore.getState().isUnlocked("duplicate_hunter_10")).toBe(false);
        });

        it("should unlock duplicate_hunter_50 at 50", () => {
            useAchievementStore.getState().recordDuplicatesRemoved(50);
            expect(useAchievementStore.getState().isUnlocked("duplicate_hunter_50")).toBe(true);
        });
    });

    describe("recordSmartCleanCategory", () => {
        it("should add category only once", () => {
            useAchievementStore.getState().recordSmartCleanCategory("People");
            useAchievementStore.getState().recordSmartCleanCategory("People");
            expect(useAchievementStore.getState().smartCleanCategories).toEqual(["People"]);
        });

        it("should unlock smart_cleaner on first category", () => {
            useAchievementStore.getState().recordSmartCleanCategory("People");
            expect(useAchievementStore.getState().isUnlocked("smart_cleaner")).toBe(true);
        });

        it("should NOT unlock category_master with less than 7 categories", () => {
            const partial = ["People", "Landscapes", "Documents", "Animals", "Food", "Vehicles"];
            partial.forEach((c) => useAchievementStore.getState().recordSmartCleanCategory(c));
            expect(useAchievementStore.getState().isUnlocked("category_master")).toBe(false);
        });

        it("should unlock category_master with all 7 categories", () => {
            const all = ["People", "Landscapes", "Documents", "Animals", "Food", "Vehicles", "Interiors"];
            all.forEach((c) => useAchievementStore.getState().recordSmartCleanCategory(c));
            expect(useAchievementStore.getState().isUnlocked("category_master")).toBe(true);
        });
    });

    describe("recordAllReviewed", () => {
        it("should unlock all_reviewed", () => {
            useAchievementStore.getState().recordAllReviewed();
            expect(useAchievementStore.getState().isUnlocked("all_reviewed")).toBe(true);
        });
    });
});
