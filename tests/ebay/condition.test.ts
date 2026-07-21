import { describe, expect, it } from "vitest";
import { toEbayInventoryCondition } from "@/services/ebay/condition";

describe("toEbayInventoryCondition", () => {
  it("maps Trading API condition IDs", () => {
    expect(toEbayInventoryCondition("1000")).toBe("NEW");
    expect(toEbayInventoryCondition("3000")).toBe("USED_EXCELLENT");
  });

  it("keeps Inventory enums", () => {
    expect(toEbayInventoryCondition("LIKE_NEW")).toBe("LIKE_NEW");
  });

  it("defaults unknown values to NEW", () => {
    expect(toEbayInventoryCondition("")).toBe("NEW");
    expect(toEbayInventoryCondition("xyz")).toBe("NEW");
  });
});
