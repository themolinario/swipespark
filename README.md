# SwipeSpark

A privacy-first photo management app for iOS and Android that helps you clean up your camera roll using Tinder-like swipe gestures, AI-powered duplicate detection, and smart cleanup with on-device machine learning.

**Everything runs on-device. No cloud uploads. No data collection.**

---

## Features

### Swipe to Decide
Swipe right to keep, swipe left to delete. Review your entire photo library one photo at a time with smooth 60fps animations and haptic feedback. Accidentally swiped wrong? Undo instantly.

### Duplicate Detection
Native perceptual hashing identifies exact duplicate photos across your entire library. Photos are grouped by content hash, with automatic selection of duplicates to remove while keeping the original.

### Smart Cleanup
On-device machine learning classifies your photos into categories — **People**, **Landscapes**, **Documents**, **Animals**, **Food**, **Vehicles**, **Interiors** — or use a custom search query. Scan your library, review matches, and bulk-delete what you don't need. Results are cached for 30 days to avoid re-processing.

### Batch Management
- **Delete tab** — Review all photos marked for deletion before permanently removing them
- **Kept tab** — Browse photos you chose to keep, restore any back to the review queue
- Drag-to-select for fast multi-selection across grid views
- Full-screen photo preview with pinch-to-zoom
- Storage space estimation before deletion

### Privacy First
Works entirely on-device using your local media library. No cloud uploads, no tracking, no accounts. Your photos never leave your device.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native 0.81 + Expo 54 |
| Language | TypeScript 5.9 |
| UI | React 19 |
| Navigation | Expo Router 6 (file-based routing) |
| State Management | Zustand 5 + AsyncStorage |
| Animations | React Native Reanimated 4 |
| Gestures | React Native Gesture Handler 2 |
| Media Access | expo-media-library |
| Image Rendering | expo-image |
| ML / Hashing | Custom Expo native modules (Swift + Kotlin) |
| UI Effects | expo-blur, expo-glass-effect, expo-linear-gradient |
| Haptics | expo-haptics |
| Icons | lucide-react-native |
| Testing | Jest + React Native Testing Library |

---

## Project Structure

```
swipespark/
├── app/                        # Screens (Expo Router)
│   ├── _layout.tsx             # Root layout
│   ├── index.tsx               # Entry point / onboarding check
│   ├── welcome.tsx             # Onboarding screen
│   └── (tabs)/                 # Bottom tab navigation
│       ├── _layout.tsx         # Tab bar configuration
│       ├── index.tsx           # Swiper (home)
│       ├── delete.tsx          # Deletion queue
│       ├── kept.tsx            # Kept photos
│       ├── duplicates.tsx      # Duplicate scanner
│       └── smart-clean.tsx     # AI classification cleanup
│
├── components/                 # Reusable UI components
│   ├── photo-swiper.tsx        # Core swipe interaction engine
│   ├── photo-card.tsx          # Photo display card
│   ├── action-buttons.tsx      # Delete / Keep buttons with haptics
│   ├── stats-header.tsx        # Progress and stats display
│   ├── photo-preview-modal.tsx # Full-screen photo preview
│   ├── confirm-deletion-modal.tsx
│   ├── deletion-success-modal.tsx
│   ├── empty-state.tsx         # Empty state illustrations
│   ├── permission-request.tsx  # Permission request UI
│   └── ui/                     # Design system primitives
│       ├── button.tsx
│       ├── glass-view.tsx
│       ├── animated-scanner.tsx
│       ├── animated-gradient-background.tsx
│       ├── futuristic-home-background.tsx
│       ├── futuristic-welcome-background.tsx
│       ├── futuristic-tab-bar.tsx
│       └── gradient-background.tsx
│
├── modules/                    # Expo native modules
│   ├── image-classifier/       # On-device ML classification
│   │   ├── ios/                # Swift implementation
│   │   ├── android/            # Kotlin implementation
│   │   └── src/                # TypeScript interface
│   └── duplicate-detector/     # Perceptual hashing
│       ├── ios/                # Swift implementation
│       ├── android/            # Kotlin implementation
│       └── src/                # TypeScript interface
│
├── stores/                     # Zustand stores (persisted via AsyncStorage)
│   ├── photo-store.ts          # Keep / delete decisions
│   ├── duplicate-store.ts      # Duplicate groups, scan state, hashes
│   └── classification-cache.ts # ML label cache (30-day TTL)
│
├── hooks/                      # Custom React hooks
│   ├── use-photos.ts           # Photo loading, pagination, preloading
│   └── use-duplicates.ts       # Duplicate scan orchestration
│
├── services/                   # Service abstractions
│   └── media-library.service.ts
│
├── utils/                      # Pure utility functions
│   ├── duplicate-detection.ts  # Hash-based grouping logic
│   └── category-mapper.ts      # ML label → category mapping with scoring
│
├── constants/                  # Theme and app constants
├── test/                       # Jest test suites
└── assets/                     # Images, icons, splash screens
```

