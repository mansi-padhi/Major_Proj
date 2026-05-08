# Implementation Plan: AI Energy Assistant

## Overview

This implementation plan converts the AI Energy Assistant feature design into actionable coding tasks. The feature is already partially implemented with Gemini API integration, so these tasks focus on completing the implementation, adding comprehensive tests, and ensuring all correctness properties are validated.

---

## Tasks

- [ ] 1. Verify and complete backend AI service implementation
  - Review `backend/services/geminiService.js` for completeness
  - Verify all functions: `buildComprehensiveContext()`, `generateDetailedReport()`, `chatWithAnalysis()`, `checkRateLimit()`
  - Ensure rate limiting map is properly initialized and cleaned up
  - Verify error handling for missing API key and API failures
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 5.1, 5.2_

- [ ] 1.1 Write property test for context data completeness
  - **Feature: ai-energy-assistant, Property 5: Context Data Completeness**
  - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

- [ ] 1.2 Write property test for rate limit enforcement
  - **Feature: ai-energy-assistant, Property 4: Rate Limit Enforcement**
  - **Validates: Requirements 4.1, 4.2**

- [ ] 1.3 Write property test for numeric precision
  - **Feature: ai-energy-assistant, Property 9: Numeric Precision**
  - **Validates: Requirements 8.5**

- [ ] 2. Verify and complete backend AI routes
  - Review `backend/routes/ai.js` for all three endpoints
  - Verify POST /api/ai/report endpoint with error handling
  - Verify POST /api/ai/chat endpoint with error handling
  - Verify GET /api/ai/context debug endpoint
  - Ensure all error responses follow the contract (success: false, error: string)
  - _Requirements: 1.1, 2.1, 5.1, 5.2, 5.3, 8.1, 8.2, 8.3_

- [ ] 2.1 Write property test for API response contract
  - **Feature: ai-energy-assistant, Property 8: API Error Handling**
  - **Validates: Requirements 5.1, 5.2, 5.3, 8.1, 8.2, 8.3**

- [ ] 3. Verify and complete frontend AI Assistant component
  - Review `src/components/ai_assistant_component.js` for completeness
  - Verify Report tab: Generate button, loading spinner, insight cards, error display, empty state
  - Verify Chat tab: message input, message list, loading indicator, error display
  - Verify tab switching functionality
  - Verify keyboard handling (Enter to send, Shift+Enter for newline)
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 3.1 Write property test for insight card rendering
  - **Feature: ai-energy-assistant, Property 1: Report Insight Count**
  - **Validates: Requirements 1.2**

- [ ] 3.2 Write property test for insight type validity
  - **Feature: ai-energy-assistant, Property 2: Insight Type Validity**
  - **Validates: Requirements 1.2**

- [ ] 3.3 Write property test for chat message ordering
  - **Feature: ai-energy-assistant, Property 10: Chat Message Ordering**
  - **Validates: Requirements 7.1, 7.2**

- [ ] 4. Verify AIReport model and caching logic
  - Review `backend/models/AIReport.js` schema
  - Verify indexes are created for efficient queries
  - Verify caching logic in `generateDetailedReport()` checks 6-hour TTL
  - Verify cached reports include metadata (fromCache, cachedAt)
  - _Requirements: 1.4, 1.5, 4.3, 4.4_

- [ ] 4.1 Write property test for cache expiry
  - **Feature: ai-energy-assistant, Property 3: Cache Expiry**
  - **Validates: Requirements 1.5, 4.3, 4.4**

- [ ] 5. Integrate AI Assistant component into dashboard
  - Verify component is imported in `src/containers/chart.js`
  - Verify component replaces Usage-by-Rooms view (user.id === 4 slot)
  - Verify component receives correct props and state
  - Test component renders correctly in dashboard
  - _Requirements: 1.1, 2.1_

