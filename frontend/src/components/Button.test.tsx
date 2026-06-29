import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { getCountryName } from "@/lib/countries";

describe("Button Component Example", () => {
  it("renders a button", () => {
    render(<button>Click me</button>);
    expect(
      screen.getByRole("button", { name: /click me/i }),
    ).toBeInTheDocument();
  });

  it("resolves alias imports in test runtime", () => {
    expect(getCountryName("US")).toBe("United States");
  });
});
