# Kasten local viewer

Embedded in the local Mechanics Reference section “Box Deformation: Shells and Plasticity”. Uses all 93 entries in Kasten_deformed.pvd, from recorded time 1 to 2. Initial display is the final state; Play restarts at the first saved frame. Geometry and fields interpolate between increments. Scale 1 reproduces saved deformation.

The 2,012 source nodes and 240 VTK quadratic hexahedra are the CalculiX shell export. Boundary extraction retains all midside nodes; each of 608 boundary faces adds a center evaluated using eight-node serendipity weights (−1/4 on corners and 1/2 on midsides). Each face becomes eight triangles: 4,864 display triangles. This is a piecewise-linear rendering of the quadratic surface. The extra 608 display nodes are not solver nodes. Full topology consistency is checked across frames; reference coordinates are verified against Kasten_0093.vtu.

The bundled source input and VTU preserve the supplied data. Deformation amplification does not recompute fields. Color limits vary by frame. The first saved frame is already at the end of the first loading step. No new simulation is performed.
