import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";
import en from "./locales/en.json";
import it from "./locales/it.json";

const LANGUAGE_KEY = "app-language";

const deviceLanguage = getLocales()[0]?.languageCode ?? "en";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    it: { translation: it },
  },
  lng: deviceLanguage,
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

AsyncStorage.getItem(LANGUAGE_KEY).then((saved) => {
  if (saved && saved !== i18n.language) {
    i18n.changeLanguage(saved);
  }
});

export async function setLanguage(code: string) {
  await AsyncStorage.setItem(LANGUAGE_KEY, code);
  await i18n.changeLanguage(code);
}

export default i18n;
