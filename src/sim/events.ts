/**
 * Discriminated union of everything the simulation can report to presentation
 * (ARCHITECTURE §4 event catalogue). M0 has no gameplay, so the catalogue is still empty;
 * each milestone adds its members here (e.g. `PlayerFired` in M1).
 */
export type SimEvent = never;
