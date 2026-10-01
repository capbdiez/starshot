import type Phaser from 'phaser';
import type { AssetManifest, Content } from '../../content/index.ts';

/** Animation key for a sprite clip, following the `<category>_<name>/<animation>` convention. */
export function animationKey(spriteKey: string, clip: string): string {
  return `${spriteKey}/${clip}`;
}

/**
 * Registers one Phaser animation per content clip, using the frame names from the asset manifest.
 * Clip timing comes from `content/animations`; frames come from the atlas, so swapping a
 * placeholder for final art needs no code change.
 */
export function registerAnimations(
  anims: Phaser.Animations.AnimationManager,
  sprites: Content['sprites'],
  manifest: AssetManifest,
): void {
  for (const [spriteKey, spec] of Object.entries(sprites)) {
    const entry = manifest.sprites[spriteKey];
    if (!entry) {
      throw new Error(`Sprite "${spriteKey}" is missing from the asset manifest`);
    }
    for (const [clip, clipSpec] of Object.entries(spec.clips)) {
      const frames = entry.clips[clip];
      if (!frames) {
        throw new Error(`Clip "${animationKey(spriteKey, clip)}" is missing from the manifest`);
      }
      anims.create({
        key: animationKey(spriteKey, clip),
        frames: frames.map((frame) => ({ key: entry.atlas, frame })),
        frameRate: clipSpec.fps,
        repeat: clipSpec.repeat,
      });
    }
  }
}
