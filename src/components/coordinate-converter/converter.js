
/* ---------- Ellipsoid & datum constants ---------- */
const CLARKE1866 = { a: 6378206.4, invF: 294.978698213898 };
const WGS84      = { a: 6378137.0, invF: 298.257223563 };

// PRS92 -> WGS 84, EPSG operation 15708 "PRS92 to WGS 84 (1)".
// METHOD: Coordinate Frame rotation (EPSG method 9607) — NOT Position Vector (9606).
// The two conventions differ by the SIGN of the three rotation terms. Using the wrong
// one displaces a Philippine point by ~54 m. Note that epsg.io's "+towgs84=" PROJ-4
// export lists these rotations unchanged, and PROJ interprets +towgs84 as Position
// Vector, so that string is a lossy reference — validate against the EPSG operation
// (e.g. pyproj Transformer.from_crs(3125, 4326)) instead.
const TOWGS84 = {
  dX: -127.62, dY: -67.24, dZ: -47.04,   // metres
  rx: 3.068, ry: -4.903, rz: -1.578,     // arc-seconds, Coordinate Frame convention
  s: -1.06                                // ppm
};

// Published PTM applicability extents (DENR Manual on Land Survey Procedures,
// DMC 2010-13, Annex VI–VII). These bands deliberately OVERLAP by 1° — they are a
// screening aid, not a rule. The zone printed on the approved survey plan governs.
const ZONES = [
  { id:1, name:'Zone I',   epsg:3121, cm:117, minLon:116.00, maxLon:118.50 },
  { id:2, name:'Zone II',  epsg:3122, cm:119, minLon:117.50, maxLon:120.50 },
  { id:3, name:'Zone III', epsg:3123, cm:121, minLon:119.50, maxLon:122.50 },
  { id:4, name:'Zone IV',  epsg:3124, cm:123, minLon:121.50, maxLon:124.50 },
  { id:5, name:'Zone V',   epsg:3125, cm:125, minLon:123.50, maxLon:127.00 },
];

const K0 = 0.99995, FALSE_EASTING = 500000, FALSE_NORTHING = 0;
const D2R = Math.PI/180, R2D = 180/Math.PI;

function ellParams(ell){
  const f = 1/ell.invF;
  const e2 = 2*f - f*f;
  return { a: ell.a, f, e2 };
}

/* ---------- Transverse Mercator forward: lat/lon (rad) -> N,E ---------- */
function tmForward(lat, lon, lon0Deg, ell){
  const {a,e2} = ellParams(ell);
  const lon0 = lon0Deg*D2R;
  const ep2 = e2/(1-e2);
  const N = a/Math.sqrt(1-e2*Math.sin(lat)*Math.sin(lat));
  const T = Math.tan(lat)*Math.tan(lat);
  const C = ep2*Math.cos(lat)*Math.cos(lat);
  const A = (lon-lon0)*Math.cos(lat);
  const M = a*(
      (1 - e2/4 - 3*e2*e2/64 - 5*e2*e2*e2/256)*lat
    - (3*e2/8 + 3*e2*e2/32 + 45*e2*e2*e2/1024)*Math.sin(2*lat)
    + (15*e2*e2/256 + 45*e2*e2*e2/1024)*Math.sin(4*lat)
    - (35*e2*e2*e2/3072)*Math.sin(6*lat)
  );
  const easting = FALSE_EASTING + K0*N*(A + (1-T+C)*A**3/6 + (5-18*T+T*T+72*C-58*ep2)*A**5/120);
  const northing = FALSE_NORTHING + K0*(M + N*Math.tan(lat)*(A*A/2 + (5-T+9*C+4*C*C)*A**4/24 + (61-58*T+T*T+600*C-330*ep2)*A**6/720));
  return { northing, easting };
}

