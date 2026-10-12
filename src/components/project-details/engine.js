/* Inventory lookup only: no inferred road class, chainage coverage or design criteria. */
(() => {
  const normalize=value=>String(value??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  function load(data){
    if(data.schemaVersion!==1||!Array.isArray(data.columns)||!Array.isArray(data.rows)||data.rows.length!==data.recordCount)throw new Error('Invalid road inventory');
    const required=['OBJECTID','ROAD_NAME','SECTION_ID','ROAD_SEC_CLASS','PROVINCE','DEO','SEC_LENGTH'];
    if(required.some(name=>!data.columns.includes(name)))throw new Error('Missing inventory fields');
    const records=data.rows.map((row,index)=>{
      if(row.length!==data.columns.length)throw new Error('Invalid inventory row');
      const raw={};row.forEach((code,i)=>{const value=data.values[i]?.[code];if(!Number.isInteger(code)||typeof value!=='string')throw new Error('Invalid inventory code');raw[data.columns[i]]=value;});
      return {index,raw,search:normalize(['ROAD_NAME','SECTION_ID','ROAD_ID','ROUTE_ID','ROUTE_NO','PROVINCE','DEO','REGION'].map(key=>raw[key]).join(' '))};
    });
    return {records,columns:data.columns,source:data.source,sourceSha256:data.sourceSha256};
  }
  function search(records,filters={}){
    const tokens=normalize(filters.query).split(' ').filter(Boolean);
    return records.filter(record=>tokens.every(token=>record.search.includes(token))&&['REGION','PROVINCE','DEO','ROAD_SEC_CLASS'].every(key=>!filters[key]||record.raw[key].trim()===filters[key]));
  }
  function options(records,key){return [...new Set(records.map(record=>record.raw[key].trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));}
  function csv(columns,raw){return columns.map(key=>'"'+String(raw[key]??'').replaceAll('"','""')+'"').join(',');}
  globalThis.RoadInventory={load,search,options,csv,normalize};
})();
