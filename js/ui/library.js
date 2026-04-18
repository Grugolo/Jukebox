// js/ui/library.js
import { playLocal } from '../core/player.js';
import { on } from '../core/events.js';
import { formatTime } from '../utils.js';

const libraryContainer = document.getElementById('libraryList');

/**
 * Renderizza la libreria di tracce
 * @param {Array} tracks - array di oggetti Track
 */
export function renderLibrary(tracks) {
  if (!libraryContainer) return;
  libraryContainer.innerHTML = '';

  tracks.forEach((track, index) => {
    const li = document.createElement('li');
    li.classList.add('library-item');
    li.dataset.index = index;

    li.innerHTML = `
      <img class="cover" src="${track.cover || ''}" alt="cover">
      <div class="info">
        <div class="title">${track.title || 'Unknown'}</div>
        <div class="duration">${track.duration ? formatTime(track.duration) : '--:--'}</div>
      </div>
    `;

    li.addEventListener('click', () => {
      playLocal(track);
    });

    libraryContainer.appendChild(li);
  });
}

on('libraryUpdate', (tracks) => {
  renderLibrary(tracks);
});
