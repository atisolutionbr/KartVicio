import type { TimingProvider, TimingSnapshot } from "./types";

export class MockTimingProvider implements TimingProvider {
  private cursor = 0;

  constructor(private readonly snapshots: TimingSnapshot[]) {}

  async getSnapshot(): Promise<TimingSnapshot | null> {
    if (this.cursor >= this.snapshots.length) return null;

    const snapshot = this.snapshots[this.cursor];
    this.cursor += 1;
    return snapshot ?? null;
  }

  reset(): void {
    this.cursor = 0;
  }
}

export async function replaySnapshots(
  provider: TimingProvider,
): Promise<TimingSnapshot[]> {
  const snapshots: TimingSnapshot[] = [];

  for (;;) {
    const snapshot = await provider.getSnapshot();
    if (!snapshot) return snapshots;
    snapshots.push(snapshot);
  }
}
