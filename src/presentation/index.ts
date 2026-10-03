export { AudioDirector, type AudioSettings, type SoundPlayer } from './audio/audio-director.ts';
export { animationKey, registerAnimations } from './anim/register-animations.ts';
export {
  planFx,
  planFxBatch,
  reactionsFor,
  smooth,
  type FxBudgetSettings,
  type FxReaction,
  type FxReactions,
  type PlannedFx,
  type VisualQuality,
} from './fx/event-fx.ts';
export { StageBackground } from './background/stage-background.ts';
export { Trauma } from './fx/trauma.ts';
export {
  hostileBulletTransform,
  projectileSpriteKeys,
  Presenter,
  type FxTiming,
  type PresentationSettings,
} from './presenter.ts';
