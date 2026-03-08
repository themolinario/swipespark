import { AnimatedScanner } from "@/components/ui/animated-scanner";
import { FuturisticHomeBackground } from "@/components/ui/futuristic-home-background";
import { GlassView } from "@/components/ui/glass-view";
import { classifyImage } from "@/modules/image-classifier";
import { usePhotoStore } from "@/stores/photo-store";
import { mapLabelsToCategory, matchesCustomQuery, SmartCategory } from "@/utils/category-mapper";
import { Users, Image as ImageIcon, FileText, PawPrint, Utensils, Car, Home, Search, ArrowLeft, CheckCircle, Circle, Wand2 } from "lucide-react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as MediaLibrary from "expo-media-library";
import { router } from "expo-router";
import { useState } from "react";
import {
    FlatList,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type WizardStep = "SELECT_CATEGORY" | "ENTER_CUSTOM_QUERY" | "SCANNING" | "REVIEW_RESULTS";

const CATEGORIES: { label: SmartCategory; Icon: any }[] = [
    { label: "People", Icon: Users },
    { label: "Landscapes", Icon: ImageIcon },
    { label: "Documents", Icon: FileText },
    { label: "Animals", Icon: PawPrint },
    { label: "Food", Icon: Utensils },
    { label: "Vehicles", Icon: Car },
    { label: "Interiors", Icon: Home },
    { label: "Custom", Icon: Search },
];

const CHUNK_SIZE = 100;
const CONCURRENT_BATCH_SIZE = 10;

export default function SmartCleanScreen() {
    const insets = useSafeAreaInsets();

    const [step, setStep] = useState<WizardStep>("SELECT_CATEGORY");
    const [selectedCategory, setSelectedCategory] = useState<SmartCategory | null>(null);
    const [customQuery, setCustomQuery] = useState("");

    const [progress, setProgress] = useState(0);
    const [matchedPhotos, setMatchedPhotos] = useState<MediaLibrary.Asset[]>([]);
    const [selectedForDeletion, setSelectedForDeletion] = useState<Set<string>>(new Set());

    const addDeletionPhoto = usePhotoStore((state) => state.addDeletionPhoto);
    const isPhotoKept = usePhotoStore((state) => state.isPhotoKept);
    const isPhotoMarkedForDeletion = usePhotoStore((state) => state.isPhotoMarkedForDeletion);

    const startScan = async (category: SmartCategory) => {
        setSelectedCategory(category);
        if (category === "Custom") {
            setStep("ENTER_CUSTOM_QUERY");
        } else {
            await runScan(category);
        }
    };

    const runScan = async (category: SmartCategory) => {
        setStep("SCANNING");
        setProgress(0);
        setMatchedPhotos([]);
        setSelectedForDeletion(new Set());

        try {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== "granted") {
                setStep("SELECT_CATEGORY");
                return;
            }

            let hasNextPage = true;
            let endCursor: string | undefined = undefined;
            const found: MediaLibrary.Asset[] = [];
            let totalProcessed = 0;

            const initialPage = await MediaLibrary.getAssetsAsync({ first: 1 });
            const totalAssetsEstimate = initialPage.totalCount;

            while (hasNextPage) {
                const page = await MediaLibrary.getAssetsAsync({
                    first: CHUNK_SIZE,
                    after: endCursor,
                    mediaType: "photo",
                    sortBy: ["modificationTime"],
                });

                const validAssetsToScan = page.assets.filter(asset => {
                    if (isPhotoKept(asset.id) || isPhotoMarkedForDeletion(asset.id)) {
                        totalProcessed++;
                        return false;
                    }
                    if (asset.width < 300 || asset.height < 300) {
                        totalProcessed++;
                        return false;
                    }
                    return true;
                });

                setProgress(Math.min((totalProcessed / totalAssetsEstimate) * 100, 100));

                for (let i = 0; i < validAssetsToScan.length; i += CONCURRENT_BATCH_SIZE) {
                    const batch = validAssetsToScan.slice(i, i + CONCURRENT_BATCH_SIZE);

                    const batchPromises = batch.map(async (asset) => {
                        try {
                            const assetInfo = await MediaLibrary.getAssetInfoAsync(asset);
                            const uri = assetInfo.localUri || assetInfo.uri;
                            if (!uri) return null;

                            const labels = await classifyImage(uri);

                            let isMatch: boolean;
                            if (category === "Custom") {
                                isMatch = matchesCustomQuery(labels, customQuery);
                            } else {
                                const identifiedCategory = mapLabelsToCategory(labels);
                                isMatch = identifiedCategory === category;
                            }

                            if (isMatch) {
                                return asset;
                            }
                        } catch (e) {
                            console.warn("Failed to classify image:", asset.id, e);
                        }
                        return null;
                    });

                    const batchResults = await Promise.all(batchPromises);
                    const matchedInBatch = batchResults.filter((a): a is MediaLibrary.Asset => a !== null);
                    found.push(...matchedInBatch);

                    totalProcessed += batch.length;

                    await new Promise(resolve => setTimeout(resolve, 0));
                    setProgress(Math.min((totalProcessed / totalAssetsEstimate) * 100, 100));
                }

                hasNextPage = page.hasNextPage;
                endCursor = page.endCursor;

                if (found.length >= 50) {
                    break;
                }
            }

            setMatchedPhotos(found);

            const newSelected = new Set<string>();
            found.forEach((p: MediaLibrary.Asset) => newSelected.add(p.id));
            setSelectedForDeletion(newSelected);

        } catch (e) {
            console.error("Scan error:", e);
        } finally {
            setStep("REVIEW_RESULTS");
        }
    };

    const toggleSelection = (id: string) => {
        const newSelected = new Set(selectedForDeletion);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedForDeletion(newSelected);
    };

    const confirmDeletion = () => {
        const photosToDelete = matchedPhotos.filter(p => selectedForDeletion.has(p.id));
        photosToDelete.forEach(p => {
            addDeletionPhoto(p);
        });

        setStep("SELECT_CATEGORY");
        setMatchedPhotos([]);
        setSelectedForDeletion(new Set());

        router.push("/delete");
    };

    // ─── SELECT CATEGORY ────────────────────────────────────────
    if (step === "SELECT_CATEGORY") {
        return (
            <FuturisticHomeBackground style={styles.container}>
                <ScrollView
                    style={[styles.container, { paddingTop: insets.top }]}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.headerTextContainer}>
                        <View style={styles.headerRow}>
                            <View style={styles.headerIconGlow}>
                                <Wand2 size={24} color="#4ade80" />
                            </View>
                            <Text style={styles.title} numberOfLines={2}>Smart Cleanup</Text>
                        </View>
                        <Text style={styles.subtitle} numberOfLines={3}>
                            Choose a category to automatically find and clean up photos.
                        </Text>
                    </View>

                    {/* Neon separator */}
                    <LinearGradient
                        colors={["rgba(74,222,128,0)", "rgba(74,222,128,0.4)", "rgba(74,222,128,0)"]}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 1, y: 0.5 }}
                        style={styles.separator}
                    />

                    <View style={styles.categoryGrid}>
                        {CATEGORIES.map((cat) => (
                            <Pressable
                                key={cat.label}
                                style={({ pressed }) => [
                                    styles.categoryCard,
                                    pressed && styles.categoryCardPressed,
                                ]}
                                onPress={() => startScan(cat.label)}
                            >
                                <View style={styles.categoryIconWrapper}>
                                    <cat.Icon size={32} color="#4ade80" />
                                </View>
                                <Text style={styles.categoryLabel}>{cat.label}</Text>
                            </Pressable>
                        ))}
                    </View>
                </ScrollView>
            </FuturisticHomeBackground>
        );
    }

    // ─── CUSTOM QUERY ───────────────────────────────────────────
    if (step === "ENTER_CUSTOM_QUERY") {
        return (
            <FuturisticHomeBackground style={styles.container}>
                <View style={[styles.innerContainer, { paddingTop: insets.top }]}>
                    <View style={styles.header}>
                        <Pressable onPress={() => setStep("SELECT_CATEGORY")} style={styles.backButton}>
                            <ArrowLeft size={22} color="#4ade80" />
                        </Pressable>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.title} numberOfLines={2}>Custom Search</Text>
                            <Text style={styles.subtitle} numberOfLines={3}>
                                Describe what you want to find (e.g. &quot;Pizza&quot;, &quot;Sunset&quot;, &quot;Car&quot;).
                            </Text>
                        </View>
                    </View>

                    <LinearGradient
                        colors={["rgba(74,222,128,0)", "rgba(74,222,128,0.4)", "rgba(74,222,128,0)"]}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 1, y: 0.5 }}
                        style={styles.separator}
                    />

                    <View style={styles.customQueryContainer}>
                        <TextInput
                            style={styles.textInput}
                            placeholder="Enter a keyword..."
                            placeholderTextColor="rgba(255,255,255,0.3)"
                            value={customQuery}
                            onChangeText={setCustomQuery}
                            autoFocus
                            returnKeyType="search"
                            onSubmitEditing={() => runScan("Custom")}
                        />
                        <Pressable
                            style={({ pressed }) => [
                                styles.primaryButton,
                                { opacity: customQuery.trim().length > 0 ? (pressed ? 0.8 : 1) : 0.4 },
                            ]}
                            disabled={customQuery.trim().length === 0}
                            onPress={() => runScan("Custom")}
                        >
                            <Search size={18} color="#fff" />
                            <Text style={styles.primaryButtonText}>Search</Text>
                        </Pressable>
                    </View>
                </View>
            </FuturisticHomeBackground>
        );
    }

    // ─── SCANNING ───────────────────────────────────────────────
    if (step === "SCANNING") {
        return (
            <FuturisticHomeBackground style={[styles.container, styles.centerAll]}>
                <View style={styles.scannerGlow}>
                    <AnimatedScanner color="#4ade80" />
                </View>
                <Text style={styles.scanningTitle}>
                    Scanning for {selectedCategory === "Custom" ? `"${customQuery}"` : selectedCategory}...
                </Text>
                <Text style={styles.scanningSubtitle}>
                    {Math.round(progress)}% complete
                </Text>
                {progress > 0 && progress < 100 && (
                    <View style={styles.progressBarContainer}>
                        <LinearGradient
                            colors={["#4ade80", "#38E0D2", "#2dd4bf"]}
                            start={{ x: 0, y: 0.5 }}
                            end={{ x: 1, y: 0.5 }}
                            style={[styles.progressBar, { width: `${progress}%` }]}
                        />
                    </View>
                )}
            </FuturisticHomeBackground>
        );
    }

    // ─── REVIEW RESULTS ─────────────────────────────────────────
    return (
        <FuturisticHomeBackground style={styles.container}>
            <View style={[styles.innerContainer, { paddingTop: insets.top }]}>
                <View style={styles.header}>
                    <Pressable onPress={() => setStep("SELECT_CATEGORY")} style={styles.backButton}>
                        <ArrowLeft size={22} color="#4ade80" />
                    </Pressable>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.title} numberOfLines={2}>
                            Review {selectedCategory === "Custom" ? `"${customQuery}"` : selectedCategory}
                        </Text>
                        <Text style={styles.subtitle} numberOfLines={3}>
                            Found {matchedPhotos.length} photos. Deselect any you want to keep.
                        </Text>
                    </View>
                </View>

                <LinearGradient
                    colors={["rgba(74,222,128,0)", "rgba(74,222,128,0.4)", "rgba(74,222,128,0)"]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.separator}
                />

                {matchedPhotos.length === 0 ? (
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIconGlow}>
                            <CheckCircle size={72} color="#4ade80" />
                        </View>
                        <Text style={styles.emptyLabel}>No matching photos found.</Text>
                        <Pressable
                            style={styles.primaryButton}
                            onPress={() => setStep("SELECT_CATEGORY")}
                        >
                            <ArrowLeft size={18} color="#fff" />
                            <Text style={styles.primaryButtonText}>Go Back</Text>
                        </Pressable>
                    </View>
                ) : (
                    <>
                        <FlatList
                            data={matchedPhotos}
                            keyExtractor={(item) => item.id}
                            numColumns={3}
                            contentContainerStyle={styles.gridContent}
                            renderItem={({ item }) => {
                                const selected = selectedForDeletion.has(item.id);
                                return (
                                    <TouchableOpacity
                                        style={styles.gridItemWrapper}
                                        onPress={() => toggleSelection(item.id)}
                                        activeOpacity={0.8}
                                    >
                                        <View style={[styles.gridImageWrapper, selected && styles.gridImageWrapperSelected]}>
                                            <Image
                                                source={{ uri: item.uri }}
                                                style={[styles.gridImage, selected && styles.gridImageSelected]}
                                                contentFit="cover"
                                                transition={200}
                                            />
                                        </View>
                                        <View style={styles.checkboxContainer}>
                                            {selected ? (
                                                <View style={styles.checkboxSelected}>
                                                    <CheckCircle size={18} color="#fff" />
                                                </View>
                                            ) : (
                                                <View style={styles.checkboxDefault}>
                                                    <Circle size={18} color="rgba(255,255,255,0.5)" />
                                                </View>
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                );
                            }}
                        />

                        <GlassView style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) + 70 }]}>
                            <Pressable
                                style={({ pressed }) => [
                                    styles.deleteFooterButton,
                                    { opacity: selectedForDeletion.size === 0 ? 0.4 : (pressed ? 0.8 : 1) },
                                ]}
                                disabled={selectedForDeletion.size === 0}
                                onPress={confirmDeletion}
                            >
                                <Text style={styles.deleteFooterButtonText}>
                                    Move {selectedForDeletion.size} to Trash
                                </Text>
                            </Pressable>
                        </GlassView>
                    </>
                )}
            </View>
        </FuturisticHomeBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    innerContainer: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
        flexGrow: 1,
    },
    centerAll: {
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },

    // ── Header ──────────────────────────────────────────────────
    header: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 8,
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 14,
    },
    headerTextContainer: {
        marginTop: 16,
        marginBottom: 0,
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginBottom: 2,
    },
    headerIconGlow: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "rgba(74,222,128,0.1)",
        borderWidth: 1,
        borderColor: "rgba(74,222,128,0.3)",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#4ade80",
        shadowOpacity: 0.4,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 0 },
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(74,222,128,0.1)",
        borderWidth: 1,
        borderColor: "rgba(74,222,128,0.3)",
        justifyContent: "center",
        alignItems: "center",
        marginTop: 4,
    },
    separator: {
        height: 1,
        marginHorizontal: 20,
        marginVertical: 14,
    },
    title: {
        fontSize: 28,
        fontWeight: "bold",
        color: "#fff",
        textShadowColor: "rgba(74,222,128,0.3)",
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10,
    },
    subtitle: {
        fontSize: 14,
        marginTop: 0,
        color: "rgba(255,255,255,0.45)",
        lineHeight: 18,
    },

    // ── Category Grid ───────────────────────────────────────────
    categoryGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
        justifyContent: "center",
        paddingHorizontal: 4,
    },
    categoryCard: {
        width: "46%",
        aspectRatio: 1.15,
        borderRadius: 16,
        justifyContent: "center",
        alignItems: "center",
        paddingBottom: 20,
        backgroundColor: "rgba(74,222,128,0.04)",
        borderWidth: 1,
        borderColor: "rgba(74,222,128,0.15)",
    },
    categoryCardPressed: {
        backgroundColor: "rgba(74,222,128,0.12)",
        borderColor: "rgba(74,222,128,0.4)",
    },
    categoryIconWrapper: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: "rgba(74,222,128,0.08)",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 10,
    },
    categoryLabel: {
        fontSize: 15,
        fontWeight: "600",
        color: "rgba(255,255,255,0.8)",
    },

    // ── Custom Query ────────────────────────────────────────────
    customQueryContainer: {
        paddingHorizontal: 20,
        gap: 16,
    },
    textInput: {
        fontSize: 16,
        padding: 16,
        borderWidth: 1,
        borderRadius: 14,
        borderColor: "rgba(74,222,128,0.3)",
        backgroundColor: "rgba(74,222,128,0.05)",
        color: "#fff",
    },
    primaryButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 14,
        paddingHorizontal: 28,
        borderRadius: 24,
        backgroundColor: "rgba(74,222,128,0.15)",
        borderWidth: 1,
        borderColor: "rgba(74,222,128,0.5)",
        shadowColor: "#4ade80",
        shadowOpacity: 0.3,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 0 },
    },
    primaryButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
        letterSpacing: 0.5,
    },

    // ── Scanning ────────────────────────────────────────────────
    scannerGlow: {
        shadowColor: "#4ade80",
        shadowOpacity: 0.4,
        shadowRadius: 30,
        shadowOffset: { width: 0, height: 0 },
    },
    scanningTitle: {
        fontSize: 22,
        fontWeight: "bold",
        color: "#fff",
        marginTop: 32,
        textShadowColor: "rgba(74,222,128,0.3)",
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 8,
    },
    scanningSubtitle: {
        fontSize: 14,
        marginTop: 8,
        color: "rgba(74,222,128,0.6)",
    },
    progressBarContainer: {
        width: "80%",
        height: 6,
        backgroundColor: "rgba(74,222,128,0.1)",
        borderRadius: 3,
        marginTop: 24,
        overflow: "hidden",
    },
    progressBar: {
        height: "100%",
        borderRadius: 3,
    },

    // ── Review Grid ─────────────────────────────────────────────
    gridContent: {
        padding: 4,
        paddingBottom: 160,
    },
    gridItemWrapper: {
        flex: 1 / 3,
        aspectRatio: 1,
        padding: 2,
    },
    gridImageWrapper: {
        flex: 1,
        borderRadius: 10,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "rgba(74,222,128,0.12)",
    },
    gridImageWrapperSelected: {
        borderColor: "rgba(74,222,128,0.6)",
        shadowColor: "#4ade80",
        shadowOpacity: 0.4,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 0 },
    },
    gridImage: {
        width: "100%",
        height: "100%",
    },
    gridImageSelected: {
        opacity: 0.65,
    },
    checkboxContainer: {
        position: "absolute",
        bottom: 8,
        right: 8,
    },
    checkboxSelected: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: "#4ade80",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#4ade80",
        shadowOpacity: 0.6,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 0 },
    },
    checkboxDefault: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "center",
        alignItems: "center",
    },

    // ── Footer ──────────────────────────────────────────────────
    footer: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        paddingTop: 20,
        paddingHorizontal: 20,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    deleteFooterButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 16,
        borderRadius: 14,
        backgroundColor: "#ff3b30",
        shadowColor: "#ff3b30",
        shadowOpacity: 0.4,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 0 },
    },
    deleteFooterButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },

    // ── Empty State ─────────────────────────────────────────────
    emptyState: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: 16,
    },
    emptyIconGlow: {
        padding: 20,
        borderRadius: 60,
        backgroundColor: "transparent",
        shadowColor: "#4ade80",
        shadowOpacity: 0.4,
        shadowRadius: 30,
        shadowOffset: { width: 0, height: 0 },
    },
    emptyLabel: {
        fontSize: 17,
        color: "rgba(255,255,255,0.5)",
        marginTop: 8,
    },
});
