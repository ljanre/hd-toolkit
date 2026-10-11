/* =====================================================================
   PAGASA Rainfall Station Locator — Station Database
   ---------------------------------------------------------------------
   This file is the SOLE source of station data used by index.html.
   Keeping it separate makes the database easy to review, correct, and
   extend without touching application logic.

   DATA INTEGRITY RULES (see data-sources.md for full detail):
   1. No station in this file is invented. Every record traces to a
      named, checkable source (see `source` / `sourceUrl`).
   2. No coordinate is invented. Where a coordinate could not be
      independently cross-checked against a second source in this
      session, `verificationLevel` is set to "published" and the
      record is flagged for verification rather than presented as
      confirmed.
   3. Elevation is left `null` ("Not available") unless a source
      value was actually observed — it is NOT estimated or guessed.
   4. This build ships ZERO independently-verified Automatic Rain
      Gauge (ARG) records that are geographically distinct from the
      Climate/Synoptic stations below. PAGASA operates a much larger
      ARG network, but its authoritative interactive map
      (bagong.pagasa.dost.gov.ph/automated-rain-gauge) is a
      JavaScript-rendered map with no public, stable, machine-readable
      coordinate export, and third-party scrapes could not be
      corroborated for the large majority of sites (coordinates blank
      in the source scrape). Per the project rule "prefer correctness
      and traceability over having a large station database," those
      unverifiable ARG rows were excluded rather than estimated.
      See data-sources.md, section "ARG / AWS coverage gap", for how
      to add verified ARG/AWS records later — the schema already
      supports them (`type: "ARG"` / `type: "AWS"`).

   HOW TO UPDATE:
   - Add/edit objects in the STATIONS array below. Every field in the
     schema comment should be filled in, or explicitly set to null /
     "Not available" / "Requires verification" — never left guessed.
   - Update STATION_DB_META counts and lastReviewed after any change.
===================================================================== */

// ---- Station type metadata (used for map markers, legend, filters) ----
const STATION_TYPES = {
  "ARG": {
    label: "Automatic Rain Gauge (ARG)",
    shortLabel: "ARG",
    color: "#e67e22",
    description: "Nearby observed rainfall monitoring point. Typically shorter, less complete historical record than a principal climate station."
  },
  "AWS": {
    label: "Automatic Weather Station (AWS)",
    shortLabel: "AWS",
    color: "#8e44ad",
    description: "Automated multi-parameter weather station (rainfall, temperature, wind, etc.)."
  },
  "Climate/Synoptic": {
    label: "Climate / Synoptic Station",
    shortLabel: "Climate/Synoptic",
    color: "#1e7e4d",
    description: "PAGASA principal station with long-term climatological record; the type of station most likely to have published Climatological Normals and the longest period-of-record."
  }
};

/* ---------------------------------------------------------------------
   Station record schema:
   {
     name: string,                 // station name as published
     siteId: string|null,          // network site ID, if known
     type: "ARG" | "AWS" | "Climate/Synoptic",
     province: string,
     municipality: string,
     lat: number,                  // decimal degrees WGS84
     lon: number,                  // decimal degrees WGS84
     elevation: number|null,       // meters; null = "Not available"
     coastal: boolean|null,        // general categorical flag, not survey data
     recordPeriod: string,         // e.g. "Climatological Normals 1991-2020"
     source: string,               // human-readable source name
     sourceUrl: string,            // link to verify
     normalsUrl: string|null,      // direct link to normals PDF, if any
     verifiedDate: string,         // YYYY-MM-DD this entry was last checked
     verificationLevel: "cross-verified" | "published-verify" ,
     notes: string                 // free-text caveats specific to this record
   }
------------------------------------------------------------------------ */

const NORMALS_BASE_URL =
  "https://pubfiles.pagasa.dost.gov.ph/pagasaweb/files/cad/CLIMATOLOGICAL%20NORMALS%20(1991-2020)/";
const NORMALS_INDEX_URL = NORMALS_BASE_URL; // directory listing itself is a valid source page

const SOURCE_NORMALS = "PAGASA Climatology and Agrometeorology Division — Climatological Normals (1991–2020) station index";
const SOURCE_CROSSCHECK = "Cross-checked against PAGASA automated network coordinate export (community-compiled) and PANaHON (panahon.gov.ph)";

