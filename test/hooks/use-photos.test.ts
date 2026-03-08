import { usePhotos } from "@/hooks/use-photos";
import { mediaLibraryService } from "@/services/media-library.service";
import { usePhotoStore } from "@/stores/photo-store";
import { act, renderHook, waitFor } from "@testing-library/react-native";

jest.mock("@/services/media-library.service", () => ({
    mediaLibraryService: {
        getPermissionStatus: jest.fn(),
        requestPermission: jest.fn(),
        fetchPhotos: jest.fn(),
        deleteAssets: jest.fn(),
    },
}));

describe("usePhotos hook", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        usePhotoStore.setState({
            keptPhotos: [],
            deletionPhotos: [],
            restoredPhotos: [],
        });
    });

    it("should initialize with default states", async () => {
        (mediaLibraryService.getPermissionStatus as jest.Mock).mockResolvedValue(
            "undetermined"
        );

        const { result } = renderHook(() => usePhotos());

        expect(result.current.photos).toEqual([]);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.hasPermission).toBeNull();
        expect(result.current.currentIndex).toBe(0);
    });

    it("should fetch photos when permission is granted", async () => {
        (mediaLibraryService.getPermissionStatus as jest.Mock).mockResolvedValue(
            "granted"
        );
        const mockPhotos = {
            assets: [{ id: "1", uri: "uri1" }],
            endCursor: "cursor",
            hasNextPage: false,
            totalCount: 1,
        };
        (mediaLibraryService.fetchPhotos as jest.Mock).mockResolvedValue(
            mockPhotos
        );

        const { result } = renderHook(() => usePhotos());

        await waitFor(() => {
            expect(result.current.hasPermission).toBe(true);
        });

        await waitFor(() => {
            expect(result.current.photos.length).toBeGreaterThan(0);
        });

        expect(mediaLibraryService.fetchPhotos).toHaveBeenCalled();
    });

    it("should handle keepPhoto correctly", async () => {
        (mediaLibraryService.getPermissionStatus as jest.Mock).mockResolvedValue(
            "granted"
        );
        const mockPhotos = {
            assets: [
                { id: "1", uri: "uri1" },
                { id: "2", uri: "uri2" },
            ],
            endCursor: "cursor",
            hasNextPage: false,
            totalCount: 2,
        };
        (mediaLibraryService.fetchPhotos as jest.Mock).mockResolvedValue(
            mockPhotos
        );

        const { result } = renderHook(() => usePhotos());

        await waitFor(() => {
            expect(result.current.photos.length).toBe(2);
        });

        act(() => {
            result.current.keepPhoto();
        });

        expect(result.current.currentIndex).toBe(1);
    });

    it("undoLastDeletion should decrement currentIndex", async () => {
        (mediaLibraryService.getPermissionStatus as jest.Mock).mockResolvedValue(
            "granted"
        );
        const mockPhotos = {
            assets: [
                { id: "1", uri: "uri1" },
                { id: "2", uri: "uri2" },
            ],
            endCursor: "cursor",
            hasNextPage: false,
            totalCount: 2,
        };
        (mediaLibraryService.fetchPhotos as jest.Mock).mockResolvedValue(
            mockPhotos
        );

        const { result } = renderHook(() => usePhotos());

        await waitFor(() => {
            expect(result.current.photos.length).toBe(2);
        });

        act(() => {
            result.current.keepPhoto();
        });

        expect(result.current.currentIndex).toBe(1);

        act(() => {
            result.current.undoLastDeletion();
        });

        expect(result.current.currentIndex).toBe(0);
    });

    it("should advance past the last photo after keepPhoto on the final card", async () => {
        (mediaLibraryService.getPermissionStatus as jest.Mock).mockResolvedValue(
            "granted"
        );
        const mockPhotos = {
            assets: [
                { id: "1", uri: "uri1" },
                { id: "2", uri: "uri2" },
            ],
            endCursor: "cursor",
            hasNextPage: false,
            totalCount: 2,
        };
        (mediaLibraryService.fetchPhotos as jest.Mock).mockResolvedValue(
            mockPhotos
        );

        const { result } = renderHook(() => usePhotos());

        await waitFor(() => {
            expect(result.current.photos.length).toBe(2);
        });

        act(() => {
            result.current.keepPhoto();
            result.current.keepPhoto();
        });

        expect(result.current.currentIndex).toBe(2);
    });

    it("should advance past the last photo after markForDeletion on the final card", async () => {
        (mediaLibraryService.getPermissionStatus as jest.Mock).mockResolvedValue(
            "granted"
        );
        const mockPhotos = {
            assets: [
                { id: "1", uri: "uri1" },
                { id: "2", uri: "uri2" },
            ],
            endCursor: "cursor",
            hasNextPage: false,
            totalCount: 2,
        };
        (mediaLibraryService.fetchPhotos as jest.Mock).mockResolvedValue(
            mockPhotos
        );

        const { result } = renderHook(() => usePhotos());

        await waitFor(() => {
            expect(result.current.photos.length).toBe(2);
        });

        act(() => {
            result.current.keepPhoto();
            result.current.markForDeletion("2");
        });

        expect(result.current.currentIndex).toBe(2);
    });
});
