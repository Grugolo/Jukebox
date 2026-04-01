// core/player.js
// Responsabilità: gestire TUTTA la riproduzione
// NON tocca il DOM

import { emit } from './events.js';
import { store } from './store.js';
import { popNext } from './queue.js';
import { play as playYouTube, pause as pauseYouTube, seek as seekYouTube } from '../modules/youtube.js';

class Player {
  constructor() {
    this.audio = new Audio();
    this.audio.addEventListener('timeupdate', () => {
      store.currentTime = this.audio.currentTime;
      emit('timeUpdate', { currentTime: store.currentTime });
    });
    this.audio.addEventListener('ended', () => this._onTrackEnd());
  }

  /** Play a specific track */
  async play(track) {
    if (!track) return;
    store.currentTrack = track;
    store.isPlaying = true;

    if (track.type === 'local') {
      this.audio.src = URL.createObjectURL(track.file);
      await this.audio.play();
    } else if (track.type === 'youtube') {
      await playYouTube(track.id);
    }

    emit('trackChange', track);
    emit('play', track);
  }

  pause() {
    if (!store.isPlaying) return;
    store.isPlaying = false;

    if (!store.currentTrack) return;
    if (store.currentTrack.type === 'local') {
      this.audio.pause();
    } else if (store.currentTrack.type === 'youtube') {
      pauseYouTube();
    }

    emit('pause', store.currentTrack);
  }

  toggle() {
    if (store.isPlaying) {
      this.pause();
    } else {
      this.play(store.currentTrack);
    }
  }

  next() {
    let nextTrack;
    if (store.isShuffle && store.playlist.length) {
      const randomIndex = Math.floor(Math.random() * store.playlist.length);
      nextTrack = store.playlist[randomIndex];
    } else {
      nextTrack = popNext(); // dalla queue
    }

    if (nextTrack) this.play(nextTrack);
  }

  prev() {
    if (!store.history.length) return;
    const prevTrack = store.history.pop();
    if (prevTrack) this.play(prevTrack);
  }

  seek(time) {
    if (!store.currentTrack) return;
    store.currentTime = time;

    if (store.currentTrack.type === 'local') {
      this.audio.currentTime = time;
    } else if (store.currentTrack.type === 'youtube') {
      seekYouTube(time);
    }

    emit('timeUpdate', { currentTime: time });
  }

  _onTrackEnd() {
    if (store.isLoop) {
      this.seek(0);
      this.play(store.currentTrack);
    } else {
      this.next();
    }
  }
}

// Esportiamo istanza singleton
export const player = new Player();