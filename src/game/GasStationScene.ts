import Phaser from 'phaser';
import { soundFx } from '../utils/soundFx';
import { registerBuildingTextures } from './assets/buildingAssets';
import {
  getPlayerOutfitAnimPrefix,
  getPlayerOutfitTextureKey,
  registerCharacterTextures,
} from './assets/characterAssets';
import { registerEnvironmentTextures } from './assets/environmentAssets';
import { MAP_HEIGHT, MAP_WIDTH, registerGroundMapTexture } from './assets/groundRenderer';
import { isoToWorld, Vec2, worldToIso } from './assets/isoMath';
import { registerVehicleTextures } from './assets/vehicleAssets';
import {
  BUSINESS_UNLOCK_LEVEL,
  calculateFuelPayment,
  calculateServiceCoins,
  calculateServiceXp,
  calculateShopBasketTotal,
  createDefaultPricing,
  createDefaultRatings,
  evaluateCustomerSatisfaction,
  generateShopBasket,
  getShopAveragePriceRatio,
  MARKET_FUEL_PRICE,
} from './progression';
import {
  ActiveServicePrompt,
  BusinessRatingsState,
  BusinessUnlockId,
  CharacterRole,
  CustomerFeedbackEvent,
  DayPhase,
  EmployeeRecord,
  EmployeeRoleId,
  EquippedCosmetics,
  HappinessState,
  JoystickVector,
  LiveFuelState,
  PricingSettings,
  ServiceZoneId,
  ShopBasketItem,
  UpgradeState,
  VehicleSkinId,
  VehicleType,
} from './types';

interface ColliderRect {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

interface PumpSlot {
  id: ServiceZoneId;
  businessId: BusinessUnlockId;
  label: string;
  carWx: number;
  carWy: number;
  interactWx: number;
  interactWy: number;
  assignedCar: CustomerCarEntity | null;
  statusDot?: Phaser.GameObjects.Arc;
}

const MIN_CAMERA_ZOOM = 0.44;
const MAX_CAMERA_ZOOM = 1.65;

type VehicleAIState =
  | 'SPAWNING'
  | 'ENTERING_STATION'
  | 'SEARCHING_FOR_PUMP'
  | 'QUEUED'
  | 'DRIVING_TO_PUMP'
  | 'PARKING'
  | 'WAITING_FOR_SERVICE'
  | 'REFUELING'
  | 'PAYMENT_COMPLETED'
  | 'DEPARTING'
  | 'EXITED';

interface CustomerCarEntity {
  id: number;
  type: VehicleType;
  sprite: Phaser.GameObjects.Image;
  customerNpc: Phaser.GameObjects.Sprite | null;
  customerRole: CharacterRole;
  waitBadge: Phaser.GameObjects.Container | null;
  waitBg: Phaser.GameObjects.Arc | null;
  waitText: Phaser.GameObjects.Text | null;
  waitBarFill: Phaser.GameObjects.Rectangle | null;
  waitEmojiText: Phaser.GameObjects.Text | null;
  wx: number;
  wy: number;
  screenAngle: number;
  yieldElapsed: number;
  waypoints: Vec2[];
  state: VehicleAIState;
  stateElapsed: number;
  patienceRemaining: number;
  queueWaitElapsed: number;
  priceTolerance: number;
  paymentTimer: number;
  hasPaid: boolean;
  targetPump: PumpSlot | null;
  queueIndex: number;
  fuelNeeded: number;
  payoutCoins: number;
  rewardXp: number;
  bobPhase: number;
}

interface TrafficCar {
  sprite: Phaser.GameObjects.Image;
  axis: 'x' | 'y';
  wx: number;
  wy: number;
  speed: number;
  dir: 1 | -1;
}

interface StrollingNpc {
  sprite: Phaser.GameObjects.Sprite;
  role: CharacterRole;
  waypoints: Vec2[];
  wpIndex: number;
  pauseTimer: number;
  speed: number;
}

interface ActiveWorkerEntity {
  id: EmployeeRoleId;
  role: CharacterRole;
  sprite: Phaser.GameObjects.Sprite;
  homeWx: number;
  homeWy: number;
  wx: number;
  wy: number;
  targetWx: number;
  targetWy: number;
  state: 'idle' | 'moving' | 'working' | 'returning';
  workTimer: number;
  restTimer: number;
  pendingDuration: number;
  targetSlotId?: ServiceZoneId;
  deliveryTimer: number;
}

interface ActiveChannel {
  prompt: ActiveServicePrompt;
  elapsed: number;
  duration: number;
  targetCar?: CustomerCarEntity;
}

export interface SceneCallbacks {
  onPromptChange: (prompt: ActiveServicePrompt | null) => void;
  onActionProgress: (progress: number | null) => void;
  onServiceExecute: (prompt: ActiveServicePrompt, byWorker?: boolean) => boolean;
  onLiveFuelChange?: (fuel: LiveFuelState | null) => void;
  onCustomerFeedback?: (feedback: CustomerFeedbackEvent) => void;
  onSceneReady?: () => void;
}

const VEHICLE_SKIN_TINTS: Record<VehicleSkinId, number> = {
  default: 0xffffff,
  gold_edition: 0xfef08a,
  cyber_cyan: 0xbae6fd,
  ruby_chrome: 0xfecdd3,
};

const CUSTOMER_VEHICLE_PROFILES: Array<{
  type: VehicleType;
  fuel: number;
  coins: number;
  xp: number;
}> = [
  { type: 'sedan_red', fuel: 18, coins: 22, xp: 8 },
  { type: 'sedan_white', fuel: 22, coins: 26, xp: 10 },
  { type: 'car_blue', fuel: 20, coins: 24, xp: 9 },
  { type: 'car_yellow', fuel: 16, coins: 20, xp: 8 },
  { type: 'suv_green', fuel: 30, coins: 36, xp: 13 },
  { type: 'van_white', fuel: 36, coins: 43, xp: 15 },
  { type: 'hatch_orange', fuel: 15, coins: 19, xp: 7 },
  { type: 'suv_black', fuel: 32, coins: 38, xp: 14 },
];

export class GasStationScene extends Phaser.Scene {
  private callbacks!: SceneCallbacks;
  private joystick: JoystickVector = { x: 0, y: 0, active: false };
  private keys!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
    UP: Phaser.Input.Keyboard.Key;
    DOWN: Phaser.Input.Keyboard.Key;
    LEFT: Phaser.Input.Keyboard.Key;
    RIGHT: Phaser.Input.Keyboard.Key;
    SPACE: Phaser.Input.Keyboard.Key;
    E: Phaser.Input.Keyboard.Key;
  };

  private unlockedBusinesses: Set<BusinessUnlockId> = new Set(['pump_1']);
  private employeesData: EmployeeRecord[] = [];
  private upgradesData: UpgradeState = {
    pumpSpeedLevel: 1,
    tankCapacityLevel: 1,
    shopStockLevel: 1,
    carWashLevel: 1,
    roomsLevel: 1,
  };
  private currentDayPhase: DayPhase = 'Morning';
  private ratingsData: BusinessRatingsState = createDefaultRatings();
  private pricingData: PricingSettings = createDefaultPricing();
  private shopStockCount = 10;

  private player!: Phaser.GameObjects.Sprite;
  private playerWx = 2.6;
  private playerWy = 6.1;

  private activeChannel: ActiveChannel | null = null;
  private progressBarBg!: Phaser.GameObjects.Graphics;
  private progressBarFill!: Phaser.GameObjects.Graphics;
  private fuelLiveText!: Phaser.GameObjects.Text;

  private activeFuelSessions: Map<
    string,
    {
      sessionId: string;
      pumpLabel: string;
      byWorker: boolean;
      targetLitres: number;
      totalPayment: number;
      pricePerLitre: number;
      pct: number;
      source: 'player' | 'worker';
    }
  > = new Map();
  private lastCompletedFuel: LiveFuelState | null = null;
  private completedFuelHoldTimer = 0;
  private lastFuelEmitAt = 0;

  private worldPromptContainer!: Phaser.GameObjects.Container;
  private worldPromptText!: Phaser.GameObjects.Text;
  private worldPromptBg!: Phaser.GameObjects.Rectangle;

  private colliders: ColliderRect[] = [];
  private pumpSlots: PumpSlot[] = [];
  private customerCars: CustomerCarEntity[] = [];
  private nextCarId = 1;
  private carSpawnTimer = 1.2;

  private trafficCars: TrafficCar[] = [];
  private customerNpcs: StrollingNpc[] = [];
  private workerEntities: Map<EmployeeRoleId, ActiveWorkerEntity> = new Map();

  private lockTexts: Map<BusinessUnlockId, Phaser.GameObjects.Text> = new Map();
  private nightOverlay!: Phaser.GameObjects.Rectangle;
  private nightLights: Phaser.GameObjects.Image[] = [];

  private washCar!: Phaser.GameObjects.Image;
  private washCarType: VehicleType = 'car_blue';
  private washCarState: 'hidden' | 'entering' | 'waiting' | 'exiting' = 'hidden';
  private washCarWx = 8.9;
  private washCarWy = 9.9;
  private washCarAngle = -0.46365;
  private washCarWaypoints: Vec2[] = [];
  private washBrushes: Phaser.GameObjects.Sprite[] = [];
  private washBoostTimer = 0;
  private washFoamTimer = 0;

  private washSupplies = 100;
  private roomNeedsClean = false;

  private shopCustomerReady = false;
  private washCustomerReady = false;
  private roomCustomerReady = false;
  private shopCooldown = 2.0;
  private washCooldown = 2.5;
  private roomCooldown = 4.0;
  private tankCooldown = 0;

  private shopReadyBadge!: Phaser.GameObjects.Container;
  private shopWaitBarFill!: Phaser.GameObjects.Rectangle;
  private shopMoodEmoji!: Phaser.GameObjects.Text;
  private shopCustomerNpc: Phaser.GameObjects.Sprite | null = null;
  private shopPatienceRemaining = 60;
  private shopCustomerTolerance = 1.0;
  private shopCustomerBasket: ShopBasketItem[] = [];

  private washReadyBadge!: Phaser.GameObjects.Container;
  private roomReadyBadge!: Phaser.GameObjects.Container;
  private roomReadyText!: Phaser.GameObjects.Text;

  private lastPromptKey = '';
  private currentPrompt: ActiveServicePrompt | null = null;

  // Camera zoom, pan, and multi-touch pinch state
  private zoomLevel = 0.95;
  private hasInitializedCamera = false;
  private activePointers: Map<number, { x: number; y: number }> = new Map();
  private isPanning = false;
  private isPinching = false;
  private lastPanPt: { x: number; y: number } | null = null;
  private panVelocity = { x: 0, y: 0 };
  private lastPinchDist = 0;
  private lastPinchMid: { x: number; y: number } | null = null;
  private isSceneReady = false;

  // Cosmetics & Visual Settings
  private cameraSensitivity = 1.0;
  private graphicsQuality: 'high' | 'balanced' = 'high';
  private equippedCosmetics: EquippedCosmetics = {
    playerOutfit: 'default',
    vehicleSkin: 'default',
    stationTheme: 'default',
    stationDecor: 'default',
  };
  private decorLights: Phaser.GameObjects.Arc[] = [];
  private parkedShowcaseVehicles: Phaser.GameObjects.Image[] = [];

  constructor() {
    super('GasStationScene');
  }

  public init(data: {
    callbacks: SceneCallbacks;
    unlockedBusinesses: BusinessUnlockId[];
    employees: EmployeeRecord[];
    upgrades: UpgradeState;
    dayPhase: DayPhase;
    washSupplies?: number;
    roomNeedsClean?: boolean;
    shopStock?: number;
    ratings?: BusinessRatingsState;
    pricing?: PricingSettings;
    equipped?: EquippedCosmetics;
    cameraSensitivity?: number;
    graphicsQuality?: 'high' | 'balanced';
  }): void {
    this.isSceneReady = false;
    this.callbacks = data.callbacks;
    this.unlockedBusinesses = new Set(data.unlockedBusinesses);
    this.employeesData = data.employees;
    this.upgradesData = data.upgrades;
    this.currentDayPhase = data.dayPhase;
    this.washSupplies = data.washSupplies ?? 100;
    this.roomNeedsClean = data.roomNeedsClean ?? false;
    if (typeof data.shopStock === 'number') this.shopStockCount = data.shopStock;
    if (data.ratings) this.ratingsData = data.ratings;
    if (data.pricing) this.pricingData = data.pricing;
    if (data.equipped) this.equippedCosmetics = data.equipped;
    if (typeof data.cameraSensitivity === 'number') this.cameraSensitivity = data.cameraSensitivity;
    if (data.graphicsQuality) this.graphicsQuality = data.graphicsQuality;
  }

  public create(): void {
    this.isSceneReady = false;
    this.decorLights = [];
    this.parkedShowcaseVehicles = [];

    registerGroundMapTexture(this);
    registerBuildingTextures(this);
    registerEnvironmentTextures(this);
    registerVehicleTextures(this);
    registerCharacterTextures(this);

    const ground = this.add.image(0, 0, 'ground_map').setOrigin(0, 0);
    ground.setDepth(-1000);

    this.buildEnvironment();
    this.buildStationBuildings();
    this.buildPumpSlots();
    this.buildCarWashShowcase();
    this.buildServiceBadges();
    this.buildLockTexts();
    this.buildAmbientTraffic();
    this.buildAmbientCustomers();
    this.buildPlayer();
    this.buildWorldPrompt();
    this.buildDayNightLayer();

    this.cameras.main.removeBounds();
    this.setupInputs();
    this.scale.on('resize', this.handleResize, this);
    this.handleResize();
    this.centerCameraOn(this.player.x, this.player.y);
    this.applyDayPhaseLighting(this.currentDayPhase);

    this.isSceneReady = true;
    this.syncEmployees(this.employeesData);
    this.applyCosmeticsToScene();

    const cleanupScene = () => {
      this.isSceneReady = false;
      this.workerEntities.clear();
      this.lockTexts.clear();
      this.nightLights = [];
      this.decorLights = [];
      this.parkedShowcaseVehicles = [];
      soundFx.stopAllActiveLoops();
    };

    // Clean up continuous audio loops and readiness flags if scene shuts down
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanupScene);
    this.events.once(Phaser.Scenes.Events.DESTROY, cleanupScene);

