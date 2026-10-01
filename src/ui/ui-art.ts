import type Phaser from 'phaser';
import { displayGlyph } from '../shared/index.ts';

export const UI_COLOUR = {
  ink: 0x0b0b1a,
  panel: 0x141430,
  panelEdge: 0x2a2d63,
  cyan: 0xa6f6ff,
  cyanGlow: 0x3ee0ff,
  white: 0xffffff,
  violet: 0xb98cff,
  amber: 0xffd08a,
} as const;

const GLYPH_WIDTH = 5;
const GLYPH_GAP = 1;

/** Draws palette-safe 5×7 display glyphs into a Phaser graphics object. */
export function drawDisplayText(
  graphics: Phaser.GameObjects.Graphics,
  text: string,
  x: number,
  y: number,
  scale: number,
  colour: number = UI_COLOUR.white,
  centered = false,
): void {
  const width = text.length * (GLYPH_WIDTH + GLYPH_GAP) * scale - scale;
  let cursor = centered ? Math.round(x - width / 2) : x;
  graphics.fillStyle(colour, 1);
  for (const character of text) {
    const glyph = displayGlyph(character);
    glyph.forEach((row, rowIndex) => {
      for (let column = 0; column < row.length; column += 1)
        if (row.charAt(column) === '1')
          graphics.fillRect(cursor + column * scale, y + rowIndex * scale, scale, scale);
    });
    cursor += (GLYPH_WIDTH + GLYPH_GAP) * scale;
  }
}

/** Draws the shared beveled neo-arcade panel border and its restrained ornaments. */
export function drawPanelFrame(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  accent = UI_COLOUR.cyan,
): void {
  const left = x - width / 2;
  const top = y - height / 2;
  const corner = 8;
  graphics.fillStyle(UI_COLOUR.ink, 0.9).fillRect(left, top, width, height);
  graphics.fillStyle(UI_COLOUR.panel, 0.94).fillRect(left + 2, top + 2, width - 4, height - 4);
  graphics
    .lineStyle(1, UI_COLOUR.panelEdge, 1)
    .strokeRect(left + 4, top + 4, width - 8, height - 8);
  graphics.lineStyle(1, accent, 1);
  graphics.lineBetween(left, top + corner, left, top + height - corner);
  graphics.lineBetween(left + corner, top, left + width - corner, top);
  graphics.lineBetween(left + width, top + corner, left + width, top + height - corner);
  graphics.lineBetween(left + corner, top + height, left + width - corner, top + height);
  graphics.fillStyle(accent, 1);
  for (const [dx, dy] of [
    [corner, 0],
    [0, corner],
    [width - corner - 1, 0],
    [width - 1, corner],
    [0, height - corner - 1],
    [corner, height - 1],
    [width - corner - 1, height - 1],
    [width - 1, height - corner - 1],
  ] as const)
    graphics.fillRect(left + dx, top + dy, 2, 2);
}

/** Creates an interactive framed display button while retaining pointer semantics. */
export function addButton(
  scene: Phaser.Scene,
  parent: Phaser.GameObjects.Container,
  text: string,
  y: number,
  action: () => void,
  compact = false,
): void {
  const width = compact ? 202 : 210;
  const height = compact ? 16 : 20;
  const graphics = scene.add.graphics();
  const draw = (active: boolean): void => {
    graphics.clear();
    const accent = active ? UI_COLOUR.white : UI_COLOUR.cyan;
    const left = -width / 2;
    const top = y - height / 2;
    graphics
      .fillStyle(active ? UI_COLOUR.panelEdge : UI_COLOUR.ink, 1)
      .fillRect(left, top, width, height);
    graphics.lineStyle(1, accent, 1).strokeRect(left, top, width, height);
    graphics.fillStyle(UI_COLOUR.cyanGlow, 1).fillRect(left + 3, y - 1, 4, 2);
    drawDisplayText(graphics, text, 0, y - (compact ? 3 : 4), compact ? 1 : 1, accent, true);
  };
  draw(false);
  const hit = scene.add
    .rectangle(0, y, width, height, 0x000000, 0)
    .setInteractive({ useHandCursor: true });
  hit.on('pointerdown', action);
  hit.on('pointerover', () => {
    draw(true);
  });
  hit.on('pointerout', () => {
    draw(false);
  });
  parent.add([graphics, hit]);
}
