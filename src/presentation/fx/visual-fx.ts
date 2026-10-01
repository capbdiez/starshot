import type Phaser from 'phaser';
import type { FxKind } from '../../content/index.ts';

interface Particle {
  readonly shape: Phaser.GameObjects.Rectangle;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  gravity: number;
}

interface Treatment {
  readonly colour: number;
  readonly size: number;
  readonly life: number;
  readonly speed: number;
  readonly gravity: number;
  readonly depth: number;
  readonly ring: boolean;
}

export const MAX_FX_PARTICLES = 400;

const TREATMENTS: Record<FxKind, Treatment> = {
  trail: { colour: 0xff5a78, size: 1, life: 150, speed: 28, gravity: 0, depth: 34, ring: false },
  muzzle: { colour: 0xa6f6ff, size: 2, life: 90, speed: 42, gravity: 0, depth: 46, ring: false },
  hit: { colour: 0xfff6a6, size: 2, life: 180, speed: 64, gravity: 40, depth: 47, ring: false },
  debris: { colour: 0xff9433, size: 2, life: 260, speed: 80, gravity: 80, depth: 48, ring: false },
  explosion: {
    colour: 0xfff6a6,
    size: 3,
    life: 320,
    speed: 110,
    gravity: 58,
    depth: 49,
    ring: true,
  },
  bomb: { colour: 0xa6f6ff, size: 2, life: 360, speed: 145, gravity: -20, depth: 49, ring: true },
  tell: { colour: 0xff5a78, size: 2, life: 180, speed: 24, gravity: 0, depth: 42, ring: true },
  pickup: { colour: 0x7dff6a, size: 2, life: 220, speed: 52, gravity: -30, depth: 46, ring: true },
  boss: { colour: 0xff9ed2, size: 3, life: 360, speed: 120, gravity: 70, depth: 49, ring: true },
};

/** WebGL post-processing is optional in G7; generated geometry is always the supported fallback. */
export function supportsOptionalPostFx(renderer: unknown): boolean {
  return typeof renderer === 'object' && renderer !== null && 'pipelines' in renderer;
}

/** Pooled, palette-safe layered effects used by the event presenter. */
export class VisualFx {
  private readonly particles: Particle[] = [];
  private readonly muzzle: Phaser.GameObjects.Rectangle;
  private readonly fallbackOnly: boolean;
  private readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.fallbackOnly = !supportsOptionalPostFx(scene.game.renderer);
    this.muzzle = scene.add.rectangle(0, 0, 5, 8, 0xa6f6ff).setDepth(46).setVisible(false);
    for (let i = 0; i < MAX_FX_PARTICLES; i += 1) {
      const shape = scene.add.rectangle(0, 0, 1, 1, 0xff9433).setDepth(45).setVisible(false);
      this.particles.push({ shape, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, gravity: 0 });
    }
  }

  /** True when the portable generated-geometry path is active instead of optional post FX. */
  get usesFallbackRenderer(): boolean {
    return this.fallbackOnly;
  }

  /** Number of live particles, exposed for stress/budget tests. */
  get activeParticles(): number {
    return this.particles.reduce((total, particle) => total + (particle.life > 0 ? 1 : 0), 0);
  }

  emit(kind: FxKind, x: number, y: number, count: number): void {
    const treatment = TREATMENTS[kind];
    if (kind === 'muzzle') this.muzzleFlash(x, y);
    let emitted = 0;
    for (const particle of this.particles) {
      if (particle.life > 0 || emitted >= count) continue;
      const angle = (emitted / Math.max(1, count)) * Math.PI * 2;
      const ringBoost = treatment.ring ? 1 + (emitted % 3) * 0.22 : 0.45 + (emitted % 5) * 0.16;
      particle.x = x;
      particle.y = y;
      particle.vx = Math.cos(angle) * treatment.speed * ringBoost;
      particle.vy = Math.sin(angle) * treatment.speed * ringBoost;
      particle.life = treatment.life;
      particle.maxLife = treatment.life;
      particle.gravity = treatment.gravity;
      particle.shape
        .setFillStyle(treatment.colour)
        .setSize(treatment.size, treatment.size)
        .setDepth(treatment.depth)
        .setPosition(Math.round(x), Math.round(y))
        .setAlpha(1)
        .setVisible(true);
      emitted += 1;
    }
  }

  update(deltaMs: number): void {
    for (const particle of this.particles) {
      if (particle.life <= 0) continue;
      particle.life = Math.max(0, particle.life - deltaMs);
      particle.x += (particle.vx * deltaMs) / 1000;
      particle.y += (particle.vy * deltaMs) / 1000;
      particle.vy += (particle.gravity * deltaMs) / 1000;
      particle.shape
        .setPosition(Math.round(particle.x), Math.round(particle.y))
        .setAlpha(particle.life / particle.maxLife)
        .setVisible(particle.life > 0);
    }
  }

  private muzzleFlash(x: number, y: number): void {
    this.muzzle
      .setPosition(x, y - 7)
      .setAlpha(1)
      .setVisible(true);
    this.scene.time.delayedCall(34, () => this.muzzle.setVisible(false));
  }
}
