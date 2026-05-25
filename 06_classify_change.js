// =============================================================================
// 06_classify_change.js — Phase 6: Change Classification & Statistics
//
// Converts continuous delta maps to discrete GDD-aware change classes,
// applies a 3×3 majority filter, and computes area statistics per class.
//
// Intra-Season Classes (ΔA1: NDRE V6→VT):
//   3 = Strong Development   ΔNDRE > +0.20
//   2 = Moderate Development ΔNDRE > +0.08
//   1 = Slow Development     ΔNDRE > 0.00
//   0 = Decline              ΔNDRE ≤ 0.00
//
// Inter-Season Classes (ΔB1: NDRE 2023 vs 2024 at V6):
//   4 = YoY Gain             ΔNDRE > +0.10
//   3 = Stable High          ΔNDRE > 0.00
//   2 = Stable Low           ΔNDRE > -0.05
//   1 = YoY Decline          ΔNDRE > -0.20
//   0 = Significant Loss     ΔNDRE ≤ -0.20
//
// OUTPUTS:
//   GEE Assets:  classified_intraseason, classified_interseason
//   Drive:       Classified GeoTIFFs
//   Console:     Area per class in hectares and %
//   Map:         Classified maps with legend annotations
// =============================================================================

var config = require('users/YOUR_USERNAME/georgia-corn:config');
var utils  = require('users/YOUR_USERNAME/georgia-corn:utils');

Map.centerObject(config.AOI, config.MAP_ZOOM);

// ── Load delta maps ───────────────────────────────────────────────────────────
var deltaA1 = ee.Image(utils.assetPath('delta_A1'));
var deltaB1 = ee.Image(utils.assetPath('delta_B1'));

var INTRA = config.INTRA_THRESHOLDS;
var INTER = config.INTER_THRESHOLDS;

// ─────────────────────────────────────────────────────────────────────────────
// Classification Functions
// ─────────────────────────────────────────────────────────────────────────────

var classifyIntraSeason = function(delta) {
  var d = delta.select(0);
  return ee.Image(0)
    .where(d.gt(INTRA.slowDev),     1)   // > 0.00
    .where(d.gt(INTRA.moderateDev), 2)   // > 0.08
    .where(d.gt(INTRA.strongDev),   3)   // > 0.20
    .rename('intra_class')
    .updateMask(delta.mask())
    .toUint8();
};

var classifyInterSeason = function(delta) {
  var d = delta.select(0);
  return ee.Image(0)
    .where(d.gt(INTER.yoyDecline),  1)   // > -0.20
    .where(d.gt(INTER.stableLo),    2)   // > -0.05
    .where(d.gt(INTER.stableHi),    3)   // >  0.00
    .where(d.gt(INTER.yoyGain),     4)   // > +0.10
    .rename('inter_class')
    .updateMask(delta.mask())
    .toUint8();
};

// ─────────────────────────────────────────────────────────────────────────────
// Area Statistics
// ─────────────────────────────────────────────────────────────────────────────

