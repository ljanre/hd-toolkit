(() => {
  const guides={
    classification:'Choose the administrative road class or functional type confirmed for the project. ADT alone does not reclassify a road. DGCS §§1.5.5–1.5.6, pp.1-9–1-11. Tertiary has no dedicated DGCS table column.',
    basis:'Select the applicable provision: Chapter 1 road-system classification, Chapter 3 Table 3-1 (excluding tourism), tourism Table 3-2, or functional design. These sources have different values; the approved project basis governs.',
    standardLevel:'Table 3-1, p.3-2 provides Minimum and Desirable columns for Primary, Secondary and Expressway. FMR and Barangay have single columns. Desirable values do not exist for every classification.',
    terrain:'Select Flat/Level, Rolling or Mountainous based on the surveyed corridor. The selected terrain controls the relevant speed, radius and grade table entries.',
    function:'Select the traffic function separately from the administrative class. Rural Local, Collector and Arterial widths use Tables 3-3–3-5; speeds use Tables 3-6–3-7 and §3.4. Unlisted combinations: TO BE ESTABLISHED.',
    environment:'Choose Rural or Urban to match the corridor context. Urban lane configuration needs capacity and site review; rural lookup values do not automatically apply.',
    adt:'Enter forecast design-year average daily traffic in vehicles/day, not ESALs or hourly volume. ADT controls functional rural speed and width bands. Use the approved traffic forecast.',
    speed:'Use the selected baseline or adopt a listed design speed in km/h. Changing speed updates applicable speed-based criteria. Table 3-1 radius/grade/sight-distance lines remain printed baselines. At 95 km/h, Table 3-8 stopping distance is TO BE ESTABLISHED.',
    'section-condition':'Normal crown falls outward from the centreline. Superelevated curve is a single plane rotated about the centreline. Shoulder slope follows superelevation; runoff, transitions and rollover require separate design.',
    'section-superelevation':'Enter e as a percent, e.g. 6 for 6%, not 0.06. The drawing compares this against the schedule’s adopted maximum. Table 3-1 maximum is 8%; a missing project limit is TO BE ESTABLISHED.',
    'section-direction':'Select the low side of the fully superelevated section, viewed across the road. Both lanes and shoulders fall toward this side. Normal-crown mode does not use this setting.',
    'section-pavementType':'Choose PCC or ACP for the depicted surfacing. Tourism Table 3-2 requires PCC 230 mm / 1.5% cross slope or ACP 50 mm / 2%. Other classes need their project pavement design.',
    'section-thickness':'Enter pavement thickness in mm. Tourism requirements are PCC 230 mm or ACP 50 mm (Table 3-2). Other road-class thickness: TO BE ESTABLISHED by pavement design. Base/subbase layers are not included in this drawing.',
    'section-crossfall':'Enter normal-crown pavement cross slope in %. Tourism PCC uses 1.5% and ACP 2% (Table 3-2). Other surfacing needs project criteria. In superelevated mode the e value replaces normal crossfall.',
    'section-shoulderFall':'Enter outward shoulder slope in % for a crowned section. The initial 3% is illustrative, not a universal prescribed value. In superelevation the shoulders continue the pavement plane.',
    'section-leftGround':'Enter surveyed existing-ground elevation at the left outer shoulder edge, in metres relative to finished centreline = 0.00 m. Positive is above the datum. The initial +1 m is an illustration; project ground is TO BE ESTABLISHED from survey.',
    'section-rightGround':'Enter surveyed existing-ground elevation at the right outer shoulder edge, in metres relative to finished centreline = 0.00 m. Negative is below the datum. The initial −1 m is an illustration; the model joins both ground points with a straight line.',
    'section-cutSlope':'Enter horizontal-to-vertical ratio H:1V, e.g. 2 for 2H:1V. Table 7-1 ranges depend on material and height, with berm/protection assumptions. Tourism cut-slope provisions are in Table 3-2. Unlisted or unsuitable conditions: TO BE ESTABLISHED through geotechnical design.',
    'section-fillSlope':'Enter horizontal-to-vertical fill ratio H:1V. Check the selected material and height against Table 7-1; foundation, drainage, saturation and slope protection also govern. A displayed reference range does not establish stability.',
    'section-material':'Choose the investigated soil/rock category for Table 7-1 guidance. Materials/heights outside the supplied bands are TO BE ESTABLISHED through geotechnical assessment; rock cuts require §7.3 review.'
  };
  for(const label of document.querySelectorAll('#controls label, #section-controls label')){
    const control=label.querySelector('input,select')||document.getElementById(label.htmlFor);
    if(!control)continue;
    let parent=label.parentElement;
    if(parent.id==='section-controls'){
      const wrap=document.createElement('div');wrap.className='section-guide-field '+(label.classList.contains('material-control')?'material-control':'');parent.insertBefore(wrap,label);wrap.append(label);parent=wrap;
    }
    const button=document.createElement('button');button.type='button';button.className='input-guide-button control-guide';button.textContent='?';
    button.setAttribute('aria-label','Input guide: '+(control.getAttribute('aria-label')||label.textContent.split('\n')[0].split('Normal crown')[0].split('Portland')[0].trim()));
    button.dataset.guideTitle=label.childNodes[0].textContent.trim();button.dataset.guideText=guides[control.id]||'TO BE ESTABLISHED';parent.append(button);
  }
  const dialog=document.getElementById('input-guide');
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-guide-text]');if(!button)return;
    document.getElementById('input-guide-title').textContent=button.dataset.guideTitle||'Input Guide';
    document.getElementById('input-guide-text').textContent=button.dataset.guideText;dialog.showModal();
  });
  document.getElementById('input-guide-close').addEventListener('click',()=>dialog.close());
})();
