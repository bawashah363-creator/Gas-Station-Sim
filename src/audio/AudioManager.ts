import { DayPhase, GameSettings } from '../game/types';

export interface EnvironmentAudioSnapshot {
  dayPhase: DayPhase;
  activityLevel: number; // 0..1 based on active vehicles, NPCs & workers
  drivingCars: number;
  idlingCars: number;
  washRunning: boolean;
  isPaused: boolean;
}

class CentralizedAudioManager {
  private ctx: AudioContext | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;

  private buffers: Map<string, AudioBuffer> = new Map();
  private cooldowns: Map<string, number> = new Map();
  private activeVoiceCount = 0;
  private readonly maxVoices = 26;

  private settings: GameSettings = {
    soundEnabled: true,
    musicEnabled: true,
    ambientEnabled: true,
    muteAll: false,
    masterVolume: 0.85,
    sfxVolume: 0.85,
    musicVolume: 0.45,
    ambientVolume: 0.65,
    showVirtualJoystick: true,
    highQualityShadows: true,
    graphicsQuality: 'high',
    cameraSensitivity: 1.0,
    language: 'en',
  };

  private unlocked = false;
  private unlockListenersBound = false;
  private isPaused = false;
  private isTabHidden = false;
  private currentDayPhase: DayPhase = 'Morning';
  private currentActivity = 0.25;

  // Continuous managed audio loops
  private windNode: { src: AudioBufferSourceNode; gain: GainNode; filter: BiquadFilterNode } | null =
    null;
  private crowdNode: { src: AudioBufferSourceNode; gain: GainNode; filter: BiquadFilterNode } | null =
    null;
  private drivingEngineNode: {
    osc: OscillatorNode;
    noise: AudioBufferSourceNode;
    gain: GainNode;
    filter: BiquadFilterNode;
  } | null = null;
  private idleEngineNode: {
    osc: OscillatorNode;
    gain: GainNode;
    filter: BiquadFilterNode;
  } | null = null;
  private fuelPumpLoop: {
    osc: OscillatorNode;
    noise: AudioBufferSourceNode;
    gain: GainNode;
  } | null = null;
  private carWashLoop: {
    osc: OscillatorNode;
    noise: AudioBufferSourceNode;
    gain: GainNode;
  } | null = null;

  private ambientTickTimer: number | null = null;
  private musicTimer: number | null = null;
  private musicStep = 0;

  constructor() {
    this.installBrowserAutoplayHooks();
  }

  public installBrowserAutoplayHooks(): void {
    if (typeof window === 'undefined' || this.unlockListenersBound) return;
    this.unlockListenersBound = true;

    const unlock = () => {
      const ctx = this.ensureContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        ctx.resume().then(() => {
          this.onUnlocked();
        }).catch(() => {});
      } else {
        this.onUnlocked();
      }
    };

    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('touchstart', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
  }