// Helper so every record stays consistent without retyping shared strings
function climateStation(opts) {
  return {
    name: opts.name,
    siteId: opts.siteId || null,
    type: "Climate/Synoptic",
    province: opts.province,
    municipality: opts.municipality,
    lat: opts.lat,
    lon: opts.lon,
    elevation: (opts.elevation === undefined ? null : opts.elevation),
    coastal: (opts.coastal === undefined ? null : opts.coastal),
    recordPeriod: "Climatological Normals 1991-2020 (published); verify current period of record with PAGASA",
    source: opts.crossVerified ? SOURCE_NORMALS + "; " + SOURCE_CROSSCHECK : SOURCE_NORMALS,
    sourceUrl: NORMALS_INDEX_URL,
    normalsUrl: NORMALS_BASE_URL + opts.file,
    verifiedDate: "2026-08-12",
    verificationLevel: opts.crossVerified ? "cross-verified" : "published-verify",
    notes: opts.notes || ""
  };
}

const STATIONS = [
  climateStation({name:"Alabat", province:"Quezon", municipality:"Alabat", lat:14.1167, lon:122.0333, coastal:true, file:"ALABAT.pdf", notes:"Island station."}),
  climateStation({name:"Ambulong", province:"Batangas", municipality:"Tanauan City", lat:14.1000, lon:121.0500, coastal:false, file:"AMBULONG.pdf"}),
  climateStation({name:"Aparri", province:"Cagayan", municipality:"Aparri", lat:18.3594, lon:121.6303, coastal:true, file:"APARRI.pdf", crossVerified:true}),
  climateStation({name:"Baguio", province:"Benguet", municipality:"Baguio City", lat:16.4023, lon:120.5960, coastal:false, file:"BAGUIO.pdf", notes:"Cordillera highland station — significant orographic rainfall enhancement expected."}),
  climateStation({name:"Baler (Radar)", province:"Aurora", municipality:"Baler", lat:15.7581, lon:121.5628, coastal:true, file:"BALER%20RADAR.pdf", notes:"Sierra Madre / Pacific-facing coast."}),
  climateStation({name:"Basco (Radar)", province:"Batanes", municipality:"Basco", lat:20.4487, lon:121.9702, coastal:true, file:"BASCO%20RADAR.pdf", notes:"Northernmost station; frequent typhoon exposure."}),
  climateStation({name:"Borongan", province:"Eastern Samar", municipality:"Borongan City", lat:11.6086, lon:125.4306, coastal:true, file:"BORONGAN.pdf", notes:"Pacific-facing Eastern Visayas coast."}),
  climateStation({name:"Butuan City", province:"Agusan del Norte", municipality:"Butuan City", lat:8.9517, lon:125.4858, coastal:false, file:"BUTUAN%20CITY.pdf", crossVerified:true}),
  climateStation({name:"Cabanatuan", province:"Nueva Ecija", municipality:"Cabanatuan City", lat:15.4864, lon:120.9622, coastal:false, file:"CABANATUAN.pdf"}),
  climateStation({name:"Calapan", province:"Oriental Mindoro", municipality:"Calapan City", lat:13.4097, lon:121.1894, coastal:true, file:"CALAPAN.pdf", crossVerified:true}),
  climateStation({name:"Calayan", province:"Cagayan", municipality:"Calayan", lat:19.2667, lon:121.4667, elevation:13, coastal:true, file:"CALAYAN.pdf", crossVerified:true, notes:"Elevation from published normals cover sheet."}),
  climateStation({name:"Casiguran", province:"Aurora", municipality:"Casiguran", lat:16.2725, lon:122.1339, coastal:true, file:"CASIGURAN.pdf", notes:"Sierra Madre / Pacific-facing coast."}),
  climateStation({name:"Catarman", province:"Northern Samar", municipality:"Catarman", lat:12.5031, lon:124.6317, coastal:true, file:"CATARMAN.pdf", crossVerified:true}),
  climateStation({name:"Catbalogan", province:"Samar", municipality:"Catbalogan City", lat:11.7753, lon:124.8861, coastal:true, file:"CATBALOGAN.pdf"}),
  climateStation({name:"Clark", province:"Pampanga", municipality:"Mabalacat City / Angeles City (Clark Freeport)", lat:15.1861, lon:120.5489, coastal:false, file:"CLARK.pdf"}),
  climateStation({name:"Coron", province:"Palawan", municipality:"Coron", lat:12.0036, lon:120.1997, coastal:true, file:"CORON.pdf", crossVerified:true}),
  climateStation({name:"Cotabato", province:"Maguindanao del Norte", municipality:"Cotabato City", lat:7.1436, lon:124.2450, coastal:false, file:"COTABATO.pdf", notes:"Province boundary in this area is subject to BARMM administrative arrangements — verify current jurisdiction."}),
  climateStation({name:"Cubi Point", province:"Zambales", municipality:"Subic", lat:14.7961, lon:120.2711, coastal:true, file:"CUBI%20POINT.pdf"}),
  climateStation({name:"Cuyo", province:"Palawan", municipality:"Cuyo", lat:10.8500, lon:121.0167, coastal:true, file:"CUYO.pdf"}),
  climateStation({name:"Daet", province:"Camarines Norte", municipality:"Daet", lat:14.1183, lon:122.9553, coastal:true, file:"DAET.pdf", crossVerified:true}),
  climateStation({name:"Dagupan", province:"Pangasinan", municipality:"Dagupan City", lat:16.0433, lon:120.3439, coastal:true, file:"DAGUPAN.pdf"}),
  climateStation({name:"Davao City", province:"Davao del Sur", municipality:"Davao City", lat:7.1255, lon:125.6456, coastal:true, file:"DAVAO%20CITY.pdf"}),
  climateStation({name:"Dipolog", province:"Zamboanga del Norte", municipality:"Dipolog City", lat:8.6019, lon:123.3439, coastal:true, file:"DIPOLOG.pdf"}),
  climateStation({name:"Dumaguete", province:"Negros Oriental", municipality:"Dumaguete City", lat:9.3103, lon:123.3078, coastal:true, file:"DUMAGUETE.pdf"}),
  climateStation({name:"General Santos", province:"South Cotabato", municipality:"General Santos City", lat:6.0583, lon:125.0864, coastal:true, file:"GENERAL%20SANTOS.pdf"}),
  climateStation({name:"Guiuan", province:"Eastern Samar", municipality:"Guiuan", lat:11.0453, lon:125.7556, coastal:true, file:"GUIUAN.pdf", crossVerified:true, notes:"Pacific-facing; frequent direct typhoon landfall point."}),
  climateStation({name:"Hinatuan", province:"Surigao del Sur", municipality:"Hinatuan", lat:8.3664, lon:126.3378, coastal:true, file:"HINATUAN.pdf", crossVerified:true}),
  climateStation({name:"Iba", province:"Zambales", municipality:"Iba", lat:15.3297, lon:119.9686, coastal:true, file:"IBA.pdf"}),
  climateStation({name:"Iloilo", province:"Iloilo", municipality:"Iloilo City", lat:10.7133, lon:122.5453, coastal:true, file:"ILOILO.pdf"}),
  climateStation({name:"Infanta", province:"Quezon", municipality:"Infanta", lat:14.7500, lon:121.6500, coastal:true, file:"INFANTA.pdf", notes:"Sierra Madre / Pacific-facing coast — high rainfall zone."}),
  climateStation({name:"Itbayat", province:"Batanes", municipality:"Itbayat", lat:20.7667, lon:121.8333, coastal:true, file:"ITBAYAT.pdf"}),
  climateStation({name:"Laoag", province:"Ilocos Norte", municipality:"Laoag City", lat:18.1828, lon:120.5342, coastal:true, file:"LAOAG.pdf", crossVerified:true}),
  climateStation({name:"Legazpi", province:"Albay", municipality:"Legazpi City", lat:13.1391, lon:123.7350, coastal:true, file:"LEGAZPI.pdf", notes:"Bicol region — Mayon Volcano orographic influence; high rainfall / frequent typhoon track."}),
  climateStation({name:"Lumbia (El Salvador)", province:"Misamis Oriental", municipality:"Cagayan de Oro City / El Salvador City (verify exact site)", lat:8.4153, lon:124.6111, coastal:false, file:"LUMBIA-EL%20SALVADOR.pdf", notes:"Filename suggests site relocation history between Lumbia (CDO) and El Salvador — confirm current site location with PAGASA before use."}),
  climateStation({name:"Maasin", province:"Southern Leyte", municipality:"Maasin City", lat:10.1389, lon:124.8603, coastal:true, file:"MAASIN.pdf", crossVerified:true}),
  climateStation({name:"Mactan", province:"Cebu", municipality:"Lapu-Lapu City", lat:10.3225, lon:123.9800, elevation:25.7, coastal:true, file:"MACTAN.pdf", crossVerified:true, notes:"Elevation from published normals cover sheet (25.703 m)."}),
  climateStation({name:"Malaybalay", province:"Bukidnon", municipality:"Malaybalay City", lat:8.1575, lon:125.1278, coastal:false, file:"MALAYBALAY.pdf", notes:"Mindanao highland station."}),
  climateStation({name:"Masbate", province:"Masbate", municipality:"Masbate City", lat:12.3689, lon:123.6231, coastal:true, file:"MASBATE.pdf"}),
  climateStation({name:"NAIA", province:"Metro Manila", municipality:"Pasay City", lat:14.5086, lon:121.0198, coastal:true, file:"NAIA.pdf"}),
  climateStation({name:"Port Area", province:"Metro Manila", municipality:"Manila", lat:14.5869, lon:120.9722, elevation:15, coastal:true, file:"PORT%20AREA.pdf", notes:"Elevation from published normals cover sheet."}),
  climateStation({name:"Puerto Princesa", province:"Palawan", municipality:"Puerto Princesa City", lat:9.7403, lon:118.7586, coastal:true, file:"PUERTO%20PRINCESA.pdf", crossVerified:true}),
  climateStation({name:"Romblon", province:"Romblon", municipality:"Romblon", lat:12.5742, lon:122.2711, coastal:true, file:"ROMBLON.pdf"}),
  climateStation({name:"Roxas City", province:"Capiz", municipality:"Roxas City", lat:11.5854, lon:122.7519, coastal:true, file:"ROXAS%20CITY.pdf"}),
  climateStation({name:"San Jose", province:"Occidental Mindoro", municipality:"San Jose", lat:12.3597, lon:121.0356, coastal:true, file:"SAN%20JOSE.pdf"}),
  climateStation({name:"Sangley Point", province:"Cavite", municipality:"Cavite City", lat:14.4989, lon:120.9033, coastal:true, file:"SANGLEY%20POINT.pdf"}),
  climateStation({name:"Science Garden", province:"Metro Manila", municipality:"Quezon City", lat:14.6447, lon:121.0444, coastal:false, file:"SCIENCE%20GARDEN.pdf", crossVerified:true, notes:"PAGASA main climatological reference station for Metro Manila."}),
  climateStation({name:"Surigao", province:"Surigao del Norte", municipality:"Surigao City", lat:9.7833, lon:125.4931, coastal:true, file:"SURIGAO.pdf"}),
  climateStation({name:"Tacloban", province:"Leyte", municipality:"Tacloban City", lat:11.2256, lon:125.0247, coastal:true, file:"TACLOBAN.pdf", crossVerified:true, notes:"San Pedro Bay / Leyte Gulf — storm surge and typhoon exposure history (e.g., Typhoon Yolanda/Haiyan)."}),
  climateStation({name:"Tagbilaran-Dauis", province:"Bohol", municipality:"Tagbilaran City / Dauis", lat:9.6725, lon:123.8531, coastal:true, file:"TAGBILARAN-DAUIS.pdf"}),
  climateStation({name:"Tanay", province:"Rizal", municipality:"Tanay", lat:14.5814, lon:121.3692, coastal:false, file:"TANAY.pdf", crossVerified:true, notes:"Sierra Madre foothills; upland/watershed reference for Rizal/Laguna."}),
  climateStation({name:"Tayabas", province:"Quezon", municipality:"Tayabas City", lat:14.0147, lon:121.6019, coastal:false, file:"TAYABAS.pdf", crossVerified:true}),
  climateStation({name:"Tuguegarao", province:"Cagayan", municipality:"Tuguegarao City", lat:17.6375, lon:121.7525, coastal:false, file:"TUGUEGARAO.pdf", crossVerified:true}),
  climateStation({name:"Vigan-Sinait", province:"Ilocos Sur", municipality:"Vigan City / Sinait", lat:17.5744, lon:120.3869, coastal:true, file:"VIGAN-SINAIT.pdf"}),
  climateStation({name:"Virac (Synop)", province:"Catanduanes", municipality:"Virac", lat:13.5789, lon:124.2119, coastal:true, file:"VIRAC%20SYNOP.pdf", crossVerified:true, notes:"Pacific-facing island province; high typhoon exposure."}),
  climateStation({name:"Zamboanga", province:"Zamboanga del Sur", municipality:"Zamboanga City", lat:6.9214, lon:122.0594, coastal:true, file:"ZAMBOANGA.pdf"})
];

