import { DeletionSuccessModal } from "@/components/deletion-success-modal";
import { ThemedText } from "@/components/themed-text";
import { AnimatedScanner } from "@/components/ui/animated-scanner";
import { Button } from "@/components/ui/button";
import { FuturisticHomeBackground } from "@/components/ui/futuristic-home-background";
import { useDuplicates } from "@/hooks/use-duplicates";
import { DuplicateGroup } from "@/utils/duplicate-detection";
import { ArrowLeft, Check, AlertCircle, Images, RefreshCcw, Search, Zap, XCircle, Trash2 } from "lucide-react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Image } from "expo-image";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Alert,
    Dimensions,
    FlatList,
    Pressable,
    StyleSheet,
    View
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PADDING = 20;
const GROUP_PADDING = 12;
const GROUP_BORDER = 1;
const GAP = 3;
const COLUMNS = 3;
const PHOTO_SIZE = Math.floor(
    (SCREEN_WIDTH - PADDING * 2 - (GROUP_PADDING + GROUP_BORDER) * 2 - GAP * (COLUMNS - 1)) / COLUMNS
);

export function DuplicatesContent({ onBack }: { onBack?: () => void }) {
    const { t } = useTranslation();
    const tabBarHeight = useBottomTabBarHeight();
    const insets = useSafeAreaInsets();

    const {
        duplicateGroups,
        isScanning,
        progress,
        scanStatusText,
        hasPermission,
        hasScannedOnce,
        scanDuplicates,
        deleteDuplicates,
    } = useDuplicates();

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isDeleting, setIsDeleting] = useState(false);
    const [successModal, setSuccessModal] = useState<{ visible: boolean; count: number; freedBytes: number }>({
        visible: false,
        count: 0,
        freedBytes: 0,
    });

    const flatPhotos = duplicateGroups.flatMap(g => g.photos);

    const [isScrollingDisabled, setIsScrollingDisabled] = useState(false);
    const isDragging = useRef(false);
    const scrollOffset = useRef(0);
    const startDragIndex = useRef<number | null>(null);
    const lastToggledIndex = useRef<number | null>(null);
    const isSelectingRef = useRef(true);
    const flatListRef = useRef<FlatList>(null);
    const listStartY = useRef(0);
    const listContainerRef = useRef<View>(null);

    const scrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
    const currentTouchY = useRef<number>(0);
    const currentTouchX = useRef<number>(0);

    const groupHeaderHeights = useRef<Map<string, number>>(new Map());

    useEffect(() => {
        if (!hasScannedOnce && duplicateGroups.length === 0 && !isScanning) {
            scanDuplicates();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasScannedOnce]);

    const handleToggleSelect = useCallback((id: string) => {
        setSelectedIds((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    }, []);

    const handleAutoSelect = useCallback(() => {
        setSelectedIds((prev) => {
            const newSet = new Set(prev);
            for (const group of duplicateGroups) {
                for (let i = 1; i < group.photos.length; i++) {
                    newSet.add(group.photos[i].id);
                }
            }
            return newSet;
        });
    }, [duplicateGroups]);

    const handleClearSelection = useCallback(() => {
        setSelectedIds(new Set());
    }, []);

    const handleConfirmDelete = useCallback(async () => {
        if (selectedIds.size === 0) return;

        setIsDeleting(true);
        try {
            const idsToDelete = Array.from(selectedIds);
            const urisToDelete = flatPhotos
                .filter((p) => selectedIds.has(p.id))
                .map((p) => p.uri);
            const result = await deleteDuplicates(idsToDelete, urisToDelete);

            if (result.success) {
                setSelectedIds(new Set());
                setSuccessModal({ visible: true, count: idsToDelete.length, freedBytes: result.freedBytes });
            } else {
                Alert.alert(t("common.error"), t("duplicates.errorDelete"));
            }
        } catch {
            Alert.alert(t("common.error"), t("duplicates.errorGeneric"));
        } finally {
            setIsDeleting(false);
        }
    }, [selectedIds, deleteDuplicates, flatPhotos]);

    // --- Drag to Select Logic ---

    const getIndexFromCoordinates = useCallback((x: number, y: number) => {
        const contentY = y + scrollOffset.current;
        if (contentY < 0) return null;

        const relativeX = x - PADDING - GROUP_BORDER - GROUP_PADDING;
        if (relativeX < 0) return null;

        let currentY = 0;
        let cumulativeIndex = 0;

        for (let i = 0; i < duplicateGroups.length; i++) {
            const group = duplicateGroups[i];

            const measuredHeaderH = groupHeaderHeights.current.get(group.id) ?? 39;
            const headerSpaceH = measuredHeaderH + 10; // +10 = groupHeader marginBottom
            const HEADER_OFFSET = GROUP_BORDER + GROUP_PADDING + headerSpaceH;
            const rows = Math.ceil(group.photos.length / COLUMNS);
            const photosHeight = rows * (PHOTO_SIZE + GAP);
            const groupHeight =
                GROUP_BORDER * 2 + GROUP_PADDING * 2 + headerSpaceH + photosHeight + 24;

            const groupEnd = currentY + groupHeight - 24;

            if (contentY >= currentY && contentY < groupEnd) {
                const relativeY = contentY - currentY;

                if (relativeY < HEADER_OFFSET) {
                    return null;
                }

                const photoAreaY = relativeY - HEADER_OFFSET;
                const row = Math.floor(photoAreaY / (PHOTO_SIZE + GAP));
                const col = Math.floor(relativeX / (PHOTO_SIZE + GAP));

                if (col < 0 || col >= COLUMNS) return null;

                const indexInGroup = row * COLUMNS + col;
                if (indexInGroup >= 0 && indexInGroup < group.photos.length) {
                    return cumulativeIndex + indexInGroup;
                }
                return null;
            }

            cumulativeIndex += group.photos.length;
            currentY += groupHeight;
        }

        return null;
    }, [duplicateGroups]);

    const handleDragStart = useCallback((x: number, y: number) => {
        isDragging.current = true;
        setIsScrollingDisabled(true);
        const index = getIndexFromCoordinates(x, y);

        if (index !== null && flatPhotos[index]) {
            startDragIndex.current = index;
            lastToggledIndex.current = index;
            const photo = flatPhotos[index];

            setSelectedIds((prev) => {
                const newSet = new Set(prev);
                if (newSet.has(photo.id)) {
                    newSet.delete(photo.id);
                    isSelectingRef.current = false;
                } else {
                    newSet.add(photo.id);
                    isSelectingRef.current = true;
                }
                return newSet;
            });
        }
    }, [getIndexFromCoordinates, flatPhotos]);

    const handleDragUpdate = useCallback((x: number, y: number) => {
        if (!isDragging.current) return;
        currentTouchX.current = x;
        currentTouchY.current = y;

        const currentIndex = getIndexFromCoordinates(x, y);

        if (
            currentIndex !== null &&
            currentIndex !== lastToggledIndex.current &&
            startDragIndex.current !== null
        ) {
            const minIdx = Math.min(startDragIndex.current, currentIndex);
            const maxIdx = Math.max(startDragIndex.current, currentIndex);

            setSelectedIds((prev) => {
                const next = new Set(prev);
                for (let i = minIdx; i <= maxIdx; i++) {
                    const p = flatPhotos[i];
                    if (p) {
                        if (isSelectingRef.current) next.add(p.id);
                        else next.delete(p.id);
                    }
                }
                return next;
            });

            lastToggledIndex.current = currentIndex;
        }
    }, [getIndexFromCoordinates, flatPhotos]);

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
        .enabled(true)
        .activeOffsetX([-10, 10])
        .failOffsetY([-20, 20])
        .runOnJS(true)
        .onStart((e: any) => {
            handleDragStart(e.x, e.y);
            if (!scrollTimer.current) {
                scrollTimer.current = setInterval(autoScroll, 16);
            }
        })
        .onUpdate((e: any) => handleDragUpdate(e.x, e.y))
        .onEnd(() => handleDragEnd())
        .onFinalize(() => handleDragEnd());

    // --- End Drag to Select ---

    const renderGroup = useCallback(
        ({ item }: { item: DuplicateGroup }) => {
            const firstPhoto = item.photos[0];
            return (
                <View style={styles.groupContainer}>
                    <View
                        style={styles.groupHeader}
                        onLayout={(e) => groupHeaderHeights.current.set(item.id, e.nativeEvent.layout.height)}
                    >
                        <View style={{ flex: 1 }}>
                            <ThemedText style={styles.groupTitle} numberOfLines={1}>
                                {firstPhoto.filename}
                            </ThemedText>
                            <ThemedText style={styles.groupSubtitle}>
                                {firstPhoto.width}x{firstPhoto.height} • {t("duplicates.copies", { count: item.photos.length })}
                            </ThemedText>
                        </View>
                    </View>
                    <View style={styles.groupPhotos}>
                        {item.photos.map((photo) => {
                            const isSelected = selectedIds.has(photo.id);
                            return (
                                <Pressable
                                    key={photo.id}
                                    style={styles.photoContainer}
                                    onPress={() => handleToggleSelect(photo.id)}
                                >
                                    <View style={[styles.photoWrapper, isSelected && styles.photoWrapperSelected]}>
                                        <Image
                                            source={{ uri: photo.uri }}
                                            style={[styles.photo, isSelected && styles.photoSelected]}
                                            contentFit="cover"
                                            transition={200}
                                        />
                                    </View>
                                    {isSelected && (
                                        <View style={styles.checkCircleSelected}>
                                            <Check size={14} color="#fff" />
                                        </View>
                                    )}
                                </Pressable>
                            );
                        })}
                    </View>
                </View>
            );
        },
        [selectedIds, handleToggleSelect]
    );

    const renderEmptyState = () => {
        if (isScanning) {
            const progressPercent = Math.round(progress * 100);
            return (
                <View style={styles.emptyContainer}>
                    <View style={styles.emptyIconGlow}>
                        <AnimatedScanner color="#4ade80" size={72} />
                    </View>
                    <ThemedText style={styles.emptyTitle}>{t("duplicates.scanningLibrary")}</ThemedText>
                    <ThemedText style={styles.emptySubtitle}>
                        {scanStatusText || t("duplicates.scanningSubtitle")}
                    </ThemedText>

                    <View style={styles.progressBarContainer}>
                        <View style={[styles.progressBarFill, { width: `${progressPercent}%`, experimental_backgroundImage: 'linear-gradient(to right, #4ade80, #38E0D2)' }]} />
                    </View>
                    <ThemedText style={styles.progressText}>
                        {t("duplicates.percentComplete", { percent: (progress * 100).toFixed(1) })}
                    </ThemedText>
                </View>
            );
        }

        if (hasPermission === false) {
            return (
                <View style={styles.emptyContainer}>
                    <View style={styles.emptyIconGlow}>
                        <AlertCircle size={72} color="#4ade80" />
                    </View>
                    <ThemedText style={styles.emptyTitle}>{t("duplicates.permissionNeeded")}</ThemedText>
                    <ThemedText style={styles.emptySubtitle}>
                        {t("duplicates.permissionMessage")}
                    </ThemedText>
                    <Pressable onPress={() => scanDuplicates()} style={styles.scanAgainButton}>
                        <AlertCircle size={20} color="#4ade80" />
                        <ThemedText style={styles.scanAgainText}>{t("duplicates.grantPermission")}</ThemedText>
                    </Pressable>
                </View>
            );
        }

        return (
            <View style={styles.emptyContainer}>
                <View style={styles.emptyIconGlow}>
                    <Images size={72} color="#4ade80" />
                </View>
                <ThemedText style={styles.emptyTitle}>
                    {hasScannedOnce ? t("duplicates.noDuplicatesFound") : t("duplicates.startScanTitle")}
                </ThemedText>
                <ThemedText style={styles.emptySubtitle}>
                    {hasScannedOnce ? t("duplicates.noDuplicatesMessage") : t("duplicates.startScanMessage")}
                </ThemedText>
                <Pressable onPress={() => scanDuplicates(hasScannedOnce)} style={styles.scanAgainButton}>
                    {hasScannedOnce ? <RefreshCcw size={20} color="#4ade80" /> : <Search size={20} color="#4ade80" />}
                    <ThemedText style={styles.scanAgainText}>
                        {hasScannedOnce ? t("duplicates.scanAgain") : t("duplicates.startScan")}
                    </ThemedText>
                </Pressable>
            </View>
        );
    };

    return (
        <FuturisticHomeBackground
            style={[styles.container, { paddingTop: insets.top }]}
        >
            {/* Header */}
            <View style={styles.header}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    {onBack && (
                        <Pressable onPress={onBack} style={styles.actionIcon}>
                            <ArrowLeft size={22} color="#4ade80" />
                        </Pressable>
                    )}
                    <View>
                    <ThemedText style={styles.title}>{t("duplicates.title")}</ThemedText>
                    {!isScanning && duplicateGroups.length > 0 && (
                        <ThemedText style={styles.count}>
                            {t("duplicates.groupsFound", { count: duplicateGroups.length })}
                        </ThemedText>
                    )}
                    </View>
                </View>
                {!isScanning && duplicateGroups.length > 0 && (
                    <Pressable onPress={() => scanDuplicates(true)} style={styles.actionIcon}>
                        <RefreshCcw size={22} color="#4ade80" />
                    </Pressable>
                )}
            </View>

            {/* Neon separator */}
            <View style={[styles.headerSeparator, { experimental_backgroundImage: 'linear-gradient(to right, rgba(74,222,128,0), rgba(74,222,128,0.5), rgba(74,222,128,0))' }]} />

            {duplicateGroups.length === 0 ? (
                renderEmptyState()
            ) : (
                <>
                    <View style={styles.toolbar}>
                        <Pressable onPress={handleAutoSelect} style={styles.toolbarButton}>
                            <Zap size={15} color="#4ade80" />
                            <ThemedText style={styles.toolbarButtonText}>{t("duplicates.autoSelect")}</ThemedText>
                        </Pressable>
                        {selectedIds.size > 0 && (
                            <Pressable onPress={handleClearSelection} style={styles.toolbarButton}>
                                <XCircle size={15} color="#4ade80" />
                                <ThemedText style={styles.toolbarButtonText}>{t("duplicates.clear")}</ThemedText>
                            </Pressable>
                        )}
                    </View>

                    <GestureDetector gesture={panGesture}>
                        <View
                            style={styles.listContainer}
                            ref={listContainerRef}
                        >
                            <FlatList
                                ref={flatListRef}
                                data={duplicateGroups}
                                renderItem={renderGroup}
                                keyExtractor={(item) => item.id}
                                contentContainerStyle={[
                                    styles.listContent,
                                    { paddingBottom: tabBarHeight + 130 },
                                ]}
                                showsVerticalScrollIndicator={false}
                                onLayout={(e) => {
                                    listStartY.current = e.nativeEvent.layout.y;
                                }}
                                onScroll={(e) => {
                                    scrollOffset.current = e.nativeEvent.contentOffset.y;
                                }}
                                scrollEventThrottle={16}
                                scrollEnabled={!isScrollingDisabled}
                            />
                        </View>
                    </GestureDetector>

                    {selectedIds.size > 0 && (
                        <View
                            style={[
                                styles.deleteButtonContainer,
                                { bottom: tabBarHeight + 52 },
                            ]}
                        >
                            <Button
                                onPress={handleConfirmDelete}
                                title={
                                    isDeleting
                                        ? t("deleteScreen.deleting")
                                        : t("duplicates.deleteCopies", { count: selectedIds.size })
                                }
                                icon={!isDeleting ? <Trash2 size={20} color="#fff" /> : undefined}
                                style={styles.deleteButton}
                                textStyle={styles.deleteButtonText}
                                variant="danger"
                                disabled={isDeleting}
                            />
                        </View>
                    )}
                </>
            )}
            <DeletionSuccessModal
                visible={successModal.visible}
                deletedCount={successModal.count}
                freedBytes={successModal.freedBytes}
                onClose={() => setSuccessModal({ visible: false, count: 0, freedBytes: 0 })}
            />
        </FuturisticHomeBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 12,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    headerSeparator: {
        height: 1,
        marginHorizontal: 20,
        marginBottom: 4,
    },
    title: {
        fontSize: 28,
        fontWeight: "bold",
        lineHeight: 34,
        color: "#fff",
        textShadowColor: "rgba(74,222,128,0.3)",
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10,
    },
    count: {
        fontSize: 14,
        color: "rgba(74,222,128,0.7)",
        marginTop: 2,
    },
    actionIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderCurve: 'continuous',
        backgroundColor: "rgba(74,222,128,0.1)",
        borderWidth: 1,
        borderColor: "rgba(74,222,128,0.3)",
        justifyContent: "center",
        alignItems: "center",
    },
    toolbar: {
        flexDirection: "row",
        paddingHorizontal: 20,
        marginBottom: 12,
        gap: 10,
    },
    toolbarButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 20,
        borderCurve: 'continuous',
        backgroundColor: "rgba(74,222,128,0.08)",
        borderWidth: 1,
        borderColor: "rgba(74,222,128,0.25)",
    },
    toolbarButtonText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#4ade80",
    },
    listContent: {
        paddingHorizontal: PADDING,
    },
    groupContainer: {
        marginBottom: 24,
        backgroundColor: "rgba(74,222,128,0.03)",
        borderRadius: 14,
        borderCurve: 'continuous',
        padding: 12,
        borderWidth: 1,
        borderColor: "rgba(74,222,128,0.08)",
    },
    groupHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
    },
    groupTitle: {
        fontSize: 15,
        fontWeight: "600",
        color: "#fff",
    },
    groupSubtitle: {
        fontSize: 13,
        color: "rgba(74,222,128,0.6)",
        marginTop: 2,
    },
    groupPhotos: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: GAP,
    },
    photoContainer: {
        width: PHOTO_SIZE,
        height: PHOTO_SIZE,
    },
    photoWrapper: {
        flex: 1,
        borderRadius: 10,
        borderCurve: 'continuous',
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "rgba(74,222,128,0.12)",
    },
    photoWrapperSelected: {
        borderColor: "rgba(74,222,128,0.6)",
    },
    photo: {
        width: "100%",
        height: "100%",
    },
    photoSelected: {
        opacity: 0.65,
    },
    checkCircleSelected: {
        position: "absolute",
        bottom: 8,
        right: 8,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: "#4ade80",
        borderColor: "#4ade80",
        borderWidth: 1.5,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: '#4ade80',
        shadowOffset: { width: 0, height: 0 },
        shadowRadius: 6,
        shadowOpacity: 0.6,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "flex-start",
        alignItems: "center",
        paddingHorizontal: 40,
        paddingTop: 80,
    },
    emptyIconGlow: {
        padding: 20,
        borderRadius: 60,
        shadowColor: '#4ade80',
        shadowOffset: { width: 0, height: 0 },
        shadowRadius: 30,
        shadowOpacity: 0.4,
    },
    emptyTitle: {
        fontSize: 22,
        fontWeight: "700",
        marginTop: 24,
        marginBottom: 12,
        color: "#fff",
        textShadowColor: "rgba(74,222,128,0.2)",
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 8,
    },
    emptySubtitle: {
        fontSize: 15,
        color: "rgba(255,255,255,0.45)",
        textAlign: "center",
        lineHeight: 22,
    },
    scanAgainButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        marginTop: 28,
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 24,
        borderCurve: 'continuous',
        backgroundColor: "rgba(74,222,128,0.1)",
        borderWidth: 1,
        borderColor: "rgba(74,222,128,0.4)",
        shadowColor: '#4ade80',
        shadowOffset: { width: 0, height: 0 },
        shadowRadius: 12,
        shadowOpacity: 0.3,
    },
    scanAgainText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#4ade80",
        letterSpacing: 0.5,
    },
    progressBarContainer: {
        width: "100%",
        height: 6,
        backgroundColor: "rgba(74,222,128,0.1)",
        borderRadius: 3,
        marginTop: 24,
        overflow: "hidden",
    },
    progressBarFill: {
        height: "100%",
        borderRadius: 3,
    },
    progressText: {
        marginTop: 12,
        fontSize: 13,
        color: "rgba(74,222,128,0.6)",
    },
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
    listContainer: {
        flex: 1,
    },
});

export default function DuplicatesScreen() {
    return <DuplicatesContent />;
}
