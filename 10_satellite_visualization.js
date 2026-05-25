// =============================================================================
// 10_satellite_visualization_fixed.js
//
// FIXES: Full AOI coverage using scene mosaics instead of single scenes.
// The previous version showed gaps because one Sentinel-2 tile does not
// fully cover the AOI. This script mosaics all qualifying scenes within
// each date window to fill the entire AOI.
//
// This script works DIRECTLY from the S2 collection — no assets needed.
// Save as: 10_satellite_visualization_fixed in GEE → Run
// =============================================================================

var config = require('users/YOUR_USERNAME/georgia-corn:config');
var AOI    = config.AOI;

// =============================================================================
// STEP 1 — BUILD FULL-COVERAGE MOSAICS
// Query all scenes in each window, mosaic them to fill AOI gaps
// =============================================================================

// ── Preprocessing functions ───────────────────────────────────────────────────
var scaleReflectance = function(image) {
  var optical = ['B2','B3','B4','B5','B8','B11','B12'];
  return image.addBands(image.select(optical).multiply(0.0001), null, true);
};

var maskClouds = function(image) {
  var scl = image.select('SCL');
  var mask = scl.neq(3).and(scl.neq(8)).and(scl.neq(9))
               .and(scl.neq(10)).and(scl.neq(11));
  return image.updateMask(mask);
};

var harmonise = function(image) {
  var proj = image.select('B4').projection();
  var b20m = image.select(['B5','B11','B12'])
    .resample('bilinear').reproject({crs: proj, scale: 10});
  return image.addBands(b20m, null, true);
};

var preprocess = function(image) {
  return harmonise(maskClouds(scaleReflectance(image)));
};

// ── Compute indices ───────────────────────────────────────────────────────────
var addIndices = function(image) {
  var ndre = image.normalizedDifference(['B8','B5']).rename('NDRE');
  var ndvi = image.normalizedDifference(['B8','B4']).rename('NDVI');
  var lswi = image.normalizedDifference(['B8','B11']).rename('LSWI');
  return image.addBands([ndre, ndvi, lswi]);
};

// ── Build mosaic from a date window ──────────────────────────────────────────
// Uses median composite to fill gaps and reduce cloud artifacts
var buildMosaic = function(startDate, endDate) {
  return ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterBounds(AOI)
    .filterDate(startDate, endDate)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 30))
    .map(preprocess)
    .map(addIndices)
    .median()
    .clip(AOI);
};

// ── Scene windows (from your GDD calendar) ───────────────────────────────────
// Widened to ±10 days to maximise overlap from adjacent tiles
var T1_2024 = buildMosaic('2024-04-04', '2024-04-24');  // V6 2024
var T2_2024 = buildMosaic('2024-04-27', '2024-05-17');  // VT 2024
var T3_2024 = buildMosaic('2024-05-19', '2024-06-08');  // R3 2024
var T1_2023 = buildMosaic('2023-04-06', '2023-04-26');  // V6 2023
var T2_2023 = buildMosaic('2023-04-29', '2023-05-19');  // VT 2023

// ── Change maps ───────────────────────────────────────────────────────────────
var delta_A1_fresh = T2_2024.select('NDRE')
  .subtract(T1_2024.select('NDRE'))
  .rename('delta_NDRE_V6_VT');

var delta_B1_fresh = T1_2024.select('NDRE')
  .subtract(T1_2023.select('NDRE'))
  .rename('delta_NDRE_YoY');

// ── Load corn mask to restrict to corn pixels ─────────────────────────────────
var corn_mask = ee.Image(config.ASSET_ROOT + '/corn_mask_2024')
  .select('corn_mask');

var maskCorn = function(image) {
  return image.updateMask(corn_mask);
};

// =============================================================================
// VISUALIZATION PARAMETERS
// =============================================================================

var VIZ_TC   = {bands:['B4','B3','B2'], min:0.02, max:0.28, gamma:1.3};
var VIZ_CIR  = {bands:['B8','B4','B3'], min:0.02, max:0.45, gamma:1.2};
var VIZ_NDRE = {
  min:0.0, max:0.55,
  palette:['#d73027','#f46d43','#fdae61','#fee08b','#ffffbf',
           '#d9ef8b','#a6d96a','#66bd63','#1a9850']
};
var VIZ_NDVI = {
  min:0.0, max:0.85,
  palette:['#d73027','#f46d43','#fdae61','#fee08b','#ffffbf',
           '#d9ef8b','#a6d96a','#66bd63','#1a9850']
};
var VIZ_LSWI = {
  min:-0.35, max:0.35,
  palette:['#8c510a','#d8b365','#f6e8c3','#f5f5f5',
           '#c7eae5','#5ab4ac','#01665e']
};
var VIZ_DELTA = {
  min:-0.4, max:0.4,
  palette:['#b2182b','#d6604d','#f4a582','#fddbc7',
           '#f7f7f7','#c7e9b4','#7fcdbb','#41b6c4','#2166ac']
};
var VIZ_INTRA = {min:0, max:3,
  palette:['#b2182b','#f4a582','#a6d96a','#1a7837']};