  private onUnlocked(): void {
    if (this.unlocked) return;
    this.unlocked = true;
    this.preloadBuffers();
    this.ensureAmbientLoops();
    this.ensureMusicLoop();
    this.applyMixerLevels(true);
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;

      const ctx = new AudioCtx();
      this.ctx = ctx;

      const comp = ctx.createDynamicsCompressor();
      comp.threshold.setValueAtTime(-16, ctx.currentTime);
      comp.knee.setValueAtTime(18, ctx.currentTime);
      comp.ratio.setValueAtTime(4, ctx.currentTime);
      comp.attack.setValueAtTime(0.004, ctx.currentTime);
      comp.release.setValueAtTime(0.18, ctx.currentTime);

      const master = ctx.createGain();
      const sfx = ctx.createGain();
      const music = ctx.createGain();
      const ambient = ctx.createGain();

      sfx.connect(master);
      music.connect(master);
      ambient.connect(master);
      master.connect(comp);
      comp.connect(ctx.destination);

      this.compressor = comp;
      this.masterGain = master;
      this.sfxGain = sfx;
      this.musicGain = music;
      this.ambientGain = ambient;

      this.preloadBuffers();
      this.applyMixerLevels(true);

      if (ctx.state === 'running') {
        this.unlocked = true;
        this.ensureAmbientLoops();
        this.ensureMusicLoop();
      }
    }
    return this.ctx;
  }

  /**
   * Pre-generates seamless procedural PCM AudioBuffers for wind, water, crowd murmur,
   * highway traffic rumble, footsteps, cash drawer snaps, and nozzle hardware clicks.
   */
  private preloadBuffers(): void {
    const ctx = this.ctx;
    if (!ctx || this.buffers.size > 0) return;

    const sr = ctx.sampleRate;

    // 1. Pink Noise 3s seamless loop (wind, water spray, fuel flow, crowd base)
    const pinkLen = sr * 3;
    const pinkBuf = ctx.createBuffer(1, pinkLen, sr);
    const pinkData = pinkBuf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < pinkLen; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      pinkData[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.09;
      b6 = white * 0.115926;
    }
    // Crossfade end into start for click-free seamless looping
    const fadeSamples = Math.floor(sr * 0.08);
    for (let i = 0; i < fadeSamples; i++) {
      const t = i / fadeSamples;
      pinkData[i] = pinkData[i] * t + pinkData[pinkLen - fadeSamples + i] * (1 - t);
    }
    this.buffers.set('pink_loop', pinkBuf);

    // 2. Footstep asphalt transient (90ms)
    const stepLen = Math.floor(sr * 0.09);
    const stepBuf = ctx.createBuffer(1, stepLen, sr);
    const stepData = stepBuf.getChannelData(0);
    for (let i = 0; i < stepLen; i++) {
      const env = Math.exp(-i / (sr * 0.018));
      const grit = (Math.random() * 2 - 1) * 0.55;
      const thump = Math.sin((i / sr) * Math.PI * 2 * 135) * 0.65;
      stepData[i] = (grit + thump) * env;
    }
    this.buffers.set('footstep', stepBuf);

    // 3. Mechanical nozzle / latch click (70ms)
    const clickLen = Math.floor(sr * 0.07);
    const clickBuf = ctx.createBuffer(1, clickLen, sr);
    const clickData = clickBuf.getChannelData(0);
    for (let i = 0; i < clickLen; i++) {
      const env = Math.exp(-i / (sr * 0.011));
      const metal =
        Math.sin((i / sr) * Math.PI * 2 * 1420) * 0.45 +
        Math.sin((i / sr) * Math.PI * 2 * 2380) * 0.25 +
        (Math.random() * 2 - 1) * 0.35;
      clickData[i] = metal * env;
    }
    this.buffers.set('nozzle_click', clickBuf);

    // 4. Cash register drawer clack (140ms)
    const cashLen = Math.floor(sr * 0.14);
    const cashBuf = ctx.createBuffer(1, cashLen, sr);
    const cashData = cashBuf.getChannelData(0);
    for (let i = 0; i < cashLen; i++) {
      const t = i / sr;
      const env1 = Math.exp(-t / 0.02);
      const env2 = t > 0.04 ? Math.exp(-(t - 0.04) / 0.03) : 0;
      const clack = (Math.random() * 2 - 1) * 0.55 * env1;
      const slide = Math.sin(t * Math.PI * 2 * 640) * 0.4 * env2;
      cashData[i] = clack + slide;
    }
    this.buffers.set('cash_drawer', cashBuf);

    // 5. Door latch + wood thud (260ms)
    const doorLen = Math.floor(sr * 0.26);
    const doorBuf = ctx.createBuffer(1, doorLen, sr);
    const doorData = doorBuf.getChannelData(0);
    for (let i = 0; i < doorLen; i++) {
      const t = i / sr;
      const latch = Math.exp(-t / 0.012) * Math.sin(t * Math.PI * 2 * 920) * 0.45;
      const thud = t > 0.09 ? Math.exp(-(t - 0.09) / 0.04) * Math.sin(t * Math.PI * 2 * 95) * 0.7 : 0;
      const air = (Math.random() * 2 - 1) * 0.2 * Math.exp(-t / 0.08);
      doorData[i] = latch + thud + air;
    }
    this.buffers.set('door_latch', doorBuf);
  }

  public updateSettings(next: GameSettings): void {
    this.settings = { ...next };
    this.applyMixerLevels(false);
    if (this.unlocked) {
      this.ensureAmbientLoops();
      this.ensureMusicLoop();
    }
  }

  public setPaused(paused: boolean): void {
    this.isPaused = paused;
    if (paused) {
      this.stopFuelPumpLoop();
      this.stopCarWashLoop();
    }
    this.applyMixerLevels(false);
  }

  public setTabHidden(hidden: boolean): void {
    this.isTabHidden = hidden;
    if (hidden) {
      this.stopFuelPumpLoop();
      this.stopCarWashLoop();
    }
    if (this.ctx) {
      if (hidden && this.ctx.state === 'running') {
        this.ctx.suspend().catch(() => {});
      } else if (!hidden && this.ctx.state === 'suspended' && this.unlocked) {
        this.ctx.resume().catch(() => {});
      }
    }
    this.applyMixerLevels(false);
  }

  private applyMixerLevels(immediate: boolean): void {
    const ctx = this.ctx;
    if (!ctx || !this.masterGain || !this.sfxGain || !this.musicGain || !this.ambientGain) {
      return;
    }
    const now = ctx.currentTime;
    const tc = immediate ? 0.005 : 0.08;

    const muted = this.settings.muteAll || this.isTabHidden;
    const masterVal = muted ? 0 : this.settings.masterVolume;
    const sfxVal = this.settings.soundEnabled ? this.settings.sfxVolume : 0;
    const musicVal =
      this.settings.musicEnabled && !this.isPaused ? this.settings.musicVolume * 0.42 : 0;
    const ambientVal =
      this.settings.ambientEnabled && !this.isPaused ? this.settings.ambientVolume : 0;

    this.masterGain.gain.setTargetAtTime(masterVal, now, tc);
    this.sfxGain.gain.setTargetAtTime(sfxVal, now, tc);
    this.musicGain.gain.setTargetAtTime(musicVal, now, tc);
    this.ambientGain.gain.setTargetAtTime(ambientVal, now, tc);
  }

  private canPlay(tag: string, minIntervalMs = 80): boolean {
    if (!this.settings.soundEnabled || this.settings.muteAll || this.isTabHidden) return false;
    const nowMs = performance.now();
    const prev = this.cooldowns.get(tag) ?? 0;
    if (nowMs - prev < minIntervalMs) return false;
    if (this.activeVoiceCount >= this.maxVoices) return false;
    this.cooldowns.set(tag, nowMs);
    return true;
  }

  public stopAllActiveLoops(): void {
    this.stopFuelPumpLoop();
    this.stopCarWashLoop();
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    this.drivingEngineNode?.gain.gain.setTargetAtTime(0, now, 0.05);
    this.idleEngineNode?.gain.gain.setTargetAtTime(0, now, 0.05);
  }

  private getSfxTarget(): { ctx: AudioContext; out: GainNode } | null {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return null;
    if (ctx.state === 'suspended') {
      ctx.resume().then(() => this.onUnlocked()).catch(() => {});
    } else if (!this.unlocked) {
      this.onUnlocked();
    }
    return { ctx, out: this.sfxGain };
  }

  private trackVoice(node: AudioScheduledSourceNode): void {
    this.activeVoiceCount += 1;
    node.onended = () => {
      this.activeVoiceCount = Math.max(0, this.activeVoiceCount - 1);
      try {
        node.disconnect();
      } catch {
        // Ignore already disconnected
      }
    };
  }

  private playBuffer(
    key: string,
    volume: number,
    playbackRate = 1.0,
    delay = 0
  ): void {
    const target = this.getSfxTarget();
    if (!target) return;
    const buf = this.buffers.get(key);
    if (!buf) return;

    const { ctx, out } = target;
    const t0 = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.setValueAtTime(playbackRate, t0);

    const g = ctx.createGain();
    g.gain.setValueAtTime(volume, t0);

    src.connect(g);
    g.connect(out);
    this.trackVoice(src);
    src.start(t0);
  }

  private playTone(
    freqStart: number,
    freqEnd: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    delay = 0
  ): void {
    const target = this.getSfxTarget();
    if (!target) return;
    const { ctx, out } = target;
    const t0 = ctx.currentTime + delay;

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, t0);
    if (freqEnd !== freqStart) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t0 + duration);
    }
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(volume, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

    osc.connect(g);
    g.connect(out);
    this.trackVoice(osc);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  // =========================================================================
  // 1. PAYMENT SOUND EFFECTS
  // =========================================================================

  /** Distinct customer payment received chime (fuel/car wash transactions) */
  public playPaymentReceived(): void {
    if (!this.canPlay('payment_received', 140)) return;
    this.playTone(784, 784, 0.11, 'triangle', 0.16, 0);
    this.playTone(1046.5, 1046.5, 0.18, 'triangle', 0.18, 0.065);
    this.playTone(1567.98, 1567.98, 0.24, 'sine', 0.11, 0.13);
  }

  /** Classic Shop mechanical cash drawer + register bell */
  public playCashRegister(): void {
    if (!this.canPlay('cash_register', 150)) return;
    this.playBuffer('cash_drawer', 0.24, 1.0, 0);
    this.playTone(1760, 1760, 0.28, 'sine', 0.16, 0.05);
    this.playTone(2637, 2637, 0.22, 'sine', 0.08, 0.055);
  }

  /** Sparkling coin reward confirmation */
  public playCoin(): void {
    if (!this.canPlay('coin_reward', 110)) return;
    [987.77, 1318.51, 1567.98].forEach((freq, idx) => {
      this.playTone(freq, freq, 0.15, 'triangle', 0.13, idx * 0.055);
    });
  }

  /** Money tally confirmation (rooms check-in & steady revenue) */
  public playMoneyConfirm(): void {
    if (!this.canPlay('money_confirm', 140)) return;
    this.playTone(587.33, 587.33, 0.12, 'triangle', 0.15, 0);
    this.playTone(880, 880, 0.22, 'sine', 0.16, 0.075);
  }

  /** Mechanical wrench clack + harmonic chord on station/staff upgrades */
  public playUpgradePurchase(): void {
    if (!this.canPlay('upgrade_purchase', 180)) return;
    this.playBuffer('nozzle_click', 0.22, 0.9, 0);
    this.playBuffer('nozzle_click', 0.18, 1.25, 0.07);
    [440, 554.37, 659.25, 880].forEach((f, idx) => {
      this.playTone(f, f, 0.26, 'triangle', 0.13, 0.09 + idx * 0.045);
    });
  }

  /** Celebratory chord on unlocking a new pump/facility/expansion */
  public playUnlockPurchase(): void {
    if (!this.canPlay('unlock_purchase', 260)) return;
    [392, 493.88, 587.33, 783.99, 987.77].forEach((f, idx) => {
      this.playTone(f, f, 0.34, 'triangle', 0.14, idx * 0.06);
    });
    this.playTone(1567.98, 1567.98, 0.42, 'sine', 0.1, 0.28);
  }

  // =========================================================================
  // 2. LEVEL UP & 3. TASK / MISSION / ACHIEVEMENT SOUNDS
  // =========================================================================

  /** Premium celebratory Level-Up fanfare (deduped strictly per level-up) */
  public playLevelUp(): void {
    if (!this.canPlay('level_up', 650)) return;
    const melody = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    melody.forEach((f, idx) => {
      this.playTone(f, f, 0.32, 'triangle', 0.17, idx * 0.085);
    });
    // Warm supporting bass root
    this.playTone(261.63, 261.63, 0.55, 'sine', 0.16, 0.085);
    this.playTone(1567.98, 2093, 0.45, 'sine', 0.09, 0.38);
  }

  /** Pleasant 2-note chime when a task target is completed */
  public playTaskCompleted(): void {
    if (!this.canPlay('task_complete', 320)) return;
    this.playTone(783.99, 783.99, 0.14, 'sine', 0.14, 0);
    this.playTone(1174.66, 1174.66, 0.25, 'triangle', 0.15, 0.09);
  }

  /** Daily mission / milestone sweep */
  public playDailyMissionCompleted(): void {
    if (!this.canPlay('daily_mission', 450)) return;
    [659.25, 880, 1046.5].forEach((f, idx) => {
      this.playTone(f, f, 0.22, 'triangle', 0.15, idx * 0.08);
    });
  }

  /** Achievement unlocked sparkle */
  public playAchievementUnlocked(): void {
    if (!this.canPlay('achievement', 450)) return;
    [880, 1108.73, 1318.51, 1760].forEach((f, idx) => {
      this.playTone(f, f, 0.24, 'sine', 0.13, idx * 0.065);
    });
  }

  /** Reward claimed coins + gem shimmer */
  public playRewardCollected(): void {
    if (!this.canPlay('reward_claim', 180)) return;
    this.playCoin();
    this.playTone(1975.53, 2349.32, 0.22, 'sine', 0.1, 0.14);
  }

  /** Subtle notification ping for newly available task/unlock */
  public playNewMissionAvailable(): void {
    if (!this.canPlay('new_mission', 500)) return;
    this.playTone(698.46, 880, 0.16, 'sine', 0.11, 0);
  }

  // =========================================================================
  // 5. INDIVIDUAL VEHICLE SOUNDS
  // =========================================================================

  public playCarArrival(): void {
    if (!this.canPlay('car_arrival', 700)) return;
    this.playTone(92, 62, 0.34, 'triangle', 0.1, 0);
    this.playTone(440, 587.33, 0.14, 'sine', 0.05, 0.06);
  }

  public playEngineStart(): void {
    if (!this.canPlay('engine_start', 450)) return;
    // Brief starter crank pulses + smooth settle
    this.playTone(46, 78, 0.12, 'sawtooth', 0.06, 0);
    this.playTone(52, 86, 0.14, 'sawtooth', 0.065, 0.12);
    this.playTone(88, 62, 0.24, 'triangle', 0.09, 0.24);
  }

  public playVehicleBrake(): void {
    if (!this.canPlay('vehicle_brake', 500)) return;
    this.playBuffer('footstep', 0.06, 0.65, 0);
    this.playTone(115, 70, 0.16, 'sine', 0.055, 0);
  }

  public playVehicleAccelerate(): void {
    if (!this.canPlay('vehicle_accel', 500)) return;
    this.playTone(64, 138, 0.42, 'triangle', 0.085, 0);
  }

  public playCarHorn(): void {
    if (!this.canPlay('car_horn', 9000)) return;
    // Polite dual-tone automotive horn
    this.playTone(392, 392, 0.14, 'sawtooth', 0.038, 0);
    this.playTone(493.88, 493.88, 0.14, 'sawtooth', 0.032, 0);
    this.playTone(392, 392, 0.16, 'sawtooth', 0.038, 0.19);
    this.playTone(493.88, 493.88, 0.16, 'sawtooth', 0.032, 0.19);
  }

  // =========================================================================
  // 7. MAIN GAMEPLAY SOUND EFFECTS (Pumps, Shop, Car Wash, Rooms, Player, UI)
  // =========================================================================

  public playNozzleAttach(): void {
    if (!this.canPlay('nozzle_attach', 160)) return;
    this.playBuffer('nozzle_click', 0.26, 1.05, 0);
    this.playTone(220, 340, 0.09, 'triangle', 0.09, 0.03);
  }

  public playNozzleDetach(): void {
    if (!this.canPlay('nozzle_detach', 160)) return;
    this.playBuffer('nozzle_click', 0.22, 0.85, 0);
    this.playTone(320, 190, 0.09, 'triangle', 0.08, 0.02);
  }

  public startFuelPumpLoop(): void {
    const target = this.getSfxTarget();
    if (!target || this.fuelPumpLoop || !this.settings.soundEnabled || this.settings.muteAll) {
      return;
    }
    const { ctx, out } = target;
    const pink = this.buffers.get('pink_loop');
    if (!pink) return;

    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.095, now + 0.15);
    gain.connect(out);

    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(98, now);
    const oscFilter = ctx.createBiquadFilter();
    oscFilter.type = 'lowpass';
    oscFilter.frequency.setValueAtTime(260, now);
    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.45, now);
    osc.connect(oscFilter);
    oscFilter.connect(oscGain);
    oscGain.connect(gain);

    const noise = ctx.createBufferSource();
    noise.buffer = pink;
    noise.loop = true;
    const nFilter = ctx.createBiquadFilter();
    nFilter.type = 'bandpass';
    nFilter.frequency.setValueAtTime(920, now);
    nFilter.Q.setValueAtTime(1.4, now);
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.65, now);
    noise.connect(nFilter);
    nFilter.connect(nGain);
    nGain.connect(gain);

    osc.start(now);
    noise.start(now);
    this.fuelPumpLoop = { osc, noise, gain };
  }

  public stopFuelPumpLoop(): void {
    if (!this.fuelPumpLoop || !this.ctx) return;
    const { osc, noise, gain } = this.fuelPumpLoop;
    this.fuelPumpLoop = null;
    const t = this.ctx.currentTime;
    try {
      gain.gain.setTargetAtTime(0.0001, t, 0.04);
      osc.stop(t + 0.18);
      noise.stop(t + 0.18);
    } catch {
      // Ignore already stopped
    }
  }

  public playFuel(): void {
    if (!this.canPlay('fuel_legacy', 180)) return;
    this.playTone(170, 260, 0.18, 'triangle', 0.1, 0);
  }

  public playTankRefill(): void {
    if (!this.canPlay('tank_refill', 250)) return;
    this.playTone(110, 185, 0.25, 'triangle', 0.12, 0);
    this.playTone(220, 320, 0.22, 'sine', 0.08, 0.12);
  }

  /** Shop checkout scanner beep + product handling */
  public playCheckout(): void {
    if (!this.canPlay('shop_scan', 120)) return;
    this.playTone(1860, 1860, 0.075, 'square', 0.06, 0);
    this.playBuffer('footstep', 0.09, 1.35, 0.05);
  }

  public playWash(): void {
    if (!this.canPlay('wash_single', 180)) return;
    this.playTone(580, 980, 0.22, 'sine', 0.11, 0);
  }

  public playWashRefill(): void {
    if (!this.canPlay('wash_refill', 250)) return;
    this.playTone(340, 620, 0.24, 'sine', 0.12, 0);
    this.playTone(480, 820, 0.18, 'sine', 0.09, 0.14);
  }

  public startCarWashLoop(): void {
    const target = this.getSfxTarget();
    if (!target || this.carWashLoop || !this.settings.soundEnabled || this.settings.muteAll) {
      return;
    }
    const { ctx, out } = target;
    const pink = this.buffers.get('pink_loop');
    if (!pink) return;

    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.11, now + 0.18);
    gain.connect(out);

    // Spinning brush motor hum
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(128, now);
    const oscFilter = ctx.createBiquadFilter();
    oscFilter.type = 'lowpass';
    oscFilter.frequency.setValueAtTime(340, now);
    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.32, now);
    osc.connect(oscFilter);
    oscFilter.connect(oscGain);
    oscGain.connect(gain);

    // Pressurized water spray & foam swish
    const noise = ctx.createBufferSource();
    noise.buffer = pink;
    noise.loop = true;
    const nFilter = ctx.createBiquadFilter();
    nFilter.type = 'bandpass';
    nFilter.frequency.setValueAtTime(2200, now);
    nFilter.Q.setValueAtTime(0.8, now);
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.85, now);
    noise.connect(nFilter);
    nFilter.connect(nGain);
    nGain.connect(gain);

    osc.start(now);
    noise.start(now);
    this.carWashLoop = { osc, noise, gain };
  }

  public stopCarWashLoop(): void {
    if (!this.carWashLoop || !this.ctx) return;
    const { osc, noise, gain } = this.carWashLoop;
    this.carWashLoop = null;
    const t = this.ctx.currentTime;
    try {
      gain.gain.setTargetAtTime(0.0001, t, 0.05);
      osc.stop(t + 0.22);
      noise.stop(t + 0.22);
    } catch {
      // Ignore
    }
  }

  public playWaterDrain(): void {
    if (!this.canPlay('water_drain', 220)) return;
    this.playTone(460, 140, 0.34, 'sine', 0.11, 0);
  }

  public playDoorOpenClose(): void {
    if (!this.canPlay('door_open_close', 240)) return;
    this.playBuffer('door_latch', 0.25, 1.0, 0);
  }

  public playRoomCleaned(): void {
    if (!this.canPlay('room_clean', 220)) return;
    this.playTone(659.25, 987.77, 0.22, 'sine', 0.12, 0);
    this.playTone(1318.51, 1318.51, 0.18, 'triangle', 0.09, 0.11);
  }

  public playFootstep(running = false): void {
    const minMs = running ? 210 : 320;
    if (!this.canPlay('footstep', minMs)) return;
    const pitch = (running ? 1.1 : 0.96) + (Math.random() * 0.14 - 0.07);
    this.playBuffer('footstep', running ? 0.12 : 0.085, pitch, 0);
  }

  public playTap(): void {
    if (!this.canPlay('ui_tap', 55)) return;
    this.playTone(540, 790, 0.055, 'sine', 0.11, 0);
  }

  public playLocked(): void {
    if (!this.canPlay('ui_locked', 240)) return;
    this.playTone(210, 165, 0.12, 'triangle', 0.12, 0);
  }

  // =========================================================================
  // 4 & 6. DYNAMIC STATION AMBIENCE, VEHICLE ENGINES & DAY/NIGHT NATURE
  // =========================================================================

  private ensureAmbientLoops(): void {
    const ctx = this.ctx;
    const amb = this.ambientGain;
    if (!ctx || !amb || ctx.state !== 'running') return;
    const pink = this.buffers.get('pink_loop');
    if (!pink) return;

    const now = ctx.currentTime;

    if (!this.windNode) {
      const src = ctx.createBufferSource();
      src.buffer = pink;
      src.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(520, now);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.06, now);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(amb);
      src.start(now);
      this.windNode = { src, gain, filter };
    }

    if (!this.crowdNode) {
      const src = ctx.createBufferSource();
      src.buffer = pink;
      src.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(620, now);
      filter.Q.setValueAtTime(1.1, now);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0, now);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(amb);
      src.start(now);
      this.crowdNode = { src, gain, filter };
    }

    if (!this.drivingEngineNode) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(68, now);
      const noise = ctx.createBufferSource();
      noise.buffer = pink;
      noise.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(195, now);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      osc.connect(filter);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(amb);
      osc.start(now);
      noise.start(now);
      this.drivingEngineNode = { osc, noise, gain, filter };
    }

    if (!this.idleEngineNode) {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(44, now);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(125, now);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(amb);
      osc.start(now);
      this.idleEngineNode = { osc, gain, filter };
    }

    if (this.ambientTickTimer === null && typeof window !== 'undefined') {
      this.ambientTickTimer = window.setInterval(() => {
        this.tickNatureAndCrowd();
      }, 950);
    }
  }

  public updateEnvironment(snapshot: EnvironmentAudioSnapshot): void {
    this.currentDayPhase = snapshot.dayPhase;
    this.currentActivity = snapshot.activityLevel;

    const ctx = this.ctx;
    if (!ctx || !this.unlocked || ctx.state !== 'running') return;
    const now = ctx.currentTime;

    const activeEnv =
      this.settings.ambientEnabled &&
      !this.settings.muteAll &&
      !this.isPaused &&
      !this.isTabHidden &&
      !snapshot.isPaused;

    // 1. Outdoor wind & breeze varies subtly by time of day
    if (this.windNode) {
      const windLevel = !activeEnv
        ? 0
        : snapshot.dayPhase === 'Night'
          ? 0.045
          : snapshot.dayPhase === 'Evening'
            ? 0.06
            : 0.075;
      const cutoff = snapshot.dayPhase === 'Night' ? 380 : 540;
      this.windNode.gain.gain.setTargetAtTime(windLevel, now, 0.35);
      this.windNode.filter.frequency.setTargetAtTime(cutoff, now, 0.35);
    }

    // 2. Rush hour soft crowd bed scales smoothly with busy activityLevel
    if (this.crowdNode) {
      const phaseScale = snapshot.dayPhase === 'Night' ? 0.45 : 1.0;
      const crowdTarget = activeEnv
        ? Math.max(0, (snapshot.activityLevel - 0.12) * 0.12 * phaseScale)
        : 0;
      this.crowdNode.gain.gain.setTargetAtTime(crowdTarget, now, 0.45);
    }

    // 3. Synchronized moving vs. parked-idling vehicle engines
    if (this.drivingEngineNode) {
      const driveLevel =
        activeEnv && snapshot.drivingCars > 0
          ? Math.min(0.065, 0.024 + snapshot.drivingCars * 0.015)
          : 0;
      this.drivingEngineNode.gain.gain.setTargetAtTime(driveLevel, now, 0.18);
    }

    if (this.idleEngineNode) {
      const idleLevel =
        activeEnv && snapshot.idlingCars > 0
          ? Math.min(0.055, 0.02 + snapshot.idlingCars * 0.012)
          : 0;
      this.idleEngineNode.gain.gain.setTargetAtTime(idleLevel, now, 0.22);
    }

    // 4. Sync continuous car wash machinery if active
    if (snapshot.washRunning && activeEnv && this.settings.soundEnabled) {
      this.startCarWashLoop();
    } else if (!snapshot.washRunning && this.carWashLoop) {
      this.stopCarWashLoop();
    }
  }

  private tickNatureAndCrowd(): void {
    const ctx = this.ctx;
    const amb = this.ambientGain;
    if (
      !ctx ||
      !amb ||
      ctx.state !== 'running' ||
      !this.settings.ambientEnabled ||
      this.settings.muteAll ||
      this.isPaused ||
      this.isTabHidden
    ) {
      return;
    }

    const phase = this.currentDayPhase;
    const now = ctx.currentTime;

    // Morning & Afternoon Birds Chirping
    if ((phase === 'Morning' || phase === 'Afternoon') && Math.random() < (phase === 'Morning' ? 0.42 : 0.22)) {
      const chirps = phase === 'Morning' ? 2 + Math.floor(Math.random() * 2) : 2;
      const baseFreq = 2100 + Math.random() * 900;
      for (let i = 0; i < chirps; i++) {
        const t = now + i * 0.13;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq, t);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.28, t + 0.045);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.92, t + 0.09);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.032, t + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
        osc.connect(g);
        g.connect(amb);
        osc.start(t);
        osc.stop(t + 0.11);
      }
    }

    // Evening & Night Crickets
    if ((phase === 'Night' || phase === 'Evening') && Math.random() < (phase === 'Night' ? 0.55 : 0.24)) {
      const pulses = 3 + Math.floor(Math.random() * 2);
      for (let i = 0; i < pulses; i++) {
        const t = now + i * 0.065;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(4180 + (i % 2) * 140, t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(phase === 'Night' ? 0.022 : 0.012, t + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.042);
        osc.connect(g);
        g.connect(amb);
        osc.start(t);
        osc.stop(t + 0.05);
      }
    }

    // Subtle customer voice cadence bursts during busy hours
    if (this.currentActivity > 0.28 && Math.random() < this.currentActivity * 0.45) {
      const syllables = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < syllables; i++) {
        const t = now + i * 0.14;
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const g = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(145 + Math.random() * 95, t);
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(550 + Math.random() * 380, t);
        filter.Q.setValueAtTime(2.5, t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.016 * this.currentActivity, t + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
        osc.connect(filter);
        filter.connect(g);
        g.connect(amb);
        osc.start(t);
        osc.stop(t + 0.12);
      }
    }
  }

  // =========================================================================
  // 8. RELAXING BACKGROUND MUSIC (Day & Night Simulator Variations)
  // =========================================================================

  private ensureMusicLoop(): void {
    if (this.musicTimer !== null || typeof window === 'undefined') return;
    this.musicTimer = window.setInterval(() => {
      this.tickMusic();
    }, 760);
  }

  private tickMusic(): void {
    const ctx = this.ctx;
    const out = this.musicGain;
    if (
      !ctx ||
      !out ||
      ctx.state !== 'running' ||
      !this.settings.musicEnabled ||
      this.settings.muteAll ||
      this.isPaused ||
      this.isTabHidden
    ) {
      return;
    }

    const isNight = this.currentDayPhase === 'Night' || this.currentDayPhase === 'Evening';
    const dayProgression: Array<{ root: number; notes: number[] }> = [
      { root: 130.81, notes: [261.63, 329.63, 392.0, 493.88, 392.0, 329.63] }, // Cmaj7
      { root: 110.0, notes: [220.0, 261.63, 329.63, 392.0, 329.63, 261.63] },  // Am7
      { root: 174.61, notes: [349.23, 440.0, 523.25, 659.25, 523.25, 440.0] }, // Fmaj7
      { root: 196.0, notes: [392.0, 493.88, 587.33, 659.25, 587.33, 493.88] }, // G6
    ];
    const nightProgression: Array<{ root: number; notes: number[] }> = [
      { root: 146.83, notes: [293.66, 349.23, 440.0, 523.25, 440.0, 349.23] }, // Dm7
      { root: 196.0, notes: [293.66, 349.23, 440.0, 493.88, 440.0, 349.23] },  // G13
      { root: 130.81, notes: [261.63, 329.63, 392.0, 493.88, 392.0, 329.63] }, // Cmaj7
      { root: 110.0, notes: [220.0, 293.66, 329.63, 392.0, 329.63, 293.66] },  // A7sus4
    ];

    const prog = isNight ? nightProgression : dayProgression;
    const bar = Math.floor(this.musicStep / 6) % prog.length;
    const beatInBar = this.musicStep % 6;
    const chord = prog[bar];
    const now = ctx.currentTime;

    // Gentle warm bass root on beat 0
    if (beatInBar === 0) {
      const bass = ctx.createOscillator();
      const bGain = ctx.createGain();
      bass.type = 'sine';
      bass.frequency.setValueAtTime(chord.root, now);
      bGain.gain.setValueAtTime(0.0001, now);
      bGain.gain.linearRampToValueAtTime(0.09, now + 0.08);
      bGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.1);
      bass.connect(bGain);
      bGain.connect(out);
      bass.start(now);
      bass.stop(now + 2.2);
    }

    // Soft electric-piano / marimba arpeggio note
    const freq = chord.notes[beatInBar];
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const g = ctx.createGain();

    osc.type = isNight ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isNight ? 920 : 1450, now);

    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(isNight ? 0.065 : 0.075, now + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.72);

    osc.connect(filter);
    filter.connect(g);
    g.connect(out);
    osc.start(now);
    osc.stop(now + 0.75);

    this.musicStep += 1;
  }
}

export const audioManager = new CentralizedAudioManager();