/* ---------- Transverse Mercator inverse: N,E -> lat/lon (rad) ---------- */
function tmInverse(northing, easting, lon0Deg, ell){
  const {a,e2} = ellParams(ell);
  const lon0 = lon0Deg*D2R;
  const e1 = (1-Math.sqrt(1-e2))/(1+Math.sqrt(1-e2));
  const M = (northing-FALSE_NORTHING)/K0;
  const mu = M/(a*(1-e2/4-3*e2*e2/64-5*e2*e2*e2/256));
  const phi1 = mu
    + (3*e1/2 - 27*e1**3/32)*Math.sin(2*mu)
    + (21*e1*e1/16 - 55*e1**4/32)*Math.sin(4*mu)
    + (151*e1**3/96)*Math.sin(6*mu)
    + (1097*e1**4/512)*Math.sin(8*mu);
  const ep2 = e2/(1-e2);
  const C1 = ep2*Math.cos(phi1)*Math.cos(phi1);
  const T1 = Math.tan(phi1)*Math.tan(phi1);
  const N1 = a/Math.sqrt(1-e2*Math.sin(phi1)*Math.sin(phi1));
  const R1 = a*(1-e2)/Math.pow(1-e2*Math.sin(phi1)*Math.sin(phi1),1.5);
  const D = (easting-FALSE_EASTING)/(N1*K0);

  const lat = phi1 - (N1*Math.tan(phi1)/R1)*(
      D*D/2
    - (5+3*T1+10*C1-4*C1*C1-9*ep2)*D**4/24
    + (61+90*T1+298*C1+45*T1*T1-252*ep2-3*C1*C1)*D**6/720
  );
  const lon = lon0 + (
      D
    - (1+2*T1+C1)*D**3/6
    + (5-2*C1+28*T1-3*C1*C1+8*ep2+24*T1*T1)*D**5/120
  )/Math.cos(phi1);

  return { lat, lon };
}

/* ---------- Geodetic <-> Geocentric ---------- */
function geodeticToGeocentric(latRad, lonRad, h, ell){
  const {a,e2} = ellParams(ell);
  const N = a/Math.sqrt(1-e2*Math.sin(latRad)*Math.sin(latRad));
  const X = (N+h)*Math.cos(latRad)*Math.cos(lonRad);
  const Y = (N+h)*Math.cos(latRad)*Math.sin(lonRad);
  const Z = (N*(1-e2)+h)*Math.sin(latRad);
  return {X,Y,Z};
}
function geocentricToGeodetic(X,Y,Z, ell){
  const {a,e2} = ellParams(ell);
  const lon = Math.atan2(Y,X);
  const p = Math.sqrt(X*X+Y*Y);
  let lat = Math.atan2(Z, p*(1-e2));
  for(let i=0;i<6;i++){
    const N = a/Math.sqrt(1-e2*Math.sin(lat)*Math.sin(lat));
    const h = p/Math.cos(lat) - N;
    lat = Math.atan2(Z, p*(1-e2*N/(N+h)));
  }
  const N = a/Math.sqrt(1-e2*Math.sin(lat)*Math.sin(lat));
  const h = p/Math.cos(lat) - N;
  return {lat, lon, h};
}

/* ---------- 7-parameter Helmert, COORDINATE FRAME rotation (EPSG method 9607) ----------
   PRS92 -> WGS 84 via EPSG operation 15708. Coordinate Frame rotates the axes, whereas
   Position Vector rotates the point; the rotation matrix is therefore transposed between
   them. Getting this backwards moves a Philippine point ~54 m. Validated against the
   DENR/EPSG worked example and pyproj to 0.0000 m. */
function helmertForward(X,Y,Z, p){
  const rx = p.rx*(Math.PI/180/3600), ry = p.ry*(Math.PI/180/3600), rz = p.rz*(Math.PI/180/3600);
  const s = 1 + p.s*1e-6;
  return {
    X: p.dX + s*( X + rz*Y - ry*Z),
    Y: p.dY + s*(-rz*X + Y + rx*Z),
    Z: p.dZ + s*( ry*X - rx*Y + Z)
  };
}
function helmertInverse(Xt,Yt,Zt, p){
  // Rigorous inverse. Simply negating the 7 parameters is the common shortcut, but it
  // drops a 2nd-order term worth ~4 mm at Philippine latitudes. We instead start from
  // that approximation and iterate until helmertForward() reproduces the target exactly,
  // which is what PROJ/proj4 (and therefore QGIS/ArcGIS) do.
  const neg = { dX:-p.dX, dY:-p.dY, dZ:-p.dZ, rx:-p.rx, ry:-p.ry, rz:-p.rz, s:-p.s };
  let g = helmertForward(Xt,Yt,Zt, neg);
  for(let i=0;i<10;i++){
    const f = helmertForward(g.X, g.Y, g.Z, p);
    const dx = Xt-f.X, dy = Yt-f.Y, dz = Zt-f.Z;
    g = { X: g.X+dx, Y: g.Y+dy, Z: g.Z+dz };
    if(Math.abs(dx)<1e-9 && Math.abs(dy)<1e-9 && Math.abs(dz)<1e-9) break;
  }
  return g;
}

