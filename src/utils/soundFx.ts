import { audioManager } from '../audio/AudioManager';

/**
 * Compatibility facade forwarding all game audio calls to the Centralized AudioManager.
 */
export const soundFx = audioManager;
