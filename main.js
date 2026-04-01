// ==============================
// main.js
// Entry point della pagina
// ==============================

// Import dei moduli core, controls e ui
import { Library } from './core/library.js';
import { ExpandedScreen } from './core/expandedScreen.js';
import { SideMenu } from './ui/sideMenu.js';
import { Gestures } from './controls/gestures.js';

// ==============================
// INIZIALIZZAZIONE APP
// ==============================
document.addEventListener('DOMContentLoaded', () => {

  // --- Core Modules ---
  const library = new Library('.library-list');
  const expanded = new ExpandedScreen('.expanded-screen');

  // --- UI Modules ---
  const sideMenu = new SideMenu('.side-menu');

  // --- Controls / Event-driven ---
  const gestures = new Gestures({
    libraryScreen: '.library-screen',
    expandedScreen: '.expanded-screen'
  });

  // ==============================
  // EVENTI GLOBALI
  // ==============================
  
  // Apri elemento in expanded screen
  document.querySelectorAll('.library-list li').forEach(item => {
    item.addEventListener('click', () => {
      expanded.show(item.dataset.id); // mostro l'elemento selezionato
    });
  });

  // Torna alla library
  document.querySelectorAll('.btn-back').forEach(btn => {
    btn.addEventListener('click', () => {
      expanded.hide();
    });
  });

  // Toggle side menu
  document.querySelector('.btn-menu').addEventListener('click', () => {
    sideMenu.toggle();
  });

  // Inizializzo gestures
  gestures.init();

  console.log('App inizializzata ✅');
});