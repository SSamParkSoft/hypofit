import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiBaseUrl } from "./client";
import { surveyParticipationsApi } from "./surveyParticipations";

describe("survey participation readback", () => {
  const fetchMock = vi.fn();
  beforeEach(() => vi.stubGlobal("fetch", fetchMock));
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });

  it("returns null for a successful 204 with no participation", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(surveyParticipationsApi.current("post/1", "test-token")).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(
      `${apiBaseUrl}/api/v1/interview-posts/post%2F1/survey/participation`,
      expect.any(Object),
    );
  });

  it("preserves an existing participation", async () => {
    const participation = { id: "participation-1", status: "submitted" };
    fetchMock.mockResolvedValue(Response.json(participation));
    await expect(surveyParticipationsApi.current("post", "test-token")).resolves.toEqual(participation);
  });

  it("does not convert an API error to an empty participation", async () => {
    fetchMock.mockResolvedValue(Response.json({ code: "forbidden", detail: "Forbidden" }, { status: 403 }));
    await expect(surveyParticipationsApi.current("post", "test-token")).rejects.toMatchObject({ status: 403 });
  });
});
