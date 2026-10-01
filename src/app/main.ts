import Phaser from 'phaser';
import { loadContent } from '../content/index.ts';
import { watchViewport, readViewport } from '../platform/index.ts';
import { GAME_HEIGHT, GAME_WIDTH, NO_INPUT, TICK_MS } from '../shared/index.ts';
import { createSim } from '../sim/index.ts';
import { atlasFileUrl, bundledContentFiles, bundledManifest } from './bundled-assets.ts';
import { displayZoom } from './display-zoom.ts';
import { createGameLoop } from './game-loop.ts';
import { BootScene } from './scenes/boot-scene.ts';
import './style.css';

/** Frames longer than this (tab switch, debugger) are clamped instead of fast-forwarded. */
const MAX_FRAME_MS = 250;
/** Fixed seed until run seeding arrives with gameplay in M1. */
const DEV_SEED = 1;

function boot(): void {
  const container = document.getElementById('game');
  if (!container) {
    throw new Error('Missing #game container');
  }

  const content = loadContent(bundledContentFiles());
  const manifest = bundledManifest();
  const sim = createSim(content, DEV_SEED);
  const loop = createGameLoop({
    stepMs: TICK_MS,
    maxFrameMs: MAX_FRAME_MS,
    step: () => {
      sim.step(NO_INPUT);
      sim.drainEvents();
    },
  });

  const zoomFor = (): number => displayZoom(readViewport(window), GAME_WIDTH, GAME_HEIGHT);

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: container,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#0b0b1a',
    pixelArt: true,
    scale: { mode: Phaser.Scale.NONE, zoom: zoomFor() },
    scene: new BootScene({
      content,
      manifest,
      loop,
      atlasUrl: atlasFileUrl,
      statusElement: container,
    }),
  });

  game.events.once(Phaser.Core.Events.READY, () => {
    watchViewport(window, (viewport) => {
      game.scale.setZoom(displayZoom(viewport, GAME_WIDTH, GAME_HEIGHT));
    });
  });
}

boot();
