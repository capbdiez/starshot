import type Phaser from 'phaser';

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
