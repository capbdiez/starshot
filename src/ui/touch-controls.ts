import type Phaser from 'phaser';
import {
  PRESENTATION_HEIGHT,
  PRESENTATION_SCALE,
  PRESENTATION_WIDTH,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '../shared/index.ts';
import { drawDisplayText, UI_COLOUR } from './ui-art.ts';

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

const CONTROL_WIDTH = 44;
const CONTROL_HEIGHT = 36;
const EDGE = 9;

/**
 * Fixed lower-corner controls leave the score HUD and upper gameplay field readable. Their world
 * coordinates are transformed by the fixed 2× camera into the 540×960 presentation buffer.
 */
export function touchControlLayout(width = WORLD_WIDTH, height = WORLD_HEIGHT): TouchControlLayout {
  const y = height - EDGE - CONTROL_HEIGHT / 2;
  return {
    left: { x: EDGE + CONTROL_WIDTH / 2, y, width: CONTROL_WIDTH, height: CONTROL_HEIGHT },
    right: { x: EDGE * 2 + CONTROL_WIDTH * 1.5, y, width: CONTROL_WIDTH, height: CONTROL_HEIGHT },
    fire: {
      x: width - EDGE * 2 - CONTROL_WIDTH * 1.5,
      y,
      width: CONTROL_WIDTH,
      height: CONTROL_HEIGHT,
    },
    bomb: { x: width - EDGE - CONTROL_WIDTH / 2, y, width: CONTROL_WIDTH, height: CONTROL_HEIGHT },
    pause: { x: width - 21, y: 21, width: 30, height: 21 },
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
    this.addControl(scene, layout.left, 'LEFT');
    this.addControl(scene, layout.right, 'RIGHT');
    this.addControl(scene, layout.fire, 'FIRE');
    this.addControl(scene, layout.bomb, 'BOMB');
    this.addControl(scene, layout.pause, 'PAUSE', onPause);
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
    label: string,
    action?: () => void,
  ): void {
    const graphics = scene.add.graphics();
    graphics
      .fillStyle(UI_COLOUR.panel, 0.72)
      .fillRect(
        bounds.x - bounds.width / 2,
        bounds.y - bounds.height / 2,
        bounds.width,
        bounds.height,
      )
      .lineStyle(2, UI_COLOUR.cyan, 0.9)
      .strokeRect(
        bounds.x - bounds.width / 2,
        bounds.y - bounds.height / 2,
        bounds.width,
        bounds.height,
      );
    drawDisplayText(graphics, label, bounds.x, bounds.y - 4, 2, UI_COLOUR.white, true);
    this.container.add(graphics);
    if (!action) return;
    const hit = scene.add
      .rectangle(bounds.x, bounds.y, bounds.width, bounds.height, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    hit.on('pointerdown', action);
    this.container.add(hit);
  }
}
