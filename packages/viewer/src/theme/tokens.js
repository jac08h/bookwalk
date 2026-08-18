// Nine semantic token groups collapsing ~120 colour literals from the ported
// source (PLAN.md §7). Every builder/texture function takes `theme` as its
// first argument instead of hard-coding hex/hsl literals.

export const READING_ROOM = {
  wood: { hex: 0x33200f, tint: 0xffffff, grainHue: 22, grainSat: 42 },
  woodDark: { hex: 0x120a05 },
  floor: { hue: 20, sat: 34 },
  rug: { base: "hsl(352, 34%, 12%)", stripeGilt: "rgba(198, 160, 92, 0.4)", stripeDark: "rgba(96, 32, 36, 0.9)" },
  plaster: { hex: 0x5a4630, tint: 0xa9855c, emissive: 0x1d0f06 },
  wainscot: { hex: 0x2a1a0d, tint: 0xffffff, emissive: 0x150c05 },
  metal: { brass: 0x8a6836, gilt: 0xc79a4e, giltEmissive: 0x1a1004 },
  light: {
    fogColor: 0x120c08,
    fogDensity: 0.028,
    ambientSky: 0x8a94a6,
    ambientGround: 0x2a1f14,
    ambientIntensity: 2.1,
    fillColor: 0xffe9cf,
    fillIntensity: 0.35,
    pendantColor: 0xffb46a,
    lampColor: 0xffc588,
    exposure: 1.3,
    bloomStrength: 0.55,
  },
  spines: [
    { h: 355, s: 42, l: 26 },
    { h: 342, s: 34, l: 24 },
    { h: 18, s: 40, l: 24 },
    { h: 32, s: 44, l: 30 },
    { h: 96, s: 22, l: 22 },
    { h: 168, s: 24, l: 20 },
    { h: 214, s: 30, l: 24 },
    { h: 268, s: 20, l: 24 },
  ],
};

export const NORDIC = {
  wood: { hex: 0x9c8564, tint: 0xffffff, grainHue: 34, grainSat: 22 },
  woodDark: { hex: 0x3a3128 },
  floor: { hue: 36, sat: 14 },
  rug: { base: "hsl(206, 20%, 30%)", stripeGilt: "rgba(210, 214, 220, 0.5)", stripeDark: "rgba(60, 76, 92, 0.7)" },
  plaster: { hex: 0xd8d2c4, tint: 0xe8e2d4, emissive: 0x3a382e },
  wainscot: { hex: 0xb8a586, tint: 0xffffff, emissive: 0x2c2820 },
  metal: { brass: 0x9aa4ac, gilt: 0xc6ccd0, giltEmissive: 0x1a1c1e },
  light: {
    fogColor: 0xd6d8dc,
    fogDensity: 0.02,
    ambientSky: 0xdfe6ee,
    ambientGround: 0x9aa0a8,
    ambientIntensity: 2.6,
    fillColor: 0xeaf0f8,
    fillIntensity: 0.55,
    pendantColor: 0xcfe0f0,
    lampColor: 0xdcE8f4,
    exposure: 1.15,
    bloomStrength: 0.32,
  },
  spines: [
    { h: 206, s: 20, l: 32 },
    { h: 24, s: 24, l: 34 },
    { h: 40, s: 18, l: 40 },
    { h: 0, s: 0, l: 30 },
    { h: 168, s: 14, l: 28 },
    { h: 350, s: 18, l: 32 },
    { h: 220, s: 12, l: 26 },
    { h: 60, s: 10, l: 36 },
  ],
};

export const STUDY = {
  wood: { hex: 0x140d08, tint: 0xffffff, grainHue: 20, grainSat: 30 },
  woodDark: { hex: 0x0a0603 },
  floor: { hue: 18, sat: 20 },
  rug: { base: "hsl(150, 30%, 9%)", stripeGilt: "rgba(150, 170, 150, 0.3)", stripeDark: "rgba(20, 50, 30, 0.9)" },
  plaster: { hex: 0x241c14, tint: 0x453a28, emissive: 0x0c0904 },
  wainscot: { hex: 0x120c06, tint: 0xffffff, emissive: 0x080502 },
  metal: { brass: 0x5a6b52, gilt: 0x7a9070, giltEmissive: 0x0a1208 },
  light: {
    fogColor: 0x06080a,
    fogDensity: 0.05,
    ambientSky: 0x3a4a44, ambientGround: 0x0e1410,
    ambientIntensity: 1.3,
    fillColor: 0xaad4c0,
    fillIntensity: 0.18,
    pendantColor: 0x6f9a7c,
    lampColor: 0x7ab08a,
    exposure: 1.05,
    bloomStrength: 0.42,
  },
  spines: [
    { h: 150, s: 28, l: 16 },
    { h: 0, s: 0, l: 12 },
    { h: 40, s: 20, l: 16 },
    { h: 210, s: 22, l: 16 },
    { h: 100, s: 18, l: 14 },
    { h: 340, s: 20, l: 15 },
    { h: 20, s: 24, l: 15 },
    { h: 260, s: 16, l: 15 },
  ],
};

