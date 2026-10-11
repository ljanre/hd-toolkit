
/* =====================================================================
   PAGASA Rainfall Station Locator — Application Logic
   Station data lives in stations.js (STATIONS, STATION_TYPES,
   PROVINCES, TERRAIN_SENSITIVE_PROVINCES, STATION_DB_META).
   This file implements: geocoding, the province->municipality
   cascading dropdown (fetched from a public PSGC dataset), distance
   ranking, filtering, the map (with numbered station markers), the
   detail panel, and export/print (the real map prints, not a mockup).
   No rainfall/IDF values are generated automatically anywhere below.
===================================================================== */

// ---------- state ----------
let projectLocation = null;     // {lat, lon, label, province}
let currentResults = [];        // last computed, filtered+ranked station list
let map, markerLayer, projectMarker;
let showLines = false;

// ---------- helpers ----------
function haversineKm(lat1, lon1, lat2, lon2){
  const R=6371;
  const dLat=(lat2-lat1)*Math.PI/180;
  const dLon=(lon2-lon1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
function fmt(n, d){ return (n===null||n===undefined||isNaN(n)) ? "Not available" : Number(n).toFixed(d===undefined?1:d); }
function el(id){ return document.getElementById(id); }

// ---------- populate province dropdown ----------
(function initProvinces(){
  const sel = el("province");
  const ph = document.createElement("option");
  ph.value=""; ph.textContent="Select a province...";
  sel.appendChild(ph);
  PROVINCES.forEach(p=>{
    const o=document.createElement("option");
    o.value=p; o.textContent=p;
    sel.appendChild(o);
  });
})();

// ---------- tabs ----------
document.querySelectorAll(".tab-btn").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    document.querySelectorAll(".tab-btn").forEach(b=>b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach(p=>p.classList.remove("active"));
    btn.classList.add("active");
    el(btn.dataset.tab).classList.add("active");
  });
});

// ---------- status / candidate helpers ----------
function setStatus(msg, type){ const e=el("status"); e.textContent=msg; e.className="status show "+(type||"info"); }
function clearStatus(){ el("status").className="status"; }
function clearCandidates(){ const e=el("candidates"); e.innerHTML=""; e.className="candidates"; }

/* =====================================================================
   MUNICIPALITY / CITY DROPDOWN — cascades from the selected province.
   Populated at runtime from a public PSGC-based dataset (province.json
   + city.json, isaacdarcilla/philippine-addresses via jsDelivr, a
   GitHub CDN mirror that serves CORS-enabled JSON). This is fetched
   live in the browser rather than shipped as a large embedded file.
   If the fetch fails (offline, dataset unreachable) the tool falls
   back to a manual text field so the location search still works.
===================================================================== */
const PSGC_PROVINCE_URL = "https://cdn.jsdelivr.net/gh/isaacdarcilla/philippine-addresses/province.json";
const PSGC_CITY_URL = "https://cdn.jsdelivr.net/gh/isaacdarcilla/philippine-addresses/city.json";

// Our PROVINCES list (stations.js) uses current names; the PSGC snapshot
// above is slightly older (pre-2022 Maguindanao split, "Compostela
// Valley" instead of "Davao de Oro", NCR split into 4 legacy districts
// instead of one "Metro Manila" entry). Everything else matches after
// normalization (case, spacing, and "del/de/of" removed). These are the
// only entries that need an explicit override.
const PROVINCE_CODE_OVERRIDES = {
  "Metro Manila (NCR)": ["1339", "1374", "1375", "1376"],
  "Davao de Oro": ["1182"],
  "Maguindanao del Norte": ["1538"],
  "Maguindanao del Sur": ["1538"]
};

function normalizeProvinceName(name){
  return name.toLowerCase().replace(/\b(del|de|of)\b/g, "").replace(/[^a-z]/g, "");
}

let psgcProvinces = null;       // [{province_code, province_name, ...}]
let psgcCitiesByCode = null;    // {province_code: [city_name, ...]}
let municipalityDataReady = false;

