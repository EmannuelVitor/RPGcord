import { describe, expect, it } from "vitest";
import { SESSION_CONTEXT_HEADER, sessionContextOf, sessionCookieOptions } from "@/lib/session-cookie";

describe("protected session cookies", () => {
  it("uses a secure partitioned cookie inside Discord Activities", () => {
    const options = sessionCookieOptions("discord", 300);

    expect(options).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: "none",
      partitioned: true,
      path: "/",
      maxAge: 300,
    });
  });

  it("keeps the stricter same-site policy for the regular web app", () => {
    const options = sessionCookieOptions("web", 300);

    expect(options.sameSite).toBe("lax");
    expect(options).not.toHaveProperty("partitioned");
  });

  it("accepts the Discord context only through the explicit marker", () => {
    const discordRequest = new Request("https://example.com/api/session", {
      headers: { [SESSION_CONTEXT_HEADER]: "discord" },
    });
    const webRequest = new Request("https://example.com/api/session");

    expect(sessionContextOf(discordRequest)).toBe("discord");
    expect(sessionContextOf(webRequest)).toBe("web");
  });
});
