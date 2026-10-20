/**
 * Ariane 5 flight 501, the first 45 seconds, as a deterministic simulation.
 *
 * Times are seconds from H0 (main engine ignition), as in the inquiry board report.
 *
 * From the report: two identical inertial reference systems (SRIs); SRI 2 active, SRI 1 in hot standby. Their alignment
 * function runs for 50 s after flight mode starts at H0 - 3 s, so about 40 s into flight, though it is useless after
 * lift-off. It converts the horizontal bias BH from a 64-bit float to a 16-bit signed integer without protection.
 * On Ariane 5's faster trajectory BH overflows at H0 + 36.7 s: SRI 1 fails, then SRI 2 one data cycle (72 ms) later.
 * Each SRI shuts down and sends a diagnostic bit pattern, which the on-board computer (OBC) reads as flight data. It
 * commands full nozzle deflection, the angle of attack passes 20 degrees, and the launcher breaks up at H0 + 39 s.
 *
 * Simplified (the real values are in the board's restricted technical report):
 * - BH is modelled as proportional to the square of time since lift-off, calibrated so Ariane 5 crosses the int16
 *   limit at H0 + 36.7 s. Ariane 4 builds horizontal velocity five times more slowly, as the report states.
 * - Lift-off at H0 + 7 s (the report: H0 + 36.7 s is "approx. 30 seconds after lift-off").
 * - The SRIs' cycle offset and the attitude response are tuned to match the report's timings, not derived from physics.
 */
import { HotStandby, OperandError, toIntChecked, toIntSaturating, type Unit } from '@postmortem-lab/toolkit';

export const LIFT_OFF = 7;
export const FLIGHT_MODE_START = -3;
export const ALIGNMENT_SECONDS = 50;
export const CYCLE = 0.072; // SRI data cycle
export const BREAKUP_ANGLE = 20; // degrees of angle of attack
const END = 45;

export interface Launcher {
  name: string;
  /** How fast horizontal velocity builds up early in flight, relative to Ariane 4. */
  horizontalBuildUp: number;
}

export const ARIANE_4: Launcher = { name: 'Ariane 4', horizontalBuildUp: 1 };
export const ARIANE_5: Launcher = { name: 'Ariane 5', horizontalBuildUp: 5 };

/** The board's recommendations and the obvious code fix, each switchable. */
export interface Fixes {
  /** Protect the BH conversion like the other four variables (saturate instead of raising Operand Error). */
  protectConversion?: boolean;
  /** R1: switch off the alignment function at lift-off. */
  stopAlignmentAtLiftOff?: boolean;
  /** R3: never stop sending best-effort data; handle the exception and keep flying. */
  bestEffortData?: boolean;
}

export interface FlightEvent {
  t: number;
  source: 'SRI 1' | 'SRI 2' | 'OBC' | 'Launcher';
  message: string;
}

export interface Sample {
  t: number;
  /** BH as the SRIs compute it (the 64-bit value, before conversion); 0 when alignment is not running. */
  bh: number;
  sri1: 'ok' | 'failed';
  sri2: 'ok' | 'failed';
  active: 'SRI 1' | 'SRI 2';
  /** Nozzle deflection as a fraction of full travel. */
  boosters: number;
  vulcain: number;
  angleOfAttack: number;
}

export interface FlightResult {
  launcher: string;
  outcome: 'nominal' | 'lost';
  breakupAt?: number;
  events: FlightEvent[];
  samples: Sample[];
}

// Calibrated so Ariane 5's BH passes 32,767 at H0 + 36.70 s (see the header).
const BH_SCALE = 32767.5 / (ARIANE_5.horizontalBuildUp * (36.7 - LIFT_OFF) ** 2);

export function horizontalBias(t: number, launcher: Launcher): number {
  const s = Math.max(0, t - LIFT_OFF);
  return BH_SCALE * launcher.horizontalBuildUp * s * s;
}

type SriOutput = { kind: 'attitude' } | { kind: 'diagnostic' };

class Sri implements Unit<SriOutput> {
  failedAt: number | undefined;
  lastBh = 0;
  #handled = false;

  readonly name: 'SRI 1' | 'SRI 2';
  readonly phase: number;
  readonly #launcher: Launcher;
  readonly #fixes: Fixes;
  readonly #log: (e: FlightEvent) => void;

  constructor(name: 'SRI 1' | 'SRI 2', phase: number, launcher: Launcher, fixes: Fixes, log: (e: FlightEvent) => void) {
    this.name = name;
    this.phase = phase;
    this.#launcher = launcher;
    this.#fixes = fixes;
    this.#log = log;
  }

