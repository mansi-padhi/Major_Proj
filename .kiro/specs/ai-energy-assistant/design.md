# Design Document: AI Energy Assistant

## Overview

The AI Energy Assistant provides users with intelligent, natural language insights into their energy consumption through two interfaces: an automated Energy Report and an interactive Energy Chat. The system follows a data-first architecture where comprehensive context is pre-fetched from MongoDB and sent to Google Gemini API, rather than attempting to translate user questions into database queries. This approach is more reliable, produces better answers, and simplifies the implementation.

The feature is integrated into the dashboard as a dedicated panel that replaces the Usage-by-Rooms view. All AI requests are rate-limited (20 per hour per device) and report results are cached (6-hour TTL) to manage API costs.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend (React)                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  AIAssistantComponent                                    │   │
│  │  ├─ Report Tab: Generate button → Insight cards         │   │
│  │  └─ Chat Tab: Message input → Scrollable history        │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Backend (Express.js)                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  routes/ai.js                                            │   │
│  │  ├─ POST /api/ai/report                                 │   │
│  │  └─ POST /api/ai/chat                                   │   │
│  │  └─ GET /api/ai/context (debug)                         │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  services/geminiService.js                               │   │
│  │  ├─ buildComprehensiveContext()                          │   │
│  │  ├─ generateDetailedReport()                             │   │
│  │  ├─ chatWithAnalysis()                                   │   │
│  │  └─ Rate limiting & caching logic                        │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │ MongoDB queries
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MongoDB                                       │
│  ├─ Reading (energy data)                                       │
│  ├─ AIReport (cached reports)                                   │
│  └─ Other collections (device info, etc.)                       │
└─────────────────────────────────────────────────────────────────┘
                             │ API call
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Google Gemini API (gemini-1.5-flash)               │
│  ├─ Report generation: 5 structured insights                    │
│  └─ Chat: Conversational Q&A with context                       │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Frontend: AIAssistantComponent

**Location:** `src/components/ai_assistant_component.js`

**Props:** None (uses internal state)

**State:**
- `activeTab`: 'report' | 'chat'
- `insights`: Array of insight objects
- `reportLoading`: Boolean
- `reportError`: String or null
- `fromCache`: Boolean
- `cachedAt`: Timestamp or null
- `messages`: Array of message objects { id, role, text, ts, isError? }
- `chatInput`: String
- `chatLoading`: Boolean
- `chatError`: String or null
- `chatHistory`: Array of { role, content } for backend context

**Key Methods:**
- `generateReport()`: Calls POST /api/ai/report, updates insights state
- `sendMessage()`: Calls POST /api/ai/chat, appends to messages and chatHistory
- `handleKeyDown()`: Sends message on Enter (not Shift+Enter)
- `renderReportTab()`: Renders Generate button, insight cards, error/loading states
- `renderChatTab()`: Renders message list, input field, hints

