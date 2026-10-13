import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Trophy,
  Users,
  Target,
  AlertTriangle,
  BarChart3,
  Calendar,
  CalendarDays,
  LogOut,
  UserCheck,
  Calculator,
  FileText,
  Layers,
  Star,
  User as UserIcon,
} from "lucide-react";

const LOGO_URL = "/media/621866bf89891ec2.jpg";
import { Button } from "@/components/ui/button";
import { User } from "@/entities/User";
import { Usuario } from "@/entities/Usuario";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger } from
"@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import BottomNav from "@/components/BottomNav";

const navigationItems = [
{
  title: "Ranking",
  url: createPageUrl("Dashboard"),
  icon: BarChart3,
  description: "Classificação geral",
  roles: ["admin", "operador", "visualizador"]
},
{
  title: "Acompanhe",
  url: createPageUrl("CampeonatoPublico"),
  icon: Trophy,
  description: "Visão geral por campeonato",
  roles: ["admin", "operador", "visualizador"]
},
{
  title: "Simulador",
  url: createPageUrl("Simulador"),
  icon: Calculator,
  description: "Simular descartes",
  roles: ["admin", "operador"]
},
{
  title: "Perfil do Piloto",
  url: createPageUrl("PerfilPiloto"),
  icon: UserIcon,
  description: "Relatório cruzado por piloto",
  roles: ["admin", "operador", "visualizador"]
},
{
  title: "Relatórios",
  url: createPageUrl("Relatorios"),
  icon: FileText,
  description: "Estatísticas e relatórios",
  roles: ["admin", "operador", "visualizador"]
},
{
  title: "Calendário",
  url: createPageUrl("Calendario"),
  icon: CalendarDays,
  description: "Datas e locais das etapas",
  roles: ["admin", "operador", "visualizador"]
},
{
  title: "Pilotos",
  url: createPageUrl("Pilotos"),
  icon: Users,
  description: "Cadastro de pilotos",
  roles: ["admin"]
},
{
  title: "Resultados",
  url: createPageUrl("Resultados"),
  icon: Trophy,
  description: "Resultados das etapas",
  roles: ["admin", "operador"]
},
{
  title: "Penalidades",
  url: createPageUrl("Penalidades"),
  icon: AlertTriangle,
  description: "Penalidades aplicadas",
  roles: ["admin", "operador"]
},
{
  title: "Campeonatos",
  url: createPageUrl("Campeonatos"),
  icon: Layers,
  description: "Gerenciar campeonatos",
  roles: ["admin"]
},
{
  title: "Etapas",
  url: createPageUrl("Etapas"),
  icon: Calendar,
  description: "Calendário de etapas",
  roles: ["admin"]
},
{
  title: "Tabela Pontos",
  url: createPageUrl("TabelaPontos"),
  icon: Target,
  description: "Pontos por posição",
  roles: ["admin"]
},
{
  title: "Tipos de Ponto",
  url: createPageUrl("TipoPonto"),
  icon: Star,
  description: "Pontos extras por tipo",
  roles: ["admin"]
},
{
  title: "Usuários",
  url: createPageUrl("Usuarios"),
  icon: UserCheck,
  description: "Gerenciar usuários",
  roles: ["admin"]
},
];