// ---- Province list for the location-search dropdown (PSGC-based, incl. NCR) ----
const PROVINCES = [
  "Abra","Agusan del Norte","Agusan del Sur","Aklan","Albay","Antique","Apayao",
  "Aurora","Basilan","Bataan","Batanes","Batangas","Benguet","Biliran","Bohol",
  "Bukidnon","Bulacan","Cagayan","Camarines Norte","Camarines Sur","Camiguin",
  "Capiz","Catanduanes","Cavite","Cebu","Cotabato (North Cotabato)","Davao de Oro",
  "Davao del Norte","Davao del Sur","Davao Occidental","Davao Oriental",
  "Dinagat Islands","Eastern Samar","Guimaras","Ifugao","Ilocos Norte",
  "Ilocos Sur","Iloilo","Isabela","Kalinga","La Union","Laguna","Lanao del Norte",
  "Lanao del Sur","Leyte","Maguindanao del Norte","Maguindanao del Sur",
  "Marinduque","Masbate","Metro Manila (NCR)","Misamis Occidental",
  "Misamis Oriental","Mountain Province","Negros Occidental","Negros Oriental",
  "Northern Samar","Nueva Ecija","Nueva Vizcaya","Occidental Mindoro",
  "Oriental Mindoro","Palawan","Pampanga","Pangasinan","Quezon","Quirino",
  "Rizal","Romblon","Samar (Western Samar)","Sarangani","Siquijor",
  "Sorsogon","South Cotabato","Southern Leyte","Sultan Kudarat","Sulu",
  "Surigao del Norte","Surigao del Sur","Tarlac","Tawi-Tawi","Zambales",
  "Zamboanga del Norte","Zamboanga del Sur","Zamboanga Sibugay"
];

