// ============================================================================
// RED DOME OUTPOST — Main Application Entrypoint & Game Loop
// ============================================================================

import { ColonySimulation } from "./sim/colonySim.js";
import { SceneManager } from "./render/sceneManager.js";
import { HUDController } from "./ui/hudController.js";
import { SoundEngine } from "./audio/soundEngine.js";

const canvas = document.getElementById("game-canvas");
const sound = new SoundEngine();

// Initialize Colony Simulation (starts in Chapter 2 layout with empty plate selected so the Build Ring is immediately visible)
const sim = new ColonySimulation({
  mode: "campaign",
  chapterId: "chapter_2",
  enableTour: false,
});
sim.selectNode("in_7");

let hud = null;
const sceneManager = new SceneManager(canvas, sim, (pickedNodeId) => {
  sim.selectNode(pickedNodeId);
  sound.playSelect();
  if (hud) hud.syncHUD();
});
sceneManager.setCameraPreset("overview");

hud = new HUDController(sim, sceneManager, sound);

// Handle simulation events -> trigger audio & 3D VFX
function processSimulationEvents() {
  const events = sim.flushEvents();
  for (const ev of events) {
    if (ev.type === "build") {
      sound.playBuild();
    } else if (ev.type === "upgrade" || ev.type === "dome_expand") {
      sound.playUpgrade();
      if (ev.type === "dome_expand") {
        sceneManager.setCameraPreset("overview");
      }
    } else if (ev.type === "repair") {
      sound.playRepair();
    } else if (ev.type === "sell") {
      sound.playSell();
    } else if (ev.type === "storm_start") {
      sound.playStormSiren();
    } else if (ev.type === "raider_spawn") {
      sound.playRaiderAlert();
    } else if (ev.type === "turret_fire") {
      sound.playTurretLaser();
      // Spawn visual laser beams from defense towers (or hub) to the saucer
      let fired = false;
      for (const bld of sim.buildingsByNode.values()) {
        if (bld.type === "defense_tower") {
          const pad = sim.nodeMap.get(bld.nodeId);
          if (pad) {
            sceneManager.spawnLaserBolt(
              pad.x,
              1.1,
              pad.z,
              ev.targetX,
              ev.targetY,
              ev.targetZ
            );
            fired = true;
          }
        }
      }
      if (!fired) {
        sceneManager.spawnLaserBolt(
          0,
          3.2,
          0,
          ev.targetX,
          ev.targetY,
          ev.targetZ
        );
      }
    } else if (ev.type === "raider_explode") {
      sound.playExplosion();
      sceneManager.spawnSaucerExplosion(ev.x, ev.y, ev.z);
    } else if (ev.type === "chapter_complete") {
      sound.playVictory();
      sceneManager.confettiActive = true;
    }
  }
}

// Gamepad API support (A/B/X/Y or D-pad for radial slots 1-4)
let prevGamepadButtons = [];
function pollGamepad() {
  if (typeof navigator === "undefined" || !navigator.getGamepads) return;
  const pads = navigator.getGamepads();
  const gp = pads && pads[0];
  if (!gp) return;

  const pressed = (idx) =>
    Boolean(gp.buttons[idx]?.pressed) && !prevGamepadButtons[idx];

  if (pressed(3) || pressed(12)) sim.triggerRadialSlot(1); // Y or D-Up -> Top (1)
  if (pressed(1) || pressed(15)) sim.triggerRadialSlot(2); // B or D-Right -> Right (2)
  if (pressed(0) || pressed(13)) sim.triggerRadialSlot(3); // A or D-Down -> Bottom (3)
  if (pressed(2) || pressed(14)) sim.triggerRadialSlot(4); // X or D-Left -> Left (4)
  if (pressed(4)) hud._cycleSelectedNode(-1); // LB
  if (pressed(5)) hud._cycleSelectedNode(1); // RB

  prevGamepadButtons = gp.buttons.map((b) => Boolean(b?.pressed));
}

window.addEventListener("resize", () => {
  sceneManager.resize();
  sceneManager.setCameraPreset("overview");
});

let lastTime = performance.now();
let hudSyncAccum = 0;

