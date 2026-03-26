import { FuturisticTabBar } from "@/components/ui/futuristic-tab-bar";
import { Images, Heart, Trash2, Wrench, User } from "lucide-react-native";
import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";

export default function TabLayout() {
  const { t } = useTranslation();
  return (
    <Tabs
      tabBar={(props) => <FuturisticTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: "transparent" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("tabs.swipe"),
          tabBarIcon: ({ color, size }) => (
            <Images size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="kept"
        options={{
          title: t("tabs.keep"),
          tabBarIcon: ({ color, size }) => (
            <Heart size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="delete"
        options={{
          title: t("tabs.delete"),
          tabBarIcon: ({ color, size }) => (
            <Trash2 size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tools"
        options={{
          title: t("tabs.tools"),
          tabBarIcon: ({ color, size }) => (
            <Wrench size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t("tabs.profile"),
          tabBarIcon: ({ color, size }) => (
            <User size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="duplicates"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="smart-clean"
        options={{ href: null }}
      />
    </Tabs>
  );
}
