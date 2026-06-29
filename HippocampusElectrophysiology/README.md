# HippocampusElectrophysiology
A code that mimics electrical response of an hippocampal neuron in response to remembered and unremembered words
The code uses a speech recognition algorithm for hebrew words.
If the word is one of these: ["פיל", "נסיכה", "ערב", "מצלמה", "חיתול"]
He'll send Microbit 'S', 15 times, in 100 ms intervals.
Otherwise it will send 'C' in the same timing.
 
The code on the Microbit will respond according to the codeForMicrobit.hex file (stormy response to S, calm response to C)

link: https://moachteachers.github.io/FindTheArea/HippocampusElectrophysiology/


embed:

<iframe
src="https://moachteachers.github.io/FindTheArea/HippocampusElectrophysiology/index.html"
width="100%"
height="700"
style="border:0;"
allow="microphone; serial; usb; fullscreen"
allowfullscreen>
</iframe>
