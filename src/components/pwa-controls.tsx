"use client";
import { useEffect, useState } from "react";
import { appUrl } from "@/lib/app-url";
interface InstallEvent extends Event { prompt:()=>Promise<void>; userChoice:Promise<{outcome:string}> }
export function PwaControls() {
  const [install,setInstall]=useState<InstallEvent|null>(null);
  const [scale,setScale]=useState(70);
  useEffect(()=>{
    let value=70;try{value=localStorage.getItem("kart-scale")==="100"?100:70;}catch{}
    document.documentElement.style.setProperty("--app-scale",String(value/100));
    const timer=setTimeout(()=>setScale(value),0);
    const listener=(event:Event)=>{event.preventDefault();setInstall(event as InstallEvent);};
    window.addEventListener("beforeinstallprompt",listener);
    if("serviceWorker" in navigator)void (async()=>{
      const scope=appUrl("")||"/";
      if(scope!=="/"){const previous=await navigator.serviceWorker.getRegistration(appUrl("/"));if(previous&&new URL(previous.scope).pathname===appUrl("/")&&previous.active?.scriptURL===location.origin+appUrl("/sw.js"))await previous.unregister();}
      await navigator.serviceWorker.register(appUrl("/sw.js"),{scope,updateViaCache:"none"});
    })().catch(()=>{});
    return()=>{clearTimeout(timer);window.removeEventListener("beforeinstallprompt",listener);};
  },[]);
  function toggle(){const value=scale===70?100:70;setScale(value);document.documentElement.style.setProperty("--app-scale",String(value/100));try{localStorage.setItem("kart-scale",String(value));}catch{}}
  return <div className="pwa-controls flex flex-wrap gap-2 border-t border-border bg-card px-4 py-3 text-sm"><button type="button" className="rounded-md border px-3 py-2" onClick={toggle} aria-label={`Escala ${scale}%. Alternar escala`}>Escala {scale}%</button>{install?<button type="button" className="rounded-md bg-primary px-3 py-2 text-primary-foreground" onClick={async()=>{await install.prompt();await install.userChoice;setInstall(null);}}>Instalar KartVicio</button>:<span className="self-center text-muted-foreground">Para instalar: menu do navegador → instalar aplicativo ou adicionar à tela inicial.</span>}</div>;
}
