// ============================================================================
// RED DOME OUTPOST — Authoritative Colony & Hazard Simulation Engine
// ============================================================================

import {
  DOME_TIERS,
  BUILDINGS,
  INTERIOR_RING_ORDER,
  EXTERIOR_RING_ORDER,
  ASTRO_TOUR_STEPS,
  CAMPAIGN_CHAPTERS,
  getColonyRank,
  generateInteriorPlates,
  generateExteriorPads,
} from "../content/campaignData.js";
import {
  loadRecords,
  saveRecords,
  saveColonySnapshot,
  loadColonySnapshot,
} from "./saveManager.js";

export class ColonySimulation {
  constructor(options = {}) {
    this.interiorPlates = generateInteriorPlates();
    this.exteriorPads = generateExteriorPads();
    this.nodeMap = new Map();
    for (const p of this.interiorPlates) this.nodeMap.set(p.id, p);
    for (const p of this.exteriorPads) this.nodeMap.set(p.id, p);

    this.records = loadRecords();
    this.eventsQueue = [];
    this.autosaveTimer = 0;

    this.startMode(options.mode || "campaign", options.chapterId || "chapter_1", {
      enableTour: options.enableTour !== undefined ? options.enableTour : true,
    });
  }

  emit(type, payload = {}) {
    this.eventsQueue.push({ type, ...payload, at: this.elapsedSec || 0 });
  }

   flushEvents() {
    const out = this.eventsQueue.slice();
    this.eventsQueue.length = 0;
    return out;
  }

  startMode(mode = "campaign", chapterId = "chapter_1", opts = {}) {
    this.mode = mode; // "campaign" | "endless" | "practice"
    this.chapterId = mode === "campaign" ? chapterId : mode;
    const chapter =
      CAMPAIGN_CHAPTERS.find((c) => c.id === chapterId) || CAMPAIGN_CHAPTERS[0];
    this.currentChapter = chapter;

    this.paused = false;
    this.speedMultiplier = 1; // 1 | 2 | 3
    this.elapsedSec = 0;
    this.sol = chapter.chapterNumber === 2 ? 2 : 1;
    this.solProgress = 0.22; // 0..1 across a 60s Sol cycle
    this.dayPhase = "day"; // "day" | "dusk" | "storm" | "night_raid"

    // Dome & resources
    if (mode === "practice") {
      this.domeTier = 2;
      this.ore = 950;
      this.crew = 8;
    } else if (mode === "endless") {
      this.domeTier = 1;
      this.ore = 420;
      this.crew = 4;
    } else {
      this.domeTier = chapter.startingDomeTier || 1;
      this.ore = chapter.startingOre || 360;
      this.crew = chapter.startingCrew || 4;
    }

    this.oxygenPct = chapter.chapterNumber === 2 ? 52 : 76;
    this.waterPct = chapter.chapterNumber === 2 ? 54 : 74;
    this.foodPct = chapter.chapterNumber === 2 ? 56 : 78;
    this.domeIntegrityPct = 100;
    this.minDomeIntegrityPct = 100;

    // Buildings map: nodeId -> { id, nodeId, type, zone, level, hp, maxHp, overclockSec, builtAt }
    this.buildingsByNode = new Map();
    this.totalBuilds = 0;
    this.totalUpgrades = 0;
    this.stormsSurvived = 0;
    this.raidersDefeated = 0;

    // Selection & UI state
    this.selectedNodeId = null; // "in_0" | "out_0" | "hub" | null
    this.selectedNodeZone = null; // "interior" | "exterior" | "hub" | null

    // Astro Guided Tour state
    this.tourActive =
      mode === "campaign" &&
      chapter.id === "chapter_1" &&
      Boolean(opts.enableTour);
    this.tourStepIndex = 0; // 0 = Ready/Step 1 .. 11 = Step 12

    // Campaign goals tracking
    this.completedGoalIds = new Set();
    this.recentCompletedGoals = [];
    this.lastRewardOre = 0;
    this.chapterCleared = false;
    this.chapterStarsEarned = 0;

    // Hazards (Dust Storm / Alien Raider)
    this.hazard = {
      type: "none", // "none" | "storm" | "raider"
      timer: 0,
      duration: 0,
      intensity: 0,
      raider: null,
    };
    this.nextHazardCountdown =
      mode === "campaign"
        ? chapter.id === "chapter_2"
          ? 16
          : chapter.id === "chapter_3"
            ? 14
            : chapter.id === "chapter_4"
              ? 22
              : 45
        : mode === "endless"
          ? 28
          : 9999;

    // Pre-seed chapter buildings if defined
    if (mode === "campaign" && Array.isArray(chapter.preseededBuildings)) {
      for (const b of chapter.preseededBuildings) {
        this._placeBuildingInternal(b.nodeId, b.type, b.level || 1, true);
      }
      if (chapter.id === "chapter_2") {
        // Match screenshot landscape_3.png where 2 initial goals were already completed
        this.completedGoalIds.add("c2_g1");
        this.recentCompletedGoals = ["Build a solar array", "Build a droid bay"];
        this.lastRewardOre = 30;
      }
    } else if (mode === "practice") {
      this._placeBuildingInternal("in_0", "oxygen", 1, true);
      this._placeBuildingInternal("in_1", "water", 1, true);
      this._placeBuildingInternal("in_2", "food", 1, true);
      this._placeBuildingInternal("in_3", "habitat", 1, true);
      this._placeBuildingInternal("out_0", "solar", 1, true);
      this._placeBuildingInternal("out_2", "ore_rig", 1, true);
      this._placeBuildingInternal("out_4", "droid_bay", 1, true);
      this._placeBuildingInternal("out_6", "defense_tower", 1, true);
    }

    // Mobile entities (Rovers & Colonists)
    this.rovers = [];
    this.colonists = [];
    this._syncMobileEntities();
    this.recalculateRates();

    this.emit("rocket_land", { mode: this.mode, chapterId: this.chapterId });
    this.saveNow();
  }

