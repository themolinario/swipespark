import AsyncStorage from "@react-native-async-storage/async-storage";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";

const ONBOARDING_KEY = "swipespark_onboarding_done";

export default function Index() {
  const [target, setTarget] = useState<"/welcome" | "/(tabs)" | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((value) => {
      if (value === "true") {
        setTarget("/(tabs)");
      } else {
        setTarget("/welcome");
      }
    });
  }, []);

  if (!target) {
    // In attesa della lettura da storage: schermata vuota trasparente
    return <View style={{ flex: 1, backgroundColor: "transparent" }} />;
  }

  return <Redirect href={target} />;
}
