import { useDuplicates } from "@/hooks/use-duplicates";
import { mediaLibraryService } from "@/services/media-library.service";
import { useDuplicateStore } from "@/stores/duplicate-store";
import { usePhotoStore } from "@/stores/photo-store";
import { act, renderHook } from "@testing-library/react-native";

// Mock the services and stores
jest.mock("@/services/media-library.service", () => ({
    mediaLibraryService: {
        getPermissionStatus: jest.fn(),
        requestPermission: jest.fn(),
        deleteAssets: jest.fn(),
    },
}));

describe("useDuplicates", () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Reset store state
        useDuplicateStore.setState({
            duplicateGroups: [],
            isScanning: false,
            progress: 0,
            scanStatusText: "",
        });

        // Mock startScan to avoid actual execution during simple hook tests
        useDuplicateStore.setState({
            startScan: jest.fn(),
            removeDuplicatesLocally: jest.fn(),
        });

        usePhotoStore.setState({
            removePhotosPermanently: jest.fn(),
        });
    });

    it("should check permission on mount", async () => {
        (mediaLibraryService.getPermissionStatus as jest.Mock).mockResolvedValue("granted");

        const { result } = renderHook(() => useDuplicates());

        // Wait for useEffect
        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 0));
        });

        expect(result.current.hasPermission).toBe(true);
        expect(mediaLibraryService.getPermissionStatus).toHaveBeenCalled();
    });

    describe("scanDuplicates", () => {
        it("should request permission if not granted, then start scan if granted", async () => {
            (mediaLibraryService.getPermissionStatus as jest.Mock).mockResolvedValue("undetermined");
            (mediaLibraryService.requestPermission as jest.Mock).mockResolvedValue(true);

            const startScanMock = jest.fn();
            useDuplicateStore.setState({ startScan: startScanMock });

            const { result } = renderHook(() => useDuplicates());

            await act(async () => {
                await result.current.scanDuplicates();
            });

            expect(mediaLibraryService.requestPermission).toHaveBeenCalled();
            expect(result.current.hasPermission).toBe(true);
            expect(startScanMock).toHaveBeenCalled();
        });

        it("should not start scan if permission denied", async () => {
            (mediaLibraryService.getPermissionStatus as jest.Mock).mockResolvedValue("undetermined");
            (mediaLibraryService.requestPermission as jest.Mock).mockResolvedValue(false);

            const startScanMock = jest.fn();
            useDuplicateStore.setState({ startScan: startScanMock });

            const { result } = renderHook(() => useDuplicates());

            await act(async () => {
                await result.current.scanDuplicates();
            });

            expect(mediaLibraryService.requestPermission).toHaveBeenCalled();
            expect(result.current.hasPermission).toBe(false);
            expect(startScanMock).not.toHaveBeenCalled();
        });
    });

    describe("deleteDuplicates", () => {
        it("should return true immediately if no ids provided", async () => {
            const { result } = renderHook(() => useDuplicates());

            let success;
            await act(async () => {
                success = await result.current.deleteDuplicates([]);
            });

            expect(success).toBe(true);
            expect(mediaLibraryService.deleteAssets).not.toHaveBeenCalled();
        });

        it("should delete assets and update stores when successful", async () => {
            (mediaLibraryService.deleteAssets as jest.Mock).mockResolvedValue(true);

            const removeDuplicatesLocallyMock = jest.fn();
            useDuplicateStore.setState({ removeDuplicatesLocally: removeDuplicatesLocallyMock });

            const removePhotosPermanentlyMock = jest.fn();
            usePhotoStore.setState({ removePhotosPermanently: removePhotosPermanentlyMock });

            const { result } = renderHook(() => useDuplicates());

            let success;
            await act(async () => {
                success = await result.current.deleteDuplicates(["id1", "id2"]);
            });

            expect(success).toBe(true);
            expect(mediaLibraryService.deleteAssets).toHaveBeenCalledWith(["id1", "id2"]);
            expect(removeDuplicatesLocallyMock).toHaveBeenCalledWith(["id1", "id2"]);
            expect(removePhotosPermanentlyMock).toHaveBeenCalledWith(["id1", "id2"]);
        });

        it("should return false when deletion fails", async () => {
            const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => { });
            (mediaLibraryService.deleteAssets as jest.Mock).mockRejectedValue(new Error("Failed"));

            const removeDuplicatesLocallyMock = jest.fn();
            useDuplicateStore.setState({ removeDuplicatesLocally: removeDuplicatesLocallyMock });

            const { result } = renderHook(() => useDuplicates());

            let success;
            await act(async () => {
                success = await result.current.deleteDuplicates(["id1"]);
            });

            expect(success).toBe(false);
            expect(removeDuplicatesLocallyMock).not.toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });
});
