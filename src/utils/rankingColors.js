/**
 * Cor de fundo + borda por faixa de posição, usada em todas as tabelas de ranking do sistema.
 * Verde: 1º-5º · Amarelo: 6º-8º · Vermelho: 9º-12º · Roxo: 13º em diante.
 */
export const getRowColorClass = (posicao) => {
  if (posicao >= 1 && posicao <= 5) return "bg-green-50 border-l-4 border-green-500";
  if (posicao >= 6 && posicao <= 8) return "bg-yellow-50 border-l-4 border-yellow-500";
  if (posicao >= 9 && posicao <= 12) return "bg-red-50 border-l-4 border-red-500";
  return "bg-purple-50 border-l-4 border-purple-500";
};