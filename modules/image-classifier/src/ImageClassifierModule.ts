import { NativeModule, requireNativeModule } from 'expo';

export interface LabelResult {
  identifier: string;
  confidence: number;
}

export interface ClassificationResult {
  uri: string;
  labels: LabelResult[];
}

declare class ImageClassifierModule extends NativeModule<{}> {
  classifyImage(uri: string): Promise<string[]>;
  classifyImages(uris: string[]): Promise<ClassificationResult[]>;
  getAssetsSize(uris: string[]): Promise<number>;
  getAssetsSizeByIds(ids: string[]): Promise<number>;
}

export default requireNativeModule<ImageClassifierModule>('ImageClassifier');
