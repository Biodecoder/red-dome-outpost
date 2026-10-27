# Red Dome Outpost (`red-dome-outpost`) — v1.0

A 3D WebGL Mars colony builder recreated from **Red Dome Outpost** (`https://www.playdrop.ai/@olivier/red-dome-outpost`), built with Three.js, Vanilla ES Modules, responsive desktop/mobile HUD, and a zero-dependency procedural WebAudio synthesizer.

## Quick Start

```bash
cd /Users/derya/Gemini-4/red-dome-outpost
npm start
# Open http://127.0.0.1:4390
```

Run the automated unit & simulation test suite:

```bash
npm test
```

## Core Gameplay & Features

- **Tactile Low-Poly 3D Martian Colony**:
  - **Central Command Hub** with gold-framed airlock doorway, geodesic roof cupola, and pulsing comms beacon.
  - **Geodesic Glass Dome & Golden Collar**: Scales from **MK1** (8 interior plates, 8 outdoor pads) → **MK2** (16 interior plates, 13 outdoor pads) → **MK3** (24 interior plates, **19 outdoor sand pads** with glowing orange **Rich Ore Seams**).
  - **Dynamic Spiral Stress Cracks**: Curved 6-arm pinwheel stress cracks appear across the dome glass as Dome Integrity drops during Dust Storms and Alien Raids, and disappear as your 6-wheeled **Rover Droids** weld them shut.
- **One-Tap Radial Build & Action Ring**:
  - **Interior Square Plates**: `[1] Oxygen Tower (45 ore)`, `[2] Water Plant (45 ore)`, `[3] Hydroponic Farm (50 ore)`, `[4] Habitat Pod (55 ore)`.
  - **Exterior Hexagonal Sand Pads**: `[1] Solar Array (40 ore)`, `[2] Ore Rig (50 ore, 2× on Rich Seams)`, `[3] Droid Bay (60 ore)`, `[4] Defense Tower (65 ore)`.
  - **Existing Structures & Central Hub**: One-tap **Upgrade (`MK2`/`MK3`)**, **Repair**, **Sell (`70% refund`)**, **Overclock**, **Expand Dome**, and **Supply Drop**.
- **Game Modes**:
  - **Astro's 12-Step Guided Tour** + **4 Campaign Chapters** (*First Breath*, *Weather the Storm*, *Repel the Raider*, *Red Dome Metropolis*) with `1–3 ★` star ratings.
  - **Endless Mode** with Colony Ranks (*Landing Pad Pioneer* → *Red Dome Sovereign*) and persistent high-score records.
  - **Practice Yard** sandbox for risk-free experimentation.
- **Controls & Responsive Orientation**:
  - Mouse/Touch raycasting, camera orbit drag, scroll zoom, keyboard shortcuts (`1–4` radial slots, `Tab` cycle plates/pads, `Space` pause, `Esc` close ring), and Gamepad API support across both **Landscape** and **Portrait** orientations.
