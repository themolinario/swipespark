export type SmartCategory = "People" | "Landscapes" | "Documents" | "Animals" | "Food" | "Vehicles" | "Interiors" | "Custom" | "Other";

export function mapLabelsToCategory(labels: string[]): SmartCategory {
    const normalizedLabels = labels.map((l) => l.toLowerCase());

    const peopleKeywords = ["person", "face", "smile", "man", "woman", "human", "boy", "girl", "people", "portrait", "child", "baby", "crowd"];
    const landscapeKeywords = ["mountain", "beach", "sky", "nature", "tree", "forest", "sea", "ocean", "water", "landscape", "sunset", "sunrise", "hill", "river", "valley"];
    const documentKeywords = ["text", "document", "receipt", "font", "book", "handwriting", "page", "letter", "screenshot", "typography"];
    const animalKeywords = ["animal", "dog", "cat", "bird", "pet", "wildlife", "horse", "fish"];
    const foodKeywords = ["food", "meal", "dish", "plate", "restaurant", "meat", "vegetable", "fruit", "drink", "coffee", "cake", "dessert"];
    const vehicleKeywords = ["vehicle", "car", "truck", "motorcycle", "bike", "bicycle", "bus", "train", "airplane", "boat"];
    const interiorKeywords = ["room", "furniture", "house", "indoor", "interior", "living room", "bedroom", "kitchen", "office", "bathroom", "toilet", "bath", "washroom"];

    const hasMatch = (keywords: string[]) =>
        normalizedLabels.some((label) =>
            keywords.some((kw) => new RegExp(`\\b${kw}\\b`, 'i').test(label))
        );

    if (hasMatch(documentKeywords)) return "Documents";
    if (hasMatch(peopleKeywords)) return "People";
    if (hasMatch(landscapeKeywords)) return "Landscapes";
    if (hasMatch(animalKeywords)) return "Animals";
    if (hasMatch(foodKeywords)) return "Food";
    if (hasMatch(vehicleKeywords)) return "Vehicles";
    if (hasMatch(interiorKeywords)) return "Interiors";

    return "Other";
}

export function matchesCustomQuery(labels: string[], query: string): boolean {
    if (!query) return false;
    const normalizedQuery = query.toLowerCase().trim();
    // In ML Kit / Vision, labels are usually single words or short phrases.
    // We check if the query string appears anywhere within the detected labels.
    return labels.some(label => label.toLowerCase().includes(normalizedQuery));
}
