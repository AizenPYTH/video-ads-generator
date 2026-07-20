export type Evidence = {
  source: string;
  field: string;
  value: string;
  weight: number;
};

export type Alternative = {
  field: string;
  value: string;
  confidence: number;
};

export type IdentificationResult = {
  soldItem: {
    type: string | null;
    name: string | null;
    isCompleteDevice: boolean;
    isReplacementPart: boolean;
  };
  compatibility: {
    brand: string | null;
    device: string | null;
    modelNumber: string | null;
  };
  brand: string | null;
  model: string | null;
  partNumber: string | null;
  manufacturer: string | null;
  category: string | null;
  color: string | null;
  condition: string | null;
  conditionDescription: string | null;
  accessories: string[];
  defects: string[];
  serialNumber: string | null;
  itemSpecifics: Record<string, string | string[]>;
  confidence: {
    global: number;
    productType: number;
    compatibility: number;
    brand: number;
    partNumber: number;
  };
  evidence: Evidence[];
  alternatives: Alternative[];
  warnings: string[];
  needsReview: boolean;
};

