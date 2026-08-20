import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useResizablePanels } from "@/hooks/useResizablePanels";

function RightPanelHandle() {
  const { panelWidth, startResize } = useResizablePanels();
  return <button onPointerDown={(event) => startResize("right", event)}>{panelWidth}</button>;
}

describe("resizable panels", () => {
  afterEach(cleanup);

  beforeEach(() => {
    window.localStorage.clear();
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1440 });
    Object.defineProperty(HTMLElement.prototype, "setPointerCapture", { configurable: true, value: vi.fn() });
  });

  it("shrinks and restores the right panel while dragging its left edge", () => {
    render(<RightPanelHandle />);
    const handle = screen.getByRole("button");

    expect(handle).toHaveTextContent("460");
    fireEvent.pointerDown(handle, { pointerId: 1, clientX: 980 });
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 1080 });
    expect(handle).toHaveTextContent("360");

    fireEvent.pointerMove(window, { pointerId: 1, clientX: 900 });
    expect(handle).toHaveTextContent("540");
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 900 });
    expect(window.localStorage.getItem("rpgcord.layout.panelWidth")).toBe("540");
  });

  it("keeps resizing enabled on compact desktop layouts", () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 900 });
    render(<RightPanelHandle />);
    const handle = screen.getByRole("button");

    fireEvent.pointerDown(handle, { pointerId: 1, clientX: 440 });
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 500 });
    expect(handle).toHaveTextContent("400");
  });

  it("leaves the full-width mobile panel fixed", () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 800 });
    render(<RightPanelHandle />);
    const handle = screen.getByRole("button");

    fireEvent.pointerDown(handle, { pointerId: 1, clientX: 340 });
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 440 });
    expect(handle).toHaveTextContent("460");
  });
});
