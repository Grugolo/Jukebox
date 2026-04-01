// js/modules/youtube.js

import { emit } from '../core/events.js';

/**
 * Track YouTube = {
 *   type: 'youtube',
 *   id: string,
 *   title: string,
 *   duration: number (secondi),
 *   thumb: string (thumbnail URL)
 * }
 */

// --- SEARCH YOUTUBE ---
// Assumiamo uso API YouTube Data V3 (richiede API key)
// Restituisce array di Track
export async function search(query) {
  const API_KEY = 'AIzaSyBwZsEchAW5KOytpVE6lqRQaXYdOrsbYT0'; // sostituire con chiave reale
  const endpoint = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(query)}&maxResults=10&key=${API_KEY}`;

  const res = await fetch(endpoint);
  if (!res.ok) throw new Error('YouTube API error');

  const data = await res.json();
  const tracks = [];

  for (const item of data.items) {
    const videoId = item.id.videoId;
    const title = item.snippet.title;
    const thumb = item.snippet.thumbnails.medium.url;

    // Durata va ottenuta separatamente con video API
    const duration = await fetchDuration(videoId, API_KEY);

    tracks.push({ type: 'youtube', id: videoId, title, duration, thumb });
  }

  // Notifica che sono stati caricati risultati
  emit('youtubeResults', tracks);

  return tracks;
}

// --- PLAYBACK HELPERS ---
// Questi possono delegare a un player interno se si usa iframe API
let youtubePlayer = null;

export function initPlayer(containerId) {
  // containerId = id div per iframe YouTube
  if (youtubePlayer) return;

  youtubePlayer = new YT.Player(containerId, {
    height: '0',
    width: '0',
    events: {
      onStateChange: onPlayerStateChange
    }
  });
}

export function play(videoId) {
  if (!youtubePlayer) return;
  youtubePlayer.loadVideoById(videoId);
  emit('play');
}

export function pause() {
  if (!youtubePlayer) return;
  youtubePlayer.pauseVideo();
  emit('pause');
}

export function seek(time) {
  if (!youtubePlayer) return;
  youtubePlayer.seekTo(time, true);
}

// --- UTILS ---

async function fetchDuration(videoId, apiKey) {
  const endpoint = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoId}&key=${apiKey}`;
  const res = await fetch(endpoint);
  if (!res.ok) return 0;

  const data = await res.json();
  if (!data.items || !data.items[0]) return 0;

  const durationISO = data.items[0].contentDetails.duration;
  return iso8601ToSeconds(durationISO);
}

// Convert ISO 8601 duration (PT1H2M3S) → seconds
function iso8601ToSeconds(iso) {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || 0, 10);
  const minutes = parseInt(match[2] || 0, 10);
  const seconds = parseInt(match[3] || 0, 10);
  return hours * 3600 + minutes * 60 + seconds;
}

// Event handler YouTube iframe API
function onPlayerStateChange(event) {
  switch (event.data) {
    case YT.PlayerState.PLAYING:
      emit('play');
      break;
    case YT.PlayerState.PAUSED:
      emit('pause');
      break;
    case YT.PlayerState.ENDED:
      emit('trackEnd');
      break;
  }
}