- [ ] 6. Test report generation end-to-end
  - Click "Generate Report" button in dashboard
  - Verify API call is made to POST /api/ai/report
  - Verify response contains exactly 5 insights
  - Verify insights are displayed as color-coded cards
  - Verify loading spinner appears during generation
  - Verify cache note appears on subsequent requests within 6 hours
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.1, 6.2, 6.3_

- [ ] 6.1 Write unit test for report generation flow
  - Test button click triggers API call
  - Test loading state during generation
  - Test insights are displayed correctly
  - Test error handling and display
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 7. Test chat functionality end-to-end
  - Type a question in chat input
  - Press Enter to send message
  - Verify message appears in chat with timestamp
  - Verify API call is made to POST /api/ai/chat
  - Verify bot response appears in chat with timestamp
  - Verify chat history is maintained for subsequent messages
  - Test out-of-scope question handling
  - Test specific example: "What was my peak power yesterday?"
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 7.1 Write unit test for chat message flow
  - Test message input and send
  - Test message appears in chat
  - Test keyboard handling (Enter vs Shift+Enter)
  - Test chat history is maintained
  - Test error handling and display
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 7.2 Write property test for chat history preservation
  - **Feature: ai-energy-assistant, Property 6: Chat History Preservation**
  - **Validates: Requirements 2.3**

- [ ] 7.3 Write example test for out-of-scope question handling
  - **Feature: ai-energy-assistant, Property 7: Out-of-Scope Question Handling**
  - **Validates: Requirements 2.4**

- [ ] 8. Test rate limiting
  - Make 20 AI requests in quick succession
  - Verify 21st request returns 429 error
  - Verify error message is displayed to user
  - Verify rate limit resets after 1 hour
  - _Requirements: 4.1, 4.2, 5.3_

- [ ] 8.1 Write unit test for rate limiting
  - Test rate limit counter increments
  - Test 429 error on limit exceeded
  - Test rate limit resets after 1 hour
  - _Requirements: 4.1, 4.2, 5.3_

- [ ] 9. Test error scenarios
  - Test with missing Gemini API key (should show 503 error)
  - Test with invalid API key (should show 500 error)
  - Test with network failure (should show error message)
  - Verify error messages are helpful and actionable
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 9.1 Write unit test for error handling
  - Test missing API key error
  - Test API failure error
  - Test rate limit error
  - Test error display in UI
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 10. Test API contract compliance
  - Verify POST /api/ai/report returns correct response structure
  - Verify POST /api/ai/chat returns correct response structure
  - Verify error responses have success: false and error message
  - Verify all numeric values have correct precision
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 10.1 Write property test for API response structure
  - **Feature: ai-energy-assistant, Property 8: API Error Handling**
  - **Validates: Requirements 8.1, 8.2, 8.3**

- [ ] 11. Checkpoint - Ensure all tests pass
  - Run all unit tests: `npm test`
  - Run all property-based tests: `npm test -- --testNamePattern="Property"`
  - Verify no failing tests
  - Ask the user if questions arise.

- [ ] 12. Performance and optimization
  - Verify context object assembly completes in < 500ms
  - Verify report generation completes in < 10 seconds
  - Verify chat response completes in < 5 seconds
  - Verify caching reduces API calls by > 80% for repeated requests
  - _Requirements: 1.1, 2.1, 4.3_

- [ ] 12.1 Write performance test for context assembly
  - Test context object assembly time
  - Test with various data volumes
  - Verify performance meets requirements
  - _Requirements: 1.1, 2.1_

- [ ] 13. Final integration and verification
  - Verify AI Assistant component is properly integrated into dashboard
  - Verify all tabs and buttons work correctly
  - Verify all error states are handled gracefully
  - Verify all data is displayed correctly
  - Verify all API calls use correct endpoints and parameters
  - _Requirements: All_

- [ ] 14. Final Checkpoint - Ensure all tests pass
  - Run all tests one final time
  - Verify no failing tests
  - Ask the user if questions arise.
