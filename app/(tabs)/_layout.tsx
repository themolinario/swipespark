import { FuturisticTabBar } from "@/components/ui/futuristic-tab-bar";
import { Images, Heart, Trash2, Copy, Wand2 } from "lucide-react-native";
import { Tabs } from "expo-router";

export default function TabLayout() {
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
          title: "Swipe",
          tabBarIcon: ({ color, size }) => (
            <Images size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="kept"
        options={{
          title: "Keep",
          tabBarIcon: ({ color, size }) => (
            <Heart size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="delete"
        options={{
          title: "Delete",
          tabBarIcon: ({ color, size }) => (
            <Trash2 size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="duplicates"
        options={{
          title: "Dupes",
          tabBarIcon: ({ color, size }) => (
            <Copy size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="smart-clean"
        options={{
          title: "Smart",
          tabBarIcon: ({ color, size }) => (
            <Wand2 size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
