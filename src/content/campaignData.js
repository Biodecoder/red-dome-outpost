// ============================================================================
// RED DOME OUTPOST — Campaign, Building, Grid & Hazard Definitions
// ============================================================================

export const DOME_TIERS = {
  1: {
    tier: 1,
    name: "MK1 Starter Dome",
    shortLabel: "MK1",
    domeRadius: 7.4,
    domeHeight: 5.4,
    collarTubeRadius: 0.34,
    interiorPlateCount: 8,
    exteriorPadCount: 8,
    upgradeCost: 140,
    maxIntegrity: 100,
    baseCrewCapacity: 4,
    basePower: 4.0,
    description: "Compact pressurized geodesic dome with 8 interior plates and 8 exterior sand pads.",
  },
  2: {
    tier: 2,
    name: "MK2 Outpost Dome",
    shortLabel: "MK2",
    domeRadius: 9.8,
    domeHeight: 7.0,
    collarTubeRadius: 0.4,
    interiorPlateCount: 16,
    exteriorPadCount: 13,
    upgradeCost: 260,
    maxIntegrity: 135,
    baseCrewCapacity: 6,
    basePower: 5.5,
    description: "Reinforced medium dome unlocking 16 interior plates and 13 outdoor sand pads.",
  },
  3: {
    tier: 3,
    name: "MK3 Red Dome Metropolis",
    shortLabel: "MK3",
    domeRadius: 12.0,
    domeHeight: 8.5,
    collarTubeRadius: 0.46,
    interiorPlateCount: 24,
    exteriorPadCount: 19,
    upgradeCost: 0,
    maxIntegrity: 180,
    baseCrewCapacity: 8,
    basePower: 7.5,
    description: "Sprawling MK3 colony dome with 24 interior plates and all 19 outdoor pads + rich ore seams.",
  },
};

// Generate the 24 interior square plates on a 5x5 grid around Central Hub (0,0)
// Rotated 45 degrees in world space to match the exact diamond alignment in screenshots.
export function generateInteriorPlates() {
  const spacing = 2.45;
  const cos45 = Math.SQRT1_2;
  const sin45 = Math.SQRT1_2;

  const coords = [
    // Ring 1: 8 MK1 starter plates (3x3 around hub)
    { gx: 0, gz: 1, minTier: 1 },   // Front-right (airlock exit plate)
    { gx: 1, gz: 0, minTier: 1 },   // Front-left
    { gx: 1, gz: 1, minTier: 1 },   // Front apex
    { gx: -1, gz: 1, minTier: 1 },  // Right
    { gx: 1, gz: -1, minTier: 1 },  // Left
    { gx: 0, gz: -1, minTier: 1 },  // Back-left
    { gx: -1, gz: 0, minTier: 1 },  // Back-right
    { gx: -1, gz: -1, minTier: 1 }, // Back apex

    // Ring 2A: +8 plates for MK2 (16 total)
    { gx: 2, gz: 0, minTier: 2 },
    { gx: 0, gz: 2, minTier: 2 },
    { gx: -2, gz: 0, minTier: 2 },
    { gx: 0, gz: -2, minTier: 2 },
    { gx: 2, gz: 1, minTier: 2 },
    { gx: 1, gz: 2, minTier: 2 },
    { gx: -1, gz: 2, minTier: 2 },
    { gx: 2, gz: -1, minTier: 2 },

    // Ring 2B: +8 plates for MK3 (24 total)
    { gx: -2, gz: 1, minTier: 3 },
    { gx: 1, gz: -2, minTier: 3 },
    { gx: -1, gz: -2, minTier: 3 },
    { gx: -2, gz: -1, minTier: 3 },
    { gx: 2, gz: 2, minTier: 3 },
    { gx: -2, gz: 2, minTier: 3 },
    { gx: 2, gz: -2, minTier: 3 },
    { gx: -2, gz: -2, minTier: 3 },
  ];

  return coords.map((c, idx) => {
    const rawX = c.gx * spacing;
    const rawZ = c.gz * spacing;
    const wx = (rawX - rawZ) * cos45;
    const wz = (rawX + rawZ) * sin45;
    return {
      id: `in_${idx}`,
      index: idx,
      zone: "interior",
      gx: c.gx,
      gz: c.gz,
      minTier: c.minTier,
      x: Number(wx.toFixed(3)),
      z: Number(wz.toFixed(3)),
    };
  });
}

