import { describe, expect, it } from "vitest";
import { appStoreIdFrom, isAppStoreUrl } from "../src/services/appstore.service";

describe("App Store URLs", () => {
  it("recognises listing hosts and nothing else", () => {
    expect(isAppStoreUrl("https://apps.apple.com/us/app/linear/id1519021395")).toBe(true);
    expect(isAppStoreUrl("https://apps.apple.com/fr/app/id1519021395")).toBe(true);
    expect(isAppStoreUrl("https://itunes.apple.com/app/id1519021395")).toBe(true);
    expect(isAppStoreUrl("https://www.apple.com/iphone/")).toBe(false);
    expect(isAppStoreUrl("https://apps.apple.com.evil.example/app/id1")).toBe(false);
    expect(isAppStoreUrl("not a url")).toBe(false);
  });

  it("pulls the numeric id out of every URL shape Apple uses", () => {
    expect(appStoreIdFrom("https://apps.apple.com/us/app/linear/id1519021395")).toBe("1519021395");
    expect(appStoreIdFrom("https://apps.apple.com/app/id1519021395?platform=iphone")).toBe("1519021395");
    expect(appStoreIdFrom("https://apps.apple.com/fr/app/id1519021395/")).toBe("1519021395");
    expect(appStoreIdFrom("https://apps.apple.com/us/app/linear")).toBeNull();
    // A short number in the path is not an id.
    expect(appStoreIdFrom("https://apps.apple.com/us/app/id12")).toBeNull();
  });
});