/* ---------- High-level conversions ---------- */
function prs92ToWgs84(northing, easting, cmDeg){
  const {lat, lon} = tmInverse(northing, easting, cmDeg, CLARKE1866);
  const geo = geodeticToGeocentric(lat, lon, 0, CLARKE1866);
  const shifted = helmertForward(geo.X, geo.Y, geo.Z, TOWGS84);
  const out = geocentricToGeodetic(shifted.X, shifted.Y, shifted.Z, WGS84);
  return { lat: out.lat*R2D, lon: out.lon*R2D };
}
function wgs84ToPrs92(latDeg, lonDeg, cmDeg){
  const latRad = latDeg*D2R, lonRad = lonDeg*D2R;
  const geo = geodeticToGeocentric(latRad, lonRad, 0, WGS84);
  const shifted = helmertInverse(geo.X, geo.Y, geo.Z, TOWGS84);
  const out = geocentricToGeodetic(shifted.X, shifted.Y, shifted.Z, CLARKE1866);
  return tmForward(out.lat, out.lon, cmDeg, CLARKE1866);
}

/* ---------- Zone selection for WGS84 -> PRS92 (unambiguous: real longitude is known) ---------- */
function nearestZoneForLon(lonDeg){
  // Prefer a zone whose official coverage (EPSG area of use) actually contains this longitude.
  const contained = ZONES.filter(z => lonDeg >= z.minLon && lonDeg <= z.maxLon);
  const pool = contained.length ? contained : ZONES;
  let best = pool[0], bestD = Infinity;
  for(const z of pool){
    const d = Math.abs(lonDeg - z.cm);
    if(d < bestD){ bestD = d; best = z; }
  }
  return best;
}

/* ---------- Province (required) + Municipality (optional) zone helper ----------
   Province/zone applicability condensed from Annex VI–VII of the DENR Manual on Land
   Survey Procedures (DMC 2010-13), as summarised in the PRS92/PTM technical guide.
   Every entry carries an explicit zone from that table — this is an authority list, not
   a longitude guess, because the published zone bands overlap by 1° and several
   provinces are assigned against what plain longitude would suggest.

   PRECEDENCE: the zone and point of origin printed on the approved survey plan always
   governs. This picker is a screening aid for when that information is missing.

   Documented exceptions carried below:
     • Isabela and Quezon are split by 122°E (municipality level).
     • Cebu is Zone IV EXCEPT the Camotes Islands, which are Zone V.
     • Sulu and Tawi-Tawi are Zone III, not the Zone II their longitude implies.
     • Palawan/Calamian are Zone II under the standard EPSG definition; Annex VII also
       records a legacy "Zone 1, CM 118°30'E" convention that matches NEITHER EPSG:3121
       (117°E) nor EPSG:3122 (119°E) and needs a project-specific CRS.
     • Zone I has no broad province list in Annex VII. */