// Generate the 19 outdoor hexagonal sand pads around the dome perimeter.
// Leaves an opening at angle ~ -2.15 rad (North-West / Top-Right depending on camera) for the Rocket Landing Pad.
export function generateExteriorPads() {
  const pads = [];
  // 19 angles distributed around the dome collar, skipping the rocket landing pad corridor
  const totalPads = 19;
  const startAngle = -1.22; // just clockwise of rocket pad
  const sweepAngle = Math.PI * 2 - 0.72; // leave gap for landing pad + ramp

  // Indices that unlock at each dome tier:
  // MK1: 8 evenly spaced pads
  // MK2: 13 pads
  // MK3: all 19 pads
  const mk1Set = new Set([0, 2, 4, 6, 8, 11, 14, 17]);
  const mk2Set = new Set([0, 1, 2, 4, 5, 6, 8, 9, 11, 13, 14, 16, 17]);
  const richOreIndices = new Set([2, 5, 8, 12, 15, 18]);

  for (let i = 0; i < totalPads; i++) {
    const t = i / (totalPads - 1);
    const angle = startAngle + t * sweepAngle;
    const minTier = mk1Set.has(i) ? 1 : mk2Set.has(i) ? 2 : 3;
    const richOre = richOreIndices.has(i);
    // Base radius relative to MK3 collar (dynamically pushed out slightly as dome grows)
    const baseRadius = 13.7 + (i % 2 === 0 ? 0.35 : -0.2);
    pads.push({
      id: `out_${i}`,
      index: i,
      zone: "exterior",
      angle,
      baseRadius,
      minTier,
      richOre,
      x: Number((Math.cos(angle) * baseRadius).toFixed(3)),
      z: Number((Math.sin(angle) * baseRadius).toFixed(3)),
    });
  }
  return pads;
}

