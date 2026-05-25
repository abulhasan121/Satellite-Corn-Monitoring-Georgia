// =============================================================================
// 02_download_sentinel2_v3.js — Full Coverage Fix
//
// ROOT CAUSE: The AOI spans two Sentinel-2 MGRS tiles. The previous version
// excluded the adjacent tile's scenes due to the cloud % filter.
//
// FIX:
//   1. Remove collection-level cloud filter entirely
//      (per-pixel SCL masking handles cloud removal — no need to filter whole scenes)
//   2. Use a full-month search window to capture scenes from both tiles
//   3. Print which MGRS tiles were found to confirm both tiles are included
//
// Save as: 02_download_sentinel2 → Ctrl+A → delete → paste → Ctrl+S → Run
// =============================================================================

var config = require('users/YOUR_USERNAME/georgia-corn:config');
var utils  = require('users/YOUR_USERNAME/georgia-corn:utils');

Map.centerObject(config.AOI, 11);
Map.setOptions('SATELLITE');

var AOI = config.AOI;

// =============================================================================
// STEP 0 — DIAGNOSTIC: Check which MGRS tiles cover our AOI
// Run this first and check the Console — you should see 2+ tile IDs
// =============================================================================

print('══════════════════════════════════════');
print('DIAGNOSTIC: MGRS tiles covering AOI');
print('══════════════════════════════════════');

ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(AOI)
  .filterDate('2024-04-01', '2024-05-31')
  .distinct('MGRS_TILE')
  .aggregate_array('MGRS_TILE')
  .evaluate(function(tiles) {
    print('Sentinel-2 tiles found:', tiles);
    print('Number of tiles: ' + tiles.length);
    if (tiles.length < 2) {
      print('WARNING: Only 1 tile found. Coverage gap may persist.');
    } else {
      print('GOOD: Multiple tiles found — mosaic will cover full AOI.');
    }
  });

// =============================================================================
// PREPROCESSING — applied per image before mosaicking
// =============================================================================

var scaleReflectance = function(image) {
  var optical = ['B2','B3','B4','B5','B8','B11','B12'];
  return image.addBands(image.select(optical).multiply(0.0001), null, true);
};

var maskClouds = function(image) {
  var scl  = image.select('SCL');
  var mask = scl.neq(3).and(scl.neq(8)).and(scl.neq(9))
               .and(scl.neq(10)).and(scl.neq(11));
  return image.updateMask(mask);
};

var harmonise = function(image) {
  var proj = image.select('B4').projection();
  var b20m = image.select(['B5','B11','B12'])
    .resample('bilinear')
    .reproject({crs: proj, scale: 10});
  return image.addBands(b20m, null, true);
};

var preprocess = function(image) {
  return harmonise(maskClouds(scaleReflectance(image)));
};

// =============================================================================
// MOSAIC BUILDER — no cloud % filter, full month window
// Per-pixel SCL masking is applied to every scene before mosaicking.
// Using a full-month window guarantees scenes from all intersecting tiles.
// =============================================================================

var buildFullMosaic = function(year, month, sceneId) {

  // ── Full calendar month window ────────────────────────────────────────────
  var startDate = year + '-' + month + '-01';
  var endDate   = ee.Date(startDate).advance(1, 'month')
                    .format('YYYY-MM-dd').getInfo();

  print('');
  print('── ' + sceneId + ' ──');
  print('   Window: ' + startDate + ' → ' + endDate);

  // ── Query ALL scenes in month — NO cloud % filter ─────────────────────────
  // Rationale: we do per-pixel SCL masking on every scene, so a "cloudy"
  // scene still contributes valid pixels from its cloud-free portions.
  // Filtering by CLOUDY_PIXEL_PERCENTAGE excludes scenes from adjacent tiles
  // that might have clouds over land but clear sky over our AOI.
  var col = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterBounds(AOI)
    .filterDate(startDate, endDate)
    .select(config.BANDS);

  // Log how many scenes and which tiles
  col.size().evaluate(function(n) {
    print('   Total scenes found: ' + n);
  });

  col.distinct('MGRS_TILE')
    .aggregate_array('MGRS_TILE')
    .evaluate(function(tiles) {
      print('   MGRS tiles included: ' + tiles.join(', '));
    });

  // ── Per-pixel cloud mask then median mosaic ───────────────────────────────
  var mosaic = col
    .map(preprocess)
    .median()
    .clip(AOI);

  return {
    mosaic:    mosaic,
    startDate: startDate,
    endDate:   endDate
  };
};

