import React from "react";
import { render, screen } from "@testing-library/react-native";
import { EmptyState } from "@/components/empty-state";

describe("EmptyState", () => {
    it("should render without crashing", () => {
        render(<EmptyState />);
    });

    it("should display the title translation key", () => {
        render(<EmptyState />);
        expect(screen.getByText("emptyState.title")).toBeTruthy();
    });

    it("should display the description translation key", () => {
        render(<EmptyState />);
        expect(screen.getByText("emptyState.description")).toBeTruthy();
    });
});
