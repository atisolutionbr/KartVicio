/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Dashboard from './pages/Dashboard';
import Etapas from './pages/Etapas';
import Penalidades from './pages/Penalidades';
import Pilotos from './pages/Pilotos';
import Pontuacoes from './pages/Pontuacoes';
import Relatorios from './pages/Relatorios';
import Resultados from './pages/Resultados';
import Simulador from './pages/Simulador';
import TabelaPontos from './pages/TabelaPontos';
import Usuarios from './pages/Usuarios';
import Campeonatos from './pages/Campeonatos';
import CampeonatoDetalhe from './pages/CampeonatoDetalhe';
import PerfilPiloto from './pages/PerfilPiloto';
import MigracaoDados from './pages/MigracaoDados';
import TipoPonto from './pages/TipoPonto';
import Calendario from './pages/Calendario';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Etapas": Etapas,
    "Penalidades": Penalidades,
    "Pilotos": Pilotos,
    "Pontuacoes": Pontuacoes,
    "Relatorios": Relatorios,
    "Resultados": Resultados,
    "Simulador": Simulador,
    "TabelaPontos": TabelaPontos,
    "Usuarios": Usuarios,
    "Campeonatos": Campeonatos,
    "CampeonatoDetalhe": CampeonatoDetalhe,
    "PerfilPiloto": PerfilPiloto,
    "MigracaoDados": MigracaoDados,
    "TipoPonto": TipoPonto,
    "Calendario": Calendario,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};