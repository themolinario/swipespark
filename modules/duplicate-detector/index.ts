import DuplicateDetectorModule from "./src/DuplicateDetectorModule";

export type { HashProgressEvent, HashResult } from "./src/DuplicateDetector.types";

export async function computeHashes(assetIds: string[]): Promise<Record<string, string>> {
  return await DuplicateDetectorModule.computeHashes(assetIds);
}

export { DuplicateDetectorModule };

