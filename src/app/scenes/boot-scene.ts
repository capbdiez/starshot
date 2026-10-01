import Phaser from 'phaser';
import type { AssetManifest, Content } from '../../content/index.ts';
import { animationKey, registerAnimations } from '../../presentation/index.ts';
import { GAME_WIDTH } from '../../shared/index.ts';
import type { GameLoop } from '../game-loop.ts';

/** Everything the boot scene needs, built by the composition root. */
export interface BootSceneDeps {
  readonly content: Content;
  readonly manifest: AssetManifest;
  readonly loop: GameLoop;
  /** Resolves a manifest atlas file name to a bundled URL. */
  readonly atlasUrl: (fileName: string) => string;
  /** Receives boot status as `data-*` attributes (used by the E2E smoke test). */
  readonly statusElement: HTMLElement;
}

/** Sprite shown in M0 to prove the atlas pipeline end to end. */
const SHOWCASE_SPRITE = 'player_ship';
/** Player band from GAME_SPEC §4. */
const PLAYER_Y = 440;

/** M0 boot scene: loads the atlases, registers data-driven animations, shows the ship. */
export class BootScene extends Phaser.Scene {
  private readonly deps: BootSceneDeps;

  constructor(deps: BootSceneDeps) {
    super('boot');
    this.deps = deps;
  }

  preload(): void {
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      throw new Error(`Failed to load asset "${file.key}" from ${file.src}`);
    });
    for (const atlas of this.deps.manifest.atlases) {
      this.load.atlas(atlas.key, this.deps.atlasUrl(atlas.image), this.deps.atlasUrl(atlas.data));
    }
  }

  create(): void {
    const { content, manifest, statusElement } = this.deps;
    registerAnimations(this.anims, content.sprites, manifest);

    const entry = manifest.sprites[SHOWCASE_SPRITE];
    const idleFrame = entry?.clips['idle']?.[0];
    if (!entry || idleFrame === undefined) {
      throw new Error(`"${SHOWCASE_SPRITE}" has no idle clip in the asset manifest`);
    }
    const ship = this.add.sprite(GAME_WIDTH / 2, PLAYER_Y, entry.atlas, idleFrame);
    ship.play(animationKey(SHOWCASE_SPRITE, 'idle'));

    statusElement.dataset['shipFrame'] = ship.frame.name;
    statusElement.dataset['state'] = 'ready';
  }

  override update(_time: number, delta: number): void {
    this.deps.loop.advance(delta);
  }
}
