import { NextRequest, NextResponse } from "next/server";
import { exportRace } from "@/server/race-store";
import { median } from "@/domain/strategy/analysis";

/*
 * Ritmo relativo por kart, agregado dos snapshots que o worker grava em data/*.jsonl.
 * GET /api/kart-pace?track=camburi  → { generatedAt, filter, sessions, byKart[] }.
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const track = (request.nextUrl.searchParams.get("track") ?? "").toLowerCase();
  const race=await exportRace();const venue=race.config.venue.toLowerCase();
  const valid=Object.values(race.laps).flat().filter(l=>l.kind==="normal"&&!l.excluded&&l.lapTimeMs!=null&&l.kartNumber);
  const reference=median(valid.map(l=>l.lapTimeMs));const groups=new Map<string,number[]>();
  for(const lap of valid){const group=groups.get(lap.kartNumber!)??[];group.push(lap.lapTimeMs!);groups.set(lap.kartNumber!,group);}
  const byKart=reference&&(!track||venue.includes(track))?[...groups.entries()].map(([number,values])=>({track:race.config.venue,number,relPace:median(values)!/reference,sessions:1,laps:values.length})).sort((a,b)=>a.relPace-b.relPace):[];
  return NextResponse.json({generatedAt:new Date().toISOString(),filter:track||null,sessions:valid.length?1:0,byKart});
}
