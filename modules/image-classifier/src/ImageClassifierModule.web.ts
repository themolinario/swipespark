import { registerWebModule, NativeModule } from 'expo';

import { ChangeEventPayload } from './ImageClassifier.types';

type ImageClassifierModuleEvents = {
  onChange: (params: ChangeEventPayload) => void;
}

class ImageClassifierModule extends NativeModule<ImageClassifierModuleEvents> {
  PI = Math.PI;
  async setValueAsync(value: string): Promise<void> {
    this.emit('onChange', { value });
  }
  hello() {
    return 'Hello world! 👋';
  }
  async classifyImage(_uri: string): Promise<string[]> {
    return [];
  }
  async classifyImages(uris: string[]): Promise<{ uri: string; labels: { identifier: string; confidence: number }[] }[]> {
    return uris.map(uri => ({ uri, labels: [] }));
  }
  async getAssetsSize(_uris: string[]): Promise<number> {
    return 0;
  }
  async getAssetsSizeByIds(_ids: string[]): Promise<number> {
    return 0;
  }
}

export default registerWebModule(ImageClassifierModule, 'ImageClassifierModule');
