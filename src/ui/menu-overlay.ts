import type Phaser from 'phaser';
import type { Content } from '../content/index.ts';

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
    this.panel.add(
      this.scene.add.rectangle(0, 0, 246, 350, 0x0b0b1a, 0.94).setStrokeStyle(2, 0xa6f6ff),
    );
    if (state === 'title') this.title(scores);
    if (state === 'pause') this.pause();
    if (state === 'results') this.results(scores);
    if (state === 'settings') this.settings(settings);
  }

  hide(): void {
    this.panel.setVisible(false);
  }

  private label(text: string, y: number, size = '12px'): Phaser.GameObjects.Text {
    const label = this.scene.add
      .text(0, y, text, {
        color: '#f4f7ff',
        fontFamily: 'monospace',
        fontSize: size,
        align: 'center',
      })
      .setOrigin(0.5);
    this.panel.add(label);
    return label;
  }

  private button(text: string, y: number, action: () => void): void {
    const button = this.scene.add
      .text(0, y, text, {
        color: '#a6f6ff',
        fontFamily: 'monospace',
        fontSize: '11px',
        align: 'center',
        backgroundColor: '#1c1f47',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    button.on('pointerdown', action);
    button.on('pointerover', () => button.setColor('#ffffff'));
    button.on('pointerout', () => button.setColor('#a6f6ff'));
    this.panel.add(button);
  }

  private title(scores: readonly UiHighScore[]): void {
    this.label(this.strings['title'] ?? 'STARSHOT', -130, '28px');
    this.label(this.strings['start'] ?? 'PRESS FIRE TO START', -75);
    this.button('PLAY', -25, () => {
      this.events.command('start');
    });
    this.button(this.strings['settings'] ?? 'SETTINGS', 15, () => {
      this.events.command('settings');
    });
    this.scoreLines(scores, 75);
  }

  private pause(): void {
    this.label('PAUSED', -80, '22px');
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
    this.label(this.strings['results'] ?? 'GAME OVER', -125, '22px');
    this.scoreLines(scores, -55);
    this.button(this.strings['retry'] ?? 'PLAY AGAIN', 100, () => {
      this.events.command('start');
    });
    this.button(this.strings['titleButton'] ?? 'TITLE', 140, () => {
      this.events.command('title');
    });
  }

  private settings(settings: UiSettings): void {
    this.label(this.strings['settings'] ?? 'SETTINGS', -130, '20px');
    this.button(`MUSIC ${String(Math.round(settings.music * 100))}%`, -80, () => {
      this.events.settings({ music: settings.music >= 1 ? 0 : settings.music + 0.1 });
    });
    this.button(`SFX ${String(Math.round(settings.sfx * 100))}%`, -45, () => {
      this.events.settings({ sfx: settings.sfx >= 1 ? 0 : settings.sfx + 0.1 });
    });
    this.button(`UI ${String(Math.round(settings.ui * 100))}%`, -10, () => {
      this.events.settings({ ui: settings.ui >= 1 ? 0 : settings.ui + 0.1 });
    });
    this.button(`SHAKE ${String(Math.round(settings.shake * 100))}%`, 25, () => {
      this.events.settings({ shake: settings.shake >= 1 ? 0 : settings.shake + 0.1 });
    });
    this.button(`FLASH ${settings.flashReduction ? 'REDUCED' : 'FULL'}`, 60, () => {
      this.events.settings({ flashReduction: !settings.flashReduction });
    });
    this.button(`CRT ${settings.crt ? 'ON' : 'OFF'}`, 95, () => {
      this.events.settings({ crt: !settings.crt });
    });
    this.button(this.strings['fullscreen'] ?? 'FULLSCREEN', 130, () => {
      this.events.fullscreen();
    });
    this.button('BACK', 165, () => {
      this.events.command('back');
    });
  }

  private scoreLines(scores: readonly UiHighScore[], startY: number): void {
    this.label('HIGH SCORES', startY - 20);
    const entries =
      scores.length === 0
        ? ['NO SCORES YET']
        : scores.map(
            (entry, index) =>
              `${String(index + 1).padStart(2, '0')}  ${String(entry.score).padStart(6, '0')}  STG ${String(entry.stage)}`,
          );
    entries.slice(0, 10).forEach((entry, index) => this.label(entry, startY + index * 15, '10px'));
  }
}
