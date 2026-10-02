import { afterEach, describe, expect, it, vi } from "vitest";
import { getCredentials } from "./auth";
afterEach(() => vi.unstubAllEnvs());
describe("explicit production credentials", () => {
  it("requires a configured password in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_PASSWORD", "");
    expect(() => getCredentials()).toThrow("Configure APP_PASSWORD");
  });
  it("accepts the owner's explicitly configured password in both environments", () => {
    vi.stubEnv("APP_USER", "admin");
    vi.stubEnv("APP_PASSWORD", "kart123");
    vi.stubEnv("NODE_ENV", "development");
    const local = getCredentials();
    vi.stubEnv("NODE_ENV", "production");
    expect(getCredentials()).toEqual(local);
  });
});
