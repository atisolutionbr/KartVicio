import { evaluateStopDuration, getPitWindowStatus } from "./rules";
import { validateConfig, type RaceSession, type RaceLap, type RaceTeam, type RaceDriver, type RaceConfig } from "./session";
import { classifyLap } from "@/domain/pace/performance";

export type RaceCommand =
  | { type: "configure"; config: RaceConfig }
  | { type: "team-save"; team: RaceTeam }
  | { type: "team-delete"; teamId: string }
  | { type: "driver-save"; driver: RaceDriver }
  | { type: "driver-delete"; driverId: string }
  | { type: "select-team"; teamId: string }
  | { type: "driver-change"; teamId: string; driverId: string }
  | { type: "pit-enter"; teamId: string }
  | { type: "pit-exit"; teamId: string; driverId: string; kart: string; checks: { plate: boolean; sensor: boolean; weighed: boolean; ballast: boolean } }
  | { type: "pit-cancel"; teamId: string }
  | { type: "laps"; laps: RaceLap[] }
  | { type: "lap-exclude"; teamId: string; lapNumber: number; excluded: boolean }
  | { type: "clock"; action: "start" | "pause" | "finish" }
  | { type: "strategy-mode"; mode: "performance" | "participation" }
  | { type: "incident"; teamId: string; message: string }
  | { type: "reset" };

