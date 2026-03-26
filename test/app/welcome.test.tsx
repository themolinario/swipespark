import WelcomeScreen from "@/app/welcome";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
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

        expect(getByText("welcome.title", { exact: false })).toBeTruthy();
        expect(getByText("welcome.titleHighlight")).toBeTruthy();
        expect(getByText("welcome.subtitle")).toBeTruthy();
    });

    it("navigates to tabs on start button press", async () => {
        const { getByText } = render(<WelcomeScreen />);

        const startButton = getByText("welcome.startButton");
        fireEvent.press(startButton);

        await waitFor(() => {
            expect(router.replace).toHaveBeenCalledWith("/(tabs)");
        });
    });
});
