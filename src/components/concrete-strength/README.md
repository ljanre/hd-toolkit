# Determining S′c

The tool now defaults to **Reliability Linked** mode with f′c=24 MPa and R=92%. It uses the supplied pavement R–ZR table (50–99.99%, with linear interpolation), z=|ZR| and PS=100−R. It reproduces the Rigid Pavement strength calculation and can transfer both f′c and R. The notes state that this requested coupling does not independently estimate measured material variability. Manual mode retains custom PS/z and the original 24 MPa, PS=10%, z=1.476 example. In Manual mode, transfer sends f′c only; the pavement's own R governs its strength result. Exports record the mode, reliability (when linked), z and PS.

Independent offline tool implementing the user's supplied Determining S′c Procedure screenshot. The source procedure is the governing implementation reference; the correlations are estimates, not independently validated material test results.

Input f′c is MPa, variability PS is entered as a percentage, and z is a nonnegative magnitude. Sc = 0.78√f′c in MPa; convert with the supplied factor 145.038 psi/MPa. SDs = (PS/100)Sc in psi. Mean S′c = Sc + z SDs. Ec = 57,000√f′c where f′c is in psi; output also shows million psi and GPa.

The supplied example (24 MPa, PS=10%, custom z=1.476) reproduces mean S′c≈636.023 psi and Ec≈3,362,957.491 psi. The screenshot's z=1.476 differs from its table value for the 10% strength-distribution percentile (z=1.282). The UI separates the variability ratio from the strength percentile. Table selection changes z only. Default values explicitly reproduce the example, rather than being project recommendations.

Edit `index.html`, `strength.css`, and `strength.js` for presentation. `engine.js` contains the pure calculation and supplied table; `component.js` provides isolation. Use the result button to send S′c and Ec to the rigid calculator, or export JSON. Test with `node scripts/verify-strength.mjs`.
