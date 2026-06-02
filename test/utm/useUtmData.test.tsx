import { act, renderHook, waitFor } from "@testing-library/react";
import { pb } from "../../src/lib/pocketbase";
import { useUtmTags, useUtmTemplates } from "../../src/utm/useUtmData";

const mockGetFullList = vi.fn(async () => []);
const mockUpdate = vi.fn(async () => ({}));
const mockDelete = vi.fn(async () => true);
const mockCreate = vi.fn(async () => ({}));

vi.mock("../../src/lib/pocketbase", () => ({
  pb: {
    authStore: { record: { id: "user-1" } },
    collection: () => ({
      getFullList: mockGetFullList,
      update: mockUpdate,
      delete: mockDelete,
      create: mockCreate,
    }),
  },
}));

beforeEach(() => {
  mockGetFullList.mockReset().mockResolvedValue([]);
  mockUpdate.mockReset().mockResolvedValue({});
  mockDelete.mockReset().mockResolvedValue(true);
  mockCreate.mockReset().mockResolvedValue({});
  // @ts-expect-error mock authStore record
  pb.authStore.record = { id: "user-1" };
});

describe("useUtmTemplates", () => {
  it("does not include `user` in the update payload (preserves the owner)", async () => {
    const { result } = renderHook(() => useUtmTemplates());

    await act(async () => {
      await result.current.updateTemplate("tpl-1", {
        name: "name",
        description: "desc",
        source: "google",
        medium: "cpc",
        campaign: "spring",
        term: "kw",
        content: "banner",
      });
    });

    expect(mockUpdate).toHaveBeenCalledTimes(1);
    const [, payload] = mockUpdate.mock.calls[0] as unknown as [string, Record<string, unknown>];
    expect(payload).not.toHaveProperty("user");
  });

  it('sends emptied optional fields as "" so they get cleared in PocketBase', async () => {
    const { result } = renderHook(() => useUtmTemplates());

    await act(async () => {
      await result.current.updateTemplate("tpl-1", {
        name: "name",
        description: "",
        source: "google",
        medium: "cpc",
        campaign: "",
        term: "",
        content: "",
      });
    });

    const [, payload] = mockUpdate.mock.calls[0] as unknown as [string, Record<string, unknown>];
    expect(payload.campaign).toBe("");
    expect(payload.term).toBe("");
    expect(payload.content).toBe("");
  });

  it("rejects with the underlying error when update fails", async () => {
    mockUpdate.mockRejectedValueOnce({ data: { message: "boom" } });
    const { result } = renderHook(() => useUtmTemplates());

    await expect(
      result.current.updateTemplate("tpl-1", {
        name: "name",
        description: "",
        source: "google",
        medium: "cpc",
        campaign: "",
        term: "",
        content: "",
      }),
    ).rejects.toThrow("boom");
  });

  it("rejects when delete fails", async () => {
    mockDelete.mockRejectedValueOnce(new Error("delete failed"));
    const { result } = renderHook(() => useUtmTemplates());

    await expect(result.current.deleteTemplate("tpl-1")).rejects.toThrow(
      "delete failed",
    );
  });
});

describe("useUtmTags", () => {
  it("does not include `user` in the update payload (preserves the owner)", async () => {
    const { result } = renderHook(() => useUtmTags());
    await waitFor(() => expect(mockGetFullList).toHaveBeenCalled());

    await act(async () => {
      await result.current.updateTag("tag-1", "source", "google", "desc");
    });

    expect(mockUpdate).toHaveBeenCalledTimes(1);
    const [, payload] = mockUpdate.mock.calls[0] as unknown as [string, Record<string, unknown>];
    expect(payload).not.toHaveProperty("user");
  });

  it("rejects with the underlying error when update fails", async () => {
    mockUpdate.mockRejectedValueOnce({ message: "tag boom" });
    const { result } = renderHook(() => useUtmTags());

    await expect(
      result.current.updateTag("tag-1", "source", "google"),
    ).rejects.toThrow("tag boom");
  });

  it("rejects when delete fails", async () => {
    mockDelete.mockRejectedValueOnce(new Error("tag delete failed"));
    const { result } = renderHook(() => useUtmTags());

    await expect(result.current.deleteTag("tag-1")).rejects.toThrow(
      "tag delete failed",
    );
  });
});
