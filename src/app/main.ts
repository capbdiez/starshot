import Phaser from 'phaser';
import { loadContent } from '../content/index.ts';
import {
  createInputSource,
  createSaveStore,
  readViewport,
  watchViewport,
} from '../platform/index.ts';
import { PRESENTATION_HEIGHT, PRESENTATION_WIDTH } from '../shared/index.ts';
import { createSim } from '../sim/index.ts';
import {
  atlasFileUrl,
  audioFileUrl,
  bundledContentFiles,
  bundledManifest,
} from './bundled-assets.ts';
import { displayZoom } from './display-zoom.ts';
import { BootScene, type DebugHooks } from './scenes/boot-scene.ts';
import './style.css';

/** Run seed: `?seed=N` for reproducible sessions, otherwise random per page load. */
function runSeed(): number {
  const param = new URLSearchParams(window.location.search).get('seed');
  const parsed = param === null ? Number.NaN : Number.parseInt(param, 10);
  return Number.isFinite(parsed) ? parsed >>> 0 : (Math.random() * 0x1_0000_0000) >>> 0;
}

/** Loads the dev-only frame-step view; the dynamic import is tree-shaken from prod builds. */
function attachDebug(hooks: DebugHooks): void {
  if (!import.meta.env.DEV) return;
  void import('../debug/index.ts').then(({ attachFrameStep }) => {
    attachFrameStep(window, hooks);
  });
}

function boot(): void {
  const container = document.getElementById('game');
  if (!container) {
    throw new Error('Missing #game container');
  }

  const content = loadContent(bundledContentFiles());
  const manifest = bundledManifest();
  const seed = runSeed();
  container.dataset['seed'] = String(seed);
  const input = createInputSource(window);
  const saves = createSaveStore(window.localStorage);

  const zoomFor = (): number =>
    displayZoom(readViewport(window), PRESENTATION_WIDTH, PRESENTATION_HEIGHT);

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: container,
    width: PRESENTATION_WIDTH,
    height: PRESENTATION_HEIGHT,
    backgroundColor: '#0b0b1a',
    pixelArt: true,
    scale: { mode: Phaser.Scale.NONE, zoom: zoomFor() },
    input: { gamepad: false, keyboard: false },
    scene: new BootScene({
      content,
      manifest,
      createSim: () => createSim(content, seed),
      input,
      saves,
      atlasUrl: atlasFileUrl,
      audioUrl: audioFileUrl,
      statusElement: container,
      attachDebug,
    }),
  });

  game.events.once(Phaser.Core.Events.READY, () => {
    watchViewport(window, (viewport) => {
      game.scale.setZoom(displayZoom(viewport, PRESENTATION_WIDTH, PRESENTATION_HEIGHT));
    });
  });
}

boot();
