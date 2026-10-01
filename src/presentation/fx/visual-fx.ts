import type Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../shared/index.ts';

interface Particle {
  readonly shape: Phaser.GameObjects.Rectangle;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

const MAX_PARTICLES = 400;

/** Pooled, palette-safe geometric effects used by the event presenter. */
export class VisualFx {
  private readonly particles: Particle[] = [];
  private readonly muzzle: Phaser.GameObjects.Rectangle;
  private readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.muzzle = scene.add.rectangle(0, 0, 5, 8, 0xa6f6ff).setDepth(45).setVisible(false);
    for (let i = 0; i < MAX_PARTICLES; i += 1) {
      const shape = scene.add.rectangle(0, 0, 2, 2, 0xff9433).setDepth(45).setVisible(false);
      this.particles.push({ shape, x: 0, y: 0, vx: 0, vy: 0, life: 0 });
    }
  }

  muzzleFlash(x: number, y: number): void {
    this.muzzle.setPosition(x, y - 7).setVisible(true);
    this.scene.time.delayedCall(34, () => this.muzzle.setVisible(false));
  }

  sparks(x: number, y: number, count: number): void {
    let emitted = 0;
    for (const particle of this.particles) {
      if (particle.life > 0 || emitted >= count) continue;
      const angle = (emitted / Math.max(1, count)) * Math.PI * 2;
      particle.x = x;
      particle.y = y;
      particle.vx = Math.cos(angle) * (20 + (emitted % 4) * 12);
      particle.vy = Math.sin(angle) * (20 + (emitted % 3) * 14);
      particle.life = 240;
      particle.shape.setPosition(x, y).setAlpha(1).setVisible(true);
      emitted += 1;
    }
  }

  update(deltaMs: number): void {
    for (const particle of this.particles) {
      if (particle.life <= 0) continue;
      particle.life = Math.max(0, particle.life - deltaMs);
      particle.x += (particle.vx * deltaMs) / 1000;
      particle.y += (particle.vy * deltaMs) / 1000;
      particle.vy += (70 * deltaMs) / 1000;
      particle.shape
        .setPosition(Math.round(particle.x), Math.round(particle.y))
        .setAlpha(particle.life / 240)
        .setVisible(particle.life > 0);
    }
  }
}

interface StarLayerSpec {
  readonly colour: number;
  readonly alpha: number;
  readonly count: number;
  readonly size: number;
  readonly speed: number;
}

const STAR_LAYERS: readonly StarLayerSpec[] = [
  { colour: 0x1c1f47, alpha: 1, count: 62, size: 1, speed: 0.012 },
  { colour: 0x2a2d63, alpha: 1, count: 46, size: 1, speed: 0.024 },
  { colour: 0x52579e, alpha: 0.8, count: 28, size: 2, speed: 0.042 },
];

/** Stable integer hash used to scatter stars without visible rows or diagonals. */
export function starHash(value: number): number {
  let hash = value >>> 0;
  hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b);
  hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b);
  return (hash ^ (hash >>> 16)) >>> 0;
}

/** Low-contrast three-layer parallax starfield, behind all gameplay sprites. */
export class Starfield {
  private readonly layers: readonly Phaser.GameObjects.Graphics[];
  private offsets = [0, 0, 0];

  constructor(scene: Phaser.Scene) {
    this.layers = STAR_LAYERS.map((spec, layer) => {
      const graphics = scene.add.graphics().setDepth(-10 + layer);
      graphics.fillStyle(spec.colour, spec.alpha);
      for (let i = 0; i < spec.count; i += 1) {
        const x = starHash(i * 2 + layer * 1_001) % GAME_WIDTH;
        const y = starHash(i * 2 + layer * 1_001 + 1) % GAME_HEIGHT;
        graphics.fillRect(x, y, spec.size, spec.size);
        // A second copy makes the scroll wrap continuously instead of leaving a blank strip.
        graphics.fillRect(x, y - GAME_HEIGHT, spec.size, spec.size);
      }
      return graphics;
    });
  }

  update(deltaMs: number): void {
    for (let i = 0; i < this.layers.length; i += 1) {
      const layer = this.layers[i];
      const spec = STAR_LAYERS[i];
      if (!layer || !spec) continue;
      this.offsets[i] = ((this.offsets[i] ?? 0) + deltaMs * spec.speed) % GAME_HEIGHT;
      layer.setY(Math.round(this.offsets[i] ?? 0));
    }
  }
}
