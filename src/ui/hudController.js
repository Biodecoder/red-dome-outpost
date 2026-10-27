// ============================================================================
// RED DOME OUTPOST — HUD Controller, Radial Build Ring & Input Bindings
// ============================================================================

const RING_ICONS = {
  oxygen: `<svg viewBox="0 0 24 24" fill="none" stroke="#57d6c8" stroke-width="2.2"><rect x="7" y="3" width="10" height="18" rx="5"/><line x1="7" y1="10" x2="17" y2="10"/></svg>`,
  water: `<svg viewBox="0 0 24 24" fill="none" stroke="#4da6ff" stroke-width="2.2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>`,
  food: `<svg viewBox="0 0 24 24" fill="none" stroke="#61c468" stroke-width="2.2"><path d="M4 18h16"/><path d="M6 18v-5a6 6 0 0 1 12 0v5"/><line x1="10" y1="14" x2="10" y2="18"/><line x1="14" y1="13" x2="14" y2="18"/></svg>`,
  habitat: `<svg viewBox="0 0 24 24" fill="none" stroke="#6eb2ff" stroke-width="2.2"><path d="M3 17h18"/><path d="M5 17a7 7 0 0 1 14 0"/><rect x="10" y="13" width="4" height="4"/></svg>`,
  solar: `<svg viewBox="0 0 24 24" fill="none" stroke="#f5b942" stroke-width="2.2"><polygon points="13 2 4 14 11 14 10 22 20 10 13 10 13 2"/></svg>`,
  ore_rig: `<svg viewBox="0 0 24 24" fill="none" stroke="#e8833a" stroke-width="2.2"><polygon points="12 2 21 7 21 17 12 22 3 17 3 7"/><line x1="12" y1="7" x2="12" y2="18"/></svg>`,
  droid_bay: `<svg viewBox="0 0 24 24" fill="none" stroke="#57d6c8" stroke-width="2.2"><rect x="4" y="9" width="16" height="8" rx="3"/><circle cx="8" cy="18" r="2"/><circle cx="16" cy="18" r="2"/><line x1="12" y1="5" x2="12" y2="9"/></svg>`,
  defense_tower: `<svg viewBox="0 0 24 24" fill="none" stroke="#ef5350" stroke-width="2.2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="14"/></svg>`,
  upgrade: `<svg viewBox="0 0 24 24" fill="none" stroke="#f7c46c" stroke-width="2.2"><polyline points="18 15 12 9 6 15"/><polyline points="18 9 12 3 6 9"/></svg>`,
  repair: `<svg viewBox="0 0 24 24" fill="none" stroke="#57d6c8" stroke-width="2.2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`,
  sell: `<svg viewBox="0 0 24 24" fill="none" stroke="#e8833a" stroke-width="2.2"><circle cx="12" cy="12" r="9"/><path d="M15 9.5c-.5-1-1.5-1.5-3-1.5s-2.5.8-2.5 2c0 2.5 5.5 1.5 5.5 4 0 1.2-1 2-3 2s-2.5-.5-3-1.5"/><line x1="12" y1="6" x2="12" y2="18"/></svg>`,
  power: `<svg viewBox="0 0 24 24" fill="none" stroke="#f5b942" stroke-width="2.2"><polygon points="13 2 4 14 11 14 10 22 20 10 13 10 13 2"/></svg>`,
  dome: `<svg viewBox="0 0 24 24" fill="none" stroke="#f7c46c" stroke-width="2.2"><path d="M2 18h20"/><path d="M4 18a8 8 0 0 1 16 0"/></svg>`,
  shield: `<svg viewBox="0 0 24 24" fill="none" stroke="#4da6ff" stroke-width="2.2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  rocket: `<svg viewBox="0 0 24 24" fill="none" stroke="#e8833a" stroke-width="2.2"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/></svg>`,
};

export class HUDController {
  constructor(sim, sceneManager, soundEngine) {
    this.sim = sim;
    this.sceneManager = sceneManager;
    this.sound = soundEngine;

    this.els = {
      hudRoot: document.getElementById("hud-root"),
      raidVignette: document.getElementById("raid-vignette"),
      pillOre: document.getElementById("pill-ore"),
      valOre: document.getElementById("val-ore"),
      pillPwr: document.getElementById("pill-pwr"),
      valPwr: document.getElementById("val-pwr"),
      pillO2: document.getElementById("pill-o2"),
      valO2: document.getElementById("val-o2"),
      barO2: document.getElementById("bar-o2"),
      pillH2O: document.getElementById("pill-h2o"),
      valH2O: document.getElementById("val-h2o"),
      pillFood: document.getElementById("pill-food"),
      valFood: document.getElementById("val-food"),
      barFood: document.getElementById("bar-food"),
      pillCrew: document.getElementById("pill-crew"),
      valCrew: document.getElementById("val-crew"),
      pillDome: document.getElementById("pill-dome"),
      valDome: document.getElementById("val-dome"),
      barDome: document.getElementById("bar-dome"),
      valSol: document.getElementById("val-sol"),
      btnPause: document.getElementById("btn-pause"),
      btnSpeed: document.getElementById("btn-speed"),
      btnHelp: document.getElementById("btn-help"),
      btnNewGame: document.getElementById("btn-new-game"),
      chapterKickerNum: document.getElementById("chapter-kicker-num"),
      chapterKickerTitle: document.getElementById("chapter-kicker-title"),
      objectiveTitle: document.getElementById("objective-title"),
      objectiveProgress: document.getElementById("objective-progress"),
      objectiveDesc: document.getElementById("objective-desc"),
      bonusLine: document.getElementById("bonus-line"),
      coachingBanner: document.getElementById("coaching-banner"),
      secondaryKicker: document.getElementById("secondary-kicker"),
      secondaryTitle: document.getElementById("secondary-title"),
      secondarySub: document.getElementById("secondary-sub"),
      btnSelectHub: document.getElementById("btn-select-hub"),
      btnTriggerStorm: document.getElementById("btn-trigger-storm"),
      btnTriggerRaider: document.getElementById("btn-trigger-raider"),
      radialRing: document.getElementById("radial-ring"),
      btnRingClose: document.getElementById("btn-ring-close"),
      ringCenterLabel: document.getElementById("ring-center-label"),
      modalNewGame: document.getElementById("modal-new-game"),
      btnCloseNewGame: document.getElementById("btn-close-new-game"),
      modalHelp: document.getElementById("modal-help"),
      btnCloseHelp: document.getElementById("btn-close-help"),
    };

    this.slotButtons = [1, 2, 3, 4].map((slot) => ({
      slot,
      btn: document.getElementById(`ring-slot-${slot}`),
      icon: document.getElementById(`ring-icon-${slot}`),
      label: document.getElementById(`ring-label-${slot}`),
      cost: document.getElementById(`ring-cost-${slot}`),
    }));

    this._bindEvents();
    this.syncHUD();
  }

  _bindEvents() {
    // Pause / Resume
    this.els.btnPause.addEventListener("click", () => {
      this.sim.paused = !this.sim.paused;
      this.sound.playSelect();
      this.syncHUD();
    });

    // Speed 1x -> 2x -> 3x -> 1x
    this.els.btnSpeed.addEventListener("click", () => {
      this.sim.speedMultiplier =
        this.sim.speedMultiplier === 1 ? 2 : this.sim.speedMultiplier === 2 ? 3 : 1;
      this.sound.playSelect();
      this.syncHUD();
    });

    // Help Modal
    this.els.btnHelp.addEventListener("click", () => {
      this.els.modalHelp.classList.remove("hidden");
      this.sound.playSelect();
    });
    this.els.btnCloseHelp.addEventListener("click", () => {
      this.els.modalHelp.classList.add("hidden");
    });

    // New Game / Mode Selector Modal
    this.els.btnNewGame.addEventListener("click", () => {
      this._refreshNewGameModalStars();
      this.els.modalNewGame.classList.remove("hidden");
      this.sound.playSelect();
    });
    this.els.btnCloseNewGame.addEventListener("click", () => {
      this.els.modalNewGame.classList.add("hidden");
    });

    document.querySelectorAll(".mode-card").forEach((card) => {
      card.addEventListener("click", () => {
        const mode = card.dataset.mode || "campaign";
        const chapter = card.dataset.chapter || "chapter_1";
        const enableTour = card.dataset.tour === "true";
        this.els.modalNewGame.classList.add("hidden");
        this.sim.startMode(mode, chapter, { enableTour });
        this.sceneManager.confettiActive = false;
        this.sceneManager.setCameraPreset("overview");
        this.sceneManager.triggerRocketTouchdownAnimation();
        this.sound.playRocketLand();
        // Select a default interior plate so the build ring is ready immediately
        this.sim.selectNode("in_6");
        this.syncHUD();
      });
    });

    // Quick Action Buttons (Hub / Storm / UFO Raid)
    this.els.btnSelectHub.addEventListener("click", () => {
      this.sim.selectNode("hub");
      this.sound.playSelect();
      this.syncHUD();
    });
    this.els.btnTriggerStorm.addEventListener("click", () => {
      this.sim.triggerDustStorm(20);
      this.sound.playStormSiren();
      this.syncHUD();
    });
    this.els.btnTriggerRaider.addEventListener("click", () => {
      this.sim.triggerAlienRaider(160);
      this.sound.playRaiderAlert();
      this.syncHUD();
    });

    // Radial Ring Slots 1..4
    for (const entry of this.slotButtons) {
      entry.btn.addEventListener("click", () => {
        this.sim.triggerRadialSlot(entry.slot);
        this.syncHUD();
      });
    }

    // Close Radial Ring
    this.els.btnRingClose.addEventListener("click", () => {
      this.sim.selectNode(null);
      this.sound.playSelect();
      this.syncHUD();
    });

    // Keyboard Shortcuts: 1-4 (radial ring), Space (pause), Tab (cycle plates/pads), Escape (close ring/modal)
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.els.modalHelp.classList.add("hidden");
        this.els.modalNewGame.classList.add("hidden");
        this.sim.selectNode(null);
        this.syncHUD();
        return;
      }
      if (e.key === " ") {
        e.preventDefault();
        this.sim.paused = !this.sim.paused;
        this.sound.playSelect();
        this.syncHUD();
        return;
      }
      if (["1", "2", "3", "4"].includes(e.key)) {
        if (!this.sim.selectedNodeId) {
          this.sim.selectNode("in_6");
        }
        this.sim.triggerRadialSlot(Number(e.key));
        this.syncHUD();
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        this._cycleSelectedNode(e.shiftKey ? -1 : 1);
        this.sound.playSelect();
        this.syncHUD();
      }
    });
  }

  _cycleSelectedNode(dir = 1) {
    const allUnlocked = [
      ...this.sim.getUnlockedInteriorPlates().map((p) => p.id),
      ...this.sim.getUnlockedExteriorPads().map((p) => p.id),
      "hub",
    ];
    if (allUnlocked.length === 0) return;
    const idx = allUnlocked.indexOf(this.sim.selectedNodeId);
    const nextIdx =
      idx === -1
        ? 0
        : (idx + dir + allUnlocked.length) % allUnlocked.length;
    this.sim.selectNode(allUnlocked[nextIdx]);
  }

  _refreshNewGameModalStars() {
    const starsMap = this.sim.records.chapterStars || {};
    for (const cid of ["chapter_1", "chapter_2", "chapter_3", "chapter_4"]) {
      const el = document.getElementById(`stars-${cid}`);
      if (!el) continue;
      const count = starsMap[cid] || 0;
      el.textContent = "★".repeat(count) + "☆".repeat(Math.max(0, 3 - count));
    }
    const endlessBadge = document.getElementById("endless-best-badge");
    if (endlessBadge) {
      endlessBadge.textContent = `SOL ${this.sim.records.bestEndlessSol || 1}`;
    }
  }

  setCinematicHudHidden(hidden) {
    this.els.hudRoot.classList.toggle("hidden", Boolean(hidden));
  }

  syncHUD() {
    const s = this.sim.getHUDState();

    // 1. Top Resource Bar
    this.els.valOre.textContent = String(s.ore);

    const pwrStr =
      s.netPower >= 0 ? `+${s.netPower.toFixed(1)}` : s.netPower.toFixed(1);
    this.els.valPwr.textContent = pwrStr;
    this.els.pillPwr.classList.toggle("shortage", s.netPower < 0);

    this.els.valO2.textContent = `${s.oxygenPct}%`;
    this.els.barO2.style.width = `${s.oxygenPct}%`;
    this.els.pillO2.classList.toggle("shortage", s.oxygenPct < 40);

    const h2oStr =
      s.netH2O >= 0 ? `+${s.netH2O.toFixed(1)}` : s.netH2O.toFixed(1);
    this.els.valH2O.textContent = h2oStr;
    this.els.pillH2O.classList.toggle("shortage", s.netH2O < 0);

    this.els.valFood.textContent = `${s.foodPct}%`;
    this.els.barFood.style.width = `${s.foodPct}%`;
    this.els.pillFood.classList.toggle("shortage", s.foodPct < 40);

    this.els.valCrew.textContent = `${s.crew}/${s.crewCapacity}`;
    this.els.valDome.textContent = `${s.domeIntegrityPct}%`;
    this.els.barDome.style.width = `${s.domeIntegrityPct}%`;

    // 2. Sol & Controls
    this.els.valSol.textContent = `SOL ${s.sol}`;
    this.els.btnPause.textContent = s.paused ? "▶" : "II";
    this.els.btnSpeed.textContent = `${s.speedMultiplier}×`;

    // 3. Red Alert Vignette during Alien Raider UFO Attack
    this.els.raidVignette.classList.toggle(
      "hidden",
      s.hazard.type !== "raider"
    );

    // 4. Left Mission Card
    if (s.mode === "campaign" && this.sim.currentChapter) {
      const ch = this.sim.currentChapter;
      this.els.chapterKickerNum.textContent = `CHAPTER ${ch.chapterNumber}/${ch.totalChapters}`;
      this.els.chapterKickerTitle.textContent = ch.headerLabel
        .replace(`CHAPTER ${ch.chapterNumber}/${ch.totalChapters}`, "")
        .trim();
    } else {
      this.els.chapterKickerNum.textContent = s.chapterHeader;
      this.els.chapterKickerTitle.textContent = "";
    }

    this.els.objectiveTitle.textContent = s.objectiveTitle;
    this.els.objectiveProgress.textContent = s.objectiveProgressText;
    this.els.objectiveDesc.textContent = s.objectiveDescription;
    this.els.bonusLine.textContent = s.bonusText;
    this.els.coachingBanner.textContent = s.coachingAlert;

    // 5. Secondary Card (Astro Tour or Completed Goals)
    if (s.tourActive && s.tourStep) {
      this.els.secondaryKicker.textContent = `ASTRO'S TOUR · STEP ${s.tourStep.index}/${s.tourStep.total}`;
      this.els.secondaryTitle.textContent = s.tourStep.title;
      this.els.secondarySub.textContent = s.tourStep.instruction;
    } else {
      this.els.secondaryKicker.textContent = `${s.completedGoalsCount} GOALS COMPLETE`;
      this.els.secondaryTitle.textContent = s.completedGoalsSummary;
      this.els.secondarySub.textContent = `+${s.lastRewardOre} ore`;
    }

    // 6. Radial Build / Action Ring
    if (!s.radialRing) {
      this.els.radialRing.classList.add("hidden");
    } else {
      this.els.radialRing.classList.remove("hidden");
      this.els.ringCenterLabel.textContent =
        s.radialRing.mode === "build"
          ? "Build"
          : s.radialRing.mode === "hub"
            ? "Hub"
            : "Manage";

      for (const entry of this.slotButtons) {
        const slotSpec = s.radialRing.slots.find((sl) => sl.slot === entry.slot);
        if (!slotSpec) continue;
        entry.label.textContent = slotSpec.label;
        entry.cost.textContent = slotSpec.costText;
        entry.btn.disabled = Boolean(slotSpec.disabled);
        entry.icon.innerHTML =
          RING_ICONS[slotSpec.icon] || RING_ICONS.oxygen;
      }
    }
  }
}
