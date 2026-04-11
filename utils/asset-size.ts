import { getAssetsSize, getAssetsSizeByIds } from "@/modules/image-classifier";

export async function calculateFreedBytes(ids: string[], uris: string[]): Promise<number> {
  try {
    const byId = await getAssetsSizeByIds(ids);
    if (byId > 0) return byId;
    return await getAssetsSize(uris);
  } catch {
    return 0;
  }
}
