// =============================================================================
// 03_preprocess.js — Phase 3: Preprocessing
//
// Applies the full preprocessing chain to every raw Sentinel-2 scene:
//   A. Scale DN to surface reflectance (×0.0001)
//   B. Cloud & shadow masking via SCL band
//   C. Resolution harmonisation: 20m bands → 10m (bilinear)
//   D. Apply CDL corn mask — downstream analysis is corn-only
//
// Note: COPERNICUS/S2_SR_HARMONIZED already normalises the PB04.00+
//       offset across all acquisition dates. No manual offset step needed.
//
// OUTPUTS:
//   GEE Assets: T1_2024_proc, T2_2024_proc, T3_2024_proc,
//               T1_2023_proc, T2_2023_proc
//   Map:        True color + False Color CIR previews of preprocessed scenes
// =============================================================================

var config = require('users/YOUR_USERNAME/georgia-corn:config');
var utils  = require('users/YOUR_USERNAME/georgia-corn:utils');

Map.centerObject(config.AOI, config.MAP_ZOOM);

var SCENE_IDS = ['T1_2024', 'T2_2024', 'T3_2024', 'T1_2023', 'T2_2023'];

// ── Log valid pixel fraction after cloud masking ───────────────────────────────
var logValidFraction = function(image, sceneId) {
  image.select('B4').mask()
    .reduceRegion({
      reducer:    ee.Reducer.mean(),
      geometry:   config.AOI,
      scale:      10,
      maxPixels:  1e9,
      bestEffort: true
    })
    .evaluate(function(stats) {
      var pct = Math.round((stats.B4 || 0) * 1000) / 10;
      var flag = pct < 75 ? ' ⚠ LOW (<75%)' : ' ✓';
      print('  Valid pixels after cloud mask:', pct + '%' + flag, '(' + sceneId + ')');
    });
};

// ── Process each scene ────────────────────────────────────────────────────────
SCENE_IDS.forEach(function(sceneId) {
  print('── Preprocessing:', sceneId);

  var year     = parseInt(sceneId.split('_')[1]);   // 'T1_2024' → 2024
  var rawAsset = utils.assetPath(sceneId + '_raw');
  var raw      = ee.Image(rawAsset);

  // ── Step A: Scale reflectance ──────────────────────────────────────────
  var scaled = utils.scaleReflectance(raw);

  // ── Step B: Cloud & shadow mask ────────────────────────────────────────
  var masked = utils.maskClouds(scaled);

  // ── Step C: Harmonise resolution (20m → 10m) ───────────────────────────
  var harmonised = utils.harmoniseResolution(masked);

  // Log valid pixel fraction
  logValidFraction(harmonised, sceneId);

  // ── Step D: Apply corn mask ────────────────────────────────────────────
  var processed = utils.applyCornMask(harmonised, year);

  // ── Export preprocessed scene to GEE Asset ────────────────────────────
  utils.exportToAsset(processed, sceneId + '_proc', sceneId + '_proc_export');

  // ── Add to Map for visual inspection ─────────────────────────────────
  // True Color
  Map.addLayer(
    processed.clip(config.AOI),
    config.VIZ.trueColor,
    sceneId + ' True Color (corn masked)',
    sceneId === 'T1_2024'
  );

  // False Color CIR — vegetation shows as red
  Map.addLayer(
    processed.clip(config.AOI),
    config.VIZ.falseColorCIR,
    sceneId + ' False Color CIR',
    false
  );

  // SCL classification (for cloud mask debugging)
  Map.addLayer(
    raw.select('SCL').clip(config.AOI),
    {min: 0, max: 11, palette: [
      '#000000','#FF0000','#404040','#804000',  // 0-3: no data, saturated, dark, shadow
      '#00CC00','#CC6600','#0000FF','#808080',  // 4-7: veg, bare soil, water, unclass
      '#C0C0C0','#F0F0F0','#80FFFF','#FFFFFF'  // 8-11: med cloud, high cloud, cirrus, snow
    ]},
    sceneId + ' SCL (cloud mask)',
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
print('All exports submitted. Monitor at: https://code.earthengine.google.com/tasks');
print('Wait for all tasks to complete, then run 04_compute_indices.js');
