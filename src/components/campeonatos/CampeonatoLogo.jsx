import React from "react";
import { Trophy } from "lucide-react";

const SIZE_CLASSES = {
  sm: { box: "w-8 h-8", icon: "w-4 h-4" },
  md: { box: "w-11 h-11", icon: "w-6 h-6" },
  lg: { box: "w-14 h-14", icon: "w-7 h-7" },
  xl: { box: "w-20 h-20", icon: "w-10 h-10" },
};

export default function CampeonatoLogo({ campeonato, size = "md", className = "" }) {
  const s = SIZE_CLASSES[size] || SIZE_CLASSES.md;

  if (campeonato?.logo_url) {
    return (
      <img
        src={campeonato.logo_url}
        alt={campeonato?.nome || "Logo"}
        className={`${s.box} rounded-xl object-cover shadow-md flex-shrink-0 ${className}`}
      />
    );
  }
  return (
    <div className={`${s.box} rounded-xl copa-gradient-navy flex items-center justify-center shadow-md flex-shrink-0 ${className}`}>
      <Trophy className={`${s.icon} text-yellow-400`} />
    </div>
  );
}