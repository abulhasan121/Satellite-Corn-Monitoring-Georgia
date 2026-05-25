// =============================================================================
// 07_export.js — Phase 7: Final Dashboard Exports
//
// Submits all remaining Drive exports and prints a complete pipeline summary.
// After this script completes and all Drive tasks finish:
//   1. Download all .tif files from Drive → dashboard/data/
//   2. Open dashboard/index.html
//
// OUTPUTS (Google Drive → sentinel2_georgia_corn/):
//   Scene imagery (×5 scenes × 3 composites = 15 files):
//     {scene}_truecolor.tif
//     {scene}_falsecolor_cir.tif
//     {scene}_{primary_index}_map.tif
//
//   Change maps (×4 delta + CVA = 5 files):
//     delta_intraseason_A1.tif      ΔA1: NDRE V6→VT
//     delta_intraseason_A2.tif      ΔA2: NDVI VT→R3
//     delta_interseason_B1.tif      ΔB1: NDRE 2023 vs 2024 V6
//     delta_interseason_B2.tif      ΔB2: NDVI 2023 vs 2024 VT
//     cva_magnitude.tif
//
//   Classified maps (×2):
//     classified_intraseason.tif
//     classified_interseason.tif
//
//   Metadata (local files, copy to dashboard/):
//     bounds.json                   AOI bounding box for overlay alignment
// =============================================================================

var config = require('users/YOUR_USERNAME/georgia-corn:config');
var utils  = require('users/YOUR_USERNAME/georgia-corn:utils');

Map.centerObject(config.AOI, config.MAP_ZOOM);

var SCENE_IDS = ['T1_2024','T2_2024','T3_2024','T1_2023','T2_2023'];

var PRIMARY_INDEX = {T1: 'NDRE', T2: 'NDVI', T3: 'LSWI'};
var INDEX_VIZ = {
  NDRE: config.VIZ.ndre,
  NDVI: config.VIZ.ndvi,
  LSWI: config.VIZ.lswi
};

// ─────────────────────────────────────────────────────────────────────────────
// Re-export any missing scene imagery
// ─────────────────────────────────────────────────────────────────────────────
// (These were submitted in Script 04 — re-submitting is safe, GEE skips
//  completed tasks. Only useful if a task failed and needs to be rerun.)