// Interior & Exterior Building Catalog
// Compass slots match the reference HUD & playtest telemetry:
// Interior: 1 Top = Oxygen (45), 2 Right = Water (45), 3 Bottom = Food (50), 4 Left = Habitat (55)
// Exterior: 1 Top = Solar (40), 2 Right = Ore Rig (50), 3 Bottom = Droid Bay (60), 4 Left = Defense (65)
export const BUILDINGS = {
  // --- INTERIOR BUILDINGS ---
  oxygen: {
    id: "oxygen",
    name: "Oxygen",
    fullName: "Oxygen Tower",
    zone: "interior",
    slot: 1, // Top
    cost: 45,
    upgradeCosts: [0, 55, 85],
    plateColor: "#6ec9c4",
    accentColor: "#48d1cc",
    powerUse: 1.2,
    waterUse: 0,
    o2Gen: 3.2,
    h2oGen: 0,
    foodGen: 0,
    oreGen: 0,
    crewCap: 0,
    description: "Pressurizes the dome with breathable O₂.",
  },
  water: {
    id: "water",
    name: "Water",
    fullName: "Water Plant",
    zone: "interior",
    slot: 2, // Right
    cost: 45,
    upgradeCosts: [0, 55, 85],
    plateColor: "#6cb4e8",
    accentColor: "#3898ec",
    powerUse: 1.3,
    waterUse: 0,
    o2Gen: 0,
    h2oGen: 3.0,
    foodGen: 0,
    oreGen: 0,
    crewCap: 0,
    description: "Condenses subsurface ice into clean colony water.",
  },
  food: {
    id: "food",
    name: "Food",
    fullName: "Hydroponic Farm",
    zone: "interior",
    slot: 3, // Bottom
    cost: 50,
    upgradeCosts: [0, 60, 95],
    plateColor: "#63b96b",
    accentColor: "#4caf50",
    powerUse: 1.1,
    waterUse: 0.8,
    o2Gen: 0.4,
    h2oGen: 0,
    foodGen: 3.4,
    oreGen: 0,
    crewCap: 0,
    description: "Grows Martian crops and tomatoes to feed the crew.",
  },
  habitat: {
    id: "habitat",
    name: "Habitat",
    fullName: "Habitat Pod",
    zone: "interior",
    slot: 4, // Left
    cost: 55,
    upgradeCosts: [0, 70, 110],
    plateColor: "#6f9fd8",
    accentColor: "#7ba7e1",
    powerUse: 1.0,
    waterUse: 0.4,
    o2Gen: 0,
    h2oGen: 0,
    foodGen: 0,
    oreGen: 0,
    crewCap: 4,
    description: "Cozy pressurized quarters for +4 colonists per level.",
  },

  // --- EXTERIOR BUILDINGS ---
  solar: {
    id: "solar",
    name: "Solar",
    fullName: "Solar Array",
    zone: "exterior",
    slot: 1, // Top
    cost: 40,
    upgradeCosts: [0, 50, 80],
    plateColor: "#d99b43",
    accentColor: "#f5b942",
    powerUse: -4.5, // Generates +4.5 Power
    waterUse: 0,
    o2Gen: 0,
    h2oGen: 0,
    foodGen: 0,
    oreGen: 0,
    crewCap: 0,
    description: "Generates clean colony power (+4.5 pwr). Reduced during dust storms.",
  },
  ore_rig: {
    id: "ore_rig",
    name: "Ore Rig",
    fullName: "Ore Mining Rig",
    zone: "exterior",
    slot: 2, // Right
    cost: 50,
    upgradeCosts: [0, 65, 100],
    plateColor: "#d99b43",
    accentColor: "#e67e22",
    powerUse: 1.5,
    waterUse: 0,
    o2Gen: 0,
    h2oGen: 0,
    foodGen: 0,
    oreGen: 3.5, // Doubled on Rich Ore Seams!
    crewCap: 0,
    description: "Drills Martian regolith for ore (+2× output on rich crystal seams).",
  },
  droid_bay: {
    id: "droid_bay",
    name: "Droid Bay",
    fullName: "Repair Droid Bay",
    zone: "exterior",
    slot: 3, // Bottom
    cost: 60,
    upgradeCosts: [0, 75, 115],
    plateColor: "#d99b43",
    accentColor: "#5bc0be",
    powerUse: 1.4,
    waterUse: 0,
    o2Gen: 0,
    h2oGen: 0,
    foodGen: 0,
    oreGen: 0,
    crewCap: 0,
    roversPerLevel: 1,
    repairRate: 3.2,
    description: "Fields autonomous repair rovers to patch dome cracks and structures.",
  },
  defense_tower: {
    id: "defense_tower",
    name: "Defense",
    fullName: "Defense Tower",
    zone: "exterior",
    slot: 4, // Left
    cost: 65,
    upgradeCosts: [0, 80, 125],
    plateColor: "#d99b43",
    accentColor: "#ef5350",
    powerUse: 1.6,
    waterUse: 0,
    o2Gen: 0,
    h2oGen: 0,
    foodGen: 0,
    oreGen: 0,
    crewCap: 0,
    dps: 18,
    description: "Twin-barrel plasma turret that locks onto and repels alien saucers.",
  },
};

export const INTERIOR_RING_ORDER = ["oxygen", "water", "food", "habitat"];
export const EXTERIOR_RING_ORDER = ["solar", "ore_rig", "droid_bay", "defense_tower"];