export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [user, setUser] = React.useState(null);
  const [userPermissions, setUserPermissions] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let isMounted = true;

    const loadUserAndPermissions = async () => {
      if (!isMounted) return;

      setLoading(true);
      try {
        const userData = await User.me();
        if (!isMounted) return;

        setUser(userData);

        if (userData.permissions) {
          setUserPermissions(userData.permissions);
          setLoading(false);
          return;
        }
        const adminEmails = ['spider.vitoria@gmail.com', 'jonatha.soares@atisolution.com.br'];

        if (adminEmails.includes(userData.email)) {
          setUserPermissions({
            nome: userData.full_name,
            email: userData.email,
            permissao: 'admin',
            ativo: true
          });
        } else {
          try {
            await new Promise((resolve) => setTimeout(resolve, 500));
            const existingUsers = await Usuario.filter({ email: userData.email });

            if (!isMounted) return;

            if (existingUsers.length > 0) {
              setUserPermissions(existingUsers[0]);
            } else {
              setUserPermissions({
                nome: userData.full_name,
                email: userData.email,
                permissao: 'visualizador',
                ativo: true,
                _isNew: true
              });
            }
          } catch (error) {
            console.log("Erro ao buscar permissões, usando padrão visualizador");
            setUserPermissions({
              nome: userData.full_name,
              email: userData.email,
              permissao: 'visualizador',
              ativo: true
            });
          }
        }
      } catch (error) {
        if (isMounted) {
          setUser(null);
          setUserPermissions(null);
        }
      }
      if (isMounted) {
        setLoading(false);
      }
    };

    loadUserAndPermissions();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = async () => {
    await User.logout();
  };

  const handleLogin = async () => {
    await User.login();
  };

  const visibleNavItems = React.useMemo(() => {
    if (!userPermissions) return [];
    const role = userPermissions.permissao;
    return navigationItems.filter(item => item.roles.includes(role));
  }, [userPermissions]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>);

  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #1e40af 100%)'
      }}>
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
          <img
            src={LOGO_URL}
            alt="KartVicio"
            className="w-28 h-28 mx-auto mb-6 rounded-full shadow-xl object-cover border-4 border-yellow-400"
          />
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">KartVicio</h1>
          <p className="text-gray-600 mb-8">Sistema de Gestão de Campeonatos</p>
          
          <Button
            onClick={handleLogin}
            className="w-full h-12 text-lg font-semibold copa-gradient-gold hover:opacity-90 text-white shadow-lg">

            Entrar com Google
          </Button>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
            <p className="text-sm font-medium text-blue-800 mb-2">Acesso Liberado</p>
            <p className="text-sm text-blue-700">
              Qualquer usuário com conta Google pode acessar o sistema. Novos usuários terão acesso de visualização.
            </p>
          </div>
        </div>
      </div>);

  }

  return (
    <SidebarProvider className="min-w-0" style={{ '--sidebar-width': '280px' }}>
      <style>
        {`
          :root {
            --copa-navy: #0a1628;
            --copa-navy-light: #1e3a5c;
            --copa-navy-hover: #2d5a8a;
            --copa-gold: #fbbf24;
            --copa-gold-light: #fde68a;
            --copa-gold-dark: #f59e0b;
            --copa-blue: #1e3a8a;
            --copa-blue-light: #3b82f6;
          }
          
          .copa-gradient-navy {
            background: linear-gradient(135deg, var(--copa-navy) 0%, var(--copa-navy-light) 100%);
          }
          
          .copa-gradient-gold {
            background: linear-gradient(135deg, var(--copa-gold) 0%, var(--copa-gold-light) 100%);
          }
          
          .copa-gradient-blue {
            background: linear-gradient(135deg, var(--copa-blue) 0%, var(--copa-blue-light) 100%);
          }
          
          .sidebar-copa {
            background: linear-gradient(180deg, #e8f0ff 0%, #dae6ff 50%, #ccdcff 100%);
            border-right: 3px solid var(--copa-gold);
          }
          
          .ranking-position-1-5 {
            background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
          }
          
          .ranking-position-6-8 {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          }
          
          .ranking-position-9-15 {
            background: linear-gradient(135deg, #fecaca 0%, #fca5a5 100%);
          }
          
          .ranking-position-16-20 {
            background: linear-gradient(135deg, #e9d5ff 0%, #ddd6fe 100%);
          }
          
          .sidebar-copa [data-sidebar="sidebar"] {
            width: 280px !important;
            min-width: 280px !important;
          }
          
          .sidebar-menu-text {
            color: #0f172a !important;
            font-weight: 700;
            font-size: 14px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          
          .sidebar-menu-description {
            color: #475569 !important;
            font-size: 12px;
            font-weight: 500;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          
          .sidebar-menu-item-hover {
            transition: all 0.2s ease;
          }
          
          .sidebar-menu-item-hover:hover {
            background: rgba(251, 191, 36, 0.25) !important;
            transform: translateX(4px);
          }
          
          .sidebar-menu-item-hover:hover .sidebar-menu-text {
            color: #0a1628 !important;
          }
          
          .sidebar-menu-item-hover:hover .sidebar-menu-description {
            color: #1e3a5c !important;
          }
          
          .sidebar-menu-active {
            background: linear-gradient(135deg, #fbbf24, #fde68a) !important;
            box-shadow: 0 4px 12px rgba(251, 191, 36, 0.4);
            transform: translateX(4px);
          }
          
          .sidebar-menu-active .sidebar-menu-text {
            color: #0a1628 !important;
            font-weight: 800;
          }
          
          .sidebar-menu-active .sidebar-menu-description {
            color: #0f2847 !important;
          }
          
          .sidebar-group-label-dark {
            color: #1e3a8a !important;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 1.5px;
          }
          
          .sidebar-header-text {
            color: #0f172a !important;
            font-weight: 800;
            font-size: 20px;
          }
          
          .sidebar-header-subtitle {
            color: #1e3a8a !important;
            font-weight: 700;
            font-size: 13px;
          }
          
          .sidebar-footer-name {
            color: #0f172a !important;
            font-weight: 700;
            font-size: 14px;
          }
          
          .sidebar-footer-role {
            color: #475569 !important;
            font-size: 12px;
            font-weight: 600;
          }
        `}
      </style>
      
      <div className="app-shell flex min-w-0 w-full bg-gray-50">
        <Sidebar className="sidebar-copa hidden md:flex md:flex-col" style={{width: "280px", minWidth: "280px"}}>
          <SidebarHeader className="border-b border-blue-300/60 p-6">
            <div className="flex min-w-0 items-center gap-3">
              <img
                src={LOGO_URL}
                alt="KartVicio"
                className="w-14 h-14 shrink-0 rounded-xl shadow-xl border-2 border-yellow-300 object-cover"
              />
              <div className="min-w-0 break-words">
                <h2 className="sidebar-header-text">KartVicio</h2>
                <p className="sidebar-header-subtitle">Sistema de Gestão de Campeonatos</p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-4">
            <SidebarGroup>
              <SidebarGroupLabel className="sidebar-group-label-dark mb-4 px-2">
                SISTEMA DE GESTÃO
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleNavItems.map((item) => (
                    <SidebarMenuItem key={item.title} className="mb-2">
                      <SidebarMenuButton 
                        asChild 
                        className={`sidebar-menu-item-hover h-auto min-h-[44px] transition-all duration-200 rounded-xl ${
                          location.pathname === item.url ? 'sidebar-menu-active' : ''
                        }`}
                      >
                        <Link to={item.url} className="flex items-center gap-3 px-4 py-3">
                          <item.icon className={`w-6 h-6 ${location.pathname === item.url ? 'text-gray-900' : 'text-blue-700'}`} />
                          <div className="flex-1">
                            <div className="sidebar-menu-text">
                              {item.title}
                            </div>
                            <div className="sidebar-menu-description">
                              {item.description}
                            </div>
                          </div>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-blue-300/60 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-gray-900 font-bold text-sm">{user?.full_name?.[0] || 'U'}</span>
                </div>
                <div>
                  <p className="sidebar-footer-name">{user?.full_name || 'Usuário'}</p>
                  <div className="flex items-center gap-2">
                    <p className="sidebar-footer-role">{userPermissions?.permissao || 'visualizador'}</p>
                    <Badge className="text-xs bg-green-500 text-white border-0">Online</Badge>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="hover:bg-red-600 text-gray-700 hover:text-white transition-colors duration-200">

                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="app-main flex min-w-0 w-0 flex-1 flex-col">
          <header className="bg-white border-b-2 border-yellow-400 px-3 sm:px-6 py-2 md:hidden shadow-md flex items-center justify-between sticky top-0 z-10 safe-area-top">
            <div className="flex items-center gap-2">
                <img src={LOGO_URL} alt="KartVicio" className="w-8 h-8 rounded-full object-cover" />
                <h1 className="text-lg font-bold text-gray-900">KartVicio</h1>
            </div>
            <SidebarTrigger className="p-3 rounded-lg hover:bg-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center" />
          </header>

          <div className="app-page-content min-w-0 w-full flex-1 p-2 sm:p-4 lg:p-6">
            {userPermissions && React.cloneElement(children, { userPermissions })}
          </div>
        </main>
      </div>
      {user && userPermissions && <BottomNav userPermissions={userPermissions} />}
    </SidebarProvider>);

}