var VIZ_INTER = {min:0, max:4,
  palette:['#b2182b','#f4a582','#ffffbf','#74c476','#1a7837']};

// =============================================================================
// MAP SETUP
// =============================================================================

Map.setCenter(-83.50, 31.475, 12);
Map.setOptions('SATELLITE');

// =============================================================================
// SECTION 1 — FULL COVERAGE TRUE COLOR
// Both masked (corn only) and unmasked so you can see the full scene
// =============================================================================

// Unmasked — full scene coverage to confirm no gaps
Map.addLayer(T1_2024, VIZ_TC,
  '1a. T1_2024 True Color — FULL SCENE (V6, April 2024)', true);
Map.addLayer(T2_2024, VIZ_TC,
  '1b. T2_2024 True Color — FULL SCENE (VT, May 2024)', false);
Map.addLayer(T1_2023, VIZ_TC,
  '1c. T1_2023 True Color — FULL SCENE (V6, April 2023)', false);

// Corn-masked only
Map.addLayer(maskCorn(T1_2024), VIZ_TC,
  '2a. T1_2024 True Color — CORN ONLY (V6, April 2024)', false);
Map.addLayer(maskCorn(T2_2024), VIZ_TC,
  '2b. T2_2024 True Color — CORN ONLY (VT, May 2024)', false);

// =============================================================================
// SECTION 2 — FALSE COLOR CIR (vegetation = bright red)
// =============================================================================

Map.addLayer(T1_2024, VIZ_CIR,
  '3a. T1_2024 False Color CIR (veg=red) — V6 2024', false);
Map.addLayer(T2_2024, VIZ_CIR,
  '3b. T2_2024 False Color CIR (veg=red) — VT 2024', false);
Map.addLayer(T1_2023, VIZ_CIR,
  '3c. T1_2023 False Color CIR (veg=red) — V6 2023', false);

// =============================================================================
// SECTION 3 — NDRE MAPS (nitrogen status)
// Compare 2024 V6 vs 2023 V6 — 2023 should appear greener
// =============================================================================

Map.addLayer(maskCorn(T1_2024).select('NDRE'), VIZ_NDRE,
  '4a. SO2: NDRE at V6 2024 (mean=0.1363) — corn only', false);
Map.addLayer(maskCorn(T1_2023).select('NDRE'), VIZ_NDRE,
  '4b. SO2: NDRE at V6 2023 (mean=0.2525) — corn only', false);
Map.addLayer(maskCorn(T2_2024).select('NDRE'), VIZ_NDRE,
  '4c. SO1: NDRE at VT 2024 (mean=0.2066) — corn only', false);

// =============================================================================
// SECTION 4 — NDVI AND LSWI
// =============================================================================

Map.addLayer(maskCorn(T2_2024).select('NDVI'), VIZ_NDVI,
  '5a. NDVI at VT 2024 (mean=0.3289)', false);
Map.addLayer(maskCorn(T2_2023).select('NDVI'), VIZ_NDVI,
  '5b. NDVI at VT 2023 (mean=0.4073)', false);
Map.addLayer(maskCorn(T2_2024).select('LSWI'), VIZ_LSWI,
  '5c. LSWI at VT 2024 (water stress, mean=-0.0954)', false);

// =============================================================================
// SECTION 5 — CHANGE MAPS (fresh from mosaic)
// =============================================================================

Map.addLayer(maskCorn(delta_A1_fresh), VIZ_DELTA,
  '6a. SO1: ΔNDRE V6→VT 2024 (in-season, mean=+0.0713)', false);
Map.addLayer(maskCorn(delta_B1_fresh), VIZ_DELTA,
  '6b. SO2: ΔNDRE 2024 vs 2023 at V6 (inter-year, mean=-0.1619)', false);

// =============================================================================
// SECTION 6 — CLASSIFIED MAPS (from existing assets)
// =============================================================================

