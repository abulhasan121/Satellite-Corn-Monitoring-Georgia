// =============================================================================
// 05_change_detection.js — Phase 5: Change Detection
//
// Runs two scientifically distinct comparisons and a CVA.
//
// Comparison A — Intra-Season 2024 (within same growing season):
//   ΔA1: NDRE(T2) - NDRE(T1)   [V6 → VT]  N uptake efficiency
//   ΔA2: NDVI(T3) - NDVI(T2)   [VT → R3]  Senescence / stress / harvest
//
// Comparison B — Inter-Season (same GDD stage, 2023 vs 2024):
//   ΔB1: NDRE(T1_2024) - NDRE(T1_2023)   [V6 year-over-year]
//   ΔB2: NDVI(T2_2024) - NDVI(T2_2023)   [VT year-over-year]
//
// CVA — Change Vector Analysis (raw bands, NOT correlated indices):
//   Input: [B4, B8, B11] from T1_2024 and T2_2024
//   Output: change magnitude + direction
//
// OUTPUTS:
//   GEE Assets: delta_A1, delta_A2, delta_B1, delta_B2, cva_T1_T2_2024
//   Drive:      Colourised delta maps (red-white-green)
//   Map:        All delta layers (toggle in Layers panel)
// =============================================================================

var config = require('users/YOUR_USERNAME/georgia-corn:config');
var utils  = require('users/YOUR_USERNAME/georgia-corn:utils');

Map.centerObject(config.AOI, config.MAP_ZOOM);

// ── Load all index stacks ─────────────────────────────────────────────────────
var idx = {
  T1_2024: ee.Image(utils.assetPath('T1_2024_indices')),
  T2_2024: ee.Image(utils.assetPath('T2_2024_indices')),
  T3_2024: ee.Image(utils.assetPath('T3_2024_indices')),
  T1_2023: ee.Image(utils.assetPath('T1_2023_indices')),
  T2_2023: ee.Image(utils.assetPath('T2_2023_indices'))
};

// Load processed scenes for CVA (needs raw bands, not indices)
var proc = {
  T1_2024: ee.Image(utils.assetPath('T1_2024_proc')),
  T2_2024: ee.Image(utils.assetPath('T2_2024_proc'))
};

// ── Delta colormap ────────────────────────────────────────────────────────────
var DELTA_VIZ = config.VIZ.delta;

// ─────────────────────────────────────────────────────────────────────────────
// Comparison A — Intra-Season 2024
// ─────────────────────────────────────────────────────────────────────────────

// ΔA1: NDRE V6 → VT
// Shows N uptake efficiency. Low value = field was N or water limited
// during the critical vegetative-to-reproductive transition.
var deltaA1 = idx.T2_2024.select('NDRE')
  .subtract(idx.T1_2024.select('NDRE'))
  .rename('delta_NDRE_V6_VT');

// ΔA2: NDVI VT → R3
// Shows canopy change during grain fill. A steep decline = drought,
// disease, or early harvest. Note: some decline is agronomically normal.
var deltaA2 = idx.T3_2024.select('NDVI')
  .subtract(idx.T2_2024.select('NDVI'))
  .rename('delta_NDVI_VT_R3');

// ── Export ΔA1 ────────────────────────────────────────────────────────────────
utils.exportToAsset(deltaA1, 'delta_A1', 'delta_A1_asset');
utils.exportToDrive(
  deltaA1.visualize(DELTA_VIZ).clip(config.AOI),
  'delta_intraseason_A1',
  'delta_intraseason_A1_drive'
);

// ── Export ΔA2 ────────────────────────────────────────────────────────────────
utils.exportToAsset(deltaA2, 'delta_A2', 'delta_A2_asset');
utils.exportToDrive(
  deltaA2.visualize(DELTA_VIZ).clip(config.AOI),
  'delta_intraseason_A2',
  'delta_intraseason_A2_drive'
);

// ─────────────────────────────────────────────────────────────────────────────
// Comparison B — Inter-Season (2023 vs 2024, same GDD stage)
// ─────────────────────────────────────────────────────────────────────────────

// ΔB1: NDRE at V6 — year-over-year
// Both scenes at identical GDD stage: phenological mismatch eliminated.
// Differences = management, soil health, inter-annual climate.
var deltaB1 = idx.T1_2024.select('NDRE')
  .subtract(idx.T1_2023.select('NDRE'))
  .rename('delta_NDRE_2024_vs_2023_V6');

