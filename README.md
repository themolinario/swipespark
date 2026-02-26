# SwipeSpark

SwipeSpark is a simple, fast, and beautifully designed mobile application built with React Native and Expo. It helps you quickly clean up your phone's camera roll and free up storage space by utilizing intuitive swipe gestures—swipe left to mark for deletion, swipe right to keep.

## 🚀 Features

- **Tinder-like Swiping:** Effortlessly sort through your local photo gallery with fluid, gesture-based interactions.
- **Batch Management:** Review your "To Delete" and "Kept" lists before committing any destructive changes to your device.
- **Drag-to-Select:** Select multiple photos at once in your review lists with intuitive drag-to-select gestures.
- **Undo Actions:** Accidentally swiped the wrong way? Quickly undo your last action.
- **Modern Glassmorphism UI:** Features a premium, visually appealing translucent interface utilizing `expo-glass-effect` and gradients.
- **Haptic Feedback:** Meaningful tactile feedback powered by `expo-haptics` for all major interactions to enhance the user experience.
- **Privacy First, Offline Ready:** Works entirely on-device using your local media library. No cloud uploads, maximizing privacy and speed.

## 🏗️ Architecture & Technologies

SwipeSpark is built on top of a modern, scalable mobile tech stack:

- **Framework:** [React Native](https://reactnative.dev) utilizing [Expo](https://expo.dev) for cross-platform (iOS/Android) mobile development.
- **Routing:** [Expo Router](https://docs.expo.dev/router/introduction/) for declarative, file-based navigation.
- **State Management:** [Zustand](https://github.com/pmndrs/zustand) for simple, scalable global state, persisted efficiently with `AsyncStorage`.
- **Animations & Gestures:** [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/) and [React Native Gesture Handler](https://docs.swmansion.com/react-native-gesture-handler/) for buttery-smooth 60fps animations and responsive gesture controls.
- **Media Access:** `expo-media-library` for secure, performant access to the device's camera roll and photo management capabilities.
- **Testing:** Comprehensive, robust test suite utilizing [Jest](https://jestjs.io/) and [React Native Testing Library](https://callstack.github.io/react-native-testing-library/).

## 📁 Project Structure

- `app/`: Contains Expo Router screens, tabs, and layout definitions.
- `components/`: Highly reusable UI components (e.g., `GlassView`, `Button`, `ActionButtons`).
- `constants/`: Theming, styles, and color definitions matching the user's system preferences (Light/Dark mode).
- `hooks/`: Custom React hooks encapsulating complex business logic (e.g., `use-photos.ts` which manages the core swiping/loading logic).
- `services/`: Native module abstractions and API wrappers (e.g., `media-library.service.ts`).
- `stores/`: Zustand global state definitions (e.g., `photo-store.ts`).
- `test/`: Jest unit and component test suites grouped by domain.

## 🛠️ Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm start
   ```

3. **Run tests:**
   ```bash
   npm test
   ```

You can run the app directly on your physical device using the [Expo Go](https://expo.dev/go) app, or on iOS Simulator / Android Emulator.

## 📄 License

This project is open-source and available under the terms of the **MIT License** - see the [LICENSE](LICENSE) file for details.
You are completely free to use, modify, and distribute this software, but you **must include the original copyright notice and provide attribution** (cite Marco as the original author).
