# Pillow — local viewer

Source: C:\Users\MohsenGoudar_amrloyo\OneDrive - Rocscience Inc\Desktop\CalculiX\Pillow/paraview/static_deformed.pvd

11 saved states, 3003 source nodes, 400 quadratic hexahedra, 5280 exterior triangles. Midside nodes retained. Reference recovery verified against undeformed VTU (max difference 5e-08). Full-pillow symmetry uses eight shared instances about x/y/z = 0. No added simulation solve or fabricated zero state.

Pressure is 0.01*min(total time,1); vertical displacement is the maximum exported Uz. Units are the consistent units of the supplied input. The second step holds pressure and tightens convergence. CSV included. The static.dat file has no reaction history.

Open http://127.0.0.1:8790/pillow-viewer/ through the local website, or run Launch viewer.cmd to serve this folder on port 8792. All Three.js libraries and data are local.

Example documentation: https://github.com/calculix/CalculiX-Examples/tree/master/Pillow
