import test from "node:test";
import assert from "node:assert/strict";
import { ColonySimulation } from "../src/sim/colonySim.js";
import { DOME_TIERS } from "../src/content/campaignData.js";

test("MK1 to MK3 dome expansion unlocks 8 -> 16 -> 24 interior plates and 8 -> 13 -> 19 exterior pads", () => {
  const sim = new ColonySimulation({ mode: "campaign", chapterId: "chapter_1" });
  assert.equal(sim.domeTier, 1);
  assert.equal(sim.getUnlockedInteriorPlates().length, 8);
  assert.equal(sim.getUnlockedExteriorPads().length, 8);

  sim.ore = 1000;
  const exp2 = sim.expandDome();
  assert.equal(exp2.ok, true);
  assert.equal(sim.domeTier, 2);
  assert.equal(sim.getUnlockedInteriorPlates().length, 16);
  assert.equal(sim.getUnlockedExteriorPads().length, 13);

  const exp3 = sim.expandDome();
  assert.equal(exp3.ok, true);
  assert.equal(sim.domeTier, 3);
  assert.equal(sim.getUnlockedInteriorPlates().length, 24);
  assert.equal(sim.getUnlockedExteriorPads().length, DOME_TIERS[3].exteriorPadCount);
  assert.equal(sim.getUnlockedExteriorPads().length, 19);
});

test("Radial Build Ring matches exact compass layout for interior and exterior nodes and advances Astro Tour to 9/12 after 4 builds", () => {
  const sim = new ColonySimulation({
    mode: "campaign",
    chapterId: "chapter_1",
    enableTour: true,
  });
  sim.ore = 500;

  // Select interior plate in_0
  sim.selectNode("in_0");
  const intRing = sim.getRadialRingActions();
  assert.equal(intRing.mode, "build");
  assert.deepEqual(
    intRing.slots.map((s) => `${s.slot}:${s.position}:${s.id}:${s.cost}`),
    [
      "1:top:oxygen:45",
      "2:right:water:45",
      "3:bottom:food:50",
      "4:left:habitat:55",
    ]
  );

  // Build Oxygen (slot 1), Water (slot 2), Food (slot 3), Habitat (slot 4) across 4 interior plates
  assert.equal(sim.triggerRadialSlot(1).ok, true);
  sim.selectNode("in_1");
  assert.equal(sim.triggerRadialSlot(2).ok, true);
  sim.selectNode("in_2");
  assert.equal(sim.triggerRadialSlot(3).ok, true);
  sim.selectNode("in_3");
  assert.equal(sim.triggerRadialSlot(4).ok, true);

  // Astro's tour should now be on step 9/12 (Power the Outpost)
  const hud = sim.getHUDState();
  assert.equal(hud.tourStep.index, 9);
  assert.equal(hud.tourStep.total, 12);

  // Select exterior pad out_0 and check exterior radial build ring
  sim.selectNode("out_0");
  const extRing = sim.getRadialRingActions();
  assert.deepEqual(
    extRing.slots.map((s) => `${s.slot}:${s.position}:${s.id}:${s.cost}`),
    [
      "1:top:solar:40",
      "2:right:ore_rig:50",
      "3:bottom:droid_bay:60",
      "4:left:defense_tower:65",
    ]
  );
});

test("Upgrade, Repair, and Sell actions work accurately on existing buildings", () => {
  const sim = new ColonySimulation({ mode: "practice" });
  sim.ore = 500;
  sim.selectNode("in_0"); // Pre-seeded Oxygen MK1
  const manageRing = sim.getRadialRingActions();
  assert.equal(manageRing.mode, "manage");

  // Upgrade to MK2 (slot 1)
  const upg = sim.triggerRadialSlot(1);
  assert.equal(upg.ok, true);
  assert.equal(sim.buildingsByNode.get("in_0").level, 2);

  // Sell (slot 3) refunds 70% of (45 + 55) = 70 ore
  const oreBeforeSell = sim.ore;
  const sold = sim.triggerRadialSlot(3);
  assert.equal(sold.ok, true);
  assert.equal(sold.refund, 70);
  assert.equal(sim.ore, oreBeforeSell + 70);
  assert.equal(sim.buildingsByNode.has("in_0"), false);
});

test("Dust Storm and Alien Raider hazards interact with Droid Bays and Defense Towers", () => {
  const sim = new ColonySimulation({ mode: "campaign", chapterId: "chapter_2" });
  // Chapter 2 starts with 1 Droid Bay (1/2 repair droids) and negative power (-3.8 pwr)
  assert.equal(sim.totalRovers, 1);
  assert.equal(sim.netPower < 0, true);
  assert.equal(
    sim.getCoachingAlert(),
    "Power short – build Solar on a sand pad"
  );

  // Build Solar and a second Droid Bay
  sim.buildOnNode("out_0", "solar");
  sim.buildOnNode("out_2", "droid_bay");
  assert.equal(sim.totalRovers, 2);

  // Trigger dust storm and step through completion
  sim.triggerDustStorm(6);
  for (let i = 0; i < 30; i++) sim.step(0.25);
  assert.equal(sim.stormsSurvived, 1);
  assert.equal(sim.chapterCleared, true);
  assert.equal(sim.chapterStarsEarned >= 2, true);

  // Trigger Alien Raider and build Defense Towers to defeat it
  sim.buildOnNode("out_4", "defense_tower");
  sim.buildOnNode("out_5", "defense_tower");
  sim.triggerAlienRaider(80);
  for (let i = 0; i < 40; i++) sim.step(0.25);
  assert.equal(sim.raidersDefeated, 1);
});
