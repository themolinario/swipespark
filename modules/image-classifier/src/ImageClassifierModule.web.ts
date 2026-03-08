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
};

export default registerWebModule(ImageClassifierModule, 'ImageClassifierModule');
