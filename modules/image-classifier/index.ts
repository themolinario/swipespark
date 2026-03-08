import ImageClassifierModule from './src/ImageClassifierModule';

export type { LabelResult, ClassificationResult } from './src/ImageClassifierModule';

export async function classifyImage(uri: string): Promise<string[]> {
    return await ImageClassifierModule.classifyImage(uri);
}

export async function classifyImages(uris: string[]): Promise<{ uri: string; labels: { identifier: string; confidence: number }[] }[]> {
    return await ImageClassifierModule.classifyImages(uris);
}

export async function getAssetsSize(uris: string[]): Promise<number> {
    return await ImageClassifierModule.getAssetsSize(uris);
}

export async function getAssetsSizeByIds(ids: string[]): Promise<number> {
    return await ImageClassifierModule.getAssetsSizeByIds(ids);
}

