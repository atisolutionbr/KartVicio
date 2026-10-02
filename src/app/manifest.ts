import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/app-url";
export default function manifest(): MetadataRoute.Manifest {
  const scope=appUrl("")||"/";
  return { id: scope, name: "KartVicio Race Control", short_name: "KartVicio", description: "Engenharia e operação de kart endurance", lang: "pt-BR", start_url: scope, scope, display: "standalone", background_color: "#f4f6f8", theme_color: "#111827", icons: [192,512].map(size=>({src:appUrl(`/icons/kart-vicio-${size}.png`),sizes:`${size}x${size}`,type:"image/png",purpose:"any"})), shortcuts: [{name:"Box",url:appUrl("/box")},{name:"Command Center",url:appUrl("/command")}] };
}