async function loadMunicipalityDataset(){
  try{
    const [provRes, cityRes] = await Promise.all([fetch(PSGC_PROVINCE_URL), fetch(PSGC_CITY_URL)]);
    if(!provRes.ok || !cityRes.ok) throw new Error("dataset fetch failed");
    const provinces = await provRes.json();
    const cities = await cityRes.json();
    psgcCitiesByCode = {};
    cities.forEach(c=>{
      const code = c.province_code;
      if(!psgcCitiesByCode[code]) psgcCitiesByCode[code] = [];
      psgcCitiesByCode[code].push(c.city_name);
    });
    Object.keys(psgcCitiesByCode).forEach(k => psgcCitiesByCode[k].sort());
    psgcProvinces = provinces;
    municipalityDataReady = true;
    if(el("province").value) populateMunicipalityDropdown(el("province").value);
  }catch(e){
    municipalityDataReady = false;
    console.warn("Municipality dataset unavailable, using manual entry fallback:", e);
    if(el("province").value) enableManualCityFallback("Municipality list could not be loaded — enter the municipality/city name manually.");
  }
}
loadMunicipalityDataset();

function codesForOurProvince(name){
  if(PROVINCE_CODE_OVERRIDES[name]) return PROVINCE_CODE_OVERRIDES[name];
  const norm = normalizeProvinceName(name);
  return psgcProvinces.filter(p => normalizeProvinceName(p.province_name) === norm).map(p => p.province_code);
}

function populateMunicipalityDropdown(provinceName){
  const sel = el("city");
  if(!provinceName){
    sel.innerHTML = '<option value="">Select a province first</option>';
    sel.disabled = true;
    sel.style.display = "";
    el("cityManualWrap").style.display = "none";
    return;
  }
  if(!municipalityDataReady){
    enableManualCityFallback("Municipality list could not be loaded — enter the municipality/city name manually.");
    return;
  }
  const codes = codesForOurProvince(provinceName);
  let names = [];
  codes.forEach(c => { if(psgcCitiesByCode[c]) names = names.concat(psgcCitiesByCode[c]); });
  names = [...new Set(names)].sort();

  if(names.length === 0){
    enableManualCityFallback("No listed municipalities/cities for this province in the current dataset — enter the name manually.");
    return;
  }

  sel.style.display = "";
  sel.disabled = false;
  sel.innerHTML = "";
  const ph = document.createElement("option");
  ph.value = ""; ph.textContent = "Select municipality/city...";
  sel.appendChild(ph);
  names.forEach(n=>{
    const o = document.createElement("option");
    o.value = n; o.textContent = n;
    sel.appendChild(o);
  });
  el("cityManualWrap").style.display = "none";
}

function enableManualCityFallback(message){
  const sel = el("city");
  sel.disabled = true;
  sel.style.display = "none";
  el("cityManualWrap").style.display = "block";
  if(message) setStatus(message, "info");
}

el("province").addEventListener("change", ()=>{
  el("cityManual").value = "";
  populateMunicipalityDropdown(el("province").value);
});
el("cityManualToggle").addEventListener("click", ()=>{
  const wrap = el("cityManualWrap");
  wrap.style.display = (wrap.style.display === "none") ? "block" : "none";
});

// ---------- geocoding (OpenStreetMap Nominatim) ----------
async function geocode(query, limit){
  const url = "https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit="+(limit||5)+"&countrycodes=ph&q="+encodeURIComponent(query);
  const resp = await fetch(url, { headers: { "Accept": "application/json" } });
  if(!resp.ok) throw new Error("Geocoding request failed ("+resp.status+")");
  return resp.json();
}
async function reverseGeocode(lat, lon){
  try{
    const url = "https://nominatim.openstreetmap.org/reverse?format=json&lat="+lat+"&lon="+lon+"&zoom=14&addressdetails=1";
    const resp = await fetch(url, { headers: { "Accept": "application/json" } });
    if(!resp.ok) return null;
    return resp.json();
  }catch(e){ return null; }
}
function provinceFromAddress(addr){
  if(!addr) return null;
  return addr.province || addr.state || addr.region || null;
}

