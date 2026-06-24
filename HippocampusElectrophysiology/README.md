# HippocampusElectrophysiology
A code that mimics electrical response of an hippocampal neuron in response to remembered and unremembered words
The code uses a speech recognition algorithm for hebrew words.
If the word is one of these: ["פיל", "נסיכה", "ערב", "מצלמה", "חיתול"]
He'll send Microbit 'S', 15 times, in 100 ms intervals.
Otherwise it will send 'C' in the same timing.
 
The code on the Microbit will respond according to the codeForMicrobit.hex file (stormy response to S, calm response to C)

link: 
