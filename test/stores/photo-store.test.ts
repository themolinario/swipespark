import { PhotoAsset } from "@/services/media-library.service";
import { usePhotoStore } from "@/stores/photo-store";

const mockPhoto1 = {
    id: "1",
    uri: "uri1",
    width: 100,
    height: 100,
    mediaType: "photo",
    modificationTime: 0,
} as PhotoAsset;
const mockPhoto2 = {
    id: "2",
    uri: "uri2",
    width: 100,
    height: 100,
    mediaType: "photo",
    modificationTime: 0,
} as PhotoAsset;

describe("photo-store", () => {
    beforeEach(() => {
        usePhotoStore.getState().clearKeptPhotos();
        usePhotoStore.getState().clearDeletionPhotos();
        usePhotoStore.setState({ restoredPhotos: [] });
    });

    it("should add and remove kept photos", () => {
        const store = usePhotoStore.getState();
        store.addKeptPhoto(mockPhoto1);
        expect(usePhotoStore.getState().keptPhotos).toHaveLength(1);
        expect(usePhotoStore.getState().isPhotoKept("1")).toBe(true);

        usePhotoStore.getState().removeKeptPhoto("1");
        expect(usePhotoStore.getState().keptPhotos).toHaveLength(0);
        expect(usePhotoStore.getState().isPhotoKept("1")).toBe(false);
    });

    it("should not add duplicate kept photos", () => {
        const store = usePhotoStore.getState();
        store.addKeptPhoto(mockPhoto1);
        store.addKeptPhoto(mockPhoto1);
        expect(usePhotoStore.getState().keptPhotos).toHaveLength(1);
    });

    it("should add and remove deletion photos", () => {
        const store = usePhotoStore.getState();
        store.addDeletionPhoto(mockPhoto2);
        expect(usePhotoStore.getState().deletionPhotos).toHaveLength(1);
        expect(usePhotoStore.getState().isPhotoMarkedForDeletion("2")).toBe(true);

        usePhotoStore.getState().removeDeletionPhoto("2");
        expect(usePhotoStore.getState().deletionPhotos).toHaveLength(0);
        expect(usePhotoStore.getState().isPhotoMarkedForDeletion("2")).toBe(false);
    });

    it("should not add duplicate deletion photos", () => {
        const store = usePhotoStore.getState();
        store.addDeletionPhoto(mockPhoto2);
        store.addDeletionPhoto(mockPhoto2);
        expect(usePhotoStore.getState().deletionPhotos).toHaveLength(1);
    });

    it("removing kept photo adds to restoredPhotos", () => {
        const store = usePhotoStore.getState();
        store.addKeptPhoto(mockPhoto1);
        store.removeKeptPhoto("1");
        expect(usePhotoStore.getState().restoredPhotos).toHaveLength(1);
        expect(usePhotoStore.getState().restoredPhotos[0].id).toBe("1");
    });

    it("removing deletion photo adds to restoredPhotos", () => {
        const store = usePhotoStore.getState();
        store.addDeletionPhoto(mockPhoto2);
        store.removeDeletionPhoto("2");
        expect(usePhotoStore.getState().restoredPhotos).toHaveLength(1);
        expect(usePhotoStore.getState().restoredPhotos[0].id).toBe("2");
    });

    it("consumeRestoredPhotos empties restoredPhotos", () => {
        const store = usePhotoStore.getState();
        store.addKeptPhoto(mockPhoto1);
        store.removeKeptPhoto("1");
        const restored = usePhotoStore.getState().consumeRestoredPhotos();
        expect(restored).toHaveLength(1);
        expect(usePhotoStore.getState().restoredPhotos).toHaveLength(0);
    });
});
