# Alignment Curve Checker

Public Geometry tool with an editable curve-elements schedule, PI-coordinate and sequential reconstruction, DMS/station parsing, equal-scale plan plot, CSV export and printing.

Four automatic checklist rows cover compound radius, reverse tangents, absence of short same-direction (broken-back) tangents, and horizontal sight offset. Yes/No applies only to the stated screen. N/A means the configuration is absent; missing or out-of-scope data remains Not evaluated.

Project screens default to 30 m tangent and a 1.5 larger/smaller compound-radius ratio from the supplied brief. These do not establish comprehensive DPWH compliance. Sight offset requires explicit inside-lane path radius Rs, required sight distance S and available minimum clear offset. HSO = Rs[1 - cos(S/(2Rs))], with radians, is applied only within one circular curve (S <= Rs times delta). No design-speed SSD, vertical visibility or transition-spanning sightline is inferred.

References: FHWA HIF-22-034 (circular geometry); TxDOT Roadway Design Manual section 4.7.9 (sightline geometry and limitations). Links and assumptions are included in the interface.

Run node scripts/verify-alignment-curve-checker.mjs. It covers 47 scenario groups, including ten independent endpoint rotation benchmarks and ten independent chord/square-root sight-offset comparisons. Full project validation: node scripts/test.mjs and node scripts/build.mjs.

This component has no account backend or credentials. Account-management code from the local sandbox is not included.
