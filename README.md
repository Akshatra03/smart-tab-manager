# Smart Tab Manager

A Chrome Extension that uses AI to understand **why your tabs exist** — not just what they are.

## Features
- AI-powered tab classification using Groq (LLaMA 3.1)
- Human-readable summaries for every tab
- Intelligent grouping by context
- Duplicate tab detection with URL normalization
- Inactive and stale tab detection with age badges
- Smart close suggestions with scoring algorithm
- Per-tab notes with persistent storage
- Live search and filter
- Stats dashboard (total, inactive, to close)
- Rule-based fallback when AI is unavailable
- Keyboard shortcut Ctrl+Shift+S

## Tech Stack
- Chrome Extension Manifest V3
- Vanilla JavaScript (modular ES6)
- Groq API (LLaMA 3.1 8B Instant)
- Chrome Storage API

## Setup
1. Clone this repo
2. Go to chrome://extensions
3. Enable Developer mode
4. Click "Load unpacked" and select the folder
5. Right-click the extension icon → Options → paste your Groq API key

## Get a free Groq API key
https://console.groq.com

## Project Structure
```
smart-tab-manager/
├── manifest.json
├── src/
│   ├── background.js
│   ├── content.js
│   ├── engines/
│   │   ├── aiEngine.js
│   │   ├── contextEngine.js
│   │   ├── activityEngine.js
│   │   └── suggestionEngine.js
│   └── utils/
│       ├── storage.js
│       └── urlNormalizer.js
└── public/
    ├── popup.html
    ├── popup.js
    ├── options.html
    └── options.js
```