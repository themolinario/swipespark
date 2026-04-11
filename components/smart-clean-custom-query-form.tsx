import { FuturisticHomeBackground } from "@/components/ui/futuristic-home-background";
import { ArrowLeft, Search } from "lucide-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface SmartCleanCustomQueryFormProps {
  onBack: () => void;
  onSearch: (query: string) => void;
}

export function SmartCleanCustomQueryForm({ onBack, onSearch }: SmartCleanCustomQueryFormProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");

  const canSubmit = query.trim().length > 0;

  return (
    <FuturisticHomeBackground style={styles.container}>
      <View style={[styles.inner, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={onBack} style={styles.backButton}>
            <ArrowLeft size={22} color="#4ade80" />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.title} numberOfLines={2}>
              {t("smart.customSearchTitle")}
            </Text>
            <Text style={styles.subtitle} numberOfLines={3}>
              {t("smart.customSearchSubtitle")}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.separator,
            {
              experimental_backgroundImage:
                "linear-gradient(to right, rgba(74,222,128,0), rgba(74,222,128,0.4), rgba(74,222,128,0))",
            },
          ]}
        />

        <View style={styles.form}>
          <TextInput
            style={styles.textInput}
            placeholder={t("smart.enterKeyword")}
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
            onSubmitEditing={() => canSubmit && onSearch(query.trim())}
          />
          <Pressable
            style={({ pressed }) => [
              styles.searchButton,
              { opacity: canSubmit ? (pressed ? 0.8 : 1) : 0.4 },
            ]}
            disabled={!canSubmit}
            onPress={() => onSearch(query.trim())}
          >
            <Search size={18} color="#fff" />
            <Text style={styles.searchButtonText}>{t("smart.search")}</Text>
          </Pressable>
        </View>
      </View>
    </FuturisticHomeBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  headerText: {
    flex: 1,
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
  separator: {
    height: 1,
    marginHorizontal: 20,
    marginVertical: 14,
  },
  form: {
    paddingHorizontal: 20,
    gap: 16,
  },
  textInput: {
    fontSize: 16,
    padding: 16,
    borderWidth: 1,
    borderRadius: 14,
    borderCurve: "continuous",
    borderColor: "rgba(74,222,128,0.3)",
    backgroundColor: "rgba(74,222,128,0.05)",
    color: "#fff",
  },
  searchButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 24,
    borderCurve: "continuous",
    backgroundColor: "rgba(74,222,128,0.15)",
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.5)",
    shadowColor: "#4ade80",
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
    shadowOpacity: 0.3,
  },
  searchButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
});
