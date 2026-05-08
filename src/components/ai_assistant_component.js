import React from 'react';

const API = 'http://localhost:5000/api';

// ── Insight card colours by type ─────────────────────────────────────────────
const TYPE_STYLES = {
  anomaly:        { color: '#FF3D00', bg: 'rgba(255,61,0,0.10)',    icon: '🚨', label: 'ANOMALY'        },
  recommendation: { color: '#00D4FF', bg: 'rgba(0,212,255,0.10)',   icon: '💡', label: 'RECOMMENDATION' },
  prediction:     { color: '#FFA500', bg: 'rgba(255,165,0,0.10)',   icon: '📈', label: 'PREDICTION'     },
  summary:        { color: '#00C853', bg: 'rgba(0,200,83,0.10)',    icon: '📊', label: 'SUMMARY'        }
};

class AIAssistantComponent extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      activeTab:    'report',   // 'report' | 'chat'
      // Report tab
      insights:     [],
      reportLoading: false,
      reportError:  null,
      fromCache:    false,
      cachedAt:     null,
      // Chat tab
      messages: [{
        id: 1, role: 'bot',
        text: 'Hi! I\'m your Energy Assistant. Ask me anything about your electricity consumption — peak usage, costs, load comparison, or savings tips.',
        ts: new Date()
      }],
      chatInput:    '',
      chatLoading:  false,
      chatError:    null,
      chatHistory:  []   // sent to backend for context
    };
    this.messagesEndRef = null;
  }

  componentDidUpdate(_, prevState) {
    if (prevState.messages.length !== this.state.messages.length) {
      this.scrollToBottom();
    }
  }

  scrollToBottom() {
    if (this.messagesEndRef) {
      this.messagesEndRef.scrollIntoView({ behavior: 'smooth' });
    }
  }

  // ── Report ────────────────────────────────────────────────────────────────

  async generateReport() {
    this.setState({ reportLoading: true, reportError: null });
    try {
      const res  = await fetch(`${API}/ai/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: 'esp32-1' })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to generate report');
      this.setState({
        insights:  Array.isArray(data.insights) ? data.insights : [],
        fromCache: data.fromCache || false,
        cachedAt:  data.cachedAt  || null
      });
    } catch (e) {
      this.setState({ reportError: e.message });
    } finally {
      this.setState({ reportLoading: false });
    }
  }

  // ── Chat ──────────────────────────────────────────────────────────────────

  async sendMessage() {
    const { chatInput, chatHistory, messages } = this.state;
    if (!chatInput.trim()) return;

    const userMsg = { id: Date.now(), role: 'user', text: chatInput, ts: new Date() };
    this.setState({
      messages:    [...messages, userMsg],
      chatInput:   '',
      chatLoading: true,
      chatError:   null
    });

    try {
      const res  = await fetch(`${API}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message:  chatInput,
          history:  chatHistory.slice(-10),
          deviceId: 'esp32-1'
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to get response');

      const botMsg = { id: Date.now() + 1, role: 'bot', text: data.reply, ts: new Date() };
      this.setState(prev => ({
        messages:    [...prev.messages, botMsg],
        chatHistory: [
          ...prev.chatHistory,
          { role: 'user',  content: chatInput },
          { role: 'model', content: data.reply }
        ]
      }));
    } catch (e) {
      const errMsg = { id: Date.now() + 1, role: 'bot', text: `Error: ${e.message}`, ts: new Date(), isError: true };
      this.setState(prev => ({
        messages:  [...prev.messages, errMsg],
        chatError: e.message
      }));
    } finally {
      this.setState({ chatLoading: false });
    }
  }

  handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.sendMessage();
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  renderReportTab() {
    const { insights, reportLoading, reportError, fromCache, cachedAt } = this.state;

    return (
      <div style={styles.tabContent}>
        <div style={styles.reportHeader}>
          <div>
            <div style={styles.reportTitle}>AI Energy Report</div>
            <div style={styles.reportSubtitle}>
              Powered by Gemini · Analyses your last 30 days of data
            </div>
          </div>
          <button
            onClick={() => this.generateReport()}
            disabled={reportLoading}
            style={{ ...styles.generateBtn, opacity: reportLoading ? 0.6 : 1 }}
          >
            {reportLoading ? '⏳ Analysing...' : '✨ Generate Report'}
          </button>
        </div>

        {fromCache && cachedAt && (
          <div style={styles.cacheNote}>
            ⚡ Cached report from {new Date(cachedAt).toLocaleTimeString()} · refreshes every 6h
          </div>
        )}

        {reportError && (
          <div style={styles.errorBox}>
            <span>❌ {reportError}</span>
            {reportError.includes('API key') && (
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#AAAAAA' }}>
                Add your Gemini API key to <code>backend/.env</code> as <code>GOOGLE_GEMINI_API_KEY</code>
              </div>
            )}
          </div>
        )}

        {reportLoading && (
          <div style={styles.loadingBox}>
            <div style={styles.spinner} />
            <div style={{ color: '#AAAAAA', marginTop: '12px' }}>
              Analysing your energy data...
            </div>
          </div>
        )}

        {!reportLoading && insights.length === 0 && !reportError && (
          <div style={styles.emptyState}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🤖</div>
            <div style={{ color: '#AAAAAA', fontSize: '15px' }}>
              Click "Generate Report" to get AI-powered insights about your energy usage.
            </div>
          </div>
        )}

        <div style={styles.insightGrid}>
          {insights.map((insight, i) => {
            const s = TYPE_STYLES[insight.type] || TYPE_STYLES.summary;
            return (
              <div key={i} style={{ ...styles.insightCard, borderLeft: `4px solid ${s.color}`, backgroundColor: s.bg }}>
                <div style={styles.insightHeader}>
                  <span style={{ fontSize: '18px' }} role="img" aria-label={s.label}>{s.icon}</span>
                  <span style={{ ...styles.insightBadge, backgroundColor: s.color }}>{s.label}</span>
                </div>
                <div style={styles.insightTitle}>{insight.title}</div>
                <div style={styles.insightBody}>{insight.body}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  renderChatTab() {
    const { messages, chatInput, chatLoading } = this.state;

    return (
      <div style={styles.chatContainer}>
        <div style={styles.messageList}>
          {messages.map(msg => (
            <div key={msg.id} style={{
              ...styles.messageBubble,
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              backgroundColor: msg.isError ? 'rgba(255,61,0,0.15)'
                : msg.role === 'user' ? '#00D4FF' : '#2a2a3a',
              color: msg.role === 'user' ? '#000000' : '#CCCCCC'
            }}>
              <div style={styles.messageText}>{msg.text}</div>
              <div style={styles.messageTime}>
                {msg.ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}

          {chatLoading && (
            <div style={{ ...styles.messageBubble, alignSelf: 'flex-start', backgroundColor: '#2a2a3a' }}>
              <div style={styles.typingDots}>
                <span /><span /><span />
              </div>
            </div>
          )}
          <div ref={(el) => { this.messagesEndRef = el; }} />
        </div>

        <div style={styles.chatInputRow}>
          <textarea
            value={chatInput}
            onChange={e => this.setState({ chatInput: e.target.value })}
            onKeyDown={e => this.handleKeyDown(e)}
            placeholder="Ask about your energy usage..."
            disabled={chatLoading}
            rows={2}
            style={styles.chatInput}
          />
          <button
            onClick={() => this.sendMessage()}
            disabled={chatLoading || !chatInput.trim()}
            style={{
              ...styles.sendBtn,
              opacity: (chatLoading || !chatInput.trim()) ? 0.5 : 1
            }}
          >
            Send
          </button>
        </div>

        <div style={styles.chatHints}>
          Try: "What was my peak power today?" · "Which load uses more energy?" · "How much did I spend this week?"
        </div>
      </div>
    );
  }

  render() {
    const { activeTab } = this.state;

    return (
      <div style={styles.wrapper}>
        {/* Tab bar */}
        <div style={styles.tabBar}>
          {['report', 'chat'].map(tab => (
            <button
              key={tab}
              onClick={() => this.setState({ activeTab: tab })}
              style={{
                ...styles.tabBtn,
                borderBottom: activeTab === tab ? '3px solid #00D4FF' : '3px solid transparent',
                color: activeTab === tab ? '#00D4FF' : '#888888'
              }}
            >
              {tab === 'report' ? '📊 Energy Report' : '💬 Energy Chat'}
            </button>
          ))}
        </div>

        {activeTab === 'report' ? this.renderReportTab() : this.renderChatTab()}
      </div>
    );
  }
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  wrapper: { padding: '0 8px', display: 'flex', flexDirection: 'column', height: '100%' },
  tabBar: { display: 'flex', gap: '0', marginBottom: '20px', borderBottom: '1px solid #2e2e3e' },
  tabBtn: {
    flex: 1, padding: '12px', background: 'none', border: 'none',
    fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'color 0.2s'
  },
  tabContent: { flex: 1 },
  reportHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: '16px', flexWrap: 'wrap', gap: '12px'
  },
  reportTitle: { fontSize: '18px', fontWeight: '700', color: '#FFFFFF' },
  reportSubtitle: { fontSize: '12px', color: '#666677', marginTop: '4px' },
  generateBtn: {
    padding: '10px 20px', backgroundColor: '#00D4FF', color: '#000000',
    border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700',
    cursor: 'pointer', transition: 'opacity 0.2s', whiteSpace: 'nowrap'
  },
  cacheNote: {
    fontSize: '12px', color: '#666677', marginBottom: '16px',
    backgroundColor: '#1e1e2e', padding: '8px 12px', borderRadius: '6px'
  },
  errorBox: {
    backgroundColor: 'rgba(255,61,0,0.12)', border: '1px solid #FF3D00',
    borderRadius: '8px', padding: '14px', marginBottom: '16px', color: '#FF3D00', fontSize: '14px'
  },
  loadingBox: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: '60px 0'
  },
  spinner: {
    width: '40px', height: '40px', border: '3px solid #2e2e3e',
    borderTop: '3px solid #00D4FF', borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  emptyState: {
    textAlign: 'center', padding: '60px 20px',
    backgroundColor: '#1e1e2e', borderRadius: '8px'
  },
  insightGrid: { display: 'flex', flexDirection: 'column', gap: '12px' },
  insightCard: { borderRadius: '8px', padding: '16px' },
  insightHeader: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' },
  insightBadge: {
    fontSize: '10px', color: '#FFFFFF', padding: '2px 8px',
    borderRadius: '10px', fontWeight: '700'
  },
  insightTitle: { fontSize: '15px', fontWeight: '700', color: '#FFFFFF', marginBottom: '6px' },
  insightBody: { fontSize: '13px', color: '#CCCCCC', lineHeight: '1.6' },
  // Chat
  chatContainer: {
    display: 'flex', flexDirection: 'column',
    height: '520px', backgroundColor: '#1e1e2e', borderRadius: '8px', overflow: 'hidden'
  },
  messageList: {
    flex: 1, overflowY: 'auto', padding: '16px',
    display: 'flex', flexDirection: 'column', gap: '10px'
  },
  messageBubble: {
    maxWidth: '75%', padding: '10px 14px', borderRadius: '10px',
    wordBreak: 'break-word'
  },
  messageText: { fontSize: '13px', lineHeight: '1.5', whiteSpace: 'pre-wrap' },
  messageTime: { fontSize: '11px', opacity: 0.6, marginTop: '4px' },
  typingDots: { display: 'flex', gap: '4px', alignItems: 'center', padding: '4px 0' },
  chatInputRow: {
    display: 'flex', gap: '8px', padding: '12px',
    borderTop: '1px solid #2e2e3e', backgroundColor: '#1e1e2e'
  },
  chatInput: {
    flex: 1, padding: '10px', backgroundColor: '#2a2a3a', border: '1px solid #3a3a4a',
    borderRadius: '6px', color: '#FFFFFF', fontSize: '13px', resize: 'none',
    fontFamily: 'inherit', outline: 'none'
  },
  sendBtn: {
    padding: '10px 18px', backgroundColor: '#00D4FF', color: '#000000',
    border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '700',
    cursor: 'pointer', alignSelf: 'flex-end'
  },
  chatHints: {
    fontSize: '11px', color: '#555566', padding: '8px 12px',
    borderTop: '1px solid #2e2e3e', backgroundColor: '#1a1a2a'
  }
};

export default AIAssistantComponent;
