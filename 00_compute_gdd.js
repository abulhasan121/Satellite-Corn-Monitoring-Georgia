// =============================================================================
// 00_compute_gdd.js — Phase 0: GDD Computation
//
// Computes modified growing degree days from the planting date using
// NASA DAYMET V4 daily temperature data.
// Method: UGA Cooperative Extension Circular 1320
//   Base temp: 50°F | Cap: 86°F
//
// HOW TO RUN:
//   1. Open this script in GEE Code Editor
//   2. Click Run
//   3. Look at the Console tab — it prints the crossing dates
//   4. Copy those dates into config.js → SCENE_SEARCH_WINDOWS
//   5. Then run 01_build_crop_mask.js
//
// OUTPUTS:
//   Console: crossing dates + GDD milestone summary
//   Drive:   gdd_daily_2024.csv, gdd_daily_2023.csv
//   Map:     Mean temperature surface (April)
// =============================================================================

var config = require('users/YOUR_USERNAME/georgia-corn:config');

Map.centerObject(config.AOI, config.MAP_ZOOM);
Map.addLayer(ee.Image().paint(config.AOI, 1, 2), {palette: ['red']}, 'AOI Boundary');

// ── Constants ─────────────────────────────────────────────────────────────────
var BASE_F      = config.BASE_TEMP_F;   // 50°F
var MAX_F       = config.MAX_TEMP_F;    // 86°F
var GDD_TARGETS = config.GDD_TARGETS;   // {T1: {gdd:415}, T2: {gdd:935}, T3: {gdd:1346}}
var SEARCH_DAYS = 3;                    // ± days around crossing date

// ── Celsius → Fahrenheit ──────────────────────────────────────────────────────
var cToF = function(c) { return c * 9 / 5 + 32; };

// ── Daily Modified GDD Function ───────────────────────────────────────────────
var computeDailyGDD = function(image) {
  // Convert DAYMET °C to °F
  var tmax_f = image.select('tmax').multiply(9.0/5).add(32);
  var tmin_f = image.select('tmin').multiply(9.0/5).add(32);

  // Apply UGA caps
  var tmax_capped = tmax_f.min(MAX_F);
  var tmin_capped = tmin_f.max(BASE_F);

  // GDD = ((Tmax + Tmin) / 2) - 50, min 0
  var gdd = tmax_capped.add(tmin_capped)
    .divide(2)
    .subtract(BASE_F)
    .max(0)
    .rename('GDD');

  return gdd.copyProperties(image, ['system:time_start']);
};

// ── Extract mean GDD per day over AOI ────────────────────────────────────────
var extractDailyGDDs = function(daymetCol) {
  return daymetCol.map(function(image) {
    var gdd   = computeDailyGDD(image);
    var stats = gdd.reduceRegion({
      reducer:   ee.Reducer.mean(),
      geometry:  config.AOI,
      scale:     1000,   // DAYMET native resolution
      bestEffort: true,
      maxPixels: 1e9
    });
    return ee.Feature(null, {
      date:      image.date().format('YYYY-MM-dd'),
      daily_gdd: ee.Number(stats.get('GDD')).format('%.2f'),
      tmax_c:    image.select('tmax').reduceRegion(
                   ee.Reducer.mean(), config.AOI, 1000, null, null, true, 1e9
                 ).get('tmax'),
      tmin_c:    image.select('tmin').reduceRegion(
                   ee.Reducer.mean(), config.AOI, 1000, null, null, true, 1e9
                 ).get('tmin'),
    });
  });
};

