import type { TimingProvider, TimingSnapshot } from "@/domain/timing/types";
import { extractMyLapTimeSnapshot } from "./extractor";

export type HtmlFrame = {
  html: string;
  capturedAtMs: number;
};

export class MyLapTimeHtmlProvider implements TimingProvider {
  private cursor = 0;

  constructor(private readonly frames: HtmlFrame[]) {}

  async getSnapshot(): Promise<TimingSnapshot | null> {
    const frame = this.frames[this.cursor];
    if (!frame) return null;

    this.cursor += 1;
    return extractMyLapTimeSnapshot(frame.html, frame.capturedAtMs);
  }

  reset(): void {
    this.cursor = 0;
  }
}