// ---------- search location ----------
el("searchBtn").addEventListener("click", async ()=>{
  clearStatus(); clearCandidates();
  const province = el("province").value;
  const cityManual = el("cityManual").value.trim();
  const citySelect = el("city").disabled ? "" : el("city").value;
  const city = cityManual || citySelect;
  if(!province && !city){
    setStatus("Select a province and/or a municipality/city.", "error");
    return;
  }
  const queryParts = [city, province, "Philippines"].filter(Boolean);
  const query = queryParts.join(", ");
  setStatus("Looking up \""+query+"\"...", "info");
  try{
    const results = await geocode(query);
    if(!results || results.length===0){
      setStatus("No location found for \""+query+"\". Try a different spelling, or use Exact Coordinates.", "error");
      return;
    }
    if(results.length===1){
      clearStatus();
      applyGeocodeResult(results[0]);
    } else {
      setStatus("Multiple matches found — choose the correct one:", "info");
      const box=el("candidates");
      box.className="candidates show";
      results.forEach(r=>{
        const btn=document.createElement("button");
        btn.className="candidate-btn";
        btn.type="button";
        btn.textContent=r.display_name;
        btn.addEventListener("click", ()=>{ clearStatus(); clearCandidates(); applyGeocodeResult(r); });
        box.appendChild(btn);
      });
    }
  }catch(err){
    setStatus("Lookup failed: "+err.message+". Check your connection, or use Exact Coordinates.", "error");
  }
});

function applyGeocodeResult(r){
  const lat = parseFloat(r.lat), lon = parseFloat(r.lon);
  const province = provinceFromAddress(r.address);
  setProjectLocation(lat, lon, r.display_name, province);
}

// ---------- exact coordinates ----------
el("coordBtn").addEventListener("click", ()=>{
  clearStatus(); clearCandidates();
  const lat=parseFloat(el("latIn").value);
  const lon=parseFloat(el("lonIn").value);
  if(isNaN(lat) || isNaN(lon) || lat<4 || lat>21.5 || lon<115 || lon>128){
    setStatus("Enter valid Philippine coordinates (latitude approx. 4–21.5, longitude approx. 115–128).", "error");
    return;
  }
  setProjectLocation(lat, lon, "Custom coordinates ("+lat.toFixed(6)+", "+lon.toFixed(6)+")", null);
});

// ---------- current location ----------
el("geoBtn").addEventListener("click", ()=>{
  clearStatus(); clearCandidates();
  if(!navigator.geolocation){ setStatus("Geolocation is not supported by this browser.", "error"); return; }
  setStatus("Requesting your device location...", "info");
  navigator.geolocation.getCurrentPosition(
    async pos=>{
      const lat=pos.coords.latitude, lon=pos.coords.longitude;
      clearStatus();
      const rev = await reverseGeocode(lat, lon);
      const label = rev && rev.display_name ? rev.display_name : "Current device location";
      const province = rev ? provinceFromAddress(rev.address) : null;
      setProjectLocation(lat, lon, label, province);
    },
    err=>{ setStatus("Could not get location: "+err.message, "error"); }
  );
});

// ---------- set project location (single entry point) ----------
function setProjectLocation(lat, lon, label, province){
  projectLocation = { lat, lon, label, province };
  el("latIn").value = lat.toFixed(6);
  el("lonIn").value = lon.toFixed(6);
  ensureMap();
  placeProjectMarker(lat, lon);
  map.setView([lat, lon], map.getZoom() < 9 ? 11 : map.getZoom());
  updateResults();
}

