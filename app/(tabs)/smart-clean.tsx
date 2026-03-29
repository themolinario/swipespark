import { AnimatedScanner } from "@/components/ui/animated-scanner";
import { Button } from "@/components/ui/button";
import { PhotoPreviewModal } from "@/components/photo-preview-modal";
import { FuturisticHomeBackground } from "@/components/ui/futuristic-home-background";
import { classifyImages } from "@/modules/image-classifier";
import { useClassificationCache, CachedLabel } from "@/stores/classification-cache";
import { usePhotoStore } from "@/stores/photo-store";
import { PhotoAsset } from "@/services/media-library.service";
import { mapLabelsToCategory, matchesCustomQuery, SmartCategory, LabelWithConfidence } from "@/utils/category-mapper";
import { Users, Image as ImageIcon, FileText, PawPrint, Utensils, Car, Home, Search, ArrowLeft, Check, Wand2, X, Trash2, Square } from "lucide-react-native";
import { Image } from "expo-image";
import * as MediaLibrary from "expo-media-library";
import { router } from "expo-router";
import { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

type WizardStep = "SELECT_CATEGORY" | "ENTER_CUSTOM_QUERY" | "SCANNING" | "REVIEW_RESULTS";

type CategoryLabelKey = "smart.categoryPeople" | "smart.categoryLandscapes" | "smart.categoryDocuments" | "smart.categoryAnimals" | "smart.categoryFood" | "smart.categoryVehicles" | "smart.categoryInteriors" | "smart.categoryCustom";

const CATEGORIES: { label: SmartCategory; labelKey: CategoryLabelKey; Icon: any }[] = [
    { label: "People", labelKey: "smart.categoryPeople", Icon: Users },
    { label: "Landscapes", labelKey: "smart.categoryLandscapes", Icon: ImageIcon },
    { label: "Documents", labelKey: "smart.categoryDocuments", Icon: FileText },
    { label: "Animals", labelKey: "smart.categoryAnimals", Icon: PawPrint },
    { label: "Food", labelKey: "smart.categoryFood", Icon: Utensils },
    { label: "Vehicles", labelKey: "smart.categoryVehicles", Icon: Car },
    { label: "Interiors", labelKey: "smart.categoryInteriors", Icon: Home },
    { label: "Custom", labelKey: "smart.categoryCustom", Icon: Search },
];

const FETCH_PAGE_SIZE = 500;
const NATIVE_BATCH_SIZE = 50;
const DISPLAY_BATCH_SIZE = 15;

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const COLUMN_COUNT = 3;
const GAP = 3;
const ITEM_SIZE = (SCREEN_WIDTH - GAP * (COLUMN_COUNT + 1)) / COLUMN_COUNT;

export function SmartCleanContent({ onBack }: { onBack?: () => void }) {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const tabBarHeight = useBottomTabBarHeight();

    const [step, setStep] = useState<WizardStep>("SELECT_CATEGORY");
    const [selectedCategory, setSelectedCategory] = useState<SmartCategory | null>(null);
    const [customQuery, setCustomQuery] = useState("");

    const [progress, setProgress] = useState(0);
    const [scanStatusText, setScanStatusText] = useState("");
    const [matchedPhotos, setMatchedPhotos] = useState<MediaLibrary.Asset[]>([]);
    const [selectedForDeletion, setSelectedForDeletion] = useState<Set<string>>(new Set());
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [scanComplete, setScanComplete] = useState(false);

    const [isSelectMode, setIsSelectMode] = useState(false);
    const [previewIndex, setPreviewIndex] = useState<number | null>(null);
    const [isScrollingDisabled, setIsScrollingDisabled] = useState(false);

    const addDeletionPhoto = usePhotoStore((state) => state.addDeletionPhoto);
    const isPhotoKept = usePhotoStore((state) => state.isPhotoKept);
    const isPhotoMarkedForDeletion = usePhotoStore((state) => state.isPhotoMarkedForDeletion);

    const getCachedLabels = useClassificationCache((s) => s.getCachedLabels);
    const setCachedLabelsBatch = useClassificationCache((s) => s.setCachedLabelsBatch);

    const scanIdRef = useRef(0);
    const endCursorRef = useRef<string | undefined>(undefined);
    const hasNextPageRef = useRef(true);
    const totalProcessedRef = useRef(0);
    const totalAssetsEstimateRef = useRef(0);
    const categoryRef = useRef<SmartCategory | null>(null);
    const customQueryRef = useRef("");

    const isDragging = useRef(false);
    const scrollOffset = useRef(0);
    const startDragIndex = useRef<number | null>(null);
    const lastToggledIndex = useRef<number | null>(null);
    const isSelectingRef = useRef(true);
    const flatListRef = useRef<FlatList>(null);
    const listContainerRef = useRef<View>(null);
    const scrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
    const currentTouchY = useRef(0);
    const currentTouchX = useRef(0);
    const listStartY = useRef(0);

    const checkMatch = useCallback((category: SmartCategory, labels: LabelWithConfidence[]): boolean => {
        if (category === "Custom") {
            return matchesCustomQuery(labels, customQueryRef.current);
        }
        const result = mapLabelsToCategory(labels);
        return result.category === category;
    }, []);

    const loadNextBatch = useCallback(async (category: SmartCategory, scanId: number) => {
        if (!hasNextPageRef.current || scanId !== scanIdRef.current) return;

        setIsLoadingMore(true);
        let newlyFoundCount = 0;
        const totalEstimate = totalAssetsEstimateRef.current;

        try {
            while (hasNextPageRef.current && scanId === scanIdRef.current) {
                const page = await MediaLibrary.getAssetsAsync({
                    first: FETCH_PAGE_SIZE,
                    after: endCursorRef.current,
                    mediaType: "photo",
                    sortBy: ["modificationTime"],
                });

                if (scanId !== scanIdRef.current) break;

                const validAssets = page.assets.filter(asset => {
                    if (isPhotoKept(asset.id) || isPhotoMarkedForDeletion(asset.id)) {
                        totalProcessedRef.current++;
                        return false;
                    }
                    if (asset.width < 300 || asset.height < 300) {
                        totalProcessedRef.current++;
                        return false;
                    }
                    return true;
                });

                const cachedAssets: { asset: MediaLibrary.Asset; labels: LabelWithConfidence[] }[] = [];
                const uncachedAssets: MediaLibrary.Asset[] = [];

                for (const asset of validAssets) {
                    const cached = getCachedLabels(asset.id);
                    if (cached && cached.length > 0) {
                        cachedAssets.push({ asset, labels: cached });
                    } else {
                        uncachedAssets.push(asset);
                    }
                }

                const cachedMatches: MediaLibrary.Asset[] = [];
                for (const { asset, labels } of cachedAssets) {
                    totalProcessedRef.current++;
                    if (checkMatch(category, labels)) {
                        cachedMatches.push(asset);
                    }
                }
                if (cachedMatches.length > 0) {
                    newlyFoundCount += cachedMatches.length;
                    setMatchedPhotos(prev => [...prev, ...cachedMatches]);
                }

                for (let i = 0; i < uncachedAssets.length && scanId === scanIdRef.current; i += NATIVE_BATCH_SIZE) {
                    const batch = uncachedAssets.slice(i, i + NATIVE_BATCH_SIZE);
                    const uris = batch.map(a => a.uri);

                    try {
                        const results = await classifyImages(uris);

                        if (scanId !== scanIdRef.current) break;

                        const cacheEntries: { assetId: string; labels: CachedLabel[] }[] = [];
                        const batchMatches: MediaLibrary.Asset[] = [];

                        for (let j = 0; j < results.length; j++) {
                            const result = results[j];
                            const asset = batch[j];
                            if (!result || !asset) continue;

                            const labels: LabelWithConfidence[] = (result.labels || []).map(l => ({
                                identifier: l.identifier,
                                confidence: l.confidence,
                            }));

                            if (labels.length > 0) {
                                cacheEntries.push({ assetId: asset.id, labels });
                            }

                            if (checkMatch(category, labels)) {
                                batchMatches.push(asset);
                            }

                            totalProcessedRef.current++;
                        }

                        if (cacheEntries.length > 0) {
                            setCachedLabelsBatch(cacheEntries);
                        }

                        if (batchMatches.length > 0) {
                            newlyFoundCount += batchMatches.length;
                            setMatchedPhotos(prev => [...prev, ...batchMatches]);
                        }
                    } catch (e) {
                        console.error("[SmartClean] Batch classification FAILED:", e);
                        totalProcessedRef.current += batch.length;
                    }

                    if (scanId !== scanIdRef.current) break;

                    const progressPct = Math.min((totalProcessedRef.current / totalEstimate) * 100, 99);
                    setProgress(progressPct);
                    setScanStatusText(t("smart.scanProgress", { processed: totalProcessedRef.current, total: totalEstimate, found: newlyFoundCount }));

                    await new Promise(resolve => setTimeout(resolve, 0));
                }

                hasNextPageRef.current = page.hasNextPage;
                endCursorRef.current = page.endCursor;

                if (newlyFoundCount >= DISPLAY_BATCH_SIZE || !hasNextPageRef.current) {
                    break;
                }
            }

            if (scanId !== scanIdRef.current) return;

            if (!hasNextPageRef.current) {
                setScanComplete(true);
                setProgress(100);
            }

            setStep("REVIEW_RESULTS");

        } catch (e) {
            console.error("Scan error:", e);
            if (scanId === scanIdRef.current) setStep("REVIEW_RESULTS");
        } finally {
            if (scanId === scanIdRef.current) setIsLoadingMore(false);
        }
    }, [checkMatch, getCachedLabels, setCachedLabelsBatch, isPhotoKept, isPhotoMarkedForDeletion]);

    const cancelScan = useCallback(() => {
        scanIdRef.current += 1;
    }, []);

    const runScan = async (category: SmartCategory) => {
        scanIdRef.current += 1;
        const scanId = scanIdRef.current;

        setStep("SCANNING");
        setProgress(0);
        setScanStatusText(t("smart.requestingPermissions"));
        setMatchedPhotos([]);
        setSelectedForDeletion(new Set());
        setScanComplete(false);
        setIsSelectMode(false);

        endCursorRef.current = undefined;
        hasNextPageRef.current = true;
        totalProcessedRef.current = 0;
        totalAssetsEstimateRef.current = 0;
        categoryRef.current = category;
        customQueryRef.current = customQuery;

        try {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (scanId !== scanIdRef.current) return;
            // RALPH FIX [BUG1]: On Android 14+ with READ_MEDIA_VISUAL_USER_SELECTED declared, limited
            // photo access returns status "limited" (not in the PermissionStatus enum but valid at
            // runtime). On iOS 14+ limited access also returns "limited". The previous strict
            // status !== "granted" check caused Smart Clean to silently abort for any user who had
            // granted limited access, making the feature appear completely broken on Android/iOS 14+.
            if (status !== "granted" && (status as string) !== "limited") {
                console.error("[SmartClean] Permission denied or undetermined:", status);
                setStep("SELECT_CATEGORY");
                return;
            }

            useClassificationCache.getState().clearAll();

            const initialPage = await MediaLibrary.getAssetsAsync({ first: 1, mediaType: "photo" });
            if (scanId !== scanIdRef.current) return;

            totalAssetsEstimateRef.current = initialPage.totalCount;
            setScanStatusText(t("smart.scanningPhotos", { count: initialPage.totalCount }));

            await loadNextBatch(category, scanId);
        } catch (e) {
            console.error("Scan error:", e);
            if (scanId === scanIdRef.current) setStep("REVIEW_RESULTS");
        }
    };

    const startScan = async (category: SmartCategory) => {
        setSelectedCategory(category);
        if (category === "Custom") {
            setStep("ENTER_CUSTOM_QUERY");
        } else {
            await runScan(category);
        }
    };

    const handleEndReached = useCallback(() => {
        if (!isLoadingMore && !scanComplete && categoryRef.current) {
            loadNextBatch(categoryRef.current, scanIdRef.current);
        }
    }, [isLoadingMore, scanComplete, loadNextBatch]);

    const toggleSelectMode = useCallback(() => {
        setIsSelectMode(prev => !prev);
        setSelectedForDeletion(new Set());
    }, []);

    const handleSelectAll = useCallback(() => {
        if (selectedForDeletion.size === matchedPhotos.length) {
            setSelectedForDeletion(new Set());
        } else {
            setSelectedForDeletion(new Set(matchedPhotos.map(p => p.id)));
        }
    }, [selectedForDeletion.size, matchedPhotos]);

    const handleToggleSelect = useCallback((id: string) => {
        setSelectedForDeletion(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const getIndexFromCoordinates = useCallback((x: number, y: number) => {
        const contentY = y + scrollOffset.current;
        if (contentY < 0) return null;
        const relativeX = x - GAP;
        if (relativeX < 0) return null;
        const row = Math.floor(contentY / (ITEM_SIZE + GAP));
        const col = Math.floor(relativeX / (ITEM_SIZE + GAP));
        if (col >= COLUMN_COUNT) return null;
        const index = row * COLUMN_COUNT + col;
        return index >= 0 && index < matchedPhotos.length ? index : null;
    }, [matchedPhotos.length]);

    const handleDragStart = useCallback((x: number, y: number) => {
        isDragging.current = true;
        setIsScrollingDisabled(true);
        const index = getIndexFromCoordinates(x, y);
        if (index !== null) {
            startDragIndex.current = index;
            lastToggledIndex.current = index;
            const photo = matchedPhotos[index];
            setSelectedForDeletion(prev => {
                const next = new Set(prev);
                if (next.has(photo.id)) {
                    next.delete(photo.id);
                    isSelectingRef.current = false;
                } else {
                    next.add(photo.id);
                    isSelectingRef.current = true;
                }
                return next;
            });
        }
    }, [getIndexFromCoordinates, matchedPhotos]);

    const handleDragUpdate = useCallback((x: number, y: number) => {
        if (!isDragging.current) return;
        currentTouchX.current = x;
        currentTouchY.current = y;
        const currentIndex = getIndexFromCoordinates(x, y);
        if (currentIndex !== null && currentIndex !== lastToggledIndex.current && startDragIndex.current !== null) {
            const minIdx = Math.min(startDragIndex.current, currentIndex);
            const maxIdx = Math.max(startDragIndex.current, currentIndex);
            setSelectedForDeletion(prev => {
                const next = new Set(prev);
                for (let i = minIdx; i <= maxIdx; i++) {
                    const p = matchedPhotos[i];
                    if (p) {
                        if (isSelectingRef.current) next.add(p.id);
                        else next.delete(p.id);
                    }
                }
                return next;
            });
            lastToggledIndex.current = currentIndex;
        }
    }, [getIndexFromCoordinates, matchedPhotos]);

    const handleDragEnd = useCallback(() => {
        isDragging.current = false;
        setIsScrollingDisabled(false);
        startDragIndex.current = null;
        lastToggledIndex.current = null;
        if (scrollTimer.current) {
            clearInterval(scrollTimer.current);
            scrollTimer.current = null;
        }
    }, []);

    const autoScroll = useCallback(() => {
        if (!isDragging.current || !flatListRef.current) return;
        const y = currentTouchY.current;
        const x = currentTouchX.current;
        const SCROLL_ZONE = 80;
        const SCROLL_SPEED = 15;
        const listHeight = Dimensions.get("window").height - listStartY.current - insets.top;
        if (y < SCROLL_ZONE) {
            const newOffset = Math.max(0, scrollOffset.current - SCROLL_SPEED);
            flatListRef.current.scrollToOffset({ offset: newOffset, animated: false });
            handleDragUpdate(x, y - SCROLL_SPEED);
        } else if (y > listHeight - SCROLL_ZONE) {
            const newOffset = scrollOffset.current + SCROLL_SPEED;
            flatListRef.current.scrollToOffset({ offset: newOffset, animated: false });
            handleDragUpdate(x, y + SCROLL_SPEED);
        }
    }, [handleDragUpdate, insets.top]);

    const panGesture = Gesture.Pan()
        .enabled(isSelectMode)
        .activeOffsetX([-10, 10])
        .failOffsetY([-20, 20])
        .runOnJS(true)
        .onStart((e) => {
            handleDragStart(e.x, e.y);
            if (!scrollTimer.current) {
                scrollTimer.current = setInterval(autoScroll, 16);
            }
        })
        .onUpdate((e) => handleDragUpdate(e.x, e.y))
        .onEnd(() => handleDragEnd())
        .onFinalize(() => handleDragEnd());

    const confirmDeletion = useCallback(() => {
        scanIdRef.current += 1;
        const photosToDelete = matchedPhotos.filter(p => selectedForDeletion.has(p.id));
        photosToDelete.forEach(p => addDeletionPhoto(p as unknown as PhotoAsset));
        if (categoryRef.current && categoryRef.current !== "Custom") {
            const { useAchievementStore } = require("@/stores/achievement-store");
            useAchievementStore.getState().recordSmartCleanCategory(categoryRef.current);
        }
        setStep("SELECT_CATEGORY");
        setMatchedPhotos([]);
        setSelectedForDeletion(new Set());
        setIsSelectMode(false);
        router.push("/delete");
    }, [matchedPhotos, selectedForDeletion, addDeletionPhoto]);

    const renderListFooter = useCallback(() => {
        if (!isLoadingMore) return null;
        return (
            <View style={styles.loadingFooter}>
                <ActivityIndicator color="#4ade80" size="small" />
                <Text style={styles.loadingFooterText}>{t("smart.searchingMore")}</Text>
            </View>
        );
    }, [isLoadingMore]);

    const renderItem = useCallback(({ item, index }: { item: MediaLibrary.Asset; index: number }) => {
        const isSelected = selectedForDeletion.has(item.id);
        return (
            <Pressable
                style={styles.gridItemWrapper}
                onLongPress={() => {
                    if (!isSelectMode) {
                        setIsSelectMode(true);
                        handleToggleSelect(item.id);
                    }
                }}
                onPress={() => {
                    if (isSelectMode) {
                        handleToggleSelect(item.id);
                    } else {
                        setPreviewIndex(index);
                    }
                }}
            >
                <View style={[styles.gridImageWrapper, isSelected && styles.gridImageWrapperSelected]}>
                    <Image
                        source={{ uri: item.uri }}
                        style={[styles.gridImage, isSelected && styles.gridImageSelected]}
                        contentFit="cover"
                        transition={200}
                    />
                </View>
                {isSelectMode && (
                    <View style={[styles.checkCircle, isSelected && styles.checkCircleSelected]}>
                        {isSelected && <Check size={14} color="#fff" />}
                    </View>
                )}
            </Pressable>
        );
    }, [isSelectMode, selectedForDeletion, handleToggleSelect]);

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
                            {onBack && (
                                <Pressable testID="smartclean-back-button" onPress={onBack} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(74,222,128,0.1)", borderWidth: 1, borderColor: "rgba(74,222,128,0.3)", justifyContent: "center", alignItems: "center" }}>
                                    <ArrowLeft size={22} color="#4ade80" />
                                </Pressable>
                            )}
                            <View style={styles.headerIconGlow}>
                                <Wand2 size={24} color="#4ade80" />
                            </View>
                            <Text style={styles.title} numberOfLines={2}>{t("smart.title")}</Text>
                        </View>
                        <Text style={styles.subtitle} numberOfLines={3}>
                            {t("smart.subtitle")}
                        </Text>
                    </View>

                    <View style={[styles.separator, { experimental_backgroundImage: 'linear-gradient(to right, rgba(74,222,128,0), rgba(74,222,128,0.4), rgba(74,222,128,0))' }]} />

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
                                <Text style={styles.categoryLabel}>{t(cat.labelKey)}</Text>
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
                            <Text style={styles.title} numberOfLines={2}>{t("smart.customSearchTitle")}</Text>
                            <Text style={styles.subtitle} numberOfLines={3}>
                                {t("smart.customSearchSubtitle")}
                            </Text>
                        </View>
                    </View>

                    <View style={[styles.separator, { experimental_backgroundImage: 'linear-gradient(to right, rgba(74,222,128,0), rgba(74,222,128,0.4), rgba(74,222,128,0))' }]} />

                    <View style={styles.customQueryContainer}>
                        <TextInput
                            style={styles.textInput}
                            placeholder={t("smart.enterKeyword")}
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
                            <Text style={styles.primaryButtonText}>{t("smart.search")}</Text>
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
                    {selectedCategory === "Custom"
                        ? t("smart.scanningForCustom", { query: customQuery })
                        : t("smart.scanningFor", { category: t(CATEGORIES.find(c => c.label === selectedCategory)?.labelKey as CategoryLabelKey) })}
                </Text>
                <Text style={styles.scanningSubtitle}>
                    {t("smart.percentComplete", { percent: Math.round(progress) })}
                </Text>
                {scanStatusText ? (
                    <Text style={styles.scanningDetail}>{scanStatusText}</Text>
                ) : null}
                {progress > 0 && progress < 100 && (
                    <View style={styles.progressBarContainer}>
                        <View style={[styles.progressBar, { width: `${Math.min(progress, 100)}%`, experimental_backgroundImage: 'linear-gradient(to right, #4ade80, #38E0D2, #2dd4bf)' }]} />
                    </View>
                )}
                <Pressable
                    style={({ pressed }) => [styles.cancelButton, pressed && { opacity: 0.7 }]}
                    onPress={() => {
                        cancelScan();
                        setScanComplete(true);
                        setStep("REVIEW_RESULTS");
                    }}
                >
                    <Square size={16} color="#ff6b6b" />
                    <Text style={styles.cancelButtonText}>{t("common.stop")}</Text>
                </Pressable>
            </FuturisticHomeBackground>
        );
    }

    // ─── REVIEW RESULTS ─────────────────────────────────────────
    return (
        <FuturisticHomeBackground style={styles.container}>
            <View style={[styles.innerContainer, { paddingTop: insets.top }]}>
                <View style={styles.header}>
                    <Pressable onPress={() => { cancelScan(); setStep("SELECT_CATEGORY"); }} style={styles.backButton}>
                        <ArrowLeft size={22} color="#4ade80" />
                    </Pressable>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.title} numberOfLines={1}>
                            {isSelectMode
                                ? t("smart.selectedCount", { count: selectedForDeletion.size })
                                : (selectedCategory === "Custom" ? `"${customQuery}"` : t(CATEGORIES.find(c => c.label === selectedCategory)?.labelKey as CategoryLabelKey))}
                        </Text>
                        {!isSelectMode && (
                            <Text style={styles.subtitle} numberOfLines={1}>
                                {t("smart.photosFound", { count: matchedPhotos.length })}{!scanComplete ? t("smart.stillScanning") : ""}
                            </Text>
                        )}
                    </View>
                    {matchedPhotos.length > 0 && (
                        <View style={styles.headerButtons}>
                            {isSelectMode && (
                                <Pressable onPress={handleSelectAll} style={styles.selectButton}>
                                    <Text style={styles.selectButtonText}>
                                        {selectedForDeletion.size === matchedPhotos.length ? t("deleteScreen.deselectAll") : t("deleteScreen.selectAll")}
                                    </Text>
                                </Pressable>
                            )}
                            <Pressable onPress={toggleSelectMode} style={styles.selectButton}>
                                <Text style={styles.selectButtonText}>
                                    {isSelectMode ? t("common.cancel") : t("deleteScreen.select")}
                                </Text>
                            </Pressable>
                        </View>
                    )}
                </View>

                <View style={[styles.separator, { experimental_backgroundImage: 'linear-gradient(to right, rgba(74,222,128,0), rgba(74,222,128,0.4), rgba(74,222,128,0))' }]} />

                {matchedPhotos.length === 0 && scanComplete ? (
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIconGlow}>
                            <Search size={72} color="#4ade80" />
                        </View>
                        <Text style={styles.emptyLabel}>{t("smart.noMatchingPhotos")}</Text>
                        <Pressable
                            style={styles.primaryButton}
                            onPress={() => setStep("SELECT_CATEGORY")}
                        >
                            <ArrowLeft size={18} color="#fff" />
                            <Text style={styles.primaryButtonText}>{t("smart.goBack")}</Text>
                        </Pressable>
                    </View>
                ) : (
                    <>
                        <GestureDetector gesture={panGesture}>
                            <View style={styles.listContainer} ref={listContainerRef}>
                                <FlatList
                                    ref={flatListRef}
                                    data={matchedPhotos}
                                    keyExtractor={(item) => item.id}
                                    numColumns={COLUMN_COUNT}
                                    extraData={[selectedForDeletion, isSelectMode]}
                                    contentContainerStyle={[styles.gridContent, { paddingBottom: tabBarHeight + 130 }]}
                                    onLayout={(e) => { listStartY.current = e.nativeEvent.layout.y; }}
                                    onScroll={(e) => { scrollOffset.current = e.nativeEvent.contentOffset.y; }}
                                    scrollEventThrottle={16}
                                    scrollEnabled={!isScrollingDisabled}
                                    onEndReached={handleEndReached}
                                    onEndReachedThreshold={0.3}
                                    ListFooterComponent={renderListFooter}
                                    renderItem={renderItem}
                                />
                            </View>
                        </GestureDetector>

                        {isSelectMode && selectedForDeletion.size > 0 && (
                            <View style={[styles.deleteButtonContainer, { bottom: tabBarHeight + 52 }]}>
                                <Button
                                    onPress={confirmDeletion}
                                    title={t("smart.deletePhotos", { count: selectedForDeletion.size })}
                                    icon={<Trash2 size={20} color="#fff" />}
                                    style={styles.deleteButton}
                                    textStyle={styles.deleteButtonText}
                                    variant="danger"
                                />
                            </View>
                        )}
                    </>
                )}
            </View>

            <PhotoPreviewModal
                visible={previewIndex !== null}
                photos={matchedPhotos as unknown as PhotoAsset[]}
                initialIndex={previewIndex ?? 0}
                variant="view-only"
                onClose={() => setPreviewIndex(null)}
            />
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
    listContainer: {
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
        alignItems: "center",
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
        shadowColor: '#4ade80',
        shadowOffset: { width: 0, height: 0 },
        shadowRadius: 12,
        shadowOpacity: 0.4,
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
        flexShrink: 0,
    },
    headerButtons: {
        flexDirection: "row",
        gap: 8,
        alignItems: "center",
        flexShrink: 0,
    },
    selectButton: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
        borderCurve: 'continuous',
        backgroundColor: "rgba(74,222,128,0.1)",
        borderWidth: 1,
        borderColor: "rgba(74,222,128,0.3)",
    },
    selectButtonText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#4ade80",
    },
    separator: {
        height: 1,
        marginHorizontal: 20,
        marginVertical: 14,
    },
    title: {
        fontSize: 22,
        fontWeight: "bold",
        color: "#fff",
        textShadowColor: "rgba(74,222,128,0.3)",
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10,
    },
    subtitle: {
        fontSize: 14,
        marginTop: 2,
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
        borderCurve: 'continuous',
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
        borderCurve: 'continuous',
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
        borderCurve: 'continuous',
        backgroundColor: "rgba(74,222,128,0.15)",
        borderWidth: 1,
        borderColor: "rgba(74,222,128,0.5)",
        shadowColor: '#4ade80',
        shadowOffset: { width: 0, height: 0 },
        shadowRadius: 12,
        shadowOpacity: 0.3,
    },
    primaryButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
        letterSpacing: 0.5,
    },

    // ── Scanning ────────────────────────────────────────────────
    scannerGlow: {
        shadowColor: '#4ade80',
        shadowOffset: { width: 0, height: 0 },
        shadowRadius: 30,
        shadowOpacity: 0.4,
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
    scanningDetail: {
        fontSize: 12,
        marginTop: 4,
        color: "rgba(255,255,255,0.35)",
    },
    cancelButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginTop: 24,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 20,
        borderCurve: 'continuous',
        backgroundColor: "rgba(255,107,107,0.1)",
        borderWidth: 1,
        borderColor: "rgba(255,107,107,0.3)",
    },
    cancelButtonText: {
        color: "#ff6b6b",
        fontSize: 14,
        fontWeight: "600",
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
    },

    // ── Review Grid ─────────────────────────────────────────────
    gridContent: {
        paddingHorizontal: GAP,
    },
    gridItemWrapper: {
        width: ITEM_SIZE,
        height: ITEM_SIZE,
        margin: GAP / 2,
        overflow: "visible",
    },
    gridImageWrapper: {
        flex: 1,
        borderRadius: 10,
        borderCurve: 'continuous',
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "rgba(74,222,128,0.12)",
    },
    gridImageWrapperSelected: {
        borderColor: "rgba(74,222,128,0.6)",
    },
    gridImage: {
        width: "100%",
        height: "100%",
    },
    gridImageSelected: {
        opacity: 0.65,
    },
    checkCircle: {
        position: "absolute",
        bottom: 8,
        right: 8,
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: "rgba(255,255,255,0.5)",
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 10,
    },
    checkCircleSelected: {
        backgroundColor: "#4ade80",
        borderColor: "#4ade80",
        shadowColor: '#4ade80',
        shadowOffset: { width: 0, height: 0 },
        shadowRadius: 6,
        shadowOpacity: 0.6,
    },
    loadingFooter: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 20,
    },
    loadingFooterText: {
        color: "rgba(74,222,128,0.6)",
        fontSize: 13,
    },

    // ── Footer ──────────────────────────────────────────────────
    deleteButtonContainer: {
        position: "absolute",
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        backgroundColor: "transparent",
    },
    deleteButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 16,
        borderRadius: 14,
        borderCurve: 'continuous',
        gap: 8,
        shadowColor: '#ff3b30',
        shadowOffset: { width: 0, height: 0 },
        shadowRadius: 12,
        shadowOpacity: 0.4,
    },
    deleteButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },

    // ── Empty State ─────────────────────────────────────────────
    emptyState: {
        flex: 1,
        justifyContent: "flex-start",
        alignItems: "center",
        paddingTop: 80,
        gap: 16,
    },
    emptyIconGlow: {
        padding: 20,
        borderRadius: 60,
        backgroundColor: "rgba(74,222,128,0.01)",
        shadowColor: '#4ade80',
        shadowOffset: { width: 0, height: 0 },
        shadowRadius: 30,
        shadowOpacity: 0.4,
    },
    emptyLabel: {
        fontSize: 17,
        color: "rgba(255,255,255,0.5)",
        marginTop: 8,
    },
});

export default function SmartCleanScreen() {
    return <SmartCleanContent />;
}
