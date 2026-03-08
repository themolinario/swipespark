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

        // Using UNSAFE_getByType since we are mocking lucide-react-native globally
        const trashIcons = UNSAFE_getByType(View).findAllByType("Trash2" as any);
        const heartIcons = UNSAFE_getByType(View).findAllByType("Heart" as any);
        const undoIcons = UNSAFE_getByType(View).findAllByType("Undo2" as any);

        expect(trashIcons.length).toBeGreaterThan(0);
        expect(heartIcons.length).toBeGreaterThan(0);
        expect(undoIcons.length).toBe(0);
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

        const undoIcons = UNSAFE_getByType(View).findAllByType("Undo2" as any);
        expect(undoIcons.length).toBeGreaterThan(0);
    });
});