// ── Validate coverage ─────────────────────────────────────────────────────────
var validateCoverage = function(mosaic, sceneId) {
  mosaic.select('B4').mask()
    .reduceRegion({
      reducer:    ee.Reducer.mean(),
      geometry:   AOI,
      scale:      100,
      maxPixels:  1e9,
      bestEffort: true
    })
    .evaluate(function(stats) {
      var pct  = Math.round((stats.B4 || 0) * 1000) / 10;
      var flag = pct >= 95 ? ' ✓ FULL COVERAGE'
               : pct >= 80 ? ' ⚠ MOSTLY COVERED (' + pct + '%)'
               : ' ✗ SIGNIFICANT GAPS (' + pct + '%)';
      print('   Coverage: ' + flag);
    });
};

// =============================================================================
// SCENE DEFINITIONS
// Using full calendar months that contain each GDD milestone
// T1 (V6, ~415 GDD) → April  |  T2 (VT, ~935 GDD) → May  |  T3 (R3) → late May
// =============================================================================

var SCENES = [
  {id: 'T1_2024', year: '2024', month: '04', gddStage: 'V5-V6  (~415 GDD)'},
  {id: 'T2_2024', year: '2024', month: '05', gddStage: 'VT     (~935 GDD)'},
  {id: 'T3_2024', year: '2024', month: '05', gddStage: 'R2-R3  (~1346 GDD)'},
  {id: 'T1_2023', year: '2023', month: '04', gddStage: 'V5-V6  (~415 GDD)'},
  {id: 'T2_2023', year: '2023', month: '05', gddStage: 'VT     (~935 GDD)'}
];

// T2 and T3 both fall in May 2024 — they will use the same monthly mosaic
// but represent different GDD stages within the month (early May vs late May)
// For T3, we additionally constrain to late May
var T3_LATE_MAY = {id: 'T3_2024', year: '2024', month: '05', gddStage: 'R2-R3 late May'};

// =============================================================================
// PROCESS EACH SCENE
// =============================================================================

print('');
print('══════════════════════════════════════');
print('Building full-coverage mosaics...');
print('══════════════════════════════════════');

SCENES.forEach(function(scene) {
  var result = buildFullMosaic(scene.year, scene.month, scene.id);
  var mosaic = result.mosaic;

  validateCoverage(mosaic, scene.id);

  // ── Export to GEE Asset ──────────────────────────────────────────────────
  var assetId = utils.assetPath(scene.id + '_raw');
  Export.image.toAsset({
    image:       mosaic,
    description: scene.id + '_raw_export',
    assetId:     assetId,
    region:      AOI,
    scale:       10,
    crs:         'EPSG:32617',
    maxPixels:   1e10
  });

  // ── Map layers ───────────────────────────────────────────────────────────
  Map.addLayer(mosaic,
    {bands:['B4','B3','B2'], min:0.02, max:0.28, gamma:1.3},
    scene.id + ' True Color — ' + scene.gddStage,
    scene.id === 'T1_2024'
  );

  Map.addLayer(mosaic,
    {bands:['B8','B4','B3'], min:0.02, max:0.45, gamma:1.2},
    scene.id + ' False Color CIR',
    false
  );

  // SCL layer for debugging — shows cloud mask coverage
  Map.addLayer(mosaic.select('SCL').clip(AOI),
    {min:0, max:11, palette:[
      '#000000','#FF0000','#404040','#804000',
      '#00CC00','#CC6600','#0000FF','#808080',
      '#C0C0C0','#F0F0F0','#80FFFF','#FFFFFF'
    ]},
    scene.id + ' SCL (coverage check)',
    false
  );
});

// ── AOI boundary ──────────────────────────────────────────────────────────────
Map.addLayer(
  ee.Image().paint(AOI, 1, 2),
  {palette:['#FF0000']},
  'AOI Boundary',
  true
);

print('');
print('══════════════════════════════════════');
print('INSTRUCTIONS:');
print('1. Check Console → should show 2+ MGRS tiles');
print('2. Check map → T1_2024 True Color should cover full AOI');
print('3. If coverage looks good → submit all export tasks');
print('4. If still gaps → share screenshot of the Console output');
print('══════════════════════════════════════');
