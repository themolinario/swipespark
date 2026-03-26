import React from "react";
import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { StatsHeader } from "@/components/stats-header";

describe("StatsHeader", () => {
    it("should display correct displayedIndex (currentIndex + 1)", () => {
        render(
            <StatsHeader currentIndex={4} totalCount={10} deletedCount={2} />
        );
        expect(screen.getByText("5")).toBeTruthy();
    });

    it("should display 0 when totalCount is 0", () => {
        render(
            <StatsHeader currentIndex={0} totalCount={0} deletedCount={0} />
        );
        const zeros = screen.getAllByText("0");
        expect(zeros.length).toBeGreaterThanOrEqual(2);
    });

    it("should clamp displayedIndex to totalCount", () => {
        render(
            <StatsHeader currentIndex={99} totalCount={10} deletedCount={0} />
        );
        expect(screen.getByText("10")).toBeTruthy();
    });

    it("should display deletedCount", () => {
        render(
            <StatsHeader currentIndex={0} totalCount={10} deletedCount={7} />
        );
        expect(screen.getByText("7")).toBeTruthy();
    });

    it("should display totalCount in label", () => {
        render(
            <StatsHeader currentIndex={0} totalCount={42} deletedCount={0} />
        );
        expect(screen.getByText("/ 42")).toBeTruthy();
    });

    it("should render actionButton when provided", () => {
        render(
            <StatsHeader
                currentIndex={0}
                totalCount={10}
                deletedCount={0}
                actionButton={<Text>MyAction</Text>}
            />
        );
        expect(screen.getByText("MyAction")).toBeTruthy();
    });

    it("should not render actionButton content when not provided", () => {
        render(
            <StatsHeader currentIndex={0} totalCount={10} deletedCount={0} />
        );
        expect(screen.queryByText("MyAction")).toBeNull();
    });
});