// Astro's 12-Step Friendly Guided Tour
export const ASTRO_TOUR_STEPS = [
  {
    step: 1,
    title: "Touchdown on Mars",
    instruction: "Welcome, Commander! I'm Astro. Tap any glowing interior plate inside the dome to open the Build Ring.",
    check: (state) => state.selectedNodeZone === "interior" || state.buildings.length >= 1,
  },
  {
    step: 2,
    title: "Raise an Oxygen Tower",
    instruction: "Pick Oxygen (top slot [1], 45 ore) so our dome stays pressurized with fresh air.",
    check: (state) => state.counts.oxygen >= 1,
  },
  {
    step: 3,
    title: "Select a Second Plate",
    instruction: "Great! Tap another glowing interior plate to prepare our water extractor.",
    check: (state) => state.counts.water >= 1 || (state.counts.oxygen >= 1 && state.selectedNodeZone === "interior"),
  },
  {
    step: 4,
    title: "Build a Water Plant",
    instruction: "Pick Water (right slot [2], 45 ore) to melt subsurface permafrost.",
    check: (state) => state.counts.water >= 1,
  },
  {
    step: 5,
    title: "Select a Third Plate",
    instruction: "Tap another interior plate so we can plant our hydroponic crops.",
    check: (state) => state.counts.food >= 1 || (state.counts.water >= 1 && state.selectedNodeZone === "interior"),
  },
  {
    step: 6,
    title: "Plant a Hydroponic Farm",
    instruction: "Pick Food (bottom slot [3], 50 ore) to harvest Martian tomatoes.",
    check: (state) => state.counts.food >= 1,
  },
  {
    step: 7,
    title: "Select a Fourth Plate",
    instruction: "Now tap one more interior plate for crew quarters.",
    check: (state) => state.counts.habitat >= 1 || (state.counts.food >= 1 && state.selectedNodeZone === "interior"),
  },
  {
    step: 8,
    title: "Construct a Habitat Pod",
    instruction: "Pick Habitat (left slot [4], 55 ore) to welcome more colonists aboard.",
    check: (state) => state.counts.habitat >= 1,
  },
  {
    step: 9,
    title: "Power the Outpost",
    instruction: "Four core builds complete! Tap an outdoor hexagonal sand pad and build a Solar Array ([1], 40 ore).",
    check: (state) => state.counts.solar >= 1,
  },
  {
    step: 10,
    title: "Strike a Rich Ore Seam",
    instruction: "Tap an outdoor sand pad next to glowing orange crystals and build an Ore Rig ([2], 50 ore).",
    check: (state) => state.counts.ore_rig >= 1,
  },
  {
    step: 11,
    title: "Deploy a Repair Droid Bay",
    instruction: "Dust storms scour the glass! Build a Droid Bay ([3], 60 ore) on a sand pad so rovers patch the dome.",
    check: (state) => state.counts.droid_bay >= 1,
  },
  {
    step: 12,
    title: "Upgrade or Defend",
    instruction: "Build a Defense Tower ([4], 65 ore) or upgrade any structure to finish Astro's Tour!",
    check: (state) => state.counts.defense_tower >= 1 || state.totalUpgrades >= 1 || state.domeTier >= 2,
  },
];