export const ATRIUM = {
  wood: { hex: 0xc8bfae, tint: 0xffffff, grainHue: 40, grainSat: 14 },
  woodDark: { hex: 0x5a5348 },
  floor: { hue: 42, sat: 10 },
  rug: { base: "hsl(38, 18%, 42%)", stripeGilt: "rgba(230, 224, 210, 0.5)", stripeDark: "rgba(150, 130, 100, 0.6)" },
  plaster: { hex: 0xe8e2d4, tint: 0xf2ede0, emissive: 0x3e3a2e },
  wainscot: { hex: 0xcabfa8, tint: 0xffffff, emissive: 0x2e2a1e },
  metal: { brass: 0xb0a58c, gilt: 0xd0c4a4, giltEmissive: 0x241f14 },
  light: {
    fogColor: 0xe8e4d8,
    fogDensity: 0.012,
    ambientSky: 0xf4f0e4, ambientGround: 0xc4bca8,
    ambientIntensity: 3.0,
    fillColor: 0xfff6e4,
    fillIntensity: 0.7,
    pendantColor: 0xffe8c0,
    lampColor: 0xffecc8,
    exposure: 1.35,
    bloomStrength: 0.28,
  },
  spines: [
    { h: 38, s: 26, l: 40 },
    { h: 24, s: 22, l: 36 },
    { h: 0, s: 0, l: 32 },
    { h: 200, s: 14, l: 36 },
    { h: 90, s: 12, l: 32 },
    { h: 350, s: 16, l: 38 },
    { h: 50, s: 20, l: 42 },
    { h: 220, s: 10, l: 30 },
  ],
};

export const ARCHIVE = {
  wood: { hex: 0x3e4044, tint: 0xffffff, grainHue: 210, grainSat: 6 },
  woodDark: { hex: 0x18191b },
  floor: { hue: 210, sat: 6 },
  rug: { base: "hsl(210, 8%, 20%)", stripeGilt: "rgba(200, 205, 210, 0.35)", stripeDark: "rgba(40, 44, 48, 0.85)" },
  plaster: { hex: 0x6a6e72, tint: 0x8a8e92, emissive: 0x1a1c1e },
  wainscot: { hex: 0x2e3134, tint: 0xffffff, emissive: 0x0e1012 },
  metal: { brass: 0x8a9096, gilt: 0xaab0b6, giltEmissive: 0x14181a },
  light: {
    fogColor: 0x24272a,
    fogDensity: 0.032,
    ambientSky: 0x9aa2a8, ambientGround: 0x3a3e42,
    ambientIntensity: 2.0,
    fillColor: 0xd4dce2,
    fillIntensity: 0.4,
    pendantColor: 0xb8c4cc,
    lampColor: 0xc0ccd4,
    exposure: 1.15,
    bloomStrength: 0.3,
  },
  spines: [
    { h: 210, s: 8, l: 20 },
    { h: 0, s: 0, l: 16 },
    { h: 220, s: 10, l: 24 },
    { h: 200, s: 6, l: 28 },
    { h: 0, s: 0, l: 22 },
    { h: 190, s: 8, l: 18 },
    { h: 230, s: 6, l: 20 },
    { h: 0, s: 0, l: 26 },
  ],
};

export const PRESETS = {
  "reading-room": { id: "reading-room", name: "Reading Room", theme: READING_ROOM },
  nordic: { id: "nordic", name: "Nordic", theme: NORDIC },
  study: { id: "study", name: "Study", theme: STUDY },
  atrium: { id: "atrium", name: "Atrium", theme: ATRIUM },
  archive: { id: "archive", name: "Archive", theme: ARCHIVE },
};

export const DEFAULT_PRESET_ID = "reading-room";

export function themeFromPresetId(presetId) {
  return (PRESETS[presetId] || PRESETS[DEFAULT_PRESET_ID]).theme;
}
