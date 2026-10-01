import { NextResponse, type NextRequest } from "next/server";
import { readRace, operateRace, exportRace, type Operation } from "@/server/race-store";
export const dynamic="force-dynamic";
export const runtime="nodejs";
const commands=new Set(["configure","team-save","team-delete","driver-save","driver-delete","select-team","driver-change","pit-enter","pit-exit","pit-cancel","lap-exclude","clock","strategy-mode","incident","reset","simulation","import","playback","normalized-laps","restore"]);
export async function GET(request:NextRequest) {
  try {
    if(request.nextUrl.searchParams.get("export")==="1")return NextResponse.json(await exportRace(),{headers:{"content-disposition":'attachment; filename="kart-vicio-race.json"',"cache-control":"no-store"}});
    return NextResponse.json(await readRace(),{headers:{"cache-control":"no-store"}});
  } catch(error){console.error("race-read",error instanceof Error?error.message:"error");return NextResponse.json({error:"Falha na persistência da sessão."},{status:500});}
}
export async function POST(request:NextRequest) {
  try {
    if(Number(request.headers.get("content-length")??0)>25*1024*1024)return NextResponse.json({error:"Arquivo excede 25 MB."},{status:413});
    const body=await request.json();
    if(!body||!commands.has(body.type))return NextResponse.json({error:"Comando inválido."},{status:400});
    return NextResponse.json(await operateRace(body as Operation));
  } catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Operação inválida."},{status:400});}
}