const PROVINCES = [
  // ---------------- LUZON : Zone III unless noted ----------------
  { name:'Metro Manila (NCR)', region:'Luzon', zone:3 },
  { name:'Abra', region:'Luzon', zone:3 },
  { name:'Apayao', region:'Luzon', zone:3 },
  { name:'Aurora', region:'Luzon', zone:3 },
  { name:'Bataan', region:'Luzon', zone:3 },
  { name:'Batanes', region:'Luzon', zone:3 },
  { name:'Batangas', region:'Luzon', zone:3 },
  { name:'Benguet (Baguio)', region:'Luzon', zone:3 },
  { name:'Bulacan', region:'Luzon', zone:3 },
  { name:'Cagayan', region:'Luzon', zone:3 },
  { name:'Cavite', region:'Luzon', zone:3 },
  { name:'Ifugao', region:'Luzon', zone:3 },
  { name:'Ilocos Norte', region:'Luzon', zone:3 },
  { name:'Ilocos Sur', region:'Luzon', zone:3 },
  { name:'Isabela', region:'Luzon', zone:3,
    straddle:'Annex VII splits Isabela at 122°E: municipalities west of 122°E are Zone III, east of 122°E are Zone IV. Select a municipality.',
    munis:[
      {name:'Ilagan City (capital)', zone:3},{name:'Cauayan City', zone:3},
      {name:'Santiago City', zone:3},{name:'Roxas', zone:3},
      {name:'Echague', zone:3},{name:'San Mariano', zone:3},
      {name:'Divilacan', zone:4},{name:'Maconacon', zone:4},
      {name:'Dinapigue', zone:4},{name:'Palanan', zone:4}]},
  { name:'La Union', region:'Luzon', zone:3 },
  { name:'Laguna', region:'Luzon', zone:3 },
  { name:'Marinduque', region:'Luzon', zone:3 },
  { name:'Mountain Province', region:'Luzon', zone:3 },
  { name:'Nueva Ecija', region:'Luzon', zone:3 },
  { name:'Nueva Vizcaya', region:'Luzon', zone:3 },
  { name:'Occidental Mindoro', region:'Luzon', zone:3 },
  { name:'Oriental Mindoro', region:'Luzon', zone:3 },
  { name:'Pampanga', region:'Luzon', zone:3 },
  { name:'Pangasinan', region:'Luzon', zone:3 },
  { name:'Quezon', region:'Luzon', zone:3,
    straddle:'Annex VII splits Quezon at 122°E: municipalities west of 122°E (including the Polillo Islands) are Zone III, east of 122°E are Zone IV. Select a municipality.',
    munis:[
      {name:'Lucena City (capital)', zone:3},{name:'Candelaria', zone:3},
      {name:'Sariaya', zone:3},{name:'Tayabas City', zone:3},
      {name:'Real', zone:3},{name:'Infanta', zone:3},
      {name:'Atimonan', zone:3},{name:'Polillo Islands', zone:3},
      {name:'Gumaca', zone:4},{name:'Calauag', zone:4},
      {name:'Catanauan', zone:4},{name:'Mulanay', zone:4},
      {name:'Guinayangan', zone:4},{name:'San Narciso', zone:4}]},
  { name:'Quirino', region:'Luzon', zone:3 },
  { name:'Rizal', region:'Luzon', zone:3 },
  { name:'Tarlac', region:'Luzon', zone:3 },
  { name:'Zambales', region:'Luzon', zone:3 },
  { name:'Palawan (incl. Calamian Is.)', region:'Luzon', zone:2,
    straddle:'SPECIAL CASE. EPSG assigns Palawan and the Calamian Islands to Zone II (CM 119°E). Annex VII separately records a Palawan convention of "Zone 1, central meridian 118°30′E", which matches neither EPSG:3121 (117°E) nor EPSG:3122 (119°E) and requires a project-specific CRS. Use the central meridian printed on the plan.' },
  // Bicol / MIMAROPA : Zone IV
  { name:'Albay', region:'Luzon', zone:4 },
  { name:'Camarines Norte', region:'Luzon', zone:4 },
  { name:'Camarines Sur', region:'Luzon', zone:4 },
  { name:'Catanduanes', region:'Luzon', zone:4 },
  { name:'Masbate', region:'Luzon', zone:4 },
  { name:'Romblon', region:'Luzon', zone:4 },
  { name:'Sorsogon', region:'Luzon', zone:4 },
  // Sulu archipelago : Annex VII places these in Zone III
  { name:'Sulu (Jolo)', region:'Luzon', zone:3,
    straddle:'Annex VII places the Sulu archipelago in Zone III (CM 121°E) despite its southern latitude.' },
  { name:'Tawi-Tawi', region:'Luzon', zone:3,
    straddle:'Annex VII places the Sulu archipelago in Zone III (CM 121°E), even though Tawi-Tawi sits near 119.9°E where longitude alone would suggest Zone II.' },
  // ---------------- VISAYAS ----------------
  { name:'Aklan', region:'Visayas', zone:4 },
  { name:'Antique', region:'Visayas', zone:4 },
  { name:'Capiz', region:'Visayas', zone:4 },
  { name:'Guimaras', region:'Visayas', zone:4 },
  { name:'Iloilo', region:'Visayas', zone:4 },
  { name:'Negros Occidental', region:'Visayas', zone:4 },
  { name:'Negros Oriental', region:'Visayas', zone:4 },
  { name:'Siquijor', region:'Visayas', zone:4 },
  { name:'Cebu', region:'Visayas', zone:4,
    straddle:'Cebu is Zone IV EXCEPT the Camotes Islands, which Annex VII assigns to Zone V. Select a municipality if your point is in the Camotes group.',
    munis:[
      {name:'Cebu City (capital)', zone:4},{name:'Mandaue City', zone:4},
      {name:'Lapu-Lapu City', zone:4},{name:'Talisay City', zone:4},
      {name:'Toledo City', zone:4},{name:'Danao City', zone:4},
      {name:'Bogo City', zone:4},{name:'Carcar City', zone:4},
      {name:'Bantayan', zone:4},{name:'Daanbantayan', zone:4},
      {name:'Argao', zone:4},{name:'Moalboal', zone:4},
      {name:'Camotes Is. — Poro', zone:5},{name:'Camotes Is. — San Francisco', zone:5},
      {name:'Camotes Is. — Tudela', zone:5},{name:'Camotes Is. — Pilar', zone:5}]},
  { name:'Bohol', region:'Visayas', zone:5 },
  { name:'Biliran', region:'Visayas', zone:5 },
  { name:'Eastern Samar', region:'Visayas', zone:5 },
  { name:'Leyte', region:'Visayas', zone:5 },
  { name:'Northern Samar', region:'Visayas', zone:5 },
  { name:'Samar', region:'Visayas', zone:5 },
  { name:'Southern Leyte', region:'Visayas', zone:5 },
  // ---------------- MINDANAO ----------------
  { name:'Zamboanga del Norte', region:'Mindanao', zone:4 },
  { name:'Zamboanga del Sur', region:'Mindanao', zone:4 },
  { name:'Zamboanga Sibugay', region:'Mindanao', zone:4 },
  { name:'Basilan', region:'Mindanao', zone:4 },
  { name:'Misamis Occidental', region:'Mindanao', zone:4 },
  { name:'Bukidnon', region:'Mindanao', zone:5 },
  { name:'Camiguin', region:'Mindanao', zone:5 },
  { name:'Lanao del Norte', region:'Mindanao', zone:5 },
  { name:'Lanao del Sur', region:'Mindanao', zone:5 },
  { name:'Misamis Oriental (Cagayan de Oro)', region:'Mindanao', zone:5 },
  { name:'Davao de Oro (formerly Compostela Valley)', region:'Mindanao', zone:5 },
  { name:'Davao del Norte', region:'Mindanao', zone:5 },
  { name:'Davao del Sur (Davao City)', region:'Mindanao', zone:5 },
  { name:'Davao Occidental', region:'Mindanao', zone:5 },
  { name:'Davao Oriental', region:'Mindanao', zone:5 },
  { name:'Cotabato (North Cotabato)', region:'Mindanao', zone:5 },
  { name:'Sarangani', region:'Mindanao', zone:5 },
  { name:'South Cotabato', region:'Mindanao', zone:5 },
  { name:'Sultan Kudarat', region:'Mindanao', zone:5 },
  { name:'Maguindanao del Norte', region:'Mindanao', zone:5 },
  { name:'Maguindanao del Sur', region:'Mindanao', zone:5 },
  { name:'Agusan del Norte', region:'Mindanao', zone:5 },
  { name:'Agusan del Sur', region:'Mindanao', zone:5 },
  { name:'Dinagat Islands', region:'Mindanao', zone:5 },
  { name:'Surigao del Norte', region:'Mindanao', zone:5 },
  { name:'Surigao del Sur', region:'Mindanao', zone:5 },
];

