import { EbayClient, isEbayMockMode } from "./client";
import { mockPolicies } from "./mock";

export interface EbayPolicy {
  id: string;
  name: string;
  marketplaceId: string;
}

export interface EbayPolicies {
  fulfillment: EbayPolicy[];
  payment: EbayPolicy[];
  returns: EbayPolicy[];
}

export interface ResolvedListingPolicies {
  fulfillmentPolicyId: string;
  paymentPolicyId: string;
  returnPolicyId: string;
  merchantLocationKey: string;
}

export async function fetchEbayPolicies(
  client: EbayClient,
): Promise<EbayPolicies> {
  if (isEbayMockMode()) {
    return {
      fulfillment: mockPolicies.fulfillmentPolicies.map((p) => ({
        id: p.fulfillmentPolicyId,
        name: p.name,
        marketplaceId: p.marketplaceId,
      })),
      payment: mockPolicies.paymentPolicies.map((p) => ({
        id: p.paymentPolicyId,
        name: p.name,
        marketplaceId: p.marketplaceId,
      })),
      returns: mockPolicies.returnPolicies.map((p) => ({
        id: p.returnPolicyId,
        name: p.name,
        marketplaceId: p.marketplaceId,
      })),
    };
  }

  const marketplaceId = client.marketplace;

  const [fulfillment, payment, returns] = await Promise.all([
    client.get<{
      fulfillmentPolicies?: Array<{
        fulfillmentPolicyId: string;
        name: string;
        marketplaceId: string;
      }>;
    }>(`/sell/account/v1/fulfillment_policy?marketplace_id=${marketplaceId}`),
    client.get<{
      paymentPolicies?: Array<{
        paymentPolicyId: string;
        name: string;
        marketplaceId: string;
      }>;
    }>(`/sell/account/v1/payment_policy?marketplace_id=${marketplaceId}`),
    client.get<{
      returnPolicies?: Array<{
        returnPolicyId: string;
        name: string;
        marketplaceId: string;
      }>;
    }>(`/sell/account/v1/return_policy?marketplace_id=${marketplaceId}`),
  ]);

  return {
    fulfillment: (fulfillment.fulfillmentPolicies ?? []).map((p) => ({
      id: p.fulfillmentPolicyId,
      name: p.name,
      marketplaceId: p.marketplaceId,
    })),
    payment: (payment.paymentPolicies ?? []).map((p) => ({
      id: p.paymentPolicyId,
      name: p.name,
      marketplaceId: p.marketplaceId,
    })),
    returns: (returns.returnPolicies ?? []).map((p) => ({
      id: p.returnPolicyId,
      name: p.name,
      marketplaceId: p.marketplaceId,
    })),
  };
}
