// =============================================================================
// 04_compute_indices.js — Phase 4: Vegetation Index Computation
//
// Computes all vegetation indices for every preprocessed scene.
// Index selection per scene is GDD-stage driven (from config.js):
//   T1 (V5-V6):  Primary = NDRE  — N status at partial canopy
//   T2 (VT):     Primary = NDVI  — full canopy biomass
//   T3 (R2-R3):  Primary = LSWI  — water stress during grain fill
//
// All 5 indices computed for every scene:
//   NDRE  = (B8-B5)/(B8+B5)
//   NDVI  = (B8-B4)/(B8+B4)
//   EVI   = 2.5*(B8-B4)/(B8+6*B4-7.5*B2+1)
//   MSAVI = (2*B8+1-sqrt((2*B8+1)²-8*(B8-B4)))/2
//   LSWI  = (B8-B11)/(B8+B11)
//
// OUTPUTS:
//   GEE Assets: T1_2024_indices, T2_2024_indices, T3_2024_indices,
//               T1_2023_indices, T2_2023_indices
//   Drive:      True color, False Color CIR, primary index map per scene
//   Map:        All index visualisations (toggle in Layers panel)
// =============================================================================

var config = require('users/YOUR_USERNAME/georgia-corn:config');
var utils  = require('users/YOUR_USERNAME/georgia-corn:utils');

Map.centerObject(config.AOI, config.MAP_ZOOM);

var SCENE_IDS = ['T1_2024', 'T2_2024', 'T3_2024', 'T1_2023', 'T2_2023'];

// Primary index per GDD stage key
var PRIMARY_INDEX = {
  T1: 'NDRE',
  T2: 'NDVI',
  T3: 'LSWI'
};

// Viz params per index
var INDEX_VIZ = {
  NDRE:  config.VIZ.ndre,
  NDVI:  config.VIZ.ndvi,
  EVI:   config.VIZ.ndvi,    // reuse NDVI palette (similar range)
  MSAVI: config.VIZ.ndre,    // reuse NDRE palette
  LSWI:  config.VIZ.lswi
};

// ── Process each scene ────────────────────────────────────────────────────────
SCENE_IDS.forEach(function(sceneId) {
  print('── Computing indices for:', sceneId);

  var gddKey    = sceneId.split('_')[0];             // 'T1', 'T2', 'T3'
  var primary   = PRIMARY_INDEX[gddKey];
  var procAsset = utils.assetPath(sceneId + '_proc');
  var proc      = ee.Image(procAsset);

  // ── Compute all 5 indices ───────────────────────────────────────────────
  var indices   = utils.computeAllIndices(proc);
  print('  Primary index for', config.GDD_TARGETS[gddKey].stage + ':', primary);

  // ── Print mean index value over AOI (for QA) ───────────────────────────
  indices.reduceRegion({
    reducer:    ee.Reducer.mean(),
    geometry:   config.AOI,
    scale:      10,
    maxPixels:  1e9,
    bestEffort: true
  }).evaluate(function(stats) {
    print('  Mean index values over corn AOI (' + sceneId + '):');
    ['NDRE','NDVI','EVI','MSAVI','LSWI'].forEach(function(idx) {
      var val = stats[idx];
      print('    ' + idx + ':', val !== null ? Math.round(val * 1000) / 1000 : 'N/A');
    });
  });

  // ── Export index stack to GEE Asset ────────────────────────────────────
  utils.exportToAsset(indices, sceneId + '_indices', sceneId + '_indices_export');

  // ── Export visualisations to Drive ─────────────────────────────────────
  // True Color
  utils.exportToDrive(
    proc.visualize(config.VIZ.trueColor).clip(config.AOI),
    sceneId + '_truecolor',
    sceneId + '_truecolor_drive'
  );

  // False Color CIR
  utils.exportToDrive(
    proc.visualize(config.VIZ.falseColorCIR).clip(config.AOI),
    sceneId + '_falsecolor_cir',
    sceneId + '_falsecolor_cir_drive'
  );

  // Primary index map
  var primaryViz = INDEX_VIZ[primary];
  utils.exportToDrive(
    indices.select(primary).visualize(primaryViz).clip(config.AOI),
    sceneId + '_' + primary.toLowerCase() + '_map',
    sceneId + '_' + primary.toLowerCase() + '_drive'
  );

  // ── Add all index layers to Map ─────────────────────────────────────────
  var shown = sceneId === 'T1_2024';  // Show T1_2024 by default

  ['NDRE','NDVI','EVI','MSAVI','LSWI'].forEach(function(idx) {
    Map.addLayer(
      indices.select(idx).clip(config.AOI),
      INDEX_VIZ[idx],
      sceneId + ' ' + idx + (idx === primary ? ' ★' : ''),
      shown && idx === primary   // Only show primary index by default
    );
  });

  Map.addLayer(
    proc.clip(config.AOI),
    config.VIZ.trueColor,
    sceneId + ' True Color',
    false
  );

  Map.addLayer(
    proc.clip(config.AOI),
    config.VIZ.falseColorCIR,
    sceneId + ' False Color CIR',
    false
  );
});

// ── AOI boundary ──────────────────────────────────────────────────────────────
Map.addLayer(
  ee.Image().paint(config.AOI, 1, 2),
  {palette: ['#FF0000']},
  'AOI Boundary'
);

print('');
print('★ = Primary index for this GDD stage');
print('All exports submitted. Monitor at: https://code.earthengine.google.com/tasks');
print('Wait for all tasks to complete, then run 05_change_detection.js');