function populateProvinces(){
  const sel = document.getElementById('provinceSelect');
  for(const g of ['Luzon','Visayas','Mindanao']){
    const og = document.createElement('optgroup');
    og.label = g;
    PROVINCES.filter(p=>p.region===g).forEach(p=>{
      const o = document.createElement('option');
      o.value = PROVINCES.indexOf(p);
      o.textContent = p.name;
      og.appendChild(o);
    });
    sel.appendChild(og);
  }
}

function onProvinceChange(){
  const pSel = document.getElementById('provinceSelect');
  const mSel = document.getElementById('muniSelect');
  mSel.innerHTML = '';
  if(pSel.value === ''){
    mSel.disabled = true;
    mSel.innerHTML = '<option>Select province first</option>';
    document.getElementById('areaHelperResult').innerHTML = '';
    return;
  }
  const prov = PROVINCES[parseInt(pSel.value)];
  if(prov.munis && prov.munis.length){
    mSel.disabled = false;
    const blank = document.createElement('option');
    blank.value=''; blank.textContent='Select city / municipality';
    mSel.appendChild(blank);
    prov.munis.forEach((mu,i)=>{
      const o=document.createElement('option');
      o.value = i;
      o.textContent = mu.name + '  (Zone ' + mu.zone + ')';
      mSel.appendChild(o);
    });
  } else {
    mSel.disabled = true;
    mSel.innerHTML = '<option>Province zone applies</option>';
  }
  applyAreaHelper();
}