// ---------- map setup ----------
function ensureMap(){
  if(map) return;
  map = L.map('map').setView([12.8797, 121.7740], 6); // Philippines default view
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
  L.control.scale({ metric: true, imperial: false, position: 'bottomleft' }).addTo(map);
  markerLayer = L.layerGroup().addTo(map);

  map.on('click', async (e)=>{
    const { lat, lng } = e.latlng;
    const rev = await reverseGeocode(lat, lng);
    const label = rev && rev.display_name ? rev.display_name : "Map-selected location";
    const province = rev ? provinceFromAddress(rev.address) : null;
    projectLocation = { lat, lon: lng, label, province };
    el("latIn").value = lat.toFixed(6);
    el("lonIn").value = lng.toFixed(6);
    placeProjectMarker(lat, lng);
    updateResults();
  });
}

function projectIcon(){
  return L.divIcon({
    className:'',
    html:'<div style="background:#c0392b;width:18px;height:18px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 0 3px rgba(0,0,0,.6);"></div>',
    iconSize:[18,18], iconAnchor:[9,18]
  });
}

function placeProjectMarker(lat, lon){
  ensureMap();
  if(projectMarker){
    projectMarker.setLatLng([lat, lon]);
  } else {
    projectMarker = L.marker([lat, lon], { icon: projectIcon(), draggable:true }).addTo(map);
    projectMarker.bindTooltip("Project Site", { permanent:true, direction:'top', offset:[0,-16], className:'project-label' });
    projectMarker.on('dragend', async ()=>{
      const p = projectMarker.getLatLng();
      const rev = await reverseGeocode(p.lat, p.lng);
      const label = rev && rev.display_name ? rev.display_name : "Map-selected location (dragged)";
      const province = rev ? provinceFromAddress(rev.address) : null;
      projectLocation = { lat:p.lat, lon:p.lng, label, province };
      el("latIn").value = p.lat.toFixed(6);
      el("lonIn").value = p.lng.toFixed(6);
      updateResults();
    });
  }
  projectMarker.bindPopup(
    "<strong>Project Site</strong><br>"+lat.toFixed(6)+", "+lon.toFixed(6)+
    (projectLocation && projectLocation.label ? "<br>"+projectLocation.label : "")
  );
}

// initialize an empty map immediately so it's visible before a search
ensureMap();

// redraw/refit the live map right before printing so tiles and markers
// are correctly positioned on the printed page
window.addEventListener('beforeprint', ()=>{
  if(!map) return;
  map.invalidateSize();
  if(projectLocation && currentResults.length){
    const bounds = [[projectLocation.lat, projectLocation.lon]];
    currentResults.forEach(s => bounds.push([s.lat, s.lon]));
    map.fitBounds(bounds, {padding:[20,20]});
  }
});

// ---------- filters trigger recompute ----------
["filterType","filterRadius","resultCount"].forEach(id=>{
  el(id).addEventListener("change", updateResults);
});
el("toggleLines").addEventListener("change", (e)=>{ showLines = e.target.checked; drawMapMarkers(); });

// ---------- compute + render results ----------
function updateResults(){
  if(!projectLocation) return;
  el("resultsSection").style.display = "block";

  const typeFilter = el("filterType").value;
  const radius = parseInt(el("filterRadius").value, 10);
  const countMode = el("resultCount").value;

  let list = STATIONS
    .filter(s => typeFilter==="ALL" || s.type===typeFilter)
    .map(s => ({ ...s, dist: haversineKm(projectLocation.lat, projectLocation.lon, s.lat, s.lon) }))
    .sort((a,b)=>a.dist-b.dist);

  if(radius > 0) list = list.filter(s => s.dist <= radius);

  if(countMode === "5") list = list.slice(0,5);
  else if(countMode === "10") list = list.slice(0,10);
  if(countMode === "ALL" && radius === 0) list = list.slice(0,55);

  const fullSorted = STATIONS
    .map(s => ({ ...s, dist: haversineKm(projectLocation.lat, projectLocation.lon, s.lat, s.lon) }))
    .sort((a,b)=>a.dist-b.dist);

  currentResults = list.map((s,i)=>({ ...s, rank: i+1 }));

  renderSummary(fullSorted);
  renderTable();
  drawMapMarkers();
}

