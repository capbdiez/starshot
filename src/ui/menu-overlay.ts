import type Phaser from 'phaser';
import type { Content } from '../content/index.ts';
import { addButton, drawDisplayText, drawPanelFrame, UI_COLOUR } from './ui-art.ts';

/** Commands emitted by the UI; app maps them to its scene-flow state machine. */
export type UiCommand = 'start' | 'pause' | 'resume' | 'title' | 'settings' | 'back';

/** Settings values displayed and changed by the UI. */
export interface UiSettings {
  readonly music: number;
  readonly sfx: number;
  readonly ui: number;
  readonly shake: number;
  readonly flashReduction: boolean;
  readonly crt: boolean;
  readonly highContrastBullets: boolean;
  readonly subtitles: boolean;
  readonly visualQuality: 'low' | 'high';
  readonly backgroundMotion: boolean;
  readonly effectsIntensity: number;
}

/** One high-score row displayed by the UI. */
export interface UiHighScore {
  readonly score: number;
  readonly stage: number;
}

/** UI events consumed by the app composition root. */
export interface MenuOverlayEvents {
  command(command: UiCommand): void;
  settings(settings: Partial<UiSettings>): void;
  fullscreen(): void;
}

const DEPTH = 200;
const PANEL_WIDTH = 246;
const PANEL_HEIGHT = 430;
const TITLE_SCORE_START_Y = 55;
const TITLE_SCORE_ROW_STEP = 12;

