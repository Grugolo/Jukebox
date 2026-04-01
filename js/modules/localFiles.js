// js/modules/localFiles.js

import { emit } from '../core/events.js';

/**
 * Trasforma una lista di File in array di Track
 * Track = {
 *   type: 'local',
 *   file: File,
 *   title: string,
 *   duration: number (in secondi),
 *   cover: string (data URL o null)
 * }
 */

export async function loadFiles(fileList) {
  const tracks = [];

  for (const file of fileList) {
    if (!file.type.startsWith('audio/')) continue;

    const track = {
      type: 'local',
      file,
      title: file.name.replace(/\.[^/.]+$/, ""), // rimuove estensione
      duration: 0,
      cover: null
    };

    try {
      track.duration = await getAudioDuration(file);
      track.cover = await extractCover(file);
    } catch (err) {
      console.warn('Errore nel parsing del file', file.name, err);
    }

    tracks.push(track);
  }

  // Eventuale notifica a chi ascolta che sono stati caricati nuovi tracks
  emit('libraryUpdate', tracks);

  return tracks;
}

// --- FUNZIONI AUSILIARIE ---

/**
 * Ottiene la durata di un file audio
 * @param {File} file
 * @returns {Promise<number>} durata in secondi
 */
function getAudioDuration(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.src = url;

    audio.addEventListener('loadedmetadata', () => {
      resolve(audio.duration);
      URL.revokeObjectURL(url);
    });

    audio.addEventListener('error', (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    });
  });
}

/**
 * Estrae la copertina dai metadata ID3 se disponibile
 * @param {File} file
 * @returns {Promise<string|null>} data URL immagine o null
 */
function extractCover(file) {
  return new Promise((resolve) => {
    // Per semplicità possiamo usare jsmediatags o simile in futuro
    // Per ora ritorniamo null se non vogliamo dipendenze
    resolve(null);
  });
}