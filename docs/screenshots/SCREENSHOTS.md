# Screenshots checklist

The README references images in this directory. Drop the files here with the exact filenames below and they'll render on GitHub automatically.

## Required screenshots

| Filename | What to capture | Where to take it |
|---|---|---|
| `hero.png` | Best single shot of the product. The interview UI mid-session with chat on the left, code on the right, ideally with a partial AI message visible. Use a high-quality problem like Two Sum. | `/interview` |
| `landing.png` | The full landing page hero — the headline + product window mock. Scroll to top first. | `/` |
| `text-mode.png` | A real text-mode conversation. Show 3–4 message exchanges and the code editor with partial code in it. | `/interview` |
| `voice-mode.png` | The voice panel mid-conversation. Ideally captured *while* the mic button is in the listening (red pulse) or speaking (blue) state. | `/interview` with voice mode on |
| `scorecard.png` | The output panel showing a completed scorecard — verdict pill, 4 axis scores, strengths/weaknesses, summary. | `/interview` after submitting a working solution |

## Capture settings

- **Resolution:** Set browser window to ~1440×900 (a standard laptop). On macOS retina display, screenshots will export at 2× — that's fine, GitHub downsamples.
- **Tool:**
  - Mac: `Cmd+Shift+4` then drag, or `Cmd+Shift+5` for window mode (cleaner — no shadow).
  - Windows: Snipping Tool, "Window Snip".
- **Theme:** Use the dark theme (it's the only theme — don't worry about light mode).
- **Format:** PNG. Aim for <500 KB each. If a screenshot is over 1 MB, run it through [TinyPNG](https://tinypng.com).

## How to make them look good

- Hide your browser bookmarks bar before capturing (`Cmd+Shift+B` on Chrome).
- Use a clean browser profile or incognito so no extension icons show.
- Crop tight — remove URL bar / tab strip unless they add context.
- Zoom in if a UI detail (the scorecard) is the focus.
- For `voice-mode.png`, time the screenshot so the red pulse around the mic is visible. The pulse animation peaks every ~700ms.

## Bonus: a GIF

GitHub renders animated GIFs in markdown. If you want one more visual asset:

- **Tool:** [Kap](https://getkap.co) (free, Mac) or [ScreenToGif](https://www.screentogif.com) (free, Windows).
- **Duration:** ≤6 seconds, 800px wide max, ≤2 MB.
- **What to capture:** The voice mode loop — click mic, talk one phrase, click again, AI replies. Loop seamlessly.
- **Filename:** `voice-mode.gif`. Update the README to use it instead of the static voice screenshot.

## Embed-ready table for the README

The README already has a 2×2 grid using these filenames. Once all five files are present, just push — no markdown edit needed.

## Optional: an OG image

If you ever post this on Twitter/LinkedIn, add an `og-image.png` (1200×630) and reference it in `frontend/index.html` via `<meta property="og:image">`. Not required for the README itself.
