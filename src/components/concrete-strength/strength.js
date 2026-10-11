(() => {
  const $ = id => document.getElementById(id);
  const fmt = (v, digits=3) => v.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const read = id => $(id).value.trim() === '' ? null : $(id).valueAsNumber;
  const guides = {
    reliability: ['Reliability', 'Enter the project pavement reliability R from 50% to 99.99%; no project reliability is assumed. The tool uses the same supplied R–ZR table as Rigid Pavement, interpolates between entries, takes z = |ZR|, and derives PS = 100 − R. Example: R = 90% gives ZR = −1.282, z = 1.282, and PS = 10%. This follows the requested reliability-linked strength procedure; the derived PS is not independently measured material variability.'],
    fc: ['Compressive Strength', 'Enter the project concrete compressive strength f′c in MPa. The supplied procedure estimates Sc = 0.78√f′c in MPa and Ec = 57,000√f′c in psi. These correlations are estimates; representative flexural-strength and stiffness tests can provide project-specific inputs.'],
    ps: ['Strength Percentage', 'In Reliability Linked mode, PS = 100 − R is automatic, matching the requested procedure in Rigid Pavement. This derived percentage is not independently measured material variability. Manual mode preserves the supplied SDs = (PS/100) × Sc calculation with your entered ratio; the example uses 10%. DPWH Manual §1.5 (p.14) uses independent strength PS and z from Table 5 (p.126); its example is PS 15%, z 1.037 and Sc 550 psi. It does not require PS = 100 − pavement R. Overall pavement standard deviation So is a separate parameter.'],
    z: ['Standard Normal Deviate', 'Use the positive z magnitude to adjust specification strength upward to a mean value. Select a strength-distribution percentile from the supplied table or enter a custom magnitude. The screenshot shows −1.476 converted to +1.476. Its 10% table row instead gives 1.282; the tool keeps these choices distinct.']
  };
  let result = null, opener;
  let customZ = $('z').value;
  let customPS = $('ps').value;
  function update() {
    result = null;
    $('error').hidden = true;
    const linked=$('calculationMode').value==='reliability';
    $('reliabilityField').hidden=!linked;
    $('reliability').disabled=!linked;
    $('ps').readOnly=linked;
    $('z').readOnly=linked||$('zSource').value!=='custom';
    $('zSource').disabled=linked;
    $('zSelection').hidden=linked;
    try {
      if(linked){
        result=ConcreteStrengthCalculation.fromReliability(read('fc'),read('reliability'));
        $('ps').value=result?String(result.ps):'';
        $('z').value=result?String(result.z):'';
        $('zr').value=result?result.zr.toFixed(3):'';
      }else result = ConcreteStrengthCalculation.calculate(read('fc'), read('ps'), read('z'));
    }
    catch (e) { $('error').textContent = e.message; $('error').hidden = false; }
    if(linked&&!result){$('ps').value='';$('z').value='';$('zr').value='';}
    $('reliabilityNote').textContent=linked?(result?'R = '+fmt(result.reliability,2)+'% → ZR = '+fmt(result.zr)+' → z = '+fmt(result.z)+'; PS = 100 − '+fmt(result.reliability,2)+' = '+fmt(result.ps,2)+'%.':'Enter valid f′c and Reliability to determine ZR, PS and strength.'):'Manual mode uses your PS and custom/table z; Reliability is not applied.';
    $('mean').textContent = result ? fmt(result.meanPsi) : '—';
    $('meanSI').textContent = result ? fmt(result.meanMpa) + ' MPa' : '— MPa';
    $('ec').textContent = result ? fmt(result.ecMillion) : '—';
    $('ecSI').textContent = result ? fmt(result.ecGpa,2) + ' GPa' : '— GPa';
    const fc = read('fc');
    $('fcSI').textContent = Number.isFinite(fc) && fc > 0 ? 'Equivalent: ' + fmt(fc * 145.038) + ' psi' : 'Equivalent: — psi';
    $('step1').textContent = result ? '0.78 × √' + fmt(result.fc,2) + ' = ' + fmt(result.scMpa) + ' MPa' : '—';
    $('step2').textContent = result ? fmt(result.scMpa) + ' × 145.038 = ' + fmt(result.scPsi) + ' psi' : '—';
    $('stepSD').textContent = result ? '(' + fmt(result.ps,2) + ' ÷ 100) × ' + fmt(result.scPsi) + ' = ' + fmt(result.sdPsi) + ' psi' : '—';
    $('stepZ').textContent = result ? (linked?'R = '+fmt(result.reliability,2)+'% → ZR = '+fmt(result.zr)+' → z = |ZR| = ':$('zSource').value === 'custom' ? 'Custom z = ' : 'Selected Table z = ') + fmt(result.z) : '—';
    $('step3').textContent = result ? fmt(result.scPsi) + ' + (' + fmt(result.z) + ' × ' + fmt(result.sdPsi) + ') = ' + fmt(result.meanPsi) + ' psi' : '—';
    $('stepMeanSI').textContent = result ? 'SI: ' + fmt(result.meanPsi) + ' ÷ 145.038 = ' + fmt(result.meanMpa) + ' MPa' : '—';
    $('stepEc').textContent = result ? 'f′c = ' + fmt(result.fc,2) + ' × 145.038 = ' + fmt(result.fcPsi) + ' psi; Ec = 57,000 × √' + fmt(result.fcPsi) + ' = ' + fmt(result.ecPsi) + ' psi = ' + fmt(result.ecMillion,6) + ' × 10⁶ psi (' + fmt(result.ecGpa,2) + ' GPa)' : '—';
    $('apply').disabled = !result; $('export').disabled = !result;
  }
  $('strengthForm').addEventListener('input', event => {
    if (event.target === $('z') && $('zSource').value === 'custom') customZ = $('z').value;
    if (event.target === $('ps') && $('calculationMode').value === 'manual') customPS = $('ps').value;
    update();
  });
  $('strengthForm').addEventListener('submit', e => e.preventDefault());
  $('calculationMode').addEventListener('change',()=>{
    if($('calculationMode').value==='manual'){
      $('ps').value=customPS;
      $('z').value=$('zSource').value==='custom'?customZ:$('zSource').value;
    }
    update();
  });
  $('zSource').addEventListener('change', () => {
    $('z').readOnly = $('zSource').value !== 'custom';
    if ($('z').readOnly) $('z').value = $('zSource').value;
    else $('z').value = customZ;
    update();
  });
  $('reset').addEventListener('click', () => { $('strengthForm').reset(); customZ = $('z').value; customPS = $('ps').value; update(); });
  $('apply').addEventListener('click', () => {
    if (!result) return;
    if (window.parent === window) { $('error').textContent = 'Open from HD Toolkit to send these values to Pavement Design.'; $('error').hidden = false; return; }
    window.parent.postMessage({ type: 'hd-toolkit-concrete-strength', fcMPa: result.fc, ... (result.mode==='RELIABILITY_LINKED'?{reliability:result.reliability}:{}) }, '*');
  });
  document.querySelectorAll('[data-guide]').forEach(button => button.addEventListener('click', () => {
    opener = button; const [title,body] = guides[button.dataset.guide];
    $('guideTitle').textContent = title; $('guideBody').textContent = body; $('guide').showModal();
  }));
  $('closeGuide').addEventListener('click', () => $('guide').close());
  $('guide').addEventListener('close', () => opener?.focus());
  $('guide').addEventListener('click', event => {
    const bounds = $('guide').getBoundingClientRect();
    if (event.target === $('guide') && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) $('guide').close();
  });
  $('export').addEventListener('click', () => {
    if (!result) return;
    const report = { tool: 'HD Toolkit — Concrete Modulus of Rupture', method: 'User supplied procedure', calculationMode: $('calculationMode').value, zSelection: $('calculationMode').value==='reliability'?'SUPPLIED_PAVEMENT_R_Z_TABLE':$('zSource').value, ...result };
    const url = URL.createObjectURL(new Blob([JSON.stringify(report,null,2)], {type:'application/json'}));
    const link = document.createElement('a'); link.href = url; link.download = 'HD-Toolkit-Concrete-Strength.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url),1000);
  });
  update();
})();
