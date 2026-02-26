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

        expect(getByText("SwipeSpark")).toBeTruthy();
        expect(
            getByText("Free up space on your phone\nwith a simple swipe")
        ).toBeTruthy();
        expect(getByText("Swipe left to delete")).toBeTruthy();
        expect(getByText("Swipe right to keep")).toBeTruthy();
    });

    it("navigates to tabs on start button press", () => {
        const { getByText } = render(<WelcomeScreen />);

        const startButton = getByText("Start");
        fireEvent.press(startButton);

        expect(router.replace).toHaveBeenCalledWith("/(tabs)");
    });
});