---

## Native Modules

### Image Classifier (`modules/image-classifier/`)

Runs on-device machine learning models to classify photos by visual content. Returns labels with confidence scores that are mapped to predefined categories using a weighted scoring system. A minimum confidence threshold of 0.3 filters out low-confidence results.

| Function | Description |
|---|---|
| `classifyImage(assetId)` | Classify a single photo |
| `classifyImages(assetIds)` | Classify multiple photos in batch |
| `getAssetsSize()` | Get total size of all photo assets |
| `getAssetsSizeByIds(ids)` | Get size of specific assets |

### Duplicate Detector (`modules/duplicate-detector/`)

Computes perceptual hashes natively for fast, accurate duplicate detection. Photos are first pre-filtered by matching dimensions before hashing to reduce computation.

| Function | Description |
|---|---|
| `computeHashes(assetIds)` | Returns `Record<assetId, hash>` |

Both modules have platform-specific implementations in **Swift** (iOS) and **Kotlin** (Android).

---

## How It Works

### Swipe Flow
1. Photos load in paginated batches of 20 with automatic preloading (threshold: 5 remaining)
2. User swipes left (delete) or right (keep) via pan gestures
3. Decisions persist locally in Zustand stores backed by AsyncStorage
4. Photos appear in the Delete or Kept tabs for review
5. Permanent deletion only happens after explicit user confirmation
6. After deletion, the swiper automatically refreshes to exclude removed photos

### Duplicate Detection Flow
1. All photos are fetched from the media library
2. Pre-filtering groups photos by matching dimensions (width x height)
3. Potential duplicates are hashed natively via `DuplicateDetector`
4. Photos with identical hashes are grouped together
5. User reviews groups — the app auto-selects duplicates (keeps the first, marks the rest)
6. Selected duplicates can be bulk-deleted with one tap

### Smart Cleanup Flow
1. User picks a category (People, Landscapes, Documents, etc.) or enters a custom query
2. Photos are classified in batches using the native ML module
3. Labels are cached in `classification-cache` to avoid re-classification (30-day TTL)
4. `category-mapper` scores labels against categories using weighted keyword matching
5. Matches are displayed in a scrollable grid with progressive loading
6. User selects and deletes unwanted photos in bulk

---

## Design

Dark mode only. The UI follows a futuristic glassmorphism aesthetic:

- **Neon green** (`#4ade80`) for positive actions (keep, confirm)
- **Neon red** (`#ff6b6b`) for destructive actions (delete)
- Glassmorphic panels with blur, transparency, and glowing borders
- Animated gradient backgrounds with particle effects
- Custom animated tab bar with icon transitions
- Haptic feedback on all major interactions
- Smooth Reanimated-powered entrance animations throughout

---

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- Xcode 15+ (iOS) or Android Studio (Android)
- A physical device is recommended (native modules require camera roll access)

### Installation

```bash
git clone <repo-url>
cd swipespark
npm install
```

### Development

```bash
# Start Expo dev server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android
```

> **Note:** This app uses custom native modules, so it requires a [development build](https://docs.expo.dev/develop/development-builds/introduction/) — Expo Go is not supported.

### Building with EAS

The project uses [EAS Build](https://docs.expo.dev/build/introduction/) for cloud builds.

```bash
# Development build (internal distribution)
eas build --profile development

# Preview build
eas build --profile preview

# Production build
eas build --profile production
```

### Testing

```bash
npm test
```

### Linting & Formatting

```bash
npm run lint
npm run format
```

---

## Permissions

| Platform | Permission | Purpose |
|---|---|---|
| iOS | Photo Library (read/write) | Access, read, and delete photos from the camera roll |
| Android | `READ_MEDIA_IMAGES` | Read the photo library |
| Android | `WRITE_EXTERNAL_STORAGE` | Delete photos from the device |

The app requests permissions at launch and provides a custom UI guiding users through the permission flow.

---

## License

This project is open-source and available under the terms of the **MIT License** — see the [LICENSE](LICENSE) file for details.
You are free to use, modify, and distribute this software, but you **must include the original copyright notice and provide attribution** (cite Marco as the original author).
