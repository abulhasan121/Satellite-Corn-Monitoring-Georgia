# Sentinel-2 Georgia Corn Change Detection

**In-Season and Inter-Annual Spatial Monitoring of Corn Development in South Georgia Using GDD-Anchored Sentinel-2 Multispectral Imagery**

[![GEE](https://img.shields.io/badge/Platform-Google%20Earth%20Engine-4285F4?logo=google&logoColor=white)](https://earthengine.google.com)
[![Sentinel-2](https://img.shields.io/badge/Data-Sentinel--2%20L2A-003247)](https://sentinel.esa.int/web/sentinel/missions/sentinel-2)
[![CDL](https://img.shields.io/badge/Crop%20Mask-USDA%20CDL-green)](https://www.nass.usda.gov/Research_and_Science/Cropland/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Overview

Satellite-based crop monitoring in south Georgia fails when scene selection relies on calendar dates rather than crop development stage. A field planted in late February and one planted in early April are at fundamentally different growth stages on the same April calendar date — yet most remote sensing pipelines treat them identically. This pipeline solves that problem by anchoring every Sentinel-2 acquisition to a specific accumulated growing degree day (GDD) threshold, ensuring that every comparison — across fields and across years — reflects the same physiological stage of corn development.

This study monitors 1,643.9 hectares of CDL-confirmed corn in Tift County, Georgia across the 2023 and 2024 growing seasons. The Normalised Difference Red Edge Index (NDRE) is used as the primary diagnostic tool at the V5-V6 stage because it penetrates the partial corn canopy more effectively than NDVI and is demonstrably more sensitive to chlorophyll concentration — and therefore nitrogen status — at low leaf area index values typical of south Georgia corn in April. NDVI is applied at tasseling when the canopy is fully closed, and LSWI at grain fill when water status is the limiting variable for yield.

The work is motivated by Zhen et al. (2024), who demonstrated that combining satellite remote sensing, crop growth modelling, and machine learning enables in-season spatial prediction of corn yield and nitrogen response. This pipeline delivers the remote sensing component of that framework at field scale using freely available Sentinel-2 imagery and Google Earth Engine.

---

## Specific Objectives

Three objectives were defined to produce results that are directly actionable for precision nitrogen management:

| ID | Objective | Why It Matters |
|----|-----------|----------------|
| SO1 | Map in-season nitrogen uptake efficiency between V6 and VT (2024) | V6 is the last practical window for side-dress nitrogen application. Fields that fail to convert V6 nitrogen status into VT biomass signal management intervention opportunities for the following season. |
| SO2 | Detect year-over-year productivity change at equivalent V6 GDD stage | Comparing 2023 and 2024 at the same GDD stage removes phenological offset as a confounding variable, leaving only genuine productivity differences driven by climate, soil, or management. |
| SO3 | Quantify the spatial extent of development classes in hectares | Converting continuous index values into classified area statistics makes results interpretable and actionable without requiring GIS expertise from the end user. |

---

## Key Findings

### SO1 — In-Season Nitrogen Uptake Efficiency (2024)

The 2024 growing season demonstrated strong canopy development between the V6 and VT stages across the majority of the study area. Mean NDRE rose from 0.1543 at V6 to 0.4187 at VT — a mean ΔNDRE of +0.2641, which places the AOI-wide average firmly in the Strong Development class (ΔNDRE > +0.20). Mean NDVI at VT was 0.5717, and mean LSWI was +0.1354, confirming that plant water status at tasseling was adequate rather than limiting.

| Metric | Value | Interpretation |
|--------|-------|----------------|
| Mean NDRE at V6 | 0.1543 | Moderate early-season canopy, as expected for Tifton's sandy soils in April |
| Mean NDRE at VT | 0.4187 | Strong canopy development by tasseling |
| Mean ΔNDRE V6→VT | +0.2641 | Strong nitrogen uptake — above the +0.20 threshold |
| Mean NDVI at VT | 0.5717 | High peak biomass |
| Mean LSWI at VT | +0.1354 | Adequate plant water content at the most yield-sensitive stage |

### SO2 — Year-Over-Year Productivity Change

The year-over-year comparison reveals a nuanced picture that a simple calendar-date comparison would misrepresent. At equivalent V6 GDD stage, 2024 showed marginally weaker early-season establishment than 2023 (mean NDRE: 0.1543 vs 0.2154, ΔNDRE = −0.0193). This difference is near zero and indicates broad stability rather than systematic decline. Critically, by the VT stage, 2024 had surpassed 2023 in peak biomass (mean NDVI: 0.5717 vs 0.5055). This pattern — slightly weaker at establishment, stronger at peak biomass — is consistent with a season in which rapid mid-season growing conditions compensated for a slower start, and would be invisible to a calendar-date analysis that compared April imagery without GDD anchoring.

| Metric | 2023 | 2024 | Change | Interpretation |
|--------|------|------|--------|----------------|
| Mean NDRE at V6 | 0.2154 | 0.1543 | −0.0611 | Slightly weaker establishment in 2024 |
| Mean NDVI at VT | 0.5055 | 0.5717 | +0.0662 | Stronger peak biomass in 2024 |
| Mean ΔNDRE (YoY at V6) | — | −0.0193 | Near zero | Broadly stable year-over-year at V6 |

### SO3 — Spatial Extent of Development Classes

**Intra-Season 2024 (total corn area: 1,643.9 ha)**

Eighty percent of the corn area showed positive development between V6 and VT. The dominance of the Strong Development class (64.9%, 1,066.2 ha) indicates that nitrogen uptake was efficient across most of the monitored area. The 10.0% Decline class (164.7 ha) represents fields where NDRE decreased from V6 to VT — a signal worth investigating for stand failure, replanting events, or severe early-stress conditions.

| Development Class | Area (ha) | % of Corn Area | ΔNDRE Range |
|-------------------|-----------|----------------|-------------|
| Strong Development | 1066.2 | 64.9% | > +0.20 |
| Moderate Development | 262.7 | 16.0% | +0.08 to +0.20 |
| Slow Development | 150.3 | 9.1% | 0 to +0.08 |
| Decline | 164.7 | 10.0% | <= 0 |
| **Total** | **1643.9** | **100%** | |

**Inter-Season 2023 vs 2024 (comparable area: 190.2 ha)**

The majority of the year-over-year comparable area is stable. Stable High and Stable Low together account for 76.1% (144.6 ha), while meaningful year-over-year decline affects only 19.3% (36.8 ha). This spatial stability corroborates the SO2 finding that 2024 was broadly comparable to 2023 at V6 stage and should be interpreted as a sign of consistent field-level management rather than stagnation.

| Productivity Class | Area (ha) | % of Corn Area | ΔNDRE Range |
|--------------------|-----------|----------------|-------------|
| YoY Gain 2024 | 8.7 | 4.6% | > +0.10 |
| Stable High | 91.8 | 48.3% | 0 to +0.10 |
| Stable Low | 52.8 | 27.8% | −0.05 to 0 |
| YoY Decline | 21.0 | 11.0% | −0.20 to −0.05 |
| Significant Loss | 15.8 | 8.3% | <= −0.20 |
| **Total** | **190.2** | **100%** | |

### Cross-Objective Spatial Agreement

The SO1 and SO2 signals are spatially consistent. Fields classified as performing better year-over-year (SO2) also show stronger intra-season development (SO1): mean ΔA1 NDRE of 0.3018 in YoY-gain and stable-high fields, versus 0.2265 in declining fields. Both values fall within the Strong Development class, which confirms that even the relatively weaker fields in 2024 were developing positively in absolute terms. The 0.0753 gap between groups demonstrates that the inter-annual signal captures genuine spatial productivity differences, not noise.

| SO2 Class | Mean ΔA1 NDRE (SO1) | Interpretation |
|-----------|----------------------|----------------|
| YoY Gain + Stable High | 0.3018 | Strong intra-season development |
| YoY Decline + Significant Loss | 0.2265 | Moderate intra-season development |

---

## Methodology

### Why GDD Anchoring Is Non-Negotiable for South Georgia Corn

South Georgia corn is planted from late February through early April depending on the grower. On any fixed calendar date in April, fields across a 10 km study area can span three or four different vegetative stages. A satellite image captured on April 15 might show V3 corn in one field and V8 corn in an adjacent one. Comparing NDRE values between those fields — or between those same fields in two different years with different planting dates — produces a difference signal that reflects phenology, not productivity. GDD anchoring eliminates this problem entirely by ensuring that every pixel compared represents the same physiological stage.

The modified GDD formula follows UGA Cooperative Extension Circular 1320, validated specifically for sweet corn in southwestern Georgia:

```
If Tmax > 86F, use 86F
If Tmin < 50F, use 50F
Daily GDD = ((capped Tmax + capped Tmin) / 2) - 50
```

The cap at 86°F reflects the plateau in corn development above that threshold; the floor at 50°F reflects the minimum temperature for meaningful growth. Both are critical for accurate accumulation in south Georgia where summer temperatures regularly exceed 90°F and early spring nights can drop below 50°F.

### Scene Acquisition Windows

| Scene | GDD Target | Month | Agronomic Significance |
|-------|-----------|-------|------------------------|
| T1 | ~415 GDD | April | V5-V6. Final window for side-dress nitrogen. Primary index: NDRE |
| T2 | ~935 GDD | May | VT-Tasseling. Peak vegetative biomass. Yield potential established. Primary index: NDVI |
| T3 | ~1346 GDD | Late May | R2-R3 grain fill. Water status critical for kernel development. Primary index: LSWI |

### Why NDRE at V6, Not NDVI

NDVI is the standard vegetation index but it performs poorly at V6 on Tifton-area soils. Sandy Coastal Plain soils have high surface reflectance, and at V6 the corn canopy covers only a fraction of the ground. Soil background contaminates the NDVI signal to the point where field-to-field NDVI differences at V6 reflect soil type as much as canopy nitrogen status. NDRE uses the red-edge band (B05, 705 nm), which is sensitive to chlorophyll concentration at lower leaf area index and less affected by soil background than the red band used in NDVI. For early-season nitrogen diagnosis in south Georgia, NDRE is the correct index.

### Change Detection Design

Two comparisons are computed independently and serve different management purposes:

**Comparison A — Intra-Season (SO1):**
`ΔNDRE = NDRE(T2_2024) − NDRE(T1_2024)`
This measures how much NDRE increased from V6 to VT within a single season. A high ΔNDRE indicates efficient nitrogen uptake during the critical V6-to-VT window. A low or negative ΔNDRE signals that something — nitrogen limitation, water stress, disease — prevented normal canopy development during the period when it matters most for yield.

**Comparison B — Inter-Season (SO2):**
`ΔNDRE = NDRE(T1_2024) − NDRE(T1_2023)`
This measures whether 2024 early-season establishment was better or worse than 2023 at the same GDD stage. Because both scenes represent equivalent V6 canopy development, differences in ΔNDRE reflect genuine year-over-year productivity changes rather than seasonal timing differences.

**Change Vector Analysis (CVA):**
CVA is run on raw spectral bands [B4, B8, B11] rather than on NDRE and NDVI, because those two indices share the B8 band and are therefore correlated. CVA on independent bands provides an unbiased measure of total spectral change magnitude and direction between T1 and T2.

---

## Repository Structure

```
sentinel2-georgia-corn/
|
|-- config.js                      # Master configuration: GEE project, AOI bounds,
|                                  # GDD thresholds, classification thresholds
|-- utils.js                       # Shared functions used by all pipeline scripts
|
|-- 00_compute_gdd.js              # Pull DAYMET temperature data, compute daily GDDs,
|                                  # find crossing dates for T1/T2/T3 thresholds
|-- 01_build_crop_mask.js          # Load USDA CDL, extract corn pixels, export to Asset
|-- 02_download_sentinel2.js       # Query S2_SR_HARMONIZED, build multi-tile median
|                                  # mosaic for full AOI coverage, export to Asset
|-- 03_preprocess.js               # Scale to reflectance, SCL cloud mask,
|                                  # harmonise 20m bands to 10m, apply corn mask
|-- 04_compute_indices.js          # Compute NDRE, NDVI, EVI, MSAVI, LSWI for all scenes
|-- 05_change_detection.js         # Compute delta A1 (intra), delta B1 (inter), CVA
|-- 06_classify_change.js          # Threshold classification, majority filter, area stats
|-- 07_export.js                   # Export all products to Google Drive
|-- 08_extract_results.js          # Print full numerical results to GEE Console
|-- 09_export_figures.js           # Export publication-ready figures by objective
|-- 10_satellite_visualization.js  # Load all layers on GEE map for visual inspection
```

---

## How to Run

### Prerequisites

- Google Earth Engine account with a registered Cloud project
- GEE Code Editor at [code.earthengine.google.com](https://code.earthengine.google.com)

### Setup

**Step 1 — Create a GEE repository**
```
GEE Code Editor → Scripts → NEW → Repository → Name: georgia-corn
```

**Step 2 — Create all scripts**

For each `.js` file in this repository, create a new file inside the `georgia-corn` repository in GEE, paste the code, and save (Ctrl+S).

**Step 3 — Update `config.js`**
```javascript
exports.USERNAME   = 'your_gee_username';
exports.PROJECT_ID = 'your-gee-project-id';
exports.ASSET_ROOT = 'projects/your-gee-project-id/assets/ga_corn';
```

**Step 4 — Create the GEE Asset folder**
```
Assets tab → NEW → Folder → Name: ga_corn
```

### Execution Order

Run one script at a time. After each script runs, click RUN on every task that appears in the Tasks panel on the right, then wait for all tasks to show COMPLETED in the Task Manager before opening the next script. Skipping ahead before tasks complete will cause asset-not-found errors in downstream scripts.

```
00_compute_gdd          Read the Console output for crossing dates.
                        Copy those dates into config.js under SCENE_SEARCH_WINDOWS.
                        Do not proceed to script 01 until this is done.

01_build_crop_mask      Expect 4 tasks (2 GEE Assets, 2 Google Drive exports).

02_download_sentinel2   Expect 5 tasks. Before submitting, check the map to confirm
                        the T1_2024 True Color layer covers the full AOI rectangle.
                        If a gap is visible, the search window needs widening.

03_preprocess           Expect 5 tasks.

04_compute_indices      Expect approximately 20 tasks.

05_change_detection     Expect approximately 10 tasks.

06_classify_change      Expect 6 tasks. Class area statistics print to the Console.

07_export               Expect approximately 25 tasks. All final products go to
                        Google Drive in a folder named sentinel2_georgia_corn.

08_extract_results      No export tasks. All results print to the Console tab.
                        Copy these numbers for your analysis and report.

09_export_figures       Expect approximately 15 tasks. Publication-ready figures
                        saved to Drive/sentinel2_georgia_corn/figures/.

10_satellite_visualization  No export tasks. All layers load on the GEE map.
                            Use the Layers panel to toggle and compare each output.
```

---

## Data Sources

| Dataset | GEE Collection | Resolution | Use in Pipeline |
|---------|----------------|------------|-----------------|
| Sentinel-2 L2A | `COPERNICUS/S2_SR_HARMONIZED` | 10–20 m | Multispectral imagery, all scenes |
| DAYMET V4 | `NASA/ORNL/DAYMET_V4` | 1 km daily | Daily Tmax/Tmin for GDD computation |
| Cropland Data Layer | `USDA/NASS/CDL` | 30 m annual | Corn pixel identification and masking |

All three datasets are freely accessible through Google Earth Engine without downloading raw files.

---

## Study Area

| Parameter | Value |
|-----------|-------|
| Location | Tifton, Tift County, Georgia |
| Bounding coordinates | 31.35N–31.60N, 83.65W–83.35W |
| Area | approximately 10 km x 10 km |
| MGRS tiles | 17RKQ and 17SKR |
| Total monitored corn area | 1,643.9 ha (2024 CDL) |
| Inter-season comparable area | 190.2 ha |
| Dominant soil series | Lakeland and Tifton (sandy Coastal Plain) |
| Representative planting date | March 5 |

South Georgia corn is planted one to two months earlier than the US Midwest specifically to move the yield-sensitive tasseling stage ahead of peak summer drought risk. This early planting calendar means that V6 falls in April and tasseling in early May — considerably earlier than pipeline configurations designed for corn in the Corn Belt would assume.

---

## Vegetation Indices

| Index | Formula | Bands Used | Growth Stage |
|-------|---------|------------|--------------|
| NDRE | (B08−B05) / (B08+B05) | NIR (842 nm), Red Edge (705 nm) | V5-V6 (T1) |
| NDVI | (B08−B04) / (B08+B04) | NIR (842 nm), Red (665 nm) | VT (T2) |
| LSWI | (B08−B11) / (B08+B11) | NIR (842 nm), SWIR1 (1610 nm) | R2-R3 (T3) |
| EVI | 2.5*(B08−B04)/(B08+6*B04−7.5*B02+1) | NIR, Red, Blue | Supporting (all) |
| MSAVI | (2*B08+1−sqrt((2*B08+1)^2−8*(B08−B04)))/2 | NIR, Red | Supporting (T1) |

---

## References

```
Vellidis, G., McAvoy, T., & Bedwell, E.K. (2025).
Growing Degree Days for Sweet Corn in Southern Georgia.
UGA Cooperative Extension Circular 1320. University of Georgia.

Zhen, X., Miao, Y., Huang, Y., Yang, Z., Feng, G., Liu, P., & Bindlish, R. (2024).
Evaluating the Potential of In-season Spatial Prediction of Corn Yield and
Responses to Nitrogen by Combining Crop Growth Modeling, Satellite Remote
Sensing and Machine Learning.
Proceedings of the 16th International Conference on Precision Agriculture (ISPA).

Thornton, P.E., Shrestha, R., Thornton, M., Kao, S.C., Wei, Y., & Wilson, B.E. (2021).
Gridded daily weather data for North America with comprehensive uncertainty
quantification. Scientific Data, 8(1), 190. [DAYMET V4]

USDA National Agricultural Statistics Service (2024).
Cropland Data Layer. USDA NASS.
https://www.nass.usda.gov/Research_and_Science/Cropland/
```

---

## License

MIT License — see [LICENSE](LICENSE) for details.