function renderSummary(fullSorted){
  const nearestGauge = fullSorted.find(s => s.type==="ARG" || s.type==="AWS");
  const nearestClimate = fullSorted.find(s => s.type==="Climate/Synoptic");

  let designStatus, designStatusClass, designText;
  if(nearestClimate && nearestClimate.dist <= 75){
    designStatus = "Candidate Identified";
    designStatusClass = "status-ok";
    designText = nearestClimate.name + " (" + nearestClimate.dist.toFixed(1) + " km) — investigate first";
  } else {
    designStatus = "Engineering Review Required";
    designStatusClass = "status-review";
    designText = "No nearby long-term climate station within 75 km — wider search or specialist review needed";
  }

  const grid = el("summaryGrid");
  grid.innerHTML = "";
  grid.innerHTML += summaryCardHTML("Project Site", (projectLocation.province||"Location set"), projectLocation.lat.toFixed(5)+"° N, "+projectLocation.lon.toFixed(5)+"° E", "");
  grid.innerHTML += summaryCardHTML("Nearest Rain Gauge (ARG/AWS)", nearestGauge ? nearestGauge.name : "None in database", nearestGauge ? nearestGauge.dist.toFixed(1)+" km — straight-line" : "See Station Database panel", "");
  grid.innerHTML += summaryCardHTML("Nearest Long-Term Climate Station", nearestClimate ? nearestClimate.name : "None found", nearestClimate ? nearestClimate.dist.toFixed(1)+" km — straight-line" : "", "");
  grid.innerHTML += summaryCardHTML("Design Reference Status", designStatus, designText, designStatusClass);

  // terrain warning (screen banner + merged into the print closing disclaimer)
  const warnEl = el("terrainWarning");
  const projTerrain = projectLocation.province && TERRAIN_SENSITIVE_PROVINCES.some(p=>projectLocation.province.toLowerCase().includes(p.toLowerCase()) || p.toLowerCase().includes(projectLocation.province.toLowerCase()));
  const terrainText = "The closest station is not necessarily climatologically representative here. This project location is in or near a terrain-sensitive area (Cordillera, Sierra Madre corridor, Bicol, Eastern Visayas, or Mindanao highlands). Mountain ranges, elevation, prevailing weather systems, coastal exposure, and orographic rainfall can cause major rainfall differences over short distances. This does not disqualify nearby stations — flag them for engineering review.";
  if(projTerrain){
    el("terrainWarningText").textContent = terrainText;
    warnEl.classList.add("show");
    el("rpTerrainNote").innerHTML = "<strong>Terrain / Orographic Notice:</strong> " + terrainText;
    el("rpTerrainNote").style.display = "block";
  } else {
    warnEl.classList.remove("show");
    el("rpTerrainNote").innerHTML = "";
    el("rpTerrainNote").style.display = "none";
  }

  // update print-only summary lines
  el("rpLocation").textContent = projectLocation.label || projectLocation.province || "Custom location";
  el("rpCoords").textContent = projectLocation.lat.toFixed(6)+", "+projectLocation.lon.toFixed(6);
  el("rpNearestGauge").textContent = nearestGauge ? nearestGauge.name+" ("+nearestGauge.type+", "+nearestGauge.dist.toFixed(1)+" km)" : "None available in current database";
  el("rpNearestClimate").textContent = nearestClimate ? nearestClimate.name+" ("+nearestClimate.dist.toFixed(1)+" km)" : "None found";
  el("rpDesignRef").textContent = designText;
}

function summaryCardHTML(label, value, sub, extraClass){
  return '<div class="summary-card '+(extraClass||'')+'">'+
    '<div class="sc-label">'+label+'</div>'+
    '<div class="sc-value">'+value+'</div>'+
    '<div class="sc-sub">'+sub+'</div></div>';
}

