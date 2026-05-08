# Requirements Document: AI Energy Assistant

## Introduction

The AI Energy Assistant is a feature that provides users with intelligent, natural language insights into their household energy consumption. It consists of two primary components: an automated Energy Report that analyzes 30 days of historical data and generates 5 structured insights, and an Energy Chat interface that allows users to ask conversational questions about their consumption patterns. The system uses Google Gemini API to process energy data and generate contextual, data-driven responses. All AI requests are rate-limited and report results are cached to manage API costs and improve performance.

## Glossary

- **Device**: An ESP32 microcontroller that collects energy readings (voltage, current, power, temperature, smoke level)
- **Energy Reading**: A single data point containing voltage, current, power, energy consumption, timestamp, and load identifier
- **Load**: An individual electrical appliance or circuit being monitored (e.g., AC, refrigerator, lighting)
- **Context Object**: A comprehensive JSON structure containing 30-day summaries, load breakdowns, hourly patterns, and latest readings sent to the LLM
- **Insight Card**: A structured output containing title, body, and type (anomaly, recommendation, prediction, summary)
- **Rate Limiting**: A mechanism to restrict AI requests to a maximum per hour per device to manage API costs
- **Caching**: Storage of generated reports with a 6-hour TTL to avoid redundant API calls
- **Gemini API**: Google's generative AI service used for natural language analysis
- **Chat History**: The last 10 messages in a conversation session, stored in component state and sent to the LLM for context

## Requirements

### Requirement 1: Energy Report Generation

**User Story:** As a user, I want to generate an AI-powered report analyzing my energy consumption, so that I can understand patterns, anomalies, and efficiency recommendations.

#### Acceptance Criteria

1. WHEN a user clicks the "Generate Report" button THEN the system SHALL fetch the last 30 days of energy data and send it to Gemini API
2. WHEN Gemini API returns a response THEN the system SHALL parse and display exactly 5 insight cards, each with title, body, and type (anomaly, recommendation, prediction, or summary)
3. WHEN an insight card is displayed THEN the system SHALL color-code it by type: red for anomaly, cyan for recommendation, orange for prediction, green for summary
4. WHEN a report is generated THEN the system SHALL store the result in the database with a timestamp for caching purposes
5. WHEN a user requests a report within 6 hours of the previous generation THEN the system SHALL return the cached report instead of calling the API

### Requirement 2: Energy Chat Interface

**User Story:** As a user, I want to ask conversational questions about my energy consumption, so that I can get specific answers without needing to interpret raw data.

#### Acceptance Criteria

1. WHEN a user types a question and presses Enter or clicks Send THEN the system SHALL send the message to Gemini API with the last 30 days of context data
2. WHEN Gemini API returns a response THEN the system SHALL display the reply in the chat interface with a timestamp
3. WHEN a user sends multiple messages THEN the system SHALL maintain conversation history (last 10 messages) and include it in subsequent API requests for context
4. WHEN a user asks a question unrelated to energy (e.g., "What is the capital of France?") THEN the system SHALL respond that the question is out of scope and offer to help with energy-related questions
5. WHEN a user asks "What was my peak power yesterday?" THEN the system SHALL correctly identify yesterday's data and return the accurate peak power value

### Requirement 3: Context Data Assembly

**User Story:** As a system, I want to assemble comprehensive energy context before sending requests to the LLM, so that the AI can provide accurate, data-driven responses.

#### Acceptance Criteria

1. WHEN the system prepares a request for the LLM THEN it SHALL include today's energy summary (kWh, average power, max power, cost)
2. WHEN the system prepares a request for the LLM THEN it SHALL include 7-day and 30-day summaries with energy, average power, max power, and cost
3. WHEN the system prepares a request for the LLM THEN it SHALL include per-load breakdown for the last 30 days showing energy, average power, max power, cost, and percentage of total
4. WHEN the system prepares a request for the LLM THEN it SHALL include the latest reading (voltage, current, power, temperature, smoke level, timestamp)
5. WHEN the system prepares a request for the LLM THEN it SHALL include the last 20 readings for pattern analysis

