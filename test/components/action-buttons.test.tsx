import { ActionButtons } from "@/components/action-buttons";
import { render } from "@testing-library/react-native";
import React from "react";
import { View } from "react-native";

describe("ActionButtons Component", () => {
    const mockOnDelete = jest.fn();
    const mockOnKeep = jest.fn();
    const mockOnUndo = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("renders delete and keep buttons", () => {
        const { UNSAFE_getByType } = render(
            <ActionButtons
                onDelete={mockOnDelete}
                onKeep={mockOnKeep}
                onUndo={mockOnUndo}
                canUndo={false}
            />
        );

        // Using UNSAFE_getByType since we are mocking vector-icons
        const icons = UNSAFE_getByType(View).findAllByType("Ionicons" as any);
        expect(icons.some((icon: any) => icon.props.name === "trash")).toBe(true);
        expect(icons.some((icon: any) => icon.props.name === "heart")).toBe(true);
        expect(icons.some((icon: any) => icon.props.name === "arrow-undo")).toBe(false);
    });

    it("renders undo button if canUndo is true", () => {
        const { UNSAFE_getByType } = render(
            <ActionButtons
                onDelete={mockOnDelete}
                onKeep={mockOnKeep}
                onUndo={mockOnUndo}
                canUndo={true}
            />
        );

        const icons = UNSAFE_getByType(View).findAllByType("Ionicons" as any);
        expect(icons.some((icon: any) => icon.props.name === "arrow-undo")).toBe(true);
    });
});
