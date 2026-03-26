import { useStatsStore } from "@/stores/stats-store";
import { useAchievementStore, AchievementId } from "@/stores/achievement-store";

describe("stats-store + achievement-store integration", () => {
    beforeEach(() => {
        useStatsStore.setState({ totalPhotosDeleted: 0, totalBytesFreed: 0 });
        useAchievementStore.setState({
            unlocked: {} as Record<AchievementId, undefined>,
            duplicatesRemoved: 0,
            smartCleanCategories: [],
            toastQueue: [],
        });
    });

    it("should unlock first_delete when recording 1 deletion", () => {
        useStatsStore.getState().recordDeletion(1, 0);
        expect(useAchievementStore.getState().isUnlocked("first_delete")).toBe(true);
    });

    it("should unlock clean_100 after accumulating 100 deletions", () => {
        for (let i = 0; i < 10; i++) {
            useStatsStore.getState().recordDeletion(10, 0);
        }
        expect(useStatsStore.getState().totalPhotosDeleted).toBe(100);
        expect(useAchievementStore.getState().isUnlocked("clean_100")).toBe(true);
    });

    it("should unlock space_1gb with enough bytes freed", () => {
        const GB = 1024 * 1024 * 1024;
        useStatsStore.getState().recordDeletion(50, GB);
        expect(useAchievementStore.getState().isUnlocked("space_1gb")).toBe(true);
    });

    it("should populate toastQueue in correct order", () => {
        useStatsStore.getState().recordDeletion(1, 0);

        const queue = useAchievementStore.getState().toastQueue;
        expect(queue).toContain("first_delete");
    });

    it("should NOT unlock clean_100 at 99 accumulated deletions", () => {
        useStatsStore.getState().recordDeletion(99, 0);
        expect(useAchievementStore.getState().isUnlocked("clean_100")).toBe(false);

        useStatsStore.getState().recordDeletion(1, 0);
        expect(useAchievementStore.getState().isUnlocked("clean_100")).toBe(true);
    });
});
