# AI Chatbot Feature Package

This package contains all the files needed to add the Gemini AI chatbot feature to your energy monitoring dashboard.

## 📁 Package Contents

### Backend Files:

- `backend/geminiService.js` - Main AI service with Gemini integration
- `backend/ai.js` - API routes for AI endpoints
- `backend/.env.example` - Environment variables template

### Frontend Files:

- `frontend/energy_assistant_widget.js` - React component for AI chat widget
- `frontend/energy_assistant_widget.css` - Styles for the widget

### Configuration:

- `.env.example` - Root environment template

## 🚀 Installation Instructions

### 1. Backend Setup

1. Copy `backend/geminiService.js` to `your-project/backend/services/`
2. Copy `backend/ai.js` to `your-project/backend/routes/`
3. Add your Google Gemini API key to `backend/.env`:

   ```
   GOOGLE_GEMINI_API_KEY="your-api-key-here"
   ```

4. Ensure your `backend/server.js` includes the AI route:
   ```javascript
   app.use("/api/ai", require("./routes/ai"));
   ```

### 2. Frontend Setup

1. Copy `frontend/energy_assistant_widget.js` to `your-project/src/components/`
2. Copy `frontend/energy_assistant_widget.css` to `your-project/src/styles/`

3. Add the widget to your main app component (`src/components/app.js`):

   ```javascript
   // Add import
   import EnergyAssistantWidget from "./energy_assistant_widget";

   // Add component in render method (before closing </div>)
   <EnergyAssistantWidget />;
   ```

### 3. Dependencies

Make sure you have these npm packages installed:

```bash
npm install @google/generative-ai
```

## 🎯 Features

- **⚡ Energy Assistant Widget** - Floating button in bottom-right corner
- **🤖 AI Chat Interface** - Collapsible chat popup
- **📊 Real-time Data Analysis** - AI analyzes your actual MongoDB energy data
- **🔒 Energy-focused Responses** - AI only answers energy-related questions
- **📈 Historical Data Access** - AI can see your last 20 readings for trends
- **💰 Cost Analysis** - Automatic cost calculations and recommendations

## 🔧 API Endpoints

- `POST /api/ai/gemini/chat` - Chat with AI
- `GET /api/ai/gemini/context` - Get current energy data context
- `POST /api/ai/gemini/analyze` - Get detailed energy analysis
- `POST /api/ai/gemini/report` - Generate comprehensive report

## 🎨 Widget Appearance

The widget appears as a ⚡ button in the bottom-right corner of your dashboard. When clicked, it opens a beautiful gradient chat interface where users can ask energy-related questions.

## 🔑 Getting Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add it to your `.env` file

## 🚨 Important Notes

- The AI only responds to energy-related questions
- Requires active MongoDB connection with energy readings
- Free tier has 20 requests per day limit
- Widget automatically handles API quota limits gracefully

## 🐛 Troubleshooting

- **Widget not appearing**: Check import and component placement in app.js
- **API errors**: Verify Gemini API key and MongoDB connection
- **No data responses**: Ensure you have energy readings in MongoDB
- **Quota exceeded**: Wait 24 hours or upgrade to paid Gemini API

## 📞 Support

If you need help integrating this feature, check that:

1. All files are in correct locations
2. API key is valid and added to .env
3. MongoDB has energy readings
4. Backend server is running on port 5000
5. Frontend can access the backend API

Happy coding! ⚡🤖
