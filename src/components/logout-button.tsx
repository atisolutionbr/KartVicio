"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { appUrl } from "@/lib/app-url";

/* Encerra a sessao e volta pra tela de acesso. */
export function LogoutButton() {
  const router = useRouter();
  const logout = async () => {
    try {
      await fetch(appUrl("/api/auth/logout"), { method: "POST" });
    } catch {
      /* segue pro login de qualquer forma */
    }
    router.push("/login");
    router.refresh();
  };

  return (
    <button
      onClick={logout}
      className="mt-3 flex items-center gap-2 text-xs font-medium text-slate-300 transition-colors hover:text-white"
    >
      <LogOut className="h-3.5 w-3.5" />
      Sair
    </button>
  );
}