  healthy() {
    return this.failedAt === undefined;
  }

  output(): SriOutput {
    return this.healthy() ? { kind: 'attitude' } : { kind: 'diagnostic' };
  }

  /** One SRI computing cycle at time t. */
  cycle(t: number) {
    if (!this.healthy()) return;
    const alignmentEnd = this.#fixes.stopAlignmentAtLiftOff ? LIFT_OFF : FLIGHT_MODE_START + ALIGNMENT_SECONDS;
    if (t < FLIGHT_MODE_START || t >= alignmentEnd) {
      this.lastBh = 0;
      return;
    }
    this.lastBh = horizontalBias(t, this.#launcher);
    try {
      if (this.#fixes.protectConversion) toIntSaturating(this.lastBh);
      else toIntChecked(this.lastBh);
    } catch (e) {
      if (!(e instanceof OperandError)) throw e;
      if (this.#fixes.bestEffortData) {
        if (this.#handled) return;
        this.#handled = true;
        this.#log({ t, source: this.name, message: 'Operand Error handled; still sending best-effort attitude data' });
        return;
      }
      // The specification: report the failure, store the context, shut the processor down.
      this.failedAt = t;
      this.#log({ t, source: this.name, message: `Operand Error converting BH = ${Math.round(this.lastBh)}; processor shut down` });
    }
  }
}

export function fly(launcher: Launcher, fixes: Fixes = {}): FlightResult {
  const events: FlightEvent[] = [];
  const samples: Sample[] = [];
  const log = (e: FlightEvent) => events.push({ ...e, t: round(e.t) });

  // SRI 2 is active, SRI 1 the hot standby. Their cycles are offset so SRI 1 meets the overflow one cycle earlier.
  const sri1 = new Sri('SRI 1', 0.055, launcher, fixes, log);
  const sri2 = new Sri('SRI 2', 0.033, launcher, fixes, log);
  const bus = new HotStandby<SriOutput>(sri2, sri1);

  let boosters = 0;
  let vulcain = 0;
  let angleOfAttack = 0;
  let diagnosticSince: number | undefined;
  let breakupAt: number | undefined;

  const start = Math.round(FLIGHT_MODE_START / CYCLE);
  for (let k = start; k * CYCLE <= END; k++) {
    const base = k * CYCLE;
    sri1.cycle(base + sri1.phase);
    sri2.cycle(base + sri2.phase);

    // The OBC reads the bus at the end of each cycle.
    const t = base + CYCLE;
    const reading = bus.read();
    if (reading.switched) log({ t, source: 'OBC', message: `Active SRI failed; switched to ${reading.unit.name}` });

    if (reading.value.kind === 'diagnostic' && diagnosticSince === undefined) {
      diagnosticSince = t;
      log({ t, source: 'OBC', message: `No healthy SRI left. Reading ${reading.unit.name}'s diagnostic bit pattern as flight data` });
      log({ t, source: 'OBC', message: 'Commanding full deflection of the booster nozzles' });
    }
    if (diagnosticSince !== undefined && breakupAt === undefined) {
      boosters = 1;
      if (vulcain === 0 && t - diagnosticSince >= 0.3) {
        vulcain = 1;
        log({ t, source: 'OBC', message: 'Commanding full deflection of the Vulcain main engine nozzle' });
      }
      angleOfAttack += (6.2 * boosters + 3 * vulcain) * CYCLE;
      if (angleOfAttack > BREAKUP_ANGLE) {
        breakupAt = round(t);
        log({ t, source: 'Launcher', message: `Angle of attack over ${BREAKUP_ANGLE}°: boosters separate, self-destruct triggered` });
      }
    }

    samples.push({
      t: round(t),
      bh: sri2.lastBh,
      sri1: sri1.healthy() ? 'ok' : 'failed',
      sri2: sri2.healthy() ? 'ok' : 'failed',
      active: bus.active.name as 'SRI 1' | 'SRI 2',
      boosters,
      vulcain,
      angleOfAttack: round(angleOfAttack),
    });
    if (breakupAt !== undefined) break;
  }

  const result: FlightResult = { launcher: launcher.name, outcome: breakupAt === undefined ? 'nominal' : 'lost', events, samples };
  if (breakupAt !== undefined) result.breakupAt = breakupAt;
  return result;
}

const round = (x: number) => Math.round(x * 1000) / 1000;
