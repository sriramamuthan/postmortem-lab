/**
 * Mars Climate Orbiter's cruise to Mars as a deterministic simulation.
 *
 * From the board's report: to unload its spinning reaction wheels, the spacecraft fired small thrusters (an
 * "angular momentum desaturation", AMD). Ground software called SM_FORCES wrote the size of each push (the impulse) to a
 * file. The interface specification said newton-seconds; SM_FORCES wrote pound-force seconds. Navigation read the
 * numbers as newton-seconds, so it under-counted every push by a factor of 4.45. Because the solar array was lopsided,
 * these firings happened 10-14 times more often than expected. The unseen pushes added up over nine months: navigation
 * aimed for a closest approach of 226 km, and the spacecraft reached about 57 km. The minimum survivable was 80 km.
 *
 * Simplified (illustrative, tuned to the report's numbers): the impulse per firing, the number of firings, and how
 * unmodelled impulse turns into lost altitude. We model altitude loss as proportional to total unmodelled impulse,
 * calibrated so the as-flown run reaches 57 km.
 */
import { expectUnit, impulse, NEWTONS_PER_POUND_FORCE, toNewtonSeconds, UnitError, type ImpulseUnit } from '@postmortem-lab/toolkit';

export const CRUISE_DAYS = 286; // 11 Dec 1998 launch to 23 Sep 1999 orbit insertion
export const PLANNED_ALTITUDE = 226; // km, closest approach navigation aimed for
export const SURVIVABLE_ALTITUDE = 80; // km
export const AS_FLOWN_ALTITUDE = 57; // km, the board's reconstruction

/** Firings per day as flown (illustrative), and how often navigation expected them (12x fewer, inside the 10-14x). */
export const FIRINGS_PER_DAY_AS_FLOWN = 0.5;
export const FIRINGS_PER_DAY_EXPECTED = FIRINGS_PER_DAY_AS_FLOWN / 12;

/** True impulse of one firing in newton-seconds (illustrative). */
const IMPULSE_PER_FIRING = 0.9;

export interface CruiseOptions {
  /** Units SM_FORCES writes into the file. As flown: 'lbf·s'. As specified: 'N·s'. */
  fileUnits?: ImpulseUnit;
  /** How often the thrusters fire. As flown: FIRINGS_PER_DAY_AS_FLOWN. */
  firingsPerDay?: number;
  /** The fix: navigation checks the unit at the interface and converts, instead of assuming. */
  checkUnits?: boolean;
}

export interface Day {
  day: number;
  firings: number;
  /** Total impulse the spacecraft really got, and what navigation counted (both N·s). */
  trueImpulse: number;
  countedImpulse: number;
  /** Closest approach navigation expects, and where the spacecraft is really heading (km). */
  expectedAltitude: number;
  actualAltitude: number;
}

export interface CruiseResult {
  outcome: 'orbit' | 'lost';
  finalAltitude: number;
  firings: number;
  days: Day[];
  /** Set when the unit check caught the mismatch on the first file. */
  unitErrorCaught?: string;
}

// Calibrated: as flown, the unmodelled impulse costs PLANNED - AS_FLOWN = 169 km of altitude.
const asFlownFirings = Math.floor(CRUISE_DAYS * FIRINGS_PER_DAY_AS_FLOWN);
const asFlownUnmodelled = asFlownFirings * IMPULSE_PER_FIRING * (1 - 1 / NEWTONS_PER_POUND_FORCE);
const KM_PER_UNMODELLED_NS = (PLANNED_ALTITUDE - AS_FLOWN_ALTITUDE) / asFlownUnmodelled;

export function cruise(options: CruiseOptions = {}): CruiseResult {
  const fileUnits = options.fileUnits ?? 'lbf·s';
  const rate = options.firingsPerDay ?? FIRINGS_PER_DAY_AS_FLOWN;
  const days: Day[] = [];
  let firings = 0;
  let trueImpulse = 0;
  let countedImpulse = 0;
  let unitErrorCaught: string | undefined;

  for (let day = 1; day <= CRUISE_DAYS; day++) {
    const due = Math.floor(day * rate) - firings;
    for (let i = 0; i < due; i++) {
      firings++;
      trueImpulse += IMPULSE_PER_FIRING;

      // SM_FORCES on the ground writes the impulse bit into the AMD file, in fileUnits.
      const written = fileUnits === 'N·s' ? IMPULSE_PER_FIRING : IMPULSE_PER_FIRING / NEWTONS_PER_POUND_FORCE;
      const record = impulse(written, fileUnits);

      if (options.checkUnits) {
        // The fix: refuse to guess. A mismatch is reported once, then converted explicitly.
        try {
          countedImpulse += expectUnit(record, 'N·s');
        } catch (e) {
          if (!(e instanceof UnitError)) throw e;
          unitErrorCaught ??= `Day ${day}: ${e.message}`;
          countedImpulse += toNewtonSeconds(record);
        }
      } else {
        // As flown: navigation takes the number and assumes newton-seconds, as the specification promised.
        countedImpulse += record.value;
      }
    }
    const unmodelled = trueImpulse - countedImpulse;
    days.push({
      day,
      firings,
      trueImpulse,
      countedImpulse,
      expectedAltitude: PLANNED_ALTITUDE,
      actualAltitude: PLANNED_ALTITUDE - unmodelled * KM_PER_UNMODELLED_NS,
    });
  }

  const finalAltitude = Math.round(days.at(-1)!.actualAltitude);
  const result: CruiseResult = {
    outcome: finalAltitude >= SURVIVABLE_ALTITUDE ? 'orbit' : 'lost',
    finalAltitude,
    firings,
    days,
  };
  if (unitErrorCaught !== undefined) result.unitErrorCaught = unitErrorCaught;
  return result;
}