    // Spawn first arriving customer car immediately from the entrance road
    this.time.delayedCall(500, () => this.spawnCustomerVehicle());
    this.callbacks.onSceneReady?.();
  }

  public setCosmetics(equipped: EquippedCosmetics): void {
    this.equippedCosmetics = equipped;
    if (this.isSceneReady) {
      this.applyCosmeticsToScene();
    }
  }

  public setVisualSettings(sensitivity: number, graphicsQuality: 'high' | 'balanced'): void {
    this.cameraSensitivity = Phaser.Math.Clamp(sensitivity, 0.5, 1.8);
    this.graphicsQuality = graphicsQuality;
    if (this.isSceneReady) {
      this.applyDayPhaseLighting(this.currentDayPhase);
      this.rebuildStationDecorLights();
    }
  }

  private applyCosmeticsToScene(): void {
    if (this.player?.scene) {
      const texKey = getPlayerOutfitTextureKey(this.equippedCosmetics.playerOutfit);
      const animPrefix = getPlayerOutfitAnimPrefix(this.equippedCosmetics.playerOutfit);
      const curSuffix =
        this.player.anims.currentAnim?.key.split('_').pop() || 'idle';
      this.player.setTexture(texKey);
      this.player.play(`${animPrefix}_${curSuffix}`, true);
    }

    const tint = VEHICLE_SKIN_TINTS[this.equippedCosmetics.vehicleSkin] ?? 0xffffff;
    this.customerCars.forEach((c) => c.sprite?.setTint(tint));
    this.washCar?.setTint(tint);
    this.parkedShowcaseVehicles.forEach((v) => v?.setTint(tint));

    this.rebuildStationDecorLights();
  }

  private rebuildStationDecorLights(): void {
    this.decorLights.forEach((l) => {
      this.tweens.killTweensOf(l);
      l.destroy();
    });
    this.decorLights = [];

    const theme = this.equippedCosmetics.stationTheme;
    const decor = this.equippedCosmetics.stationDecor;
    const showLights = theme !== 'default' || decor !== 'default';
    if (!showLights || this.graphicsQuality === 'balanced' && decor === 'default' && theme === 'default') {
      return;
    }

    const spots: Array<{ wx: number; wy: number; zOff: number; color: number }> = [];

    if (theme === 'navy_gold') {
      spots.push(
        { wx: 0.7, wy: 4.1, zOff: -88, color: 0xfde047 },
        { wx: 2.4, wy: 4.1, zOff: -88, color: 0xf59e0b },
        { wx: 4.1, wy: 4.1, zOff: -88, color: 0xfde047 },
        { wx: 6.7, wy: 3.1, zOff: -80, color: 0x38bdf8 }
      );
    } else if (theme === 'emerald_eco') {
      spots.push(
        { wx: -2.8, wy: 6.2, zOff: -35, color: 0x4ade80 },
        { wx: 1.5, wy: -1.4, zOff: -35, color: 0x22c55e },
        { wx: 5.5, wy: -1.6, zOff: -35, color: 0x4ade80 },
        { wx: 13.6, wy: 5.2, zOff: -35, color: 0x86efac }
      );
    }

    if (decor === 'festive_lights') {
      spots.push(
        { wx: 1.2, wy: 6.4, zOff: -84, color: 0xfbbf24 },
        { wx: 2.8, wy: 6.4, zOff: -84, color: 0xf97316 },
        { wx: 4.4, wy: 6.4, zOff: -84, color: 0xfde047 },
        { wx: 5.8, wy: 3.4, zOff: -72, color: 0xfbbf24 },
        { wx: 7.7, wy: 3.4, zOff: -72, color: 0xf97316 }
      );
    } else if (decor === 'cyan_beacons') {
      spots.push(
        { wx: -1.8, wy: 10.0, zOff: -66, color: 0x38bdf8 },
        { wx: 1.5, wy: 4.3, zOff: -54, color: 0x0ea5e9 },
        { wx: 3.3, wy: 6.55, zOff: -54, color: 0x38bdf8 },
        { wx: 10.6, wy: 7.4, zOff: -68, color: 0x22d3ee }
      );
    }

    const baseAlpha = this.graphicsQuality === 'high' ? 0.55 : 0.35;
    spots.forEach((sp, idx) => {
      const iso = worldToIso(sp.wx, sp.wy);
      const orb = this.add
        .circle(iso.x, iso.y + sp.zOff, this.graphicsQuality === 'high' ? 11 : 8, sp.color, baseAlpha)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(iso.y + 455);
      this.decorLights.push(orb);
      this.tweens.add({
        targets: orb,
        alpha: baseAlpha * 0.35,
        scale: 1.25,
        duration: 900 + (idx % 4) * 180,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });
  }

  public syncProgress(
    unlocked: BusinessUnlockId[],
    employees: EmployeeRecord[],
    upgrades: UpgradeState,
    dayPhase: DayPhase,
    washSupplies?: number,
    roomNeedsClean?: boolean,
    shopStock?: number,
    ratings?: BusinessRatingsState,
    pricing?: PricingSettings
  ): void {
    const prevUnlocked = new Set(this.unlockedBusinesses);
    this.unlockedBusinesses = new Set(unlocked);
    this.employeesData = employees;
    this.upgradesData = upgrades;
    if (typeof washSupplies === 'number') this.washSupplies = washSupplies;
    if (typeof roomNeedsClean === 'boolean') this.roomNeedsClean = roomNeedsClean;
    if (typeof shopStock === 'number') this.shopStockCount = shopStock;
    if (ratings) this.ratingsData = ratings;
    if (pricing) this.pricingData = pricing;

    if (!this.isSceneReady || !this.add) {
      this.currentDayPhase = dayPhase;
      return;
    }

    this.lockTexts.forEach((labelObj, bizId) => {
      const isNowUnlocked = this.unlockedBusinesses.has(bizId);
      if (isNowUnlocked && !prevUnlocked.has(bizId)) {
        this.spawnFloatingText(labelObj.x, labelObj.y - 14, 'UNLOCKED!', '#FDE047');
        this.spawnUnlockBurst(labelObj.x, labelObj.y);
        soundFx.playLevelUp();
      }
      labelObj.setVisible(!isNowUnlocked);
    });

    if (this.unlockedBusinesses.has('car_wash')) {
      this.washBrushes.forEach((b) => b.setVisible(true));
    } else {
      this.washCar?.setVisible(false);
      this.washBrushes.forEach((b) => b.setVisible(false));
    }

    this.syncEmployees(employees);

    if (this.currentDayPhase !== dayPhase) {
      this.currentDayPhase = dayPhase;
      this.applyDayPhaseLighting(dayPhase);
    }
  }

  public triggerLevelUpCelebration(level: number): void {
    if (!this.isSceneReady || !this.add || !this.player?.scene) return;
    this.spawnUnlockBurst(this.player.x, this.player.y - 26);
    this.spawnFloatingText(this.player.x, this.player.y - 68, `★ LEVEL ${level}! ★`, '#FACC15');
  }

  private spawnUnlockBurst(x: number, y: number): void {
    const colors = [0xfacc15, 0x4ade80, 0x38bdf8, 0xfb923c];
    for (let i = 0; i < 14; i++) {
      const angle = (Math.PI * 2 * i) / 14;
      const dist = Phaser.Math.Between(36, 74);
      const dot = this.add
        .circle(x, y, Phaser.Math.Between(4, 7), colors[i % colors.length], 1)
        .setDepth(5450);
      this.tweens.add({
        targets: dot,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist - 18,
        alpha: 0,
        scale: 0.25,
        duration: 680,
        ease: 'Cubic.easeOut',
        onComplete: () => dot.destroy(),
      });
    }
  }

  private centerCameraOn(worldX: number, worldY: number): void {
    const cam = this.cameras?.main;
    if (!cam) return;
    cam.scrollX = worldX - cam.width * 0.5;
    cam.scrollY = worldY - cam.height * 0.5;
    this.clampCameraScroll();
  }

  private getMinFillZoom(): number {
    const w = this.scale?.width || 1280;
    const h = this.scale?.height || 720;
    return Math.max(MIN_CAMERA_ZOOM, w / MAP_WIDTH, h / MAP_HEIGHT);
  }

  private clampCameraScroll(): void {
    const cam = this.cameras?.main;
    if (!cam) return;

    const minZoom = this.getMinFillZoom();
    if (cam.zoom < minZoom) {
      this.zoomLevel = minZoom;
      cam.setZoom(this.zoomLevel);
    }

    const visW = cam.width / cam.zoom;
    const visH = cam.height / cam.zoom;

    const minWorldX = 0;
    const maxWorldX = MAP_WIDTH;
    const minWorldY = 0;
    const maxWorldY = MAP_HEIGHT;
    const totalW = maxWorldX - minWorldX;
    const totalH = maxWorldY - minWorldY;

    if (visW >= totalW) {
      cam.scrollX = (minWorldX + maxWorldX) * 0.5 - cam.width * 0.5;
    } else {
      const minScrollX = minWorldX + visW * 0.5 - cam.width * 0.5;
      const maxScrollX = maxWorldX - visW * 0.5 - cam.width * 0.5;
      cam.scrollX = Phaser.Math.Clamp(cam.scrollX, minScrollX, maxScrollX);
    }

    if (visH >= totalH) {
      cam.scrollY = (minWorldY + maxWorldY) * 0.5 - cam.height * 0.5;
    } else {
      const minScrollY = minWorldY + visH * 0.5 - cam.height * 0.5;
      const maxScrollY = maxWorldY - visH * 0.5 - cam.height * 0.5;
      cam.scrollY = Phaser.Math.Clamp(cam.scrollY, minScrollY, maxScrollY);
    }
  }

  private handleResize(): void {
    if (!this.cameras || !this.cameras.main) return;
    const w = this.scale.width;
    const h = this.scale.height;
    const minZoom = this.getMinFillZoom();

    if (!this.hasInitializedCamera) {
      const baseZoom = w < 780 ? 0.72 : w < 1100 ? 0.84 : 0.92;
      this.zoomLevel = Phaser.Math.Clamp(baseZoom, minZoom, MAX_CAMERA_ZOOM);
      this.hasInitializedCamera = true;
    } else {
      this.zoomLevel = Phaser.Math.Clamp(this.zoomLevel, minZoom, MAX_CAMERA_ZOOM);
    }

    this.cameras.main.setSize(w, h);
    this.cameras.main.setZoom(this.zoomLevel);
    this.clampCameraScroll();

    if (this.nightOverlay) {
      this.nightOverlay.setSize(MAP_WIDTH + 600, MAP_HEIGHT + 600);
    }
  }

  public setJoystick(vec: JoystickVector): void {
    this.joystick = vec;
  }

  public adjustZoom(delta: number, anchorX?: number, anchorY?: number): void {
    if (!this.isSceneReady) return;
    const cam = this.cameras?.main;
    if (!cam) return;
    const minZoom = this.getMinFillZoom();
    const nextZoom = Phaser.Math.Clamp(this.zoomLevel + delta, minZoom, MAX_CAMERA_ZOOM);
    if (Math.abs(nextZoom - this.zoomLevel) < 0.0001) return;

    const ax = anchorX ?? cam.width * 0.5;
    const ay = anchorY ?? cam.height * 0.5;
    const worldAnchor = cam.getWorldPoint(ax, ay);

    this.zoomLevel = nextZoom;
    cam.setZoom(this.zoomLevel);

    cam.scrollX = worldAnchor.x - cam.width * 0.5 - (ax - cam.width * 0.5) / this.zoomLevel;
    cam.scrollY = worldAnchor.y - cam.height * 0.5 - (ay - cam.height * 0.5) / this.zoomLevel;
    this.clampCameraScroll();
  }

  public triggerActiveService(): void {
    if (!this.isSceneReady || !this.player?.scene) return;
    if (this.activeChannel) return;
    if (!this.currentPrompt || !this.currentPrompt.ready) {
      if (this.currentPrompt?.lockedReason) {
        soundFx.playLocked();
        this.spawnFloatingText(
          this.player.x,
          this.player.y - 62,
          this.currentPrompt.lockedReason,
          '#FCA5A5'
        );
      }
      return;
    }

    let prompt = this.currentPrompt;
    let duration = prompt.durationSec ?? 1.25;
    let targetCar: CustomerCarEntity | undefined;

    if (prompt.category === 'fuel') {
      const slot = this.pumpSlots.find((p) => p.id === prompt.zoneId);
      if (slot?.assignedCar && slot.assignedCar.state === 'WAITING_FOR_SERVICE') {
        targetCar = slot.assignedCar;
        targetCar.state = 'REFUELING';
        targetCar.stateElapsed = 0;
      }
      const fuelPrice = this.pricingData.fuelPricePerLitre;
      prompt = {
        ...prompt,
        fuelPricePerLitre: fuelPrice,
        rewardCoins: calculateFuelPayment(prompt.fuelCost, fuelPrice),
      };
      duration = Math.max(0.75, 2.2 - (this.upgradesData.pumpSpeedLevel - 1) * 0.24);
      soundFx.playNozzleAttach();
      soundFx.startFuelPumpLoop();
    } else if (prompt.category === 'wash') {
      if (prompt.washSupplyCost && prompt.washSupplyCost < 0) {
        soundFx.playTap();
      } else {
        duration = Math.max(
          1.1,
          (this.unlockedBusinesses.has('wash_pro') ? 1.5 : 2.2) -
            (this.upgradesData.carWashLevel - 1) * 0.16
        );
        soundFx.playWash();
        soundFx.startCarWashLoop();
        this.washBoostTimer = duration + 0.8;
      }
    } else if (prompt.category === 'shop') {
      const basket =
        this.shopCustomerBasket.length > 0
          ? this.shopCustomerBasket
          : generateShopBasket(
              this.upgradesData.shopStockLevel,
              this.unlockedBusinesses.has('shop_deluxe')
            );
      const saleCoins = calculateShopBasketTotal(basket, this.pricingData);
      prompt = {
        ...prompt,
        shopBasket: basket,
        rewardCoins: saleCoins,
      };
      duration = Math.max(
        0.65,
        1.25 - (this.upgradesData.shopStockLevel - 1) * 0.12 - (this.unlockedBusinesses.has('shop_deluxe') ? 0.15 : 0)
      );
      soundFx.playCheckout();
    } else if (prompt.category === 'rooms') {
      soundFx.playDoorOpenClose();
    } else if (prompt.category === 'supply') {
      soundFx.playTankRefill();
    } else {
      soundFx.playTap();
    }

    this.activeChannel = { prompt, elapsed: 0, duration, targetCar };
    if (prompt.category === 'fuel' && prompt.fuelCost > 0) {
      const pricePerLitre = prompt.fuelPricePerLitre ?? this.pricingData.fuelPricePerLitre;
      const totalPayment = calculateFuelPayment(prompt.fuelCost, pricePerLitre);
      const targetLitres = prompt.fuelCost;
      const pumpLabel = prompt.title.split('·')[0].trim() || 'Pump';
      this.activeFuelSessions.set('player', {
        sessionId: `player_${prompt.zoneId}_${Date.now()}`,
        pumpLabel,
        byWorker: false,
        targetLitres,
        totalPayment,
        pricePerLitre,
        pct: 0,
        source: 'player',
      });
      this.completedFuelHoldTimer = 0;
      this.emitLiveFuelState(true);
    }

    const workAnim = `${getPlayerOutfitAnimPrefix(this.equippedCosmetics.playerOutfit)}_work`;
    this.player.play(workAnim, true);
    this.callbacks.onActionProgress(0.01);
  }

  private completeActiveChannel(): void {
    if (!this.activeChannel) return;
    const { prompt, targetCar } = this.activeChannel;
    const activeFuelSession =
      prompt.category === 'fuel' ? this.activeFuelSessions.get('player') : undefined;
    this.activeFuelSessions.delete('player');
    this.activeChannel = null;
    soundFx.stopFuelPumpLoop();
    soundFx.stopCarWashLoop();
    this.progressBarBg.setVisible(false);
    this.progressBarFill.setVisible(false);
    this.fuelLiveText.setVisible(false);
    this.callbacks.onActionProgress(null);
    const idleAnim = `${getPlayerOutfitAnimPrefix(this.equippedCosmetics.playerOutfit)}_idle`;
    this.player.play(idleAnim, true);

    if (targetCar && targetCar.hasPaid) {
      this.emitLiveFuelState(true);
      return;
    }

    const ok = this.callbacks.onServiceExecute(prompt, false);
    if (!ok) {
      soundFx.playLocked();
      if (targetCar) {
        targetCar.state = 'WAITING_FOR_SERVICE';
        targetCar.stateElapsed = 0;
      }
      this.spawnFloatingText(
        this.player.x,
        this.player.y - 62,
        'Need More Fuel or Stock!',
        '#FCA5A5'
      );
      this.emitLiveFuelState(true);
      return;
    }

    if (prompt.category === 'fuel') {
      soundFx.playNozzleDetach();
      if (activeFuelSession) {
        this.lastCompletedFuel = {
          sessionId: activeFuelSession.sessionId,
          pumpLabel: activeFuelSession.pumpLabel,
          byWorker: false,
          pricePerLitre: activeFuelSession.pricePerLitre,
          litresFilled: activeFuelSession.targetLitres,
          targetLitres: activeFuelSession.targetLitres,
          totalAmount: activeFuelSession.totalPayment,
          status: 'completed',
        };
        this.completedFuelHoldTimer = 3.2;
      }
      this.emitLiveFuelState(true);
    }

    this.applyCompletedServiceVisuals(prompt, this.player.x, this.player.y, false);
  }

  private getHappinessEmoji(h: HappinessState): string {
    switch (h) {
      case 'Very Happy':
        return '😄';
      case 'Happy':
        return '😊';
      case 'Neutral':
        return '😐';
      case 'Impatient':
        return '😠';
      case 'Angry':
        return '😡';
    }
  }

  private applyCompletedServiceVisuals(
    prompt: ActiveServicePrompt,
    fxX: number,
    fxY: number,
    byWorker = false,
    workerLevel = 1
  ): void {
    const zone = prompt.zoneId;
    const dispCoins =
      prompt.category === 'fuel' || prompt.category === 'shop'
        ? prompt.rewardCoins
        : byWorker
          ? Math.max(1, Math.round(prompt.rewardCoins * 0.72))
          : prompt.rewardCoins;
    const dispXp = calculateServiceXp(prompt.category, prompt.rewardXp, byWorker);

    if (zone.startsWith('pump_')) {
      soundFx.playPaymentReceived();
      const slot = this.pumpSlots.find((p) => p.id === zone);
      if (slot && slot.assignedCar) {
        const car = slot.assignedCar;
        car.hasPaid = true;
        const waitSec = Math.min(
          60,
          Math.max(0, 60 - car.patienceRemaining) + Math.min(16, car.queueWaitElapsed * 0.45)
        );
        const pricePerLitre = prompt.fuelPricePerLitre ?? this.pricingData.fuelPricePerLitre;
        const speedBonus =
          (this.upgradesData.pumpSpeedLevel - 1) * 0.08 +
          (byWorker ? workerLevel * 0.06 : 0.05);
        const { score, happiness } = evaluateCustomerSatisfaction({
          served: true,
          waitSec,
          priceRatio: pricePerLitre / MARKET_FUEL_PRICE,
          customerTolerance: car.priceTolerance,
          speedBonus,
        });
        const emoji = this.getHappinessEmoji(happiness);
        this.callbacks.onCustomerFeedback?.({
          business: 'fuel',
          served: true,
          waitSec,
          happiness,
          score,
        });
        this.spawnFloatingText(
          fxX,
          fxY - 66,
          `${emoji} +$${dispCoins.toFixed(2)} · +${dispXp} XP`,
          byWorker ? '#A7F3D0' : '#4ADE80'
        );
        this.completeCarPayment(car, emoji);
      }
    } else if (zone === 'car_wash') {
      if (prompt.washSupplyCost && prompt.washSupplyCost < 0) {
        soundFx.playWashRefill();
        this.spawnFloatingText(fxX, fxY - 66, '+50 Wash Soap!', '#38BDF8');
      } else {
        soundFx.playWaterDrain();
        soundFx.playPaymentReceived();
        this.washCustomerReady = false;
        this.washReadyBadge.setVisible(false);
        this.washCooldown = this.unlockedBusinesses.has('wash_pro') ? 6.0 : 8.5;
        this.washCarState = 'exiting';
        this.washCarWaypoints = [
          { x: 10.6, y: 9.8 },
          { x: 8.35, y: 9.8 },
          { x: 8.35, y: 12.25 },
          { x: 46.0, y: 12.25 },
        ];
        this.spawnFloatingText(
          fxX,
          fxY - 66,
          `+$${dispCoins} · +${dispXp} XP`,
          '#38BDF8'
        );
      }
    } else if (zone === 'shop') {
      soundFx.playCashRegister();
      const waitSec = Math.max(0, 60 - this.shopPatienceRemaining);
      const speedBonus =
        (this.upgradesData.shopStockLevel - 1) * 0.08 +
        (this.unlockedBusinesses.has('shop_deluxe') ? 0.12 : 0) +
        (byWorker ? workerLevel * 0.06 : 0.05);
      const { score, happiness } = evaluateCustomerSatisfaction({
        served: true,
        waitSec,
        priceRatio: getShopAveragePriceRatio(this.pricingData),
        customerTolerance: this.shopCustomerTolerance,
        speedBonus,
      });
      const emoji = this.getHappinessEmoji(happiness);
      this.callbacks.onCustomerFeedback?.({
        business: 'shop',
        served: true,
        waitSec,
        happiness,
        score,
      });
      this.shopCustomerReady = false;
      this.shopReadyBadge.setVisible(false);
      this.shopCustomerNpc?.setVisible(false);
      this.shopCustomerBasket = [];
      this.shopCooldown = this.getNextShopCooldown();
      this.spawnFloatingText(
        fxX,
        fxY - 66,
        `${emoji} +$${dispCoins.toFixed(2)} · +${dispXp} XP`,
        '#FACC15'
      );
    } else if (zone === 'rooms') {
      if (prompt.isRoomClean) {
        soundFx.playRoomCleaned();
        this.roomNeedsClean = false;
        this.roomCustomerReady = false;
        this.roomReadyBadge.setVisible(false);
        this.roomCooldown = 5.5;
        this.spawnFloatingText(fxX, fxY - 66, `Room Ready (+${dispXp} XP)`, '#4ADE80');
      } else {
        soundFx.playMoneyConfirm();
        this.roomCustomerReady = false;
        this.roomNeedsClean = true;
        this.roomReadyBadge.setVisible(false);
        this.roomCooldown = 7.5;
        this.spawnFloatingText(
          fxX,
          fxY - 66,
          `+$${dispCoins} · +${dispXp} XP`,
          '#C084FC'
        );
      }
    } else if (zone === 'fuel_tank') {
      soundFx.playTankRefill();
      this.tankCooldown = 3.0;
      this.spawnFloatingText(fxX, fxY - 66, '+250L Fuel · +4 XP', '#FACC15');
    }
  }

  private placeIsoProp(
    key: string,
    wx: number,
    wy: number,
    originX = 0.5,
    originY = 0.85,
    depthOffset = 0
  ): Phaser.GameObjects.Image {
    const pos = worldToIso(wx, wy);
    const img = this.add.image(pos.x, pos.y, key).setOrigin(originX, originY);
    img.setDepth(pos.y + depthOffset);
    return img;
  }

  private addCollider(minX: number, maxX: number, minY: number, maxY: number): void {
    this.colliders.push({ minX, maxX, minY, maxY });
  }

  private buildStationBuildings(): void {
    const canopyPos = worldToIso(2.4, 5.2);
    this.add
      .image(canopyPos.x, canopyPos.y, 'canopy_pillars')
      .setOrigin(0.5, 0.64)
      .setDepth(canopyPos.y - 35);

    this.add
      .image(canopyPos.x, canopyPos.y, 'canopy_roof')
      .setOrigin(0.5, 0.72)
      .setDepth(canopyPos.y + 420);

    const shopPos = worldToIso(6.7, 2.0);
    this.add
      .image(shopPos.x, shopPos.y, 'shop_building')
      .setOrigin(0.5, 0.74)
      .setDepth(shopPos.y + 10);
    this.addCollider(4.6, 8.8, 0.2, 3.6);

    this.placeIsoProp('aframe_sign', 5.6, 4.0, 0.5, 0.85);
    this.placeIsoProp('aframe_sign', 7.3, 4.0, 0.5, 0.85);
    this.placeIsoProp('wooden_bench', 8.5, 3.6, 0.5, 0.75);
    this.placeIsoProp('flower_bed', 5.0, 4.1, 0.5, 0.8, 6);

    const roomsPos = worldToIso(11.3, 1.5);
    this.add
      .image(roomsPos.x, roomsPos.y, 'rooms_building')
      .setOrigin(0.5, 0.74)
      .setDepth(roomsPos.y + 10);
    this.addCollider(9.4, 13.4, -0.3, 2.9);
    this.placeIsoProp('flower_bed', 12.6, 3.3, 0.5, 0.8, 6);

    this.placeIsoProp('fuel_tank', -1.2, 2.2, 0.5, 0.78, 5);
    this.addCollider(-2.2, -0.2, 1.3, 3.1);

    const truck = this.placeIsoProp('veh_truck_delivery_se', -1.4, 4.4, 0.5, 0.68, 8);
    truck.setScale(1.05);
    this.addCollider(-2.4, -0.3, 3.5, 5.2);

    this.placeIsoProp('patio_umbrella', 8.4, 5.9, 0.5, 0.82, 8);
    this.addCollider(7.9, 8.9, 5.4, 6.3);
    this.placeIsoProp('air_kiosk', 7.1, 9.8, 0.5, 0.84, 5);
  }

  private buildPumpSlots(): void {
    const pumpCoords: Array<{
      id: ServiceZoneId;
      businessId: BusinessUnlockId;
      label: string;
      px: number;
      py: number;
      carX: number;
      carY: number;
      intX: number;
      intY: number;
    }> = [
      {
        id: 'pump_1',
        businessId: 'pump_1',
        label: 'Pump 1',
        px: 1.5,
        py: 4.3,
        carX: 1.45,
        carY: 5.15,
        intX: 2.1,
        intY: 4.9,
      },
      {
        id: 'pump_2',
        businessId: 'pump_2',
        label: 'Pump 2',
        px: 3.3,
        py: 4.3,
        carX: 3.45,
        carY: 5.15,
        intX: 4.1,
        intY: 4.9,
      },
      {
        id: 'pump_3',
        businessId: 'pump_3',
        label: 'Pump 3',
        px: 1.5,
        py: 6.55,
        carX: 1.45,
        carY: 7.45,
        intX: 2.1,
        intY: 7.2,
      },
      {
        id: 'pump_4',
        businessId: 'pump_4',
        label: 'Pump 4',
        px: 3.3,
        py: 6.55,
        carX: 3.45,
        carY: 7.45,
        intX: 4.1,
        intY: 7.2,
      },
    ];

    pumpCoords.forEach((cfg) => {
      this.placeIsoProp('fuel_pump', cfg.px, cfg.py, 0.5, 0.8, 12);
      this.addCollider(cfg.px - 0.35, cfg.px + 0.35, cfg.py - 0.3, cfg.py + 0.3);

      const dotPos = worldToIso(cfg.px, cfg.py - 0.15);
      const statusDot = this.add
        .circle(dotPos.x, dotPos.y - 46, 4.5, 0x22c55e, 0.95)
        .setStrokeStyle(1.5, 0x14532d)
        .setDepth(dotPos.y + 430)
        .setVisible(this.unlockedBusinesses.has(cfg.businessId));

      this.pumpSlots.push({
        id: cfg.id,
        businessId: cfg.businessId,
        label: cfg.label,
        carWx: cfg.carX,
        carWy: cfg.carY,
        interactWx: cfg.intX,
        interactWy: cfg.intY,
        assignedCar: null,
        statusDot,
      });
    });
  }

  private getNextSpawnDelay(): number {
    const unlockedPumps = this.pumpSlots.filter((s) =>
      this.unlockedBusinesses.has(s.businessId)
    ).length;
    const fuelRating = this.ratingsData?.fuel?.rating ?? 3.5;
    const ratingMult = 1.65 - (fuelRating - 1.0) * 0.25; // 1★ -> 1.65x slower, 5★ -> 0.65x faster
    const priceRatio = this.pricingData.fuelPricePerLitre / MARKET_FUEL_PRICE;
    const priceMult = Phaser.Math.Clamp(0.75 + priceRatio * 0.28, 0.85, 1.48);
    const speedBonus = (this.upgradesData.pumpSpeedLevel - 1) * 0.32 + (unlockedPumps - 1) * 0.45;
    const baseDelay = (8.8 + Math.random() * 4.2) * ratingMult * priceMult;
    return Phaser.Math.Clamp(baseDelay - speedBonus, 4.4, 24.0);
  }

  private getNextShopCooldown(): number {
    const shopRating = this.ratingsData?.shop?.rating ?? 3.5;
    const ratingMult = 1.6 - (shopRating - 1.0) * 0.23; // 1★ -> 1.6x slower, 5★ -> 0.68x faster
    const priceRatio = getShopAveragePriceRatio(this.pricingData);
    const priceMult = Phaser.Math.Clamp(0.75 + priceRatio * 0.28, 0.82, 1.45);
    const upgradeReduction =
      (this.upgradesData.shopStockLevel - 1) * 0.35 +
      (this.unlockedBusinesses.has('shop_deluxe') ? 0.8 : 0);
    return Phaser.Math.Clamp((7.2 + Math.random() * 2.5) * ratingMult * priceMult - upgradeReduction, 3.4, 19.0);
  }

  private buildApproachWaypointsForPump(pump: PumpSlot): Vec2[] {
    if (pump.id === 'pump_1') {
      return [
        { x: -0.05, y: 5.15 },
        { x: pump.carWx, y: pump.carWy },
      ];
    }
    if (pump.id === 'pump_2') {
      return [
        { x: -0.05, y: 5.85 },
        { x: 2.55, y: 5.85 },
        { x: 2.55, y: 5.15 },
        { x: pump.carWx, y: pump.carWy },
      ];
    }
    if (pump.id === 'pump_3') {
      return [
        { x: -0.05, y: 7.45 },
        { x: pump.carWx, y: pump.carWy },
      ];
    }
    return [
      { x: -0.05, y: 8.15 },
      { x: 2.55, y: 8.15 },
      { x: 2.55, y: 7.45 },
      { x: pump.carWx, y: pump.carWy },
    ];
  }

  private buildExitWaypointsFromPump(pump: PumpSlot): Vec2[] {
    if (pump.id === 'pump_1') {
      return [
        { x: 2.25, y: 5.15 },
        { x: 2.25, y: 5.85 },
        { x: 5.3, y: 5.85 },
        { x: 5.3, y: 8.15 },
        { x: 8.35, y: 8.15 },
        { x: 8.35, y: 12.25 },
        { x: 48.0, y: 12.25 },
      ];
    }
    if (pump.id === 'pump_2') {
      return [
        { x: 5.3, y: 5.15 },
        { x: 5.3, y: 8.15 },
        { x: 8.35, y: 8.15 },
        { x: 8.35, y: 12.25 },
        { x: 48.0, y: 12.25 },
      ];
    }
    if (pump.id === 'pump_3') {
      return [
        { x: 2.25, y: 7.45 },
        { x: 2.25, y: 8.15 },
        { x: 5.3, y: 8.15 },
        { x: 8.35, y: 8.15 },
        { x: 8.35, y: 12.25 },
        { x: 48.0, y: 12.25 },
      ];
    }
    return [
      { x: 5.3, y: 7.45 },
      { x: 5.3, y: 8.15 },
      { x: 8.35, y: 8.15 },
      { x: 8.35, y: 12.25 },
      { x: 48.0, y: 12.25 },
    ];
  }

  private spawnCustomerVehicle(): void {
    const unlockedPumps = this.pumpSlots.filter((s) =>
      this.unlockedBusinesses.has(s.businessId)
    );
    const maxAllowedCars = unlockedPumps.length + 2;
    const activeNonDeparting = this.customerCars.filter(
      (c) => c.state !== 'DEPARTING' && c.state !== 'EXITED'
    );
    if (activeNonDeparting.length >= maxAllowedCars) return;

    const freePump = unlockedPumps.find((s) => !s.assignedCar);
    const queuedOrIncoming = this.customerCars.filter(
      (c) =>
        c.state === 'SPAWNING' ||
        c.state === 'ENTERING_STATION' ||
        c.state === 'SEARCHING_FOR_PUMP' ||
        c.state === 'QUEUED'
    ).length;

    if (!freePump && queuedOrIncoming >= 2) return;

    const profile =
      CUSTOMER_VEHICLE_PROFILES[Math.floor(Math.random() * CUSTOMER_VEHICLE_PROFILES.length)];
    const custRoles: CharacterRole[] = ['customer_male', 'customer_female', 'customer_suit'];
    const role = custRoles[Math.floor(Math.random() * custRoles.length)];

    const startWx = -23.0;
    const startWy = 12.25;
    const pos = worldToIso(startWx, startWy);
    const sprite = this.add
      .image(pos.x, pos.y, `veh_${profile.type}_se`)
      .setOrigin(0.5, 0.65)
      .setTint(VEHICLE_SKIN_TINTS[this.equippedCosmetics.vehicleSkin] ?? 0xffffff)
      .setDepth(pos.y + 8);

    const car: CustomerCarEntity = {
      id: this.nextCarId++,
      type: profile.type,
      sprite,
      customerNpc: null,
      customerRole: role,
      waitBadge: null,
      waitBg: null,
      waitText: null,
      waitBarFill: null,
      waitEmojiText: null,
      wx: startWx,
      wy: startWy,
      screenAngle: 0.46365,
      yieldElapsed: 0,
      waypoints: [
        { x: -0.05, y: 12.25 },
        { x: -0.05, y: 10.2 },
      ],
      state: 'SPAWNING',
      stateElapsed: 0,
      patienceRemaining: 60,
      queueWaitElapsed: 0,
      priceTolerance: 0.85 + Math.random() * 0.3,
      paymentTimer: 0,
      hasPaid: false,
      targetPump: null,
      queueIndex: -1,
      fuelNeeded: profile.fuel,
      payoutCoins: calculateFuelPayment(profile.fuel, this.pricingData.fuelPricePerLitre),
      rewardXp: profile.xp,
      bobPhase: Math.random() * Math.PI * 2,
    };

    this.customerCars.push(car);
    soundFx.playCarArrival();
  }

  private assignCarToPumpOrQueue(car: CustomerCarEntity): void {
    const unlockedPumps = this.pumpSlots.filter((s) =>
      this.unlockedBusinesses.has(s.businessId)
    );
    const freePump = unlockedPumps.find((s) => !s.assignedCar);

    if (freePump) {
      freePump.assignedCar = car;
      car.targetPump = freePump;
      car.queueIndex = -1;
      car.state = 'DRIVING_TO_PUMP';
      car.stateElapsed = 0;
      car.waypoints = this.buildApproachWaypointsForPump(freePump);
      return;
    }

    // All pumps occupied -> move into first available queue slot
    const occupiedQueues = new Set(
      this.customerCars
        .filter((c) => c.id !== car.id && c.queueIndex >= 0)
        .map((c) => c.queueIndex)
    );
    const slotIdx = occupiedQueues.has(0) ? 1 : 0;
    car.queueIndex = slotIdx;
    car.state = 'QUEUED';
    car.stateElapsed = 0;
    const qy = slotIdx === 0 ? 8.7 : 9.8;
    car.waypoints = [{ x: -0.05, y: qy }];
  }

  private assignQueuedCarToPump(pump: PumpSlot): void {
    if (pump.assignedCar) return;
    const queued = this.customerCars.find((c) => c.state === 'QUEUED');
    if (!queued) return;

    pump.assignedCar = queued;
    queued.targetPump = pump;
    queued.queueIndex = -1;
    queued.state = 'DRIVING_TO_PUMP';
    queued.stateElapsed = 0;
    queued.waypoints = this.buildApproachWaypointsForPump(pump);
    soundFx.playVehicleAccelerate();
  }

  private arriveAtPump(car: CustomerCarEntity): void {
    car.state = 'WAITING_FOR_SERVICE';
    car.stateElapsed = 0;
    car.patienceRemaining = 60;
    car.screenAngle = 0.46365;
    car.sprite.setTexture(`veh_${car.type}_se`).setFlipX(false).setRotation(0);
    soundFx.playVehicleBrake();

    const carPos = worldToIso(car.wx, car.wy);

    const custPos = worldToIso(car.wx + 0.45, car.wy - 0.35);
    const cust = this.add
      .sprite(custPos.x, custPos.y, `char_${car.customerRole}`, 0)
      .setOrigin(0.5, 0.88)
      .setDepth(custPos.y + 8)
      .play(`${car.customerRole}_wait`);
    car.customerNpc = cust;

    const badge = this.add.container(carPos.x, carPos.y - 54);
    const bg = this.add
      .circle(-6, -4, 12, 0xfffdf7, 0.94)
      .setStrokeStyle(1.8, 0xe02424);
    const txt = this.add
      .text(-6, -4, `${car.fuelNeeded}L`, {
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '8.5px',
        fontStyle: 'bold',
        color: '#2E221D',
      })
      .setOrigin(0.5, 0.5);
    const emojiTxt = this.add
      .text(13, -4, '😊', { fontSize: '11px' })
      .setOrigin(0.5, 0.5);
    const barBg = this.add
      .rectangle(-18, 12, 36, 4.5, 0x2e221d, 0.85)
      .setOrigin(0, 0.5)
      .setStrokeStyle(0.8, 0xfffdf7, 0.7);
    const barFill = this.add
      .rectangle(-17, 12, 34, 3, 0x22c55e, 1)
      .setOrigin(0, 0.5);

    badge.add([bg, txt, emojiTxt, barBg, barFill]).setDepth(carPos.y + 500);

    this.tweens.add({
      targets: badge,
      y: carPos.y - 58,
      duration: 850,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    car.waitBadge = badge;
    car.waitBg = bg;
    car.waitText = txt;
    car.waitBarFill = barFill;
    car.waitEmojiText = emojiTxt;
  }

  private handleFuelCustomerAbandoned(car: CustomerCarEntity): void {
    const pos = worldToIso(car.wx, car.wy);
    this.spawnFloatingText(pos.x, pos.y - 70, '😡 Timed Out! Left', '#EF4444');
    soundFx.playLocked();
    this.callbacks.onCustomerFeedback?.({
      business: 'fuel',
      served: false,
      waitSec: 60,
      happiness: 'Angry',
      score: 1.0,
    });
    this.departCarFromPump(car.targetPump, car);
  }

  private completeCarPayment(car: CustomerCarEntity, moodEmoji = '😊'): void {
    car.state = 'PAYMENT_COMPLETED';
    car.stateElapsed = 0;
    car.paymentTimer = 0.65;
    soundFx.playEngineStart();

    car.customerNpc?.destroy();
    car.customerNpc = null;

    if (car.waitBg && car.waitText) {
      car.waitBg.setFillStyle(0xdcfce7, 0.96).setStrokeStyle(2, 0x16a34a);
      car.waitText.setText('PAID').setColor('#15803D');
    }
    car.waitEmojiText?.setText(moodEmoji);
    if (car.waitBarFill) {
      car.waitBarFill.width = 34;
      car.waitBarFill.setFillStyle(0x22c55e, 1);
    }
  }

  private departCarFromPump(pump: PumpSlot | null, car: CustomerCarEntity): void {
    if (pump && pump.assignedCar?.id === car.id) {
      pump.assignedCar = null;
    }
    const sourcePump = pump ?? car.targetPump;
    car.targetPump = null;
    car.state = 'DEPARTING';
    car.stateElapsed = 0;
    soundFx.playVehicleAccelerate();

    if (car.waitBadge) {
      this.tweens.killTweensOf(car.waitBadge);
      car.waitBadge.destroy();
    }
    car.waitBadge = null;
    car.waitBg = null;
    car.waitText = null;
    car.waitBarFill = null;
    car.waitEmojiText = null;
    car.customerNpc?.destroy();
    car.customerNpc = null;

    car.waypoints = sourcePump
      ? this.buildExitWaypointsFromPump(sourcePump)
      : [
          { x: 5.3, y: car.wy },
          { x: 5.3, y: 8.15 },
          { x: 8.35, y: 8.15 },
          { x: 8.35, y: 12.25 },
          { x: 48.0, y: 12.25 },
        ];

    if (sourcePump) {
      this.assignQueuedCarToPump(sourcePump);
    }
  }

  private destroyCarEntity(car: CustomerCarEntity, index: number): void {
    if (car.targetPump && car.targetPump.assignedCar?.id === car.id) {
      const freedPump = car.targetPump;
      freedPump.assignedCar = null;
      this.assignQueuedCarToPump(freedPump);
    }
    car.waitBadge?.destroy();
    car.customerNpc?.destroy();
    car.sprite.destroy();
    this.customerCars.splice(index, 1);

    if (this.carSpawnTimer > 15 || this.carSpawnTimer <= 0) {
      this.carSpawnTimer = this.getNextSpawnDelay();
    }
  }

  private applyIsoVehicleOrientation(
    sprite: Phaser.GameObjects.Image,
    type: VehicleType,
    currentAngle: number,
    dx: number,
    dy: number,
    dt: number,
    immediate = false
  ): number {
    const isoDx = (dx - dy) * 42;
    const isoDy = (dx + dy) * 21;
    if (Math.hypot(isoDx, isoDy) < 0.001) return currentAngle;

    const targetAngle = Math.atan2(isoDy, isoDx);
    const nextAngle = immediate
      ? targetAngle
      : Phaser.Math.Angle.RotateTo(currentAngle, targetAngle, 6.8 * dt);

    const cos = Math.cos(nextAngle);
    const sin = Math.sin(nextAngle);

    let cardinal = 0.46365;
    if (cos >= 0 && sin >= 0) {
      // SE (+wx)
      sprite.setTexture(`veh_${type}_se`).setFlipX(false);
      cardinal = 0.46365;
    } else if (cos < 0 && sin >= 0) {
      // SW (+wy)
      sprite.setTexture(`veh_${type}_se`).setFlipX(true);
      cardinal = 2.67795;
    } else if (cos >= 0 && sin < 0) {
      // NE (-wy)
      sprite.setTexture(`veh_${type}_ne`).setFlipX(false);
      cardinal = -0.46365;
    } else {
      // NW (-wx)
      sprite.setTexture(`veh_${type}_ne`).setFlipX(true);
      cardinal = -2.67795;
    }

    const diff = Phaser.Math.Angle.Wrap(nextAngle - cardinal);
    sprite.setRotation(Phaser.Math.Clamp(diff, -0.26, 0.26));
    return nextAngle;
  }

  private hasForwardTrafficBlocker(car: CustomerCarEntity, ux: number, uy: number): boolean {
    for (const other of this.customerCars) {
      if (other.id === car.id || other.state === 'EXITED' || other.state === 'SPAWNING') continue;
      const rx = other.wx - car.wx;
      const ry = other.wy - car.wy;
      const fwd = rx * ux + ry * uy;
      const lat = Math.abs(-rx * uy + ry * ux);
      if (fwd > 0.05 && fwd < 1.38 && lat < 0.62) {
        return true;
      }
    }
    return false;
  }

  private moveCarAlongWaypoints(car: CustomerCarEntity, dt: number, speed: number): boolean {
    if (car.waypoints.length === 0) return true;

    const target = car.waypoints[0];
    const dx = target.x - car.wx;
    const dy = target.y - car.wy;
    const dist = Math.hypot(dx, dy);

    if (dist < 0.14) {
      car.wx = target.x;
      car.wy = target.y;
      car.waypoints.shift();
      const pos = worldToIso(car.wx, car.wy);
      car.sprite.setPosition(pos.x, pos.y).setDepth(pos.y + 8);
      return car.waypoints.length === 0;
    }

    const ux = dx / dist;
    const uy = dy / dist;

    car.screenAngle = this.applyIsoVehicleOrientation(
      car.sprite,
      car.type,
      car.screenAngle,
      dx,
      dy,
      dt
    );

    if (car.yieldElapsed < 3.5 && this.hasForwardTrafficBlocker(car, ux, uy)) {
      car.yieldElapsed += dt;
      if (car.yieldElapsed > 1.7 && car.yieldElapsed < 1.85) {
        soundFx.playCarHorn();
      }
      return false;
    }
    car.yieldElapsed = 0;

    car.wx += ux * speed * dt;
    car.wy += uy * speed * dt;

    car.bobPhase += dt * 14;
    const bob = Math.sin(car.bobPhase) * 0.9;
    const pos = worldToIso(car.wx, car.wy);
    car.sprite.setPosition(pos.x, pos.y + bob).setDepth(pos.y + 8);
    return false;
  }

  private updateCustomerCars(dt: number): void {
    this.carSpawnTimer -= dt;
    if (this.carSpawnTimer <= 0) {
      this.carSpawnTimer = this.getNextSpawnDelay();
      this.spawnCustomerVehicle();
    }

    this.pumpSlots.forEach((slot) => {
      if (!slot.statusDot) return;
      const unlocked = this.unlockedBusinesses.has(slot.businessId);
      slot.statusDot.setVisible(unlocked);
      if (unlocked) {
        const occupied = Boolean(slot.assignedCar);
        slot.statusDot
          .setFillStyle(occupied ? 0xf59e0b : 0x22c55e, 0.95)
          .setStrokeStyle(1.5, occupied ? 0x92400e : 0x14532d);
      }
    });

    for (let i = this.customerCars.length - 1; i >= 0; i--) {
      const car = this.customerCars[i];
      car.stateElapsed += dt;

      switch (car.state) {
        case 'SPAWNING': {
          car.state = 'ENTERING_STATION';
          car.stateElapsed = 0;
          break;
        }

        case 'ENTERING_STATION': {
          const speed = car.wx < -1.5 ? 4.8 : 2.5;
          const reachedEntry = this.moveCarAlongWaypoints(car, dt, speed);
          if (reachedEntry || car.stateElapsed > 24) {
            car.state = 'SEARCHING_FOR_PUMP';
            car.stateElapsed = 0;
          }
          break;
        }

        case 'SEARCHING_FOR_PUMP': {
          this.assignCarToPumpOrQueue(car);
          break;
        }

        case 'QUEUED': {
          car.queueWaitElapsed += dt;
          if (car.waypoints.length > 0) {
            const settled = this.moveCarAlongWaypoints(car, dt, 2.2);
            if (settled) {
              car.screenAngle = -0.46365;
              car.sprite.setTexture(`veh_${car.type}_ne`).setFlipX(false).setRotation(0);
            }
          }
          const freePump = this.pumpSlots.find(
            (s) => this.unlockedBusinesses.has(s.businessId) && !s.assignedCar
          );
          if (freePump) {
            this.assignQueuedCarToPump(freePump);
          } else if (car.queueWaitElapsed > 62) {
            this.handleFuelCustomerAbandoned(car);
          }
          break;
        }

        case 'DRIVING_TO_PUMP': {
          this.moveCarAlongWaypoints(car, dt, 2.45);
          if (car.waypoints.length <= 1) {
            car.state = 'PARKING';
            car.stateElapsed = 0;
          } else if (car.stateElapsed > 18) {
            if (car.targetPump) {
              car.wx = car.targetPump.carWx;
              car.wy = car.targetPump.carWy;
              car.waypoints = [];
              this.arriveAtPump(car);
            } else {
              car.state = 'SEARCHING_FOR_PUMP';
              car.stateElapsed = 0;
            }
          }
          break;
        }

        case 'PARKING': {
          const parked = this.moveCarAlongWaypoints(car, dt, 1.85);
          if (parked || car.stateElapsed > 8) {
            if (car.targetPump) {
              car.wx = car.targetPump.carWx;
              car.wy = car.targetPump.carWy;
              const iso = worldToIso(car.wx, car.wy);
              car.sprite.setPosition(iso.x, iso.y).setDepth(iso.y + 8);
              this.arriveAtPump(car);
            } else {
              car.state = 'SEARCHING_FOR_PUMP';
              car.stateElapsed = 0;
            }
          }
          break;
        }

        case 'WAITING_FOR_SERVICE': {
          car.patienceRemaining = Math.max(0, car.patienceRemaining - dt);
          const ratio = car.patienceRemaining / 60;
          if (car.waitBarFill) {
            car.waitBarFill.width = Math.max(1, 34 * ratio);
            if (ratio > 0.55) {
              car.waitBarFill.setFillStyle(0x22c55e, 1);
              car.waitEmojiText?.setText('😊');
              car.waitBg?.setStrokeStyle(1.8, 0x22c55e);
            } else if (ratio > 0.25) {
              car.waitBarFill.setFillStyle(0xfacc15, 1);
              car.waitEmojiText?.setText('😐');
              car.waitBg?.setStrokeStyle(1.8, 0xf59e0b);
            } else {
              car.waitBarFill.setFillStyle(0xef4444, 1);
              car.waitEmojiText?.setText('😠');
              car.waitBg?.setStrokeStyle(1.8, 0xef4444);
            }
          }
          if (car.patienceRemaining <= 0) {
            this.handleFuelCustomerAbandoned(car);
          }
          break;
        }

        case 'REFUELING': {
          if (car.stateElapsed > 11) {
            car.state = 'WAITING_FOR_SERVICE';
            car.stateElapsed = 0;
          }
          break;
        }

        case 'PAYMENT_COMPLETED': {
          car.paymentTimer -= dt;
          if (car.paymentTimer <= 0 || car.stateElapsed > 3) {
            this.departCarFromPump(car.targetPump, car);
          }
          break;
        }

        case 'DEPARTING': {
          const depSpeed = car.wy >= 11.8 && car.wx > 9.0 ? 4.9 : 3.2;
          const exited = this.moveCarAlongWaypoints(car, dt, depSpeed);
          if (exited || car.stateElapsed > 28) {
            car.state = 'EXITED';
          }
          break;
        }

        case 'EXITED': {
          this.destroyCarEntity(car, i);
          break;
        }
      }
    }
  }

  private buildCarWashShowcase(): void {
    const washWx = 10.6;
    const washWy = 7.4;
    const washPos = worldToIso(washWx, washWy);

    this.add
      .image(washPos.x, washPos.y, 'carwash_back')
      .setOrigin(0.5, 0.72)
      .setDepth(washPos.y - 30);

    const carPos = worldToIso(this.washCarWx, this.washCarWy);
    this.washCar = this.add
      .image(carPos.x, carPos.y, `veh_${this.washCarType}_ne`)
      .setOrigin(0.5, 0.65)
      .setDepth(washPos.y + 4)
      .setVisible(false);

    if (!this.anims.exists('brush_spin')) {
      this.anims.create({
        key: 'brush_spin',
        frames: [0, 1, 2, 3].map((f) => ({ key: 'carwash_brush', frame: f })),
        frameRate: 12,
        repeat: -1,
      });
    }
    const bLeftPos = worldToIso(washWx - 0.55, washWy + 0.2);
    const bRightPos = worldToIso(washWx + 0.6, washWy - 0.1);
    const b1 = this.add
      .sprite(bLeftPos.x, bLeftPos.y - 16, 'carwash_brush')
      .setDepth(washPos.y + 12)
      .play('brush_spin')
      .setVisible(this.unlockedBusinesses.has('car_wash'));
    const b2 = this.add
      .sprite(bRightPos.x, bRightPos.y - 16, 'carwash_brush')
      .setDepth(washPos.y + 12)
      .play('brush_spin')
      .setVisible(this.unlockedBusinesses.has('car_wash'));
    this.washBrushes = [b1, b2];

    this.add
      .image(washPos.x, washPos.y, 'carwash_front')
      .setOrigin(0.5, 0.72)
      .setDepth(washPos.y + 80);

    this.addCollider(9.4, 11.8, 6.2, 8.6);
  }

  private buildServiceBadges(): void {
    const makeBadge = (wx: number, wy: number, emoji: string, strokeColor: number) => {
      const pos = worldToIso(wx, wy);
      const container = this.add.container(pos.x, pos.y - 75);
      const bg = this.add.circle(0, 0, 14, 0xfffdf7, 0.94).setStrokeStyle(2, strokeColor);
      const txt = this.add.text(0, 0, emoji, { fontSize: '13px' }).setOrigin(0.5, 0.5);
      container.add([bg, txt]).setDepth(pos.y + 500).setVisible(false);
      this.tweens.add({
        targets: container,
        y: pos.y - 81,
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      return { container, txt };
    };

    const shopBadgePos = worldToIso(6.5, 4.0);
    const shopContainer = this.add.container(shopBadgePos.x, shopBadgePos.y - 76);
    const shopBg = this.add.circle(-6, -4, 12, 0xfffdf7, 0.94).setStrokeStyle(1.8, 0x22c55e);
    const shopIcon = this.add.text(-6, -4, '🛒', { fontSize: '11px' }).setOrigin(0.5, 0.5);
    this.shopMoodEmoji = this.add.text(13, -4, '😊', { fontSize: '11px' }).setOrigin(0.5, 0.5);
    const shopBarBg = this.add
      .rectangle(-18, 12, 36, 4.5, 0x2e221d, 0.85)
      .setOrigin(0, 0.5)
      .setStrokeStyle(0.8, 0xfffdf7, 0.7);
    this.shopWaitBarFill = this.add
      .rectangle(-17, 12, 34, 3, 0x22c55e, 1)
      .setOrigin(0, 0.5);
    shopContainer
      .add([shopBg, shopIcon, this.shopMoodEmoji, shopBarBg, this.shopWaitBarFill])
      .setDepth(shopBadgePos.y + 500)
      .setVisible(false);
    this.tweens.add({
      targets: shopContainer,
      y: shopBadgePos.y - 81,
      duration: 820,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.shopReadyBadge = shopContainer;

    const shopCustPos = worldToIso(6.35, 4.28);
    this.shopCustomerNpc = this.add
      .sprite(shopCustPos.x, shopCustPos.y, 'char_customer_female', 0)
      .setOrigin(0.5, 0.88)
      .setDepth(shopCustPos.y + 4)
      .play('customer_female_wait')
      .setVisible(false);

    this.washReadyBadge = makeBadge(9.6, 7.6, '🧽', 0x1e73e8).container;
    const roomBadge = makeBadge(11.1, 3.1, '🛏️', 0x7c3aed);
    this.roomReadyBadge = roomBadge.container;
    this.roomReadyText = roomBadge.txt;
  }

  private buildLockTexts(): void {
    const lockCoords: Array<{ id: BusinessUnlockId; wx: number; wy: number; zOff: number; label: string }> = [
      { id: 'pump_2', wx: 3.3, wy: 4.3, zOff: -42, label: 'Pump 2' },
      { id: 'pump_3', wx: 1.5, wy: 6.55, zOff: -42, label: 'Pump 3' },
      { id: 'pump_4', wx: 3.3, wy: 6.55, zOff: -42, label: 'Pump 4' },
      { id: 'shop', wx: 6.6, wy: 2.3, zOff: -84, label: 'Shop' },
      { id: 'car_wash', wx: 10.6, wy: 7.4, zOff: -74, label: 'Car Wash' },
      { id: 'rooms', wx: 11.2, wy: 1.8, zOff: -76, label: 'Rooms' },
    ];

    lockCoords.forEach((cfg) => {
      const pos = worldToIso(cfg.wx, cfg.wy);
      const reqLv = BUSINESS_UNLOCK_LEVEL[cfg.id];
      const txt = this.add
        .text(pos.x, pos.y + cfg.zOff, `🔒 ${cfg.label} · Lv.${reqLv}`, {
          fontFamily: 'Outfit, sans-serif',
          fontSize: '12px',
          fontStyle: 'bold',
          color: '#FFFDF7',
          stroke: '#1E1B18',
          strokeThickness: 4,
          shadow: {
            offsetX: 0,
            offsetY: 2,
            color: 'rgba(0,0,0,0.65)',
            blur: 3,
            fill: true,
          },
        })
        .setOrigin(0.5, 0.5)
        .setDepth(pos.y + 465)
        .setVisible(!this.unlockedBusinesses.has(cfg.id));

      this.lockTexts.set(cfg.id, txt);
    });
  }

  private buildEnvironment(): void {
    this.placeIsoProp('price_sign', -1.8, 10.0, 0.5, 0.86, 12);
    this.addCollider(-2.2, -1.4, 9.6, 10.4);

    const fenceXs = [1.8, 2.8, 3.8, 4.8, 5.8, 6.8];
    fenceXs.forEach((fx) => {
      this.placeIsoProp('hedge_block', fx, 11.15, 0.5, 0.75, 4);
      this.placeIsoProp('hedge_pillar', fx + 0.5, 11.15, 0.5, 0.8, 6);
    });
    this.addCollider(1.4, 7.6, 10.8, 11.4);

    const treePositions: Vec2[] = [
      { x: -3.2, y: 0.4 },
      { x: -2.8, y: 6.2 },
      { x: 1.5, y: -1.4 },
      { x: 5.5, y: -1.6 },
      { x: 10.0, y: -1.5 },
      { x: 14.4, y: 0.6 },
      { x: 14.8, y: 4.5 },
      { x: 14.5, y: 8.6 },
      // Expanded scenic neighborhood trees (keeping roads and station lot clear)
      { x: -14.2, y: 2.5 },
      { x: -16.5, y: 8.5 },
      { x: -13.5, y: -6.0 },
      { x: -1.5, y: -6.5 },
      { x: 7.5, y: -6.8 },
      { x: 16.5, y: -5.5 },
      { x: 21.0, y: 1.8 },
      { x: 22.5, y: 7.8 },
      { x: 29.0, y: 8.8 },
      { x: 0.5, y: 17.5 },
      { x: 11.0, y: 17.5 },
      { x: 21.5, y: 17.8 },
      { x: -15.5, y: 17.5 },
    ];
    treePositions.forEach((t) => {
      this.placeIsoProp('tree_deciduous', t.x, t.y, 0.5, 0.88, 6);
    });

    this.placeIsoProp('tree_palm', -3.6, 11.2, 0.5, 0.88, 10);
    this.placeIsoProp('tree_palm', 13.6, 5.2, 0.5, 0.88, 10);
    this.placeIsoProp('tree_palm', 13.6, 10.4, 0.5, 0.88, 10);
    this.placeIsoProp('tree_palm', 17.2, 10.6, 0.5, 0.88, 10);
    this.placeIsoProp('tree_palm', -13.2, 10.6, 0.5, 0.88, 10);
    this.placeIsoProp('tree_palm', 26.0, 17.2, 0.5, 0.88, 10);

    // Streetlights along the station & extended highway corridor
    [-19.5, -12.5, -0.9, 8.9, 17.5, 25.5, 34.0].forEach((lx) => {
      this.placeIsoProp('streetlight', lx, 10.6, 0.4, 0.9, 10);
    });
    this.placeIsoProp('streetlight', 4.4, 3.4, 0.4, 0.9, 10);

    const parked1 = this.placeIsoProp('veh_suv_green_ne', 5.1, 9.4, 0.5, 0.65, 6);
    this.addCollider(4.6, 5.6, 8.9, 9.9);
    const parked2 = this.placeIsoProp('veh_hatch_orange_ne', 6.3, 9.5, 0.5, 0.65, 6);
    this.addCollider(5.8, 6.8, 9.0, 10.0);
    this.parkedShowcaseVehicles.push(parked1, parked2);
  }

  private buildAmbientTraffic(): void {
    // Full-screen multi-lane highway traffic (SE eastbound + NW westbound) + side crossroad traffic
    const laneConfigs: Array<{
      type: VehicleType;
      axis: 'x' | 'y';
      wx: number;
      wy: number;
      dir: 1 | -1;
      speed: number;
    }> = [
      // Westbound highway lane (wy = 14.15, NW direction)
      { type: 'suv_black', axis: 'x', wx: 42.0, wy: 14.15, dir: -1, speed: 3.1 },
      { type: 'van_white', axis: 'x', wx: 24.0, wy: 14.15, dir: -1, speed: 2.7 },
      { type: 'sedan_red', axis: 'x', wx: 9.0, wy: 14.15, dir: -1, speed: 3.4 },
      { type: 'motorcycle', axis: 'x', wx: -8.0, wy: 14.15, dir: -1, speed: 4.1 },
      { type: 'truck_delivery', axis: 'x', wx: -22.0, wy: 14.15, dir: -1, speed: 2.3 },
      // Eastbound highway lane (wy = 12.25, SE direction, yields to station traffic)
      { type: 'car_blue', axis: 'x', wx: -24.0, wy: 12.25, dir: 1, speed: 3.3 },
      { type: 'sedan_white', axis: 'x', wx: -9.5, wy: 12.25, dir: 1, speed: 3.0 },
      { type: 'car_yellow', axis: 'x', wx: 13.0, wy: 12.25, dir: 1, speed: 3.5 },
      { type: 'suv_green', axis: 'x', wx: 30.0, wy: 12.25, dir: 1, speed: 2.9 },
      // Crossroad avenue traffic (vertical axis along wy)
      { type: 'hatch_orange', axis: 'y', wx: -5.8, wy: -12.0, dir: 1, speed: 2.8 },
      { type: 'car_blue', axis: 'y', wx: -9.3, wy: 24.0, dir: -1, speed: 2.9 },
    ];

    laneConfigs.forEach((cfg) => {
      const pos = worldToIso(cfg.wx, cfg.wy);
      let texKey = `veh_${cfg.type}_se`;
      let flipX = false;
      if (cfg.axis === 'x') {
        texKey = cfg.dir === -1 ? `veh_${cfg.type}_ne` : `veh_${cfg.type}_se`;
        flipX = cfg.dir === -1;
      } else {
        texKey = cfg.dir === -1 ? `veh_${cfg.type}_ne` : `veh_${cfg.type}_se`;
        flipX = cfg.dir === 1;
      }
      const sprite = this.add.image(pos.x, pos.y, texKey).setOrigin(0.5, 0.65);
      sprite.setFlipX(flipX);
      sprite.setDepth(pos.y + 8);
      this.trafficCars.push({
        sprite,
        axis: cfg.axis,
        wx: cfg.wx,
        wy: cfg.wy,
        speed: cfg.speed,
        dir: cfg.dir,
      });
    });
  }

  private buildAmbientCustomers(): void {
    const configs: Array<{ role: CharacterRole; waypoints: Vec2[]; speed: number }> = [
      {
        role: 'customer_male',
        waypoints: [
          { x: 4.9, y: 8.6 },
          { x: 6.4, y: 5.1 },
          { x: 7.7, y: 5.1 },
        ],
        speed: 1.15,
      },
      {
        role: 'customer_female',
        waypoints: [
          { x: 6.8, y: 4.6 },
          { x: 8.3, y: 4.6 },
          { x: 7.2, y: 8.3 },
        ],
        speed: 1.1,
      },
    ];

    configs.forEach((cfg) => {
      const start = cfg.waypoints[0];
      const pos = worldToIso(start.x, start.y);
      const sprite = this.add.sprite(pos.x, pos.y, `char_${cfg.role}`, 0).setOrigin(0.5, 0.88);
      sprite.setDepth(pos.y);
      sprite.play(`${cfg.role}_idle`);
      this.customerNpcs.push({
        sprite,
        role: cfg.role,
        waypoints: cfg.waypoints,
        wpIndex: 1,
        pauseTimer: 1.2,
        speed: cfg.speed,
      });
    });
  }

  private syncEmployees(employees: EmployeeRecord[]): void {
    if (!this.isSceneReady || !this.add) return;

    const roleMap: Record<EmployeeRoleId, { charRole: CharacterRole; wx: number; wy: number }> = {
      attendant: { charRole: 'worker_pump', wx: 2.5, wy: 5.5 },
      cashier: { charRole: 'cashier', wx: 6.5, wy: 4.2 },
      washer: { charRole: 'worker_wash', wx: 9.1, wy: 8.0 },
      housekeeper: { charRole: 'worker_rooms', wx: 10.7, wy: 3.4 },
      delivery: { charRole: 'delivery_driver', wx: -0.3, wy: 4.0 },
    };

    employees.forEach((emp) => {
      const cfg = roleMap[emp.id];
      if (!cfg) return;

      const existing = this.workerEntities.get(emp.id);
      if (emp.hired && emp.assigned) {
        if (!existing || !existing.sprite?.scene) {
          const pos = worldToIso(cfg.wx, cfg.wy);
          const sprite = this.add
            .sprite(pos.x, pos.y, `char_${cfg.charRole}`, 0)
            .setOrigin(0.5, 0.88)
            .setDepth(pos.y + 4)
            .play(`${cfg.charRole}_idle`);
          this.workerEntities.set(emp.id, {
            id: emp.id,
            role: cfg.charRole,
            sprite,
            homeWx: cfg.wx,
            homeWy: cfg.wy,
            wx: cfg.wx,
            wy: cfg.wy,
            targetWx: cfg.wx,
            targetWy: cfg.wy,
            state: 'idle',
            workTimer: 0,
            restTimer: 0,
            pendingDuration: 2.8,
            deliveryTimer: 26,
          });
        } else {
          existing.sprite.setVisible(true);
        }
      } else if (existing?.sprite?.scene) {
        existing.sprite.setVisible(false);
        if (emp.id === 'attendant' && this.activeFuelSessions.delete('worker_attendant')) {
          this.emitLiveFuelState(true);
        }
      }
    });
  }

  private buildPlayer(): void {
    const pos = worldToIso(this.playerWx, this.playerWy);
    const texKey = getPlayerOutfitTextureKey(this.equippedCosmetics.playerOutfit);
    const animPrefix = getPlayerOutfitAnimPrefix(this.equippedCosmetics.playerOutfit);
    this.player = this.add.sprite(pos.x, pos.y, texKey, 0).setOrigin(0.5, 0.88);
    this.player.setDepth(pos.y + 4);
    this.player.play(`${animPrefix}_idle`);

    this.progressBarBg = this.add.graphics().setDepth(5000).setVisible(false);
    this.progressBarFill = this.add.graphics().setDepth(5001).setVisible(false);
    this.fuelLiveText = this.add
      .text(0, 0, '', {
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#FFFDF7',
        stroke: '#1E1B18',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 0.5)
      .setDepth(5002)
      .setVisible(false);
  }

  private buildWorldPrompt(): void {
    this.worldPromptContainer = this.add.container(0, 0).setDepth(5200).setVisible(false);
    this.worldPromptBg = this.add
      .rectangle(0, 0, 128, 28, 0xfffdf7, 0.96)
      .setStrokeStyle(2, 0xf59e0b)
      .setInteractive({ useHandCursor: true });
    this.worldPromptText = this.add
      .text(0, 0, '⛽ Refuel', {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#2E221D',
      })
      .setOrigin(0.5, 0.5);

    this.worldPromptBg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pointer.event?.stopPropagation();
      this.triggerActiveService();
    });

    this.worldPromptContainer.add([this.worldPromptBg, this.worldPromptText]);
  }

  private buildDayNightLayer(): void {
    this.nightOverlay = this.add
      .rectangle(MAP_WIDTH * 0.5, MAP_HEIGHT * 0.5, MAP_WIDTH + 600, MAP_HEIGHT + 600, 0x0f172a, 0)
      .setDepth(4400);

    const lightPoints: Vec2[] = [
      { x: 2.5, y: 5.5 },
      { x: 6.6, y: 4.1 },
      { x: 10.9, y: 3.3 },
      { x: 9.8, y: 7.8 },
      { x: -0.4, y: 10.2 },
      { x: 8.3, y: 10.2 },
    ];

    lightPoints.forEach((pt) => {
      const iso = worldToIso(pt.x, pt.y);
      const glow = this.add
        .image(iso.x, iso.y - 35, 'night_glow')
        .setDepth(4450)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale(1.8)
        .setAlpha(0);
      this.nightLights.push(glow);
    });
  }

  private applyDayPhaseLighting(phase: DayPhase): void {
    if (!this.nightOverlay) return;
    let color = 0x0f172a;
    let overlayAlpha = 0;
    let lightAlpha = 0;

    if (phase === 'Morning') {
      overlayAlpha = 0;
      lightAlpha = 0;
    } else if (phase === 'Afternoon') {
      color = 0xf59e0b;
      overlayAlpha = 0.04;
      lightAlpha = 0;
    } else if (phase === 'Evening') {
      color = 0xea580c;
      overlayAlpha = 0.16;
      lightAlpha = 0.45;
    } else {
      color = 0x0f172a;
      overlayAlpha = 0.36;
      lightAlpha = 0.92;
    }

    this.nightOverlay.setFillStyle(color, overlayAlpha);
    this.nightLights.forEach((l) => l.setAlpha(lightAlpha));
  }

  private setupInputs(): void {
    if (this.input.keyboard) {
      this.keys = {
        W: this.input.keyboard.addKey('W'),
        A: this.input.keyboard.addKey('A'),
        S: this.input.keyboard.addKey('S'),
        D: this.input.keyboard.addKey('D'),
        UP: this.input.keyboard.addKey('UP'),
        DOWN: this.input.keyboard.addKey('DOWN'),
        LEFT: this.input.keyboard.addKey('LEFT'),
        RIGHT: this.input.keyboard.addKey('RIGHT'),
        SPACE: this.input.keyboard.addKey('SPACE'),
        E: this.input.keyboard.addKey('E'),
      };

      this.keys.E.on('down', () => this.triggerActiveService());
      this.keys.SPACE.on('down', () => this.triggerActiveService());
    }

    // Separate camera gestures (1-finger pan + 2-finger pinch zoom) — NEVER moves player!
    this.input.on(
      'pointerdown',
      (pointer: Phaser.Input.Pointer, currentlyOver: Phaser.GameObjects.GameObject[]) => {
        if (currentlyOver.length > 0) return;

        this.activePointers.set(pointer.id, { x: pointer.x, y: pointer.y });
        this.panVelocity = { x: 0, y: 0 };

        if (this.activePointers.size === 1) {
          this.isPanning = true;
          this.isPinching = false;
          this.lastPanPt = { x: pointer.x, y: pointer.y };
        } else if (this.activePointers.size >= 2) {
          this.isPanning = false;
          this.isPinching = true;
          this.lastPanPt = null;
          const pts = Array.from(this.activePointers.values());
          this.lastPinchDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
          this.lastPinchMid = {
            x: (pts[0].x + pts[1].x) * 0.5,
            y: (pts[0].y + pts[1].y) * 0.5,
          };
        }
      }
    );

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.activePointers.has(pointer.id)) return;
      this.activePointers.set(pointer.id, { x: pointer.x, y: pointer.y });

      const cam = this.cameras.main;

      if (this.activePointers.size >= 2) {
        this.isPinching = true;
        this.isPanning = false;
        const pts = Array.from(this.activePointers.values());
        const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
        const mid = {
          x: (pts[0].x + pts[1].x) * 0.5,
          y: (pts[0].y + pts[1].y) * 0.5,
        };

        if (this.lastPinchDist > 8 && dist > 8 && this.lastPinchMid) {
          const worldAnchor = cam.getWorldPoint(this.lastPinchMid.x, this.lastPinchMid.y);
          const scaleFactor = dist / this.lastPinchDist;
          const nextZoom = Phaser.Math.Clamp(
            this.zoomLevel * scaleFactor,
            this.getMinFillZoom(),
            MAX_CAMERA_ZOOM
          );

          this.zoomLevel = nextZoom;
          cam.setZoom(this.zoomLevel);

          cam.scrollX =
            worldAnchor.x - cam.width * 0.5 - (mid.x - cam.width * 0.5) / this.zoomLevel;
          cam.scrollY =
            worldAnchor.y - cam.height * 0.5 - (mid.y - cam.height * 0.5) / this.zoomLevel;
          this.clampCameraScroll();
        }

        this.lastPinchDist = dist;
        this.lastPinchMid = mid;
        return;
      }

      if (this.activePointers.size === 1 && this.isPanning && this.lastPanPt) {
        const dx = pointer.x - this.lastPanPt.x;
        const dy = pointer.y - this.lastPanPt.y;
        const worldDx = (-dx * this.cameraSensitivity) / cam.zoom;
        const worldDy = (-dy * this.cameraSensitivity) / cam.zoom;

        cam.scrollX += worldDx;
        cam.scrollY += worldDy;
        this.clampCameraScroll();

        this.panVelocity = { x: worldDx, y: worldDy };
        this.lastPanPt = { x: pointer.x, y: pointer.y };
      }
    });

    const handlePointerRelease = (pointer: Phaser.Input.Pointer) => {
      if (!this.activePointers.has(pointer.id)) return;
      this.activePointers.delete(pointer.id);

      if (this.activePointers.size < 2) {
        this.isPinching = false;
        this.lastPinchDist = 0;
        this.lastPinchMid = null;
      }

      if (this.activePointers.size === 1) {
        const remaining = this.activePointers.values().next().value;
        if (remaining) {
          this.isPanning = true;
          this.lastPanPt = { x: remaining.x, y: remaining.y };
          this.panVelocity = { x: 0, y: 0 };
        }
      } else if (this.activePointers.size === 0) {
        this.isPanning = false;
        this.lastPanPt = null;
      }
    };

    this.input.on('pointerup', handlePointerRelease);
    this.input.on('pointerupoutside', handlePointerRelease);
    this.input.on('gameout', () => {
      this.activePointers.clear();
      this.isPanning = false;
      this.isPinching = false;
      this.lastPanPt = null;
      this.lastPinchDist = 0;
      this.lastPinchMid = null;
    });

    this.input.on(
      'wheel',
      (pointer: Phaser.Input.Pointer, _objs: unknown, _dx: number, dy: number) => {
        this.adjustZoom(dy > 0 ? -0.1 : 0.1, pointer.x, pointer.y);
      }
    );
  }

  public update(_time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs / 1000, 0.05);

    this.updateBusinessTimers(dt);
    this.updateCustomerCars(dt);
    const playerMoved = this.updatePlayer(dt);
    this.updateCamera(dt, playerMoved);
    this.updateWorkers(dt);
    this.updateAmbientTraffic(dt);
    this.updateAmbientCustomers(dt);
    this.updateCarWashEffects(dt);
    this.evaluateProximityPrompts();
    this.syncDynamicEnvironmentAudio();

    if (this.completedFuelHoldTimer > 0 && this.activeFuelSessions.size === 0) {
      this.completedFuelHoldTimer -= dt;
      if (this.completedFuelHoldTimer <= 0) {
        this.completedFuelHoldTimer = 0;
        this.lastCompletedFuel = null;
        this.emitLiveFuelState(true);
      }
    }
  }

  private emitLiveFuelState(force: boolean): void {
    const cb = this.callbacks.onLiveFuelChange;
    if (!cb) return;

    const now = performance.now();
    if (!force && now - this.lastFuelEmitAt < 75) {
      return;
    }
    this.lastFuelEmitAt = now;

    const active =
      this.activeFuelSessions.get('player') ??
      this.activeFuelSessions.get('worker_attendant') ??
      null;

    if (active) {
      const clampedPct = Phaser.Math.Clamp(active.pct, 0, 1);
      const litresFilled = Number((active.targetLitres * clampedPct).toFixed(1));
      const totalAmount =
        clampedPct >= 1
          ? active.totalPayment
          : Number((active.totalPayment * clampedPct).toFixed(2));
      cb({
        sessionId: active.sessionId,
        pumpLabel: active.pumpLabel,
        byWorker: active.byWorker,
        pricePerLitre: active.pricePerLitre,
        litresFilled,
        targetLitres: active.targetLitres,
        totalAmount,
        status: 'fueling',
      });
      return;
    }

    cb(this.lastCompletedFuel);
  }

  private syncDynamicEnvironmentAudio(): void {
    let drivingCars = 0;
    let idlingCars = 0;

    for (const car of this.customerCars) {
      if (car.state === 'EXITED' || car.state === 'SPAWNING') continue;
      if (car.state === 'QUEUED' || car.state === 'WAITING_FOR_SERVICE' || car.state === 'REFUELING') {
        idlingCars += 1;
      } else {
        drivingCars += 1;
      }
    }

    if (this.washCarState === 'entering' || this.washCarState === 'exiting') {
      drivingCars += 1;
    } else if (this.washCarState === 'waiting') {
      idlingCars += 1;
    }

    let activeWorkers = 0;
    this.workerEntities.forEach((w) => {
      if (w.sprite.visible) activeWorkers += 1;
    });

    const businessSignals =
      (this.shopCustomerReady ? 1 : 0) +
      (this.washCustomerReady ? 1 : 0) +
      (this.roomCustomerReady ? 1 : 0);

    const activityLevel = Phaser.Math.Clamp(
      (drivingCars + idlingCars) * 0.16 + activeWorkers * 0.09 + businessSignals * 0.1 + 0.08,
      0,
      1
    );

    soundFx.updateEnvironment({
      dayPhase: this.currentDayPhase,
      activityLevel,
      drivingCars,
      idlingCars,
      washRunning: this.washBoostTimer > 0,
      isPaused: false,
    });
  }

  private updateCamera(dt: number, playerMoved: boolean): void {
    const cam = this.cameras.main;

    // Clean up any stale pointers that were released outside canvas
    if (this.activePointers.size > 0) {
      const pointers = [
        this.input.activePointer,
        this.input.pointer1,
        this.input.pointer2,
        this.input.pointer3,
      ];
      for (const id of Array.from(this.activePointers.keys())) {
        const match = pointers.find((p) => p && p.id === id);
        if (match && !match.isDown) {
          this.activePointers.delete(id);
        }
      }
      if (this.activePointers.size === 0) {
        this.isPanning = false;
        this.isPinching = false;
        this.lastPanPt = null;
      }
    }

    if (this.isPanning || this.isPinching) return;

    // Smooth inertia decay after lifting 1-finger pan
    if (Math.abs(this.panVelocity.x) > 0.15 || Math.abs(this.panVelocity.y) > 0.15) {
      const glideScale = Math.min(1.5, dt * 55);
      cam.scrollX += this.panVelocity.x * glideScale;
      cam.scrollY += this.panVelocity.y * glideScale;
      const decay = Math.pow(0.015, dt);
      this.panVelocity.x *= decay;
      this.panVelocity.y *= decay;
      this.clampCameraScroll();
      return;
    }

    // Keep player inside comfortable viewport margins only while actively walking with joystick
    if (playerMoved) {
      const worldCenterX = cam.scrollX + cam.width * 0.5;
      const worldCenterY = cam.scrollY + cam.height * 0.5;
      const halfMarginW = (cam.width * 0.28) / cam.zoom;
      const halfMarginH = (cam.height * 0.28) / cam.zoom;

      let targetShiftX = 0;
      let targetShiftY = 0;
      if (this.player.x > worldCenterX + halfMarginW) {
        targetShiftX = this.player.x - (worldCenterX + halfMarginW);
      } else if (this.player.x < worldCenterX - halfMarginW) {
        targetShiftX = this.player.x - (worldCenterX - halfMarginW);
      }
      if (this.player.y > worldCenterY + halfMarginH) {
        targetShiftY = this.player.y - (worldCenterY + halfMarginH);
      } else if (this.player.y < worldCenterY - halfMarginH) {
        targetShiftY = this.player.y - (worldCenterY - halfMarginH);
      }

      if (targetShiftX !== 0 || targetShiftY !== 0) {
        const followRate = 1 - Math.exp(-7 * dt);
        cam.scrollX += targetShiftX * followRate;
        cam.scrollY += targetShiftY * followRate;
        this.clampCameraScroll();
      }
    }
  }

  private updateBusinessTimers(dt: number): void {
    if (this.tankCooldown > 0) this.tankCooldown = Math.max(0, this.tankCooldown - dt);

    if (this.unlockedBusinesses.has('shop')) {
      if (!this.shopCustomerReady) {
        this.shopCooldown -= dt;
        if (this.shopCooldown <= 0) {
          if (this.shopStockCount <= 0) {
            const shopPos = worldToIso(6.5, 4.1);
            this.spawnFloatingText(shopPos.x, shopPos.y - 68, '😡 Out of Stock!', '#EF4444');
            this.callbacks.onCustomerFeedback?.({
              business: 'shop',
              served: false,
              waitSec: 12,
              happiness: 'Angry',
              score: 1.4,
            });
            this.shopCooldown = this.getNextShopCooldown();
          } else {
            this.shopCustomerReady = true;
            this.shopPatienceRemaining = 60;
            this.shopCustomerTolerance = 0.85 + Math.random() * 0.3;
            this.shopCustomerBasket = generateShopBasket(
              this.upgradesData.shopStockLevel,
              this.unlockedBusinesses.has('shop_deluxe')
            );
            const roles: CharacterRole[] = ['customer_male', 'customer_female', 'customer_suit'];
            const role = roles[Math.floor(Math.random() * roles.length)];
            if (this.shopCustomerNpc) {
              this.shopCustomerNpc
                .setTexture(`char_${role}`, 0)
                .play(`${role}_wait`)
                .setVisible(true);
            }
            this.shopMoodEmoji?.setText('😊');
            if (this.shopWaitBarFill) {
              this.shopWaitBarFill.width = 34;
              this.shopWaitBarFill.setFillStyle(0x22c55e, 1);
            }
            this.shopReadyBadge.setVisible(true);
          }
        }
      } else {
        const cashierWorking =
          this.workerEntities.get('cashier')?.state === 'working' &&
          this.workerEntities.get('cashier')?.targetSlotId === 'shop';
        const playerCheckout = this.activeChannel?.prompt.zoneId === 'shop';
        if (!cashierWorking && !playerCheckout) {
          this.shopPatienceRemaining = Math.max(0, this.shopPatienceRemaining - dt);
          const ratio = this.shopPatienceRemaining / 60;
          if (this.shopWaitBarFill) {
            this.shopWaitBarFill.width = Math.max(1, 34 * ratio);
            if (ratio > 0.55) {
              this.shopWaitBarFill.setFillStyle(0x22c55e, 1);
              this.shopMoodEmoji?.setText('😊');
            } else if (ratio > 0.25) {
              this.shopWaitBarFill.setFillStyle(0xfacc15, 1);
              this.shopMoodEmoji?.setText('😐');
            } else {
              this.shopWaitBarFill.setFillStyle(0xef4444, 1);
              this.shopMoodEmoji?.setText('😠');
            }
          }
          if (this.shopPatienceRemaining <= 0) {
            const shopPos = worldToIso(6.5, 4.1);
            this.spawnFloatingText(shopPos.x, shopPos.y - 72, '😡 Shop Wait Too Long!', '#EF4444');
            soundFx.playLocked();
            this.callbacks.onCustomerFeedback?.({
              business: 'shop',
              served: false,
              waitSec: 60,
              happiness: 'Angry',
              score: 1.0,
            });
            this.shopCustomerReady = false;
            this.shopReadyBadge.setVisible(false);
            this.shopCustomerNpc?.setVisible(false);
            this.shopCustomerBasket = [];
            this.shopCooldown = this.getNextShopCooldown();
          }
        }
      }
    }

    if (
      this.unlockedBusinesses.has('car_wash') &&
      this.washCarState === 'hidden' &&
      !this.washCustomerReady
    ) {
      this.washCooldown -= dt;
      if (this.washCooldown <= 0) {
        const washTypes: VehicleType[] = [
          'car_blue',
          'sedan_red',
          'car_yellow',
          'sedan_white',
          'hatch_orange',
          'suv_green',
        ];
        this.washCarType = washTypes[Math.floor(Math.random() * washTypes.length)];
        this.washCarWx = 8.95;
        this.washCarWy = 9.95;
        this.washCarAngle = 0.46365;
        this.washCarWaypoints = [
          { x: 10.6, y: 9.95 },
          { x: 10.6, y: 7.5 },
        ];
        this.washCarState = 'entering';
        const washIso = worldToIso(this.washCarWx, this.washCarWy);
        this.washCar.setPosition(washIso.x, washIso.y).setDepth(washIso.y + 4).setVisible(true);
      }
    }

    if (this.unlockedBusinesses.has('rooms') && !this.roomCustomerReady) {
      this.roomCooldown -= dt;
      if (this.roomCooldown <= 0) {
        if (this.roomNeedsClean) {
          this.roomReadyText.setText('🧹');
          this.roomReadyBadge.setVisible(true);
        } else {
          this.roomCustomerReady = true;
          this.roomReadyText.setText('🛏️');
          this.roomReadyBadge.setVisible(true);
        }
      }
    }
  }

  private updatePlayer(dt: number): boolean {
    if (this.activeChannel) {
      this.activeChannel.elapsed += dt;
      const pct = Phaser.Math.Clamp(this.activeChannel.elapsed / this.activeChannel.duration, 0, 1);
      this.callbacks.onActionProgress(pct);

      const bx = this.player.x - 26;
      const by = this.player.y - 82;
      this.progressBarBg.clear().setVisible(true);
      this.progressBarBg.fillStyle(0x2e221d, 0.88);
      this.progressBarBg.fillRoundedRect(bx - 2, by - 2, 56, 10, 4);

      this.progressBarFill.clear().setVisible(true);
      this.progressBarFill.fillStyle(0x4ade80, 1);
      this.progressBarFill.fillRoundedRect(bx, by, 52 * pct, 6, 3);

      if (this.activeChannel.prompt.fuelCost > 0) {
        const filledL = Math.round(this.activeChannel.prompt.fuelCost * pct);
        this.fuelLiveText
          .setPosition(this.player.x, by - 12)
          .setText(`${filledL}/${this.activeChannel.prompt.fuelCost}L`)
          .setVisible(true);

        const session = this.activeFuelSessions.get('player');
        if (session) {
          session.pct = pct;
          this.emitLiveFuelState(false);
        }
      }

      if (this.activeChannel.elapsed >= this.activeChannel.duration) {
        this.completeActiveChannel();
      }
      return false;
    }

    let sx = 0;
    let sy = 0;

    if (this.keys) {
      if (this.keys.A.isDown || this.keys.LEFT.isDown) sx -= 1;
      if (this.keys.D.isDown || this.keys.RIGHT.isDown) sx += 1;
      if (this.keys.W.isDown || this.keys.UP.isDown) sy -= 1;
      if (this.keys.S.isDown || this.keys.DOWN.isDown) sy += 1;
    }

    let stickMag = 1;
    if (this.joystick.active) {
      sx = this.joystick.x;
      sy = this.joystick.y;
      stickMag = Math.min(1, Math.hypot(sx, sy));
    }

    let vx = 0;
    let vy = 0;

    if (Math.hypot(sx, sy) > 0.12) {
      const len = Math.hypot(sx, sy);
      const nsx = sx / len;
      const nsy = sy / len;
      vx = nsx + nsy * 1.4;
      vy = -nsx + nsy * 1.4;
      const vLen = Math.hypot(vx, vy) || 1;
      vx /= vLen;
      vy /= vLen;
    }

    // If a moving vehicle overlaps player, gently nudge player clear so they cannot get trapped
    this.resolveVehicleOverlap();

    const isRunning = stickMag > 0.78;
    const speed = isRunning ? 3.55 : 2.6;

    if (Math.hypot(vx, vy) > 0.05) {
      const nextX = Phaser.Math.Clamp(this.playerWx + vx * speed * dt, -2.3, 13.1);
      const nextY = Phaser.Math.Clamp(this.playerWy + vy * speed * dt, 0.5, 10.7);

      if (!this.isBlocked(nextX, this.playerWy)) this.playerWx = nextX;
      if (!this.isBlocked(this.playerWx, nextY)) this.playerWy = nextY;

      const isoPos = worldToIso(this.playerWx, this.playerWy);
      const dxScreen = isoPos.x - this.player.x;
      this.player.setPosition(isoPos.x, isoPos.y);
      this.player.setDepth(isoPos.y + 4);

      if (Math.abs(dxScreen) > 0.2) {
        this.player.setFlipX(dxScreen < 0);
      }
      const animPrefix = getPlayerOutfitAnimPrefix(this.equippedCosmetics.playerOutfit);
      const anim = isRunning ? `${animPrefix}_run` : `${animPrefix}_walk`;
      if (this.player.anims.currentAnim?.key !== anim) {
        this.player.play(anim, true);
      }
      soundFx.playFootstep(isRunning);
      return true;
    } else {
      const idleAnim = `${getPlayerOutfitAnimPrefix(this.equippedCosmetics.playerOutfit)}_idle`;
      if (this.player.anims.currentAnim?.key !== idleAnim) {
        this.player.play(idleAnim, true);
      }
      return false;
    }
  }

  private updateWorkers(dt: number): void {
    this.workerEntities.forEach((w) => {
      if (!w.sprite.visible) return;
      const empRec = this.employeesData.find((e) => e.id === w.id);
      const speedMult = 1 + ((empRec?.level ?? 1) - 1) * 0.2;

      if (w.state === 'working') {
        w.workTimer -= dt * speedMult;
        if (w.id === 'attendant') {
          const session = this.activeFuelSessions.get('worker_attendant');
          if (session) {
            const dur = Math.max(0.01, w.pendingDuration);
            session.pct = Phaser.Math.Clamp(1 - Math.max(0, w.workTimer) / dur, 0, 1);
            this.emitLiveFuelState(false);
          }
        }
        if (w.workTimer <= 0) {
          this.finishWorkerJob(w);
        }
        return;
      }

      if (w.state === 'moving' || w.state === 'returning') {
        const dx = w.targetWx - w.wx;
        const dy = w.targetWy - w.wy;
        const dist = Math.hypot(dx, dy);
        if (dist < 0.16) {
          w.wx = w.targetWx;
          w.wy = w.targetWy;
          const iso = worldToIso(w.wx, w.wy);
          w.sprite.setPosition(iso.x, iso.y).setDepth(iso.y + 4);

          if (w.state === 'returning') {
            w.state = 'idle';
            w.restTimer = Math.max(0.6, 1.4 - ((empRec?.level ?? 1) - 1) * 0.15);
            w.sprite.play(`${w.role}_idle`, true);
          } else if (w.targetSlotId || w.id !== 'attendant') {
            w.state = 'working';
            w.workTimer = w.pendingDuration;
            w.sprite.play(`${w.role}_work`, true);
            if (w.id === 'attendant' && w.targetSlotId) {
              const slot = this.pumpSlots.find((s) => s.id === w.targetSlotId);
              const car = slot?.assignedCar;
              if (slot && car && car.fuelNeeded > 0) {
                const totalPayment = calculateServiceCoins(
                  'fuel',
                  car.payoutCoins,
                  this.upgradesData,
                  this.unlockedBusinesses,
                  true
                );
                this.activeFuelSessions.set('worker_attendant', {
                  sessionId: `worker_${slot.id}_${car.id}`,
                  pumpLabel: slot.label,
                  byWorker: true,
                  targetLitres: car.fuelNeeded,
                  totalPayment,
                  pricePerLitre: totalPayment / Math.max(1, car.fuelNeeded),
                  pct: 0,
                  source: 'worker',
                });
                this.completedFuelHoldTimer = 0;
                this.emitLiveFuelState(true);
              }
            }
          } else {
            w.state = 'idle';
            w.sprite.play(`${w.role}_idle`, true);
          }
          return;
        }

        const moveSpeed = (w.state === 'returning' ? 1.95 : 2.1) * speedMult;
        w.wx += (dx / dist) * moveSpeed * dt;
        w.wy += (dy / dist) * moveSpeed * dt;
        const iso = worldToIso(w.wx, w.wy);
        w.sprite.setFlipX(iso.x < w.sprite.x);
        w.sprite.setPosition(iso.x, iso.y).setDepth(iso.y + 4);
        if (w.sprite.anims.currentAnim?.key !== `${w.role}_walk`) {
          w.sprite.play(`${w.role}_walk`, true);
        }
        return;
      }

      if (w.restTimer > 0) {
        w.restTimer -= dt;
        return;
      }

      if (w.id === 'attendant') {
        const readyPump = this.pumpSlots.find(
          (s) =>
            this.unlockedBusinesses.has(s.businessId) &&
            s.assignedCar &&
            s.assignedCar.state === 'WAITING_FOR_SERVICE'
        );
        if (readyPump && readyPump.assignedCar) {
          readyPump.assignedCar.state = 'REFUELING';
          readyPump.assignedCar.stateElapsed = 0;
          w.targetSlotId = readyPump.id;
          w.targetWx = readyPump.interactWx;
          w.targetWy = readyPump.interactWy;
          const speedPenalty = Math.max(0.7, 1 - (this.upgradesData.pumpSpeedLevel - 1) * 0.08);
          w.pendingDuration = (2.2 + readyPump.assignedCar.fuelNeeded * 0.07) * speedPenalty;
          w.state = 'moving';
        }
      } else if (w.id === 'cashier' && this.shopCustomerReady && this.unlockedBusinesses.has('shop')) {
        w.targetSlotId = 'shop';
        w.targetWx = 6.6;
        w.targetWy = 4.2;
        w.pendingDuration = Math.max(1.4, 2.9 - (this.upgradesData.shopStockLevel - 1) * 0.18);
        w.state = 'moving';
      } else if (
        w.id === 'washer' &&
        this.washCustomerReady &&
        this.washSupplies >= 10 &&
        this.unlockedBusinesses.has('car_wash')
      ) {
        w.targetSlotId = 'car_wash';
        w.targetWx = 9.0;
        w.targetWy = 7.8;
        w.pendingDuration = 4.6;
        w.state = 'moving';
      } else if (
        w.id === 'housekeeper' &&
        (this.roomCustomerReady || (this.roomNeedsClean && this.roomCooldown <= 0)) &&
        this.unlockedBusinesses.has('rooms')
      ) {
        w.targetSlotId = 'rooms';
        w.targetWx = 10.9;
        w.targetWy = 3.5;
        w.pendingDuration = this.roomNeedsClean ? 4.2 : 3.2;
        w.state = 'moving';
      } else if (w.id === 'delivery') {
        w.deliveryTimer -= dt * speedMult;
        if (w.deliveryTimer <= 0) {
          w.deliveryTimer = 26;
          w.targetSlotId = 'fuel_tank';
          w.targetWx = 0.0;
          w.targetWy = 2.8;
          w.pendingDuration = 3.6;
          w.state = 'moving';
          w.sprite.play(`${w.role}_carry`, true);
        }
      }
    });
  }

  private finishWorkerJob(w: ActiveWorkerEntity): void {
    const returnToHome = () => {
      const distHome = Math.hypot(w.homeWx - w.wx, w.homeWy - w.wy);
      if (distHome > 0.25) {
        w.targetWx = w.homeWx;
        w.targetWy = w.homeWy;
        w.state = 'returning';
      } else {
        w.state = 'idle';
        w.restTimer = 0.9;
        w.sprite.play(`${w.role}_idle`, true);
      }
    };

    if (w.id === 'attendant' && w.targetSlotId) {
      const workerFuelSession = this.activeFuelSessions.get('worker_attendant');
      this.activeFuelSessions.delete('worker_attendant');
      const empRec = this.employeesData.find((e) => e.id === w.id);
      const workerLevel = empRec?.level ?? 1;
      const slot = this.pumpSlots.find((s) => s.id === w.targetSlotId);
      const car = slot?.assignedCar;
      if (slot && car && car.state === 'REFUELING' && !car.hasPaid) {
        const fuelPrice = workerFuelSession?.pricePerLitre ?? this.pricingData.fuelPricePerLitre;
        const fuelTotal = calculateFuelPayment(car.fuelNeeded, fuelPrice);
        const prompt: ActiveServicePrompt = {
          zoneId: slot.id,
          title: slot.label,
          actionLabel: 'Worker Refuel',
          category: 'fuel',
          rewardCoins: fuelTotal,
          rewardXp: 150,
          fuelCost: car.fuelNeeded,
          fuelPricePerLitre: fuelPrice,
          ready: true,
        };
        if (this.callbacks.onServiceExecute(prompt, true)) {
          if (workerFuelSession) {
            this.lastCompletedFuel = {
              sessionId: workerFuelSession.sessionId,
              pumpLabel: workerFuelSession.pumpLabel,
              byWorker: true,
              pricePerLitre: workerFuelSession.pricePerLitre,
              litresFilled: workerFuelSession.targetLitres,
              targetLitres: workerFuelSession.targetLitres,
              totalAmount: workerFuelSession.totalPayment,
              status: 'completed',
            };
            this.completedFuelHoldTimer = 3.2;
          }
          this.applyCompletedServiceVisuals(prompt, w.sprite.x, w.sprite.y, true, workerLevel);
        } else {
          car.state = 'WAITING_FOR_SERVICE';
          car.stateElapsed = 0;
        }
      }
      this.emitLiveFuelState(true);
      w.targetSlotId = undefined;
      returnToHome();
    } else if (w.id === 'cashier' && this.shopCustomerReady) {
      const empRec = this.employeesData.find((e) => e.id === w.id);
      const workerLevel = empRec?.level ?? 1;
      const basket =
        this.shopCustomerBasket.length > 0
          ? this.shopCustomerBasket
          : generateShopBasket(
              this.upgradesData.shopStockLevel,
              this.unlockedBusinesses.has('shop_deluxe')
            );
      const saleCoins = calculateShopBasketTotal(basket, this.pricingData);
      const prompt: ActiveServicePrompt = {
        zoneId: 'shop',
        title: 'Convenience Shop',
        actionLabel: 'Cashier Sale',
        category: 'shop',
        rewardCoins: saleCoins,
        rewardXp: 120,
        fuelCost: 0,
        shopStockCost: 1,
        shopBasket: basket,
        ready: true,
      };
      if (this.callbacks.onServiceExecute(prompt, true)) {
        this.applyCompletedServiceVisuals(prompt, w.sprite.x, w.sprite.y, true, workerLevel);
      }
      returnToHome();
    } else if (w.id === 'washer' && this.washCustomerReady && this.washSupplies >= 10) {
      const prompt: ActiveServicePrompt = {
        zoneId: 'car_wash',
        title: 'Car Wash',
        actionLabel: 'Worker Wash',
        category: 'wash',
        rewardCoins: 40,
        rewardXp: 14,
        fuelCost: 0,
        washSupplyCost: 10,
        ready: true,
      };
      if (this.callbacks.onServiceExecute(prompt, true)) {
        this.washBoostTimer = 1.6;
        this.applyCompletedServiceVisuals(prompt, w.sprite.x, w.sprite.y, true);
      }
      returnToHome();
    } else if (w.id === 'housekeeper' && this.roomNeedsClean && this.roomCooldown <= 0) {
      const prompt: ActiveServicePrompt = {
        zoneId: 'rooms',
        title: 'Rooms for Rent',
        actionLabel: 'Housekeeper Clean',
        category: 'rooms',
        rewardCoins: 10,
        rewardXp: 8,
        fuelCost: 0,
        isRoomClean: true,
        ready: true,
      };
      if (this.callbacks.onServiceExecute(prompt, true)) {
        this.applyCompletedServiceVisuals(prompt, w.sprite.x, w.sprite.y, true);
      }
      returnToHome();
    } else if (w.id === 'housekeeper' && this.roomCustomerReady) {
      const prompt: ActiveServicePrompt = {
        zoneId: 'rooms',
        title: 'Rooms for Rent',
        actionLabel: 'Worker Check-In',
        category: 'rooms',
        rewardCoins: 62,
        rewardXp: 18,
        fuelCost: 0,
        isRoomClean: false,
        ready: true,
      };
      if (this.callbacks.onServiceExecute(prompt, true)) {
        this.applyCompletedServiceVisuals(prompt, w.sprite.x, w.sprite.y, true);
      }
      returnToHome();
    } else if (w.id === 'delivery') {
      const prompt: ActiveServicePrompt = {
        zoneId: 'fuel_tank',
        title: 'Wholesale Supply Delivery',
        actionLabel: 'Wholesale Restock',
        category: 'supply',
        rewardCoins: -42,
        rewardXp: 6,
        fuelCost: -80,
        shopStockCost: -3,
        ready: true,
      };
      if (this.callbacks.onServiceExecute(prompt, true)) {
        this.spawnFloatingText(
          w.sprite.x,
          w.sprite.y - 62,
          '+80L · +3 Stock (-$42)',
          '#FACC15'
        );
      }
      returnToHome();
    } else {
      returnToHome();
    }
  }

  private resolveVehicleOverlap(): void {
    for (const car of this.customerCars) {
      if (car.state === 'EXITED' || car.state === 'SPAWNING') continue;
      if (
        this.playerWx >= car.wx - 0.5 &&
        this.playerWx <= car.wx + 0.5 &&
        this.playerWy >= car.wy - 0.3 &&
        this.playerWy <= car.wy + 0.3
      ) {
        const pushWy = this.playerWy < car.wy ? car.wy - 0.36 : car.wy + 0.36;
        if (!this.isStaticBlocked(this.playerWx, pushWy)) {
          this.playerWy = pushWy;
          const iso = worldToIso(this.playerWx, this.playerWy);
          this.player.setPosition(iso.x, iso.y).setDepth(iso.y + 4);
        }
      }
    }
  }

  private isStaticBlocked(wx: number, wy: number): boolean {
    for (const c of this.colliders) {
      if (wx >= c.minX && wx <= c.maxX && wy >= c.minY && wy <= c.maxY) {
        return true;
      }
    }
    return false;
  }

  private isBlocked(wx: number, wy: number): boolean {
    if (this.isStaticBlocked(wx, wy)) return true;
    for (const car of this.customerCars) {
      if (car.state === 'EXITED' || car.state === 'SPAWNING') continue;
      if (
        wx >= car.wx - 0.52 &&
        wx <= car.wx + 0.52 &&
        wy >= car.wy - 0.32 &&
        wy <= car.wy + 0.32
      ) {
        return true;
      }
    }
    return false;
  }

  private updateAmbientTraffic(dt: number): void {
    for (const car of this.trafficCars) {
      let blockedAhead = false;

      if (car.axis === 'x') {
        // Yield to nearby customer vehicles or same-lane traffic ahead
        for (const other of this.trafficCars) {
          if (other === car || other.axis !== 'x' || Math.abs(other.wy - car.wy) > 0.6) continue;
          const fwd = (other.wx - car.wx) * car.dir;
          if (fwd > 0.2 && fwd < 2.6) {
            blockedAhead = true;
            break;
          }
        }
        if (!blockedAhead && car.dir === 1 && Math.abs(car.wy - 12.25) < 0.7) {
          for (const cust of this.customerCars) {
            if (cust.state === 'EXITED' || cust.state === 'SPAWNING') continue;
            if (Math.abs(cust.wy - car.wy) < 0.85) {
              const fwd = cust.wx - car.wx;
              if (fwd > 0.2 && fwd < 2.6) {
                blockedAhead = true;
                break;
              }
            }
          }
          if (
            !blockedAhead &&
            (this.washCarState === 'entering' || this.washCarState === 'exiting') &&
            Math.abs(this.washCarWy - car.wy) < 0.85
          ) {
            const fwd = this.washCarWx - car.wx;
            if (fwd > 0.2 && fwd < 2.6) blockedAhead = true;
          }
        }

        if (!blockedAhead) {
          car.wx += car.dir * car.speed * dt;
          if (car.dir === 1 && car.wx > 52) car.wx = -32;
          if (car.dir === -1 && car.wx < -32) car.wx = 52;
        }
      } else {
        car.wy += car.dir * car.speed * dt;
        if (car.dir === 1 && car.wy > 42) car.wy = -28;
        if (car.dir === -1 && car.wy < -28) car.wy = 42;
      }

      const pos = worldToIso(car.wx, car.wy);
      car.sprite.setPosition(pos.x, pos.y).setDepth(pos.y + 8);
    }
  }

  private updateAmbientCustomers(dt: number): void {
    for (const npc of this.customerNpcs) {
      if (npc.pauseTimer > 0) {
        npc.pauseTimer -= dt;
        if (npc.sprite.anims.currentAnim?.key !== `${npc.role}_idle`) {
          npc.sprite.play(`${npc.role}_idle`, true);
        }
        continue;
      }

      const target = npc.waypoints[npc.wpIndex];
      const curGrid = isoToWorld(npc.sprite.x, npc.sprite.y);
      const dx = target.x - curGrid.x;
      const dy = target.y - curGrid.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 0.14) {
        npc.wpIndex = (npc.wpIndex + 1) % npc.waypoints.length;
        npc.pauseTimer = 1.6 + Math.random() * 2.4;
        continue;
      }

      const nx = curGrid.x + (dx / dist) * npc.speed * dt;
      const ny = curGrid.y + (dy / dist) * npc.speed * dt;
      const iso = worldToIso(nx, ny);
      npc.sprite.setFlipX(iso.x < npc.sprite.x);
      npc.sprite.setPosition(iso.x, iso.y).setDepth(iso.y + 3);
      if (npc.sprite.anims.currentAnim?.key !== `${npc.role}_walk`) {
        npc.sprite.play(`${npc.role}_walk`, true);
      }
    }
  }

  private updateCarWashEffects(dt: number): void {
    if (!this.unlockedBusinesses.has('car_wash')) return;

    if (
      (this.washCarState === 'entering' || this.washCarState === 'exiting') &&
      this.washCarWaypoints.length > 0
    ) {
      const target = this.washCarWaypoints[0];
      const dx = target.x - this.washCarWx;
      const dy = target.y - this.washCarWy;
      const dist = Math.hypot(dx, dy);
      const speed = this.washCarState === 'exiting' ? 2.8 : 2.1;

      if (dist < 0.14) {
        this.washCarWx = target.x;
        this.washCarWy = target.y;
        this.washCarWaypoints.shift();
        if (this.washCarWaypoints.length === 0) {
          if (this.washCarState === 'entering') {
            this.washCarState = 'waiting';
            this.washCarAngle = -0.46365;
            this.washCar
              .setTexture(`veh_${this.washCarType}_ne`)
              .setFlipX(false)
              .setRotation(0);
            this.washCustomerReady = true;
            this.washReadyBadge.setVisible(true);
          } else {
            this.washCarState = 'hidden';
            this.washCar.setVisible(false);
          }
        }
      } else {
        this.washCarWx += (dx / dist) * speed * dt;
        this.washCarWy += (dy / dist) * speed * dt;
        this.washCarAngle = this.applyIsoVehicleOrientation(
          this.washCar,
          this.washCarType,
          this.washCarAngle,
          dx,
          dy,
          dt
        );
      }

      const iso = worldToIso(this.washCarWx, this.washCarWy);
      const depth =
        this.washCarWx >= 9.6 && this.washCarWy <= 8.6 ? worldToIso(10.6, 7.4).y + 4 : iso.y + 8;
      this.washCar.setPosition(iso.x, iso.y).setDepth(depth);
    }

    if (this.washBoostTimer > 0) {
      this.washBoostTimer -= dt;
      this.washBrushes.forEach((b) => (b.anims.timeScale = 2.8));
      this.washCar.setScale(1 + Math.sin(this.washBoostTimer * 18) * 0.018);
    } else {
      this.washBrushes.forEach((b) => (b.anims.timeScale = 0.85));
      this.washCar.setScale(1);
    }

    if (this.washCarState === 'waiting' || this.washBoostTimer > 0) {
      this.washFoamTimer -= dt;
      if (this.washFoamTimer <= 0) {
        const hasPro = this.unlockedBusinesses.has('wash_pro');
        this.washFoamTimer = this.washBoostTimer > 0 ? (hasPro ? 0.045 : 0.07) : 0.35;
        const rx = this.washCar.x + Phaser.Math.Between(-24, 24);
        const ry = this.washCar.y + Phaser.Math.Between(-14, 14);
        const bubble = this.add
          .image(rx, ry, 'foam_bubble')
          .setDepth(this.washCar.depth + 20)
          .setScale(Phaser.Math.FloatBetween(0.45, hasPro ? 1.1 : 0.95));

        this.tweens.add({
          targets: bubble,
          y: ry - Phaser.Math.Between(16, 30),
          alpha: 0,
          scale: 0.2,
          duration: 750,
          onComplete: () => bubble.destroy(),
        });
      }
    }
  }

  private evaluateProximityPrompts(): void {
    let best: ActiveServicePrompt | null = null;
    let bestAnchor: Vec2 | null = null;
    let bestDist = Infinity;

    for (const slot of this.pumpSlots) {
      const isUnlocked = this.unlockedBusinesses.has(slot.businessId);
      if (!isUnlocked) continue;
      const car = slot.assignedCar;
      if (!car || car.state !== 'WAITING_FOR_SERVICE') continue;

      const d = Math.hypot(this.playerWx - slot.interactWx, this.playerWy - slot.interactWy);
      if (d < 1.95 && d < bestDist) {
        bestDist = d;
        bestAnchor = worldToIso(slot.carWx, slot.carWy - 0.5);
        const fuelPrice = this.pricingData.fuelPricePerLitre;
        best = {
          zoneId: slot.id,
          title: `${slot.label} · ${car.fuelNeeded}L`,
          actionLabel: `⛽ Refuel (${car.fuelNeeded}L)`,
          category: 'fuel',
          rewardCoins: calculateFuelPayment(car.fuelNeeded, fuelPrice),
          rewardXp: 150,
          fuelCost: car.fuelNeeded,
          fuelPricePerLitre: fuelPrice,
          ready: true,
          durationSec: Math.max(0.75, 2.2 - (this.upgradesData.pumpSpeedLevel - 1) * 0.24),
        };
      }
    }

    const dShop = Math.hypot(this.playerWx - 6.6, this.playerWy - 4.3);
    if (dShop < 1.95 && dShop < bestDist && this.unlockedBusinesses.has('shop')) {
      bestDist = dShop;
      bestAnchor = worldToIso(6.6, 3.8);
      const previewBasketTotal =
        this.shopCustomerReady && this.shopCustomerBasket.length > 0
          ? calculateShopBasketTotal(this.shopCustomerBasket, this.pricingData)
          : 0;
      best = {
        zoneId: 'shop',
        title: this.unlockedBusinesses.has('shop_deluxe') ? 'Supermart Shop' : 'Convenience Shop',
        actionLabel: this.shopCustomerReady
          ? `🛒 Checkout ($${previewBasketTotal.toFixed(2)})`
          : 'Waiting for Buyer',
        category: 'shop',
        rewardCoins: previewBasketTotal,
        rewardXp: 120,
        fuelCost: 0,
        shopStockCost: 1,
        shopBasket: this.shopCustomerBasket,
        ready: this.shopCustomerReady,
        durationSec: 1.25,
      };
    }

    const dWash = Math.hypot(this.playerWx - 9.0, this.playerWy - 7.8);
    if (dWash < 2.05 && dWash < bestDist && this.unlockedBusinesses.has('car_wash')) {
      bestDist = dWash;
      bestAnchor = worldToIso(9.5, 7.6);
      const lowSoap = this.washSupplies < 10;
      const hasPro = this.unlockedBusinesses.has('wash_pro');
      if (lowSoap) {
        best = {
          zoneId: 'car_wash',
          title: `Car Wash (${this.washSupplies} Soap)`,
          actionLabel: '🧴 Refill Soap ($45)',
          category: 'wash',
          rewardCoins: -45,
          rewardXp: 4,
          fuelCost: 0,
          washSupplyCost: -50,
          ready: true,
          durationSec: 1.0,
        };
      } else {
        best = {
          zoneId: 'car_wash',
          title: hasPro ? 'Hydro-Jet Wash' : 'Car Wash Bay',
          actionLabel: this.washCustomerReady
            ? `🧽 Wash Car (${this.washSupplies}% Soap)`
            : this.washCarState === 'entering'
              ? 'Car Pulling In...'
              : 'Bay Drying...',
          category: 'wash',
          rewardCoins: 40,
          rewardXp: 14,
          fuelCost: 0,
          washSupplyCost: 10,
          ready: this.washCustomerReady,
          durationSec: hasPro ? 1.5 : 2.2,
        };
      }
    }

    const dRooms = Math.hypot(this.playerWx - 10.9, this.playerWy - 3.6);
    if (dRooms < 2.1 && dRooms < bestDist && this.unlockedBusinesses.has('rooms')) {
      bestDist = dRooms;
      bestAnchor = worldToIso(11.1, 3.2);
      const readyToClean = this.roomNeedsClean && this.roomCooldown <= 0;
      if (readyToClean) {
        best = {
          zoneId: 'rooms',
          title: 'Rooms Maintenance',
          actionLabel: '🧹 Clean Room',
          category: 'rooms',
          rewardCoins: 10,
          rewardXp: 8,
          fuelCost: 0,
          isRoomClean: true,
          ready: true,
          durationSec: 1.35,
        };
      } else {
        best = {
          zoneId: 'rooms',
          title: this.unlockedBusinesses.has('rooms_wing') ? 'Executive Motel' : 'Rooms for Rent',
          actionLabel: this.roomCustomerReady ? '🔑 Rent Room' : 'Rooms Occupied',
          category: 'rooms',
          rewardCoins: 62,
          rewardXp: 18,
          fuelCost: 0,
          isRoomClean: false,
          ready: this.roomCustomerReady,
          durationSec: 1.4,
        };
      }
    }

    const dTank = Math.hypot(this.playerWx - 0.1, this.playerWy - 2.6);
    if (dTank < 1.9 && dTank < bestDist) {
      bestAnchor = worldToIso(-1.1, 2.2);
      best = {
        zoneId: 'fuel_tank',
        title: 'Fuel Storage Tank',
        actionLabel: this.tankCooldown > 0 ? 'Refilling...' : '🛢️ Buy +250L ($110)',
        category: 'supply',
        rewardCoins: -110,
        rewardXp: 4,
        fuelCost: -250,
        ready: this.tankCooldown <= 0,
        durationSec: 1.1,
      };
    }

    if (best && best.ready && bestAnchor && !this.activeChannel) {
      this.worldPromptContainer.setPosition(bestAnchor.x, bestAnchor.y - 78).setVisible(true);
      this.worldPromptText.setText(best.actionLabel);
      this.worldPromptBg.setFillStyle(0xfffdf7, 0.96).setStrokeStyle(2, 0xf59e0b);
    } else {
      this.worldPromptContainer.setVisible(false);
    }

    const key = best ? `${best.zoneId}:${best.ready}:${best.actionLabel}` : '';
    if (key !== this.lastPromptKey) {
      this.lastPromptKey = key;
      this.currentPrompt = best;
      this.callbacks.onPromptChange(best);
    }
  }

  private spawnFloatingText(x: number, y: number, message: string, color: string): void {
    const txt = this.add
      .text(x, y, message, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color,
        stroke: '#1E1B18',
        strokeThickness: 4,
      })
      .setOrigin(0.5, 0.5)
      .setDepth(5400);

    this.tweens.add({
      targets: txt,
      y: y - 42,
      alpha: 0,
      duration: 1250,
      ease: 'Cubic.easeOut',
      onComplete: () => txt.destroy(),
    });
  }
}
