import { NativeModule, requireNativeModule } from "expo";

export interface DiskInfoResult {
  total: number;
  available: number;
}

declare class DiskInfoModuleType extends NativeModule {
  getDiskInfo(): DiskInfoResult;
}

export default requireNativeModule<DiskInfoModuleType>("DiskInfo");