function renderTable(){
  const tbody = el("resultsBody");
  tbody.innerHTML = "";
  if(currentResults.length===0){
    tbody.innerHTML = '<tr><td colspan="9" style="color:var(--muted);">No stations match the current filters. Try increasing the distance radius or changing the station type filter.</td></tr>';
  }
  currentResults.forEach(s=>{
    const tr = document.createElement("tr");
    tr.innerHTML =
      '<td><span class="rank-badge">'+s.rank+'</span></td>'+
      '<td>'+s.name+'</td>'+
      '<td><span class="type-pill" style="background:'+STATION_TYPES[s.type].color+';">'+STATION_TYPES[s.type].shortLabel+'</span></td>'+
      '<td>'+s.dist.toFixed(1)+' km</td>'+
      '<td>'+s.province+'</td>'+
      '<td>'+s.municipality+'</td>'+
      '<td>'+s.lat.toFixed(4)+'</td>'+
      '<td>'+s.lon.toFixed(4)+'</td>'+
      '<td>'+fmt(s.elevation,1)+'</td>';
    tr.addEventListener("click", ()=>openDetail(s));
    tbody.appendChild(tr);
  });
}

// ---------- map markers (numbered to match table rank) ----------
function stationIcon(type, rank){
  const color = STATION_TYPES[type] ? STATION_TYPES[type].color : "#333";
  return L.divIcon({
    className:'',
    html:'<div style="background:'+color+';color:#fff;width:22px;height:22px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 3px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;">'+rank+'</div>',
    iconSize:[22,22], iconAnchor:[11,11]
  });
}

function drawMapMarkers(){
  if(!map) return;
  markerLayer.clearLayers();
  if(projectMarker) markerLayer.addLayer(projectMarker);

  if(!projectLocation || currentResults.length===0) return;

  const bounds = [[projectLocation.lat, projectLocation.lon]];
  const showPermanentLabels = currentResults.length <= 15; // avoid clutter with large result sets
  currentResults.forEach((s, i)=>{
    const m = L.marker([s.lat, s.lon], { icon: stationIcon(s.type, s.rank) })
      .bindPopup('<strong>#'+s.rank+' '+s.name+'</strong><br>'+STATION_TYPES[s.type].label+'<br>'+s.province+'<br>'+s.dist.toFixed(1)+' km away');
    if(showPermanentLabels){
      m.bindTooltip('#'+s.rank+' '+s.name, { permanent:true, direction:'right', offset:[12,0], className:'station-label' });
    }
    m.on('click', ()=>openDetail(s));
    markerLayer.addLayer(m);
    bounds.push([s.lat, s.lon]);

    if(i===0){
      L.polyline([[projectLocation.lat, projectLocation.lon],[s.lat, s.lon]], {color:'#c0392b', weight:2, dashArray:'5,6'}).addTo(markerLayer);
    } else if(showLines && i < 5){
      L.polyline([[projectLocation.lat, projectLocation.lon],[s.lat, s.lon]], {color:'#7d93a3', weight:1.5, dashArray:'3,5'}).addTo(markerLayer);
    }
  });

  setTimeout(()=>{ map.invalidateSize(); if(bounds.length>1) map.fitBounds(bounds, {padding:[30,30]}); }, 30);
}

