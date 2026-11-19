/**
 * Visual Design System extracted from the reference artwork + warm cream HUD palette.
 */
export const PALETTE = {
  // Brand & Buildings
  GAS_RED: '#E02424',
  GAS_RED_DARK: '#A51414',
  GAS_RED_LIGHT: '#F87171',
  GAS_YELLOW: '#FFC815',
  GAS_YELLOW_DARK: '#D99B00',

  CANOPY_ROOF: '#C2D1E0',
  CANOPY_ROOF_SHADE: '#8FA2B8',
  CANOPY_PILLAR: '#F4F6F8',
  CANOPY_PILLAR_SHADE: '#CBD5E1',

  SHOP_WALL: '#F2EBE0',
  SHOP_WALL_SHADE: '#D6CCBC',
  SHOP_GLASS: '#74B8DC',
  SHOP_GLASS_HIGHLIGHT: '#BEE6FA',
  HVAC_METAL: '#B5AEA2',
  HVAC_METAL_SHADE: '#8E877B',

  ROOMS_WALL: '#EADEC9',
  ROOMS_WALL_SHADE: '#CBBBA2',
  ROOMS_ROOF: '#4E4A46',
  ROOMS_ROOF_SHADE: '#363330',
  ROOMS_BLUE: '#1E56C2',
  ROOMS_BLUE_DARK: '#153B82',
  DOOR_WOOD: '#74482D',
  DOOR_WOOD_LIGHT: '#935F3F',

  CARWASH_BLUE: '#1E73E8',
  CARWASH_BLUE_DARK: '#1351AC',
  CARWASH_TEAL: '#14A3CC',
  CARWASH_CYAN: '#38BDF8',
  CARWASH_FOAM: '#E0F2FE',

  // Ground, Roads & Nature
  GRASS_BASE: '#58B33A',
  GRASS_LIGHT: '#74CD52',
  GRASS_DARK: '#3E8C25',
  HEDGE_LIGHT: '#5BB63E',
  HEDGE_DARK: '#2F701C',

  ASPHALT_BASE: '#4B525C',
  ASPHALT_DARK: '#3A4049',
  ASPHALT_LIGHT: '#5E6673',
  SIDEWALK_TOP: '#DDD7CA',
  SIDEWALK_SIDE: '#B5AD9E',
  ROAD_YELLOW: '#F6BD2D',
  ROAD_WHITE: '#EEF1F4',

  FENCE_STONE: '#CCBFA6',
  FENCE_STONE_SHADE: '#9F9178',
  WOOD_WARM: '#9E663D',
  WOOD_DARK: '#6E4224',

  // Lighting & Shadows
  SHADOW_COLOR: 'rgba(15, 23, 42, 0.30)',
  SHADOW_SOFT: 'rgba(15, 23, 42, 0.18)',
  OUTLINE_DARK: '#1E293B',

  // Cream UI Palette
  CREAM_BG: '#FAF3E3',
  CREAM_CARD: '#FFFDF7',
  CREAM_BORDER: '#D6C4A3',
  CREAM_SHADOW: '#B9A37E',
  INK_BROWN: '#2E221D',
  INK_MUTED: '#6B5A4E',

  // Vehicles
  VEHICLES: {
    sedan_red: { primary: '#E12D2D', secondary: '#991B1B', highlight: '#FCA5A5' },
    sedan_white: { primary: '#F8FAFC', secondary: '#CBD5E1', highlight: '#FFFFFF' },
    car_blue: { primary: '#2563EB', secondary: '#1D4ED8', highlight: '#60A5FA' },
    car_yellow: { primary: '#FACC15', secondary: '#CA8A04', highlight: '#FEF08A' },
    suv_green: { primary: '#65A30D', secondary: '#3F6212', highlight: '#A3E635' },
    van_white: { primary: '#F1F5F9', secondary: '#94A3B8', highlight: '#FFFFFF' },
    suv_black: { primary: '#27272A', secondary: '#09090B', highlight: '#52525B' },
    hatch_orange: { primary: '#EA580C', secondary: '#9A3412', highlight: '#FB923C' },
    truck_delivery: { primary: '#E2E8F0', secondary: '#94A3B8', highlight: '#F8FAFC' },
    motorcycle: { primary: '#EF4444', secondary: '#7F1D1D', highlight: '#FCA5A5' },
  },
} as const;
