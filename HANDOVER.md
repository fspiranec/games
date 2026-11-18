# Handover notes – "Moje igre"

Kids' games site (mostly ages 2–4). Static HTML/JS, no build step.
Repo: `github.com/fspiranec/games` (branch `main`) → auto-deployed by **Vercel** on every push.
Installable as an offline app (PWA) on the Android tablet.

## Ground rules (from the owner)

- **Every visible string in Croatian + English**: `K.t('hrvatski', 'English')`.
- **No copyrighted characters** (Paw Patrol etc. were declined → original pups/dinos are used).
- **Every game has levels and an Easy/Hard switch.**
- Push finished work straight to `main`.
- **Before every commit: `node tools/update-sw.js`** (regenerates `sw.js`, otherwise the offline app won't pick up new/changed files).
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Layout

```
index.html                  dashboard (GAMES array = one card per game, grouped)
manifest.webmanifest        PWA manifest ("Moje igre", fullscreen)
sw.js                       GENERATED service worker – do not edit by hand
icons/                      PWA icons (192, 512, maskable, apple-touch)
tools/update-sw.js          builds sw.js: lists every file + content-hash version
tools/sw.template.js        the service-worker source
games/_shared/kids.js       shared toolkit, global `K`
games/<slug>/index.html     one game per folder
games/<slug>/thumb.svg      dashboard thumbnail
```

`.vercelignore` keeps `tools/` off the site.

## Games

| Folder | Name | Difficulty id | Easy / Hard |
|---|---|---|---|
| `bijeg-od-kita` | Bijeg od kita | – | Owner's original game; Croatian only, not using kids.js |
| `jan-i-trex-lava` | Jan i T-Rex: Lava | `jan-lava` | **Endless** runner, only lava jumping (no levels, meteors off: `L.met: 0`). Easy 3 lives/slower, Hard 1 life/faster/wider pits. Switch is a top-bar button |
| `mali-doktor` | Mali doktor | `doktor` | Magnifier finds germs, then bloodstream levels. Hard: more/smaller/moving/multiplying germs, smaller lens |
| `memorija` | Memorija | `memorija` | Themes, solo / 2 players / vs bot (Sleepy/Smart), up to 5x5. Easy: preview of all cards at start |
| `hrani-dinosaura` | Hrani dinosaura | `hrani` | Hard: +1 option, 7 feedings. Easy: right food bounces after a mistake |
| `pronadi-sjenu` | Pronađi sjenu | `sjene` | Hard: +1 option, 8 rounds. Easy: right answer glows after a mistake |
| `balonci` | Balončići | `baloni` | Pop / count / colour / order modes. Hard: faster, smaller, more |
| `tko-se-skriva` | Tko se skriva? | `skriva` | Hard: +2 spots, 1.5 s memorise. Easy: right spot wiggles after a mistake |
| `izlegni-jaje` | Izlegni jaje | `jaje` | Hard: more taps, egg jumps |
| `slagalica` | Slagalica | `slagalica` | Real jigsaw tabs (SVG clipPath). Picture shown with countdown (10 s easy / 5 s hard), then removed completely; hard = tighter snap |
| `bojanka` | Bojanka | `bojanka` | Easy: free colouring. Hard: "colour like the example" – only the right colour sticks |

## `K` toolkit (games/_shared/kids.js)

- **Language**: `K.LANGS` (hr, en – each has a voice regex), `K.lang`, `K.t(...)` positional per `K.LANGS`, `K.setLang`, `K.langMenu`. Stored in localStorage `kids-lang`; change reloads the page.
  *Adding a language*: add an entry to `K.LANGS` and a 3rd argument to every `K.t()` call (falls back to Croatian if missing – check that).
- **Voice/sound**: `K.say(text)` (speechSynthesis), `K.sfx(name)` (WebAudio: good, bad, boing, pop…), mute button.
- **UI**: `K.css()`, `K.bar(opts)` (← Igre, Razine, language, mute), `K.levelMenu(id, title, levels, onPick, extraHTML)`, `K.levelComplete(...)`, `K.levelDone`, confetti.
- **Difficulty**: `K.diff(id)` / `K.hard(id)` / `K.setDiff`, `K.diffButton(id, onChange)`. Stored in `diff-<id>` (default easy). Stars per mode: `lv-<id>` and `lv-<id>-hard` (🏆).
- **Art/helpers**: SVG dinos (6) and pups (12), `K.ANIMALS` (emoji + names), `K.draggable`, `K.flyTo`, `K.shuffle`, `K.pick`, `K.rnd`, `K.wait`.

## Adding a new game

1. `games/<slug>/index.html` – load `../_shared/kids.js`, use `K.bar`, `K.levelMenu`, `K.t` for all text, `K.hard('<id>')` for difficulty.
2. `games/<slug>/thumb.svg` (8:5).
3. Add a row to `GAMES` in `index.html`.
4. `node tools/update-sw.js`, commit, push.

## Offline / updates

- Service worker is **network-first** (4 s timeout) with cache fallback; Google Fonts stale-while-revalidate. Each run of `update-sw.js` changes `VERSION`, old caches are deleted.
- Users never reinstall: open the app online once (close and reopen) and the new version is there.
- Offline speech needs the Android voice data downloaded (Settings → Text-to-speech → Google → install Croatian/English).
- Install: Chrome → ⋮ → *Install app* on the main `*.vercel.app` address. The dashboard's 📲 button shows these instructions if Chrome doesn't offer install itself.

## Testing locally

```bash
python -m http.server 8766
```
Open `http://localhost:8766/`. The Claude preview pane blocks service workers, so offline mode was checked only by confirming every precached URL returns 200 – **not yet tested on the real tablet**.

## Known gaps / ideas

- Real-device test of offline mode and install flow.
- More voice languages (any language with a device TTS voice: German, Italian, Slovenian, Spanish…) – needs translations for every `K.t`.
- Bijeg od kita is Croatian only and has no Easy/Hard or levels in the shared style.
- Meteors in the lava game can be re-enabled with `L.met = 220` if ever wanted.
