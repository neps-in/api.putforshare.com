# README.md

## Requirements

1. Node.js version 20.19+ or 22.12+.
2. yarn
3. Use `nvm use` in this directory to pick up `.nvmrc` on older macOS installs.

# To setup from the scratch

## create project dir

mkdir dash && cd dash

## Add React and React Admin

yarn add react-admin react react-dom

## Old MacOs Specific Mac Mojave

yarn add -D vite @vitejs/plugin-react esbuild-wasm --ignore-scripts

## Run locally

Run it locally from `dash` with:

```bash
nvm use
npm run dev
```
