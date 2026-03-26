import { useStatsStore } from "@/stores/stats-store";

const mockCheckDeletionAchievements = jest.fn();

jest.mock("@/stores/achievement-store", () => ({
    useAchievementStore: {
        getState: () => ({
            checkDeletionAchievements: mockCheckDeletionAchievements,
        }),
    },
}));

describe("stats-store", () => {
    beforeEach(() => {
        useStatsStore.setState({ totalPhotosDeleted: 0, totalBytesFreed: 0 });
        mockCheckDeletionAchievements.mockClear();
    });

    it("should accumulate totalPhotosDeleted", () => {
        useStatsStore.getState().recordDeletion(5, 1000);
        expect(useStatsStore.getState().totalPhotosDeleted).toBe(5);

        useStatsStore.getState().recordDeletion(3, 500);
        expect(useStatsStore.getState().totalPhotosDeleted).toBe(8);
    });

    it("should accumulate totalBytesFreed", () => {
        useStatsStore.getState().recordDeletion(1, 2000);
        useStatsStore.getState().recordDeletion(1, 3000);
        expect(useStatsStore.getState().totalBytesFreed).toBe(5000);
    });

    it("should call checkDeletionAchievements with correct totals", () => {
        useStatsStore.getState().recordDeletion(10, 5000);
        expect(mockCheckDeletionAchievements).toHaveBeenCalledWith(10, 5000);
    });

    it("should pass accumulated totals on subsequent calls", () => {
        useStatsStore.getState().recordDeletion(5, 1000);
        useStatsStore.getState().recordDeletion(3, 2000);
        expect(mockCheckDeletionAchievements).toHaveBeenLastCalledWith(8, 3000);
    });
});
