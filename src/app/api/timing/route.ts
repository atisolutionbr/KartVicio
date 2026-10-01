import { NextResponse, type NextRequest } from "next/server";
import { operateRace, readRace, snapshotFromView } from "@/server/race-store";
export const dynamic="force-dynamic";
export async function GET(){const race=await readRace();return NextResponse.json({snapshots:[race.latestSnapshot??snapshotFromView(race)]});}
export async function POST(request:NextRequest){
  try {
    if(Number(request.headers.get("content-length")??0)>4*1024*1024)return NextResponse.json({error:"Lote excede 4 MB."},{status:413});
    const body=await request.json();
    if(body.laps)await operateRace({type:"normalized-laps",laps:body.laps});
    else if(body.snapshot)await operateRace({type:"snapshot",snapshot:body.snapshot});
    else return NextResponse.json({error:"Envie snapshot ou laps normalizados."},{status:400});
    return NextResponse.json({accepted:true},{status:202});
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Dados inválidos."},{status:400});}
}
export async function DELETE(){return NextResponse.json({error:"Use Nova sessão na tela Replay, após exportar um backup."},{status:405});}
