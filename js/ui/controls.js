// js/ui/controls.js
import { play, pause, toggle, next, prev, toggleShuffle, toggleLoop } from '../core/player.js';
import { on } from '../core/events.js';

const btnPlay = document.getElementById('btnPlay');
const btnNext = document.getElementById('btnNext');
const btnPrev = document.getElementById('btnPrev');
const btnShuffle = document.getElementById('btnShuffle');
const btnLoop = document.getElementById('btnLoop');

// --- BIND EVENTS ---
btnPlay.addEventListener('click', () => {
  toggle();
});

btnNext.addEventListener('click', () => {
  next();
});

btnPrev.addEventListener('click', () => {
  prev();
});

btnShuffle.addEventListener('click', () => {
  toggleShuffle();
});

btnLoop.addEventListener('click', () => {
  toggleLoop();
});

// --- LISTEN TO CORE EVENTS TO UPDATE UI ---
on('play', () => {
  btnPlay.textContent = 'Pause';
});

on('pause', () => {
  btnPlay.textContent = 'Play';
});

on('trackChange', (track) => {
  // Aggiorna titolo e cover del player
  const titleEl = document.getElementById('playerTitle');
  const coverEl = document.getElementById('playerCover');
  if (titleEl) titleEl.textContent = track.title || 'Unknown';
  if (coverEl && track.cover) coverEl.src = track.cover;
});

on('shuffleChange', (isShuffle) => {
  btnShuffle.classList.toggle('active', isShuffle);
});

on('loopChange', (isLoop) => {
  btnLoop.classList.toggle('active', isLoop);
});