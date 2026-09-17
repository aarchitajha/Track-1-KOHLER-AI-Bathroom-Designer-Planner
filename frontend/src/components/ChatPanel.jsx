import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, Wrench, X, StopCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const SUGGESTIONS = [
  "Make it Japanese Zen style",
  "Swap the faucet for a luxury one",
  "Reduce total budget by 20%",
  "Show water conservation specs"
];

export default function ChatPanel({ messages, isSending, activeTool, onSendMessage, onCancel, onClose }) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeTool]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;
    onSendMessage(input.trim());
    setInput("");
  };

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '0',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-float)',
        border: '1px solid var(--color-grey-200)',
        borderRadius: '12px'
      }}
    >
      {/* Header */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-grey-100)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--color-white)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--color-black)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bot size={15} />
          </div>
          <div>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-grey-800)' }}>Kohler Design Assistant</h3>
            <span style={{ fontSize: '10px', color: isSending ? '#e67e00' : 'var(--color-grey-400)', fontWeight: 600 }}>
              {isSending ? 'Thinking via Ollama…' : 'AI Tool-Calling Agent'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {isSending && onCancel && (
            <button
              onClick={onCancel}
              title="Cancel request"
              style={{
                background: '#fff3e0',
                border: '1px solid #e67e00',
                cursor: 'pointer',
                color: '#e67e00',
                padding: '4px 8px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                fontWeight: 600
              }}
            >
              <StopCircle size={13} /> Cancel
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-grey-400)',
                padding: '4px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Close Chat"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div style={{ flex: 1, padding: '16px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {messages.map((m, idx) => {
          const isUser = m.role === 'user';
          return (
            <div
              key={idx}
              style={{
                alignSelf: isUser ? 'flex-end' : 'flex-start',
                maxWidth: '88%',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}
            >
              <div
                className={`chat-bubble ${isUser ? 'chat-bubble-user' : 'chat-bubble-assistant'}`}
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  lineHeight: '1.5',
                  background: isUser ? 'var(--color-black)' : 'var(--color-grey-100)',
                  color: isUser ? 'var(--color-white)' : 'var(--color-grey-800)',
                  borderBottomRightRadius: isUser ? '2px' : '8px',
                  borderBottomLeftRadius: !isUser ? '2px' : '8px',
                  wordBreak: 'break-word'
                }}
              >
                {isUser ? (
                  m.content
                ) : (
                  <div className="markdown-body">
                    <ReactMarkdown
                      components={{
                        p: ({ node, ...props }) => <p style={{ margin: '0 0 6px 0', lineHeight: '1.45' }} {...props} />,
                        strong: ({ node, ...props }) => <strong style={{ fontWeight: 700, color: 'var(--color-black)' }} {...props} />,
                        ul: ({ node, ...props }) => <ul style={{ paddingLeft: '18px', margin: '4px 0 6px 0' }} {...props} />,
                        ol: ({ node, ...props }) => <ol style={{ paddingLeft: '18px', margin: '4px 0 6px 0' }} {...props} />,
                        li: ({ node, ...props }) => <li style={{ marginBottom: '3px' }} {...props} />,
                        code: ({ node, inline, ...props }) => (
                          <code
                            style={{
                              background: 'rgba(0,0,0,0.06)',
                              padding: '2px 4px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontFamily: 'monospace'
                            }}
                            {...props}
                          />
                        )
                      }}
                    >
                      {m.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Tool execution indicator — cycles through status labels */}
        {activeTool && (
          <div style={{
            alignSelf: 'flex-start',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            color: '#7a4f00',
            background: '#fff8ec',
            border: '1px solid #ffd580',
            padding: '7px 13px',
            borderRadius: '16px',
            animation: 'pulse 2s ease-in-out infinite'
          }}>
            <Wrench size={13} style={{ flexShrink: 0 }} className="spin-icon" />
            <span>{activeTool}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestion Chips */}
      <div style={{ padding: '8px 16px', display: 'flex', flexWrap: 'wrap', gap: '6px', borderTop: '1px solid var(--color-grey-100)', background: '#fafafa' }}>
        {SUGGESTIONS.map((s, i) => (
          <button
            key={i}
            onClick={() => onSendMessage(s)}
            disabled={isSending}
            style={{
              fontSize: '11px',
              padding: '4px 8px',
              background: '#fff',
              border: '1px solid var(--color-grey-200)',
              borderRadius: '12px',
              cursor: isSending ? 'not-allowed' : 'pointer',
              color: isSending ? 'var(--color-grey-300)' : 'var(--color-grey-600)'
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Input bar */}
      <form onSubmit={handleSubmit} style={{ padding: '12px 16px', borderTop: '1px solid var(--color-grey-100)', display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isSending ? 'Waiting for response…' : "Ask changes: 'swap the toilet', 'make it cheaper'..."}
          className="form-input"
          style={{ fontSize: '13px' }}
          disabled={isSending}
        />
        <button
          type="submit"
          disabled={isSending || !input.trim()}
          className="btn btn-primary btn-sm"
          style={{ padding: '0 14px' }}
        >
          <Send size={15} />
        </button>
      </form>
    </div>
  );
}
