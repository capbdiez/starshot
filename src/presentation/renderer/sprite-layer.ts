import type Phaser from 'phaser';

/** Atlas key + first frame for spawning a sprite. */
export interface SpriteSource {
  readonly atlas: string;
  readonly frame: string;
}

/**
 * Pooled sprites keyed by sim entity id. Each frame: `begin()`, `place()` every live entity,
 * `end()` hides and recycles sprites whose entity disappeared (no per-frame allocation once warm).
 */
export class SpriteLayer {
  private readonly live = new Map<number, Phaser.GameObjects.Sprite>();
  private readonly free: Phaser.GameObjects.Sprite[] = [];
  private readonly seen = new Set<number>();
  private readonly scene: Phaser.Scene;
  private readonly source: SpriteSource;
  private readonly idleAnim: string;
  private readonly depth: number;

  constructor(scene: Phaser.Scene, source: SpriteSource, idleAnim: string, depth: number) {
    this.scene = scene;
    this.source = source;
    this.idleAnim = idleAnim;
    this.depth = depth;
  }

  begin(): void {
    this.seen.clear();
  }

  place(id: number, x: number, y: number): Phaser.GameObjects.Sprite {
    let sprite = this.live.get(id);
    if (!sprite) {
      sprite =
        this.free.pop() ??
        this.scene.add.sprite(0, 0, this.source.atlas, this.source.frame).setDepth(this.depth);
      sprite.setVisible(true).setActive(true);
      sprite.play(this.idleAnim);
      this.live.set(id, sprite);
    }
    sprite.setPosition(x, y);
    this.seen.add(id);
    return sprite;
  }

  end(): void {
    for (const [id, sprite] of this.live) {
      if (this.seen.has(id)) continue;
      sprite.stop();
      sprite.setVisible(false).setActive(false);
      this.live.delete(id);
      this.free.push(sprite);
    }
  }
}
