import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MapAssetManager } from "@/components/MapAssetManager";
import { uploadCampaignImage } from "@/lib/campaign-image-upload";

vi.mock("@/lib/campaign-image-upload", () => ({ uploadCampaignImage: vi.fn() }));

describe("map asset manager", () => {
  beforeEach(() => vi.mocked(uploadCampaignImage).mockReset());

  it("accepts a local image when creating an asset", async () => {
    vi.mocked(uploadCampaignImage).mockResolvedValue("/api/drive-image?id=asset");
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<MapAssetManager campaignId="campaign" assets={[]} onSave={onSave} onDelete={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Baú" } });
    const file = new File(["image"], "bau.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText(/Enviar imagem/), { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: /Adicionar asset ao mapa/ }));

    await waitFor(() => expect(uploadCampaignImage).toHaveBeenCalledWith("campaign", file, "asset"));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ name: "Baú", imageUrl: "/api/drive-image?id=asset" }));
  });
});
