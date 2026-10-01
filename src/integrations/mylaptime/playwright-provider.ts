import type { TimingProvider, TimingSnapshot } from "@/domain/timing/types";
import { extractMyLapTimeSnapshot } from "./extractor";

export type HtmlPage = {
  content(): Promise<string>;
};

export type Clock = {
  now(): number;
};

export class MyLapTimePlaywrightProvider implements TimingProvider {
  constructor(
    private readonly page: HtmlPage,
    private readonly clock: Clock = Date,
  ) {}

  async getSnapshot(): Promise<TimingSnapshot> {
    const html = await this.page.content();
    return extractMyLapTimeSnapshot(html, this.clock.now());
  }
}
