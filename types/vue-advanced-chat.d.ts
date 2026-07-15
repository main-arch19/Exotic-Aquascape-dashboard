import type * as React from 'react';

// vue-advanced-chat ships no type definitions; declare the one export we use.
declare module 'vue-advanced-chat' {
  export function register(): void;
}

// vue-advanced-chat registers a `<vue-advanced-chat>` custom element. React 19
// moved the JSX namespace under `React.JSX`, so we augment the `react` module
// (the old global `JSX` namespace no longer exists in @types/react v19).
type VueAdvancedChatAttributes = {
  ref?: React.Ref<HTMLElement>;
  key?: React.Key;
  className?: string;
  style?: React.CSSProperties;
  // Object/array props are passed as JSON strings (web-component attributes).
  rooms?: string;
  messages?: string;
  'message-actions'?: string;
  'room-actions'?: string;
  // Scalar / boolean props.
  'current-user-id'?: string;
  'room-id'?: string;
  'rooms-loaded'?: boolean | string;
  'messages-loaded'?: boolean | string;
  'single-room'?: boolean | string;
  'show-add-room'?: boolean | string;
  'show-audio'?: boolean | string;
  'show-files'?: boolean | string;
  'show-emojis'?: boolean | string;
  'show-reaction-emojis'?: boolean | string;
  'show-new-messages-divider'?: boolean | string;
  'show-footer'?: boolean | string;
  height?: string;
  theme?: string;
  styles?: string;
};

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'vue-advanced-chat': VueAdvancedChatAttributes;
    }
  }
}