  _placeBuildingInternal(nodeId, type, level = 1, silent = false) {
    const node = this.nodeMap.get(nodeId);
    const spec = BUILDINGS[type];
    if (!node || !spec) return false;
    this.buildingsByNode.set(nodeId, {
      id: `bld_${nodeId}`,
      nodeId,
      type,
      zone: spec.zone,
      level,
      hp: 100,
      maxHp: 100,
      overclockSec: 0,
      builtAt: this.elapsedSec,
    });
    if (!silent) {
      this.totalBuilds++;
    }
    return true;
  }

  isNodeUnlocked(nodeId) {
    if (nodeId === "hub") return true;
    const node = this.nodeMap.get(nodeId);
    if (!node) return false;
    return node.minTier <= this.domeTier;
  }

  getUnlockedInteriorPlates() {
    return this.interiorPlates.filter((p) => p.minTier <= this.domeTier);
  }

  getUnlockedExteriorPads() {
    return this.exteriorPads.filter((p) => p.minTier <= this.domeTier);
  }

  selectNode(nodeId) {
    if (!nodeId) {
      this.selectedNodeId = null;
      this.selectedNodeZone = null;
      this.emit("select_node", { nodeId: null, zone: null });
      return true;
    }
    if (nodeId === "hub") {
      this.selectedNodeId = "hub";
      this.selectedNodeZone = "hub";
      this.emit("select_node", { nodeId: "hub", zone: "hub" });
      this._checkTourProgress();
      return true;
    }
    if (!this.isNodeUnlocked(nodeId)) return false;
    const node = this.nodeMap.get(nodeId);
    this.selectedNodeId = nodeId;
    this.selectedNodeZone = node.zone;
    this.emit("select_node", { nodeId, zone: node.zone });
    this._checkTourProgress();
    return true;
  }

  // Returns the 4 radial ring actions for the currently selected plate/pad/hub
  getRadialRingActions() {
    if (!this.selectedNodeId) return null;

    if (this.selectedNodeId === "hub") {
      const nextTier = this.domeTier < 3 ? DOME_TIERS[this.domeTier + 1] : null;
      return {
        contextTitle: `${DOME_TIERS[this.domeTier].shortLabel} Command Hub`,
        mode: "hub",
        slots: [
          {
            slot: 1,
            position: "top",
            action: "expand_dome",
            id: "expand_dome",
            label: nextTier ? `Expand ${nextTier.shortLabel}` : "MK3 Maxed",
            costText: nextTier ? `${nextTier.upgradeCost} ore` : "Max Tier",
            cost: nextTier ? nextTier.upgradeCost : 0,
            disabled: !nextTier || this.ore < nextTier.upgradeCost,
            icon: "dome",
          },
          {
            slot: 2,
            position: "right",
            action: "patch_dome",
            id: "patch_dome",
            label: "Patch Dome",
            costText: this.domeIntegrityPct < 100 ? "30 ore" : "100% OK",
            cost: 30,
            disabled: this.domeIntegrityPct >= 99.9 || this.ore < 30,
            icon: "shield",
          },
          {
            slot: 3,
            position: "bottom",
            action: "supply_drop",
            id: "supply_drop",
            label: "Supply Drop",
            costText: "45 ore",
            cost: 45,
            disabled: this.ore < 45,
            icon: "rocket",
          },
          {
            slot: 4,
            position: "left",
            action: "overclock_all",
            id: "overclock_all",
            label: "Boost Grid",
            costText: "35 ore",
            cost: 35,
            disabled: this.ore < 35,
            icon: "power",
          },
        ],
      };
    }

    const existing = this.buildingsByNode.get(this.selectedNodeId);
    if (existing) {
      const spec = BUILDINGS[existing.type];
      const nextLevel = existing.level < 3 ? existing.level + 1 : null;
      const upgradeCost = nextLevel ? spec.upgradeCosts[nextLevel - 1] : 0;
      const refund = this.getSellRefund(existing);
      return {
        contextTitle: `${spec.fullName} (MK${existing.level})`,
        mode: "manage",
        building: existing,
        slots: [
          {
            slot: 1,
            position: "top",
            action: "upgrade",
            id: "upgrade",
            label: nextLevel ? `Upgrade MK${nextLevel}` : "MK3 Max",
            costText: nextLevel ? `${upgradeCost} ore` : "Maxed",
            cost: upgradeCost,
            disabled: !nextLevel || this.ore < upgradeCost,
            icon: "upgrade",
          },
          {
            slot: 2,
            position: "right",
            action: "repair",
            id: "repair",
            label: "Repair",
            costText:
              existing.hp < 100 || this.domeIntegrityPct < 100
                ? "15 ore"
                : "100% OK",
            cost: 15,
            disabled:
              (existing.hp >= 99.9 && this.domeIntegrityPct >= 99.9) ||
              this.ore < 15,
            icon: "repair",
          },
          {
            slot: 3,
            position: "bottom",
            action: "sell",
            id: "sell",
            label: "Sell",
            costText: `+${refund} ore`,
            cost: -refund,
            disabled: false,
            icon: "sell",
          },
          {
            slot: 4,
            position: "left",
            action: "overclock",
            id: "overclock",
            label: existing.overclockSec > 0 ? "Boosted" : "Overclock",
            costText: "20 ore",
            cost: 20,
            disabled: this.ore < 20 || existing.overclockSec > 5,
            icon: "power",
          },
        ],
      };
    }

    // Empty interior plate or exterior sand pad
    const node = this.nodeMap.get(this.selectedNodeId);
    if (!node) return null;

    const order =
      node.zone === "interior" ? INTERIOR_RING_ORDER : EXTERIOR_RING_ORDER;
    const positions = ["top", "right", "bottom", "left"];

    return {
      contextTitle:
        node.zone === "interior"
          ? "Build Inside Dome"
          : node.richOre
            ? "Build on Rich Ore Pad (2× Ore)"
            : "Build on Sand Pad",
      mode: "build",
      zone: node.zone,
      slots: order.map((typeId, idx) => {
        const b = BUILDINGS[typeId];
        return {
          slot: idx + 1,
          position: positions[idx],
          action: "build",
          id: typeId,
          label: b.name,
          costText: `${b.cost} ore`,
          cost: b.cost,
          disabled: this.ore < b.cost,
          icon: typeId,
        };
      }),
    };
  }