SCENE_IDS.forEach(function(sceneId) {
  var gddKey  = sceneId.split('_')[0];
  var primary = PRIMARY_INDEX[gddKey];
  var proc    = ee.Image(utils.assetPath(sceneId + '_proc'));
  var indices = ee.Image(utils.assetPath(sceneId + '_indices'));

  // True Color
  utils.exportToDrive(
    proc.visualize(config.VIZ.trueColor).clip(config.AOI),
    sceneId + '_truecolor',
    sceneId + '_tc_final'
  );

  // False Color CIR
  utils.exportToDrive(
    proc.visualize(config.VIZ.falseColorCIR).clip(config.AOI),
    sceneId + '_falsecolor_cir',
    sceneId + '_cir_final'
  );

  // Primary index map
  utils.exportToDrive(
    indices.select(primary).visualize(INDEX_VIZ[primary]).clip(config.AOI),
    sceneId + '_' + primary.toLowerCase() + '_map',
    sceneId + '_' + primary.toLowerCase() + '_final'
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Re-export change maps (submitted in Scripts 05-06)
// ─────────────────────────────────────────────────────────────────────────────

var changeExports = [
  {asset: 'delta_A1',                viz: config.VIZ.delta,            name: 'delta_intraseason_A1'},
  {asset: 'delta_A2',                viz: config.VIZ.delta,            name: 'delta_intraseason_A2'},
  {asset: 'delta_B1',                viz: config.VIZ.delta,            name: 'delta_interseason_B1'},
  {asset: 'delta_B2',                viz: config.VIZ.delta,            name: 'delta_interseason_B2'},
  {asset: 'cva_T1_T2_2024',          viz: config.VIZ.cvaMagnitude,     name: 'cva_magnitude',
   band: 'CVA_magnitude'},
  {asset: 'classified_intraseason',  viz: config.VIZ.classifiedIntra,  name: 'classified_intraseason'},
  {asset: 'classified_interseason',  viz: config.VIZ.classifiedInter,  name: 'classified_interseason'}
];

changeExports.forEach(function(exp) {
  var img = ee.Image(utils.assetPath(exp.asset));
  var vis = exp.band ? img.select(exp.band).visualize(exp.viz) : img.visualize(exp.viz);
  utils.exportToDrive(vis.clip(config.AOI), exp.name, exp.name + '_final');
});

// ─────────────────────────────────────────────────────────────────────────────
// Final Map — All Layers
// ─────────────────────────────────────────────────────────────────────────────

// Scene imagery
SCENE_IDS.forEach(function(sceneId) {
  var proc = ee.Image(utils.assetPath(sceneId + '_proc'));
  Map.addLayer(proc.clip(config.AOI), config.VIZ.trueColor,
    sceneId + ' True Color', sceneId === 'T1_2024');
  Map.addLayer(proc.clip(config.AOI), config.VIZ.falseColorCIR,
    sceneId + ' False Color CIR', false);
});

// Change maps
Map.addLayer(
  ee.Image(utils.assetPath('delta_A1')).clip(config.AOI),
  config.VIZ.delta, 'ΔA1 NDRE V6→VT (intra)', false);

Map.addLayer(
  ee.Image(utils.assetPath('delta_B1')).clip(config.AOI),
  config.VIZ.delta, 'ΔB1 NDRE 2024 vs 2023 (inter)', false);

// Classified maps
Map.addLayer(
  ee.Image(utils.assetPath('classified_intraseason')).clip(config.AOI),
  config.VIZ.classifiedIntra, 'Classified Intra-Season 2024', true);

Map.addLayer(
  ee.Image(utils.assetPath('classified_interseason')).clip(config.AOI),
  config.VIZ.classifiedInter, 'Classified Inter-Season 2023 vs 2024', false);

// CVA
Map.addLayer(
  ee.Image(utils.assetPath('cva_T1_T2_2024')).select('CVA_magnitude').clip(config.AOI),
  config.VIZ.cvaMagnitude, 'CVA Magnitude', false);

Map.addLayer(ee.Image().paint(config.AOI, 1, 2), {palette: ['#FF0000']}, 'AOI Boundary');

// ─────────────────────────────────────────────────────────────────────────────
// Print Pipeline Summary
// ─────────────────────────────────────────────────────────────────────────────

print('');
print('═══════════════════════════════════════════════');
print('PIPELINE COMPLETE — Sentinel-2 Georgia Corn');
print('═══════════════════════════════════════════════');
print('');
print('Study Area:    Tifton, GA — Tift County');
print('Satellite:     Sentinel-2 L2A (S2_SR_HARMONIZED)');
print('Tile:          17RKH');
print('');
print('Scenes acquired (GDD-anchored):');
print('  T1_2024  V5-V6   (~415 GDD)  Primary: NDRE');
print('  T2_2024  VT      (~935 GDD)  Primary: NDVI');
print('  T3_2024  R2-R3  (~1346 GDD)  Primary: LSWI');
print('  T1_2023  V5-V6   (~415 GDD)  Primary: NDRE');
print('  T2_2023  VT      (~935 GDD)  Primary: NDVI');
print('');
print('Change Comparisons:');
print('  ΔA1  NDRE V6→VT 2024       (intra-season N uptake)');
print('  ΔA2  NDVI VT→R3 2024       (intra-season senescence)');
print('  ΔB1  NDRE 2024 vs 2023 V6  (inter-season YoY at V6)');
print('  ΔB2  NDVI 2024 vs 2023 VT  (inter-season YoY at VT)');
print('  CVA  Raw bands T1→T2 2024  (spectral change magnitude)');
print('');
print('All Drive exports submitted.');
print('Monitor at: https://code.earthengine.google.com/tasks');
print('');
print('── bounds.json (paste this into dashboard/bounds.json) ──');
print(JSON.stringify({
  west:  config.AOI_BOUNDS[0],
  south: config.AOI_BOUNDS[1],
  east:  config.AOI_BOUNDS[2],
  north: config.AOI_BOUNDS[3],
  crs:   'EPSG:4326'
}));
print('');
print('Next: Download .tif files from Drive → open dashboard/index.html');
