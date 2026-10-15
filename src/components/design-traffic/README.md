# CESAL, W18 — Truck Configuration Worksheet

The CESAL, W18 page now contains only the truck-configuration worksheet. It replaces the former vehicle-class AADT interface and has no worksheet selector. Developer Mode reveals the calculator; public mode retains the UD panel.

Enter the traffic-survey/opening years, design period, annual growth, DD and DL. Enter two-way AADT separately for each included loading case. Blank count rows are excluded; zeros contribute zero. Repeated truck codes allow different adopted weights. Catalogue GVW/fractions remain reference loading cases, not verified legal limits or measured fleet averages. Active rows with unknown axle fractions or EF leave W18 pending.

Axle EF = Σ(load in tonnes / 8.2)^4. Each adopted axle load = GVW in kg × fraction / 1,000. Axle count must match the selected code. Fractions must be nonnegative and sum to 1 within 0.001 for printed rounding; non-unity sums are flagged and used as entered without normalization. Entered EF is available for a verified factor. The original source catalogue is retained unchanged.

Opening AADT = survey AADT × (1+r)^delay. Growth sum = [(1+r)^n−1]/r, or n at zero growth. Design Trafficᵢ = 365 × opening AADTᵢ × growth sum, in cumulative two-way vehicles. CESALᵢ = Design Trafficᵢ × EFᵢ before distribution. Total CESAL, W18 = ΣCESALᵢ × DD × DL. The summary also shows the undistributed two-way vehicle total. Full precision is retained; DD and DL apply once.

Load Attached Example explicitly populates survey/opening 2025, n=20, growth=3.8%, DD=DL=0.5; code 1-2 AADT=2,197/GVW=33,300 kg; code 11-2 AADT=1,865/GVW=40,600 kg with fractions 0.168, 0.2981, 0.2793, 0.2538 (sum 0.9992). Total = 140,432,208.594 ESAL, rounded to 140,432,209 as in the attached worksheet. These example inputs are not project defaults.

The Apply to Rigid Pavement, Download Summary CSV and Print/PDF buttons are removed, along with the formula notes beneath the totals. Calculation Steps appear only after a trusted Developer Mode message from the parent toolkit. They show the project factors, substituted per-case growth/EF/CESAL calculations, missing EF status and total W18. Exiting Developer Mode hides and collapses the steps. Standalone pages keep the steps hidden.

The shared engine retains compatibility helpers for prior class calculations, but the old vehicle-class interface and its scripts are removed. Run the traffic/configuration regression checks before updating formulas or catalogue data.

Annual growth defaults to 2% and Clear restores 2%. The attached example explicitly uses 3.8% to reproduce its source result. Project Name is removed from inputs and the summary heading.

The configuration worksheet starts with three blank loading cases. Loading the attached example replaces these with its two positive-AADT cases. The summary table uses aligned numeric columns and explicit units; Total CESAL and CESAL W18 appear below it. W18 equals the completed total design-lane CESAL, with DD/DL already applied; incomplete EF inputs leave W18 pending. The growth chart follows the table/results and includes calendar-year ticks plus survey, opening and projected-end cards with years, AADT and forecast duration.

Input guidance is visible below the project fields and above the loading-case table. The former question-mark buttons and modal guide have been removed; project inputs link to their help text with aria-describedby.

The chart legend lists total and individual included loading cases with survey/opening/projected AADT. “Show all vehicles + total” controls the per-case series and legend entries; switching it off keeps only the total and never changes CESAL/W18. Repeated vehicle codes remain distinct loading cases, identified by case number and GVW. On smaller screens the legend moves below the chart.

Terminology follows the supplied CESAL/W18 concept (citing DO 22, series of 2011): Design Trafficᵢ = 365 × opening AADTᵢ × G, in cumulative two-way vehicles; CESALᵢ = Design Trafficᵢ × EFᵢ before distribution; W18 = ΣCESALᵢ × DD × DL, in design-lane ESALs. The summary now shows these stages separately. Existing ESAL totals, units, route IDs, stored values and the forecasting engine are preserved. Where survey traffic predates opening, opening AADT is projected first. The zero-growth limit remains G = n.

The worksheet follows four linked stages: (1) Design Traffic with survey/opening/growth inputs and vehicle counts, (2) EF with linked GVW/axle shares or adopted factors, (3) DD/DL, and (4) CESAL/W18 summary. Adding, changing or removing a vehicle case synchronizes both input tables. First-stage cumulative vehicles remain viewable if later EF/distribution inputs are incomplete. The chart area retains total/per-case AADT lines and adds a labeled Gantt calendar for survey, pre-opening projection, in-service CESAL accumulation and projected end. It depicts traffic periods, not a construction schedule.
