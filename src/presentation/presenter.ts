import type Phaser from 'phaser';
import type { AssetManifest, Content } from '../content/index.ts';
import { GAME_HEIGHT, GAME_WIDTH } from '../shared/index.ts';
import type { SimEvent, SimView } from '../sim/index.ts';
import { animationKey } from './anim/register-animations.ts';
import type { AudioDirector } from './audio/audio-director.ts';
import { reactionsFor, smooth } from './fx/event-fx.ts';
import { Trauma } from './fx/trauma.ts';
import { Starfield, VisualFx } from './fx/visual-fx.ts';
import { SpriteLayer, type SpriteSource } from './renderer/sprite-layer.ts';

/** Time effects requested by the event map for the loop driver. */
export interface FxTiming {
  readonly hitStopMs: number;
  readonly slowMotionMs: number;
  readonly slowScale: number;
}

/** Flash colour (palette white) and length in render frames. */
const FLASH_COLOUR = 0xffffff;
const FLASH_FRAMES = 6;
/** Respawn invulnerability blink period in sim ticks (FR-07). */
const BLINK_TICKS = 8;
/** Ceiling on simultaneous death animations (one-shot pool). */
const MAX_DEATHS = 24;

const DEPTH = { enemy: 10, player: 20, shot: 30, bullet: 40, death: 50, flash: 100 } as const;

function source(manifest: AssetManifest, key: string): SpriteSource {
  const entry = manifest.sprites[key];
  const frame = entry?.clips['idle']?.[0];
  if (!entry || frame === undefined) throw new Error(`"${key}" has no idle clip in the manifest`);
  return { atlas: entry.atlas, frame };
}

/**
 * Draws a read-only {@link SimView} (smoothed with the loop alpha) and reacts to sim events
 * with data-driven SFX and a basic flash (ARCHITECTURE §3). Never mutates the simulation.
 */
export class Presenter {
  private readonly grunts: Map<string, SpriteLayer>;
  private readonly shots: SpriteLayer;
  private readonly bullets: SpriteLayer;
  private readonly player: Phaser.GameObjects.Sprite;
  private readonly deaths: Phaser.GameObjects.Sprite[] = [];
  private readonly flash: Phaser.GameObjects.Rectangle;
  private flashFrames = 0;
  private playerAnim = '';
  private readonly scene: Phaser.Scene;
  private readonly content: Content;
  private readonly manifest: AssetManifest;
  private readonly audio: AudioDirector;
  private readonly trauma = new Trauma();
  private readonly visual: VisualFx;
  private readonly starfield: Starfield;

