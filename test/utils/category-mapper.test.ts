import { mapLabelsToCategory } from "../../utils/category-mapper";

describe("Category Mapper Utility", () => {
    it("should map text-related labels to Documents", () => {
        expect(mapLabelsToCategory(["Text", "Receipt", "Paper"])).toBe("Documents");
        expect(mapLabelsToCategory(["Screenshot", "Typography"])).toBe("Documents");
    });

    it("should map face-related labels to People", () => {
        expect(mapLabelsToCategory(["Smile", "Person"])).toBe("People");
        expect(mapLabelsToCategory(["Crowd", "Human", "Portrait"])).toBe("People");
    });

    it("should map nature-related labels to Landscapes", () => {
        expect(mapLabelsToCategory(["Mountain", "Sky", "Nature"])).toBe("Landscapes");
        expect(mapLabelsToCategory(["Sunset", "Ocean", "Beach"])).toBe("Landscapes");
    });

    it("should map animal-related labels to Animals", () => {
        expect(mapLabelsToCategory(["Dog", "Pet"])).toBe("Animals");
        expect(mapLabelsToCategory(["Wildlife", "Bird"])).toBe("Animals");
    });

    it("should map unknown labels to Other", () => {
        expect(mapLabelsToCategory(["Car", "Vehicle"])).toBe("Vehicles");
        expect(mapLabelsToCategory(["Computer", "Table", "Chair"])).toBe("Other");
    });

    it("should handle mixed cases gracefully", () => {
        expect(mapLabelsToCategory(["TeXT"])).toBe("Documents");
        expect(mapLabelsToCategory(["sMiLe"])).toBe("People");
    });
});
