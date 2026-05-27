"use client";
import { useState, useEffect, useRef } from 'react';

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: "Namaste! I am LastBitesBot. Ask me about available meals, carbon savings, or tips to conserve resources! 🍱🌱"
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [user, setUser] = useState(null);
  const chatEndRef = useRef(null);

  // Sync user state from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem('decarb_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    const handleAuth = () => {
      const stored = localStorage.getItem('decarb_user');
      setUser(stored ? JSON.parse(stored) : null);
    };

    window.addEventListener('auth-change', handleAuth);
    return () => window.removeEventListener('auth-change', handleAuth);
  }, []);

  // Scroll to bottom on message updates
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, isOpen]);

  const handleSend = async (textToSend) => {
    const text = textToSend || inputValue;
    if (!text.trim()) return;

    if (!textToSend) {
      setInputValue('');
    }

    // Append user message
    setMessages(prev => [...prev, { sender: 'user', text }]);
    setIsTyping(true);

    try {
      const res = await fetch('http://localhost:5000/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          userId: user ? (user._id || user.id) : null
        })
      });

      if (!res.ok) throw new Error('API Error');

      const data = await res.json();
      setIsTyping(false);
      setMessages(prev => [...prev, { sender: 'bot', text: data.reply }]);
    } catch (err) {
      setIsTyping(false);
      setMessages(prev => [...prev, {
        sender: 'bot',
        text: "Sorry, I am facing trouble connecting right now. Please try again soon!"
      }]);
      console.error('Chatbot API error:', err);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        sender: 'bot',
        text: "Chat cleared. How else can I assist your food saving efforts today? 🌍"
      }
    ]);
  };

  if (!isOpen) {
    return (
      <div 
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 1000,
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          userSelect: 'none',
          transition: 'transform 0.2s ease-in-out',
        }}
      >
        {/* Speech Bubble (coming out of the head of the bot) */}
        <div 
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '20px',
            padding: '12px 20px',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.08), 0 8px 10px -6px rgba(0,0,0,0.08)',
            position: 'relative',
            zIndex: 1,
            color: '#1e293b',
            fontFamily: "'Outfit', sans-serif",
            fontSize: '15px',
            fontWeight: '600',
            whiteSpace: 'nowrap',
            lineHeight: '1.2',
            marginBottom: '12px'
          }}
        >
          Hi! How can I help you today?
          {/* Rotated square speech bubble tail pointing down to the bot's head */}
          <div style={{
            position: 'absolute',
            bottom: '-6px',
            left: '50%',
            transform: 'translateX(-50%) rotate(45deg)',
            width: '12px',
            height: '12px',
            backgroundColor: '#ffffff',
            borderRight: '1px solid #e2e8f0',
            borderBottom: '1px solid #e2e8f0',
            zIndex: 2
          }} />
        </div>

        {/* Robot Avatar (No white background, cropped to body, stands still) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          src="/bot_profile_transparent.png" 
          alt="LastBitesBot Avatar" 
          style={{
            width: '75px',
            height: 'auto',
            objectFit: 'contain',
            zIndex: 3,
            filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.15))',
            transition: 'transform 0.2s ease'
          }}
        />
      </div>
    );
  }

  return (
    <div 
      className="floating-card"
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        width: '380px',
        height: '520px',
        zIndex: 1000,
        backgroundColor: 'var(--surface)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-hover)',
        animation: 'slideUpFade 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards'
      }}
    >
      {/* Expanded Chat Header */}
      <div 
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--surface-alt)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ position: 'relative' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="/bot_profile_transparent.png" 
              alt="Bot avatar" 
              style={{
                width: '38px',
                height: '38px',
                objectFit: 'contain',
                borderRadius: '50%',
                border: '1.5px solid var(--primary)',
                backgroundColor: 'transparent'
              }}
            />
            {/* Online Green Glow Pulse Dot */}
            <span 
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                display: 'block',
                height: '10px',
                width: '10px',
                borderRadius: '50%',
                backgroundColor: '#10B981',
                border: '2px solid var(--surface)',
                boxShadow: '0 0 8px #10B981'
              }}
            />
          </div>
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Outfit', sans-serif", margin: 0 }}>
              LastBitesBot
            </h3>
            <p style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
              Eco-Assistant • Online
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {/* Clear Log Button */}
          <button 
            onClick={clearChat}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s'
            }}
            title="Clear Chat"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
          {/* Minimize Button */}
          <button 
            onClick={() => setIsOpen(false)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s'
            }}
            title="Minimize"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>
      </div>

      {/* Message Log */}
      <div 
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          scrollBehavior: 'smooth'
        }}
      >
        {messages.map((msg, index) => {
          const isBot = msg.sender === 'bot';
          return (
            <div 
              key={index}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                alignSelf: isBot ? 'flex-start' : 'flex-end',
                maxWidth: '85%'
              }}
            >
              {isBot && (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src="/bot_profile_transparent.png" 
                  alt="Bot" 
                  style={{
                    width: '26px',
                    height: '26px',
                    objectFit: 'contain',
                    borderRadius: '50%',
                    border: '1px solid var(--border)',
                    backgroundColor: 'transparent',
                    marginTop: '2px',
                    flexShrink: 0
                  }}
                />
              )}
              <div 
                style={{
                  backgroundColor: isBot ? 'var(--bg-alt)' : 'var(--primary)',
                  color: isBot ? 'var(--text-primary)' : '#ffffff',
                  padding: '10px 14px',
                  borderRadius: isBot ? '18px 18px 18px 4px' : '18px 18px 4px 18px',
                  fontSize: '0.88rem',
                  lineHeight: '1.4',
                  fontWeight: 500,
                  boxShadow: '0 2px 5px rgba(0,0,0,0.03)',
                  border: isBot ? '1px solid var(--border)' : 'none',
                  whiteSpace: 'pre-wrap'
                }}
              >
                {msg.text}
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {isTyping && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', alignSelf: 'flex-start' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="/bot_profile_transparent.png" 
              alt="Bot" 
              style={{
                width: '26px',
                height: '26px',
                objectFit: 'contain',
                borderRadius: '50%',
                border: '1px solid var(--border)',
                backgroundColor: 'transparent',
                marginTop: '2px',
                flexShrink: 0
              }}
            />
            <div 
              style={{
                backgroundColor: 'var(--bg-alt)',
                border: '1px solid var(--border)',
                padding: '12px 16px',
                borderRadius: '18px 18px 18px 4px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <div className="dot-bounce dot-1" style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--text-secondary)' }}></div>
              <div className="dot-bounce dot-2" style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--text-secondary)' }}></div>
              <div className="dot-bounce dot-3" style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--text-secondary)' }}></div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Suggestion Chips */}
      <div 
        style={{
          padding: '8px 12px',
          borderTop: '1px solid var(--border)',
          backgroundColor: 'var(--surface-alt)',
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          whiteSpace: 'nowrap'
        }}
      >
        <button 
          onClick={() => handleSend('What food is available?')}
          style={{
            fontSize: '0.72rem',
            padding: '6px 12px',
            borderRadius: '20px',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--surface)',
            color: 'var(--text-secondary)',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            outline: 'none'
          }}
        >
          🍱 Food available?
        </button>
        <button 
          onClick={() => handleSend('How much carbon did I save?')}
          style={{
            fontSize: '0.72rem',
            padding: '6px 12px',
            borderRadius: '20px',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--surface)',
            color: 'var(--text-secondary)',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            outline: 'none'
          }}
        >
          🌱 My CO₂ savings?
        </button>
        <button 
          onClick={() => handleSend('How do I earn coins?')}
          style={{
            fontSize: '0.72rem',
            padding: '6px 12px',
            borderRadius: '20px',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--surface)',
            color: 'var(--text-secondary)',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            outline: 'none'
          }}
        >
          🪙 How to earn coins?
        </button>
      </div>

      {/* Input box */}
      <div 
        style={{
          padding: '12px 16px',
          backgroundColor: 'var(--surface-alt)',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          gap: '8px',
          alignItems: 'center'
        }}
      >
        <input 
          type="text" 
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Ask about eco stats or food boxes..."
          style={{
            flex: 1,
            padding: '10px 14px',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--surface)',
            color: 'var(--text-primary)',
            fontSize: '0.85rem',
            outline: 'none',
            fontFamily: 'Inter, sans-serif'
          }}
        />
        <button 
          onClick={() => handleSend()}
          style={{
            backgroundColor: 'var(--primary)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '12px',
            padding: '10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.2s'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>

      {/* Typing indicator keyframes animation CSS (inject on the fly) */}
      <style jsx global>{`
        @keyframes bounceDot {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-4px); opacity: 1; }
        }
        .dot-bounce {
          display: inline-block;
          animation: bounceDot 1.2s infinite ease-in-out;
        }
        .dot-1 { animation-delay: 0s; }
        .dot-2 { animation-delay: 0.2s; }
        .dot-3 { animation-delay: 0.4s; }
      `}</style>
    </div>
  );
}
