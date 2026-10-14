import React, { useState, useEffect } from "react";
import { Usuario } from "@/entities/Usuario";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, UserCheck, Search, Shield, Mail, Trash2, AlertTriangle, Users } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import UsuarioForm from "../components/usuarios/UsuarioForm";

const Campeonato = base44.entities.Campeonato;

export default function UsuariosPage({ userPermissions }) {
  const [usuarios, setUsuarios] = useState([]);
  const [platformUsers, setPlatformUsers] = useState([]);
  const [campeonatos, setCampeonatos] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
    const [usuariosData, campsData] = await Promise.all([
      Usuario.list("-created_date"),
      Campeonato.list("-ano")
    ]);
    
    // Tentar listar usuários da plataforma (admin only)
    let platUsers = [];
    try {
      platUsers = await base44.entities.User.list();
    } catch (e) {
      // Pode falhar se não for admin
    }
    
    setPlatformUsers(platUsers);
    setUsuarios(usuariosData);
    setCampeonatos(campsData);
    } catch (error) {
      toast.error(error.message || 'Não foi possível carregar os usuários.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (usuarioData) => {
    try {
    if (editingUsuario?.id) {
      await Usuario.update(editingUsuario.id, usuarioData);
    } else {
      await Usuario.create(usuarioData);
    }
    setShowForm(false);
    setEditingUsuario(null);
    await loadAll();
    toast.success('Configuração de acesso salva.');
    } catch (error) {
      toast.error(error.message || 'Não foi possível salvar a configuração.');
    }
  };

  const handleEdit = (usuario) => {
    setEditingUsuario(usuario);
    setShowForm(true);
  };

  const handleDelete = async (usuario) => {
    if (!confirm(`Excluir configuração de acesso de "${usuario.nome}"? Isso não remove o acesso Google do usuário.`)) return;
    try {
      await Usuario.delete(usuario.id);
      toast.success("Registro removido");
      await loadAll();
    } catch (error) {
      toast.error(error.message || 'Não foi possível remover o registro.');
    }
  };

  const handleConvidar = async (email) => {
    try {
      await base44.users.inviteUser(email, "user");
      toast.success(`Convite enviado para ${email}`);
    } catch (error) {
      toast.error(error.message || 'Não foi possível enviar o convite.');
    }
  };

  // Detectar duplicatas no Usuario por email
  const emailCount = {};
  usuarios.forEach(u => { emailCount[u.email] = (emailCount[u.email] || 0) + 1; });
  const duplicateEmails = new Set(Object.entries(emailCount).filter(([, c]) => c > 1).map(([e]) => e));

  // Merged view: plataforma + configurações de acesso
  const mergedByEmail = {};
  platformUsers.forEach(u => {
    mergedByEmail[u.email] = {
      email: u.email,
      nome: u.full_name,
      platformUser: u,
      usuarioRecord: null
    };
  });
  usuarios.forEach(u => {
    if (!mergedByEmail[u.email]) {
      mergedByEmail[u.email] = { email: u.email, nome: u.nome, platformUser: null, usuarioRecord: u };
    } else {
      mergedByEmail[u.email].usuarioRecord = u;
      if (!mergedByEmail[u.email].nome) mergedByEmail[u.email].nome = u.nome;
    }
  });
  const mergedList = Object.values(mergedByEmail).sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));

  const filteredMerged = mergedList.filter(u =>
    (u.nome || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsuarios = usuarios.filter(u =>
    u.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPermissaoColor = (permissao) => {
    const colors = {
      "admin": "bg-red-100 text-red-800 border border-red-300",
      "operador": "bg-blue-100 text-blue-800 border border-blue-300",
      "visualizador": "bg-gray-100 text-gray-700 border border-gray-300"
    };
    return colors[permissao] || "bg-gray-100 text-gray-800";
  };

  const getCampeonatosNomes = (ids, permissao) => {
    if (!ids || ids.length === 0) {
      if (permissao === 'admin') return <span className="text-xs text-gray-400">Todos (admin)</span>;
      return <span className="text-xs text-red-500 font-semibold">⚠️ Sem acesso</span>;
    }
    return (
      <div className="flex flex-wrap gap-1">
        {ids.map(id => {
          const c = campeonatos.find(c => c.id === id);
          return c ? <Badge key={id} variant="outline" className="text-xs">{c.nome}</Badge> : null;
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">👥 Gerenciar Usuários</h1>
          <p className="text-gray-600">Controle de acesso, permissões e vínculo com campeonatos</p>
        </div>
        {userPermissions?.permissao === 'admin' && (
          <Button
            onClick={() => { setEditingUsuario(null); setShowForm(true); }}
            className="copa-gradient-gold hover:opacity-90 text-white shadow-lg font-semibold"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nova Configuração de Acesso
          </Button>
        )}
      </div>

      {/* Permissões Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-gray-400">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-gray-500" />
              <span className="font-bold text-gray-700">Visualizador</span>
            </div>
            <p className="text-xs text-gray-500">Ranking · Simulador · Relatórios · Perfil do Piloto</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-blue-400">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-blue-500" />
              <span className="font-bold text-blue-700">Operador</span>
            </div>
            <p className="text-xs text-gray-500">Visualizador + Resultados · Penalidades · Pilotos (dos campeonatos vinculados)</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-red-400">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-red-500" />
              <span className="font-bold text-red-700">Administrador</span>
            </div>
            <p className="text-xs text-gray-500">Acesso total ao sistema · Configurações · Todos os campeonatos</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="shadow-lg">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Form */}
      {showForm && userPermissions?.permissao === 'admin' && (
        <UsuarioForm
          usuario={editingUsuario}
          campeonatos={campeonatos}
          onSubmit={handleSubmit}
          onCancel={() => { setShowForm(false); setEditingUsuario(null); }}
        />
      )}

      {/* Duplicatas Alert */}
      {duplicateEmails.size > 0 && (
        <Card className="border-2 border-orange-400 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold text-orange-700">⚠️ Emails duplicados encontrados nos registros de acesso:</p>
                <p className="text-sm text-orange-600 mt-1">
                  {[...duplicateEmails].join(" • ")}
                </p>
                <p className="text-xs text-orange-500 mt-1">Remova os registros duplicados abaixo para evitar conflitos de permissão.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Todos os usuários (merged view: plataforma + configurações) */}
      {platformUsers.length > 0 && (
        <Card className="shadow-xl border-0">
          <CardHeader className="copa-gradient-navy text-white">
            <CardTitle className="flex items-center gap-3 text-xl">
              <Users className="w-6 h-6" />
              Todos os Usuários da Plataforma ({filteredMerged.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-100">
                    <TableHead className="font-bold">Nome</TableHead>
                    <TableHead className="font-bold">Email</TableHead>
                    <TableHead className="font-bold text-center">Plataforma</TableHead>
                    <TableHead className="font-bold text-center">Permissão KartVicio</TableHead>
                    <TableHead className="font-bold">Campeonatos</TableHead>
                    {userPermissions?.permissao === 'admin' && <TableHead className="font-bold text-center">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMerged.map((u, index) => (
                    <TableRow
                      key={u.email}
                      className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}
                    >
                      <TableCell className="font-semibold text-gray-900">{u.nome || "—"}</TableCell>
                      <TableCell className="text-gray-600 text-sm">{u.email}</TableCell>
                      <TableCell className="text-center">
                        {u.platformUser ? (
                          <Badge className="bg-green-100 text-green-800">✓ Logado</Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-500">Não logou</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {u.usuarioRecord ? (
                          <Badge className={getPermissaoColor(u.usuarioRecord.permissao)}>
                            {u.usuarioRecord.permissao}
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-500 border border-gray-300">visualizador</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {u.usuarioRecord ? getCampeonatosNomes(u.usuarioRecord.campeonatos_ids, u.usuarioRecord.permissao) : <span className="text-xs text-red-500 font-semibold">⚠️ Sem acesso</span>}
                      </TableCell>
                      {userPermissions?.permissao === 'admin' && (
                        <TableCell className="text-center">
                          <div className="flex items-center gap-1 justify-center flex-wrap">
                            {u.usuarioRecord ? (
                              <Button variant="outline" size="sm" className="px-1.5 sm:px-3 text-xs" onClick={() => handleEdit(u.usuarioRecord)}>
                                <span className="hidden sm:inline">Editar</span>
                                <span className="sm:hidden">✏️</span>
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700 text-white px-1.5 sm:px-3 text-xs"
                                onClick={() => {
                                  setEditingUsuario({ nome: u.nome || "", email: u.email, permissao: "visualizador", ativo: true, campeonatos_ids: [] });
                                  setShowForm(true);
                                }}
                              >
                                <span className="hidden sm:inline">Configurar</span>
                                <span className="sm:hidden">⚙️</span>
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleConvidar(u.email)}
                              className="text-blue-600 border-blue-300 hover:bg-blue-50 px-1.5 sm:px-3 text-xs"
                            >
                              <Mail className="w-3 h-3 sm:mr-1" />
                              <span className="hidden sm:inline">Convidar</span>
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {filteredMerged.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        Nenhum usuário encontrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configurações de Acesso KartVicio (com botão deletar para duplicatas) */}
      <Card className="shadow-xl border-0">
        <CardHeader className="bg-gradient-to-r from-blue-800 to-blue-900 text-white">
          <CardTitle className="flex items-center gap-3 text-xl">
            <Shield className="w-6 h-6" />
            Configurações de Acesso KartVicio ({filteredUsuarios.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-100">
                  <TableHead className="font-bold">Nome</TableHead>
                  <TableHead className="font-bold">Email</TableHead>
                  <TableHead className="font-bold text-center">Permissão</TableHead>
                  <TableHead className="font-bold text-center">Status</TableHead>
                  <TableHead className="font-bold">Campeonatos Vinculados</TableHead>
                  {userPermissions?.permissao === 'admin' && <TableHead className="font-bold text-center">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsuarios.map((usuario, index) => (
                  <TableRow
                    key={usuario.id}
                    className={`${duplicateEmails.has(usuario.email) ? 'bg-orange-50 border-l-4 border-orange-400' : (index % 2 === 0 ? 'bg-white' : 'bg-gray-50')} hover:bg-blue-50 transition-colors`}
                  >
                    <TableCell className="font-semibold text-gray-900">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-gray-500" />
                        {usuario.nome}
                        {duplicateEmails.has(usuario.email) && (
                          <Badge className="bg-orange-100 text-orange-700 text-xs">Duplicado</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600">{usuario.email}</TableCell>
                    <TableCell className="text-center">
                      <Badge className={getPermissaoColor(usuario.permissao)}>
                        {usuario.permissao}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={usuario.ativo ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                        {usuario.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>{getCampeonatosNomes(usuario.campeonatos_ids, usuario.permissao)}</TableCell>
                    {userPermissions?.permissao === 'admin' && (
                      <TableCell className="text-center">
                        <div className="flex items-center gap-2 justify-center">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(usuario)}>
                            Editar
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(usuario)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {filteredUsuarios.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      {searchTerm ? "Nenhum usuário encontrado" : "Nenhuma configuração de acesso cadastrada"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
