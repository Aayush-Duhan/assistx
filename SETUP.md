# Quick Setup Guide for AI Integration

## Prerequisites

1. **Node.js** 16+ installed
2. **Google AI API Key** from [Google AI Studio](https://makersuite.google.com/app/apikey)

## Setup Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
```bash
# Copy the example file
cp .env.example .env.local

# Edit .env.local and add your Google AI API key
GOOGLE_GENERATIVE_AI_API_KEY=your-actual-google-ai-key-here
```

### 3. Build and Run
```bash
# Development mode
npm run dev

# Or build for production
npm run build
```

## Testing the AI Feature

1. **Start the app**: `npm run dev`
2. **Press Ctrl+Enter** (or Cmd+Enter on macOS)
3. **You should see**:
   - Screenshot capture
   - AI analysis window appears
   - Real-time streaming response from Google Gemini

## Troubleshooting

### "AI service not configured" Error
- Check that `.env.local` exists in the root directory
- Verify your Google AI API key is correctly set
- Make sure you've configured the API key properly
- Restart the app after changing environment variables

### Switching Between Models
- Go to Settings to change between different Gemini models
- Available models: Gemini 2.5 Flash, Gemini 2.5 Pro, Gemini 2.5 Flash Lite

### Screenshot Issues
- On macOS: Grant screen recording permissions in System Preferences
- On Windows: Make sure the app has necessary permissions

### No AI Response
- Check your internet connection
- Verify your API key has credits/quota
- Check the developer console for error messages

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GOOGLE_GENERATIVE_AI_API_KEY` | Your Google AI API key | Yes |

## Support

The AI feature uses:
- **Google Gemini** for screenshot analysis and AI responses
- **Vercel AI SDK** for streaming responses
- **Electron desktopCapturer** for screenshots 