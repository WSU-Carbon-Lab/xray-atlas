Pinned kkcalc2 (xraysoftmat/kkcalc) + NumPy/SciPy/Matplotlib for tests/kk-calc-validation/run_reference.py.

Setup: cd tests/kk-calc-validation && uv sync

**SSOT CSV** (Atlas DB export: energy_eV, beta, delta, …):

  src/features/kk-calc/__fixtures__/nexafs-experiment-30539a6a-pol-86906b55-th55-ph0.csv

Plot **persisted δ vs kkcalc2 δ from β** (residual δ_kkcalc − δ_CSV; no TS discrete KK recompute):

  cd tests/kk-calc-validation && uv run python plot_kk_compare.py

Optional: --csv /path/to/export.csv, --out /path/to/out.png, --formula C72H14O2, --density 1

Default PNG: kk_compare_<csv-stem>.png in this directory.

Bun validation (`bun run test:kk-calc-validation`) uses the same CSV for TS kkcalc-style KK_PP vs
the offline golden JSON (measurement-only), subprocess parity for extended `asp_db_im_extended`,
SciPy makima alignment, coarse-grid KK + makima similarity, and **CSV delta column vs kkcalc-delta-optical-beta**.

kkcalc2 optical pipeline (formula + mass density in g/cm³); default CLI matches `asp_db_im_extended`:

  uv run python run_reference.py kkcalc-delta-optical-beta \
    --csv ../../src/features/kk-calc/__fixtures__/nexafs-experiment-30539a6a-pol-86906b55-th55-ph0.csv \
    --formula C72H14O2 --density 1

Measurement-only knots (regenerate `kkcalc-optical-delta-golden.json`):

  uv run python run_reference.py kkcalc-delta-optical-beta --measurement-only \
    --csv ../../src/features/kk-calc/__fixtures__/nexafs-experiment-30539a6a-pol-86906b55-th55-ph0.csv \
    --formula C72H14O2 --density 1

CLI reference JSON (optional ASF-grid experiments; primary TS parity is optical-beta):

  uv run python run_reference.py kkcalc-delta --csv <path>
  uv run python run_reference.py kkcalc-delta --fixture <path.json>
  uv run python run_reference.py kkcalc-delta-optical-beta [--csv <path> | stdin JSON] [--formula <str>] [--density <g/cm^3>]
  uv run python run_reference.py scipy-makima   # stdin JSON target/source grids
