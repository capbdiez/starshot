import type Phaser from 'phaser';
import {
  PRESENTATION_HEIGHT,
  PRESENTATION_SCALE,
  PRESENTATION_WIDTH,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '../shared/index.ts';
import { UI_COLOUR } from './ui-art.ts';

/** Capability surface used to avoid showing touch controls on ordinary desktop pointers. */
export interface TouchControlCapabilities {
  matchMedia(query: string): { readonly matches: boolean };
  readonly maxTouchPoints: number;
}

/** Presentation-space bounds for the visible mobile controls. */
export interface TouchControlLayout {
  readonly left: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
  readonly right: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
  readonly fire: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
  readonly bomb: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
  readonly pause: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
}

/** Compact icon controls remain distinct while leaving the lower play field visible. */
const CONTROL_SIZE = 28;
const PAUSE_WIDTH = 22;
const PAUSE_HEIGHT = 18;
const EDGE = 9;
type ControlIcon = 'left' | 'right' | 'fire' | 'bomb' | 'pause';

/**
 * Fixed lower-corner controls leave the score HUD and upper gameplay field readable. Their world
 * coordinates are transformed by the fixed 2× camera into the 540×960 presentation buffer.
 */
export function touchControlLayout(width = WORLD_WIDTH, height = WORLD_HEIGHT): TouchControlLayout {
  const y = height - EDGE - CONTROL_SIZE / 2;
  return {
    left: { x: width / 8, y, width: CONTROL_SIZE, height: CONTROL_SIZE },
    right: { x: (width * 3) / 8, y, width: CONTROL_SIZE, height: CONTROL_SIZE },
    fire: { x: (width * 5) / 8, y, width: CONTROL_SIZE, height: CONTROL_SIZE },
    bomb: { x: (width * 7) / 8, y, width: CONTROL_SIZE, height: CONTROL_SIZE },
    pause: {
      x: width - EDGE - PAUSE_WIDTH / 2,
      y: EDGE + PAUSE_HEIGHT / 2,
      width: PAUSE_WIDTH,
      height: PAUSE_HEIGHT,
    },
  };
}

/** True when the browser reports a coarse primary pointer and touch capability. */
export function supportsTouchControls(capabilities: TouchControlCapabilities): boolean {
  return capabilities.maxTouchPoints > 0 && capabilities.matchMedia('(pointer: coarse)').matches;
}

/** Phaser HUD for discoverable lower-screen touch controls and a reachable pause action. */
export class TouchControls {
  private readonly container: Phaser.GameObjects.Container;
  private readonly supported: boolean;

  constructor(scene: Phaser.Scene, onPause: () => void, capabilities?: TouchControlCapabilities) {
    this.container = scene.add.container(0, 0).setDepth(150).setScrollFactor(0).setVisible(false);
    this.supported = supportsTouchControls(
      capabilities ?? {
        matchMedia: window.matchMedia.bind(window),
        maxTouchPoints: navigator.maxTouchPoints,
      },
    );
    if (!this.supported) return;

    const layout = touchControlLayout(
      PRESENTATION_WIDTH / PRESENTATION_SCALE,
      PRESENTATION_HEIGHT / PRESENTATION_SCALE,
    );
    this.addControl(scene, layout.left, 'left');
    this.addControl(scene, layout.right, 'right');
    this.addControl(scene, layout.fire, 'fire');
    this.addControl(scene, layout.bomb, 'bomb');
    this.addControl(scene, layout.pause, 'pause', onPause);
  }

  /** Whether this browser exposes a coarse primary pointer and touch capability. */
  get isSupported(): boolean {
    return this.supported;
  }

  /** Enables controls only while gameplay is active, so menus retain all pointer input. */
  setVisible(visible: boolean): void {
    this.container.setVisible(this.supported && visible);
  }

  private addControl(
    scene: Phaser.Scene,
    bounds: TouchControlLayout[keyof TouchControlLayout],
    icon: ControlIcon,
    action?: () => void,
  ): void {
    const graphics = scene.add.graphics();
    const left = bounds.x - bounds.width / 2;
    const top = bounds.y - bounds.height / 2;
    graphics
      .fillStyle(UI_COLOUR.panel, 0.64)
      .fillRect(left, top, bounds.width, bounds.height)
      .lineStyle(1, UI_COLOUR.cyan, 0.9)
      .strokeRect(left, top, bounds.width, bounds.height);
    this.drawIcon(graphics, bounds.x, bounds.y, icon);
    this.container.add(graphics);
    if (!action) return;
    const hit = scene.add
      .rectangle(bounds.x, bounds.y, bounds.width, bounds.height, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    hit.on('pointerdown', action);
    this.container.add(hit);
  }

  private drawIcon(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    icon: ControlIcon,
  ): void {
    graphics.fillStyle(UI_COLOUR.white, 1);
    if (icon === 'left' || icon === 'right') {
      const direction = icon === 'left' ? -1 : 1;
      graphics.fillTriangle(
        x + direction * 7,
        y,
        x - direction * 4,
        y - 7,
        x - direction * 4,
        y + 7,
      );
      return;
    }
    if (icon === 'fire') {
      graphics.lineStyle(2, UI_COLOUR.white, 1).strokeCircle(x, y, 6);
      graphics.fillCircle(x, y, 2);
      graphics.fillRect(x - 1, y - 10, 2, 4).fillRect(x - 1, y + 6, 2, 4);
      graphics.fillRect(x - 10, y - 1, 4, 2).fillRect(x + 6, y - 1, 4, 2);
      return;
    }
    if (icon === 'bomb') {
      graphics.fillCircle(x, y + 2, 7);
      graphics.lineStyle(2, UI_COLOUR.white, 1).lineBetween(x + 4, y - 4, x + 8, y - 9);
      graphics.fillStyle(UI_COLOUR.amber, 1).fillRect(x + 8, y - 11, 2, 2);
      return;
    }
    graphics.fillRect(x - 5, y - 6, 3, 12).fillRect(x + 2, y - 6, 3, 12);
  }
}
