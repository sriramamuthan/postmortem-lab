/**
 * Hot-standby redundancy: one unit is active, an identical one waits, and the reader switches over when the active
 * unit reports a failure. This protects against random hardware faults. It does nothing for a design fault that both
 * units share, because the standby fails the same way.
 */

export interface Unit<T> {
  readonly name: string;
  /** False once the unit has declared itself failed. */
  healthy(): boolean;
  /** What the unit is currently sending, even after it has failed. */
  output(): T;
}

export interface Reading<T> {
  unit: Unit<T>;
  value: T;
  /** True when this read switched to the standby. */
  switched: boolean;
  /** True when every unit has failed and the value came from a failed unit. */
  degraded: boolean;
}

export class HotStandby<T> {
  #active: Unit<T>;
  #standby: Unit<T>;

  constructor(active: Unit<T>, standby: Unit<T>) {
    this.#active = active;
    this.#standby = standby;
  }

  get active(): Unit<T> {
    return this.#active;
  }

  /**
   * Read from the active unit. If it has failed and the standby is healthy, switch first. If both have failed there is
   * nothing to switch to: the reader gets whatever the failed active unit is sending.
   */
  read(): Reading<T> {
    let switched = false;
    if (!this.#active.healthy() && this.#standby.healthy()) {
      [this.#active, this.#standby] = [this.#standby, this.#active];
      switched = true;
    }
    return { unit: this.#active, value: this.#active.output(), switched, degraded: !this.#active.healthy() };
  }
}