export function recordEvent(s: RaceSession, type: string, message: string, teamId?: string, severity: "INFO" | "ATENÇÃO" | "IMPORTANTE" | "CRÍTICO" = "INFO", rule?: string) {
  s.events.push({ id: crypto.randomUUID(), type, elapsedMs: s.elapsedMs, teamId, message, severity, rule });
}
export function activeStint(s: RaceSession, teamId: string) { return s.stints.find(x=>x.teamId===teamId && x.endMs==null); }
export function activePit(s: RaceSession, teamId: string) { return s.pits.find(x=>x.teamId===teamId && x.exitMs==null); }
export function driverTime(s: RaceSession, driverId: string): number {
  return s.stints.filter(x=>x.driverId===driverId).reduce((sum,x)=>sum+Math.max(0,(x.endMs??s.elapsedMs)-x.startMs),0);
}
function requireTeam(s: RaceSession, id: string) {
  const team=s.teams.find(x=>x.id===id); if(!team) throw new Error("Equipe não encontrada."); return team;
}
function finishStint(s: RaceSession, teamId: string) {
  const stint=activeStint(s,teamId); if(!stint) return;
  stint.endMs=s.elapsedMs; stint.endLap=s.laps[teamId]?.at(-1)?.lapNumber??stint.startLap;
  stint.endPosition=s.laps[teamId]?.at(-1)?.position;
  recordEvent(s,"STINT_FINISHED",`Stint encerrado: ${s.drivers.find(d=>d.id===stint.driverId)?.name??stint.driverId}`,teamId);
}
function startStint(s: RaceSession, teamId: string, driverId: string, enforce=true) {
  const team=requireTeam(s,teamId); const driver=s.drivers.find(x=>x.id===driverId);
  if(!driver || !team.driverIds.includes(driverId)) throw new Error("Piloto não pertence à equipe.");
  if(s.stints.some(x=>x.driverId===driverId && x.endMs==null && x.teamId!==teamId)) throw new Error("Piloto já está em outro kart.");
  if(enforce && driver.active===false) throw new Error("Piloto está inativo.");
  if(enforce && driverTime(s,driverId)>=(driver.maximumMs??s.config.driverMaximumMs)) throw new Error("Piloto atingiu o tempo máximo.");
  if(activeStint(s,teamId)?.driverId===driverId) return;
  finishStint(s,teamId);
  s.stints.push({ id:crypto.randomUUID(),teamId,driverId,startMs:s.elapsedMs,startLap:s.laps[teamId]?.at(-1)?.lapNumber??0,startPosition:s.laps[teamId]?.at(-1)?.position });
  recordEvent(s,"DRIVER_CHANGED",`Piloto atual: ${driver.name}`,teamId);
  recordEvent(s,"STINT_STARTED",`Stint iniciado: ${driver.name}`,teamId);
}
export function ingestLap(s: RaceSession, raw: RaceLap, now=Date.now()) {
  const team=requireTeam(s,raw.teamId);
  const history=s.laps[team.id]??(s.laps[team.id]=[]);
  const last=history.at(-1);
  if(last && raw.lapNumber<=last.lapNumber) return false;
  if(!Number.isFinite(raw.raceElapsedMs)||raw.raceElapsedMs<0||!Number.isInteger(raw.lapNumber)||raw.lapNumber<1) throw new Error("Volta/tempo inválidos.");
  s.elapsedMs=Math.max(s.elapsedMs,raw.raceElapsedMs);
  if(s.phase==="ready") { s.phase="running"; recordEvent(s,"RACE_STARTED","Primeiro dado de corrida recebido."); }
  if(raw.pitStatus==="enter" && !activePit(s,team.id)) {
    const prior=activeStint(s,team.id); finishStint(s,team.id);
    s.pits.push({id:crypto.randomUUID(),teamId:team.id,enterMs:s.elapsedMs,oldKart:team.kart,previousDriverId:prior?.driverId,penaltyLaps:0,checks:{plate:false,sensor:false,weighed:false,ballast:false}});
    recordEvent(s,"PIT_ENTER","Entrada no box informada pela fonte.",team.id);
  }
  if(raw.pitStatus==="exit") {
    const pit=activePit(s,team.id);
    if(pit) {
      pit.exitMs=s.elapsedMs; pit.durationMs=pit.exitMs-pit.enterMs;
      const result=evaluateStopDuration(pit.durationMs,s.config);
      const driverChanged=raw.driverId!=null && raw.driverId!==pit.previousDriverId;
      const kartChanged=raw.kartNumber!=null && raw.kartNumber!==pit.oldKart;
      pit.valid=result.countsAsMandatoryStop && (!s.config.requireDriverChange||driverChanged) && (!s.config.requireKartChange||kartChanged);
      pit.penaltyLaps=result.status==="valid-with-penalty"?s.config.penaltyLaps:0;
      pit.newKart=raw.kartNumber; pit.nextDriverId=raw.driverId;
      recordEvent(s,"PIT_EXIT",`Saída do box (${pit.valid?"parada válida":"validade não confirmada"}).`,team.id);
    }
  }
  if(raw.driverId && !activePit(s,team.id) && raw.driverId!==activeStint(s,team.id)?.driverId) startStint(s,team.id,raw.driverId,false);
  if(raw.kartNumber) team.kart=raw.kartNumber;
  const lap={...raw,raceId:s.id,driverId:raw.driverId??activeStint(s,team.id)?.driverId,receivedTimestamp:now,processedTimestamp:now};
  lap.kind=classifyLap(lap,history,s.config.thresholds);
  if(last?.position!=null && lap.position!=null && last.position!==lap.position) recordEvent(s,"POSITION_CHANGED",`P${last.position} → P${lap.position}`,team.id);
  if(lap.kind!=="normal") recordEvent(s,"LAP_ANOMALY",`Volta ${lap.lapNumber}: ${lap.kind}`,team.id,"ATENÇÃO");
  if(lap.kind==="normal" && lap.lapTimeMs!=null && !history.some(l=>l.kind==="normal" && l.lapTimeMs!=null && l.lapTimeMs<=lap.lapTimeMs!)) recordEvent(s,"BEST_LAP",`Melhor volta: ${(lap.lapTimeMs/1000).toFixed(3)} s`,team.id);
  history.push(lap);s.lapRevisions??={};s.lapRevisions[team.id]=(s.lapRevisions[team.id]??0)+1; s.lastReceivedMs=now; s.source=raw.source;
  return true;
}
export function applyCommand(s: RaceSession, c: RaceCommand, now=Date.now()): RaceSession {
  switch(c.type) {
    case "configure": {
      const errors=validateConfig(c.config); if(errors.length) throw new Error(errors.join(" "));
      s.config=structuredClone(c.config); recordEvent(s,"CONFIG_UPDATED","Regulamento atualizado."); break;
    }
    case "team-save": {
      const t=c.team;
      if(!t.id || !t.name.trim() || !t.number.trim()) throw new Error("Informe nome e número da equipe.");
      if(s.teams.some(x=>x.id!==t.id && x.number===t.number)) throw new Error("Número de equipe já cadastrado.");
      if(t.driverIds.some(id=>!s.drivers.some(d=>d.id===id))) throw new Error("Piloto não encontrado.");
      if(t.driverIds.length>s.config.maxDrivers) throw new Error("Equipe excede o máximo de pilotos.");
      const active=activeStint(s,t.id);
      if(active && !t.driverIds.includes(active.driverId)) throw new Error("Não remova o piloto que está em pista.");
      const i=s.teams.findIndex(x=>x.id===t.id);
      if(i<0) { if(s.teams.length>=s.config.maxTeams) throw new Error("Limite de equipes atingido."); s.teams.push(t); } else s.teams[i]=t;
      if(!s.selectedTeamId) s.selectedTeamId=t.id;
      recordEvent(s,"TEAM_UPDATED",`Equipe ${t.name} salva.`,t.id); break;
    }
    case "team-delete":
      if(s.laps[c.teamId]?.length || s.stints.some(x=>x.teamId===c.teamId)) throw new Error("Equipe possui histórico; crie outra sessão para removê-la.");
      s.teams=s.teams.filter(x=>x.id!==c.teamId); if(s.selectedTeamId===c.teamId) s.selectedTeamId=s.teams[0]?.id??null; break;
    case "driver-save": {
      if(!c.driver.id || !c.driver.name.trim() || !Number.isFinite(c.driver.weightKg) || c.driver.weightKg<=0 || !Number.isFinite(c.driver.ballastKg) || c.driver.ballastKg<0) throw new Error("Dados do piloto inválidos.");
      if((c.driver.minimumMs??s.config.driverMinimumMs)>(c.driver.maximumMs??s.config.driverMaximumMs)) throw new Error("Tempo mínimo excede o máximo.");
      const i=s.drivers.findIndex(x=>x.id===c.driver.id); if(i<0) s.drivers.push(c.driver); else s.drivers[i]=c.driver;
      recordEvent(s,"DRIVER_UPDATED",`Cadastro atualizado: ${c.driver.name}`); break;
    }
    case "driver-delete":
      if(s.stints.some(x=>x.driverId===c.driverId)) throw new Error("Piloto possui stints: marque-o como inativo.");
      s.drivers=s.drivers.filter(x=>x.id!==c.driverId); s.teams.forEach(t=>t.driverIds=t.driverIds.filter(id=>id!==c.driverId)); break;
    case "select-team": requireTeam(s,c.teamId); s.selectedTeamId=c.teamId; break;
    case "driver-change":
      if(activePit(s,c.teamId)) throw new Error("Escolha o próximo piloto na saída do box.");
      startStint(s,c.teamId,c.driverId); break;
    case "pit-enter": {
      const team=requireTeam(s,c.teamId);
      if(activePit(s,c.teamId)) throw new Error("Equipe já está no box.");
      if(getPitWindowStatus(s.elapsedMs,s.config)!=="open") throw new Error("Box fora da janela regulamentar.");
      const prior=activeStint(s,c.teamId);
      if(prior && s.elapsedMs-prior.startMs<s.config.stintMinimumMs) throw new Error("Stint mínimo ainda não cumprido.");
      finishStint(s,c.teamId);
      s.pits.push({id:crypto.randomUUID(),teamId:team.id,enterMs:s.elapsedMs,oldKart:team.kart,previousDriverId:prior?.driverId,penaltyLaps:0,checks:{plate:false,sensor:false,weighed:false,ballast:false}});
      recordEvent(s,"PIT_ENTER","Entrada manual no box.",team.id); break;
    }
    case "pit-exit": {
      const team=requireTeam(s,c.teamId); const pit=activePit(s,c.teamId);
      if(!pit) throw new Error("Equipe não está no box.");
      const duration=s.elapsedMs-pit.enterMs;
      const validity=evaluateStopDuration(duration,s.config);
      if(!validity.countsAsMandatoryStop) throw new Error("Tempo de parada ainda abaixo do mínimo permitido.");
      if(!Object.values(c.checks).every(Boolean)) throw new Error("Conclua o checklist antes de liberar.");
      if(!c.kart.trim()) throw new Error("Informe o kart sorteado.");
      if(s.config.requireKartChange && c.kart===pit.oldKart) throw new Error("Regulamento exige troca de kart.");
      if(s.config.requireDriverChange && c.driverId===pit.previousDriverId) throw new Error("Regulamento exige troca de piloto.");
      const driver=s.drivers.find(x=>x.id===c.driverId);
      if(!driver || driver.weightKg+driver.ballastKg<s.config.minimumWeightKg) throw new Error("Peso mínimo do piloto/lastro não atingido.");
      startStint(s,c.teamId,c.driverId);
      pit.exitMs=s.elapsedMs; pit.durationMs=duration; pit.valid=true; pit.newKart=c.kart; pit.nextDriverId=c.driverId; pit.checks=c.checks;
      pit.penaltyLaps=validity.status==="valid-with-penalty"?s.config.penaltyLaps:0;
      team.kart=c.kart;
      recordEvent(s,"PIT_EXIT",`Parada ${duration/1000}s; piloto ${driver.name}; kart ${c.kart}; penalidade ${pit.penaltyLaps} volta(s).`,team.id,pit.penaltyLaps?"IMPORTANTE":"INFO"); break;
    }
    case "pit-cancel": {
      const pit=activePit(s,c.teamId); if(!pit) break;
      s.pits=s.pits.filter(x=>x.id!==pit.id);
      if(pit.previousDriverId) startStint(s,c.teamId,pit.previousDriverId,false);
      recordEvent(s,"PIT_CANCELLED","Entrada cancelada; novo stint registrado para preservar auditoria.",c.teamId,"ATENÇÃO"); break;
    }
    case "laps": for(const lap of c.laps) ingestLap(s,lap,now); break;
    case "lap-exclude": {
      const lap=s.laps[c.teamId]?.find(l=>l.lapNumber===c.lapNumber); if(!lap) throw new Error("Volta não encontrada."); lap.excluded=c.excluded;s.lapRevisions??={};s.lapRevisions[c.teamId]=(s.lapRevisions[c.teamId]??0)+1;
      recordEvent(s,"LAP_REVIEWED",`Volta ${c.lapNumber} ${c.excluded?"excluída das":"incluída nas"} métricas.`,c.teamId); break;
    }
    case "clock": {
      if(c.action==="start") {
        const invalid=s.teams.filter(t=>t.driverIds.length<s.config.minDrivers||t.driverIds.length>s.config.maxDrivers);
        if(!s.teams.length||invalid.length) throw new Error("Cadastre equipes e o número regulamentar de pilotos antes da largada.");
        s.phase="running"; s.clockAnchorWallMs=now; s.clockAnchorRaceMs=s.elapsedMs;
        recordEvent(s,"RACE_STARTED","Relógio iniciado/retomado.");
      } else {
        s.phase=c.action==="finish"?"finished":"paused";
        if(c.action==="finish") s.teams.forEach(t=>finishStint(s,t.id));
        if(s.playback) s.playback.running=false;
        recordEvent(s,c.action==="finish"?"RACE_FINISHED":"RACE_PAUSED",c.action==="finish"?"Prova encerrada.":"Relógio pausado.");
      } break;
    }
    case "strategy-mode": s.strategyMode=c.mode; recordEvent(s,"STRATEGY_UPDATED",`Modo ${c.mode}`); break;
    case "incident": requireTeam(s,c.teamId); recordEvent(s,"INCIDENT",c.message.slice(0,1000),c.teamId,"ATENÇÃO"); break;
    case "reset": s.laps={};s.lapRevisions={};s.stints=[];s.pits=[];s.events=[];s.lastAlerts={};s.elapsedMs=0;s.phase="ready";s.source="MANUAL";s.playback=null;s.lastReceivedMs=null;s.latestSnapshot=null;recordEvent(s,"SESSION_RESET","Sessão reiniciada; cadastros preservados.");break;
  }
  s.revision++; return s;
}