// Four Campaign Chapters with 1-3 Star Ratings + Endless Mode + Practice Yard
export const CAMPAIGN_CHAPTERS = [
  {
    id: "chapter_1",
    chapterNumber: 1,
    totalChapters: 4,
    headerLabel: "CHAPTER 1/4  FIRST BREATH",
    title: "Establish Life Support & Mining",
    objectiveTitle: "Build Oxygen, Water, Food, Habitat & Ore Rig",
    description: "Raise all 4 interior life-support modules plus a Solar Array and Ore Rig outside.",
    bonusText: "★ Bonus: clear in 1:45 · dome ≥85%",
    bonusTimeSec: 105,
    bonusDomePct: 85,
    startingOre: 360,
    startingDomeTier: 1,
    startingCrew: 4,
    rewardOre: 40,
    preseededBuildings: [],
    goals: [
      {
        id: "c1_g1",
        label: "Build Oxygen, Water, Food & Habitat",
        rewardOre: 35,
        check: (s) => s.counts.oxygen >= 1 && s.counts.water >= 1 && s.counts.food >= 1 && s.counts.habitat >= 1,
        progress: (s) => ({
          current:
            (s.counts.oxygen >= 1 ? 1 : 0) +
            (s.counts.water >= 1 ? 1 : 0) +
            (s.counts.food >= 1 ? 1 : 0) +
            (s.counts.habitat >= 1 ? 1 : 0),
          target: 4,
        }),
      },
      {
        id: "c1_g2",
        label: "Build a Solar Array & Ore Rig",
        rewardOre: 30,
        check: (s) => s.counts.solar >= 1 && s.counts.ore_rig >= 1,
        progress: (s) => ({
          current: (s.counts.solar >= 1 ? 1 : 0) + (s.counts.ore_rig >= 1 ? 1 : 0),
          target: 2,
        }),
      },
      {
        id: "c1_g3",
        label: "Reach 8 Crew with positive Power",
        rewardOre: 45,
        check: (s) => s.crew >= 8 && s.netPower >= 0,
        progress: (s) => ({
          current: Math.min(8, Math.floor(s.crew)),
          target: 8,
        }),
      },
    ],
  },
  {
    id: "chapter_2",
    chapterNumber: 2,
    totalChapters: 4,
    headerLabel: "CHAPTER 2/4  WEATHER THE STORM",
    title: "Field 2 repair droids",
    objectiveTitle: "Field 2 repair droids",
    description: "Build a second droid bay – more rovers patch faster.",
    bonusText: "★ Bonus: clear in 1:30 · dome ≥75%",
    bonusTimeSec: 90,
    bonusDomePct: 75,
    startingOre: 574,
    startingDomeTier: 2,
    startingCrew: 8,
    rewardOre: 50,
    // Pre-seeded colony matching landscape_3.png!
    preseededBuildings: [
      { nodeId: "in_0", type: "oxygen", level: 1 },
      { nodeId: "in_1", type: "oxygen", level: 1 },
      { nodeId: "in_2", type: "water", level: 1 },
      { nodeId: "in_3", type: "food", level: 1 },
      { nodeId: "in_4", type: "food", level: 1 },
      { nodeId: "in_5", type: "habitat", level: 1 },
      { nodeId: "in_6", type: "habitat", level: 1 },
      { nodeId: "out_6", type: "ore_rig", level: 1 },
      { nodeId: "out_8", type: "droid_bay", level: 1 },
      { nodeId: "out_9", type: "defense_tower", level: 1 },
    ],
    goals: [
      {
        id: "c2_g1",
        label: "Build a solar array · Build a droid bay",
        rewardOre: 30,
        check: (s) => s.counts.solar >= 1 && s.counts.droid_bay >= 1,
        progress: (s) => ({
          current: (s.counts.solar >= 1 ? 1 : 0) + (s.counts.droid_bay >= 1 ? 1 : 0),
          target: 2,
        }),
      },
      {
        id: "c2_g2",
        label: "Field 2 repair droids",
        rewardOre: 45,
        check: (s) => s.totalRovers >= 2,
        progress: (s) => ({
          current: Math.min(2, s.totalRovers),
          target: 2,
        }),
      },
      {
        id: "c2_g3",
        label: "Survive the Dust Storm with Dome ≥75%",
        rewardOre: 60,
        check: (s) => s.stormsSurvived >= 1 && s.domeIntegrityPct >= 75 && s.totalRovers >= 2,
        progress: (s) => ({
          current: s.stormsSurvived >= 1 ? 1 : 0,
          target: 1,
        }),
      },
    ],
  },
  {
    id: "chapter_3",
    chapterNumber: 3,
    totalChapters: 4,
    headerLabel: "CHAPTER 3/4  REPEL THE RAIDER",
    title: "Defend the Dome Against the Alien Saucer",
    objectiveTitle: "Field 2 Defense Towers & repel the Raider",
    description: "A saucer drops in and turns its beam on your colony. Towers and rovers fight back!",
    bonusText: "★ Bonus: clear in 1:45 · dome ≥75%",
    bonusTimeSec: 105,
    bonusDomePct: 75,
    startingOre: 480,
    startingDomeTier: 2,
    startingCrew: 10,
    rewardOre: 65,
    preseededBuildings: [
      { nodeId: "in_0", type: "oxygen", level: 1 },
      { nodeId: "in_1", type: "water", level: 1 },
      { nodeId: "in_2", type: "food", level: 1 },
      { nodeId: "in_3", type: "habitat", level: 2 },
      { nodeId: "in_4", type: "oxygen", level: 1 },
      { nodeId: "in_5", type: "food", level: 1 },
      { nodeId: "out_2", type: "solar", level: 2 },
      { nodeId: "out_5", type: "ore_rig", level: 1 },
      { nodeId: "out_8", type: "droid_bay", level: 1 },
      { nodeId: "out_11", type: "defense_tower", level: 1 },
    ],
    goals: [
      {
        id: "c3_g1",
        label: "Build 2 Defense Towers on exterior pads",
        rewardOre: 40,
        check: (s) => s.counts.defense_tower >= 2,
        progress: (s) => ({
          current: Math.min(2, s.counts.defense_tower),
          target: 2,
        }),
      },
      {
        id: "c3_g2",
        label: "Balance Power ≥ +2.0 pwr",
        rewardOre: 35,
        check: (s) => s.netPower >= 2.0 && s.counts.defense_tower >= 2,
        progress: (s) => ({
          current: s.netPower >= 2.0 ? 1 : 0,
          target: 1,
        }),
      },
      {
        id: "c3_g3",
        label: "Destroy the Alien Raider Saucer",
        rewardOre: 80,
        check: (s) => s.raidersDefeated >= 1 && s.counts.defense_tower >= 2,
        progress: (s) => ({
          current: Math.min(1, s.raidersDefeated),
          target: 1,
        }),
      },
    ],
  },
  {
    id: "chapter_4",
    chapterNumber: 4,
    totalChapters: 4,
    headerLabel: "CHAPTER 4/4  RED DOME METROPOLIS",
    title: "Expand to MK3 & Build a Permanent Home",
    objectiveTitle: "Expand to MK3 Dome & reach 18 Crew",
    description: "Grow to a sprawling MK3 outpost with 19 outdoor pads and thrive on the Red Planet.",
    bonusText: "★ Bonus: clear in 2:15 · dome ≥80%",
    bonusTimeSec: 135,
    bonusDomePct: 80,
    startingOre: 620,
    startingDomeTier: 2,
    startingCrew: 12,
    rewardOre: 100,
    preseededBuildings: [
      { nodeId: "in_0", type: "oxygen", level: 2 },
      { nodeId: "in_1", type: "water", level: 2 },
      { nodeId: "in_2", type: "food", level: 2 },
      { nodeId: "in_3", type: "habitat", level: 2 },
      { nodeId: "in_4", type: "habitat", level: 1 },
      { nodeId: "in_5", type: "oxygen", level: 1 },
      { nodeId: "in_6", type: "water", level: 1 },
      { nodeId: "in_7", type: "food", level: 1 },
      { nodeId: "out_0", type: "solar", level: 2 },
      { nodeId: "out_2", type: "ore_rig", level: 2 },
      { nodeId: "out_5", type: "ore_rig", level: 1 },
      { nodeId: "out_8", type: "droid_bay", level: 2 },
      { nodeId: "out_11", type: "defense_tower", level: 2 },
    ],
    goals: [
      {
        id: "c4_g1",
        label: "Expand Central Hub to MK3 Dome (19 outdoor pads)",
        rewardOre: 60,
        check: (s) => s.domeTier >= 3,
        progress: (s) => ({
          current: s.domeTier,
          target: 3,
        }),
      },
      {
        id: "c4_g2",
        label: "Operate 3 Ore Rigs & 2 Defense Towers",
        rewardOre: 50,
        check: (s) => s.domeTier >= 3 && s.counts.ore_rig >= 3 && s.counts.defense_tower >= 2,
        progress: (s) => ({
          current: Math.min(3, s.counts.ore_rig) + Math.min(2, s.counts.defense_tower),
          target: 5,
        }),
      },
      {
        id: "c4_g3",
        label: "Sustain 18 Crew with O₂, Water & Food ≥65%",
        rewardOre: 100,
        check: (s) =>
          s.domeTier >= 3 &&
          s.crew >= 18 &&
          s.oxygenPct >= 65 &&
          s.waterPct >= 65 &&
          s.foodPct >= 65,
        progress: (s) => ({
          current: Math.min(18, Math.floor(s.crew)),
          target: 18,
        }),
      },
    ],
  },
];

export const COLONY_RANKS = [
  { minScore: 0, title: "Landing Pad Pioneer", badge: "BRONZE" },
  { minScore: 400, title: "Outpost Surveyor", badge: "SILVER" },
  { minScore: 900, title: "Dust Storm Vanguard", badge: "GOLD" },
  { minScore: 1600, title: "Warden of Ares", badge: "PLATINUM" },
  { minScore: 2500, title: "Red Dome Sovereign", badge: "MARS CROWN" },
];

export function getColonyRank(score) {
  let current = COLONY_RANKS[0];
  for (const r of COLONY_RANKS) {
    if (score >= r.minScore) current = r;
  }
  return current;
}
