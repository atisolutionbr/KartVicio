import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Lock } from "lucide-react";

export default function SemAcessoCard() {
  return (
    <Card className="mt-8">
      <CardContent className="py-20 text-center">
        <Lock className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <h2 className="text-xl font-bold text-gray-700 mb-2">Acesso Pendente</h2>
        <p className="text-gray-500 max-w-sm mx-auto">
          Você ainda não tem acesso a nenhum campeonato.
          Entre em contato com o administrador para ser vinculado a um campeonato.
        </p>
      </CardContent>
    </Card>
  );
}