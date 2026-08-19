import corpus from "./patent-corpus.json";
import type { PatentInput } from "@/app/lib/patents";

export const CORPUS_VERSION = corpus.version;
export const PATENT_CORPUS = corpus.patents as PatentInput[];
