# Larpcord — website

The site at <https://larpcorddc.vercel.app>. Plain HTML, CSS and JavaScript: no build
step, no framework, nothing loaded from another host.

| File | What it is |
| --- | --- |
| `index.html` | Landing page |
| `privacy.html` | Privacy |
| `404.html` | Shown for any address that does not exist |
| `assets/site.css` | This project's accent colour and anything only this site needs |
| `assets/scene.js` | The 3D scene in the page header |
| `assets/aqx/` | The look and behaviour shared by all AquAxs project sites |

## The shared part

`assets/aqx/` is the same in every project site: the stylesheet (`aqx.css`),
the interactions (`aqx.js`), the 3D stage (`stage.js`), three.js and the three
typefaces. It follows the portfolio at aqua.is-a.dev: a black sky with slow
dots, glass cards that lean towards the pointer, Bodoni Moda headlines.
Change the accent in `assets/site.css` (`--ac`, `--ac-hi`), not in `aqx.css`.

## The 3D scene

`assets/scene.js` exports one function that builds its objects into
`stage.frame`. The stage (`assets/aqx/stage.js`) does the rest: camera, lights,
resizing, pointer and touch, pausing off screen. With reduced motion the scene
is one still frame; without WebGL a glow in the accent colour stays instead.

## Preview

Links have no `.html` (Vercel serves `/download` from `download.html`), so open
the folder through a server that does the same:

```bash
npx serve site
```

## Deploy

Vercel, root directory `site`, no build command. `vercel.json` sets clean URLs
and the security headers. The site sets no cookies and stores nothing.

## The "Try it" preview

`app.js` runs the live preview, the (hidden) money rain and the download buttons; it is
unchanged by the redesign. The preview's own styles are the old ones, every selector scoped
to `#try`, in `assets/site.css` — so the preview still looks like Discord while the rest of
the page uses the shared kit.

## Download buttons

`app.js` asks `api.github.com` for the latest release and points the buttons at the setup
`.exe`, `Larpcord.apk` and `Larpcord.ipa` (a mobile button falls back to the newest release
that has its file). Without the API the buttons keep their links to the releases page. That
request is why `connect-src` allows `https://api.github.com`, and it is described in
`privacy.html`.

## Logo

`assets/logo.png` is a copy of `assets/larpcordlogo.png` from the repository root, made by
`scripts/generate-icons.py`. Replace the source and run the script; do not edit the copy.