var cls_intra = ee.Image(config.ASSET_ROOT + '/classified_intraseason');
var cls_inter = ee.Image(config.ASSET_ROOT + '/classified_interseason');

Map.addLayer(cls_intra, VIZ_INTRA,
  '7a. SO3: Classified Intra-Season 2024 (61.1% suboptimal)', false);
Map.addLayer(cls_inter, VIZ_INTER,
  '7b. SO3: Classified Inter-Season 2023 vs 2024 (63.8% decline)', false);

// =============================================================================
// SECTION 7 — REFERENCE
// =============================================================================

Map.addLayer(corn_mask.selfMask(),
  {palette:['#FFD700'], opacity:0.35},
  '8. Corn Mask 2024', false);

Map.addLayer(ee.Image().paint(AOI, 1, 2),
  {palette:['#FF0000']},
  '9. AOI Boundary', true);

// =============================================================================
// LEGEND
// =============================================================================

var panel = ui.Panel({style:{
  position:'bottom-right', padding:'8px',
  backgroundColor:'rgba(255,255,255,0.92)', width:'200px'
}});

panel.add(ui.Label('Map Legend',
  {fontWeight:'bold', fontSize:'13px', color:'#1a3a5c', margin:'0 0 5px 0'}));

var addRow = function(color, text) {
  panel.add(ui.Panel([
    ui.Label('', {backgroundColor:color, padding:'5px 10px', margin:'1px 4px 1px 0'}),
    ui.Label(text, {fontSize:'10px', margin:'2px 0', color:'#333'})
  ], ui.Panel.Layout.flow('horizontal')));
};

panel.add(ui.Label('NDRE / NDVI',
  {fontWeight:'bold', fontSize:'11px', color:'#2B5E8B', margin:'5px 0 2px 0'}));
addRow('#1a9850', 'High (healthy)');
addRow('#a6d96a', 'Above average');
addRow('#ffffbf', 'Average');
addRow('#fdae61', 'Below average');
addRow('#d73027', 'Low (stressed)');

panel.add(ui.Label('Change Maps (ΔNDRE)',
  {fontWeight:'bold', fontSize:'11px', color:'#2B5E8B', margin:'5px 0 2px 0'}));
addRow('#2166ac', 'Strong gain');
addRow('#c7e9b4', 'Moderate gain');
addRow('#f7f7f7', 'No change');
addRow('#f4a582', 'Moderate loss');
addRow('#b2182b', 'Strong loss');

panel.add(ui.Label('Classified Intra-Season',
  {fontWeight:'bold', fontSize:'11px', color:'#2B5E8B', margin:'5px 0 2px 0'}));
addRow('#1a7837', 'Strong Dev (14.9%)');
addRow('#a6d96a', 'Moderate (24.0%)');
addRow('#f4a582', 'Slow Dev (30.2%)');
addRow('#b2182b', 'Decline (30.9%)');

panel.add(ui.Label('Classified Inter-Season',
  {fontWeight:'bold', fontSize:'11px', color:'#2B5E8B', margin:'5px 0 2px 0'}));
addRow('#1a7837', 'YoY Gain (0.4%)');
addRow('#74c476', 'Stable Hi (25.3%)');
addRow('#ffffbf', 'Stable Lo (10.5%)');
addRow('#f4a582', 'Decline (20.4%)');
addRow('#b2182b', 'Sig Loss (43.4%)');

Map.add(panel);

// =============================================================================
// CONSOLE INSTRUCTIONS
// =============================================================================

print('Full-Coverage Satellite Visualization Loaded');
print('=============================================');
print('');
print('LAYERS: toggle in the top-right Layers panel.');
print('');
print('Key comparisons to make:');
print('');
print('1. Layer 1a vs 1b: True color April vs May 2024');
print('   → Canopy should be visibly denser in May');
print('');
print('2. Layer 3a vs 3c: False Color CIR 2024 vs 2023');
print('   → 2023 should have more bright red (healthier veg)');
print('');
print('3. Layer 4a vs 4b: NDRE V6 2024 vs 2023');
print('   → 2023 map greener confirms SO2 finding');
print('');
print('4. Layer 6a: SO1 change map');
print('   → Red/brown dominant: 61.1% suboptimal development');
print('');
print('5. Layer 6b: SO2 change map');
print('   → Nearly all red: mean ΔNDRE = -0.1619');
print('');
print('6. Layer 5c: LSWI water stress at VT');
print('   → Brown tones dominant: confirms mean LSWI = -0.0954');
