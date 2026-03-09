import { NativeModule, requireNativeModule } from "expo";
import type { HashProgressEvent, HashResult } from "./DuplicateDetector.types";

declare class DuplicateDetectorModuleType extends NativeModule<{
  onProgress: (event: HashProgressEvent) => void;
}> {
  computeHashes(assetIds: string[]): Promise<HashResult>;
}

export default requireNativeModule<DuplicateDetectorModuleType>("DuplicateDetector");

