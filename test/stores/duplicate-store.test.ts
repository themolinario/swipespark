import { useDuplicateStore } from "@/stores/duplicate-store";
import { DuplicateGroup } from "@/utils/duplicate-detection";
import { PhotoAsset } from "@/services/media-library.service";

const makePhoto = (id: string): PhotoAsset =>
    ({ id, uri: `uri_${id}`, width: 100, height: 100, mediaType: "photo", modificationTime: 0 }) as PhotoAsset;

const makeGroup = (id: string, photoIds: string[]): DuplicateGroup => ({
    id,
    photos: photoIds.map(makePhoto),
});

describe("duplicate-store — removeDuplicatesLocally", () => {
    beforeEach(() => {
        useDuplicateStore.setState({ duplicateGroups: [], hashedAssets: {} });
    });

    it("should remove specified photos from groups", () => {
        useDuplicateStore.setState({
            duplicateGroups: [makeGroup("g1", ["p1", "p2", "p3"])],
        });

        useDuplicateStore.getState().removeDuplicatesLocally(["p1"]);

        const groups = useDuplicateStore.getState().duplicateGroups;
        expect(groups).toHaveLength(1);
        expect(groups[0].photos.map((p) => p.id)).toEqual(["p2", "p3"]);
    });

    it("should drop group when only 1 photo remains", () => {
        useDuplicateStore.setState({
            duplicateGroups: [makeGroup("g1", ["p1", "p2"])],
        });

        useDuplicateStore.getState().removeDuplicatesLocally(["p1"]);

        expect(useDuplicateStore.getState().duplicateGroups).toHaveLength(0);
    });

    it("should preserve groups with more than 1 remaining photo", () => {
        useDuplicateStore.setState({
            duplicateGroups: [
                makeGroup("g1", ["p1", "p2"]),
                makeGroup("g2", ["p3", "p4", "p5"]),
            ],
        });

        useDuplicateStore.getState().removeDuplicatesLocally(["p1", "p3"]);

        const groups = useDuplicateStore.getState().duplicateGroups;
        expect(groups).toHaveLength(1);
        expect(groups[0].id).toBe("g2");
        expect(groups[0].photos.map((p) => p.id)).toEqual(["p4", "p5"]);
    });

    it("should leave groups unchanged with empty ids array", () => {
        useDuplicateStore.setState({
            duplicateGroups: [makeGroup("g1", ["p1", "p2"])],
        });

        useDuplicateStore.getState().removeDuplicatesLocally([]);

        expect(useDuplicateStore.getState().duplicateGroups).toHaveLength(1);
    });
});
