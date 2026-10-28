/* Transcribed from FHWA HDS-2, 2nd ed. (2002), Tables 5.7 and 2.2. */
(() => {
  const coefficients = [
    ['asphalt','Streets · asphalt',.70,.95],['concrete','Streets · concrete',.80,.95],
    ['brick','Streets · brick',.70,.85],['walks','Drives and walks',.75,.85],['roofs','Roofs',.75,.95],
    ['sandy-flat','Lawns · sandy soil · slope < 2%',.05,.10],['sandy-average','Lawns · sandy soil · slope 2–7%',.10,.15],['sandy-steep','Lawns · sandy soil · slope > 7%',.15,.20],
    ['heavy-flat','Lawns · heavy soil · slope < 2%',.13,.17],['heavy-average','Lawns · heavy soil · slope 2–7%',.18,.22],['heavy-steep','Lawns · heavy soil · slope > 7%',.25,.35],
    ['parks','Parks and cemeteries',.10,.25],['playgrounds','Playgrounds',.20,.40],['railroad','Railroad yards',.20,.40],['unimproved','Unimproved areas',.10,.30],
    ['downtown','Business · downtown',.70,.95],['neighborhood','Business · neighborhood',.50,.70],
    ['single','Residential · single-family',.30,.50],['detached','Residential · multi-unit detached',.40,.60],['attached','Residential · multi-unit attached',.60,.75],['suburban','Residential · suburban',.25,.40],['apartments','Residential · apartments',.50,.70],
    ['light','Industrial · light',.50,.80],['heavy','Industrial · heavy',.60,.90]
  ].map(([id,label,min,max])=>Object.freeze({id,label,min,max}));
  const velocities = [
    ['forest','Forest / heavy litter; hay meadow · overland',.076],
    ['woodland','Trash fallow / minimum tillage; contour / strip crops; woodland · overland',.152],
    ['grass','Short grass pasture · overland',.213],
    ['cultivated','Cultivated straight row · overland',.274],
    ['bare','Nearly bare, untilled; alluvial fans · overland',.305],
    ['waterway','Grassed waterway · shallow concentrated',.457],
    ['unpaved','Unpaved · shallow concentrated',.491],
    ['paved','Paved; small upland gullies · shallow concentrated',.619]
  ].map(([id,label,k])=>Object.freeze({id,label,k}));
  globalThis.HydrologyReferences=Object.freeze({coefficients:Object.freeze(coefficients),velocities:Object.freeze(velocities)});
})();
