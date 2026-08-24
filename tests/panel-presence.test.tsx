import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { usePanelPresence } from "@/hooks/usePanelPresence";

function PresenceExample() {
  const [active, setActive] = useState<string | undefined>();
  const panel = usePanelPresence(active, 220);
  return <>
    <button onClick={() => setActive("mesa")}>Abrir</button>
    <button onClick={() => setActive(undefined)}>Fechar</button>
    {panel.isPresent ? <output data-closing={panel.isClosing}>{panel.renderedItem}</output> : null}
  </>;
}

describe("panel presence", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("keeps the panel mounted until its slide-out animation finishes", () => {
    vi.useFakeTimers();
    render(<PresenceExample />);

    fireEvent.click(screen.getByRole("button", { name: "Abrir" }));
    expect(screen.getByText("mesa")).toHaveAttribute("data-closing", "false");

    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(screen.getByText("mesa")).toHaveAttribute("data-closing", "true");

    act(() => vi.advanceTimersByTime(220));
    expect(screen.queryByText("mesa")).not.toBeInTheDocument();
  });
});