function animate(now) {
  requestAnimationFrame(animate);
  const rawDt = Math.min(0.1, Math.max(0.001, (now - lastTime) / 1000));
  lastTime = now;

  pollGamepad();
  sim.step(rawDt);
  processSimulationEvents();
  sceneManager.updateAndRender(rawDt);

  hudSyncAccum += rawDt;
  if (hudSyncAccum >= 0.15) {
    hudSyncAccum = 0;
    hud.syncHUD();
  }
}

requestAnimationFrame(animate);

// Expose deterministic testing & showcase helpers on window.__RED_DOME__
window.__RED_DOME__ = {
  sim,
  sceneManager,
  hud,
  sound,
  loadShowcaseScene(sceneName) {
    sceneManager.confettiActive = false;
    sceneManager.rocketLandingTimer = 0;

    if (sceneName === "hud_build_ring") {
      // Matches landscape_3.png / portrait_3.png
      sim.startMode("campaign", "chapter_2", { enableTour: false });
      sim.selectNode("in_7");
      hud.setCinematicHudHidden(false);
      sceneManager.setCameraPreset("overview");
    } else if (sceneName === "rocket_landing") {
      // Matches landscape_6.png / portrait_6.png
      sim.startMode("campaign", "chapter_1", { enableTour: true });
      sim.selectNode(null);
      hud.setCinematicHudHidden(true);
      sceneManager.setCameraPreset("landing");
    } else if (sceneName === "dome_closeup") {
      // Matches landscape_2.png / portrait_2.png
      sim.startMode("campaign", "chapter_1", { enableTour: false });
      sim.ore = 600;
      sim.buildOnNode("in_0", "water");
      sim.buildOnNode("in_3", "oxygen");
      sim.buildOnNode("in_7", "food");
      sim.buildOnNode("in_5", "food");
      sim.buildOnNode("in_6", "habitat");
      sim.selectNode(null);
      hud.setCinematicHudHidden(true);
      sceneManager.setCameraPreset("closeup");
    } else if (sceneName === "dust_storm") {
      // Matches landscape_4.png / portrait_4.png
      sim.startMode("campaign", "chapter_2", { enableTour: false });
      sim.domeIntegrityPct = 62;
      sim.triggerDustStorm(30);
      sim.selectNode(null);
      hud.setCinematicHudHidden(true);
      sceneManager.setCameraPreset("storm");
    } else if (sceneName === "ufo_raid") {
      // Matches landscape_1.png / portrait_1.png
      sim.startMode("campaign", "chapter_3", { enableTour: false });
      sim.domeIntegrityPct = 58;
      sim.triggerAlienRaider(200);
      sim.selectNode(null);
      hud.setCinematicHudHidden(false);
      // Hide HUD cards but keep red alert vignette for cinematic shot
      document.querySelector(".top-bar").classList.add("hidden");
      document.querySelector(".left-cards-stack").classList.add("hidden");
      document.getElementById("radial-ring").classList.add("hidden");
      sceneManager.setCameraPreset("raider");
    } else if (sceneName === "mk3_victory") {
      // Matches landscape_5.png / portrait_5.png
      sim.startMode("campaign", "chapter_4", { enableTour: false });
      sim.ore = 2000;
      sim.expandDome(); // MK3
      sim.buildOnNode("in_8", "habitat");
      sim.buildOnNode("in_9", "food");
      sim.buildOnNode("in_10", "oxygen");
      sim.buildOnNode("in_11", "water");
      sim.buildOnNode("out_12", "ore_rig");
      sim.buildOnNode("out_15", "defense_tower");
      sim.buildOnNode("out_17", "droid_bay");
      sim.selectNode(null);
      sceneManager.confettiActive = true;
      hud.setCinematicHudHidden(true);
      sceneManager.setCameraPreset("overview");
    }
    // Restore top-bar/left-cards visibility if not ufo_raid
    if (sceneName !== "ufo_raid") {
      document.querySelector(".top-bar").classList.remove("hidden");
      document.querySelector(".left-cards-stack").classList.remove("hidden");
    }
    // Snap camera immediately for deterministic screenshot capture
    sceneManager.cameraOrbitAngle = sceneManager.targetOrbitAngle;
    sceneManager.cameraElevation = sceneManager.targetElevation;
    sceneManager.cameraDistance = sceneManager.targetDistance;
    sceneManager.cameraLookAt.copy(sceneManager.targetLookAt);
    sceneManager.updateAndRender(0.05);
    hud.syncHUD();
  },
};
