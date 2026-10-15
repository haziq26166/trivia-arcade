# Trivia Arcade — Retro Pixel Quiz

A single-player timed trivia game built with plain HTML, CSS and JavaScript. It is designed to run as a static site on GitHub Pages.

## Features

- Built-in multiple-choice questions, shuffled each run
- Every question in `questions.json` is included in each run
- One consistent 15-second timer per question (no category or difficulty selection)
- Score points for correct answers, with time and streak bonuses
- Immediate answer feedback and explanations in the end-of-run review
- Retro pixel-inspired responsive layout
- Synthesized arcade sound effects using the Web Audio API (no sound files needed)
- Achievements, saved personal best, and lifetime statistics using `localStorage`
- No frameworks, build step, backend, API key, or database

## Run locally

Because the game fetches `questions.json`, use a local static server instead of opening `index.html` directly via `file://`.

For example, if Python is installed:

```bash
python -m http.server 8000
```

Then open <http://localhost:8000>.

## Publish with GitHub Pages

1. Create a new repository on GitHub, for example `trivia-arcade`.
2. Upload these files and folders to the repository root:
   - `index.html`
   - `style.css`
   - `script.js`
   - `questions.json`
   - `README.md`
3. In the repository, open **Settings → Pages**.
4. Under **Build and deployment**, select **Deploy from a branch**.
5. Select the `main` branch and `/(root)` folder, then click **Save**.
6. Wait for the Pages deployment to finish. The site URL will look like `https://YOUR-USERNAME.github.io/trivia-arcade/`.

If your repository is named `YOUR-USERNAME.github.io`, the URL is instead `https://YOUR-USERNAME.github.io/`.

## Customizing questions

Edit `questions.json`. Each question uses this structure:

```json
{
  "id": 1,
  "question": "Which planet is known as the Red Planet?",
  "options": ["Venus", "Mars", "Jupiter", "Mercury"],
  "answer": 1,
  "explanation": "Mars looks reddish because iron minerals in its soil have oxidized."
}
```

`answer` is a zero-based index: `0` means the first option, `1` the second, and so on. Each question must have exactly four options. The `category` field is not needed.

## Notes

- High scores and achievements are saved only in the current browser and device. They are not shared across visitors.
- Clearing browser site data removes the saved progress.
- Google Fonts are used for the intended pixel typography; if unavailable, the layout falls back to system monospace fonts.
- Browser audio generally starts only after the player interacts with the page.
- GitHub Pages may take a few minutes to publish changes.
