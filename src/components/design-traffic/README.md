# Design Traffic — Truck Configuration Worksheet

The Design Traffic page now contains only the truck-configuration worksheet. It replaces the former vehicle-class AADT interface and has no worksheet selector. Developer Mode reveals the calculator; public mode retains the TBD panel.

Enter the traffic-survey/opening years, design period, annual growth, DD and DL. Enter two-way AADT separately for each included loading case. Blank count rows are excluded; zeros contribute zero. Repeated truck codes allow different adopted weights. Catalogue GVW/fractions remain reference loading cases, not verified legal limits or measured fleet averages. Active rows with unknown axle fractions or EF remain pending and cannot be transferred as a complete result.

Axle EF = Σ(load in tonnes / 8.2)^4. Each adopted axle load = GVW in kg × fraction / 1,000. Axle count must match the selected code. Fractions must be nonnegative and sum to 1 within 0.001 for printed rounding; non-unity sums are flagged and used as entered without normalization. Entered EF is available for a verified factor. The original source catalogue is retained unchanged.

Opening AADT = survey AADT × (1+r)^delay. Growth sum = [(1+r)^n−1]/r, or n at zero growth. Cumulative design-lane vehicles = 365 × opening AADT × growth sum × DD × DL. CESAL = sum of each loading case's design-lane vehicles × EF. The summary also shows the undistributed two-way vehicle total. Full precision is retained; DD and DL apply once.

Load Attached Example explicitly populates survey/opening 2025, n=20, growth=3.8%, DD=DL=0.5; code 1-2 AADT=2,197/GVW=33,300 kg; code 11-2 AADT=1,865/GVW=40,600 kg with fractions 0.168, 0.2981, 0.2793, 0.2538 (sum 0.9992). Total = 140,432,208.594 ESAL, rounded to 140,432,209 as in the attached worksheet. These example inputs are not project defaults.

CSV and print summaries include project parameters and included cases. Rigid-pavement transfer requires a complete positive result and confirmation that the included configurations cover project traffic and their factors are appropriate for rigid pavement. Transfer sends unrounded million ESAL and the design period.

The shared engine retains compatibility helpers for prior class calculations, but the old vehicle-class interface and its scripts are removed. Run the traffic/configuration regression checks before updating formulas or catalogue data.

Annual growth defaults to 2% and Clear restores 2%. The attached example explicitly uses 3.8% to reproduce its source result. Project Name is removed from inputs, summary heading and CSV export. Question-mark guides beside design parameters and loading-table headings explain units, calculation behavior and project applicability; native dialogs support Escape and return focus to the trigger.

The configuration worksheet starts with three blank loading cases. Loading the attached example replaces these with its two positive-AADT cases. The summary table uses aligned numeric columns and explicit units; Total CESAL and Design Traffic W18 appear below it. W18 equals the completed total design-lane CESAL, with DD/DL already applied; incomplete EF inputs leave W18 pending. The growth chart follows the table/results and includes calendar-year ticks plus survey, opening and projected-end cards with years, AADT and forecast duration.

Input guidance is visible below the project fields and above the loading-case table. The former question-mark buttons and modal guide have been removed; project inputs link to their help text with aria-describedby.

The chart legend lists total and individual included loading cases with survey/opening/projected AADT. “Show all vehicles + total” controls the per-case series and legend entries; switching it off keeps only the total and never changes CESAL/W18. Repeated vehicle codes remain distinct loading cases, identified by case number and GVW. On smaller screens the legend moves below the chart.
