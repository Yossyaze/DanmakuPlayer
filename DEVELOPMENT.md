# DanmakuPlayer Development Guide

This document outlines the project structure, available scripts, and development workflows for the DanmakuPlayer project.

## Project Structure

- `src/`: Source code for the React application.
  - `components/`: UI components.
  - `hooks/`: Custom React hooks.
  - `utils/`: Utility functions.
- `public/`: Static assets.
- `.agent/workflows/`: Workflows for the AI agent.

## Available Configuration

- `vite.config.js`: Vite configuration, including custom logging middleware.
- `eslint.config.js`: ESLint configuration.
- `tailwind.config.js`: Tailwind CSS configuration.

## Logging System

The dev server includes custom middleware (`vite.config.js`) to handle logging from the browser.

- **Endpoints**:

  - `/__debug_log`: Appends to `debug.log`.
  - `/__error_log`: Appends to `browser-error.log`.
  - `/__reset_logs`: Resets both log files.

- **Log Files**:
  - `debug.log`: General debug information.
  - `browser-error.log`: Browser-side errors.

## Common Tasks

### Start Development Server

```bash
npm run dev
```

### Build for Production

```bash
npm run build
```

### Lint Code

```bash
npm run lint
```
