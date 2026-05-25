// =============================================================================
// 09_export_figures.js — Final Figure Export for Publication
//
// Exports all maps needed for the three specific objectives.
// All outputs go to Google Drive → sentinel2_georgia_corn/figures/
//
// Run AFTER 08_extract_results.js
// =============================================================================

var config = require('users/YOUR_USERNAME/georgia-corn:config');

var AOI    = config.AOI;
var FOLDER = config.DRIVE_FOLDER + '/figures';
var SCALE  = 10;
var CRS    = 'EPSG:4326';

// ── Load assets ───────────────────────────────────────────────────────────────
var proc_T1_2024 = ee.Image(config.ASSET_ROOT + '/T1_2024_proc');
var proc_T2_2024 = ee.Image(config.ASSET_ROOT + '/T2_2024_proc');
var proc_T1_2023 = ee.Image(config.ASSET_ROOT + '/T1_2023_proc');
var idx_T1_2024  = ee.Image(config.ASSET_ROOT + '/T1_2024_indices');
var idx_T2_2024  = ee.Image(config.ASSET_ROOT + '/T2_2024_indices');
var idx_T1_2023  = ee.Image(config.ASSET_ROOT + '/T1_2023_indices');
var delta_A1     = ee.Image(config.ASSET_ROOT + '/delta_A1');
var delta_B1     = ee.Image(config.ASSET_ROOT + '/delta_B1');
var cls_intra    = ee.Image(config.ASSET_ROOT + '/classified_intraseason');
var cls_inter    = ee.Image(config.ASSET_ROOT + '/classified_interseason');

// ── Shared viz params ─────────────────────────────────────────────────────────
var VIZ_TC   = {bands:['B4','B3','B2'], min:0, max:0.3,  gamma:1.4};
var VIZ_CIR  = {bands:['B8','B4','B3'], min:0, max:0.5,  gamma:1.2};
var VIZ_NDRE = {min:-0.2, max:0.6,  palette:['#d73027','#fee090','#ffffbf','#90ee90','#1a9850']};
var VIZ_NDVI = {min:-0.1, max:0.9,  palette:['#d73027','#fee090','#ffffbf','#90ee90','#1a9850']};
var VIZ_DELTA= {min:-0.4, max:0.4,  palette:['#d7191c','#fdae61','#ffffbf','#a6d96a','#1a9641']};
var VIZ_INTRA= {min:0, max:3, palette:['#d7191c','#ffffbf','#a6d96a','#1a9641']};
var VIZ_INTER= {min:0, max:4, palette:['#d7191c','#f46d43','#ffffbf','#a6d96a','#1a9641']};

// ── Export helper ─────────────────────────────────────────────────────────────
var exportFig = function(image, name, desc) {
  Export.image.toDrive({
    image:          image.clip(AOI),
    description:    desc,
    folder:         FOLDER,
    fileNamePrefix: name,
    region:         AOI,
    scale:          SCALE,
    crs:            CRS,
    maxPixels:      1e10
  });
  print('Submitted:', name);
};

// ─────────────────────────────────────────────────────────────────────────────
// FIGURE 1 — Study area context (True Color composites)
// ─────────────────────────────────────────────────────────────────────────────
exportFig(proc_T1_2024.visualize(VIZ_TC),  'fig1a_T1_2024_truecolor', 'fig1a');
exportFig(proc_T2_2024.visualize(VIZ_TC),  'fig1b_T2_2024_truecolor', 'fig1b');
exportFig(proc_T1_2023.visualize(VIZ_TC),  'fig1c_T1_2023_truecolor', 'fig1c');
exportFig(proc_T1_2024.visualize(VIZ_CIR), 'fig1d_T1_2024_falsecolor','fig1d');
exportFig(proc_T2_2024.visualize(VIZ_CIR), 'fig1e_T2_2024_falsecolor','fig1e');