/** Phaser menu overlay; it emits commands and never accesses simulation or browser APIs. */
export class MenuOverlay {
  private readonly scene: Phaser.Scene;
  private readonly events: MenuOverlayEvents;
  private readonly strings: Content['strings'];
  private readonly panel: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, content: Content, events: MenuOverlayEvents) {
    this.scene = scene;
    this.events = events;
    this.strings = content.strings;
    this.panel = scene.add.container(135, 240).setDepth(DEPTH).setVisible(false);
  }

  show(
    state: 'title' | 'pause' | 'results' | 'settings',
    scores: readonly UiHighScore[],
    settings: UiSettings,
  ): void {
    this.panel.removeAll(true);
    this.panel.setVisible(true);
    const frame = this.scene.add.graphics();
    drawPanelFrame(frame, 0, 0, PANEL_WIDTH, PANEL_HEIGHT);
    frame.lineStyle(1, UI_COLOUR.panelEdge, 1).lineBetween(-102, -158, 102, -158);
    frame.fillStyle(UI_COLOUR.cyanGlow, 1).fillRect(-100, -159, 24, 2).fillRect(76, -159, 24, 2);
    this.panel.add(frame);
    if (state === 'title') this.title(scores);
    if (state === 'pause') this.pause();
    if (state === 'results') this.results(scores);
    if (state === 'settings') this.settings(settings);
  }

  hide(): void {
    this.panel.setVisible(false);
  }

  private label(text: string, y: number, scale = 1, colour: number = UI_COLOUR.white): void {
    const label = this.scene.add.graphics();
    drawDisplayText(label, text, 0, y, scale, colour, true);
    this.panel.add(label);
  }

  private button(text: string, y: number, action: () => void, compact = false): void {
    addButton(this.scene, this.panel, text, y, action, compact);
  }

  private title(scores: readonly UiHighScore[]): void {
    this.label(this.strings['title'] ?? 'STARSHOT', -137, 3, UI_COLOUR.cyan);
    this.label(this.strings['start'] ?? 'PRESS FIRE TO START', -96, 1, UI_COLOUR.amber);
    this.button('PLAY', -25, () => {
      this.events.command('start');
    });
    this.button(this.strings['settings'] ?? 'SETTINGS', 15, () => {
      this.events.command('settings');
    });
    this.scoreLines(scores, TITLE_SCORE_START_Y, TITLE_SCORE_ROW_STEP);
  }

  private pause(): void {
    this.label('PAUSED', -80, 2, UI_COLOUR.amber);
    this.button(this.strings['resume'] ?? 'RESUME', -20, () => {
      this.events.command('resume');
    });
    this.button(this.strings['settings'] ?? 'SETTINGS', 20, () => {
      this.events.command('settings');
    });
    this.button(this.strings['titleButton'] ?? 'TITLE', 60, () => {
      this.events.command('title');
    });
  }

  private results(scores: readonly UiHighScore[]): void {
    this.label(this.strings['results'] ?? 'GAME OVER', -125, 2, UI_COLOUR.amber);
    this.scoreLines(scores, -55);
    this.button(this.strings['retry'] ?? 'PLAY AGAIN', 100, () => {
      this.events.command('start');
    });
    this.button(this.strings['titleButton'] ?? 'TITLE', 140, () => {
      this.events.command('title');
    });
  }

  private settings(settings: UiSettings): void {
    // Thirteen controls fit inside the panel's ±215 world-pixel bounds at this compact rhythm.
    this.label(this.strings['settings'] ?? 'SETTINGS', -185, 2, UI_COLOUR.cyan);
    this.button(`MUSIC ${String(Math.round(settings.music * 100))}%`, -150, () => {
      this.events.settings({ music: settings.music >= 1 ? 0 : settings.music + 0.1 });
    });
    this.button(`SFX ${String(Math.round(settings.sfx * 100))}%`, -125, () => {
      this.events.settings({ sfx: settings.sfx >= 1 ? 0 : settings.sfx + 0.1 });
    });
    this.button(`UI ${String(Math.round(settings.ui * 100))}%`, -100, () => {
      this.events.settings({ ui: settings.ui >= 1 ? 0 : settings.ui + 0.1 });
    });
    this.button(`SHAKE ${String(Math.round(settings.shake * 100))}%`, -75, () => {
      this.events.settings({ shake: settings.shake >= 1 ? 0 : settings.shake + 0.1 });
    });
    this.button(`FLASH ${settings.flashReduction ? 'REDUCED' : 'FULL'}`, -50, () => {
      this.events.settings({ flashReduction: !settings.flashReduction });
    });
    this.button(`CRT ${settings.crt ? 'ON' : 'OFF'}`, -25, () => {
      this.events.settings({ crt: !settings.crt });
    });
    this.button(
      `${this.strings['highContrastBullets'] ?? 'HIGH-CONTRAST BULLETS'} ${settings.highContrastBullets ? 'ON' : 'OFF'}`,
      0,
      () => {
        this.events.settings({ highContrastBullets: !settings.highContrastBullets });
      },
    );
    this.button(
      `${this.strings['subtitles'] ?? 'BOSS SUBTITLES'} ${settings.subtitles ? 'ON' : 'OFF'}`,
      25,
      () => {
        this.events.settings({ subtitles: !settings.subtitles });
      },
    );
    this.button(`QUALITY ${settings.visualQuality.toUpperCase()}`, 50, () => {
      this.events.settings({ visualQuality: settings.visualQuality === 'high' ? 'low' : 'high' });
    });
    this.button(`BACKGROUND MOTION ${settings.backgroundMotion ? 'ON' : 'OFF'}`, 75, () => {
      this.events.settings({ backgroundMotion: !settings.backgroundMotion });
    });
    this.button(`FX ${String(Math.round(settings.effectsIntensity * 100))}%`, 100, () => {
      this.events.settings({
        effectsIntensity:
          settings.effectsIntensity >= 1
            ? 0
            : Math.round((settings.effectsIntensity + 0.25) * 100) / 100,
      });
    });
    this.button(this.strings['fullscreen'] ?? 'FULLSCREEN', 125, () => {
      this.events.fullscreen();
    });
    this.button('BACK', 150, () => {
      this.events.command('back');
    });
  }

  private scoreLines(scores: readonly UiHighScore[], startY: number, rowStep = 15): void {
    this.label('HIGH SCORES', startY - 20);
    const entries =
      scores.length === 0
        ? ['NO SCORES YET']
        : scores.map(
            (entry, index) =>
              `${String(index + 1).padStart(2, '0')}  ${String(entry.score).padStart(6, '0')}  STG ${String(entry.stage)}`,
          );
    entries.slice(0, 10).forEach((entry, index) => {
      this.label(entry, startY + index * rowStep);
    });
  }
}
