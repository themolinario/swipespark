import * as MediaLibrary from "expo-media-library";
import * as Notifications from "expo-notifications";
import { classifyImages } from "@/modules/image-classifier";
import { useSmartCleanStore } from "@/stores/smart-clean-store";
import { useClassificationCache, CachedLabel } from "@/stores/classification-cache";
import { mapLabelsToCategory, matchesCustomQuery, SmartCategory } from "@/utils/category-mapper";
import i18n from "@/i18n";

const BATCH_SIZE = 100;

let _scanId = 0;
let _activeScanId = 0;

export async function startScan(category: SmartCategory, customQuery: string): Promise<void> {
    const scanId = ++_scanId;
    _activeScanId = scanId;

    const store = useSmartCleanStore.getState();
    store.resetSearch();
    store.setSearchRunning(true);
    store.setSelectedCategory(category);
    store.setCustomQuery(customQuery);
    store.setProgress(0, "");

    await Notifications.requestPermissionsAsync();
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== "granted" && (status as string) !== "limited") {
        store.stopSearch();
        _activeScanId = 0;
        return;
    }

    runScan(scanId, category, customQuery);
}

function fetchPage(endCursor: string | undefined) {
    return MediaLibrary.getAssetsAsync({
        mediaType: "photo",
        first: BATCH_SIZE,
        after: endCursor,
        sortBy: [MediaLibrary.SortBy.modificationTime],
    });
}

async function classifyAndMatch(
    assets: MediaLibrary.Asset[],
    scanId: number,
    category: SmartCategory,
    customQuery: string,
): Promise<void> {
    const cacheStore = useClassificationCache.getState();
    const uncached: MediaLibrary.Asset[] = [];
    const labelMap = new Map<string, CachedLabel[]>();

    for (const asset of assets) {
        const cached = cacheStore.getCachedLabels(asset.id);
        if (cached !== null) {
            labelMap.set(asset.id, cached);
        } else {
            uncached.push(asset);
        }
    }

    if (uncached.length > 0) {
        const uris = uncached.map((a) => a.uri);
        const results = await classifyImages(uris);

        if (_activeScanId !== scanId) return;

        const batchEntries: { assetId: string; labels: CachedLabel[] }[] = [];
        for (let i = 0; i < results.length; i++) {
            const labels: CachedLabel[] = results[i].labels.map((l) => ({
                identifier: l.identifier,
                confidence: l.confidence,
            }));
            labelMap.set(uncached[i].id, labels);
            batchEntries.push({ assetId: uncached[i].id, labels });
        }
        cacheStore.setCachedLabelsBatch(batchEntries);
    }

    const matched: MediaLibrary.Asset[] = [];
    for (const asset of assets) {
        const labels = labelMap.get(asset.id) ?? [];
        const matches =
            category === "Custom"
                ? matchesCustomQuery(labels, customQuery)
                : mapLabelsToCategory(labels).category === category;
        if (matches) matched.push(asset);
    }

    if (matched.length > 0) {
        useSmartCleanStore.getState().addMatchedPhotos(matched);
    }
}

async function runScan(scanId: number, category: SmartCategory, customQuery: string): Promise<void> {
    let endCursor: string | undefined;
    let hasNextPage = true;
    let totalProcessed = 0;
    let totalCount = 0;

    let nextPagePromise = fetchPage(endCursor);

    while (hasNextPage && _activeScanId === scanId) {
        const page = await nextPagePromise;

        if (totalCount === 0) totalCount = page.totalCount;
        hasNextPage = page.hasNextPage;
        endCursor = page.endCursor;

        const assets = page.assets;
        if (assets.length === 0) break;

        if (hasNextPage && _activeScanId === scanId) {
            nextPagePromise = fetchPage(endCursor);
        }

        await classifyAndMatch(assets, scanId, category, customQuery);

        if (_activeScanId !== scanId) break;

        totalProcessed += assets.length;
        const progress = totalCount > 0 ? (totalProcessed / totalCount) * 100 : 0;
        useSmartCleanStore.getState().setProgress(progress, "");
    }

    if (_activeScanId === scanId) {
        const matchedCount = useSmartCleanStore.getState().matchedPhotos.length;
        useSmartCleanStore.getState().completeSearch();
        _activeScanId = 0;
        await sendScanCompleteNotification(matchedCount);
    }
}

async function sendScanCompleteNotification(count: number): Promise<void> {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return;
    await Notifications.scheduleNotificationAsync({
        content: {
            title: i18n.t("smart.scanCompleteToastTitle"),
            body: i18n.t("smart.scanCompleteToastBody", { count }),
        },
        trigger: null,
    });
}

export function stopScan(): void {
    _activeScanId = 0;
    useSmartCleanStore.getState().stopSearch();
}

export function getCurrentScanId(): number {
    return _activeScanId;
}
