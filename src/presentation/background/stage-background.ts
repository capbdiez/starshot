import type Phaser from 'phaser';
import type { StageEnvironment } from '../../content/index.ts';
import {
  PRESENTATION_HEIGHT,
  PRESENTATION_SCALE,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '../../shared/index.ts';
import { createBackgroundLayout } from './layout.ts';

const PALETTES = {
  indigo: { base: 0x0b0b1a, haze: 0x1c1f47, object: 0x2a2d63, star: 0x52579e },
  violet: { base: 0x141430, haze: 0x3d1f6e, object: 0x7a3cc2, star: 0xb98cff },
  teal: { base: 0x0b0b1a, haze: 0x1b4d5c, object: 0x0f5f7a, star: 0x5a6180 },
  amber: { base: 0x141430, haze: 0x7a2e12, object: 0xd9571c, star: 0x8a93b0 },
  crimson: { base: 0x141430, haze: 0x6b1850, object: 0xb8237a, star: 0xff9ed2 },
} as const;

interface MovingLayer {
  readonly graphics: Phaser.GameObjects.Graphics;
  readonly speed: number;
  offset: number;
}

/** Selects a cyclic normal environment or the authored boss environment for an absolute level. */
export function environmentForLevel(
  environments: readonly StageEnvironment[],
  level: number,
): StageEnvironment | undefined {
  const bossEnvironment = environments.find((environment) => environment.stage === 5);
  if (level > 0 && level % 10 === 0) return bossEnvironment;
  const normalEnvironments = environments.filter((environment) => environment.stage !== 5);
  if (normalEnvironments.length === 0) return undefined;
  const normalIndex = level - Math.floor(level / 10) - 1;
  return normalEnvironments[normalIndex % normalEnvironments.length];
}

/** Cached, presentation-space stage environment; it never reads or changes simulation state. */
export class StageBackground {
  private moving: readonly MovingLayer[] = [];
  private objects: Phaser.GameObjects.GameObject[] = [];
  private motionScale = 1;
  private stage = 0;
  private readonly scene: Phaser.Scene;
  private readonly environments: readonly StageEnvironment[];
  private readonly runSeed: number;

  constructor(scene: Phaser.Scene, environments: readonly StageEnvironment[], runSeed: number) {
    this.scene = scene;
    this.environments = environments;
    this.runSeed = runSeed;
    this.setStage(1);
  }

  /** Replaces cached presentation layers only when the visible simulation level changes. */
  setStage(level: number): void {
    if (this.stage === level) return;
    const environment = environmentForLevel(this.environments, level);
    if (!environment) return;
    this.stage = level;
    for (const object of this.objects) object.destroy();
    this.objects = [];
    const palette = PALETTES[environment.paletteRole];
    const layout = createBackgroundLayout(environment, this.runSeed);
    const base = this.scene.add
      .rectangle(0, 0, WORLD_WIDTH, WORLD_HEIGHT, palette.base)
      .setOrigin(0)
      .setDepth(-100);
    const nebulae = this.scene.add.graphics().setDepth(-99);
    for (const point of layout.nebulae) {
      nebulae.fillStyle(palette.haze, 0.16);
      nebulae.fillEllipse(
        point.x / PRESENTATION_SCALE,
        point.y / PRESENTATION_SCALE,
        point.size / PRESENTATION_SCALE,
        Math.round((point.size * 0.48) / PRESENTATION_SCALE),
      );
    }

    const stars = this.scene.add.graphics().setDepth(-98);
    this.drawStars(stars, layout.distantStars, palette.star);
    const objects = this.scene.add.graphics().setDepth(-97);
    this.drawObjects(objects, layout.largeObjects, palette.object);
    const foreground = this.scene.add.graphics().setDepth(-96);
    this.drawForeground(foreground, layout.foreground, palette.object);
    this.objects = [base, nebulae, stars, objects, foreground];
    this.moving = [
      { graphics: stars, speed: environment.motion.distantStars, offset: 0 },
      { graphics: objects, speed: environment.motion.largeObjects, offset: 0 },
      { graphics: foreground, speed: environment.motion.foreground, offset: 0 },
    ];
  }

  /** Applies the presentation-only background-motion setting without rebuilding layers. */
  setMotionEnabled(enabled: boolean): void {
    this.motionScale = enabled ? 1 : 0;
  }

  /** Moves only cached layers; layout geometry is created once in the constructor. */
  update(deltaMs: number): void {
    for (const layer of this.moving) {
      layer.offset =
        (layer.offset + (deltaMs * layer.speed * this.motionScale) / 1000) % PRESENTATION_HEIGHT;
      layer.graphics.setY(Math.round(layer.offset / PRESENTATION_SCALE));
    }
  }

  private drawStars(
    graphics: Phaser.GameObjects.Graphics,
    points: readonly { readonly x: number; readonly y: number; readonly size: number }[],
    colour: number,
  ): void {
    graphics.fillStyle(colour, 0.45);
    for (const point of points) {
      graphics.fillRect(
        point.x / PRESENTATION_SCALE,
        point.y / PRESENTATION_SCALE,
        point.size / PRESENTATION_SCALE,
        point.size / PRESENTATION_SCALE,
      );
      graphics.fillRect(
        point.x / PRESENTATION_SCALE,
        (point.y - PRESENTATION_HEIGHT) / PRESENTATION_SCALE,
        point.size / PRESENTATION_SCALE,
        point.size / PRESENTATION_SCALE,
      );
    }
  }

  private drawObjects(
    graphics: Phaser.GameObjects.Graphics,
    points: readonly { readonly x: number; readonly y: number; readonly size: number }[],
    colour: number,
  ): void {
    graphics.fillStyle(colour, 0.2);
    for (const point of points) {
      graphics.fillCircle(
        point.x / PRESENTATION_SCALE,
        point.y / PRESENTATION_SCALE,
        point.size / (2 * PRESENTATION_SCALE),
      );
      graphics.fillCircle(
        point.x / PRESENTATION_SCALE,
        (point.y - PRESENTATION_HEIGHT) / PRESENTATION_SCALE,
        point.size / (2 * PRESENTATION_SCALE),
      );
    }
  }

  private drawForeground(
    graphics: Phaser.GameObjects.Graphics,
    points: readonly { readonly x: number; readonly y: number; readonly size: number }[],
    colour: number,
  ): void {
    graphics.fillStyle(colour, 0.18);
    for (const point of points) {
      graphics.fillRect(
        point.x / PRESENTATION_SCALE,
        point.y / PRESENTATION_SCALE,
        point.size / PRESENTATION_SCALE,
        (point.size * 3) / PRESENTATION_SCALE,
      );
      graphics.fillRect(
        point.x / PRESENTATION_SCALE,
        (point.y - PRESENTATION_HEIGHT) / PRESENTATION_SCALE,
        point.size / PRESENTATION_SCALE,
        (point.size * 3) / PRESENTATION_SCALE,
      );
    }
  }
}
