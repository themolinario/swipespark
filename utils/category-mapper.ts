export type SmartCategory = "People" | "Landscapes" | "Documents" | "Animals" | "Food" | "Vehicles" | "Interiors" | "Custom" | "Other";

export interface LabelWithConfidence {
    identifier: string;
    confidence: number;
}

export interface CategoryScore {
    category: SmartCategory;
    score: number;
}

// ── Pre-compiled keyword sets (Set for O(1) lookup) ──────────────────
const PEOPLE_KEYWORDS = new Set(["person", "face", "smile", "man", "woman", "human", "boy", "girl", "people", "portrait", "child", "baby", "crowd", "selfie", "head", "skin", "lip", "nose", "eye", "eyebrow", "chin", "forehead", "cheek", "jaw", "ear", "neck", "hair", "beard", "mustache"]);
const LANDSCAPE_KEYWORDS = new Set(["mountain", "beach", "sky", "nature", "tree", "forest", "sea", "ocean", "water", "landscape", "sunset", "sunrise", "hill", "river", "valley", "cloud", "horizon", "field", "meadow", "lake", "waterfall", "coast", "cliff", "desert", "snow", "aurora", "fog"]);
const DOCUMENT_KEYWORDS = new Set(["text", "document", "receipt", "font", "book", "handwriting", "page", "letter", "screenshot", "typography", "paper", "writing", "number", "sign", "label", "newspaper", "magazine", "poster", "menu", "ticket", "invoice", "note"]);
const ANIMAL_KEYWORDS = new Set(["animal", "dog", "cat", "bird", "pet", "wildlife", "horse", "fish", "puppy", "kitten", "rabbit", "hamster", "turtle", "snake", "lizard", "insect", "butterfly", "bee", "spider", "frog", "deer", "bear", "lion", "tiger", "elephant", "monkey", "parrot", "penguin", "whale", "dolphin", "shark"]);
const FOOD_KEYWORDS = new Set(["food", "meal", "dish", "plate", "restaurant", "meat", "vegetable", "fruit", "drink", "coffee", "cake", "dessert", "pizza", "pasta", "bread", "cheese", "salad", "soup", "sushi", "rice", "egg", "chocolate", "ice cream", "wine", "beer", "tea", "sandwich", "burger", "cooking", "baking", "kitchen"]);
const VEHICLE_KEYWORDS = new Set(["vehicle", "car", "truck", "motorcycle", "bike", "bicycle", "bus", "train", "airplane", "boat", "ship", "helicopter", "scooter", "taxi", "ambulance", "van", "wheel", "tire", "engine", "steering"]);
const INTERIOR_KEYWORDS = new Set(["room", "furniture", "house", "indoor", "interior", "living room", "bedroom", "kitchen", "office", "bathroom", "toilet", "bath", "washroom", "sofa", "couch", "chair", "table", "desk", "bed", "lamp", "shelf", "cabinet", "curtain", "carpet", "pillow", "mirror"]);

// ── Pre-compiled regex patterns for partial/substring matching ────────
interface CategoryEntry {
    category: SmartCategory;
    keywords: Set<string>;
    patterns: RegExp[];
}

function buildPatterns(keywords: Set<string>): RegExp[] {
    return Array.from(keywords).map(kw => new RegExp(`\\b${kw}\\b`, 'i'));
}

const CATEGORY_ENTRIES: CategoryEntry[] = [
    { category: "Documents", keywords: DOCUMENT_KEYWORDS, patterns: buildPatterns(DOCUMENT_KEYWORDS) },
    { category: "People", keywords: PEOPLE_KEYWORDS, patterns: buildPatterns(PEOPLE_KEYWORDS) },
    { category: "Animals", keywords: ANIMAL_KEYWORDS, patterns: buildPatterns(ANIMAL_KEYWORDS) },
    { category: "Food", keywords: FOOD_KEYWORDS, patterns: buildPatterns(FOOD_KEYWORDS) },
    { category: "Vehicles", keywords: VEHICLE_KEYWORDS, patterns: buildPatterns(VEHICLE_KEYWORDS) },
    { category: "Interiors", keywords: INTERIOR_KEYWORDS, patterns: buildPatterns(INTERIOR_KEYWORDS) },
    { category: "Landscapes", keywords: LANDSCAPE_KEYWORDS, patterns: buildPatterns(LANDSCAPE_KEYWORDS) },
];

/**
 * Maps labels with confidence scores to the best matching category using weighted scoring.
 * Returns the category with the highest cumulative confidence score.
 * Minimum score threshold: 0.3
 */
export function mapLabelsToCategory(labels: LabelWithConfidence[]): CategoryScore {
    const scores: Record<string, number> = {};

    for (const entry of CATEGORY_ENTRIES) {
        let score = 0;
        for (const label of labels) {
            const lowerLabel = label.identifier.toLowerCase();
            // Fast path: exact match in set
            if (entry.keywords.has(lowerLabel)) {
                score += label.confidence;
                continue;
            }
            // Slow path: regex for partial matches (e.g., "living room" in "modern living room")
            for (const pattern of entry.patterns) {
                if (pattern.test(lowerLabel)) {
                    score += label.confidence;
                    break;
                }
            }
        }
        scores[entry.category] = score;
    }

    let bestCategory: SmartCategory = "Other";
    let bestScore = 0.3; // minimum threshold

    for (const entry of CATEGORY_ENTRIES) {
        if (scores[entry.category] > bestScore) {
            bestScore = scores[entry.category];
            bestCategory = entry.category;
        }
    }

    return { category: bestCategory, score: bestScore };
}

/**
 * Simple string-based category mapping (legacy, for backward compat with classifyImage).
 * Converts string labels to LabelWithConfidence format and delegates.
 */
export function mapLabelsToCategoySimple(labels: string[]): SmartCategory {
    const labelsWithConfidence: LabelWithConfidence[] = labels.map(l => ({
        identifier: l,
        confidence: 1.0
    }));
    return mapLabelsToCategory(labelsWithConfidence).category;
}

export function matchesCustomQuery(labels: LabelWithConfidence[], query: string): boolean {
    if (!query) return false;
    const normalizedQuery = query.toLowerCase().trim();
    return labels.some(label => label.identifier.toLowerCase().includes(normalizedQuery));
}

/**
 * Legacy matchesCustomQuery for string labels.
 */
export function matchesCustomQuerySimple(labels: string[], query: string): boolean {
    if (!query) return false;
    const normalizedQuery = query.toLowerCase().trim();
    return labels.some(label => label.toLowerCase().includes(normalizedQuery));
}
