import { SmartCleanCategoryPicker, SMART_CATEGORIES, CategoryLabelKey } from "@/components/smart-clean-category-picker";
import { SmartCleanCustomQueryForm } from "@/components/smart-clean-custom-query-form";
import { SmartCleanScanningView } from "@/components/smart-clean-scanning-view";
import { SmartCleanReviewResults } from "@/components/smart-clean-review-results";
import { PhotoAsset } from "@/services/media-library.service";
import { startScan, stopScan } from "@/services/smart-clean-scan.service";
import { useSmartCleanStore } from "@/stores/smart-clean-store";
import { usePhotoStore } from "@/stores/photo-store";
import * as MediaLibrary from "expo-media-library";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function SmartCleanContent({ onBack }: { onBack?: () => void }) {
  const { t } = useTranslation();

  const isSearchRunning = useSmartCleanStore((s) => s.isSearchRunning);
  const searchProgress = useSmartCleanStore((s) => s.searchProgress);
  const searchStatusText = useSmartCleanStore((s) => s.searchStatusText);
  const matchedPhotos = useSmartCleanStore((s) => s.matchedPhotos);
  const scanComplete = useSmartCleanStore((s) => s.scanComplete);
  const selectedCategory = useSmartCleanStore((s) => s.selectedCategory);
  const storeCustomQuery = useSmartCleanStore((s) => s.customQuery);

  const [showCustomQuery, setShowCustomQuery] = useState(false);

  const addDeletionPhoto = usePhotoStore((state) => state.addDeletionPhoto);

  const step = showCustomQuery
    ? "ENTER_CUSTOM_QUERY"
    : isSearchRunning && matchedPhotos.length === 0
      ? "SCANNING"
      : matchedPhotos.length > 0 || scanComplete
        ? "REVIEW_RESULTS"
        : "SELECT_CATEGORY";

  const handleConfirmDeletion = (selectedPhotos: MediaLibrary.Asset[]) => {
    stopScan();
    selectedPhotos.forEach((p) => addDeletionPhoto(p as unknown as PhotoAsset));
    if (selectedCategory && selectedCategory !== "Custom") {
      const { useAchievementStore } = require("@/stores/achievement-store");
      useAchievementStore.getState().recordSmartCleanCategory(selectedCategory);
    }
    useSmartCleanStore.getState().resetSearch();
    router.push("/delete");
  };

  if (step === "SELECT_CATEGORY") {
    return (
      <SmartCleanCategoryPicker
        isSearchRunning={isSearchRunning}
        onCategoryPress={async (category) => {
          if (category === "Custom") {
            setShowCustomQuery(true);
          } else {
            await startScan(category, "");
          }
        }}
        onStop={stopScan}
        onBack={onBack}
      />
    );
  }

  if (step === "ENTER_CUSTOM_QUERY") {
    return (
      <SmartCleanCustomQueryForm
        onBack={() => setShowCustomQuery(false)}
        onSearch={async (query) => {
          setShowCustomQuery(false);
          await startScan("Custom", query);
        }}
      />
    );
  }

  if (step === "SCANNING") {
    const scanningLabel =
      selectedCategory === "Custom"
        ? `"${storeCustomQuery}"`
        : t(
            (SMART_CATEGORIES.find((c) => c.label === selectedCategory)?.labelKey ??
              "smart.title") as CategoryLabelKey,
          );
    return (
      <SmartCleanScanningView
        scanningLabel={scanningLabel}
        searchProgress={searchProgress}
        searchStatusText={searchStatusText}
        onStop={stopScan}
      />
    );
  }

  const categoryLabel =
    selectedCategory === "Custom"
      ? `"${storeCustomQuery}"`
      : t(
          (SMART_CATEGORIES.find((c) => c.label === selectedCategory)?.labelKey ??
            "smart.title") as CategoryLabelKey,
        );

  const scanningSubtitle =
    t("smart.photosFound", { count: matchedPhotos.length }) +
    (!scanComplete ? t("smart.stillScanning") : "");

  return (
    <SmartCleanReviewResults
      matchedPhotos={matchedPhotos}
      scanComplete={scanComplete}
      isSearchRunning={isSearchRunning}
      baseTitle={categoryLabel}
      scanningSubtitle={scanningSubtitle}
      onStop={stopScan}
      onBack={() => {
        stopScan();
        useSmartCleanStore.getState().resetSearch();
      }}
      onConfirmDeletion={handleConfirmDeletion}
    />
  );
}

export default function SmartCleanScreen() {
  return <SmartCleanContent />;
}
