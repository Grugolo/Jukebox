// core/queue.js
// Responsabilità: gestione pura della queue
// NON tocca il DOM

import { store } from './store.js';

export function add(track, top = false) {
  if (top) {
    store.queue.unshift(track);
  } else {
    store.queue.push(track);
  }
}

export function remove(index) {
  if (index < 0 || index >= store.queue.length) return;
  store.queue.splice(index, 1);
}

export function move(from, to) {
  if (
    from < 0 || from >= store.queue.length ||
    to < 0 || to >= store.queue.length ||
    from === to
  ) return;

  const [track] = store.queue.splice(from, 1);
  store.queue.splice(to, 0, track);
}

export function popNext() {
  if (store.queue.length === 0) return null;
  return store.queue.shift();
}

export function clear() {
  store.queue = [];
}