  getSellRefund(building) {
    const spec = BUILDINGS[building.type];
    if (!spec) return 20;
    let totalInvested = spec.cost;
    for (let l = 2; l <= building.level; l++) {
      totalInvested += spec.upgradeCosts[l - 1] || 0;
    }
    return Math.round(totalInvested * 0.7);
  }

  // Trigger radial slot 1..4 on the currently selected node
  triggerRadialSlot(slotNumber) {
    const ring = this.getRadialRingActions();
    if (!ring) return { ok: false, reason: "no_selection" };
    const item = ring.slots.find((s) => s.slot === Number(slotNumber));
    if (!item) return { ok: false, reason: "invalid_slot" };
    if (item.disabled) {
      this.emit("action_blocked", { reason: "insufficient_ore_or_maxed", item });
      return { ok: false, reason: "disabled" };
    }

    if (item.action === "build") {
      return this.buildOnNode(this.selectedNodeId, item.id);
    }
    if (item.action === "upgrade") {
      return this.upgradeNode(this.selectedNodeId);
    }
    if (item.action === "repair") {
      return this.repairNode(this.selectedNodeId);
    }
    if (item.action === "sell") {
      return this.sellNode(this.selectedNodeId);
    }
    if (item.action === "overclock") {
      return this.overclockNode(this.selectedNodeId);
    }
    if (item.action === "expand_dome") {
      return this.expandDome();
    }
    if (item.action === "patch_dome") {
      return this.patchDomeEmergency();
    }
    if (item.action === "supply_drop") {
      return this.callSupplyDrop();
    }
    if (item.action === "overclock_all") {
      return this.overclockAllBuildings();
    }
    return { ok: false, reason: "unknown_action" };
  }

  buildOnNode(nodeId, buildingType) {
    if (!this.isNodeUnlocked(nodeId)) {
      return { ok: false, reason: "locked_node" };
    }
    const node = this.nodeMap.get(nodeId);
    const spec = BUILDINGS[buildingType];
    if (!node || !spec) return { ok: false, reason: "invalid_target" };
    if (node.zone !== spec.zone) {
      return { ok: false, reason: "zone_mismatch" };
    }
    if (this.buildingsByNode.has(nodeId)) {
      return { ok: false, reason: "already_occupied" };
    }
    if (this.ore < spec.cost) {
      this.emit("action_blocked", { reason: "not_enough_ore" });
      return { ok: false, reason: "not_enough_ore" };
    }

    this.ore -= spec.cost;
    this._placeBuildingInternal(nodeId, buildingType, 1, false);
    this._syncMobileEntities();
    this.recalculateRates();
    this.emit("build", { nodeId, buildingType, zone: node.zone });

    this._checkTourProgress();
    this._checkCampaignGoals();
    this.saveNow();
    return { ok: true, nodeId, buildingType };
  }

  upgradeNode(nodeId) {
    const bld = this.buildingsByNode.get(nodeId);
    if (!bld) return { ok: false, reason: "empty_node" };
    if (bld.level >= 3) return { ok: false, reason: "max_level" };
    const spec = BUILDINGS[bld.type];
    const cost = spec.upgradeCosts[bld.level];
    if (this.ore < cost) return { ok: false, reason: "not_enough_ore" };

    this.ore -= cost;
    bld.level += 1;
    bld.hp = 100;
    this.totalUpgrades += 1;
    this._syncMobileEntities();
    this.recalculateRates();
    this.emit("upgrade", { nodeId, buildingType: bld.type, level: bld.level });

    this._checkTourProgress();
    this._checkCampaignGoals();
    this.saveNow();
    return { ok: true, nodeId, level: bld.level };
  }

  repairNode(nodeId) {
    const bld = this.buildingsByNode.get(nodeId);
    if (!bld) return { ok: false, reason: "empty_node" };
    if (this.ore < 15) return { ok: false, reason: "not_enough_ore" };
    this.ore -= 15;
    bld.hp = 100;
    this.domeIntegrityPct = Math.min(100, this.domeIntegrityPct + 12);
    this.recalculateRates();
    this.emit("repair", { nodeId, buildingType: bld.type });
    this.saveNow();
    return { ok: true, nodeId };
  }

