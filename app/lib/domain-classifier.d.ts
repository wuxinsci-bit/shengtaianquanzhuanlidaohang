import type { EcoDomainId } from "./patents";

export interface ClassificationResult {
  domain: EcoDomainId | null;
  confidence: number;
  basis: string;
  matches: string[];
  scores: Array<{ id: EcoDomainId; priority: number; score: number; matches: string[] }>;
}

export const CLASSIFICATION_VERSION: string;
export const DOMAIN_CLASSIFICATION_RULES: Array<{ id: EcoDomainId; priority: number; strong: string[]; terms: string[] }>;
export function classifyPatent(text: string, hintedDomain?: string): ClassificationResult;
