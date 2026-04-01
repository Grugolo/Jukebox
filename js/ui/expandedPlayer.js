// js/ui/expandedPlayer.js
import { on } from '../core/events.js';
import { play, pause, toggle } from '../core/player.js';

const expandedPlayer = document.getElementById('expandedPlayer');
const coverImg = expandedPlayer?.querySelector('.cover');
const titleEl = expandedPlayer?.querySelector('.title');
const playBtn = expandedPlayer?.querySelector('.btnPlay');
const closeBtn = expandedPlayer?.querySelector('.btnClose');

let isVisible = false;

// --- Mostra / Nascondi player ---
export function showPlayer(track) {
  if (!expandedPlayer) return;

  titleEl.textContent = track.title || 'Unknown';
  if (track.cover) coverImg.src = track.cover;
  expandedPlayer.classList.add('visible');
  isVisible = true;
}

export function hidePlayer() {
  if (!expandedPlayer) return;

  expandedPlayer.classList.remove('visible');
  isVisible = false;
}

// --- Gestione pulsante play/pause ---
playBtn?.addEventListener('click', () => toggle());

// --- Gestione chiusura player ---
closeBtn?.addEventListener('click', () => hidePlayer());

// --- Aggiornamento UI in risposta a eventi core ---
on('trackChange', (track) => {
  if (isVisible) showPlayer(track);
});

on('play', () => {
  if (playBtn) playBtn.classList.add('playing');
});

on('pause', () => {
  if (playBtn) playBtn.classList.remove('playing');
});

// --- Gesture swipe per chiudere (touch) ---
let startY = 0;

expandedPlayer?.addEventListener('touchstart', (e) => {
  startY = e.touches[0].clientY;
});

expandedPlayer?.addEventListener('touchmove', (e) => {
  const deltaY = e.touches[0].clientY - startY;
  if (deltaY > 100) hidePlayer();
});