  sellNode(nodeId) {
    const bld = this.buildingsByNode.get(nodeId);
    if (!bld) return { ok: false, reason: "empty_node" };
    const refund = this.getSellRefund(bld);
    const oldType = bld.type;
    this.ore += refund;
    this.buildingsByNode.delete(nodeId);
    this._syncMobileEntities();
    this.recalculateRates();
    this.emit("sell", { nodeId, buildingType: oldType, refund });
    this.saveNow();
    return { ok: true, nodeId, refund };
  }

  overclockNode(nodeId) {
    const bld = this.buildingsByNode.get(nodeId);
    if (!bld) return { ok: false, reason: "empty_node" };
    if (this.ore < 20) return { ok: false, reason: "not_enough_ore" };
    this.ore -= 20;
    bld.overclockSec = 25;
    this.recalculateRates();
    this.emit("overclock", { nodeId, buildingType: bld.type });
    return { ok: true, nodeId };
  }

  expandDome() {
    if (this.domeTier >= 3) return { ok: false, reason: "max_tier" };
    const nextTier = DOME_TIERS[this.domeTier + 1];
    if (this.ore < nextTier.upgradeCost) {
      return { ok: false, reason: "not_enough_ore" };
    }
    this.ore -= nextTier.upgradeCost;
    this.domeTier += 1;
    this.domeIntegrityPct = Math.min(100, this.domeIntegrityPct + 20);
    this._syncMobileEntities();
    this.recalculateRates();
    this.emit("dome_expand", { domeTier: this.domeTier });
    this._checkTourProgress();
    this._checkCampaignGoals();
    this.saveNow();
    return { ok: true, domeTier: this.domeTier };
  }

  patchDomeEmergency() {
    if (this.ore < 30 || this.domeIntegrityPct >= 100) {
      return { ok: false, reason: "cannot_patch" };
    }
    this.ore -= 30;
    this.domeIntegrityPct = Math.min(100, this.domeIntegrityPct + 28);
    this.emit("repair", { nodeId: "hub", domeIntegrityPct: this.domeIntegrityPct });
    this.saveNow();
    return { ok: true, domeIntegrityPct: this.domeIntegrityPct };
  }

  callSupplyDrop() {
    if (this.ore < 45) return { ok: false, reason: "not_enough_ore" };
    this.ore -= 45;
    this.oxygenPct = Math.min(100, this.oxygenPct + 22);
    this.waterPct = Math.min(100, this.waterPct + 22);
    this.foodPct = Math.min(100, this.foodPct + 22);
    this.crew = Math.min(this.crewCapacity + 2, this.crew + 2);
    this._syncMobileEntities();
    this.recalculateRates();
    this.emit("supply_drop", {});
    this._checkCampaignGoals();
    this.saveNow();
    return { ok: true };
  }

  overclockAllBuildings() {
    if (this.ore < 35) return { ok: false, reason: "not_enough_ore" };
    this.ore -= 35;
    for (const bld of this.buildingsByNode.values()) {
      bld.overclockSec = 20;
    }
    this.recalculateRates();
    this.emit("overclock", { nodeId: "all" });
    return { ok: true };
  }

  recalculateRates() {
    const counts = {
      oxygen: 0,
      water: 0,
      food: 0,
      habitat: 0,
      solar: 0,
      ore_rig: 0,
      droid_bay: 0,
      defense_tower: 0,
    };

    const tierInfo = DOME_TIERS[this.domeTier];
    let powerGen = tierInfo.basePower;
    let powerUse = 1.5; // Central Hub baseline draw
    let o2Gen = 0.6;
    let h2oGen = 0.5;
    let foodGen = 0.5;
    let oreGen = 1.2; // Base hub telemetry trickle
    let crewCap = tierInfo.baseCrewCapacity;
    let totalRovers = 0; // Count fielded Droid Bay rovers (matches Chapter 2 1/2 -> 2/2 objective)
    let turretDps = 4; // Base hub defense laser

    const stormSolarFactor = this.hazard.type === "storm" ? 0.58 : 1.0;

    for (const bld of this.buildingsByNode.values()) {
      counts[bld.type] = (counts[bld.type] || 0) + 1;
      const spec = BUILDINGS[bld.type];
      if (!spec) continue;
      const levelMult = bld.level === 1 ? 1.0 : bld.level === 2 ? 1.65 : 2.4;
      const boostMult = bld.overclockSec > 0 ? 1.45 : 1.0;
      const healthMult = Math.max(0.35, bld.hp / 100);
      const eff = levelMult * boostMult * healthMult;

      if (spec.powerUse < 0) {
        powerGen += Math.abs(spec.powerUse) * eff * stormSolarFactor;
      } else {
        powerUse += spec.powerUse * (1 + (bld.level - 1) * 0.45);
      }

      o2Gen += spec.o2Gen * eff;
      h2oGen += spec.h2oGen * eff;
      foodGen += spec.foodGen * eff;

      if (bld.type === "ore_rig") {
        const node = this.nodeMap.get(bld.nodeId);
        const seamMult = node && node.richOre ? 1.85 : 1.0;
        oreGen += spec.oreGen * eff * seamMult;
      }
      if (bld.type === "habitat") {
        crewCap += spec.crewCap * bld.level;
      }
      if (bld.type === "droid_bay") {
        totalRovers += bld.level;
      }
      if (bld.type === "defense_tower") {
        turretDps += spec.dps * eff;
      }
    }

    this.counts = counts;
    this.powerGen = Number(powerGen.toFixed(1));
    this.powerUse = Number(powerUse.toFixed(1));
    this.netPower = Number((powerGen - powerUse).toFixed(1));

    // Brownout penalty if netPower < 0
    const powerEfficiency =
      this.netPower >= 0
        ? 1.0
        : Math.max(0.45, 1.0 + this.netPower / Math.max(4, this.powerUse));
    this.powerEfficiency = powerEfficiency;

    const crewCount = Math.max(1, this.crew);
    const o2Use = crewCount * 0.24;
    const h2oUse = crewCount * 0.22 + counts.food * 0.65;
    const foodUse = crewCount * 0.23;

    this.netO2 = Number((o2Gen * powerEfficiency - o2Use).toFixed(1));
    this.netH2O = Number((h2oGen * powerEfficiency - h2oUse).toFixed(1));
    this.netFood = Number((foodGen * powerEfficiency - foodUse).toFixed(1));
    this.netOre = Number((oreGen * powerEfficiency).toFixed(1));
    this.crewCapacity = crewCap;
    this.totalRovers = totalRovers;
    this.turretDps = Number((turretDps * powerEfficiency).toFixed(1));
  }

