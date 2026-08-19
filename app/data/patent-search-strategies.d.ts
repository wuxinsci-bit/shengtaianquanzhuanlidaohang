import type { EcoDomainId } from "../lib/patents";

export interface PatentSearchStrategy {
  domain: EcoDomainId;
  name: string;
  keywords: string[];
}

export const PATENT_SEARCH_STRATEGIES: PatentSearchStrategy[];
export function titleQueryForStrategy(strategy: PatentSearchStrategy): string;
export function strategyByDomain(domain: string): PatentSearchStrategy | null;
