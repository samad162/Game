# Horizon Apex Drive

A high-fidelity browser racing app inspired by open-world festival racers.

## Features
- Real-time 3D rendering (Three.js/WebGL) with smoother performance
- More realistic lighting, terrain, road depth, and camera-follow driving
- Day/night environment transitions with road lamps at night
- Neon nitro boost trails and lane glow while boosting
- Character switching (no verification/login required)
- Session safety lock: each run is limited to 2 hours

## Run
```bash
python3 -m http.server 4173
```
Open `http://localhost:4173`.

> Note: the app loads Three.js from a CDN, so internet access is required.

## Controls
- `W` accelerate
- `S` brake
- `A / D` steer
- `Shift` nitro