### Requirement 4: Rate Limiting and Cost Management

**User Story:** As a system administrator, I want to limit AI requests to manage API costs, so that the feature remains economically viable.

#### Acceptance Criteria

1. WHEN a user or system attempts to make an AI request THEN the system SHALL check if the device has exceeded 20 requests in the last hour
2. IF the device has exceeded the rate limit THEN the system SHALL return a 429 error with a message indicating the rate limit has been reached
3. WHEN a report is generated and cached THEN the system SHALL return the cached version for up to 6 hours without making a new API call
4. WHEN a cached report is returned THEN the system SHALL include metadata indicating it was cached and when it was generated

### Requirement 5: Error Handling and API Configuration

**User Story:** As a user, I want clear error messages when something goes wrong, so that I can understand what to do next.

#### Acceptance Criteria

1. IF the Gemini API key is not configured in the environment THEN the system SHALL return a 503 error with a message instructing the user to add the key to backend/.env
2. IF the Gemini API request fails THEN the system SHALL return a 500 error with a descriptive error message
3. IF the rate limit is exceeded THEN the system SHALL return a 429 error with a message indicating the limit and when it will reset
4. WHEN an error occurs in the chat interface THEN the system SHALL display the error message to the user in the chat as a bot message
5. WHEN an error occurs in the report interface THEN the system SHALL display the error message in a red error box with helpful context

### Requirement 6: UI/UX for Report Tab

**User Story:** As a user, I want a clean, intuitive interface for generating and viewing energy reports, so that I can easily access insights.

#### Acceptance Criteria

1. WHEN the Report tab is active THEN the system SHALL display a "Generate Report" button with a loading spinner during generation
2. WHEN insights are displayed THEN the system SHALL render them as cards with icon, badge, title, and body text
3. WHEN a report is cached THEN the system SHALL display a note indicating the cache timestamp and that it refreshes every 6 hours
4. WHEN no report has been generated THEN the system SHALL display an empty state with instructions to click "Generate Report"
5. WHEN the report is loading THEN the system SHALL display a spinner and "Analysing your energy data..." message

### Requirement 7: UI/UX for Chat Tab

**User Story:** As a user, I want a conversational chat interface for asking energy questions, so that I can interact naturally with the AI.

#### Acceptance Criteria

1. WHEN the Chat tab is active THEN the system SHALL display a scrollable message list with user messages on the right and bot messages on the left
2. WHEN a user sends a message THEN the system SHALL display it immediately in the chat with a timestamp
3. WHEN the bot is generating a response THEN the system SHALL display a "Thinking..." indicator with animated dots
4. WHEN the bot responds THEN the system SHALL display the response with a timestamp and scroll to the latest message
5. WHEN a user presses Enter in the message input THEN the system SHALL send the message; Shift+Enter SHALL create a new line

### Requirement 8: Data Serialization and API Contract

**User Story:** As a developer, I want a well-defined API contract for AI endpoints, so that the frontend and backend can communicate reliably.

#### Acceptance Criteria

1. WHEN the frontend calls POST /api/ai/report THEN the backend SHALL return { success: true, insights: [...], fromCache: boolean, cachedAt: timestamp }
2. WHEN the frontend calls POST /api/ai/chat THEN the backend SHALL return { success: true, reply: string, timestamp: timestamp }
3. WHEN an error occurs THEN the backend SHALL return { success: false, error: string } with appropriate HTTP status code
4. WHEN the frontend sends a chat message THEN it SHALL include { message: string, history: [...], deviceId: string }
5. WHEN the backend serializes context data THEN it SHALL format all numeric values to appropriate precision (energy to 4 decimals, power to 1 decimal, cost to 2 decimals)
