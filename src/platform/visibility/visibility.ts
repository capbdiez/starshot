/** Minimal document surface for page visibility handling. */
export interface VisibilityDocument {
  readonly hidden: boolean;
  addEventListener(type: 'visibilitychange', listener: () => void): void;
  removeEventListener(type: 'visibilitychange', listener: () => void): void;
}

/** Watches tab visibility and returns an unsubscribe function. */
export function watchVisibility(
  document: VisibilityDocument,
  onChange: (hidden: boolean) => void,
): () => void {
  const listener = (): void => {
    onChange(document.hidden);
  };
  document.addEventListener('visibilitychange', listener);
  return () => {
    document.removeEventListener('visibilitychange', listener);
  };
}
