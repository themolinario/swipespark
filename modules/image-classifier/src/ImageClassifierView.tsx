import { requireNativeView } from 'expo';
import * as React from 'react';

import { ImageClassifierViewProps } from './ImageClassifier.types';

const NativeView: React.ComponentType<ImageClassifierViewProps> =
  requireNativeView('ImageClassifier');

export default function ImageClassifierView(props: ImageClassifierViewProps) {
  return <NativeView {...props} />;
}