  _syncMobileEntities() {
    this.recalculateRates();
    // Always display at least 1 active rover on the field plus all Droid Bay rovers
    const visualRoverCount = Math.max(1, this.totalRovers);
    while (this.rovers.length < visualRoverCount) {
      const idx = this.rovers.length;
      const angle = (idx * Math.PI * 2) / Math.max(1, visualRoverCount);
      const isInterior = idx % 2 === 0;
      const r = isInterior ? 3.5 : 11.2;
      this.rovers.push({
        id: `rover_${idx}`,
        x: Math.cos(angle) * r,
        z: Math.sin(angle) * r,
        angle,
        targetX: Math.cos(angle) * r,
        targetZ: Math.sin(angle) * r,
        isInterior,
        state: "patrol", // "patrol" | "repair" | "defend"
      });
    }
    if (this.rovers.length > visualRoverCount) {
      this.rovers.length = visualRoverCount;
    }

    // Visual colonists inside the dome (1 Astro + up to 8 visible crew walkers)
    const desiredColonists = Math.min(9, Math.max(2, Math.floor(this.crew / 2) + 1));
    const suitColors = ["#e87d2f", "#5f75d9", "#46b8b0", "#e6b84c", "#d96b98"];
    while (this.colonists.length < desiredColonists) {
      const idx = this.colonists.length;
      const angle = idx * 1.35;
      const dist = 2.2 + (idx % 3) * 1.3;
      this.colonists.push({
        id: `colonist_${idx}`,
        name: idx === 0 ? "Astro" : `Crew ${idx}`,
        color: suitColors[idx % suitColors.length],
        x: Math.cos(angle) * dist,
        z: Math.sin(angle) * dist,
        targetX: Math.cos(angle + 1) * dist,
        targetZ: Math.sin(angle + 1) * dist,
        walkPhase: idx * 0.9,
      });
    }
    if (this.colonists.length > desiredColonists) {
      this.colonists.length = desiredColonists;
    }
  }

  // Trigger a Martian Dust Storm
  triggerDustStorm(durationSec = 22) {
    this.hazard = {
      type: "storm",
      timer: 0,
      duration: durationSec,
      intensity: 1.0,
      raider: null,
    };
    this.dayPhase = "storm";
    this.recalculateRates();
    this.emit("storm_start", { durationSec });
  }

  // Trigger an Alien Raider Saucer attack
  triggerAlienRaider(saucerHp = 180) {
    this.hazard = {
      type: "raider",
      timer: 0,
      duration: 40,
      intensity: 1.0,
      raider: {
        hp: saucerHp,
        maxHp: saucerHp,
        angle: -0.6,
        radius: 4.5,
        x: 3.5,
        y: 6.8,
        z: -2.0,
        beamActive: true,
        shotCooldown: 0,
      },
    };
    this.dayPhase = "night_raid";
    this.recalculateRates();
    this.emit("raider_spawn", { maxHp: saucerHp });
  }

  // Main simulation step (dt in real seconds)
  step(rawDt) {
    if (this.paused) return;
    const dt = Math.min(0.25, Math.max(0, rawDt)) * this.speedMultiplier;
    if (dt <= 0) return;

    this.elapsedSec += dt;
    this.solProgress += dt / 55; // 1 Martian Sol = 55 game seconds
    if (this.solProgress >= 1) {
      this.solProgress -= 1;
      this.sol += 1;
      this.emit("new_sol", { sol: this.sol });
    }

    // Decrement overclock timers
    for (const bld of this.buildingsByNode.values()) {
      if (bld.overclockSec > 0) {
        bld.overclockSec = Math.max(0, bld.overclockSec - dt);
      }
    }

    this.recalculateRates();

    // Resource accumulation
    this.ore += this.netOre * dt;
    this.oxygenPct = Math.max(
      5,
      Math.min(100, this.oxygenPct + this.netO2 * dt * 0.45)
    );
    this.waterPct = Math.max(
      5,
      Math.min(100, this.waterPct + this.netH2O * dt * 0.45)
    );
    this.foodPct = Math.max(
      5,
      Math.min(100, this.foodPct + this.netFood * dt * 0.45)
    );

    // Crew growth when life support is healthy and habitat space is available
    if (
      this.oxygenPct >= 50 &&
      this.waterPct >= 50 &&
      this.foodPct >= 50 &&
      this.crew < this.crewCapacity
    ) {
      this.crew = Math.min(this.crewCapacity, this.crew + dt * 0.22);
    }

    // Hazard scheduling & active hazard resolution
    this._stepHazards(dt);

    // Autonomous Rover repair & patrol
    this._stepRoversAndColonists(dt);

    // Track minimum dome integrity for ★ bonus rating
    if (this.domeIntegrityPct < this.minDomeIntegrityPct) {
      this.minDomeIntegrityPct = this.domeIntegrityPct;
    }

    this._checkTourProgress();
    this._checkCampaignGoals();

    this.autosaveTimer += rawDt;
    if (this.autosaveTimer >= 6.0) {
      this.autosaveTimer = 0;
      this.saveNow();
    }
  }

