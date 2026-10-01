import Phaser from 'phaser';
import type { AssetManifest, Content } from '../../content/index.ts';
import type { InputSource } from '../../platform/index.ts';
import { AudioDirector, Presenter, registerAnimations } from '../../presentation/index.ts';
import { TICK_MS } from '../../shared/index.ts';
import type { Sim } from '../../sim/index.ts';
import { createGameLoop, type GameLoop } from '../game-loop.ts';

/** Everything the game scene needs, built by the composition root. */
export interface BootSceneDeps {
  readonly content: Content;
  readonly manifest: AssetManifest;
  readonly sim: Sim;
  readonly input: InputSource;
  /** Resolves a manifest atlas file name to a bundled URL. */
  readonly atlasUrl: (fileName: string) => string;
  /** Resolves an `assets/audio/` file name to a bundled URL. */
  readonly audioUrl: (fileName: string) => string;
  /** Receives game status as `data-*` attributes (used by the E2E tests). */
  readonly statusElement: HTMLElement;
  /** Optional dev hook: may take over stepping (frame-step debug view). */
  readonly attachDebug?: (hooks: DebugHooks) => void;
}

/** What the dev frame-step view can control. */
export interface DebugHooks {
  readonly loop: GameLoop;
  readonly sim: Sim;
  /** Runs exactly one fixed step with the current input and renders it. */
  stepOnce(): void;
  /** Pauses / resumes real-time stepping. */
  setPaused(paused: boolean): void;
}

/** Frames longer than this (tab switch, debugger) are clamped instead of fast-forwarded. */
const MAX_FRAME_MS = 250;
/** Audio sprite key and its generated files (`npm run assets:sfx`). */
const SFX_KEY = 'sfx';
const SFX_FILES = ['sfx.ogg', 'sfx.m4a'];

/**
 * M1 scene: loads atlases and the SFX sprite, then runs input → fixed-step sim → presenter.
 * Events are handed to presentation right after each step, so nothing is lost on multi-step frames.
 */
export class BootScene extends Phaser.Scene {
  private readonly deps: BootSceneDeps;
  private presenter?: Presenter;
  private loop?: GameLoop;
  private paused = false;
  private restarts = 0;
  private hitStopMs = 0;
  private slowMotionMs = 0;
  private slowScale = 1;

  constructor(deps: BootSceneDeps) {
    super('boot');
    this.deps = deps;
  }

  preload(): void {
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      // Missing audio degrades to silence; missing art is fatal.
      if (file.key === SFX_KEY) return;
      throw new Error(`Failed to load asset "${file.key}" from ${file.src}`);
    });
    for (const atlas of this.deps.manifest.atlases) {
      this.load.atlas(atlas.key, this.deps.atlasUrl(atlas.image), this.deps.atlasUrl(atlas.data));
    }
    this.load.audioSprite(
      SFX_KEY,
      this.deps.audioUrl('sfx.json'),
      SFX_FILES.map((name) => this.deps.audioUrl(name)),
    );
  }

  create(): void {
    const { content, manifest, sim, input } = this.deps;
    registerAnimations(this.anims, content.sprites, manifest);
    const audio = new AudioDirector({
      play: (clip, config) => {
        if (!this.cache.audio.exists(SFX_KEY)) return undefined;
        const sound = this.sound.addAudioSprite(SFX_KEY);
        sound.play(clip, config);
        return sound;
      },
    });
    const presenter = new Presenter(this, content, manifest, audio);
    this.presenter = presenter;

    const step = (): void => {
      sim.step(input.poll());
      const events = sim.drainEvents();
      for (const event of events) if (event.type === 'GameRestarted') this.restarts += 1;
      const timing = presenter.handle(events);
      this.hitStopMs = Math.max(this.hitStopMs, timing.hitStopMs);
      this.slowMotionMs = Math.max(this.slowMotionMs, timing.slowMotionMs);
      this.slowScale = Math.min(this.slowScale, timing.slowScale);
    };
    const loop = createGameLoop({ stepMs: TICK_MS, maxFrameMs: MAX_FRAME_MS, step });
    this.loop = loop;
    this.render(0);
    this.deps.statusElement.dataset['state'] = 'ready';

    this.deps.attachDebug?.({
      loop,
      sim,
      stepOnce: () => {
        step();
        this.render(0);
      },
      setPaused: (paused) => {
        this.paused = paused;
        loop.reset();
      },
    });
  }

  override update(_time: number, delta: number): void {
    this.presenter?.update(delta);
    if (!this.loop || this.paused) return;
    if (this.hitStopMs > 0) {
      this.hitStopMs = Math.max(0, this.hitStopMs - delta);
      return;
    }
    const scale = this.slowMotionMs > 0 ? this.slowScale : 1;
    this.slowMotionMs = Math.max(0, this.slowMotionMs - delta);
    if (this.slowMotionMs === 0) this.slowScale = 1;
    this.loop.advance(delta * scale);
    this.render(this.loop.alpha);
  }

  private render(alpha: number): void {
    const view = this.deps.sim.snapshot();
    this.presenter?.sync(view, alpha);
    const status = this.deps.statusElement.dataset;
    status['phase'] = view.phase;
    status['lives'] = String(view.lives);
    status['wave'] = String(view.wave);
    status['restarts'] = String(this.restarts);
    status['shipFrame'] = this.presenter?.playerFrame ?? '';
  }
}
