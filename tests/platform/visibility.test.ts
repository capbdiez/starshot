import { describe, expect, it } from 'vitest';
import { watchVisibility, type VisibilityDocument } from '../../src/platform/index.ts';

class FakeDocument implements VisibilityDocument {
  hidden = false;
  private listener?: () => void;

  addEventListener(_type: 'visibilitychange', listener: () => void): void {
    this.listener = listener;
  }
  removeEventListener(_type: 'visibilitychange', listener: () => void): void {
    if (this.listener === listener) this.listener = undefined;
  }
  change(hidden: boolean): void {
    this.hidden = hidden;
    this.listener?.();
  }
}

describe('visibility adapter', () => {
  it('reports hidden state and unsubscribes cleanly', () => {
    const document = new FakeDocument();
    const values: boolean[] = [];
    const stop = watchVisibility(document, (hidden) => values.push(hidden));
    document.change(true);
    stop();
    document.change(false);
    expect(values).toEqual([true]);
  });
});
