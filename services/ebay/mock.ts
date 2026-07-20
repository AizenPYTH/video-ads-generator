export const mockInventoryItems = new Map<string, Record<string, unknown>>();
export const mockOffers = new Map<string, Record<string, unknown>>();
export const mockListings = new Map<string, Record<string, unknown>>();

export function generateMockId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function mockEbayResponse<T>(endpoint: string, data: T): T {
  if (process.env.DEBUG_MODE === "true") {
    console.info(`[eBay Mock] ${endpoint}`);
  }
  return data;
}

export const mockPolicies = {
  fulfillmentPolicies: [
    {
      fulfillmentPolicyId: "mock-fulfillment-1",
      name: "Standard Shipping",
      marketplaceId: "EBAY_FR",
    },
  ],
  paymentPolicies: [
    {
      paymentPolicyId: "mock-payment-1",
      name: "eBay Payments",
      marketplaceId: "EBAY_FR",
    },
  ],
  returnPolicies: [
    {
      returnPolicyId: "mock-return-1",
      name: "30 Day Returns",
      marketplaceId: "EBAY_FR",
    },
  ],
};

export const mockOAuthTokens = {
  access_token: "mock_access_token",
  refresh_token: "mock_refresh_token",
  expires_in: 7200,
  token_type: "Bearer",
};