// ---- Provinces/areas where orographic / terrain effects are especially
//      likely to make a nearby station climatologically unrepresentative.
//      This is a coarse screening flag only — engineering judgment required. ----
const TERRAIN_SENSITIVE_PROVINCES = [
  "Abra","Apayao","Benguet","Ifugao","Kalinga","Mountain Province",              // Cordillera
  "Aurora","Quezon","Nueva Vizcaya","Isabela","Quirino",                          // Sierra Madre corridor
  "Albay","Camarines Norte","Camarines Sur","Catanduanes","Sorsogon","Masbate",   // Bicol
  "Eastern Samar","Northern Samar","Samar (Western Samar)","Leyte","Southern Leyte","Biliran", // Eastern Visayas
  "Bukidnon","Davao de Oro","Davao Oriental","Zamboanga del Norte","Misamis Oriental","Lanao del Sur" // Mindanao highlands
];

// ---- Database status metadata shown in the "Station Database" panel ----
const STATION_DB_META = {
  climateCount: STATIONS.filter(s => s.type === "Climate/Synoptic").length,
  argCount: STATIONS.filter(s => s.type === "ARG").length,
  awsCount: STATIONS.filter(s => s.type === "AWS").length,
  lastReviewed: "2026-08-12",
  crossVerifiedCount: STATIONS.filter(s => s.verificationLevel === "cross-verified").length,
  publishedVerifyCount: STATIONS.filter(s => s.verificationLevel === "published-verify").length,
  notes: "ARG/AWS network not yet independently verifiable at scale for this build — see data-sources.md."
};