var computeClassAreas = function(classified, classLabels, title) {
  print('');
  print('── ' + title + ' ──');

  var pixelAreaHa = ee.Image.pixelArea().divide(10000);
  var combined    = pixelAreaHa.addBands(classified);

  combined.reduceRegion({
    reducer:    ee.Reducer.sum().group({groupField: 1, groupName: 'class_value'}),
    geometry:   config.AOI,
    scale:      10,
    maxPixels:  1e10,
    bestEffort: true
  }).evaluate(function(stats) {
    var groups   = stats.groups || [];
    var totalHa  = groups.reduce(function(sum, g) { return sum + g.sum; }, 0);

    // Sort by class value descending (best class first)
    groups.sort(function(a, b) { return b.class_value - a.class_value; });

    groups.forEach(function(g) {
      var cls  = g.class_value;
      var ha   = Math.round(g.sum * 10) / 10;
      var pct  = Math.round((g.sum / totalHa) * 1000) / 10;
      var lbl  = classLabels[cls] || ('Class ' + cls);
      print('  ' + lbl + ':', ha + ' ha (' + pct + '%)');
    });

    print('  Total corn area:', Math.round(totalHa * 10) / 10 + ' ha');
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Run Classification
// ─────────────────────────────────────────────────────────────────────────────

// ── Intra-Season ─────────────────────────────────────────────────────────────
var intraRaw      = classifyIntraSeason(deltaA1);
var intraFiltered = utils.majorityFilter(intraRaw);

utils.exportToAsset(intraFiltered, 'classified_intraseason', 'classified_intraseason_asset');
utils.exportToDrive(
  intraFiltered.visualize(config.VIZ.classifiedIntra).clip(config.AOI),
  'classified_intraseason',
  'classified_intraseason_drive'
);

computeClassAreas(intraFiltered, {
  3: '★ Strong Development   (ΔNDRE > +0.20)',
  2: '◆ Moderate Development (ΔNDRE +0.08–+0.20)',
  1: '▲ Slow Development     (ΔNDRE 0–+0.08)',
  0: '✗ Decline              (ΔNDRE ≤ 0)'
}, 'Intra-Season Classification 2024 (V6→VT)');

// ── Inter-Season ─────────────────────────────────────────────────────────────
var interRaw      = classifyInterSeason(deltaB1);
var interFiltered = utils.majorityFilter(interRaw);

utils.exportToAsset(interFiltered, 'classified_interseason', 'classified_interseason_asset');
utils.exportToDrive(
  interFiltered.visualize(config.VIZ.classifiedInter).clip(config.AOI),
  'classified_interseason',
  'classified_interseason_drive'
);

computeClassAreas(interFiltered, {
  4: '★ YoY Gain 2024         (ΔNDRE > +0.10)',
  3: '◆ Stable High           (ΔNDRE 0–+0.10)',
  2: '▲ Stable Low            (ΔNDRE -0.05–0)',
  1: '▼ YoY Decline           (ΔNDRE -0.20–-0.05)',
  0: '✗ Significant Loss      (ΔNDRE ≤ -0.20)'
}, 'Inter-Season Classification 2023 vs 2024 at V6');

// ─────────────────────────────────────────────────────────────────────────────
// Map Visualisation
// ─────────────────────────────────────────────────────────────────────────────

Map.addLayer(intraFiltered.clip(config.AOI), config.VIZ.classifiedIntra,
  'Classified Intra-Season 2024 (V6→VT)', true);

Map.addLayer(interFiltered.clip(config.AOI), config.VIZ.classifiedInter,
  'Classified Inter-Season 2023 vs 2024', false);

// Show pre-filter classification for comparison
Map.addLayer(intraRaw.clip(config.AOI), config.VIZ.classifiedIntra,
  'Classified Intra-Season (pre-filter)', false);

Map.addLayer(
  ee.Image().paint(config.AOI, 1, 2),
  {palette: ['#FF0000']},
  'AOI Boundary'
);

// ── Legend ───────────────────────────────────────────────────────────────────
print('');
print('── Intra-Season Legend ──');
print('  Green  = Strong Development (healthy N uptake V6→VT)');
print('  L.Green = Moderate Development');
print('  Yellow = Slow Development (stress)');
print('  Red    = Decline (failure / replanting / flooding)');
print('');
print('── Inter-Season Legend ──');
print('  Green  = 2024 better than 2023 at V6 stage');
print('  L.Green = Stable high productivity');
print('  Yellow = Stable low productivity');
print('  Orange = 2024 worse than 2023 (YoY decline)');
print('  Red    = Significant loss 2024 vs 2023');
print('');
print('All exports submitted. Monitor at: https://code.earthengine.google.com/tasks');
print('Wait for all tasks to complete, then run 07_export.js');
