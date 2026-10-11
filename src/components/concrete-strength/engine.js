/* Calculation procedure and conversion coefficient from the supplied image. */
(() => {
  const table = Object.freeze([[20,.841],[15,1.037],[10,1.282],[5,1.645],[1,2.327]]);
  const reliabilityTable = Object.freeze([[50,0],[60,-.253],[70,-.524],[75,-.674],[80,-.841],[85,-1.037],[90,-1.282],[91,-1.340],[92,-1.405],[93,-1.476],[94,-1.555],[95,-1.645],[96,-1.751],[97,-1.881],[98,-2.045],[99,-2.327],[99.9,-3.090],[99.99,-3.750]]);
  function fromReliability(fc,r) {
    if(r===null||fc===null)return null;
    if(!Number.isFinite(r)||r<50||r>99.99)throw new Error('Reliability must be from 50% to 99.99%.');
    let zr=0;
    for(let i=0;i<reliabilityTable.length;i++){
      const row=reliabilityTable[i];
      if(r===row[0]){zr=row[1];break;}
      if(i>0&&r<row[0]){const lo=reliabilityTable[i-1];zr=lo[1]+(r-lo[0])/(row[0]-lo[0])*(row[1]-lo[1]);break;}
    }
    return {...calculate(fc,100-r,Math.abs(zr)), reliability:r, zr, mode:'RELIABILITY_LINKED', psBasis:'LOWER_PERCENTAGE_FROM_PAVEMENT_R_Z_TABLE'};
  }
  function calculate(fc, ps, z) {
    if ([fc, ps, z].some(v => v === null)) return null;
    if (![fc, ps, z].every(Number.isFinite) || fc <= 0 || ps < 0 || ps > 100 || z < 0) throw new Error('Use f′c > 0, PS from 0–100%, and a nonnegative z magnitude.');
    const fcPsi = fc * 145.038;
    const scMpa = .78 * Math.sqrt(fc);
    const scPsi = scMpa * 145.038;
    const sdPsi = ps / 100 * scPsi;
    const meanPsi = scPsi + z * sdPsi;
    const ecPsi = 57000 * Math.sqrt(fcPsi);
    if (![fcPsi, meanPsi, ecPsi].every(Number.isFinite)) throw new Error('Values are too large to calculate.');
    return { fc, ps, z, fcPsi, scMpa, scPsi, sdPsi, meanPsi, meanMpa: meanPsi / 145.038, ecPsi, ecMillion: ecPsi / 1e6, ecGpa: ecPsi / 145.038 / 1000 };
  }
  globalThis.ConcreteStrengthCalculation = Object.freeze({ table, reliabilityTable, calculate, fromReliability });
})();
