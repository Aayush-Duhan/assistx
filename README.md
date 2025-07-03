# AssistX

An Electron application with React and TypeScript that provides AI-powered screen analysis using the Vercel AI SDK and Google Gemini.

## Features

- **Screenshot Capture**: Automatic screen capture when triggered  
- **Real-time AI Streaming**: Powered by Vercel AI SDK with Google Gemini
- **Multiple Display Support**: Works across multiple monitors
- **Modern UI**: Clean, responsive interface built with React and Tailwind CSS
- **Cross-platform**: Works on Windows, macOS, and Linux
- **Privacy-focused**: All processing happens through your own API key

## Quick Start

1. Clone this repository
2. Get your Google AI API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
3. Copy `.env.example` to `.env.local` and add your API key:
```
GOOGLE_GENERATIVE_AI_API_KEY=your_actual_api_key_here
```
4. Install dependencies: `npm install`
5. Run the app: `npm run dev`

## How It Works

1. **Press Ctrl+Enter** (Cmd+Enter on macOS) to trigger
2. App captures a screenshot of your active screen
3. Screenshot is analyzed by Google Gemini
4. AI response streams in real-time in the overlay window

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Desktop**: Electron
- **AI Integration**: Vercel AI SDK + Google Gemini
- **State Management**: MobX
- **Build Tool**: Vite

## Development

```bash
npm install
npm run dev
```

## Building

```bash
npm run build
```

## Requirements

- Node.js 16+
- Google AI API key
