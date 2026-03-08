import '@testing-library/jest-native/extend-expect';

declare global {
  var __ExpoImportMetaRegistry: unknown;
}

// Mock Expo Router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useSegments: () => ['(tabs)'],
  Link: 'Link',
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  },
}));

// Mock safe area context
jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    SafeAreaProvider: jest.fn().mockImplementation(({ children }) => children),
    SafeAreaConsumer: jest.fn().mockImplementation(({ children }) => children(inset)),
    useSafeAreaInsets: jest.fn().mockReturnValue(inset),
  };
});

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
}));

jest.mock('lucide-react-native', () => {
  return new Proxy({}, {
    get: (target, prop) => prop,
  });
});

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Eagerly trigger Expo's lazy global getters so they require() modules inside test scope
try {
  require('expo/src/winter/runtime.native');
  void global.__ExpoImportMetaRegistry;
  void global.TextDecoder;
  void global.TextDecoderStream;
  void global.TextEncoderStream;
  void global.URL;
  void global.URLSearchParams;
  void global.structuredClone;
} catch (e) {
  // ignore
}
