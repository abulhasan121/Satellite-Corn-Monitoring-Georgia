// =============================================================================
// 08_extract_results_v2.js — Results Extraction (fully fixed + updated)
//
// Fixes: Object.values() replaced with for-loop (GEE JS compatibility)
// Updated: Summary table uses new full-coverage values
// Tiles: 17RKQ + 17SKR (two-tile mosaic, full AOI coverage)
//
// Open 08_extract_results in GEE → Ctrl+A → delete → paste → Ctrl+S → Run
// =============================================================================

var config = require('users/YOUR_USERNAME/georgia-corn:config');
var AOI    = config.AOI;

var idx_T1_2024 = ee.Image(config.ASSET_ROOT + '/T1_2024_indices');
var idx_T2_2024 = ee.Image(config.ASSET_ROOT + '/T2_2024_indices');
var idx_T1_2023 = ee.Image(config.ASSET_ROOT + '/T1_2023_indices');
var idx_T2_2023 = ee.Image(config.ASSET_ROOT + '/T2_2023_indices');
var delta_A1    = ee.Image(config.ASSET_ROOT + '/delta_A1');
var delta_B1    = ee.Image(config.ASSET_ROOT + '/delta_B1');
var cls_intra   = ee.Image(config.ASSET_ROOT + '/classified_intraseason');
var cls_inter   = ee.Image(config.ASSET_ROOT + '/classified_interseason');
var pixelAreaHa = ee.Image.pixelArea().divide(10000);

// ── Helper: mean/std/min/max ──────────────────────────────────────────────────
var bandStats = function(image, band, label) {
  image.select(band).reduceRegion({
    reducer: ee.Reducer.mean()
      .combine(ee.Reducer.stdDev(), '', true)
      .combine(ee.Reducer.min(), '', true)
      .combine(ee.Reducer.max(), '', true),
    geometry: AOI, scale: 10, maxPixels: 1e10, bestEffort: true
  }).evaluate(function(s) {
    var mn  = s[band+'_mean']   != null ? s[band+'_mean'].toFixed(4)   : 'N/A';
    var std = s[band+'_stdDev'] != null ? s[band+'_stdDev'].toFixed(4) : 'N/A';
    var lo  = s[band+'_min']    != null ? s[band+'_min'].toFixed(4)    : 'N/A';
    var hi  = s[band+'_max']    != null ? s[band+'_max'].toFixed(4)    : 'N/A';
    print('  ' + label + ': mean=' + mn + '  std=' + std +
          '  min=' + lo + '  max=' + hi);
  });
};

// ── Helper: class area table ──────────────────────────────────────────────────
var classAreas = function(classified, labels, title) {
  pixelAreaHa.addBands(classified).reduceRegion({
    reducer: ee.Reducer.sum().group({groupField: 1, groupName: 'class'}),
    geometry: AOI, scale: 10, maxPixels: 1e10, bestEffort: true
  }).evaluate(function(result) {
    print('');
    print('── ' + title + ' ──');
    var groups = result.groups;
    var total  = 0;
    for (var k = 0; k < groups.length; k++) { total += groups[k].sum; }
    groups.sort(function(a, b) { return b.class - a.class; });
    for (var i = 0; i < groups.length; i++) {
      var g   = groups[i];
      var lbl = labels[g.class] || ('Class ' + g.class);
      print('  ' + lbl + ': ' + g.sum.toFixed(1) +
            ' ha  (' + ((g.sum / total) * 100).toFixed(1) + '%)');
    }
    print('  TOTAL corn area: ' + total.toFixed(1) + ' ha');
  });
};

// ── Helper: mean within mask (fixed — no Object.values) ──────────────────────
var meanWithinMask = function(image, band, mask, label) {
  image.select(band).updateMask(mask).reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: AOI, scale: 10, maxPixels: 1e10, bestEffort: true
  }).evaluate(function(s) {
    var val = s[band];
    print('  ' + label + ': ' +
          (val != null ? val.toFixed(4) : 'N/A'));
  });
};

// =============================================================================
print('════════════════════════════════════════════════════');
print('RESULTS — Georgia Corn Sentinel-2 Change Detection');
print('Study Area: Tifton, GA | Tiles: 17RKQ + 17SKR');
print('Coverage: Full AOI (two-tile median mosaic)');
print('════════════════════════════════════════════════════');
print('');
print('── Table 1: Scene Acquisition ──');
print('  T1_2024 | V5-V6  | ~415 GDD  | April 2024  | Primary: NDRE');
print('  T2_2024 | VT     | ~935 GDD  | May 2024    | Primary: NDVI');
print('  T3_2024 | R2-R3  | ~1346 GDD | May 2024    | Primary: LSWI');
print('  T1_2023 | V5-V6  | ~415 GDD  | April 2023  | Primary: NDRE');
print('  T2_2023 | VT     | ~935 GDD  | May 2023    | Primary: NDVI');

