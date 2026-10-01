export type DriverId = string;
export type EntryId = string;
export type StintId = string;

export type StrategyRole = "leader" | "attack" | "support" | "recovery";

export type StrategyMode = "participation" | "performance";

export type Driver = {
  id: DriverId;
  name: string;
  rating?: number;
};

export type Entry = {
  id: EntryId;
  number: string;
  role: StrategyRole;
};

export type Stint = {
  id: StintId;
  entryId: EntryId;
  driverId: DriverId;
  startedAtMs: number;
  endedAtMs?: number;
};

export type RoleChange = {
  entryId: EntryId;
  role: StrategyRole;
  changedAtMs: number;
};

export type TeamState = {
  drivers: Driver[];
  entries: Entry[];
  stints: Stint[];
  roleChanges: RoleChange[];
  strategyMode: StrategyMode;
};

export type AssignmentResult =
  | { ok: true; state: TeamState; stint: Stint }
  | { ok: false; reason: AssignmentError };

export type AssignmentError =
  | "entry-not-found"
  | "driver-not-found"
  | "entry-already-active"
  | "driver-already-active";

export function createTeamState(params: {
  drivers: Driver[];
  entries: Entry[];
  strategyMode?: StrategyMode;
}): TeamState {
  return {
    drivers: params.drivers,
    entries: params.entries,
    stints: [],
    roleChanges: [],
    strategyMode: params.strategyMode ?? "participation",
  };
}

export function assignDriverToEntry(
  state: TeamState,
  params: {
    stintId: StintId;
    entryId: EntryId;
    driverId: DriverId;
    startedAtMs: number;
  },
): AssignmentResult {
  if (!state.entries.some((entry) => entry.id === params.entryId)) {
    return { ok: false, reason: "entry-not-found" };
  }

  if (!state.drivers.some((driver) => driver.id === params.driverId)) {
    return { ok: false, reason: "driver-not-found" };
  }

  if (getActiveStintForEntry(state, params.entryId)) {
    return { ok: false, reason: "entry-already-active" };
  }

  if (getActiveStintForDriver(state, params.driverId)) {
    return { ok: false, reason: "driver-already-active" };
  }

  const stint: Stint = {
    id: params.stintId,
    entryId: params.entryId,
    driverId: params.driverId,
    startedAtMs: params.startedAtMs,
  };

  return {
    ok: true,
    stint,
    state: {
      ...state,
      stints: [...state.stints, stint],
    },
  };
}

export function endActiveStint(
  state: TeamState,
  params: {
    entryId: EntryId;
    endedAtMs: number;
  },
): TeamState {
  return {
    ...state,
    stints: state.stints.map((stint) => {
      if (stint.entryId !== params.entryId || stint.endedAtMs != null) {
        return stint;
      }

      return {
        ...stint,
        endedAtMs: params.endedAtMs,
      };
    }),
  };
}

export function changeEntryRole(
  state: TeamState,
  params: {
    entryId: EntryId;
    role: StrategyRole;
    changedAtMs: number;
  },
): TeamState {
  return {
    ...state,
    entries: state.entries.map((entry) =>
      entry.id === params.entryId ? { ...entry, role: params.role } : entry,
    ),
    roleChanges: [
      ...state.roleChanges,
      {
        entryId: params.entryId,
        role: params.role,
        changedAtMs: params.changedAtMs,
      },
    ],
  };
}

export function setStrategyMode(
  state: TeamState,
  strategyMode: StrategyMode,
): TeamState {
  return {
    ...state,
    strategyMode,
  };
}

export function getActiveStintForEntry(
  state: TeamState,
  entryId: EntryId,
): Stint | undefined {
  return state.stints.find(
    (stint) => stint.entryId === entryId && stint.endedAtMs == null,
  );
}

export function getActiveStintForDriver(
  state: TeamState,
  driverId: DriverId,
): Stint | undefined {
  return state.stints.find(
    (stint) => stint.driverId === driverId && stint.endedAtMs == null,
  );
}

export function getDriverTotalTimeMs(
  state: TeamState,
  driverId: DriverId,
  nowMs: number,
): number {
  return state.stints
    .filter((stint) => stint.driverId === driverId)
    .reduce((total, stint) => {
      const endedAtMs = stint.endedAtMs ?? nowMs;
      return total + Math.max(0, endedAtMs - stint.startedAtMs);
    }, 0);
}
