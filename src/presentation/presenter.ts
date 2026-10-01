import type Phaser from 'phaser';
import type { AssetManifest, Content } from '../content/index.ts';
import { PRESENTATION_SCALE, WORLD_HEIGHT, WORLD_WIDTH } from '../shared/index.ts';
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

/** Accessibility presentation preferences controlled by M5 settings. */
export interface PresentationSettings {
  readonly shake: number;
  readonly flashReduction: boolean;
  readonly crt: boolean;
  readonly highContrastBullets: boolean;
  readonly subtitles: boolean;
}

/** Flash colour (palette white) and length in render frames. */
const FLASH_COLOUR = 0xffffff;
const FLASH_FRAMES = 6;
/** Flash-reduction mode is capped at the WCAG-compatible 3 Hz maximum. */
const REDUCED_FLASH_INTERVAL_MS = 1_000 / 3;
const SUBTITLE_DURATION_MS = 2_000;
/** Respawn invulnerability blink period in sim ticks (FR-07). */
const BLINK_TICKS = 8;
/** Ceiling on simultaneous death animations (one-shot pool). */
const MAX_DEATHS = 24;

const DEPTH = {
  enemy: 10,
  player: 20,
  shot: 30,
  bullet: 40,
  pickup: 45,
  death: 50,
  hud: 90,
  subtitle: 95,
  scanlines: 99,
  flash: 100,
} as const;

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
  private readonly pickups: SpriteLayer;
  private readonly bossSprites: Map<string, SpriteLayer>;
  private readonly player: Phaser.GameObjects.Sprite;
  private readonly hud: Phaser.GameObjects.Text;
  private readonly deaths: Phaser.GameObjects.Sprite[] = [];
  private readonly flash: Phaser.GameObjects.Rectangle;
  private readonly scanlines: Phaser.GameObjects.Graphics;
  private readonly subtitle: Phaser.GameObjects.Text;
  private flashFrames = 0;
  private elapsedMs = 0;
  private lastReducedFlashMs = -REDUCED_FLASH_INTERVAL_MS;
  private subtitleMs = 0;
  private playerAnim = '';
  private readonly scene: Phaser.Scene;
  private readonly content: Content;
  private readonly manifest: AssetManifest;
  private readonly audio: AudioDirector;
  private readonly trauma = new Trauma();
  private readonly visual: VisualFx;
  private readonly starfield: Starfield;
  private settings: PresentationSettings = {
    shake: 1,
    flashReduction: false,
    crt: false,
    highContrastBullets: false,
    subtitles: true,
  };

  constructor(
    scene: Phaser.Scene,
    content: Content,
    manifest: AssetManifest,
    audio: AudioDirector,
  ) {
    this.scene = scene;
    // The scene continues to use simulation/world coordinates. This camera is the single
    // compatibility transform from the 270×480 world into the 540×960 presentation buffer.
    scene.cameras.main.setZoom(PRESENTATION_SCALE);
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
    this.pickups = new SpriteLayer(
      scene,
      source(manifest, g.pickups.sprite),
      animationKey(g.pickups.sprite, 'idle'),
      DEPTH.pickup,
    );
    this.bossSprites = new Map(
      Object.values(content.bosses)
        .flatMap((boss) => [boss.sprite, ...boss.parts.map((part) => part.sprite)])
        .filter((sprite, index, all) => all.indexOf(sprite) === index)
        .map((sprite) => [
          sprite,
          new SpriteLayer(
            scene,
            source(manifest, sprite),
            animationKey(sprite, 'idle'),
            DEPTH.enemy,
          ),
        ]),
    );
    const ship = source(manifest, g.player.sprite);
    this.player = scene.add.sprite(WORLD_WIDTH / 2, g.player.y, ship.atlas, ship.frame);
    this.player.setDepth(DEPTH.player);
    this.hud = scene.add
      .text(4, 2, '', {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#ffffff',
        stroke: '#0b0b1a',
        strokeThickness: 1,
      })
      .setDepth(DEPTH.hud)
      .setResolution(1);
    this.subtitle = scene.add
      .text(WORLD_WIDTH / 2, WORLD_HEIGHT - 42, '', {
        align: 'center',
        color: '#ffffff',
        fontFamily: 'monospace',
        fontSize: '9px',
        stroke: '#0b0b1a',
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.subtitle)
      .setVisible(false);
    this.scanlines = scene.add.graphics().setDepth(DEPTH.scanlines).setVisible(false);
    this.scanlines.lineStyle(1, 0x0b0b1a, 0.28);
    for (let y = 0; y < WORLD_HEIGHT; y += 2) this.scanlines.lineBetween(0, y, WORLD_WIDTH, y);
    this.flash = scene.add
      .rectangle(0, 0, WORLD_WIDTH, WORLD_HEIGHT, FLASH_COLOUR)
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
    for (const layer of this.bossSprites.values()) layer.begin();
    if (view.boss) {
      const core = this.bossSprites
        .get(view.boss.sprite)
        ?.place(view.boss.id, view.boss.x, view.boss.y);
      if (core)
        core.play(animationKey(view.boss.sprite, view.boss.telling ? 'attack_tell' : 'idle'), true);
      for (const part of view.boss.parts)
        this.bossSprites.get(part.sprite)?.place(part.id, part.x, part.y);
    }
    for (const layer of this.bossSprites.values()) layer.end();
    this.shots.begin();
    for (const s of view.shots)
      this.shots.place(s.id, smooth(s.prevX, s.x, alpha), smooth(s.prevY, s.y, alpha));
    this.shots.end();
    this.bullets.begin();
    for (const b of view.enemyBullets) {
      const bullet = this.bullets.place(
        b.id,
        smooth(b.prevX, b.x, alpha),
        smooth(b.prevY, b.y, alpha),
      );
      if (this.settings.highContrastBullets) bullet.setTint(0xffffff).setScale(1.5);
      else bullet.clearTint().setScale(1);
    }
    this.bullets.end();
    this.pickups.begin();
    for (const pickup of view.pickups)
      this.pickups.place(
        pickup.id,
        smooth(pickup.prevX, pickup.x, alpha),
        smooth(pickup.prevY, pickup.y, alpha),
      );
    this.pickups.end();
    this.hud.setText(
      `SCORE ${String(view.score).padStart(6, '0')}  x${String(view.multiplier)}  STG ${String(view.wave)}${view.boss ? ` P${String(view.boss.phase)}` : ''}\nW${String(view.weaponLevel)}                 L${String(view.lives)} B${String(view.bombs)}`,
    );

    if (this.flashFrames > 0) {
      this.flashFrames -= 1;
      this.flash.setAlpha(this.flashFrames / FLASH_FRAMES).setVisible(this.flashFrames > 0);
    }
  }

  /** Applies the user-controlled visual accessibility preferences. */
  setSettings(settings: Partial<PresentationSettings>): void {
    this.settings = { ...this.settings, ...settings };
    this.scanlines.setVisible(this.settings.crt);
    this.subtitle.setVisible(this.subtitleMs > 0 && this.settings.subtitles);
  }

  /** Advances render-only effects, parallax and trauma shake. */
  update(deltaMs: number): void {
    this.elapsedMs += deltaMs;
    this.starfield.update(deltaMs);
    this.visual.update(deltaMs);
    if (this.subtitleMs > 0) {
      this.subtitleMs = Math.max(0, this.subtitleMs - deltaMs);
      this.subtitle.setVisible(this.subtitleMs > 0 && this.settings.subtitles);
    }
    const intensity = this.trauma.advance(deltaMs);
    this.scene.cameras.main.shake(0, 0);
    if (intensity > 0 && this.settings.shake > 0)
      this.scene.cameras.main.shake(16, intensity * 5 * this.settings.shake);
  }

  /** Reacts to sim events exclusively through their data-driven FX entries. */
  handle(events: readonly SimEvent[]): FxTiming {
    const reactions = reactionsFor(this.content.fx, events);
    let hitStopMs = 0;
    let slowMotionMs = 0;
    let slowScale = 1;
    const mayFlash =
      !this.settings.flashReduction ||
      this.elapsedMs - this.lastReducedFlashMs >= REDUCED_FLASH_INTERVAL_MS;
    if (reactions.flash && mayFlash) {
      this.flashFrames = FLASH_FRAMES;
      this.flash.setAlpha(1).setVisible(true);
      if (this.settings.flashReduction) this.lastReducedFlashMs = this.elapsedMs;
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
    for (const event of events) {
      if (event.type === 'GameRestarted') this.clearDeaths();
      if (!this.settings.subtitles) continue;
      if (event.type === 'BossStarted') this.showSubtitle('bossIncoming');
      if (event.type === 'BossPhaseChanged')
        this.showSubtitle(event.phase === 2 ? 'bossPhaseTwo' : 'bossPhaseThree');
    }
    return { hitStopMs, slowMotionMs, slowScale };
  }

  private showSubtitle(key: string): void {
    this.subtitle.setText(this.content.strings[key] ?? '');
    this.subtitleMs = SUBTITLE_DURATION_MS;
    this.subtitle.setVisible(true);
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