**Styling:**
- Dark theme (background #1e1e2e, text #CCCCCC)
- Type-based color coding: anomaly (red), recommendation (cyan), prediction (orange), summary (green)
- Responsive layout with flexbox

### Backend: routes/ai.js

**Endpoints:**

1. **POST /api/ai/report**
   - Request: `{ deviceId?: string }`
   - Response: `{ success: true, insights: [...], fromCache: boolean, cachedAt?: timestamp }`
   - Error: `{ success: false, error: string }` with status 429, 503, or 500

2. **POST /api/ai/chat**
   - Request: `{ message: string, history?: [...], deviceId?: string }`
   - Response: `{ success: true, reply: string, timestamp: timestamp }`
   - Error: `{ success: false, error: string }` with status 429, 503, or 500

3. **GET /api/ai/context** (debug endpoint)
   - Query: `?deviceId=esp32-1`
   - Response: `{ success: true, context: {...} }`

### Backend: services/geminiService.js

**Key Functions:**

1. **buildComprehensiveContext(deviceId)**
   - Fetches last 30 days of data from MongoDB
   - Aggregates: today, 7-day, 30-day summaries
   - Per-load breakdown with percentages
   - Latest reading and last 20 readings
   - Returns: Context object with all data formatted to appropriate precision

2. **generateDetailedReport(deviceId)**
   - Checks rate limit
   - Returns cached report if < 6 hours old
   - Calls Gemini API with system prompt and context
   - Parses JSON response into insight array
   - Caches result in MongoDB
   - Returns: { insights, fromCache, cachedAt? }

3. **chatWithAnalysis(message, history, deviceId)**
   - Checks rate limit
   - Builds context object
   - Constructs chat history for Gemini
   - Sends message with system prompt and context
   - Returns: { reply, timestamp }

4. **checkRateLimit(deviceId)**
   - Maintains in-memory map of request timestamps per device
   - Returns false if > 20 requests in last hour
   - Returns true and records timestamp if within limit

## Data Models

### AIReport Schema

```javascript
{
  deviceId: String,           // e.g., 'esp32-1'
  insights: Mixed,            // Array of insight objects
  source: String,             // 'gemini'
  generatedAt: Date           // Timestamp of generation
}
```

**Indexes:** `{ deviceId: 1, generatedAt: -1 }`

### Context Object Structure

```json
{
  "status": "active",
  "electricity_rate_inr": 8.0,
  "today": {
    "energy_kwh": 2.5,
    "avg_power_w": 104.2,
    "max_power_w": 2500,
    "cost_inr": 20.0,
    "readings": 144
  },
  "last_7_days": {
    "energy_kwh": 18.3,
    "avg_power_w": 108.9,
    "max_power_w": 2800,
    "cost_inr": 146.4
  },
  "last_30_days": {
    "energy_kwh": 75.2,
    "avg_power_w": 104.3,
    "max_power_w": 3200,
    "cost_inr": 601.6
  },
  "load_breakdown": [
    {
      "load": "AC",
      "energy_kwh": 45.0,
      "avg_power_w": 1875,
      "max_power_w": 2500,
      "cost_inr": 360.0,
      "percentage": 59.8
    }
  ],
  "latest_reading": {
    "voltage_v": 230,
    "current_a": 5.2,
    "power_w": 1196,
    "temperature": 28,
    "smoke_adc": 150,
    "timestamp": "2024-01-15T14:30:00Z"
  },
  "recent_readings": [...],
  "total_readings": 4320
}
```

### Insight Card Structure

```javascript
{
  title: String,              // e.g., "Peak Usage Window"
  body: String,               // 1-2 sentences with specific numbers
  type: 'anomaly' | 'recommendation' | 'prediction' | 'summary'
}
```

## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Report Insight Count
*For any* device with energy data, when a report is generated, the system SHALL return exactly 5 insight cards.
**Validates: Requirements 1.2**

### Property 2: Insight Type Validity
*For any* generated insight, the type field SHALL be one of: 'anomaly', 'recommendation', 'prediction', or 'summary'.
**Validates: Requirements 1.2**

### Property 3: Cache Expiry
*For any* device, if a report is generated and then requested again within 6 hours, the system SHALL return the cached report without calling the API.
**Validates: Requirements 1.5**

### Property 4: Rate Limit Enforcement
*For any* device, if more than 20 AI requests are made within a 1-hour window, the system SHALL reject subsequent requests with a 429 error.
**Validates: Requirements 4.1, 4.2**

### Property 5: Context Data Completeness
*For any* device with energy data, the context object sent to Gemini SHALL include today's summary, 7-day summary, 30-day summary, per-load breakdown, and latest reading.
**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

### Property 6: Chat History Preservation
*For any* chat conversation, the last 10 messages SHALL be included in the context sent to the LLM for subsequent requests.
**Validates: Requirements 2.3**

### Property 7: Out-of-Scope Question Handling
*For any* question unrelated to energy consumption, the system SHALL respond that the question is out of scope and offer to help with energy-related questions.
**Validates: Requirements 2.4**

### Property 8: API Error Handling
*For any* failed API request, the system SHALL return a JSON response with `success: false` and an appropriate HTTP status code (429, 503, or 500).
**Validates: Requirements 5.1, 5.2, 5.3**

### Property 9: Numeric Precision
*For any* numeric value in the context object, energy values SHALL be formatted to 4 decimal places, power values to 1 decimal place, and cost values to 2 decimal places.
**Validates: Requirements 8.5**

### Property 10: Chat Message Ordering
*For any* chat conversation, messages SHALL be displayed in chronological order with user messages on the right and bot messages on the left.
**Validates: Requirements 7.1, 7.2**

## Error Handling

**API Key Not Configured:**
- Status: 503 Service Unavailable
- Response: `{ success: false, error: 'Gemini API key not configured in .env' }`
- Frontend: Display error box with instructions to add key to backend/.env

**Rate Limit Exceeded:**
- Status: 429 Too Many Requests
- Response: `{ success: false, error: 'Rate limit exceeded. Max 20 AI requests per hour.' }`
- Frontend: Display error message in chat or report interface

**Gemini API Failure:**
- Status: 500 Internal Server Error
- Response: `{ success: false, error: '<error message>' }`
- Frontend: Display error message with retry option

**No Data Available:**
- Status: 200 OK
- Response: `{ insights: [{ title: 'No Data Available', body: 'Connect your ESP32...', type: 'summary' }], fromCache: false }`
- Frontend: Display single summary card

**Invalid Request:**
- Status: 400 Bad Request
- Response: `{ success: false, error: 'message is required' }`
- Frontend: Validate input before sending

## Testing Strategy

### Unit Testing

Unit tests verify specific examples and edge cases:
- Context object assembly with various data scenarios
- Rate limit calculation and enforcement
- Cache expiry logic
- Error response formatting
- Numeric precision formatting

### Property-Based Testing

Property-based tests verify universal properties that should hold across all inputs:
- Report generation always returns exactly 5 insights
- Insight types are always valid
- Cache returns within 6-hour window
- Rate limiting correctly rejects after 20 requests
- Context object always contains required fields
- Chat history is preserved correctly
- Out-of-scope questions are handled appropriately
- API errors return correct status codes
- Numeric values maintain correct precision
- Chat messages maintain chronological order

**Testing Framework:** Jest with fast-check for property-based testing

**Configuration:** Minimum 100 iterations per property test

**Test File Location:** `backend/services/__tests__/geminiService.test.js` and `src/components/__tests__/ai_assistant_component.test.js`

### Integration Testing

Integration tests verify end-to-end flows:
- Full report generation flow from button click to display
- Full chat flow from message input to response display
- Cache hit scenario
- Rate limit scenario
- Error scenarios with proper error display
