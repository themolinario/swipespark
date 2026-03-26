import DuplicatesScreen from "@/app/(tabs)/duplicates";
import { useDuplicates } from "@/hooks/use-duplicates";
import { fireEvent, render } from "@testing-library/react-native";
import React from "react";

// Mock the hook
jest.mock("@/hooks/use-duplicates", () => ({
    useDuplicates: jest.fn(),
}));

// Mock AnimatedScanner to avoid issues with native modules
jest.mock("@/components/ui/animated-scanner", () => ({
    AnimatedScanner: () => "AnimatedScannerMock",
}));
jest.mock("expo-image", () => ({
    Image: "Image",
}));
// Mock Gesture handlers and Reanimated
jest.mock("react-native-gesture-handler", () => {
    const React = require("react");
    const { View } = require("react-native");
    return {
        GestureDetector: ({ children }: any) => <View>{children}</View>,
        Gesture: {
            Pan: () => ({
                enabled: jest.fn().mockReturnThis(),
                activeOffsetX: jest.fn().mockReturnThis(),
                failOffsetY: jest.fn().mockReturnThis(),
                runOnJS: jest.fn().mockReturnThis(),
                onStart: jest.fn().mockReturnThis(),
                onUpdate: jest.fn().mockReturnThis(),
                onEnd: jest.fn().mockReturnThis(),
                onFinalize: jest.fn().mockReturnThis(),
            }),
        },
    };
});
jest.mock("react-native-safe-area-context", () => ({
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock("@react-navigation/bottom-tabs", () => ({
    useBottomTabBarHeight: () => 50,
}));

const mockScanDuplicates = jest.fn();
const mockDeleteDuplicates = jest.fn();

describe("DuplicatesScreen", () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Setup default mock implementation
        (useDuplicates as jest.Mock).mockReturnValue({
            duplicateGroups: [],
            isScanning: false,
            progress: 0,
            scanStatusText: "",
            hasPermission: true,
            scanDuplicates: mockScanDuplicates,
            deleteDuplicates: mockDeleteDuplicates,
        });
    });

    it("renders empty state when permission is missing", () => {
        (useDuplicates as jest.Mock).mockReturnValue({
            duplicateGroups: [],
            isScanning: false,
            hasPermission: false,
            scanDuplicates: mockScanDuplicates,
        });

        const { getByText } = render(<DuplicatesScreen />);
        expect(getByText("duplicates.permissionNeeded")).toBeTruthy();

        fireEvent.press(getByText("duplicates.grantPermission"));
        expect(mockScanDuplicates).toHaveBeenCalled();
    });

    it("renders empty state when scanning", () => {
        (useDuplicates as jest.Mock).mockReturnValue({
            duplicateGroups: [],
            isScanning: true,
            progress: 0.5,
            scanStatusText: "Testing scan...",
            hasPermission: true,
            scanDuplicates: mockScanDuplicates,
        });

        const { getByText } = render(<DuplicatesScreen />);
        expect(getByText("duplicates.scanningLibrary")).toBeTruthy();
        expect(getByText("Testing scan...")).toBeTruthy();
        expect(getByText("duplicates.percentComplete")).toBeTruthy();
    });

    it("renders empty state when no duplicates are found", () => {
        const { getByText } = render(<DuplicatesScreen />);
        expect(getByText("duplicates.startScanTitle")).toBeTruthy();

        fireEvent.press(getByText("duplicates.startScan"));
        expect(mockScanDuplicates).toHaveBeenCalled();
    });

    it("renders duplicate groups when available", () => {
        const groups = [
            {
                id: "group1",
                photos: [
                    { id: "1", uri: "uri1", width: 100, height: 100, filename: "test.jpg" },
                    { id: "2", uri: "uri2", width: 100, height: 100, filename: "test.jpg" }
                ],
            }
        ];

        (useDuplicates as jest.Mock).mockReturnValue({
            duplicateGroups: groups,
            isScanning: false,
            hasPermission: true,
            scanDuplicates: mockScanDuplicates,
        });

        const { getByText } = render(<DuplicatesScreen />);
        expect(getByText("duplicates.groupsFound")).toBeTruthy();
        expect(getByText("test.jpg")).toBeTruthy();
        expect(getByText(/100x100/)).toBeTruthy();

        expect(getByText("duplicates.autoSelect")).toBeTruthy();
    });
});
