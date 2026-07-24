import { describe, expect, it } from "vitest";
import { coerceImportUrl } from "@/lib/scraping/coerce-url";
import { classifyImportUrl } from "@/lib/scraping/url-kind";

describe("coerceImportUrl", () => {
  it("adds https and www for bare amazon.fr links", () => {
    const raw =
      "amazon.fr/Apple-iPhone-15-128-Go/dp/B0CHXFCYCR/ref=asc_df_B0CHXFCYCR?tag=googshopfr-21";
    const out = coerceImportUrl(raw);
    expect(out).toBe("https://www.amazon.fr/dp/B0CHXFCYCR");
  });

  it("accepts long google-shopping amazon urls without protocol", () => {
    const raw =
      "amazon.fr/Apple-iPhone-15-128-Go/dp/B0CHXFCYCR/ref=asc_df_B0CHXFCYCR?mcid=c31424673a693851a1d1be57847a7e75&tag=googshopfr-21&hvpos=&psc=1";
    const out = coerceImportUrl(raw);
    expect(out).toBe("https://www.amazon.fr/dp/B0CHXFCYCR");
    expect(classifyImportUrl(out).kind).toBe("product");
  });

  it("classifies coerced amazon url as product", () => {
    const raw = "amazon.fr/dp/B0CHXFCYCR?psc=1";
    expect(classifyImportUrl(raw).kind).toBe("product");
  });
});