  constructor(
    scene: Phaser.Scene,
    content: Content,
    manifest: AssetManifest,
    audio: AudioDirector,
  ) {
    this.scene = scene;
    this.content = content;
    this.manifest = manifest;
    this.audio = audio;
    this.starfield = new Starfield(scene);
    this.visual = new VisualFx(scene);
    const g = content.gameplay;
    this.grunts = new Map(
      Object.values(content.enemies).map((enemy) => [
        enemy.key,
        new SpriteLayer(
          scene,
          source(manifest, enemy.sprite),
          animationKey(enemy.sprite, 'idle'),
          DEPTH.enemy,
        ),
      ]),
    );
    this.shots = new SpriteLayer(
      scene,
      source(manifest, g.playerShot.sprite),
      animationKey(g.playerShot.sprite, 'idle'),
      DEPTH.shot,
    );
    this.bullets = new SpriteLayer(
      scene,
      source(manifest, g.enemyBullet.sprite),
      animationKey(g.enemyBullet.sprite, 'idle'),
      DEPTH.bullet,
    );
    const ship = source(manifest, g.player.sprite);
    this.player = scene.add.sprite(GAME_WIDTH / 2, g.player.y, ship.atlas, ship.frame);
    this.player.setDepth(DEPTH.player);
    this.flash = scene.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, FLASH_COLOUR)
      .setOrigin(0, 0)
      .setDepth(DEPTH.flash)
      .setVisible(false);
  }

  /** Current frame name of the player sprite (exposed for the E2E smoke test). */
  get playerFrame(): string {
    return this.player.frame.name;
  }

  /** Positions every sprite from `view`, interpolating by `alpha` between the last two ticks. */
  sync(view: Readonly<SimView>, alpha: number): void {
    const p = view.player;
    const shipKey = this.content.gameplay.player.sprite;
    this.player.setVisible(
      p.alive && !(p.invulnerable && Math.floor(view.tick / BLINK_TICKS) % 2 === 1),
    );
    this.player.setPosition(smooth(p.prevX, p.x, alpha), Math.round(p.y));
    const clip = p.dir < 0 ? 'bank_left' : p.dir > 0 ? 'bank_right' : 'idle';
    const anim = animationKey(shipKey, clip);
    if (p.alive && anim !== this.playerAnim) {
      this.player.play(anim);
      this.playerAnim = anim;
    }

    for (const layer of this.grunts.values()) layer.begin();
    for (const g of view.grunts) {
      const layer = this.grunts.get(g.kind);
      const sprite = layer?.place(g.id, Math.round(g.x), Math.round(g.y));
      if (sprite)
        sprite.play(
          animationKey(
            this.content.enemies[g.kind]?.sprite ?? 'enemy_grunt',
            g.telling ? 'attack_tell' : 'idle',
          ),
          true,
        );
    }
    for (const layer of this.grunts.values()) layer.end();
    this.shots.begin();
    for (const s of view.shots)
      this.shots.place(s.id, smooth(s.prevX, s.x, alpha), smooth(s.prevY, s.y, alpha));
    this.shots.end();
    this.bullets.begin();
    for (const b of view.enemyBullets)
      this.bullets.place(b.id, smooth(b.prevX, b.x, alpha), smooth(b.prevY, b.y, alpha));
    this.bullets.end();

    if (this.flashFrames > 0) {
      this.flashFrames -= 1;
      this.flash.setAlpha(this.flashFrames / FLASH_FRAMES).setVisible(this.flashFrames > 0);
    }
  }

  /** Advances render-only effects, parallax and trauma shake. */
  update(deltaMs: number): void {
    this.starfield.update(deltaMs);
    this.visual.update(deltaMs);
    const intensity = this.trauma.advance(deltaMs);
    this.scene.cameras.main.shake(0, 0);
    if (intensity > 0) this.scene.cameras.main.shake(16, intensity * 5);
  }

  /** Reacts to sim events exclusively through their data-driven FX entries. */
  handle(events: readonly SimEvent[]): FxTiming {
    const reactions = reactionsFor(this.content.fx, events);
    let hitStopMs = 0;
    let slowMotionMs = 0;
    let slowScale = 1;
    if (reactions.flash) {
      this.flashFrames = FLASH_FRAMES;
      this.flash.setAlpha(1).setVisible(true);
    }
    const g = this.content.gameplay;
    for (const { event, entry } of reactions.reactions) {
      if (entry.sfx !== undefined)
        this.audio.play(entry.sfx, entry.voiceLimit, entry.pitchVariance);
      if (entry.muzzle === true && 'x' in event) this.visual.muzzleFlash(event.x, event.y);
      if (entry.particles !== undefined && 'x' in event)
        this.visual.sparks(event.x, event.y, entry.particles);
      if (entry.trauma !== undefined) this.trauma.add(entry.trauma);
      hitStopMs = Math.max(hitStopMs, entry.hitStopMs ?? 0);
      slowMotionMs = Math.max(slowMotionMs, entry.slowMotionMs ?? 0);
      slowScale = Math.min(slowScale, entry.slowScale ?? 1);
      if (entry.explosion === true && event.type === 'EnemyKilled')
        this.playDeath(
          this.content.enemies[event.kind]?.sprite ?? g.grunt.sprite,
          event.x,
          event.y,
        );
      if (entry.explosion === true && event.type === 'PlayerHit') {
        this.playDeath(g.player.sprite, event.x, event.y);
        this.playerAnim = '';
      }
    }
    for (const event of events) if (event.type === 'GameRestarted') this.clearDeaths();
    return { hitStopMs, slowMotionMs, slowScale };
  }

  private playDeath(spriteKey: string, x: number, y: number): void {
    let sprite = this.deaths.find((s) => !s.active);
    if (!sprite) {
      if (this.deaths.length >= MAX_DEATHS) return;
      const src = source(this.manifest, spriteKey);
      sprite = this.scene.add.sprite(0, 0, src.atlas, src.frame).setDepth(DEPTH.death);
      sprite.on('animationcomplete', (_a: unknown, _f: unknown, s: Phaser.GameObjects.Sprite) => {
        s.setVisible(false).setActive(false);
      });
      this.deaths.push(sprite);
    }
    sprite.setActive(true).setVisible(true).setPosition(Math.round(x), Math.round(y));
    sprite.play(animationKey(spriteKey, 'death'));
  }

  private clearDeaths(): void {
    for (const s of this.deaths) s.stop().setVisible(false).setActive(false);
  }
}
