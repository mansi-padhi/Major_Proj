import React, { useState, useRef, useEffect } from 'react';
import '../styles/energy_assistant_widget.css';

const EnergyAssistantWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        {
            id: 1,
            text: 'Hi! I am your Energy Assistant. I can help you with questions about your electricity consumption, energy costs, usage patterns, and optimization tips. What would you like to know?',
            sender: 'bot',
            timestamp: new Date()
        }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const messagesEndRef = useRef(null);
    const [deviceId] = useState('default');

    const scrollToBottom = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const sendMessage = async () => {
        if (!inputValue.trim()) return;

        const userMessage = {
            id: messages.length + 1,
            text: inputValue,
            sender: 'user',
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setLoading(true);
        setError(null);

        try {
            // Filter out the initial bot greeting and map to backend format
            const history = messages
                .filter(msg => msg.id !== 1) // Exclude initial greeting
                .map(msg => ({
                    role: msg.sender === 'user' ? 'user' : 'model',
                    content: msg.text
                }));

            const response = await fetch('http://localhost:5000/api/ai/gemini/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: inputValue,
                    history,
                    deviceId
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to get response');
            }

            const data = await response.json();

            const botMessage = {
                id: messages.length + 2,
                text: data.reply,
                sender: 'bot',
                timestamp: new Date()
            };

            setMessages(prev => [...prev, botMessage]);
        } catch (err) {
            setError(err.message);
            const errorMessage = {
                id: messages.length + 2,
                text: `Error: ${err.message}`,
                sender: 'bot',
                timestamp: new Date(),
                isError: true
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <>
            {/* Floating Button */}
            <button
                className="energy-assistant-button"
                onClick={() => setIsOpen(!isOpen)}
                title="Energy Assistant"
            >
                ⚡
            </button>

            {/* Chat Widget */}
            {isOpen && (
                <div className="energy-assistant-widget">
                    <div className="widget-header">
                        <h3>⚡ Energy Assistant</h3>
                        <button
                            className="close-btn"
                            onClick={() => setIsOpen(false)}
                        >
                            ✕
                        </button>
                    </div>

                    <div className="widget-messages">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`message ${msg.sender} ${msg.isError ? 'error' : ''}`}>
                                <div className="message-content">
                                    <p>{msg.text}</p>
                                    <span className="message-time">
                                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="message bot loading">
                                <div className="message-content">
                                    <div className="typing-indicator">
                                        <span></span>
                                        <span></span>
                                        <span></span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="widget-input-area">
                        <textarea
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Ask about your energy..."
                            disabled={loading}
                            rows="2"
                        />
                        <button
                            onClick={sendMessage}
                            disabled={loading || !inputValue.trim()}
                            className="send-btn"
                        >
                            {loading ? '...' : 'Send'}
                        </button>
                    </div>

                    {error && (
                        <div className="error-banner">
                            <span>⚠️ {error}</span>
                            <button onClick={() => setError(null)}>✕</button>
                        </div>
                    )}
                </div>
            )}
        </>
    );
};

export default EnergyAssistantWidget;
