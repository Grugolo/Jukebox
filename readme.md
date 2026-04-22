# Grugofy

Player musicale mobile-first per browser, senza backend. Riproduce file locali (audio/video) e video YouTube direttamente dal browser.

## Funzionalità

- **Libreria locale** — carica cartelle di file audio/video; cover estratta da ID3 tag o frame video
- **YouTube** — ricerca e riproduzione integrata tramite YouTube IFrame API
- **Coda** — aggiungi brani con swipe (sinistra = in fondo, destra = in cima); riordino drag & drop
- **Playlist** — salva coda o cronologia come playlist locale (localStorage); importa/esporta come .txt
- **Player espanso** — visualizza cover/video; swipe verticale chiude, orizzontale cambia brano; long-press 2× velocità; doppio tap seek ±5/10s
- **MediaSession** — controlli sistema (notifica Android/iOS); compatibile Brave mobile tramite silent anchor WAV
- **Shuffle / Loop** — shuffle con ordine precalcolato; loop singolo brano
- **Persistenza sessione** — stato (coda, brano corrente, posizione) salvato in localStorage al cambio traccia

## Struttura

```
Grugofy-main/
├── index.html
├── style.css
├── js/
│   ├── config.js          # API key YouTube
│   ├── main.js            # Entry point
│   ├── utils.js           # Funzioni pure (formatTime, escHtml, …)
│   ├── core/
│   │   ├── store.js       # Stato globale (zero logica)
│   │   ├── events.js      # Event bus (EventTarget)
│   │   ├── player.js      # Motore riproduzione locale + YT
│   │   ├── queue.js       # Logica coda e playlist
│   │   └── persist.js     # Salvataggio/ripristino sessione
│   ├── modules/
│   │   ├── localFiles.js  # Caricamento cartella, cover, durata
│   │   └── youtube.js     # Ricerca YT e render risultati
│   └── ui/
│       ├── controls.js    # Player bar, icone SVG, updateUI
│       ├── expandedPlayer.js  # Player espanso, gesture
│       ├── queueUI.js     # Render coda e playlist salvate
│       └── library.js     # (helper libreria)
```

## Avvio

Nessun build step. Apri `index.html` con un server locale (es. `npx serve .` oppure Live Server in VS Code). Non funziona da `file://` per via dei moduli ES e della File System Access API.

## Config

In `js/config.js` sostituisci `YT_API_KEY` con la tua chiave da [Google Cloud Console](https://console.cloud.google.com/) (API YouTube Data v3).

## Formato file playlist (.txt)

```
Nome brano, ID_o_percorso, durata_secondi
```
Esempio:
```
Bohemian Rhapsody, dQw4w9WgXcQ, 354
My Song, NomeFile.mp3, 210
```
Se una riga contiene solo il nome (senza virgole), viene cercata su YouTube e viene caricato il primo risultato.

## Compatibilità

Testato su Chrome/Brave mobile (Android). Richiede browser con supporto ES Modules, File API, MediaSession API.

