# EP-02: Mars Climate Orbiter (ElevenLabs version)

Generated with `npm run tts -- ../docs/scripts/ep-02-tts.md` in `video/`. About 2 minutes; the page carries the detail.
`<break time="…" />` marks the pause after a line; the generator inserts it as exact silence (tags are not sent). Every
claim traces to `incidents/02-mars-climate-orbiter/README.md`.

---

### 01 · Cold open

September twenty-third, nineteen ninety-nine. <break time="0.5s" />
After nine months in space, NASA's Mars Climate Orbiter fires its engine to slip into orbit around Mars. <break time="0.6s" />
It goes behind the planet, forty-nine seconds early. <break time="0.5s" />
And it's never heard from again. <break time="1.0s" />

### 02 · Intro

I'm Ram, and this is Post-Mortem Lab, episode two. <break time="0.4s" />
This one comes down to a single unit. <break time="1.0s" />

### 03 · The file

Again and again during the trip, small thrusters gave the spacecraft a nudge. <break time="0.4s" />
A program on the ground wrote the size of each nudge into a file for the navigation team. <break time="0.5s" />
The agreement between them said metric: newton-seconds. <break time="0.4s" />
The program wrote pound-force seconds. <break time="0.5s" />
One pound-force is about four and a half newtons. <break time="0.4s" />
So every nudge was counted at less than a quarter of its real size. <break time="1.0s" />

### 04 · The drift

One nudge, no problem. <break time="0.4s" />
But the thrusters fired far more often than planned, and the error added up, nudge by nudge, for nine months. <break time="0.6s" />
Navigation aimed for two hundred and twenty-six kilometres above Mars. <break time="0.4s" />
The spacecraft came in at about fifty-seven. <break time="0.4s" />
Below eighty, the atmosphere destroys it. <break time="1.0s" />

### 05 · The fix

The fix is almost boring. <break time="0.4s" />
Make every number carry its unit, and check it when it crosses from one program to another. <break time="0.5s" />
In our simulation, that check catches the mistake on day two, not day two hundred and eighty-six. <break time="1.0s" />

### 06 · Close

The lesson: a specification that says metric doesn't make the data metric. <break time="0.4s" /> Check at the boundary. <break time="0.8s" />
Fly the cruise yourself on paramlab dot dev. <break time="0.4s" />
Next time: a missile defence clock that drifted by a third of a second. <break time="0.5s" />
Go break something.
