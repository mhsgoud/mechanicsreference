# Fracture Studio

Double-click **Launch viewer.cmd**. Requires Python 3 and a modern browser with WebGL. The launcher opens http://127.0.0.1:8765. Keep its terminal open while using the viewer. No internet connection or package installation is needed; Three.js is bundled. If that port is already in use by the viewer, open the URL directly.

Play/pause, scrub the timeline, adjust playback speed, orbit, pan, zoom, change deformation amplification, reveal the damaged core, or inspect the finite-element mesh. Space toggles playback when focus is outside a control. Reset view restores the front view. Default amplification is ×12; use **True scale ×1** for the physical displacement.

## Data and interpretation

- Source: NotchedPlateWithHole/output/deformed_1.vtu through deformed_879.vtu, plus load_displacement.csv.
- The VTU coordinates already include displacement. Reference coordinates are recovered as X = Points − uh. Displayed coordinates are X + amplification × uh.
- Damage is d = clamp(1 − s, 0, 1), confirmed against the solver's stiffness degradation s² + η. Small phase-field overshoots are clipped for display.
- Full original triangle topology is retained: 89,214 triangles, with coincident H1 visualization vertices consolidated into 44,916 vertices.
- 105 frames are retained adaptively: maximum nodal damage change ≥0.035, displacement component change ≥0.012, or a gap of 20 source steps. First and last frames are always included. These are selection triggers, not a guaranteed interpolation-error bound.
- Displacement uses per-frame, per-component signed 16-bit quantization; damage uses unsigned 16-bit quantization. Geometry uses float32. Frames are individually gzip compressed, fetched on demand, and cached in a bounded neighborhood. The complete compressed simulation assets are approximately 18.8 MB (decimal), but are not loaded upfront.
- Both displacement and nodal damage are linearly interpolated on the GPU. Intermediate images are visual interpolations, not additional solved states. Playback advances uniformly in source-step number; it does not represent physical time.
- “Reveal damaged core” smoothly fades material from d = 0.88 to 0.995. This emphasizes the diffuse crack path; it does not reconstruct discrete crack faces or measure crack opening. Disable it to retain the complete continuum surface.
- Displacement and reaction load readouts retain the simulation's original numeric units; the output CSV does not declare units. The response curve uses all CSV rows.

Three.js 0.180.0, MIT licensed. Local assets only. To share, copy the entire folder, or serve it using any static HTTP server. Opening index.html directly with file:// is unsupported by browser module and data-fetch rules.
