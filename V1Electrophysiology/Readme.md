The code uses the built in microbit lightsensor to test the light level.
On intialization, the microbit will measure the baseline light level for 3 seconds (calibration). 
Following calibration, if the sensor detects a strong light, it would send 'S' to the microbit for 2 seconds.
Afterwards, it would send 'C' until the light returns to baseline levels 
 
The code on the Microbit will respond according to the codeForMicrobit-v1electro.hex file (stormy response to S, calm response to C).
Note that there is an additional required part to the Hex code, that captures the light from the sensor and sends it to the browser.
Therefore, this Hex code is not interchangable with other 'S'/'C' codes.

link: https://moachteachers.github.io/FindTheArea/V1Electrophysiology/
