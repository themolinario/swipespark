import { memo, useCallback, useState } from "react";
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";

interface PermissionRequestProps {
  onRequestPermission: () => Promise<void>;
  permissionDenied?: boolean;
}

export const PermissionRequest = memo(function PermissionRequest({
  onRequestPermission,
  permissionDenied = false,
}: PermissionRequestProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [isRequesting, setIsRequesting] = useState(false);

  const handlePress = useCallback(async () => {
    if (permissionDenied) {
      // Open app settings if permission was denied
      if (Platform.OS === "ios") {
        await Linking.openURL("app-settings:");
      } else {
        await Linking.openSettings();
      }
    } else {
      setIsRequesting(true);
      try {
        await onRequestPermission();
      } finally {
        setIsRequesting(false);
      }
    }
  }, [onRequestPermission, permissionDenied]);

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 40,
            paddingBottom: insets.bottom + 40,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <ThemedText style={styles.icon}>📸</ThemedText>
          <ThemedText style={styles.title}>{t("permission.title")}</ThemedText>
          <ThemedText style={styles.description}>
            {permissionDenied
              ? t("permission.descriptionDenied")
              : t("permission.descriptionDefault")}
          </ThemedText>
          <Pressable
            style={[styles.button, isRequesting && styles.buttonDisabled]}
            onPress={handlePress}
            disabled={isRequesting}
          >
            <ThemedText style={styles.buttonText}>
              {isRequesting
                ? t("permission.requesting")
                : permissionDenied
                  ? t("permission.openSettings")
                  : t("permission.allowAccess")}
            </ThemedText>
          </Pressable>
        </View>
      </ScrollView>
    </ThemedView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  content: {
    alignItems: "center",
    gap: 16,
  },
  icon: {
    fontSize: 80,
    marginBottom: 20,
    lineHeight: 100,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    textAlign: "center",
    opacity: 0.7,
    lineHeight: 24,
  },
  button: {
    backgroundColor: "#007aff",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    borderCurve: 'continuous',
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
});
