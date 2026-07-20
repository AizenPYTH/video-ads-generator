export const PlanId = {
  FREE: "FREE",
  STARTER: "STARTER",
  PRO: "PRO",
  BUSINESS: "BUSINESS",
} as const;

export type PlanId = (typeof PlanId)[keyof typeof PlanId];

export interface PlanQuotas {
  analysesPerMonth: number;
  publicationsPerMonth: number;
  importsPerMonth: number;
  urlImportsPerMonth: number;
  bulkPublishEnabled: boolean;
  maxBulkPublishItems: number;
  imagesPerProduct: number;
  rowsPerImport: number;
}

export interface PlanConfig {
  id: PlanId;
  name: string;
  stripePriceId?: string;
  quotas: PlanQuotas;
}

function getStripePriceId(plan: PlanId): string | undefined {
  switch (plan) {
    case PlanId.STARTER:
      return process.env.STRIPE_PRICE_STARTER;
    case PlanId.PRO:
      return process.env.STRIPE_PRICE_PRO;
    case PlanId.BUSINESS:
      return process.env.STRIPE_PRICE_BUSINESS;
    default:
      return undefined;
  }
}

export const PLANS: Record<PlanId, PlanConfig> = {
  [PlanId.FREE]: {
    id: PlanId.FREE,
    name: "Free",
    quotas: {
      analysesPerMonth: 10,
      publicationsPerMonth: 3,
      importsPerMonth: 2,
      urlImportsPerMonth: 5,
      bulkPublishEnabled: false,
      maxBulkPublishItems: 0,
      imagesPerProduct: 3,
      rowsPerImport: 50,
    },
  },
  [PlanId.STARTER]: {
    id: PlanId.STARTER,
    name: "Starter",
    get stripePriceId() {
      return getStripePriceId(PlanId.STARTER);
    },
    quotas: {
      analysesPerMonth: 100,
      publicationsPerMonth: 25,
      importsPerMonth: 10,
      urlImportsPerMonth: 50,
      bulkPublishEnabled: true,
      maxBulkPublishItems: 10,
      imagesPerProduct: 6,
      rowsPerImport: 500,
    },
  },
  [PlanId.PRO]: {
    id: PlanId.PRO,
    name: "Pro",
    get stripePriceId() {
      return getStripePriceId(PlanId.PRO);
    },
    quotas: {
      analysesPerMonth: 500,
      publicationsPerMonth: 150,
      importsPerMonth: 50,
      urlImportsPerMonth: 250,
      bulkPublishEnabled: true,
      maxBulkPublishItems: 50,
      imagesPerProduct: 12,
      rowsPerImport: 2000,
    },
  },
  [PlanId.BUSINESS]: {
    id: PlanId.BUSINESS,
    name: "Business",
    get stripePriceId() {
      return getStripePriceId(PlanId.BUSINESS);
    },
    quotas: {
      analysesPerMonth: 2000,
      publicationsPerMonth: 1000,
      importsPerMonth: 200,
      urlImportsPerMonth: 1000,
      bulkPublishEnabled: true,
      maxBulkPublishItems: 200,
      imagesPerProduct: 24,
      rowsPerImport: 10_000,
    },
  },
};

export type UsageMetric =
  | "analyses"
  | "publications"
  | "imports"
  | "url_imports";

const METRIC_TO_QUOTA_KEY: Record<
  UsageMetric,
  keyof PlanQuotas
> = {
  analyses: "analysesPerMonth",
  publications: "publicationsPerMonth",
  imports: "importsPerMonth",
  url_imports: "urlImportsPerMonth",
};

export function getPlan(planId: PlanId): PlanConfig {
  return PLANS[planId] ?? PLANS[PlanId.FREE];
}

export function getQuotaLimit(planId: PlanId, metric: UsageMetric): number {
  const plan = getPlan(planId);
  const key = METRIC_TO_QUOTA_KEY[metric];
  const value = plan.quotas[key];
  return typeof value === "number" ? value : 0;
}

export function isValidPlanId(value: string): value is PlanId {
  return Object.values(PlanId).includes(value as PlanId);
}
