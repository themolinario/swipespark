import { NativeModule, requireNativeModule } from 'expo';

declare class ImageClassifierModule extends NativeModule {
  classifyImage(uri: string): Promise<string[]>;
  getAssetsSize(uris: string[]): Promise<number>;
  getAssetsSizeByIds(ids: string[]): Promise<number>;
}

export default requireNativeModule<ImageClassifierModule>('ImageClassifier');