// =============================================================================
print('');
print('════════════════════════════════════════════════════');
print('SO1: In-Season N Uptake Efficiency (2024)');
print('     ΔNDRE = NDRE(T2_VT) − NDRE(T1_V6)');
print('════════════════════════════════════════════════════');
print('');
print('── NDRE at each scene ──');
bandStats(idx_T1_2024, 'NDRE', 'T1_2024  V6  NDRE');
bandStats(idx_T2_2024, 'NDRE', 'T2_2024  VT  NDRE');
print('');
print('── ΔNDRE (V6→VT) ──');
bandStats(delta_A1, 'delta_NDRE_V6_VT', 'ΔA1 NDRE V6→VT 2024');
print('');
print('── Supporting indices at VT ──');
bandStats(idx_T2_2024, 'NDVI', 'T2_2024  VT  NDVI');
bandStats(idx_T2_2024, 'EVI',  'T2_2024  VT  EVI');
bandStats(idx_T2_2024, 'LSWI', 'T2_2024  VT  LSWI');

// =============================================================================
print('');
print('════════════════════════════════════════════════════');
print('SO2: Year-Over-Year Productivity Change (at V6)');
print('     ΔNDRE = NDRE(T1_2024) − NDRE(T1_2023)');
print('════════════════════════════════════════════════════');
print('');
print('── NDRE at V6 by year ──');
bandStats(idx_T1_2023, 'NDRE', 'T1_2023  V6  NDRE');
bandStats(idx_T1_2024, 'NDRE', 'T1_2024  V6  NDRE');
print('');
print('── ΔNDRE inter-year at V6 ──');
bandStats(delta_B1, 'delta_NDRE_2024_vs_2023_V6', 'ΔB1 NDRE 2024 vs 2023');
print('');
print('── NDVI at VT by year (peak biomass) ──');
bandStats(idx_T2_2023, 'NDVI', 'T2_2023  VT  NDVI');
bandStats(idx_T2_2024, 'NDVI', 'T2_2024  VT  NDVI');
print('');
print('── EVI at VT by year ──');
bandStats(idx_T2_2023, 'EVI', 'T2_2023  VT  EVI');
bandStats(idx_T2_2024, 'EVI', 'T2_2024  VT  EVI');

// =============================================================================
print('');
print('════════════════════════════════════════════════════');
print('SO3: Spatial Extent of Development Classes');
print('════════════════════════════════════════════════════');

classAreas(cls_intra, {
  3: 'Strong Development   (ΔNDRE > +0.20)',
  2: 'Moderate Development (ΔNDRE +0.08 to +0.20)',
  1: 'Slow Development     (ΔNDRE 0 to +0.08)',
  0: 'Decline              (ΔNDRE <= 0)'
}, 'Table 2: Intra-Season Classes 2024 (V6→VT)');

classAreas(cls_inter, {
  4: 'YoY Gain 2024        (ΔNDRE > +0.10)',
  3: 'Stable High          (ΔNDRE 0 to +0.10)',
  2: 'Stable Low           (ΔNDRE -0.05 to 0)',
  1: 'YoY Decline          (ΔNDRE -0.20 to -0.05)',
  0: 'Significant Loss     (ΔNDRE <= -0.20)'
}, 'Table 3: Inter-Season Classes 2023 vs 2024 (at V6)');

// =============================================================================
print('');
print('════════════════════════════════════════════════════');
print('Cross-Objective: SO1 vs SO2 Spatial Agreement');
print('════════════════════════════════════════════════════');
print('');

var gain_mask = cls_inter.eq(4).or(cls_inter.eq(3));
var loss_mask = cls_inter.eq(0).or(cls_inter.eq(1));

meanWithinMask(delta_A1, 'delta_NDRE_V6_VT', gain_mask,
  'Mean ΔA1 (SO1) in YoY-GAIN/STABLE-HI fields');
meanWithinMask(delta_A1, 'delta_NDRE_V6_VT', loss_mask,
  'Mean ΔA1 (SO1) in YoY-DECLINE/LOSS fields');

// =============================================================================
print('');
print('════════════════════════════════════════════════════');
print('Summary Statistics (Full Coverage — Updated)');
print('════════════════════════════════════════════════════');
print('');
print('  Metric                     | 2023    | 2024    | Change');
print('  Mean NDRE at V6            | 0.2154  | 0.1543  | -0.0611');
print('  Mean NDVI at VT            | 0.5055  | 0.5717  | +0.0662');
print('  Mean ΔNDRE V6→VT (SO1)     |   —     | 0.2641  |   —');
print('  Mean ΔNDRE YoY (SO2)       |   —     |-0.0193  |   —');
print('');
print('  Intra-season (1643.9 ha total corn):');
print('    Strong + Moderate dev    |   —     | 80.9%   |   —');
print('    Slow dev + Decline       |   —     | 19.1%   |   —');
print('');
print('  Inter-season (190.2 ha comparable):');
print('    Gain + Stable            |   —     | 52.9%   |   —');
print('    Decline + Loss           |   —     | 19.3%   |   —');
print('    Stable Low               |   —     | 27.8%   |   —');
print('');
print('════════════════════════════════════════════════════');
print('NOTE: Results updated with full two-tile mosaic.');
print('Previous partial-tile results are now superseded.');
print('Next: run 09_export_figures for publication maps.');
print('════════════════════════════════════════════════════');
