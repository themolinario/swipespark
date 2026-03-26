import { useAchievementStore } from "@/stores/achievement-store";
import type { AchievementId } from "@/stores/achievement-store";
import { memo, useCallback, useEffect, useState } from "react";
import { AchievementToast } from "./achievement-toast";

const TOAST_DURATION = 10000;

export const AchievementProvider = memo(function AchievementProvider() {
  const [currentToast, setCurrentToast] = useState<AchievementId | null>(null);
  const toastQueue = useAchievementStore((s) => s.toastQueue);
  const consumeToast = useAchievementStore((s) => s.consumeToast);

  useEffect(() => {
    if (toastQueue.length > 0 && !currentToast) {
      const next = consumeToast();
      if (next) {
        setCurrentToast(next);
        const timer = setTimeout(() => setCurrentToast(null), TOAST_DURATION);
        return () => clearTimeout(timer);
      }
    }
  }, [toastQueue.length, currentToast, consumeToast]);

  const handleDismiss = useCallback(() => {
    setCurrentToast(null);
  }, []);

  if (!currentToast) return null;

  return (
    <AchievementToast
      key={currentToast}
      achievementId={currentToast}
      onDismiss={handleDismiss}
    />
  );
});