// ─────────────────────────────────────────────────────────────────────────────
// FIGURE 2 — SO1: NDRE at V6 and VT (baseline index maps)
// ─────────────────────────────────────────────────────────────────────────────
exportFig(idx_T1_2024.select('NDRE').visualize(VIZ_NDRE), 'fig2a_NDRE_V6_2024', 'fig2a');
exportFig(idx_T2_2024.select('NDRE').visualize(VIZ_NDRE), 'fig2b_NDRE_VT_2024', 'fig2b');
exportFig(idx_T1_2023.select('NDRE').visualize(VIZ_NDRE), 'fig2c_NDRE_V6_2023', 'fig2c');

// ─────────────────────────────────────────────────────────────────────────────
// FIGURE 3 — SO1: ΔNDRE intra-season (V6→VT 2024)
// ─────────────────────────────────────────────────────────────────────────────
exportFig(delta_A1.visualize(VIZ_DELTA),   'fig3a_delta_NDRE_V6_VT_2024',   'fig3a');
exportFig(cls_intra.visualize(VIZ_INTRA),  'fig3b_classified_intraseason',   'fig3b');

// ─────────────────────────────────────────────────────────────────────────────
// FIGURE 4 — SO2: ΔNDRE inter-season (2023 vs 2024 at V6)
// ─────────────────────────────────────────────────────────────────────────────
exportFig(delta_B1.visualize(VIZ_DELTA),   'fig4a_delta_NDRE_2023_vs_2024',  'fig4a');
exportFig(cls_inter.visualize(VIZ_INTER),  'fig4b_classified_interseason',   'fig4b');

// ─────────────────────────────────────────────────────────────────────────────
// FIGURE 5 — SO3: Side-by-side classified maps (for comparison figure)
// Both classified maps normalized so they can be compared visually
// ─────────────────────────────────────────────────────────────────────────────
exportFig(cls_intra.visualize(VIZ_INTRA),  'fig5a_SO3_intra_classified',     'fig5a');
exportFig(cls_inter.visualize(VIZ_INTER),  'fig5b_SO3_inter_classified',     'fig5b');

// ─────────────────────────────────────────────────────────────────────────────
// BONUS: NDVI at VT for both years (peak biomass comparison)
// ─────────────────────────────────────────────────────────────────────────────
exportFig(idx_T2_2024.select('NDVI').visualize(VIZ_NDVI), 'fig_bonus_NDVI_VT_2024', 'bonus_a');
var idx_T2_2023 = ee.Image(config.ASSET_ROOT + '/T2_2023_indices');
exportFig(idx_T2_2023.select('NDVI').visualize(VIZ_NDVI), 'fig_bonus_NDVI_VT_2023', 'bonus_b');

// ─────────────────────────────────────────────────────────────────────────────
// MAP DISPLAY: show all figures on screen
// ─────────────────────────────────────────────────────────────────────────────
Map.centerObject(AOI, 11);

Map.addLayer(proc_T1_2024.clip(AOI), VIZ_TC,   'Fig1a T1_2024 True Color', true);
Map.addLayer(proc_T2_2024.clip(AOI), VIZ_CIR,  'Fig1e T2_2024 False Color CIR', false);
Map.addLayer(idx_T1_2024.select('NDRE').clip(AOI), VIZ_NDRE, 'Fig2a NDRE at V6 2024', false);
Map.addLayer(idx_T2_2024.select('NDRE').clip(AOI), VIZ_NDRE, 'Fig2b NDRE at VT 2024', false);
Map.addLayer(delta_A1.clip(AOI),    VIZ_DELTA, 'Fig3a ΔNDRE V6→VT (SO1)', false);
Map.addLayer(cls_intra.clip(AOI),   VIZ_INTRA, 'Fig3b Classified Intra (SO1+SO3)', false);
Map.addLayer(delta_B1.clip(AOI),    VIZ_DELTA, 'Fig4a ΔNDRE 2023vs2024 (SO2)', false);
Map.addLayer(cls_inter.clip(AOI),   VIZ_INTER, 'Fig4b Classified Inter (SO2+SO3)', false);

Map.addLayer(ee.Image().paint(AOI,1,2), {palette:['#FF0000']}, 'AOI Boundary');

print('');
print('All figure exports submitted.');
print('Files will appear in Drive → sentinel2_georgia_corn/figures/');
print('Monitor: https://code.earthengine.google.com/tasks');
