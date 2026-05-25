// =============================================================================
// 01_build_crop_mask.js — Phase 1: Corn Crop Mask
//
// Loads USDA Cropland Data Layer (CDL) for 2023 and 2024,
// extracts corn pixels (class 1), resamples to 10m,
// and exports to GEE Assets for use in preprocessing.
//
// OUTPUTS:
//   GEE Asset: {ASSET_ROOT}/corn_mask_2024
//   GEE Asset: {ASSET_ROOT}/corn_mask_2023
//   Drive:     corn_mask_2024.tif, corn_mask_2023.tif
//   Map:       CDL corn pixels overlaid on AOI
// =============================================================================

var config = require('users/YOUR_USERNAME/georgia-corn:config');
var utils  = require('users/YOUR_USERNAME/georgia-corn:utils');

Map.centerObject(config.AOI, config.MAP_ZOOM);

var PROJ_10M = ee.Projection('EPSG:32617').atScale(10);

// ── Load CDL for a given year ─────────────────────────────────────────────────
var loadCDL = function(year) {
  var cdl = ee.ImageCollection(config.CDL_COLLECTION)
    .filter(ee.Filter.calendarRange(year, year, 'year'))
    .first();

  if (!cdl) {
    print('ERROR: No CDL image found for year', year);
    return null;
  }
  return cdl;
};

// ── Extract corn pixels and resample to 10m ───────────────────────────────────
var buildCornMask = function(cdl) {
  return cdl
    .select('cropland')
    .eq(config.CORN_CLASS)          // Binary: 1=corn, 0=other
    .rename('corn_mask')
                   // Nearest-neighbour for categorical
    .reproject({crs: PROJ_10M})
    .clip(config.AOI)
    .toUint8();
};

// ── Log estimated corn area ───────────────────────────────────────────────────
var logCornArea = function(mask, year) {
  var pixelAreaHa = ee.Image.pixelArea().divide(10000);
  var cornArea = pixelAreaHa
    .updateMask(mask)
    .reduceRegion({
      reducer:   ee.Reducer.sum(),
      geometry:  config.AOI,
      scale:     30,          // CDL native, fast for area estimate
      maxPixels: 1e10,
      bestEffort: true
    });
  print('Estimated corn area ' + year + ' (ha):', cornArea.get('area'));
};

// ── Process each year ─────────────────────────────────────────────────────────
[2024, 2023].forEach(function(year) {
  print('── Processing CDL for', year);

  var cdl  = loadCDL(year);
  if (!cdl) return;

  var mask = buildCornMask(cdl);

  logCornArea(mask, year);

  // ── Export to GEE Asset ──────────────────────────────────────────────────
  utils.exportToAsset(mask, 'corn_mask_' + year, 'corn_mask_' + year + '_export');

  // ── Export to Drive (for local inspection) ───────────────────────────────
  utils.exportToDrive(mask.toFloat(), 'corn_mask_' + year, 'corn_mask_' + year + '_drive');

  // ── Visualise on Map ──────────────────────────────────────────────────────
  // Show all CDL land cover with corn highlighted
  Map.addLayer(
    cdl.select('cropland').clip(config.AOI),
    {min: 0, max: 250, palette: ['white','green','yellow','brown','blue']},
    'CDL All Classes ' + year,
    false   // hidden by default — toggle in Layers panel
  );
  Map.addLayer(
    mask.selfMask(),  // selfMask() hides 0-value pixels so non-corn is transparent
    {palette: ['#FFFF00'], opacity: 0.7},
    'Corn Pixels ' + year
  );
});

// ── Show AOI boundary ─────────────────────────────────────────────────────────
Map.addLayer(
  ee.Image().paint(config.AOI, 1, 2),
  {palette: ['#FF0000']},
  'AOI Boundary'
);

print('');
print('Exports submitted. Monitor at: https://code.earthengine.google.com/tasks');
print('Wait for tasks to complete, then run 02_download_sentinel2.js');
