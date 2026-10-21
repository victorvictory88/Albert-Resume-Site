# Albert Chan · A career in motion

An interactive career portfolio with an ivory and slate palette, a directional illustrated avatar, an interactive crew pass, and a scroll-driven rowing course.

The introduction emphasizes AI commercialization and production experience. Six career chapters cover P&G, two Google roles, Tickr, Meta, and Rowland AI.

## Run locally

Serve the site with Python.

```sh
python3 -m http.server 8765
```

Open `http://localhost:8765` in your browser.

## GitHub Pages

The published repository contains `index.html`, `style.css`, `app.js`, `.nojekyll`, and the referenced assets directory. GitHub Pages serves the `main` branch from its root directory.

All site paths are relative, supporting the repository subdirectory at `/Albert-Resume-Site/`. The page uses browser-native JavaScript and CSS without a build step or third-party runtime scripts.

## Interactions

- Move the cursor across the opening section to change the avatar viewing direction.
- Use the three direction buttons for touch or keyboard input.
- Drag the crew pass or activate it to flip between its two sides.
- Scroll through the career chapters to move the boat along the course.
- Select a numbered checkpoint to jump directly to a chapter.
- Expand each chapter for additional career detail.
- Pause decorative motion with the header control.

System reduced-motion preferences are respected. The illustrated avatar uses layered image animation and directional views. The animation uses a lightweight illustrated character.

## Source boundaries

Career content comes from Albert’s supplied resume and approved career facts. Source documents, family photography, private biographical information, and original avatar sheets are excluded from the published repository.

The rowing course provides a visual navigation theme. It makes no claims about personal rowing results or athletic history.
