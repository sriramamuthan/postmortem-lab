"""Print the pauses in a narration WAV as a cue sheet, so scenes can be timed to the voice.

Usage: python3 scripts/cues.py public/audio/ep-01.wav [min_pause_seconds]
Convert an ElevenLabs MP3 first: afconvert -f WAVE -d LEI16 in.mp3 public/audio/ep-01.wav
"""
import array
import json
import math
import sys
import wave

path = sys.argv[1]
min_pause = float(sys.argv[2]) if len(sys.argv) > 2 else 0.3
SILENCE = 0.004  # RMS below this (about -48 dBFS) counts as a pause
WINDOW = 0.05  # seconds

with wave.open(path) as w:
    rate, channels = w.getframerate(), w.getnchannels()
    samples = array.array('h', w.readframes(w.getnframes()))[::channels]

step = int(rate * WINDOW)
pauses, start = [], None
for i in range(0, len(samples) - step, step):
    chunk = samples[i : i + step]
    rms = math.sqrt(sum(x * x for x in chunk) / step) / 32768
    t = i / rate
    if rms < SILENCE:
        start = t if start is None else start
    else:
        if start is not None and t - start >= min_pause:
            pauses.append({'from': round(start, 2), 'to': round(t, 2)})
        start = None

# Each line of speech starts where a pause ends; those are the cue points for scenes.
print(json.dumps({'duration': round(len(samples) / rate, 2), 'pauses': pauses}, indent=2))
