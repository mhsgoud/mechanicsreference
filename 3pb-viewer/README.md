# Three-point bending — local viewer

Source: CalculiX/3PB/paraview/Biegung_deformed.pvd and the accompanying Biegung_deformed.vtu. All 52 saved states retained. The solid model has 5,175 nodes and 3,296 linear hexahedra; 3,536 boundary quads become 7,072 display triangles. Shared interior faces are removed. Reference coordinates recovered as Points − Displacement agree with Biegung_0052.vtu within 5e-7 in source units.

Playback interpolates solved displacement and exported nodal fields. The initial view is the final saved state. Scale 1 shows the saved geometry; amplification does not recompute stress or contact. Color ranges are recalculated per frame.

The load–displacement curve reproduces the supplied df.gpl convention: displacement = 20 × step time in mm, load = −4 × summed NLOAD RFz / 1000 in kN. The factor 4 restores full-specimen force from the symmetry-reduced model, while the Full beam option reflects the quarter geometry across x = 0 and y = 0. Reflected instances share mesh buffers, so no extra animation data is loaded. Symmetry cut faces are removed in full view. Scalar fields are mirrored and displacement directions are reflected with the geometry. The input applies a linear prescribed displacement ramp. A CSV is included. The first recorded state is at time 0.01; no zero-load point is fabricated.

Run Launch viewer.cmd with Python 3 installed, or view through the local Mechanics Reference website. All browser libraries and simulation data are bundled. No online deployment is needed.

The magenta theoretical elastic range matches params.gnu and df.gpl exactly: (0, 0) to (1.9047619047619047 mm, 45.97377706666666 kN). This is an analytical reference, not a new elastic FE simulation. Its slope is 24.136 kN/mm. The force convention remains full-specimen force in both geometry modes.
