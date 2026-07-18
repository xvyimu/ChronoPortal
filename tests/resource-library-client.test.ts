import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createClient: vi.fn() }));

vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.createClient }));

describe("resource-library client configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    mocks.createClient.mockReset();
  });

  it("falls back to the historical resource-library URL when no URL env is set", async () => {
    vi.stubEnv("RESOURCE_LIBRARY_SUPABASE_URL", "");
    vi.stubEnv("RESOURCE_LIBRARY_URL", "");
    vi.stubEnv("NODE_ENV", "production");
    const { getResourceLibraryUrl } = await import("@/lib/resource-library/client");

    expect(getResourceLibraryUrl()).toBe("https://ihnmfsfbfnctgkhxmghk.supabase.co");
  });

  it("builds the resource search endpoint from the configured resource-library URL", async () => {
    vi.stubEnv("RESOURCE_LIBRARY_SUPABASE_URL", "https://resource-library.example.test/");
    vi.stubEnv("RESOURCE_LIBRARY_URL", "https://legacy-resource-library.example.test");
    const { getResourceLibrarySearchEndpoint } = await import("@/lib/resource-library/client");

    expect(getResourceLibrarySearchEndpoint()).toBe(
      "https://resource-library.example.test/functions/v1/search-api-v3"
    );
  });

  it("uses the anon key for production public reads and never falls back to service_role", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RESOURCE_LIBRARY_ANON_KEY", "");
    vi.stubEnv("RESOURCE_LIBRARY_SERVICE_ROLE_KEY", "service-role-key");
    const { createResourceLibraryReadClient } = await import("@/lib/resource-library/client");

    expect(createResourceLibraryReadClient()).toBeNull();
    expect(mocks.createClient).not.toHaveBeenCalled();
  });
});
