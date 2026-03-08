import { mapLabelsToCategory, LabelWithConfidence } from "@/utils/category-mapper";

/** Helper: converts string[] to LabelWithConfidence[] with confidence=1.0 */
const toLabels = (labels: string[]): LabelWithConfidence[] =>
    labels.map(identifier => ({ identifier, confidence: 1.0 }));

describe("Category Mapper Utility", () => {
    it("should map text-related labels to Documents", () => {
        expect(mapLabelsToCategory(toLabels(["Text", "Receipt", "Paper"])).category).toBe("Documents");
        expect(mapLabelsToCategory(toLabels(["Screenshot", "Typography"])).category).toBe("Documents");
    });

    it("should map face-related labels to People", () => {
        expect(mapLabelsToCategory(toLabels(["Smile", "Person"])).category).toBe("People");
        expect(mapLabelsToCategory(toLabels(["Crowd", "Human", "Portrait"])).category).toBe("People");
    });

    it("should map nature-related labels to Landscapes", () => {
        expect(mapLabelsToCategory(toLabels(["Mountain", "Sky", "Nature"])).category).toBe("Landscapes");
        expect(mapLabelsToCategory(toLabels(["Sunset", "Ocean", "Beach"])).category).toBe("Landscapes");
    });

    it("should map animal-related labels to Animals", () => {
        expect(mapLabelsToCategory(toLabels(["Dog", "Pet"])).category).toBe("Animals");
        expect(mapLabelsToCategory(toLabels(["Wildlife", "Bird"])).category).toBe("Animals");
    });

    it("should map unknown labels to Other", () => {
        expect(mapLabelsToCategory(toLabels(["Car", "Vehicle"])).category).toBe("Vehicles");
        expect(mapLabelsToCategory(toLabels(["Computer"])).category).toBe("Other");
    });

    it("should handle mixed cases gracefully", () => {
        expect(mapLabelsToCategory(toLabels(["TeXT"])).category).toBe("Documents");
        expect(mapLabelsToCategory(toLabels(["sMiLe"])).category).toBe("People");
    });

    it("should return a score > 0 for matched categories", () => {
        const result = mapLabelsToCategory(toLabels(["Dog", "Pet", "Animal"]));
        expect(result.category).toBe("Animals");
        expect(result.score).toBeGreaterThan(0.3);
    });

    it("should use confidence weighting", () => {
        const labels: LabelWithConfidence[] = [
            { identifier: "dog", confidence: 0.9 },
            { identifier: "sky", confidence: 0.3 },
        ];
        const result = mapLabelsToCategory(labels);
        expect(result.category).toBe("Animals");
    });
});
