import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { App } from "./App.js";

describe("App", () => {
  it("renders the dashboard shell", () => {
    render(<App />);
    expect(screen.getByText("Generic Corp")).toBeInTheDocument();
    expect(screen.getByText(/Agent-native orchestration dashboard/i)).toBeInTheDocument();
  });
});