  _stepHazards(dt) {
    if (this.hazard.type === "none") {
      this.dayPhase = this.solProgress > 0.78 ? "dusk" : "day";
      this.nextHazardCountdown -= dt;
      if (this.nextHazardCountdown <= 0 && this.mode !== "practice") {
        if (this.mode === "campaign") {
          if (this.chapterId === "chapter_2" && this.stormsSurvived === 0) {
            this.triggerDustStorm(18);
          } else if (
            this.chapterId === "chapter_3" &&
            this.raidersDefeated === 0
          ) {
            this.triggerAlienRaider(160);
          } else if (this.chapterId === "chapter_4") {
            if (this.stormsSurvived <= this.raidersDefeated) {
              this.triggerDustStorm(18);
            } else {
              this.triggerAlienRaider(210);
            }
          }
          this.nextHazardCountdown = 32;
        } else if (this.mode === "endless") {
          if (this.sol % 2 === 0) {
            this.triggerAlienRaider(150 + this.sol * 25);
          } else {
            this.triggerDustStorm(18 + Math.min(12, this.sol * 2));
          }
          this.nextHazardCountdown = 28;
        }
      }
      return;
    }

    this.hazard.timer += dt;

    if (this.hazard.type === "storm") {
      // Storm scours the glass dome; rovers counter-patch it
      const stormDamageRate = 2.4;
      const roverPatchRate = (this.totalRovers + 0.5) * 1.85;
      const netDelta = (roverPatchRate - stormDamageRate) * dt;
      this.domeIntegrityPct = Math.max(
        18,
        Math.min(100, this.domeIntegrityPct + netDelta)
      );

      // Slight wear on exterior buildings
      for (const bld of this.buildingsByNode.values()) {
        if (bld.zone === "exterior") {
          bld.hp = Math.max(40, bld.hp - 0.9 * dt);
        }
      }

      if (this.hazard.timer >= this.hazard.duration) {
        this.hazard.type = "none";
        this.dayPhase = "day";
        this.stormsSurvived += 1;
        this.recalculateRates();
        this.emit("storm_end", { stormsSurvived: this.stormsSurvived });
      }
      return;
    }

    if (this.hazard.type === "raider" && this.hazard.raider) {
      const r = this.hazard.raider;
      r.angle += dt * 0.55;
      r.x = Math.cos(r.angle) * r.radius;
      r.z = Math.sin(r.angle) * r.radius;
      r.y = 6.6 + Math.sin(this.elapsedSec * 2.5) * 0.35;

      // Saucer beam drains dome integrity; rovers mitigate
      const beamDamage = 2.6;
      const roverMitigation = (this.totalRovers + 0.5) * 1.4;
      this.domeIntegrityPct = Math.max(
        15,
        Math.min(100, this.domeIntegrityPct + (roverMitigation - beamDamage) * dt)
      );

      // Defense Towers + Rovers attack the saucer
      const totalDps = this.turretDps + this.totalRovers * 5.0;
      r.hp = Math.max(0, r.hp - totalDps * dt);

      r.shotCooldown -= dt;
      if (r.shotCooldown <= 0) {
        r.shotCooldown = 0.45;
        this.emit("turret_fire", { targetX: r.x, targetY: r.y, targetZ: r.z });
      }

      if (r.hp <= 0) {
        const expX = r.x;
        const expY = r.y;
        const expZ = r.z;
        this.hazard.type = "none";
        this.hazard.raider = null;
        this.dayPhase = "day";
        this.raidersDefeated += 1;
        this.ore += 55;
        this.recalculateRates();
        this.emit("raider_explode", {
          x: expX,
          y: expY,
          z: expZ,
          raidersDefeated: this.raidersDefeated,
          bountyOre: 55,
        });
      } else if (this.hazard.timer >= this.hazard.duration) {
        // Saucer retreats if timer expires
        this.hazard.type = "none";
        this.hazard.raider = null;
        this.dayPhase = "day";
        this.raidersDefeated += 1;
        this.emit("raider_retreat", {});
      }
    }
  }

