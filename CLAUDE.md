# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

focus.fm is a vanilla web application (no build step, no framework, no package manager). It runs directly in the browser from static files.

## Running the App

Open `index.html` in a browser, or serve it locally with any static file server:

```bash
python3 -m http.server 8080
# then visit http://localhost:8080
```

## Architecture

The project is a single-page app split across three files:

- [index.html](index.html) — markup and entry point; loads `styles.css` and `app.js`
- [styles.css](styles.css) — all styling
- [app.js](app.js) — all application logic; no modules or bundler, just a plain script

There is no build, lint, or test tooling configured yet.
