/**
 * Filtra campeonatos baseado nas permissões do usuário.
 * - admin: vê todos
 * - operador/visualizador com campeonatos_ids: vê só os vinculados
 * - operador/visualizador sem campeonatos_ids: não vê nenhum (acesso pendente)
 */
export const filtrarCampeonatosAcessiveis = (campeonatos, userPermissions) => {
  if (!userPermissions) return [];
  if (userPermissions.permissao === 'admin') return campeonatos;
  const ids = userPermissions.campeonatos_ids || [];
  if (ids.length === 0) return [];
  return campeonatos.filter(c => ids.includes(c.id));
};

export const usuarioSemAcesso = (userPermissions) => {
  if (!userPermissions) return false;
  if (userPermissions.permissao === 'admin') return false;
  const ids = userPermissions.campeonatos_ids || [];
  return ids.length === 0;
};