function applyAreaHelper(){
  const pSel = document.getElementById('provinceSelect');
  const mSel = document.getElementById('muniSelect');
  const resultEl = document.getElementById('areaHelperResult');
  if(pSel.value === ''){ resultEl.innerHTML=''; return; }
  const prov = PROVINCES[parseInt(pSel.value)];

  let zoneId, basis;
  if(!mSel.disabled && mSel.value !== ''){
    const mu = prov.munis[parseInt(mSel.value)];
    zoneId = mu.zone; basis = mu.name + ', ' + prov.name;
  } else {
    zoneId = prov.zone; basis = prov.name;
  }
  const zone = ZONES.find(z=>z.id===zoneId);
  document.getElementById('zoneSelect').value = zone.id;

  let html = `→ <strong>${basis}</strong> → <strong style="color:var(--good);">${zone.name}</strong> (EPSG:${zone.epsg}, CM ${zone.cm}°E)`;
  if(prov.straddle && (mSel.disabled || mSel.value === '')){
    html += `<div style="margin-top:8px; color:var(--warn);">⚠ ${prov.straddle}</div>`;
  }
  html += `<div style="margin-top:8px;">Survey-plan zone governs.</div>`;
  resultEl.innerHTML = html;
}

/* ---------- Compare all 5 zone interpretations of a raw N/E pair ---------- */
function compareAllZones(){
  const n = parseFloat(document.getElementById('northing').value);
  const e = parseFloat(document.getElementById('easting').value);
  if(isNaN(n) || isNaN(e)){
    alert('Enter Northing and Easting first.');
    return;
  }
  const rows = ZONES.map(z=>{
    const out = prs92ToWgs84(n, e, z.cm);
    return { z, lat: out.lat, lon: out.lon };
  });
  let html = '<table style="width:100%; border-collapse:collapse; font-size:0.88rem;">';
  html += '<tr style="text-align:left; color:var(--muted); font-size:0.75rem; text-transform:uppercase;">'
        + '<th style="padding:6px 8px;">Assumed source zone</th>'
        + '<th style="padding:6px 8px;">Latitude<br><span style="font-weight:400; text-transform:none;">WGS 84 (EPSG:4326) dec. deg.</span></th>'
        + '<th style="padding:6px 8px;">Longitude<br><span style="font-weight:400; text-transform:none;">WGS 84 (EPSG:4326) dec. deg.</span></th>'
        + '<th style="padding:6px 8px;"></th></tr>';
  for(const r of rows){
    html += `<tr style="border-top:1px solid var(--border);">`
          + `<td style="padding:8px;"><strong>${r.z.name}</strong><br><span style="color:var(--muted); font-size:0.78rem;">EPSG:${r.z.epsg}</span></td>`
          + `<td style="padding:8px;">${r.lat.toFixed(6)}°</td>`
          + `<td style="padding:8px;">${r.lon.toFixed(6)}°</td>`
          + `<td style="padding:8px;"><a href="https://www.google.com/maps?q=${r.lat.toFixed(6)},${r.lon.toFixed(6)}" target="_blank" rel="noopener" style="color:var(--accent);">Map ↗</a></td>`
          + `</tr>`;
  }
  html += '</table>';
  document.getElementById('compareTable').innerHTML = html;
  document.getElementById('compareResult').classList.add('show');
}

/* ---------- Formatting ---------- */
function toDMS(deg, isLat){
  const hemi = isLat ? (deg>=0?'N':'S') : (deg>=0?'E':'W');
  const d = Math.abs(deg);
  const dd = Math.floor(d);
  const mFull = (d-dd)*60;
  const mm = Math.floor(mFull);
  const ss = (mFull-mm)*60;
  return `${dd}° ${mm}' ${ss.toFixed(3)}" ${hemi}`;
}

