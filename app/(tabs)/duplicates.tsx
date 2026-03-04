import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { AnimatedScanner } from "@/components/ui/animated-scanner";
import { Button } from "@/components/ui/button";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useDuplicates } from "@/hooks/use-duplicates";
import { DuplicateGroup } from "@/utils/duplicate-detection";
import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Image } from "expo-image";
import React, { useCallback, useEffect, useRef, useState } from "react";
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
const GAP = 2;
// In each group a row of photos is shown.
const PHOTO_SIZE = (SCREEN_WIDTH - PADDING * 2 - GAP * 2) / 3;

export default function DuplicatesScreen() {
    const tabBarHeight = useBottomTabBarHeight();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? "light"];

    const {
        duplicateGroups,
        isScanning,
        progress,
        scanStatusText,
        hasPermission,
        scanDuplicates,
        deleteDuplicates,
    } = useDuplicates();

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isDeleting, setIsDeleting] = useState(false);

    // Flatten photos for easy index-based gesture selection
    const flatPhotos = duplicateGroups.flatMap(g => g.photos);

    // Drag to select state
    const [isScrollingDisabled, setIsScrollingDisabled] = useState(false);
    const isDragging = useRef(false);
    const scrollOffset = useRef(0);
    const startDragIndex = useRef<number | null>(null);
    const lastToggledIndex = useRef<number | null>(null);
    const isSelectingRef = useRef(true); // true = adding to selection, false = removing
    const flatListRef = useRef<FlatList>(null);
    const listStartY = useRef(0);
    const listContainerRef = useRef<View>(null);

    const scrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
    const currentTouchY = useRef<number>(0);
    const currentTouchX = useRef<number>(0);

    useEffect(() => {
        // Auto-scan on mount if not already scanned
        if (duplicateGroups.length === 0 && !isScanning) {
            scanDuplicates();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only run once on mount

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
                // Keep the first photo (oldest/newest based on sort) and select the rest
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
            const success = await deleteDuplicates(idsToDelete);

            if (success) {
                setSelectedIds(new Set());
                Alert.alert(
                    "Success",
                    `${idsToDelete.length} duplicate photos permanently deleted.`
                );
            } else {
                Alert.alert("Error", "Could not delete photos.");
            }
        } catch {
            Alert.alert("Error", "An error occurred while deleting.");
        } finally {
            setIsDeleting(false);
        }
    }, [selectedIds, deleteDuplicates]);

    // --- Drag to Select Logic ---

    const getIndexFromCoordinates = useCallback((x: number, y: number) => {
        // x and y from GestureDetector are LOCAL to the listContainer
        const contentY = y + scrollOffset.current;
        if (contentY < 0) return null;

        const relativeX = x - PADDING;
        if (relativeX < 0) return null;

        // Group size calculation:
        // A group has a header (approx 40px)
        // Then rows of photos
        // This is complex for SectionList or grouped FlatList.
        // For simplicity in drag-to-select, we might need a simpler mapping
        // or just accept drag within a specific bounds.
        // Actually, since this is a grouped list, exact coordinate mapping is very tricky.
        // Let's implement a simpler list view for gestures or skip exact coordinates
        // if it's too complex, but let's try a basic approximation if possible.
        // Since groups have variable heights, it's safer to not map exact Y to index here
        // or just use the standard toggle for now.
        // Wait, the user specifically asked for "mancano le gestures"!
        // Let's implement it! We need to know where each photo is.
        // The easiest way is to flatten the list and use a single FlatList instead of wrapping in groups,
        // BUT groups are useful. Let's stick to the current UI and do our best.

        // Finding the index directly isn't as trivial as in kept.tsx since we have group headers.
        // We'll iterate through our group bounds to see where the tap/drag is.
        // But to do that we need to record the bounds of each group and its photos.

        // Let's implement dynamic layout tracking.
        let currentY = 0;
        let cumulativeIndex = 0;

        for (let i = 0; i < duplicateGroups.length; i++) {
            const group = duplicateGroups[i];

            // Header is roughly ~40px + 8px margin bottom = 48px
            // Wait, we can use exact measurements if we enforce them, or we can use onLayout on each group.
            // A simpler heuristic for drag to select based on assumptions:
            const HEADER_HEIGHT = 48; // Adjust based on styles.groupHeader + margins
            const GROUP_MB = 24;      // styles.groupContainer marginBottom

            const rows = Math.ceil(group.photos.length / 3);
            const photosHeight = rows * (PHOTO_SIZE + GAP);
            const groupHeight = HEADER_HEIGHT + photosHeight + GROUP_MB;

            // Is the touch within this group's Y bounds?
            if (contentY >= currentY && contentY < currentY + groupHeight - GROUP_MB) {
                // It's in this group! Let's find exactly which photo.
                const relativeY = contentY - currentY;

                // Is it on the header?
                if (relativeY < HEADER_HEIGHT) {
                    return null; // Tapping/dragging on header text
                }

                // In the photos area
                const photoAreaY = relativeY - HEADER_HEIGHT;
                const row = Math.floor(photoAreaY / (PHOTO_SIZE + GAP));
                const col = Math.floor(relativeX / (PHOTO_SIZE + GAP));

                if (col >= 3) return null; // 3 columns

                const indexInGroup = row * 3 + col;

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
                    <View style={styles.groupHeader}>
                        <View style={{ flex: 1 }}>
                            <ThemedText style={styles.groupTitle} numberOfLines={1}>
                                {firstPhoto.filename}
                            </ThemedText>
                            <ThemedText style={styles.groupSubtitle}>
                                {firstPhoto.width}x{firstPhoto.height} • {item.photos.length} copies
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
                                    <Image
                                        source={{ uri: photo.uri }}
                                        style={[styles.photo, isSelected && styles.photoSelected]}
                                        contentFit="cover"
                                        transition={200}
                                    />
                                    {isSelected && (
                                        <View style={styles.checkCircleSelected}>
                                            <Ionicons name="checkmark" size={16} color="#fff" />
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
                    <View style={{ marginBottom: 20 }}>
                        <AnimatedScanner color={colors.tint} size={80} />
                    </View>
                    <ThemedText style={styles.emptyTitle}>Scanning Library...</ThemedText>
                    <ThemedText style={styles.emptySubtitle}>
                        {scanStatusText || "Analyzing pixels to find exact duplicates."}
                    </ThemedText>

                    <View style={styles.progressBarContainer}>
                        <View style={[styles.progressBarFill, { width: `${progressPercent}%`, backgroundColor: colors.tint }]} />
                    </View>
                    <ThemedText style={{ marginTop: 12, opacity: 0.6 }}>
                        {(progress * 100).toFixed(1)}% Complete
                    </ThemedText>
                </View>
            );
        }

        if (hasPermission === false) {
            return (
                <View style={styles.emptyContainer}>
                    <Ionicons name="alert-circle-outline" size={80} color={colors.icon} />
                    <ThemedText style={styles.emptyTitle}>Permission Needed</ThemedText>
                    <ThemedText style={styles.emptySubtitle}>
                        Please grant access to your photo library to find duplicates.
                    </ThemedText>
                    <Button
                        title="Grant Permission"
                        onPress={scanDuplicates}
                        style={{ marginTop: 20 }}
                    />
                </View>
            );
        }

        return (
            <View style={styles.emptyContainer}>
                <Ionicons name="images-outline" size={80} color={colors.icon} />
                <ThemedText style={styles.emptyTitle}>No Duplicates Found</ThemedText>
                <ThemedText style={styles.emptySubtitle}>
                    We couldn&apos;t find any exact copies in your library.
                </ThemedText>
                <Button
                    title="Scan Again"
                    onPress={scanDuplicates}
                    style={{ marginTop: 20 }}
                    variant="secondary"
                />
            </View>
        );
    };

    return (
        <ThemedView
            style={[styles.container, { paddingTop: insets.top }]}
            transparent
        >
            <View style={styles.header}>
                <View>
                    <ThemedText style={styles.title}>Duplicates</ThemedText>
                    {!isScanning && duplicateGroups.length > 0 && (
                        <ThemedText style={styles.count}>
                            {duplicateGroups.length} groups found
                        </ThemedText>
                    )}
                </View>
                {!isScanning && duplicateGroups.length > 0 && (
                    <Pressable onPress={scanDuplicates} style={styles.actionIcon}>
                        <Ionicons name="refresh" size={24} color={colors.icon} />
                    </Pressable>
                )}
            </View>

            {duplicateGroups.length === 0 ? (
                renderEmptyState()
            ) : (
                <>
                    <View style={styles.toolbar}>
                        <Button
                            title="Auto-Select"
                            onPress={handleAutoSelect}
                            style={styles.toolbarButton}
                            variant="secondary"
                            textStyle={styles.toolbarButtonText}
                            icon={<Ionicons name="flash-outline" size={16} color={colors.text} />}
                        />
                        {selectedIds.size > 0 && (
                            <Button
                                title="Clear"
                                onPress={handleClearSelection}
                                style={styles.toolbarButton}
                                variant="secondary"
                                textStyle={styles.toolbarButtonText}
                                icon={<Ionicons name="close-circle-outline" size={16} color={colors.text} />}
                            />
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
                                    { paddingBottom: tabBarHeight + 100 },
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
                                { bottom: tabBarHeight + 20 },
                            ]}
                        >
                            <Button
                                onPress={handleConfirmDelete}
                                title={
                                    isDeleting
                                        ? "Deleting..."
                                        : `Delete ${selectedIds.size} ${selectedIds.size === 1 ? "Copy" : "Copies"
                                        }`
                                }
                                icon={!isDeleting ? <Ionicons name="trash" size={20} color="#fff" /> : undefined}
                                style={styles.deleteButton}
                                textStyle={styles.deleteButtonText}
                                variant="danger"
                                disabled={isDeleting}
                            />
                        </View>
                    )}
                </>
            )}
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    title: {
        fontSize: 28,
        fontWeight: "bold",
        lineHeight: 34,
    },
    count: {
        fontSize: 16,
        opacity: 0.6,
    },
    actionIcon: {
        padding: 8,
    },
    toolbar: {
        flexDirection: "row",
        paddingHorizontal: 20,
        marginBottom: 12,
        gap: 12,
    },
    toolbarButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 16,
    },
    toolbarButtonText: {
        fontSize: 14,
        fontWeight: "600",
    },
    listContent: {
        paddingHorizontal: PADDING,
    },
    groupContainer: {
        marginBottom: 24,
    },
    groupHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    groupTitle: {
        fontSize: 16,
        fontWeight: "600",
    },
    groupSubtitle: {
        fontSize: 14,
        opacity: 0.6,
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
    photo: {
        width: "100%",
        height: "100%",
        borderRadius: 8,
    },
    photoSelected: {
        opacity: 0.6,
    },
    checkCircleSelected: {
        position: "absolute",
        bottom: 8,
        right: 8,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: "#007AFF",
        borderColor: "#007AFF",
        borderWidth: 2,
        justifyContent: "center",
        alignItems: "center",
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 40,
    },
    emptyTitle: {
        fontSize: 22,
        fontWeight: "600",
        marginTop: 20,
        marginBottom: 12,
    },
    emptySubtitle: {
        fontSize: 16,
        opacity: 0.6,
        textAlign: "center",
        lineHeight: 24,
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
        borderRadius: 12,
        gap: 8,
    },
    deleteButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
    listContainer: {
        flex: 1,
    },
    progressBarContainer: {
        width: "100%",
        height: 6,
        backgroundColor: "rgba(150, 150, 150, 0.2)",
        borderRadius: 3,
        marginTop: 24,
        overflow: "hidden",
    },
    progressBarFill: {
        height: "100%",
        borderRadius: 3,
    }
});
