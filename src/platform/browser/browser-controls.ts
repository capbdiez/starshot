/** Minimal audio surface that can be unlocked after a player gesture. */
export interface AudioUnlocker {
  unlock(): void;
}

/** Unlocks browser audio after a player gesture. */
export function unlockAudio(audio: AudioUnlocker): void {
  audio.unlock();
}

/** Requests browser fullscreen when supported; rejection is a non-fatal browser policy outcome. */
export function requestFullscreen(element: HTMLElement): void {
  if (typeof element.requestFullscreen !== 'function' || document.fullscreenElement === element)
    return;
  void element.requestFullscreen().catch(() => undefined);
}