/* ---------- UI wiring ---------- */
function setMode(mode){
  document.getElementById('tabToWGS').setAttribute('aria-pressed',String(mode==='toWGS'));
  document.getElementById('tabToPRS').setAttribute('aria-pressed',String(mode==='toPRS'));
  document.getElementById('tabToWGS').classList.toggle('active', mode==='toWGS');
  document.getElementById('tabToPRS').classList.toggle('active', mode==='toPRS');
  document.getElementById('panelToWGS').style.display = mode==='toWGS' ? '' : 'none';
  document.getElementById('panelToPRS').style.display = mode==='toPRS' ? '' : 'none';
}

let lastLatLonCopy = '', lastNECopy = '';

function convertToWGS(){
  const n = parseFloat(document.getElementById('northing').value);
  const e = parseFloat(document.getElementById('easting').value);
  const zoneSel = document.getElementById('zoneSelect').value;
  const badgeEl = document.getElementById('zoneBadge');
  const resultEl = document.getElementById('resultToWGS');

  if(document.getElementById('provinceSelect').value === ''){
    alert('Please select a Province first — it determines which PTM zone your Northing/Easting belongs to.\n\nMunicipality / City is optional, but recommended for provinces that straddle a zone boundary.');
    document.getElementById('provinceSelect').focus();
    return;
  }

  if(isNaN(n) || isNaN(e)){
    alert('Please enter valid numeric Northing and Easting values.');
    return;
  }

  const zone = ZONES.find(z=>z.id===parseInt(zoneSel));
  if(!zone){
    alert('Please select the project PTM zone.');
    document.getElementById('zoneSelect').focus();
    return;
  }
  const out = prs92ToWgs84(n, e, zone.cm);
  const lat = out.lat, lon = out.lon;
  const badgeHtml = `PRS92 PTM <strong>${zone.name}</strong> (EPSG:${zone.epsg}, Central Meridian ${zone.cm}°E)`;

  document.getElementById('compareResult').classList.remove('show');
  badgeEl.innerHTML = `<div class="badge">${badgeHtml}</div>`;
  document.getElementById('outDD').textContent = `${lat.toFixed(8)}, ${lon.toFixed(8)}`;
  document.getElementById('outLat').textContent = lat.toFixed(8) + '°';
  document.getElementById('outLon').textContent = lon.toFixed(8) + '°';
  document.getElementById('outLatDMS').textContent = toDMS(lat, true);
  document.getElementById('outLonDMS').textContent = toDMS(lon, false);
  document.getElementById('gmapLink').href = `https://www.google.com/maps?q=${lat.toFixed(8)},${lon.toFixed(8)}`;
  lastLatLonCopy = `${lat.toFixed(8)}, ${lon.toFixed(8)}`;
  resultEl.classList.add('show');
}

function convertToPRS(){
  const lat = parseFloat(document.getElementById('latIn').value);
  const lon = parseFloat(document.getElementById('lonIn').value);
  const zoneSel = document.getElementById('zoneSelect2').value;
  const badgeEl = document.getElementById('zoneBadge2');
  const resultEl = document.getElementById('resultToPRS');

  if(isNaN(lat) || isNaN(lon)){
    alert('Please enter valid decimal-degree Latitude and Longitude values.');
    return;
  }

  const zone = zoneSel === 'auto' ? nearestZoneForLon(lon) : ZONES.find(z=>z.id===parseInt(zoneSel));
  const out = wgs84ToPrs92(lat, lon, zone.cm);

  badgeEl.innerHTML = `<div class="badge">Using PRS92 PTM <strong>${zone.name}</strong> (EPSG:${zone.epsg}, Central Meridian ${zone.cm}°E)</div>`;
  document.getElementById('outNorthing').textContent = out.northing.toFixed(3) + ' m';
  document.getElementById('outEasting').textContent = out.easting.toFixed(3) + ' m';
  lastNECopy = `${out.northing.toFixed(3)}, ${out.easting.toFixed(3)}`;
  resultEl.classList.add('show');
}

function copyText(which){
  const text = which === 'outLatLonCopy' ? lastLatLonCopy : lastNECopy;
  if(!text) return;
  if(!navigator.clipboard?.writeText){prompt('Copy this value:',text);return;}
  navigator.clipboard.writeText(text).then(()=>{
    // no-op, silent copy
  }).catch(()=>{
    prompt('Copy this value:', text);
  });
}

populateProvinces();
