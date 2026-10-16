import { lazy } from 'react';
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
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Etapas = lazy(() => import('./pages/Etapas'));
const Penalidades = lazy(() => import('./pages/Penalidades'));
const Pilotos = lazy(() => import('./pages/Pilotos'));
const Pontuacoes = lazy(() => import('./pages/Pontuacoes'));
const Relatorios = lazy(() => import('./pages/Relatorios'));
const Resultados = lazy(() => import('./pages/Resultados'));
const Simulador = lazy(() => import('./pages/Simulador'));
const TabelaPontos = lazy(() => import('./pages/TabelaPontos'));
const Usuarios = lazy(() => import('./pages/Usuarios'));
const Campeonatos = lazy(() => import('./pages/Campeonatos'));
const CampeonatoDetalhe = lazy(() => import('./pages/CampeonatoDetalhe'));
const PerfilPiloto = lazy(() => import('./pages/PerfilPiloto'));
const MigracaoDados = lazy(() => import('./pages/MigracaoDados'));
const TipoPonto = lazy(() => import('./pages/TipoPonto'));
const Calendario = lazy(() => import('./pages/Calendario'));
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