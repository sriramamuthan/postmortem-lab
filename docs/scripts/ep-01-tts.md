# EP-01: Ariane 5 (ElevenLabs version)

Generated with `npm run tts -- ../docs/scripts/ep-01-tts.md` in `video/`. Numbers spelled out, names written as they
sound. `<break time="…" />` marks the pause after a line; the generator inserts it as exact silence (tags are not sent). Every claim traces to `incidents/01-ariane-5/README.md`.

---

### 01 · Cold open

Two computers. Identical hardware. Identical software. <break time="0.4s" />
One active, one standing by, so that if one fails, the other takes over. <break time="0.6s" />
On the fourth of June, nineteen ninety-six, Ariane Five carried both. <break time="0.5s" />
Thirty-six point seven seconds after ignition, the backup hit a number too big for its box, and shut itself down. <break time="0.5s" />
One cycle later, the active one hit the same number, and did the same. <break time="0.6s" />
Same code. Same number. Same moment. <break time="0.4s" />
By thirty-nine seconds, the rocket was coming apart. <break time="1.2s" />

### 02 · Intro

I'm Ram, and this is Post-Mortem Lab, episode one. <break time="0.5s" />
Today we rebuild Ariane Five's guidance system as code, fly it, crash it, and fix it three different ways. <break time="0.4s" />
Every fact comes from the inquiry board's report. <break time="1.0s" />

### 03 · Borrowed code

Start with the software. <break time="0.3s" />
The inertial reference system, the S.R.I., tells the rocket which way it's pointing. <break time="0.4s" />
Ariane Five's was practically the same as Ariane Four's. <break time="0.3s" />
Proven hardware. Proven code. <break time="0.8s" />
Inside it was a function called alignment. <break time="0.3s" />
It only does useful work before lift-off. <break time="0.4s" />
But on Ariane Four, it kept running for about forty seconds of flight, so a countdown on hold could restart quickly. <break time="0.5s" />
Ariane Five didn't need that. <break time="0.3s" />
The code stayed anyway, for commonality. <break time="1.0s" />

### 04 · The number

Every cycle, that routine worked out a number from how fast the rocket was moving sideways. <break time="0.3s" /> The report calls it the horizontal bias, or B.H. <break time="0.4s" />
Then it squeezed that number into a sixteen bit integer: a small box for whole numbers. <break time="0.5s" />
The biggest number that fits is thirty-two thousand, seven hundred and sixty-seven. <break time="0.8s" />
Seven conversions like this had been flagged as risky. <break time="0.3s" />
Four got a check. <break time="0.3s" />
Three didn't, to keep the computer less than eighty percent busy. <break time="0.4s" />
B.H. was one of the three. <break time="0.4s" />
The reasoning was that it could never get that big. <break time="0.3s" />
In the report's words, that reasoning turned out to be faulty. <break time="1.0s" />

### 05 · The flight

Here's why. <break time="0.3s" />
Ariane Five builds up horizontal speed five times faster than Ariane Four. <break time="0.5s" />
Let's fly it. <break time="0.6s" />
Lift-off. <break time="0.4s" /> B.H. climbs. <break time="0.4s" />
At thirty-six point seven seconds, it crosses the limit. <break time="0.3s" /> Operand error: the number doesn't fit. <break time="0.5s" />
The rule for any error was simple: report it, save the details, and shut the computer down. <break time="0.5s" />
That's sensible for a hardware fault, because the backup takes over. <break time="0.4s" />
But the backup was running the same code, on the same numbers. <break time="0.3s" />
It had already shut down, one cycle earlier. <break time="1.0s" />

### 06 · Garbage in

Now there's no working guidance computer left. <break time="0.4s" />
And the main one isn't sending directions any more. It's sending an error report. <break time="0.5s" />
The flight computer reads that error report as directions. <break time="0.3s" />
It sees a huge course error that isn't there, and swings the engine nozzles all the way to one side. <break time="0.5s" />
The nose swings more than twenty degrees off the direction of travel. <break time="0.3s" />
At thirty-nine seconds, the boosters tear away, and the self-destruct fires. <break time="1.2s" />

### 07 · Ariane Four

Same code on Ariane Four? <break time="0.4s" />
In our model, B.H. stays around a third of the limit. <break time="0.3s" /> It flies, every time. <break time="0.5s" />
That's why nobody saw it coming. <break time="0.3s" />
Ariane Five's trajectory wasn't in the system's specification, and the system was never tested with it. <break time="1.0s" />

### 08 · Three fixes

So, let's fix it. <break time="0.5s" />
Fix one: check the number, like the other four. <break time="0.3s" /> It stops at the limit instead of crashing. <break time="0.5s" />
Fix two, the board's first recommendation: switch alignment off at lift-off. <break time="0.3s" />
Code that isn't needed shouldn't be running. <break time="0.5s" />
Fix three: never go silent. <break time="0.3s" /> On an error, keep sending your best estimate, and keep flying. <break time="0.6s" />
Any one of them saves the rocket. <break time="0.4s" />
And each one has a test that fails without it. <break time="1.0s" />

### 09 · Lesson

Here's the lesson I'm keeping. <break time="0.5s" />
A backup that runs the same code on the same inputs protects you from hardware faults. <break time="0.3s" />
Not from your own bugs. <break time="0.4s" />
Both copies fail together. <break time="1.0s" />
The simulation is on paramlab dot dev. <break time="0.3s" /> Fly it yourself, then try to break it a new way. <break time="0.5s" />
Next episode: a spacecraft lost to a mix-up between pounds and newtons. <break time="0.6s" />
Go break something.
