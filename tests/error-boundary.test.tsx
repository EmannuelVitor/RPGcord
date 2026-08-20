import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";

function BrokenModule(): never {
  throw new Error("falha simulada");
}

describe("SectionErrorBoundary", () => {
  beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => undefined));

  it("keeps a module failure contained", () => {
    render(<SectionErrorBoundary title="Mapa indisponível"><BrokenModule /></SectionErrorBoundary>);
    expect(screen.getByRole("alert")).toHaveTextContent("Mapa indisponível");
    expect(screen.getByRole("button", { name: /tentar novamente/i })).toBeInTheDocument();
  });
});
