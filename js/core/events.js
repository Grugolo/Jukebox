// core/events.js
// Responsabilità: comunicazione tra moduli (pub/sub)
// NON gestisce stato né DOM

const events = {};

/**
 * Registra un callback per un evento
 * @param {string} eventName
 * @param {function} callback
 */
export function on(eventName, callback) {
  if (!events[eventName]) {
    events[eventName] = [];
  }
  events[eventName].push(callback);
}

/**
 * Deregistra un callback per un evento
 * @param {string} eventName
 * @param {function} callback
 */
export function off(eventName, callback) {
  if (!events[eventName]) return;
  events[eventName] = events[eventName].filter(cb => cb !== callback);
}

/**
 * Emissione di un evento con dati
 * @param {string} eventName
 * @param {*} data
 */
export function emit(eventName, data) {
  if (!events[eventName]) return;
  // Copia array per evitare modifiche durante l'iterazione
  [...events[eventName]].forEach(cb => {
    try {
      cb(data);
    } catch (err) {
      console.error(`Error in event listener for "${eventName}":`, err);
    }
  });
}

/**
 * Registra un callback che viene eseguito solo una volta
 * @param {string} eventName
 * @param {function} callback
 */
export function once(eventName, callback) {
  const wrapper = (data) => {
    callback(data);
    off(eventName, wrapper);
  };
  on(eventName, wrapper);
}