// ---------- station detail panel ----------
function openDetail(s){
  el("dpName").textContent = (s.rank ? "#"+s.rank+" " : "") + s.name;
  const pill = el("dpTypePill");
  pill.textContent = STATION_TYPES[s.type].label;
  pill.style.background = STATION_TYPES[s.type].color;

  const rows = [
    ["Site ID", s.siteId || "Not available"],
    ["Province", s.province],
    ["Municipality", s.municipality],
    ["Coordinates", s.lat.toFixed(6)+", "+s.lon.toFixed(6)],
    ["Elevation", s.elevation!==null ? s.elevation+" m" : "Not available"],
    ["Distance from project", s.dist!==undefined ? s.dist.toFixed(1)+" km (straight-line)" : "Not available"],
    ["Record period", s.recordPeriod],
    ["Verification level", s.verificationLevel==="cross-verified" ? "Cross-verified against 2+ sources" : "Published — recommend independent verification"],
    ["Last database check", s.verifiedDate],
    ["Source", s.source]
  ];
  el("dpRows").innerHTML = rows.map(r=>'<div class="dp-row"><span class="dp-k">'+r[0]+'</span><span class="dp-v">'+r[1]+'</span></div>').join('');

  const srcBtn = el("dpSourceBtn");
  srcBtn.style.display = s.sourceUrl ? "block" : "none";
  srcBtn.onclick = ()=>{ if(s.sourceUrl) window.open(s.sourceUrl, "_blank", "noopener"); };

  const normBtn = el("dpNormalsBtn");
  normBtn.style.display = s.normalsUrl ? "block" : "none";
  normBtn.onclick = ()=>{ if(s.normalsUrl) window.open(s.normalsUrl, "_blank", "noopener"); };

  el("detailOverlay").classList.add("show");
  el("detailPanel").classList.add("show");
}
el("detailClose").addEventListener("click", closeDetail);
el("detailOverlay").addEventListener("click", closeDetail);
function closeDetail(){ el("detailOverlay").classList.remove("show"); el("detailPanel").classList.remove("show"); }

// ---------- data quality panel ----------
(function renderDQ(){
  el("dqClimate").textContent = STATION_DB_META.climateCount;
  el("dqArg").textContent = STATION_DB_META.argCount;
  el("dqAws").textContent = STATION_DB_META.awsCount;
  el("dqReviewed").textContent = STATION_DB_META.lastReviewed;
  el("dqCross").textContent = STATION_DB_META.crossVerifiedCount;
  el("dqPub").textContent = STATION_DB_META.publishedVerifyCount;
})();

// ---------- export: copy results ----------
el("copyBtn").addEventListener("click", ()=>{
  if(!projectLocation || currentResults.length===0){ alert("Run a location search first."); return; }
  let text = "PAGASA Rainfall Station Screening\n";
  text += "Project Location: "+(projectLocation.label||projectLocation.province||"")+"\n";
  text += "Coordinates: "+projectLocation.lat.toFixed(6)+", "+projectLocation.lon.toFixed(6)+"\n\n";
  currentResults.forEach(s=>{
    text += s.rank+". "+s.name+" ["+s.type+"] — "+s.dist.toFixed(1)+" km — "+s.province+", "+s.municipality+"\n";
  });
  text += "\nNearest rainfall gauge is not automatically the correct design-rainfall station. Engineering verification required.\nNot an official PAGASA or DPWH application.";
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(()=>setStatus("Results copied to clipboard.","good"))
      .catch(()=>alert(text));
  } else {
    alert(text);
  }
});

// ---------- export: CSV ----------
el("csvBtn").addEventListener("click", ()=>{
  if(!projectLocation || currentResults.length===0){ alert("Run a location search first."); return; }
  const headers = ["Project Location","Project Latitude","Project Longitude","Station Rank","Station Name","Station Type","Distance km","Province","Municipality","Station Latitude","Station Longitude","Elevation","Source"];
  const rows = [headers];
  currentResults.forEach(s=>{
    rows.push([
      projectLocation.label||projectLocation.province||"",
      projectLocation.lat.toFixed(6), projectLocation.lon.toFixed(6),
      s.rank, s.name, s.type, s.dist.toFixed(2), s.province, s.municipality,
      s.lat.toFixed(6), s.lon.toFixed(6),
      s.elevation!==null?s.elevation:"Not available",
      s.source
    ]);
  });
  const csv = rows.map(r => r.map(v => '"'+String(v).replace(/"/g,'""')+'"').join(",")).join("\r\n");
  const blob = new Blob([csv], {type:"text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "pagasa_station_screening.csv";
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

// ---------- export: print (prints the real map + real results table) ----------
el("printBtn").addEventListener("click", ()=>{
  if(!projectLocation || currentResults.length===0){ alert("Run a location search first."); return; }
  el("rpGenerated").textContent = new Date().toLocaleString('en-PH', { dateStyle:'medium', timeStyle:'short' });
  window.print();
});