  _stepRoversAndColonists(dt) {
    // Passive dome & building repair outside hazards
    if (this.hazard.type === "none") {
      const repairRate = (1 + this.totalRovers * 2.4) * dt;
      if (this.domeIntegrityPct < 100) {
        this.domeIntegrityPct = Math.min(100, this.domeIntegrityPct + repairRate);
      }
      for (const bld of this.buildingsByNode.values()) {
        if (bld.hp < 100) {
          bld.hp = Math.min(100, bld.hp + repairRate * 1.8);
        }
      }
    }

    // Move rovers smoothly along patrol arcs
    const domeRad = DOME_TIERS[this.domeTier].domeRadius;
    for (let i = 0; i < this.rovers.length; i++) {
      const rv = this.rovers[i];
      rv.angle += dt * (rv.isInterior ? 0.48 : 0.32) * (i % 2 === 0 ? 1 : -1);
      const rad = rv.isInterior ? domeRad * 0.58 : domeRad + 2.2;
      rv.x = Math.cos(rv.angle) * rad;
      rv.z = Math.sin(rv.angle) * rad;
      rv.state =
        this.hazard.type === "raider"
          ? "defend"
          : this.domeIntegrityPct < 98
            ? "repair"
            : "patrol";
    }

    // Move colonists smoothly between hub and interior tiles
    for (let i = 0; i < this.colonists.length; i++) {
      const c = this.colonists[i];
      c.walkPhase += dt * 3.2;
      const dx = c.targetX - c.x;
      const dz = c.targetZ - c.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.25) {
        const nextAngle = (c.walkPhase * 1.7 + i * 2.1) % (Math.PI * 2);
        const maxR = Math.max(2.2, domeRad * 0.62);
        const r = 1.9 + ((i * 1.3 + Math.floor(this.elapsedSec)) % (maxR - 1.9));
        c.targetX = Math.cos(nextAngle) * r;
        c.targetZ = Math.sin(nextAngle) * r;
      } else {
        const stepDist = Math.min(dist, dt * 1.35);
        c.x += (dx / dist) * stepDist;
        c.z += (dz / dist) * stepDist;
      }
    }
  }

  _checkTourProgress() {
    if (!this.tourActive) return;
    const stateView = {
      selectedNodeZone: this.selectedNodeZone,
      buildings: Array.from(this.buildingsByNode.values()),
      counts: this.counts,
      totalUpgrades: this.totalUpgrades,
      domeTier: this.domeTier,
    };

    while (
      this.tourStepIndex < ASTRO_TOUR_STEPS.length &&
      ASTRO_TOUR_STEPS[this.tourStepIndex].check(stateView)
    ) {
      this.tourStepIndex += 1;
      this.emit("tour_advance", {
        step: this.tourStepIndex,
        total: ASTRO_TOUR_STEPS.length,
      });
    }

    if (this.tourStepIndex >= ASTRO_TOUR_STEPS.length) {
      this.tourActive = false;
      this.records.tourCompleted = true;
      saveRecords(this.records);
      this.emit("tour_complete", {});
    }
  }

  _checkCampaignGoals() {
    if (this.mode !== "campaign" || !this.currentChapter) return;
    const goals = this.currentChapter.goals || [];
    for (const g of goals) {
      if (!this.completedGoalIds.has(g.id) && g.check(this)) {
        this.completedGoalIds.add(g.id);
        this.ore += g.rewardOre || 30;
        this.lastRewardOre = g.rewardOre || 30;
        this.recentCompletedGoals.push(g.label);
        if (this.recentCompletedGoals.length > 2) {
          this.recentCompletedGoals.shift();
        }
        this.emit("goal_complete", {
          goalId: g.id,
          label: g.label,
          rewardOre: g.rewardOre || 30,
        });
      }
    }

    // Check if all chapter goals are complete
    if (
      !this.chapterCleared &&
      goals.length > 0 &&
      goals.every((g) => this.completedGoalIds.has(g.id))
    ) {
      this.chapterCleared = true;
      let stars = 1;
      if (this.minDomeIntegrityPct >= this.currentChapter.bonusDomePct) {
        stars += 1;
      }
      if (this.elapsedSec <= this.currentChapter.bonusTimeSec) {
        stars += 1;
      }
      this.chapterStarsEarned = stars;
      const prevStars =
        this.records.chapterStars[this.currentChapter.id] || 0;
      if (stars > prevStars) {
        this.records.chapterStars[this.currentChapter.id] = stars;
      }
      saveRecords(this.records);
      this.emit("chapter_complete", {
        chapterId: this.currentChapter.id,
        stars,
      });
    }
  }

  getCoachingAlert() {
    if (this.hazard.type === "raider") {
      return "Alien raider attacking – build Defense Towers on sand pads!";
    }
    if (this.hazard.type === "storm") {
      return "Dust storm scouring glass – rovers patching the dome!";
    }
    if (this.netPower < 0) {
      return "Power short – build Solar on a sand pad";
    }
    if (this.netH2O < 0 || this.waterPct < 42) {
      return "Water low – build a Water Plant inside the dome";
    }
    if (this.netO2 < 0 || this.oxygenPct < 42) {
      return "Air pressure dropping – build an Oxygen Tower";
    }
    if (this.netFood < 0 || this.foodPct < 42) {
      return "Food reserves low – plant a Hydroponic Farm";
    }
    if (this.crew >= this.crewCapacity) {
      return "Crew quarters full – build a Habitat Pod inside";
    }
    return "All colony systems nominal – expand or upgrade modules";
  }

  getColonyScore() {
    const bldScore = this.buildingsByNode.size * 45 + this.totalUpgrades * 60;
    const crewScore = Math.floor(this.crew) * 35;
    const hazardScore = this.stormsSurvived * 120 + this.raidersDefeated * 180;
    const tierScore = (this.domeTier - 1) * 250;
    return bldScore + crewScore + hazardScore + tierScore;
  }

  getHUDState() {
    const score = this.getColonyScore();
    const rank = getColonyRank(score);
    if (this.mode === "endless" && score > this.records.bestEndlessScore) {
      this.records.bestEndlessScore = score;
      this.records.bestEndlessSol = Math.max(this.records.bestEndlessSol, this.sol);
      this.records.bestEndlessRank = rank.title;
    }

    // Active goal for primary left mission card
    let activeGoal = null;
    if (this.mode === "campaign" && this.currentChapter) {
      for (const g of this.currentChapter.goals) {
        if (!this.completedGoalIds.has(g.id)) {
          activeGoal = g;
          break;
        }
      }
      if (!activeGoal) {
        activeGoal =
          this.currentChapter.goals[this.currentChapter.goals.length - 1];
      }
    }

    const goalProgress = activeGoal
      ? activeGoal.progress(this)
      : { current: this.buildingsByNode.size, target: 10 };

    const tourStep =
      this.tourActive && this.tourStepIndex < ASTRO_TOUR_STEPS.length
        ? ASTRO_TOUR_STEPS[this.tourStepIndex]
        : null;

    return {
      mode: this.mode,
      chapterId: this.chapterId,
      paused: this.paused,
      speedMultiplier: this.speedMultiplier,
      sol: this.sol,
      dayPhase: this.dayPhase,
      domeTier: this.domeTier,
      domeTierInfo: DOME_TIERS[this.domeTier],
      ore: Math.floor(this.ore),
      netOre: this.netOre,
      netPower: this.netPower,
      oxygenPct: Math.round(this.oxygenPct),
      netO2: this.netO2,
      waterPct: Math.round(this.waterPct),
      netH2O: this.netH2O,
      foodPct: Math.round(this.foodPct),
      netFood: this.netFood,
      crew: Math.floor(this.crew),
      crewCapacity: this.crewCapacity,
      domeIntegrityPct: Math.round(this.domeIntegrityPct),
      totalRovers: this.totalRovers,
      counts: { ...this.counts },
      coachingAlert: this.getCoachingAlert(),
      chapterHeader:
        this.mode === "campaign"
          ? this.currentChapter.headerLabel
          : this.mode === "endless"
            ? `ENDLESS OUTPOST · ${rank.badge}`
            : "PRACTICE YARD · SANDBOX",
      objectiveTitle:
        this.mode === "campaign"
          ? activeGoal
            ? activeGoal.label
            : this.currentChapter.objectiveTitle
          : this.mode === "endless"
            ? `Colony Rank: ${rank.title}`
            : "Experiment freely with all buildings & hazards",
      objectiveProgressText:
        this.mode === "campaign"
          ? `${goalProgress.current}/${goalProgress.target}`
          : this.mode === "endless"
            ? `${score} pts`
            : `${this.buildingsByNode.size} built`,
      objectiveDescription:
        this.mode === "campaign"
          ? this.currentChapter.description
          : this.mode === "endless"
            ? `Best Record: Sol ${this.records.bestEndlessSol} · ${this.records.bestEndlessScore} pts (${this.records.bestEndlessRank})`
            : "Use the sandbox buttons or tap any plate/pad to test colony layouts without risk.",
      bonusText:
        this.mode === "campaign"
          ? this.currentChapter.bonusText
          : this.mode === "endless"
            ? `★ Storms: ${this.stormsSurvived} · Raiders: ${this.raidersDefeated}`
            : "★ Unlimited Sandbox · Zero Penalty",
      completedGoalsCount:
        this.mode === "campaign"
          ? Math.max(
              this.completedGoalIds.size,
              this.recentCompletedGoals.length
            )
          : this.buildingsByNode.size,
      completedGoalsSummary:
        this.recentCompletedGoals.length > 0
          ? this.recentCompletedGoals.join(" · ")
          : "Tap a glowing plate inside the dome to start building",
      lastRewardOre: this.lastRewardOre || 30,
      tourActive: this.tourActive,
      tourStep: tourStep
        ? {
            index: this.tourStepIndex + 1,
            total: ASTRO_TOUR_STEPS.length,
            title: tourStep.title,
            instruction: tourStep.instruction,
          }
        : null,
      chapterCleared: this.chapterCleared,
      chapterStarsEarned: this.chapterStarsEarned,
      hazard: {
        type: this.hazard.type,
        timer: this.hazard.timer,
        duration: this.hazard.duration,
        raider: this.hazard.raider ? { ...this.hazard.raider } : null,
      },
      selectedNodeId: this.selectedNodeId,
      selectedNodeZone: this.selectedNodeZone,
      radialRing: this.getRadialRingActions(),
      records: this.records,
    };
  }

  saveNow() {
    const snapshot = {
      mode: this.mode,
      chapterId: this.chapterId,
      sol: this.sol,
      domeTier: this.domeTier,
      ore: this.ore,
      crew: this.crew,
      oxygenPct: this.oxygenPct,
      waterPct: this.waterPct,
      foodPct: this.foodPct,
      domeIntegrityPct: this.domeIntegrityPct,
      stormsSurvived: this.stormsSurvived,
      raidersDefeated: this.raidersDefeated,
      buildings: Array.from(this.buildingsByNode.values()),
    };
    saveColonySnapshot(snapshot);
    saveRecords(this.records);
  }

  restoreSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== "object") return false;
    this.startMode(snapshot.mode || "campaign", snapshot.chapterId || "chapter_1", {
      enableTour: false,
    });
    this.sol = Number(snapshot.sol || 1);
    this.domeTier = Number(snapshot.domeTier || 1);
    this.ore = Number(snapshot.ore ?? 360);
    this.crew = Number(snapshot.crew ?? 4);
    this.oxygenPct = Number(snapshot.oxygenPct ?? 75);
    this.waterPct = Number(snapshot.waterPct ?? 75);
    this.foodPct = Number(snapshot.foodPct ?? 75);
    this.domeIntegrityPct = Number(snapshot.domeIntegrityPct ?? 100);
    this.stormsSurvived = Number(snapshot.stormsSurvived || 0);
    this.raidersDefeated = Number(snapshot.raidersDefeated || 0);

    this.buildingsByNode.clear();
    if (Array.isArray(snapshot.buildings)) {
      for (const b of snapshot.buildings) {
        this._placeBuildingInternal(b.nodeId, b.type, b.level || 1, true);
      }
    }
    this._syncMobileEntities();
    this.recalculateRates();
    return true;
  }
}
