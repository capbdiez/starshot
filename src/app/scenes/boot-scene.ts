import Phaser from 'phaser';
import type { AssetManifest, Content } from '../../content/index.ts';
import {
  type InputSource,
  type SaveStore,
  type Settings,
  requestFullscreen,
  unlockAudio,
  watchVisibility,
} from '../../platform/index.ts';
import { AudioDirector, Presenter, registerAnimations } from '../../presentation/index.ts';
import { MenuOverlay, type UiCommand } from '../../ui/index.ts';
import { transitionFlow, type FlowCommand, type FlowState } from '../flow.ts';
import { TICK_MS } from '../../shared/index.ts';
import type { Sim } from '../../sim/index.ts';
import { createGameLoop, type GameLoop } from '../game-loop.ts';

/** Everything the game scene needs, built by the composition root. */
export interface BootSceneDeps {
  readonly content: Content;
  readonly manifest: AssetManifest;
  readonly createSim: () => Sim;
  readonly input: InputSource;
  readonly saves: SaveStore;
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
const MUSIC_FILES = ['music_title', 'music_stage', 'music_boss'] as const;
type MusicKey = (typeof MUSIC_FILES)[number];

/**
 * M1 scene: loads atlases and the SFX sprite, then runs input → fixed-step sim → presenter.
 * Events are handed to presentation right after each step, so nothing is lost on multi-step frames.
 */
export class BootScene extends Phaser.Scene {
  private readonly deps: BootSceneDeps;
  private presenter?: Presenter;
  private loop?: GameLoop;
  private sim?: Sim;
  private audio?: AudioDirector;
  private menus?: MenuOverlay;
  private flow: FlowState = 'title';
  private restarts = 0;
  private removeVisibilityWatch?: () => void;
  private music?: Phaser.Sound.BaseSound;
  private musicKey?: MusicKey;
  private musicVolume = 0.7;
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
      if (file.key === SFX_KEY || MUSIC_FILES.includes(file.key as MusicKey)) return;
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
    for (const key of MUSIC_FILES) {
      this.load.audio(
        key,
        [`${key}.ogg`, `${key}.m4a`].map((name) => this.deps.audioUrl(name)),
      );
    }
  }

  create(): void {
    const { content, manifest, input } = this.deps;
    this.sim = this.deps.createSim();
    const sim = this.sim;
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
    this.audio = audio;
    this.applySettings(this.deps.saves.settings());
    this.menus = new MenuOverlay(this, content, {
      command: (command) => {
        this.command(command);
      },
      settings: (settings) => {
        this.applySettings(this.deps.saves.updateSettings(settings));
      },
      fullscreen: () => {
        requestFullscreen(this.game.canvas);
      },
    });

    const step = (): void => {
      const activeSim = this.sim;
      if (!activeSim) return;
      activeSim.step(input.poll());
      const events = activeSim.drainEvents();
      if (events.some((event) => event.type === 'GameOver' || event.type === 'RunCompleted')) {
        const view = activeSim.snapshot();
        this.deps.saves.recordScore({ score: view.score, stage: view.wave });
        this.command('results');
      }
      if (events.some((event) => event.type === 'BossStarted')) this.setMusic('music_boss');
      if (events.some((event) => event.type === 'BossStarted' || event.type === 'PlayerHit'))
        this.duckMusic();
      const timing = presenter.handle(events);
      this.hitStopMs = Math.max(this.hitStopMs, timing.hitStopMs);
      this.slowMotionMs = Math.max(this.slowMotionMs, timing.slowMotionMs);
      this.slowScale = Math.min(this.slowScale, timing.slowScale);
    };
    const loop = createGameLoop({ stepMs: TICK_MS, maxFrameMs: MAX_FRAME_MS, step });
    this.loop = loop;
    this.render(0);
    this.showFlow();
    this.deps.statusElement.dataset['state'] = 'ready';
    this.input.keyboard?.on('keydown-ESC', () => {
      if (this.flow === 'play') this.command('pause');
      else if (this.flow === 'pause') this.command('resume');
    });
    const onStartKey = (event: KeyboardEvent): void => {
      if (
        (event.code === 'KeyZ' || event.code === 'Space') &&
        (this.flow === 'title' || this.flow === 'results')
      ) {
        this.command('start');
      }
    };
    window.addEventListener('keydown', onStartKey);
    this.removeVisibilityWatch = watchVisibility(document, (hidden) => {
      if (hidden) {
        this.sound.pauseAll();
        if (this.flow === 'play') this.command('pause');
      } else {
        this.sound.resumeAll();
      }
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.removeVisibilityWatch?.();
      window.removeEventListener('keydown', onStartKey);
    });

    this.deps.attachDebug?.({
      loop,
      sim,
      stepOnce: () => {
        step();
        this.render(0);
      },
      setPaused: (paused) => {
        if (paused) this.command('pause');
        else this.command('resume');
        loop.reset();
      },
    });
  }

  override update(_time: number, delta: number): void {
    this.presenter?.update(delta);
    if (!this.loop || this.flow !== 'play') return;
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

  private command(command: FlowCommand | UiCommand): void {
    const next = transitionFlow(this.flow, command);
    if (next === this.flow) return;
    if (command === 'start') {
      this.sim = this.deps.createSim();
      this.restarts += 1;
      this.loop?.reset();
      this.hitStopMs = 0;
      this.slowMotionMs = 0;
      this.slowScale = 1;
    }
    unlockAudio(this.sound);
    this.flow = next;
    this.showFlow();
    this.render(0);
  }

  private showFlow(): void {
    if (this.flow === 'play') this.menus?.hide();
    else this.menus?.show(this.flow, this.deps.saves.scores(), this.deps.saves.settings());
    if (this.flow !== 'play' && this.flow !== 'pause') this.setMusic('music_title');
    else if (this.sim?.snapshot().boss) this.setMusic('music_boss');
    else this.setMusic('music_stage');
    this.deps.statusElement.dataset['flow'] = this.flow;
  }

  private setMusic(key: MusicKey, restart = false): void {
    if (!restart && this.musicKey === key && this.music?.isPlaying) return;
    this.music?.stop();
    this.musicKey = key;
    if (!this.cache.audio.exists(key)) return;
    this.music = this.sound.add(key, { loop: true, volume: this.musicVolume });
    this.music.play();
  }

  /** Briefly lowers music during high-priority boss and death events (ART_DIRECTION §8). */
  private duckMusic(): void {
    if (!this.music) return;
    this.tweens.add({
      targets: this.music,
      volume: this.musicVolume * 0.5,
      duration: 120,
      yoyo: true,
      hold: 600,
    });
  }

  private applySettings(settings: Settings): void {
    const changedMusicVolume = this.musicVolume !== settings.music;
    this.musicVolume = settings.music;
    if (changedMusicVolume && this.musicKey) this.setMusic(this.musicKey, true);
    this.audio?.setSettings({ music: settings.music, sfx: settings.sfx, ui: settings.ui });
    this.presenter?.setSettings({ shake: settings.shake, flashReduction: settings.flashReduction });
  }

  private render(alpha: number): void {
    const view = this.sim?.snapshot();
    if (!view) return;
    this.presenter?.sync(view, alpha);
    const status = this.deps.statusElement.dataset;
    status['phase'] = view.phase;
    status['lives'] = String(view.lives);
    status['wave'] = String(view.wave);
    status['restarts'] = String(this.restarts);
    status['shipFrame'] = this.presenter?.playerFrame ?? '';
  }
}
