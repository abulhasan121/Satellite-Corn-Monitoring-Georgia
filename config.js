// =============================================================================
// config.js — Master Configuration
// Save as: users/YOUR_USERNAME/georgia-corn/config
// =============================================================================

// ── Identity ──────────────────────────────────────────────────────────────────
exports.USERNAME     = 'YOUR_USERNAME';
exports.REPO         = 'georgia-corn';
exports.PROJECT_ID   = 'YOUR_PROJECT_ID';
exports.ASSET_ROOT   = 'projects/YOUR_PROJECT_ID/assets/ga_corn';
exports.DRIVE_FOLDER = 'sentinel2_georgia_corn';

// ── Area of Interest — Tifton GA Corn Belt ───────────────────────────────────
exports.AOI_BOUNDS = [-83.65, 31.35, -83.35, 31.60];
exports.AOI        = ee.Geometry.Rectangle([-83.65, 31.35, -83.35, 31.60]);
exports.MAP_ZOOM   = 11;

// ── Sentinel-2 ────────────────────────────────────────────────────────────────
exports.S2_COLLECTION  = 'COPERNICUS/S2_SR_HARMONIZED';
exports.SCALE_FACTOR   = 0.0001;
exports.MAX_CLOUD_PCT  = 15;
exports.FALLBACK_CLOUD = 30;
exports.BANDS          = ['B2','B3','B4','B5','B8','B11','B12','SCL'];
exports.SCL_MASK_VALS  = [3, 8, 9, 10, 11];

// ── DAYMET ────────────────────────────────────────────────────────────────────
exports.DAYMET      = 'NASA/ORNL/DAYMET_V4';
exports.BASE_TEMP_F = 50;
exports.MAX_TEMP_F  = 86;

// ── CDL Crop Mask ─────────────────────────────────────────────────────────────
exports.CDL_COLLECTION = 'USDA/NASS/CDL';
exports.CORN_CLASS     = 1;

// ── Planting Dates ────────────────────────────────────────────────────────────
exports.PLANTING_2024 = '2024-03-05';
exports.PLANTING_2023 = '2023-03-08';

// ── GDD Targets (UGA Circular 1320) ──────────────────────────────────────────
exports.GDD_TARGETS = {
  T1: {gdd: 415,  stage: 'V5-V6',        primaryIndex: 'NDRE'},
  T2: {gdd: 935,  stage: 'VT-Tasseling', primaryIndex: 'NDVI'},
  T3: {gdd: 1346, stage: 'R2-R3',        primaryIndex: 'LSWI'}
};

// ── Scene Search Windows ──────────────────────────────────────────────────────
// IMPORTANT: Run 00_compute_gdd FIRST.
// The console will print the real crossing dates.
// Replace the dates below with what the console prints.
exports.SCENE_SEARCH_WINDOWS = {
  T1_2024: {start: '2024-04-07', end: '2024-04-17'},
  T2_2024: {start: '2024-04-30', end: '2024-05-10'},
  T3_2024: {start: '2024-05-22', end: '2024-06-01'},
  T1_2023: {start: '2023-04-09', end: '2023-04-19'},
  T2_2023: {start: '2023-05-02', end: '2023-05-12'}
};

// ── Change Detection Thresholds ───────────────────────────────────────────────
exports.INTRA_THRESHOLDS = {
  strongDev:   0.20,
  moderateDev: 0.08,
  slowDev:     0.00
};

exports.INTER_THRESHOLDS = {
  yoyGain:    0.10,
  stableHi:   0.00,
  stableLo:  -0.05,
  yoyDecline:-0.20
};

// ── Visualization Params ──────────────────────────────────────────────────────
exports.VIZ = {
  trueColor:      {bands: ['B4','B3','B2'], min: 0,    max: 0.3,  gamma: 1.4},
  falseColorCIR:  {bands: ['B8','B4','B3'], min: 0,    max: 0.5,  gamma: 1.2},
  ndre:           {bands: ['NDRE'], min: -0.2, max: 0.6,
                   palette: ['#d73027','#fee090','#ffffbf','#90ee90','#1a9850']},
  ndvi:           {bands: ['NDVI'], min: -0.1, max: 0.9,
                   palette: ['#d73027','#fee090','#ffffbf','#90ee90','#1a9850']},
  lswi:           {bands: ['LSWI'], min: -0.5, max: 0.5,
                   palette: ['#d73027','#fee090','#ffffbf','#4393c3','#053061']},
  delta:          {min: -0.4, max: 0.4,
                   palette: ['#d7191c','#fdae61','#ffffbf','#a6d96a','#1a9641']},
  classifiedIntra:{min: 0, max: 3,
                   palette: ['#d7191c','#ffffbf','#a6d96a','#1a9641']},
  classifiedInter:{min: 0, max: 4,
                   palette: ['#d7191c','#f46d43','#ffffbf','#a6d96a','#1a9641']},
  cvaMagnitude:   {min: 0, max: 0.3,
                   palette: ['#ffffff','#bdbdbd','#636363','#252525']}
};

// ── Export Settings ───────────────────────────────────────────────────────────
exports.EXPORT_SCALE = 10;
exports.EXPORT_CRS   = 'EPSG:4326';
exports.ASSET_CRS    = 'EPSG:32617';
