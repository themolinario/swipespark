import { AnimatedScanner } from "@/components/ui/animated-scanner";
import { Button } from "@/components/ui/button";
import { PhotoPreviewModal } from "@/components/photo-preview-modal";
import { FuturisticHomeBackground } from "@/components/ui/futuristic-home-background";
import { useClassificationCache } from "@/stores/classification-cache";
import { usePhotoStore } from "@/stores/photo-store";
import { PhotoAsset } from "@/services/media-library.service";
import { startScan, stopScan } from "@/services/smart-clean-scan.service";
import { useSmartCleanStore } from "@/stores/smart-clean-store";
import { SmartCategory } from "@/utils/category-mapper";
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

const DISPLAY_BATCH_SIZE = 15;

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const COLUMN_COUNT = 3;
const GAP = 3;
const ITEM_SIZE = (SCREEN_WIDTH - GAP * (COLUMN_COUNT + 1)) / COLUMN_COUNT;

export function SmartCleanContent({ onBack }: { onBack?: () => void }) {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const tabBarHeight = useBottomTabBarHeight();

    const isSearchRunning = useSmartCleanStore((s) => s.isSearchRunning);
    const searchProgress = useSmartCleanStore((s) => s.searchProgress);
    const searchStatusText = useSmartCleanStore((s) => s.searchStatusText);
    const matchedPhotos = useSmartCleanStore((s) => s.matchedPhotos);
    const scanComplete = useSmartCleanStore((s) => s.scanComplete);
    const selectedCategory = useSmartCleanStore((s) => s.selectedCategory);
    const storeCustomQuery = useSmartCleanStore((s) => s.customQuery);
    const [showCustomQuery, setShowCustomQuery] = useState(false);
    const [customQuery, setCustomQuery] = useState("");
    const [selectedForDeletion, setSelectedForDeletion] = useState<Set<string>>(new Set());
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [previewIndex, setPreviewIndex] = useState<number | null>(null);
    const [isScrollingDisabled, setIsScrollingDisabled] = useState(false);

    const addDeletionPhoto = usePhotoStore((state) => state.addDeletionPhoto);

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

    // Derived step — no useState needed
    const step = showCustomQuery
        ? "ENTER_CUSTOM_QUERY"
        : isSearchRunning && matchedPhotos.length === 0
            ? "SCANNING"
            : matchedPhotos.length > 0 || scanComplete
                ? "REVIEW_RESULTS"
                : "SELECT_CATEGORY";

    const handleCategoryPress = useCallback(async (category: SmartCategory) => {
        if (category === "Custom") {
            setShowCustomQuery(true);
        } else {
            await startScan(category, "");
        }
    }, []);

    const handleCustomSearch = useCallback(async () => {
        if (customQuery.trim().length === 0) return;
        setShowCustomQuery(false);
        await startScan("Custom", customQuery.trim());
    }, [customQuery]);

    const handleStop = useCallback(() => {
        stopScan();
    }, []);

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
        stopScan();
        const photosToDelete = matchedPhotos.filter(p => selectedForDeletion.has(p.id));
        photosToDelete.forEach(p => addDeletionPhoto(p as unknown as PhotoAsset));
        if (selectedCategory && selectedCategory !== "Custom") {
            const { useAchievementStore } = require("@/stores/achievement-store");
            useAchievementStore.getState().recordSmartCleanCategory(selectedCategory);
        }
        useSmartCleanStore.getState().resetSearch();
        setSelectedForDeletion(new Set());
        setIsSelectMode(false);
        router.push("/delete");
    }, [matchedPhotos, selectedForDeletion, addDeletionPhoto, selectedCategory]);

    const renderListFooter = useCallback(() => {
        if (!isSearchRunning) return null;
        return (
            <View style={styles.loadingFooter}>
                <ActivityIndicator color="#4ade80" size="small" />
                <Text style={styles.loadingFooterText}>{t("smart.searchingMore")}</Text>
            </View>
        );
    }, [isSearchRunning]);

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
                    // RALPH FIX [FEATURE-BG]: Disable scroll when search is running in background
                    scrollEnabled={!isSearchRunning}
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

                    {/* RALPH FIX [FEATURE-BG]: Background search banner + Stop button */}
                    {isSearchRunning && (
                        <View style={styles.backgroundSearchBanner}>
                            <Text style={styles.backgroundSearchText}>
                                {t("smart.backgroundSearchRunning")}
                            </Text>
                            <Pressable
                                style={({ pressed }) => [styles.stopButton, pressed && { opacity: 0.7 }]}
                                onPress={handleStop}
                            >
                                <Square size={16} color="#ff6b6b" />
                                <Text style={styles.stopButtonText}>{t("common.stop")}</Text>
                            </Pressable>
                        </View>
                    )}

                    {/* RALPH FIX [FEATURE-BG]: Disable category grid while search is running */}
                    <View style={[styles.categoryGrid, isSearchRunning && styles.disabledOverlay]}>
                        {CATEGORIES.map((cat) => (
                            <Pressable
                                key={cat.label}
                                style={({ pressed }) => [
                                    styles.categoryCard,
                                    pressed && !isSearchRunning && styles.categoryCardPressed,
                                    isSearchRunning && styles.categoryCardDisabled,
                                ]}
                                onPress={() => !isSearchRunning && handleCategoryPress(cat.label)}
                                disabled={isSearchRunning}
                            >
                                <View style={styles.categoryIconWrapper}>
                                    <cat.Icon size={32} color={isSearchRunning ? "rgba(74,222,128,0.3)" : "#4ade80"} />
                                </View>
                                <Text style={[styles.categoryLabel, isSearchRunning && styles.categoryLabelDisabled]}>{t(cat.labelKey)}</Text>
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
                        <Pressable onPress={() => setShowCustomQuery(false)} style={styles.backButton}>
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
                            onSubmitEditing={handleCustomSearch}
                        />
                        <Pressable
                            style={({ pressed }) => [
                                styles.primaryButton,
                                { opacity: customQuery.trim().length > 0 ? (pressed ? 0.8 : 1) : 0.4 },
                            ]}
                            disabled={customQuery.trim().length === 0}
                            onPress={handleCustomSearch}
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
                        ? t("smart.scanningForCustom", { query: storeCustomQuery })
                        : t("smart.scanningFor", { category: t(CATEGORIES.find(c => c.label === selectedCategory)?.labelKey as CategoryLabelKey) })}
                </Text>
                <Text style={styles.scanningSubtitle}>
                    {t("smart.percentComplete", { percent: Math.round(searchProgress) })}
                </Text>
                {searchStatusText ? (
                    <Text style={styles.scanningDetail}>{searchStatusText}</Text>
                ) : null}
                {searchProgress > 0 && searchProgress < 100 && (
                    <View style={styles.progressBarContainer}>
                        <View style={[styles.progressBar, { width: `${Math.min(searchProgress, 100)}%`, experimental_backgroundImage: 'linear-gradient(to right, #4ade80, #38E0D2, #2dd4bf)' }]} />
                    </View>
                )}
                {/* RALPH FIX [FEATURE-BG]: Background search message shown in scanning view */}
                <Text style={styles.backgroundSearchInlineText}>
                    {t("smart.backgroundSearchRunning")}
                </Text>
                <Pressable
                    style={({ pressed }) => [styles.cancelButton, pressed && { opacity: 0.7 }]}
                    onPress={handleStop}
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
                    <Pressable onPress={() => {
                        stopScan();
                        useSmartCleanStore.getState().resetSearch();
                    }} style={styles.backButton}>
                        <ArrowLeft size={22} color="#4ade80" />
                    </Pressable>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.title} numberOfLines={1}>
                            {isSelectMode
                                ? t("smart.selectedCount", { count: selectedForDeletion.size })
                                : (selectedCategory === "Custom" ? `"${storeCustomQuery}"` : t(CATEGORIES.find(c => c.label === selectedCategory)?.labelKey as CategoryLabelKey))}
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

                {/* RALPH FIX [FEATURE-BG]: Show background search banner in review results too */}
                {isSearchRunning && (
                    <View style={styles.reviewSearchBanner}>
                        <Text style={styles.reviewSearchBannerText}>
                            {t("smart.backgroundSearchRunning")}
                        </Text>
                        <Pressable
                            style={({ pressed }) => [styles.stopButtonSmall, pressed && { opacity: 0.7 }]}
                            onPress={handleStop}
                        >
                            <Square size={12} color="#ff6b6b" />
                            <Text style={styles.stopButtonSmallText}>{t("common.stop")}</Text>
                        </Pressable>
                    </View>
                )}

                {matchedPhotos.length === 0 && scanComplete ? (
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIconGlow}>
                            <Search size={72} color="#4ade80" />
                        </View>
                        <Text style={styles.emptyLabel}>{t("smart.noMatchingPhotos")}</Text>
                        <Pressable
                            style={styles.primaryButton}
                            onPress={() => useSmartCleanStore.getState().resetSearch()}
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

    // ── Background Search Banner ─────────────────────────────────
    backgroundSearchBanner: {
        marginBottom: 16,
        padding: 16,
        borderRadius: 14,
        borderCurve: 'continuous',
        backgroundColor: "rgba(74,222,128,0.08)",
        borderWidth: 1,
        borderColor: "rgba(74,222,128,0.25)",
        gap: 12,
        alignItems: "center",
    },
    backgroundSearchText: {
        color: "rgba(255,255,255,0.65)",
        fontSize: 13,
        lineHeight: 18,
        textAlign: "center",
    },
    backgroundSearchInlineText: {
        color: "rgba(255,255,255,0.45)",
        fontSize: 12,
        lineHeight: 16,
        textAlign: "center",
        marginTop: 16,
        paddingHorizontal: 20,
    },
    reviewSearchBanner: {
        marginHorizontal: 20,
        marginBottom: 8,
        padding: 10,
        borderRadius: 10,
        borderCurve: 'continuous',
        backgroundColor: "rgba(74,222,128,0.06)",
        borderWidth: 1,
        borderColor: "rgba(74,222,128,0.2)",
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    reviewSearchBannerText: {
        flex: 1,
        color: "rgba(255,255,255,0.5)",
        fontSize: 11,
        lineHeight: 15,
    },

    // ── Stop Button ─────────────────────────────────────────────
    stopButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 20,
        borderCurve: 'continuous',
        backgroundColor: "rgba(255,107,107,0.12)",
        borderWidth: 1,
        borderColor: "rgba(255,107,107,0.4)",
    },
    stopButtonText: {
        color: "#ff6b6b",
        fontSize: 14,
        fontWeight: "600",
    },
    stopButtonSmall: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 14,
        borderCurve: 'continuous',
        backgroundColor: "rgba(255,107,107,0.1)",
        borderWidth: 1,
        borderColor: "rgba(255,107,107,0.3)",
    },
    stopButtonSmallText: {
        color: "#ff6b6b",
        fontSize: 11,
        fontWeight: "600",
    },

    // ── Disabled State ──────────────────────────────────────────
    disabledOverlay: {
        opacity: 0.4,
    },
    categoryCardDisabled: {
        borderColor: "rgba(74,222,128,0.06)",
    },
    categoryLabelDisabled: {
        color: "rgba(255,255,255,0.3)",
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
