/* Editable guidance for pavement worksheet parameters. */
(() => {
  const source = 'https://www.fhwa.dot.gov/engineering/geotech/pubs/05037/ac.cfm#:~:text=C.3%20Rigid%20Pavement%20Structural%20Design';
  const references = {
    cd: ['https://www.fhwa.dot.gov/engineering/geotech/pubs/05037/05d.cfm#:~:text=Table%205-50', 'FHWA · Table 5-50: Rigid Pavement Drainage Coefficient ↗'],
    k: ['https://www.fhwa.dot.gov/engineering/geotech/pubs/05037/05c.cfm#:~:text=5.4.6', 'FHWA · Section 5.4.6: Modulus of Subgrade Reaction ↗'],
    foundationEsb: ['https://www.fhwa.dot.gov/engineering/geotech/pubs/05037/05c.cfm#:~:text=Table%205-45', 'FHWA · Table 5-45: Material Modulus Reference Ranges ↗']
  };
  const guides = {
    r: ['Reliability', '%', 'Use the reliability level specified for the project’s road class and design criteria.', 'Enter the project reliability as a percentage.'],
    zr: ['Standard Normal Deviate', 'Automatic', 'Set Reliability; the calculator looks up or interpolates its corresponding normal deviate.', 'This field is read only.'],
    so: ['Overall Standard Deviation', 'Dimensionless', 'Use the adopted design standard’s variability allowance for rigid pavement.', 'Default 0.30 is the lower end of DPWH Manual Table 4’s rigid pavement range, 0.30–0.40. Confirm the adopted design allowance.'],
    wMillion: ['Design Traffic', 'Total ESALs → ×10⁶ ESAL', 'Obtain cumulative design-lane 18-kip ESALs using rigid pavement load-equivalency factors from the project traffic study.', 'While editing, enter the total ESAL count, for example 42230000. The live preview immediately shows 42.23 ×10⁶ ESAL; leaving the field displays 42.23. Calculation retains full precision. Design Period follows the Design Traffic tab and defaults to 20 years.'],
    pt: ['Terminal Serviceability', 'Serviceability index', 'Use the minimum acceptable serviceability specified in the project design criteria.', 'DPWH Manual §1.4: initial index 4.5 for rigid pavement; terminal index 2.5 or higher for major highways, 2.0 for lesser traffic. Use the project criterion.'],
    p0: ['Initial Serviceability', 'Serviceability index', 'Enter the adopted initial serviceability for the new pavement. It must exceed terminal serviceability and be no greater than 5.', 'DPWH Manual §1.4 gives 4.5 for rigid pavement. Serviceability Loss updates automatically when either serviceability input changes.'],
    dpsi: ['Serviceability Loss', 'Serviceability index · Automatic', 'Calculated as ΔPSI = p₀ − pₜ. Edit Initial Serviceability or Terminal Serviceability to update the loss.', 'For p₀ = 4.5 and pₜ = 2.5, the result is 2.00. This field is read only; initial must exceed terminal.'],
    fcMPa: ['Concrete Compressive Strength', 'MPa', 'Enter the project-specified f′c in MPa. Convert f′c to psi using 145.038. Ec is calculated independently from compressive strength; specified flexural strength Sc is entered separately.', 'This is the editable concrete strength input. Ec(psi) = 57,000√f′c(psi).'],
    scSpecified: ['Specified Flexural Strength', 'psi', 'Use the worksheet’s 550 psi 14-day construction specification, or turn the toggle off to enter the adopted project value.', 'Sc is independent of compressive strength f′c. S′c = Sc + |ZR| × (PS/100) × Sc. Confirm the strength and test age against the project specification.'],
    sc: ['Concrete Modulus of Rupture', 'psi · Automatic', 'Use Sc = 550 psi with the specification toggle on, or enter the project-specified flexural strength with it off. Use the magnitude of the pavement ZR to look up its lower-strength percentage PS from the same R–Z table. SDs = (PS/100) × Sc; S′c = Sc + |ZR| × SDs.', 'DPWH Manual §1.5 uses independent strength PS/z (example: 15% and 1.037). It does not establish a link to pavement reliability. This tool retains your requested coupling. Read only. Example: |ZR| = 1.282 gives PS = 10%; |ZR| = 1.645 gives PS = 5%. Intermediate values are interpolated. This follows the requested coupling of PS to pavement ZR; PS is not independently measured material variability.'],
    ecMillion: ['Concrete Elastic Modulus', 'Million psi · Automatic', 'The supplied procedure estimates Ec(psi) = 57,000√[f′c(MPa) × 145.038]. The field displays Ec divided by 1,000,000.', 'Read only. Update Concrete Compressive Strength to recalculate Ec.'],
    cd: ['Drainage Coefficient', 'Dimensionless', 'Select Cd from the rigid pavement drainage table using drainage quality and time near saturation.', 'DPWH Manual §1.7 (p.14) states Cd should not be lower than 1. Table 8 includes lower values for poor drainage; the manual calls for improving road elevation/drainage in such conditions. The general equation accepts positive Cd, so confirm this project requirement.'],
    j: ['Load Transfer Coefficient', 'Dimensionless · Editable', 'Selecting a Joint Layout fills the minimum J from DPWH Manual Table 6. You can then edit J to the adopted project value; other input changes preserve your edit.', 'Undoweled PCC / crushed aggregate: 3.8; doweled PCC / crushed aggregate: 3.2; doweled PCC / HMA without widened outside lane: 2.7; CRCP / HMA shoulders: minimum 2.9 (range 2.9–3.2); CRCP / tied PCC shoulders: minimum 2.3 (range 2.3–2.9). Confirm that the selected condition applies to the project. Changing Joint Layout fills its default again. Others lets you enter a project-specific J and optionally upload a joint-layout illustration. Tie bars at a longitudinal joint are distinct from dowels at transverse joints.'],
    k: ['Corrected Subgrade Reaction', 'pci · lb/in³', 'Foundation Support calculates composite k∞ from subbase thickness, subbase modulus and subgrade MR, then corrects effective k using LS. Expand Rigid Pavement · Calculation Steps & Nomographs below the design workspace to follow the readings.', 'Account for applicable seasonal and shallow-foundation adjustments before the loss-of-support step. Automatic kcorr is rounded to whole pci. Enter Verified kcorr is available for an independently determined value.'],
    foundationDsb: ['Subbase Thickness', 'mm', 'This single input controls the pavement subbase illustration and the automatic foundation calculation. The calculator divides millimetres by 25.4 for Figure 3.3.', 'Default 200 mm. Auto mode: 101.6–508 mm (4–20 in). With Auto-Calculate off, thickness and verified kcorr remain editable; thickness only changes the drawing in that mode (0–1,000 mm).'],
    foundationEsb: ['Subbase Elastic Modulus · Eₛᵦ', 'psi · SI equivalent in MPa', 'Select Subbase Material to fill the minimum modulus in the reference table, then edit Eₛᵦ within the selected material range. Out-of-range values stop automatic kcorr calculation. Cement Treated Granular Base has a reference range of 1,000,000–2,000,000 psi, but Figure 3.3 supports only its 1,000,000 psi minimum; higher values require another verified method. Unbound Granular Material is the default (15,000 psi). Eₛᵦ, subbase thickness Dₛᵦ and subgrade Mᵣ determine composite k in Figure 3.3; LS is then applied to obtain kcorr. Use material testing or an approved correlation reflecting moisture and stress conditions.', 'Conversion: Eₛᵦ(psi) = Eₛᵦ(MPa) × 145.0377; MPa = psi × 0.006894757. Example: 15,000 psi = 103.42 MPa. The 15,000 psi default is a starting assumption, not a measured project modulus. Calculator chart range: 15,000–1,000,000 psi. Do not extrapolate beyond the chart. The ranges below are material references, not a substitute for project testing. Figure 8 is a granular-material correlation; its a₃ coefficient is for flexible pavement and is not entered into the rigid slab equation.'],
    foundationMr: ['Subgrade Resilient Modulus', 'psi', 'Use the roadbed resilient modulus from the project subgrade investigation or applicable Design CBR correlation.', 'Figure 3.3 range: 1,000–20,000 psi. This is a soil modulus, not kcorr.'],
    foundationLs: ['Loss of Support Factor', 'Dimensionless', 'Select LS for subbase material, erosion susceptibility and potential voids. Typical ranges: treated bases 0–1; lime-stabilized/unbound granular 1–3; fine-grained/natural subgrade 2–3.', 'Figure 3.6 range: 0–3. LS = 0 gives no reduction. Fractional LS interpolates between printed lines.'],
  };
  const dialog = document.createElement('dialog');
  dialog.className = 'input-guide-dialog';
  dialog.id = 'inputGuideDialog';
  dialog.setAttribute('aria-labelledby', 'inputGuideTitle');
  dialog.innerHTML = '<div class="guide-heading"><span>Input Guide</span><button type="button" class="guide-close" aria-label="Close input guide">×</button></div><h2 id="inputGuideTitle"></h2><div class="guide-units"></div><h3>How to Determine the Value</h3><p class="guide-method"></p><h3>What to Enter</h3><p class="guide-entry"></p><a class="guide-source" target="_blank" rel="noopener">FHWA · AASHTO Design Method Reference ↗</a>';
  document.body.append(dialog);
  const deviationTable = document.createElement('section');
  deviationTable.className = 'guide-deviation-table';
  deviationTable.hidden = true;
  deviationTable.innerHTML = '<table><caption>Table 4: Values of Overall Standard Deviation</caption><thead><tr><th scope="col">S<sub>o</sub></th><th scope="col">Condition</th></tr></thead><tbody><tr class="rigid-range"><td>0.30–0.40</td><td>For Rigid Pavements</td></tr><tr><td>0.40–0.50</td><td>For Flexible Pavements</td></tr></tbody></table><p class="guide-table-note">From your supplied reference table. The rigid pavement range applies to this tool.</p>';
  dialog.querySelector('.guide-method').after(deviationTable);
  const manualIllustrations=document.createElement('details');
  manualIllustrations.className='manual-illustrations';
  manualIllustrations.innerHTML='<summary>DPWH Manual · Original Illustrations</summary><div></div>';
  dialog.append(manualIllustrations);
  const manualAssets={r:[['reliability','Table 2 · Reliability · p.124']],zr:[['reliability-z','Table 3 · R–ZR · p.125']],so:[['standard-deviation','Table 4 · Overall Standard Deviation · p.125']],sc:[['strength-percentiles','Table 5 · Strength Distribution · p.126']],j:[['load-transfer','Table 6 · Load Transfer · p.126']],cd:[['drainage-quality','Table 7 · Drainage Quality · p.126'],['drainage-coefficient','Table 8 · Rigid Drainage Coefficient · p.127']],k:[['composite-k','Figure 1 · Composite k · p.136'],['loss-support','Figure 2 · Corrected k · p.137']],foundationDsb:[['subbase-thickness','Figure 11 · Subbase Thickness · p.146']],foundationEsb:[['loss-support-materials','Table 10 · Material Modulus Reference Ranges · p.128'],['subbase-modulus','Figure 8 · Granular Subbase Correlation · p.143']]};
  const transferTable = document.createElement('section');
  transferTable.className = 'guide-deviation-table';
  transferTable.hidden = true;
  transferTable.innerHTML = '<table><caption>Table 6: Values of Load Transfer Coefficient, J</caption><thead><tr><th scope="col">Condition</th><th scope="col">J Factor</th></tr></thead><tbody><tr class="rigid-range"><td>Undoweled PCC on crushed aggregate surfacing</td><td>3.8</td></tr><tr><td>Doweled PCC on crushed aggregate surfacing</td><td>3.2</td></tr><tr><td>Doweled PCC on HMA (without widened outside lane)</td><td>2.7</td></tr><tr><td>CRCP with HMA shoulders</td><td>2.9–3.2</td></tr><tr><td>CRCP with tied PCC shoulders</td><td>2.3–2.9</td></tr></tbody></table><p class="guide-table-note">From your supplied reference table. Choose the row matching your project condition.</p>';
  deviationTable.after(transferTable);
  const reliabilityTable = document.createElement('section');
  reliabilityTable.className = 'guide-deviation-table';
  reliabilityTable.hidden = true;
  reliabilityTable.innerHTML = '<p class="guide-reliability-note">As per DPWH Standards, R = 85%.</p><table><caption>Recommended Level of Reliability, R (%)</caption><thead><tr><th scope="col" rowspan="2">Functional Classification</th><th scope="colgroup" colspan="2">Recommended Reliability</th></tr><tr><th scope="col">Urban</th><th scope="col">Rural</th></tr></thead><tbody><tr><th scope="row">Freeways</th><td>85–99.9</td><td>80–99.9</td></tr><tr><th scope="row">Principal Arterials</th><td>80–99</td><td>75–95</td></tr><tr><th scope="row">Collectors</th><td>80–95</td><td>75–95</td></tr><tr><th scope="row">Local</th><td>50–80</td><td>50–80</td></tr></tbody></table><p class="guide-table-note">Ranges checked against DPWH Design Procedure Manual for Roads (2017), Table 2, p.124. Section 1.2 states that 85% is normally used for national roads; confirm the project classification.</p>';
  transferTable.after(reliabilityTable);
  const drainageTable = document.createElement('section');
  drainageTable.className = 'guide-deviation-table guide-drainage-table';
  drainageTable.hidden = true;
  drainageTable.innerHTML = '<div class="guide-table-scroll" tabindex="0" role="region" aria-label="Recommended rigid pavement drainage coefficients"><table><caption>Table 8: Recommended Values of Drainage Coefficient (Cd) for Rigid Pavement Design</caption><thead><tr><th scope="col" rowspan="2">Quality of Drainage</th><th scope="colgroup" colspan="4">Percent of Time Pavement Structure Is Exposed to Moisture Levels Approaching Saturation</th></tr><tr><th scope="col">Less Than 1%</th><th scope="col">1–5%</th><th scope="col">5–25%</th><th scope="col">Greater Than 25%</th></tr></thead><tbody><tr><th scope="row">Excellent</th><td>1.25–1.20</td><td>1.20–1.15</td><td>1.15–1.10</td><td>1.10</td></tr><tr><th scope="row">Good</th><td>1.20–1.15</td><td>1.15–1.10</td><td>1.10–1.00</td><td>1.00</td></tr><tr><th scope="row">Fair</th><td>1.15–1.10</td><td>1.10–1.00</td><td>1.00–0.90</td><td>0.90</td></tr><tr><th scope="row">Poor</th><td>1.10–1.00</td><td>1.00–0.90</td><td>0.90–0.80</td><td>0.80</td></tr><tr><th scope="row">Very Poor</th><td>1.00–0.90</td><td>0.90–0.80</td><td>0.80–0.70</td><td>0.70</td></tr></tbody></table></div><p class="guide-table-note">Transcribed from your supplied Table 8. Match the drainage-quality row and the near-saturation exposure column, then adopt Cd within the displayed range for the project conditions. Original manual Tables 7 and 8 are available below.</p>';
  reliabilityTable.after(drainageTable);
  const modulusTable=document.createElement('section');
  modulusTable.className='guide-deviation-table guide-modulus-table';modulusTable.hidden=true;
  modulusTable.innerHTML='<div class="guide-table-scroll" tabindex="0" role="region" aria-label="Subbase material modulus reference ranges"><table><caption>Material Modulus Reference Ranges</caption><thead><tr><th scope="col">Material</th><th scope="col">E (psi)</th></tr></thead><tbody><tr><td>Unbound granular material</td><td>15,000–45,000</td></tr><tr><td>Lime stabilized</td><td>20,000–70,000</td></tr><tr><td>Bituminous stabilized mixtures</td><td>40,000–300,000</td></tr><tr><td>Asphalt treated base</td><td>350,000–1,000,000</td></tr><tr><td>Cement aggregate mixtures</td><td>500,000–1,000,000</td></tr><tr><td>Cement treated granular base</td><td>1,000,000–2,000,000</td></tr></tbody></table></div><p class="guide-table-note">Reference: DPWH Design Procedure Manual for Roads (2017), Table 10, p.128; corresponding material ranges appear in FHWA Table 5-45. Select the material actually used. Values above 1,000,000 psi are outside this calculator’s Figure 3.3 range. The original table and granular correlation are available below.</p>';
  drainageTable.after(modulusTable);
  let trigger;
  for (const [id, guide] of Object.entries(guides)) {
    const input = document.getElementById(id);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'input-guide-button';
    button.textContent = '?';
    button.setAttribute('aria-label', 'How to determine ' + guide[0]);
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-controls', dialog.id);
    input.closest('.entry').after(button);
    button.addEventListener('click', () => {
      trigger = button;
      dialog.querySelector('h2').textContent = guide[0];
      dialog.querySelector('.guide-units').textContent = 'Input unit: ' + guide[1];
      dialog.querySelector('.guide-method').textContent = guide[2];
      dialog.querySelector('.guide-entry').textContent = guide[3];
      deviationTable.hidden = id !== 'so';
      transferTable.hidden = id !== 'j';
      reliabilityTable.hidden = id !== 'r';
      drainageTable.hidden = id !== 'cd';
      modulusTable.hidden = id !== 'foundationEsb';
      dialog.classList.toggle('drainage-guide', id === 'cd');
      dialog.classList.toggle('modulus-guide', id === 'foundationEsb');
      manualIllustrations.hidden=!manualAssets[id];manualIllustrations.open=false;
      manualIllustrations.querySelector('div').innerHTML=(manualAssets[id]||[]).map(([name,label])=>'<figure class="manual-figure"><a href="./assets/dpwh-manual/'+name+'.png" target="_blank" rel="noopener"><img src="./assets/dpwh-manual/'+name+'.png" loading="lazy" alt="'+label+'"></a><figcaption>DPWH Design Procedure Manual for Roads (2017) · '+label+' · Click to enlarge.</figcaption></figure>').join('');
      dialog.querySelector('.guide-source').href = source;
      dialog.querySelector('.guide-source').textContent = 'FHWA · Section C.3: Rigid Pavement Structural Design ↗';
      if (references[id]) {
        dialog.querySelector('.guide-source').href = references[id][0];
        dialog.querySelector('.guide-source').textContent = references[id][1];
      }
      dialog.querySelector('.guide-source').hidden = ['figureBase','fcMPa','sc','ecMillion'].includes(id)||(id.startsWith('foundation')&&id!=='foundationEsb');
      dialog.showModal();
    });
  }
  dialog.querySelector('.guide-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    const bounds = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
  });
  dialog.addEventListener('close', () => trigger?.focus());
})();
