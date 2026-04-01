// js/ui/queueUI.js
import { queue } from '../core/queue.js';
import { play } from '../core/player.js';
import { on } from '../core/events.js';

const queueContainer = document.getElementById('queueList');

/**
 * Renderizza la queue
 */
export function renderQueue() {
  if (!queueContainer) return;

  queueContainer.innerHTML = '';

  queue.getAll().forEach((track, index) => {
    const li = document.createElement('li');
    li.classList.add('queue-item');
    li.dataset.index = index;

    li.innerHTML = `
      <img class="cover" src="${track.cover || ''}" alt="cover">
      <div class="info">
        <div class="title">${track.title || 'Unknown'}</div>
        <div class="duration">${track.duration ? formatTime(track.duration) : '--:--'}</div>
      </div>
      <button class="remove">×</button>
    `;

    // Play on click
    li.addEventListener('click', (e) => {
      if (e.target.classList.contains('remove')) return;
      play(track);
    });

    // Remove from queue
    li.querySelector('.remove').addEventListener('click', (e) => {
      e.stopPropagation();
      queue.remove(index);
      renderQueue();
    });

    queueContainer.appendChild(li);
  });
}

/**
 * Helper per convertire secondi in mm:ss
 */
function formatTime(sec) {
  const minutes = Math.floor(sec / 60);
  const seconds = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

// --- Eventi per aggiornare queue dinamicamente ---
on('queueUpdate', () => renderQueue());

// --- Drag & Drop base (opzionale, da migliorare con librerie) ---
queueContainer.addEventListener('dragstart', (e) => {
  e.dataTransfer.setData('text/plain', e.target.dataset.index);
});

queueContainer.addEventListener('drop', (e) => {
  e.preventDefault();
  const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
  const toIndex = parseInt(e.target.closest('li')?.dataset.index);

  if (fromIndex != null && toIndex != null) {
    queue.move(fromIndex, toIndex);
    renderQueue();
  }
});

queueContainer.addEventListener('dragover', (e) => e.preventDefault());