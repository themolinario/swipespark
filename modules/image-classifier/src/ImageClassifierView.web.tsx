import * as React from 'react';

import { ImageClassifierViewProps } from './ImageClassifier.types';

export default function ImageClassifierView(props: ImageClassifierViewProps) {
  return (
    <div>
      <iframe
        style={{ flex: 1 }}
        src={props.url}
        onLoad={() => props.onLoad({ nativeEvent: { url: props.url } })}
      />
    </div>
  );
}