// ΔB2: NDVI at VT — year-over-year peak biomass comparison
var deltaB2 = idx.T2_2024.select('NDVI')
  .subtract(idx.T2_2023.select('NDVI'))
  .rename('delta_NDVI_2024_vs_2023_VT');

// ── Export ΔB1 ────────────────────────────────────────────────────────────────
utils.exportToAsset(deltaB1, 'delta_B1', 'delta_B1_asset');
utils.exportToDrive(
  deltaB1.visualize(DELTA_VIZ).clip(config.AOI),
  'delta_interseason_B1',
  'delta_interseason_B1_drive'
);

// ── Export ΔB2 ────────────────────────────────────────────────────────────────
utils.exportToAsset(deltaB2, 'delta_B2', 'delta_B2_asset');
utils.exportToDrive(
  deltaB2.visualize(DELTA_VIZ).clip(config.AOI),
  'delta_interseason_B2',
  'delta_interseason_B2_drive'
);

// ─────────────────────────────────────────────────────────────────────────────
// CVA — Change Vector Analysis (T1_2024 → T2_2024)
// ─────────────────────────────────────────────────────────────────────────────

var cva = utils.computeCVA(proc.T1_2024, proc.T2_2024);

utils.exportToAsset(cva, 'cva_T1_T2_2024', 'cva_T1_T2_2024_asset');

utils.exportToDrive(
  cva.select('CVA_magnitude').visualize(config.VIZ.cvaMagnitude).clip(config.AOI),
  'cva_magnitude',
  'cva_magnitude_drive'
);

// ─────────────────────────────────────────────────────────────────────────────
// Print Mean Delta Values per Comparison
// ─────────────────────────────────────────────────────────────────────────────

var printMeanDelta = function(image, label) {
  image.reduceRegion({
    reducer:    ee.Reducer.mean(),
    geometry:   config.AOI,
    scale:      10,
    maxPixels:  1e9,
    bestEffort: true
  }).evaluate(function(stats) {
    var bandName = Object.keys(stats)[0];
    var val = stats[bandName];
    print(label + ' — Mean Δ:', val !== null ? Math.round(val * 1000) / 1000 : 'N/A');
  });
};

printMeanDelta(deltaA1, 'ΔA1 NDRE V6→VT (intra 2024)');
printMeanDelta(deltaA2, 'ΔA2 NDVI VT→R3 (intra 2024)');
printMeanDelta(deltaB1, 'ΔB1 NDRE 2024 vs 2023 at V6');
printMeanDelta(deltaB2, 'ΔB2 NDVI 2024 vs 2023 at VT');

// ─────────────────────────────────────────────────────────────────────────────
// Map Visualisation
// ─────────────────────────────────────────────────────────────────────────────

Map.addLayer(deltaA1.clip(config.AOI), DELTA_VIZ,
  'ΔA1 NDRE V6→VT (intra-season 2024)', true);

Map.addLayer(deltaA2.clip(config.AOI), DELTA_VIZ,
  'ΔA2 NDVI VT→R3 (intra-season 2024)', false);

Map.addLayer(deltaB1.clip(config.AOI), DELTA_VIZ,
  'ΔB1 NDRE 2024 vs 2023 at V6 (inter-season)', false);

Map.addLayer(deltaB2.clip(config.AOI), DELTA_VIZ,
  'ΔB2 NDVI 2024 vs 2023 at VT (inter-season)', false);

Map.addLayer(cva.select('CVA_magnitude').clip(config.AOI), config.VIZ.cvaMagnitude,
  'CVA Magnitude (T1→T2 2024)', false);

// Colour ramp legend (printed to console for reference)
print('');
print('── Delta Map Legend ──');
print('  Red   → Negative change (decline / loss)');
print('  White → No change (stable)');
print('  Green → Positive change (growth / gain)');
print('');

Map.addLayer(
  ee.Image().paint(config.AOI, 1, 2),
  {palette: ['#FF0000']},
  'AOI Boundary'
);

print('All exports submitted. Monitor at: https://code.earthengine.google.com/tasks');
print('Wait for all tasks to complete, then run 06_classify_change.js');