// ── Accumulate GDDs and find threshold crossings (client-side) ────────────────
var computeCalendar = function(plantingDate, year, label) {
  print('');
  print('════════════════════════════════════');
  print('GDD Calendar: ' + label, 'Planting: ' + plantingDate);
  print('════════════════════════════════════');

  var endDate = year + '-07-01';  // Stop accumulating July 1

  var daymet = ee.ImageCollection(config.DAYMET)
    .filterBounds(config.AOI)
    .filterDate(plantingDate, endDate)
    .select(['tmax','tmin'])
    .sort('system:time_start');

  var gddFC = extractDailyGDDs(daymet);

  // Export daily GDD table to Drive for record
  Export.table.toDrive({
    collection:      gddFC,
    description:     'gdd_daily_' + year,
    folder:          config.DRIVE_FOLDER,
    fileNamePrefix:  'gdd_daily_' + year,
    fileFormat:      'CSV'
  });

  // Client-side accumulation and threshold finding
  gddFC.sort('date').evaluate(function(fc) {
    if (!fc || !fc.features || fc.features.length === 0) {
      print('ERROR: No DAYMET data returned. Check AOI and date range.');
      return;
    }

    var cumulative = 0;
    var crossings  = {};
    var milestones = [
      {label: 'Emergence',     gdd: 70},
      {label: 'V6',            gdd: 416},
      {label: 'V13-Tasseling', gdd: 935},
      {label: 'Silking R1',    gdd: 1050},
      {label: 'Blister R2',    gdd: 1191},
      {label: 'Milk R3',       gdd: 1346},
      {label: 'Harvest',       gdd: 1400}
    ];
    var milestoneCrossings = {};

    fc.features.forEach(function(f) {
      var daily = parseFloat(f.properties.daily_gdd) || 0;
      cumulative += daily;

      // GDD target crossings for scene search windows
      if (!crossings.T1 && cumulative >= GDD_TARGETS.T1.gdd) {
        crossings.T1 = {date: f.properties.date, gdd: Math.round(cumulative * 10) / 10};
      }
      if (!crossings.T2 && cumulative >= GDD_TARGETS.T2.gdd) {
        crossings.T2 = {date: f.properties.date, gdd: Math.round(cumulative * 10) / 10};
      }
      if (!crossings.T3 && cumulative >= GDD_TARGETS.T3.gdd) {
        crossings.T3 = {date: f.properties.date, gdd: Math.round(cumulative * 10) / 10};
      }

      // Milestone crossings for informational output
      milestones.forEach(function(m) {
        if (!milestoneCrossings[m.label] && cumulative >= m.gdd) {
          milestoneCrossings[m.label] = f.properties.date;
        }
      });
    });

    // ── Print milestone summary ──────────────────────────────────────────────
    print('── Growth Stage Calendar ──');
    milestones.forEach(function(m) {
      print('  ' + m.label + ' (' + m.gdd + ' GDD):', milestoneCrossings[m.label] || 'Not reached');
    });

    // ── Print scene search windows ───────────────────────────────────────────
    print('');
    print('── Sentinel-2 Scene Search Windows ──');
    print('Copy these into config.js → SCENE_SEARCH_WINDOWS');
    print('');

    var addDays = function(dateStr, n) {
      var d = new Date(dateStr);
      d.setDate(d.getDate() + n);
      return d.toISOString().slice(0, 10);
    };

    ['T1','T2','T3'].forEach(function(key) {
      var c = crossings[key];
      if (c) {
        var start = addDays(c.date, -SEARCH_DAYS);
        var end   = addDays(c.date,  SEARCH_DAYS);
        print(
          '  ' + key + '_' + year + ': {start: \'' + start + '\', end: \'' + end + '\'}' +
          '   ← ' + GDD_TARGETS[key].stage + ' (' + c.gdd + ' GDD on ' + c.date + ')'
        );
      } else {
        print('  ' + key + ': Not reached before July 1');
      }
    });

    print('');
    print('Total days tracked:', fc.features.length);
  });
};

// ── Run for both years ────────────────────────────────────────────────────────
computeCalendar(config.PLANTING_2024, 2024, '2024 Season');
computeCalendar(config.PLANTING_2023, 2023, '2023 Season');

// ── Visualise mean DAYMET temperature surface (April 2024) ───────────────────
var aprilDaymet = ee.ImageCollection(config.DAYMET)
  .filterBounds(config.AOI)
  .filterDate('2024-04-01', '2024-04-30')
  .select('tmax')
  .mean()
  .multiply(9.0/5).add(32);  // Convert to °F for display

Map.addLayer(aprilDaymet.clip(config.AOI), {
  min: 65, max: 88, palette: ['#2c7bb6','#ffffbf','#d7191c']
}, 'Mean April Tmax (°F) 2024');

print('');
print('Next step: update config.js with the scene windows above, then run 01_build_crop_mask.js');
