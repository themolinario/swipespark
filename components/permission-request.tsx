import { memo, useCallback, useState } from "react";
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
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
          <ThemedText style={styles.title}>Photo Access</ThemedText>
          <ThemedText style={styles.description}>
            {permissionDenied
              ? "Photo access was denied. Please enable it in Settings to use this app."
              : "To help you free up space, we need access to your photos."}
          </ThemedText>
          <Pressable
            style={[styles.button, isRequesting && styles.buttonDisabled]}
            onPress={handlePress}
            disabled={isRequesting}
          >
            <ThemedText style={styles.buttonText}>
              {isRequesting
                ? "Requesting..."
                : permissionDenied
                  ? "Open Settings"
                  : "Allow Access"}
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
