import WelcomeScreen from "@/app/welcome";
import { fireEvent, render } from "@testing-library/react-native";
import { router } from "expo-router";
import React from "react";

jest.mock("react-native-reanimated", () => {
    const Reanimated = require("react-native-reanimated/mock");
    Reanimated.default.call = () => { };
    return Reanimated;
});

jest.mock("expo-linear-gradient", () => ({
    LinearGradient: ({ children, ...props }: any) => (
        <div {...props}>{children}</div>
    ),
}));

describe("Welcome Screen", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("renders correctly", () => {
        const { getByText } = render(<WelcomeScreen />);

        expect(getByText(/WELCOME TO THE/i)).toBeTruthy();
        expect(getByText(/FUTURE OF PHOTO CLEANING/i)).toBeTruthy();
        expect(
            getByText("Optimized Swipe for clearing memory, automated duplicate removal, and AI-powered image analysis.")
        ).toBeTruthy();
    });

    it("navigates to tabs on start button press", () => {
        const { getByText } = render(<WelcomeScreen />);

        const startButton = getByText("START CLEANING");
        fireEvent.press(startButton);

        expect(router.replace).toHaveBeenCalledWith("/(tabs)");
    });
});
