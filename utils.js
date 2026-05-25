// =============================================================================
// utils.js — Shared Utility Functions
// Load via: var utils = require('users/YOUR_USERNAME/georgia-corn:utils');
// =============================================================================

var config = require('users/YOUR_USERNAME/georgia-corn:config');

// ─────────────────────────────────────────────────────────────────────────────
// Asset Helpers
// ─────────────────────────────────────────────────────────────────────────────

exports.assetPath = function(name) {
  return config.ASSET_ROOT + '/' + name;
};

// ─────────────────────────────────────────────────────────────────────────────
// Preprocessing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Scale DN to surface reflectance [0.0 – 1.0].
 * S2_SR_HARMONIZED already normalises the PB04.00+ offset — no extra step needed.
 */
exports.scaleReflectance = function(image) {
  var optical = ['B2','B3','B4','B5','B8','B11','B12'];
  var scaled  = image.select(optical).multiply(config.SCALE_FACTOR);
  return image.addBands(scaled, null, true); // overwrite=true
};

/**
 * Cloud and shadow mask using SCL band.
 * Masks: cloud shadow (3), medium cloud (8), high cloud (9),
 *        thin cirrus (10), snow/ice (11).
 */
exports.maskClouds = function(image) {
  var scl  = image.select('SCL');
  var mask = scl.neq(3)
    .and(scl.neq(8))
    .and(scl.neq(9))
    .and(scl.neq(10))
    .and(scl.neq(11));
  return image.updateMask(mask);
};

/**
 * Resample all 20m bands to 10m to harmonise resolution.
 * Spectral bands (B5, B11, B12): bilinear interpolation.
 * SCL (categorical):             nearest-neighbour.
 */
exports.harmoniseResolution = function(image) {
  var proj10m = image.select('B4').projection();

  var bands20m = image.select(['B5','B11','B12'])
    .resample('bilinear')
    .reproject({crs: proj10m, scale: 10});

  var scl10m = image.select('SCL')
    
    .reproject({crs: proj10m, scale: 10});

  return image
    .addBands(bands20m, null, true)
    .addBands(scl10m,   null, true);
};

/**
 * Apply the CDL corn mask (loaded from GEE Asset).
 * Non-corn pixels become NoData.
 */
exports.applyCornMask = function(image, year) {
  var maskAsset = exports.assetPath('corn_mask_' + year);
  var mask      = ee.Image(maskAsset).select('corn_mask');
  return image.updateMask(mask);
};

/**
 * Full preprocessing chain: scale → cloud mask → harmonise → corn mask.
 */
exports.preprocess = function(image, year) {
  return exports.applyCornMask(
    exports.harmoniseResolution(
      exports.maskClouds(
        exports.scaleReflectance(image)
      )
    ),
    year
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Vegetation Indices
// ─────────────────────────────────────────────────────────────────────────────

/** NDRE — N status; best at partial canopy (V6). */
exports.ndre = function(image) {
  return image.normalizedDifference(['B8','B5']).rename('NDRE').clamp(-1, 1);
};

/** NDVI — biomass/greenness; standard at full canopy (VT). */
exports.ndvi = function(image) {
  return image.normalizedDifference(['B8','B4']).rename('NDVI').clamp(-1, 1);
};

/** EVI — handles high-LAI saturation better than NDVI. */
exports.evi = function(image) {
  return image.expression(
    '2.5 * (NIR - RED) / (NIR + 6.0 * RED - 7.5 * BLUE + 1.0)',
    {NIR: image.select('B8'), RED: image.select('B4'), BLUE: image.select('B2')}
  ).rename('EVI').clamp(-1, 1);
};

/** MSAVI — self-adjusting soil correction; important at V6 on Tifton sandy soils. */
exports.msavi = function(image) {
  var nir = image.select('B8');
  var red = image.select('B4');
  return nir.multiply(2).add(1)
    .subtract(
      nir.multiply(2).add(1).pow(2)
        .subtract(nir.subtract(red).multiply(8))
        .sqrt()
    )
    .divide(2).rename('MSAVI').clamp(-1, 1);
};

/** LSWI — plant water stress; primary index at grain fill (R3). */
exports.lswi = function(image) {
  return image.normalizedDifference(['B8','B11']).rename('LSWI').clamp(-1, 1);
};

/** Stack all 5 indices into one multi-band image. */
exports.computeAllIndices = function(image) {
  return exports.ndre(image)
    .addBands(exports.ndvi(image))
    .addBands(exports.evi(image))
    .addBands(exports.msavi(image))
    .addBands(exports.lswi(image));
};

// ─────────────────────────────────────────────────────────────────────────────
// Change Vector Analysis
// ─────────────────────────────────────────────────────────────────────────────

/**
 * CVA on raw bands [B4, B8, B11].
 * Do NOT use correlated indices — they all share B8.
 * Magnitude: Euclidean distance in 3-band spectral space.
 * Direction: atan2(ΔNIR, ΔRed) — positive = greening, negative = browning.
 */
exports.computeCVA = function(proc_T1, proc_T2) {
  var bands = ['B4','B8','B11'];
  var delta = proc_T2.select(bands).subtract(proc_T1.select(bands));

  var magnitude = delta.pow(2)
    .reduce(ee.Reducer.sum())
    .sqrt()
    .rename('CVA_magnitude');

  var direction = delta.select('B8')
    .atan2(delta.select('B4'))
    .rename('CVA_direction');

  return magnitude.addBands(direction);
};

// ─────────────────────────────────────────────────────────────────────────────
// Majority Filter
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 3×3 majority (mode) filter to remove isolated noise pixels.
 * At 10m resolution, radius=1 covers a 30m window.
 */
exports.majorityFilter = function(classified) {
  var bandName = classified.bandNames().get(0);
  var kernel   = ee.Kernel.square({radius: 1, units: 'pixels'});
  return classified
    .reduceNeighborhood({reducer: ee.Reducer.mode(), kernel: kernel})
    .rename([bandName])
    .updateMask(classified.mask())
    .toUint8();
};

// ─────────────────────────────────────────────────────────────────────────────
// Export Helpers
// ─────────────────────────────────────────────────────────────────────────────

exports.exportToAsset = function(image, name, description) {
  Export.image.toAsset({
    image:       image,
    description: description || name,
    assetId:     exports.assetPath(name),
    region:      config.AOI,
    scale:       config.EXPORT_SCALE,
    crs:         config.ASSET_CRS,
    maxPixels:   1e10
  });
  print('✓ Export to Asset submitted:', exports.assetPath(name));
};

exports.exportToDrive = function(image, filename, description) {
  Export.image.toDrive({
    image:           image,
    description:     description || filename,
    folder:          config.DRIVE_FOLDER,
    fileNamePrefix:  filename,
    region:          config.AOI,
    scale:           config.EXPORT_SCALE,
    crs:             config.EXPORT_CRS,
    fileFormat:      'GeoTIFF',
    maxPixels:       1e10
  });
  print('✓ Export to Drive submitted:', filename);
};

// ─────────────────────────────────────────────────────────────────────────────
// Map Display Helper
// ─────────────────────────────────────────────────────────────────────────────

exports.addLayer = function(image, vizKey, name, shown) {
  var viz = config.VIZ[vizKey] || {};
  Map.addLayer(image, viz, name, shown !== false);
};
