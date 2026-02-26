import { Button } from "@/components/ui/button";
import { fireEvent, render } from "@testing-library/react-native";
import * as Haptics from "expo-haptics";
import React from "react";

describe("Button UI Component", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("renders correctly with title", () => {
        const { getByText } = render(
            <Button onPress={() => { }} title="Test Button" />
        );
        expect(getByText("Test Button")).toBeTruthy();
    });

    it("calls onPress and triggers haptics when pressed", () => {
        const mockOnPress = jest.fn();
        const { getByText } = render(
            <Button onPress={mockOnPress} title="Press Me" />
        );

        const button = getByText("Press Me");
        fireEvent.press(button);

        expect(mockOnPress).toHaveBeenCalledTimes(1);
        expect(Haptics.impactAsync).toHaveBeenCalledWith(
            Haptics.ImpactFeedbackStyle.Light
        );
    });

    it("renders with different variants without crashing", () => {
        const { getByText: getPrimary } = render(
            <Button onPress={() => { }} title="Primary" variant="primary" />
        );
        expect(getPrimary("Primary")).toBeTruthy();

        const { getByText: getSecondary } = render(
            <Button onPress={() => { }} title="Secondary" variant="secondary" />
        );
        expect(getSecondary("Secondary")).toBeTruthy();

        const { getByText: getDanger } = render(
            <Button onPress={() => { }} title="Danger" variant="danger" />
        );
        expect(getDanger("Danger")).toBeTruthy();

        const { getByText: getSuccess } = render(
            <Button onPress={() => { }} title="Success" variant="success" />
        );
        expect(getSuccess("Success")).toBeTruthy();
    });
});
