import DiskInfoModule from "./src/DiskInfoModule";

export type { DiskInfoResult } from "./src/DiskInfoModule";

export function getDiskInfo() {
  return DiskInfoModule.getDiskInfo();
}
