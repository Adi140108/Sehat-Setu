import React, { useState } from 'react';
import { WhatsAppChannel } from '../../services/messaging/MessageChannel';
import type { ChannelResponse } from '../../services/messaging/MessageChannel';
import { Send, Bot, CheckCheck, PhoneCall, Building2, ShieldCheck } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  cardData?: any;
}

export const WhatsAppDemoView: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      sender: 'bot',
      text: "👋 Welcome to *Sehat Setu WhatsApp Health Assistant*!\n\nI can help you find nearby public hospitals, check Ayushman Bharat scheme eligibility, and get required document checklists.\n\nType a message or tap one of the quick demo buttons below.",
      timestamp: '20:30'
    }
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const whatsappChannel = new WhatsAppChannel();

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isProcessing) return;

    const userMsg: ChatMessage = {
      id: 'u-' + Date.now(),
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsProcessing(true);

    // Simulate WhatsApp Webhook network latency (500ms)
    setTimeout(async () => {
      const response: ChannelResponse = await whatsappChannel.sendMessage({
        channel: 'whatsapp',
        senderId: '+919845012345',
        messageType: 'text',
        text: textToSend,
        timestamp: new Date().toISOString()
      });

      const botMsg: ChatMessage = {
        id: 'b-' + Date.now(),
        sender: 'bot',
        text: response.replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        cardData: response.facilityCard || response.schemeCard
      };

      setMessages(prev => [...prev, botMsg]);
      setIsProcessing(false);
    }, 600);
  };

  return (
    <div style={{ marginTop: '16px', maxWidth: '640px', margin: '16px auto 0 auto' }}>
      
      {/* Disclaimer Banner */}
      <div style={{ background: '#e7fce3', border: '1px solid #b7eb8f', padding: '10px 16px', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '0.85rem', color: '#135200' }}>
        <strong>📱 WhatsApp Demo Simulator Mode:</strong> Simulates Sehat Setu WhatsApp webhook message processing pipeline.
      </div>

      {/* Quick Scenario Triggers */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '14px', paddingBottom: '4px' }}>
        <button 
          onClick={() => handleSend("Paas mein sarkari hospital kidhar hai?")}
          className="btn btn-outline"
          style={{ padding: '4px 10px', fontSize: '0.8rem', minHeight: '32px' }}
        >
          <Building2 size={14} /> "Find Hospital"
        </button>

        <button 
          onClick={() => handleSend("Ayushman Bharat scheme details and eligibility")}
          className="btn btn-outline"
          style={{ padding: '4px 10px', fontSize: '0.8rem', minHeight: '32px' }}
        >
          <ShieldCheck size={14} /> "Scheme Eligibility"
        </button>

        <button 
          onClick={() => handleSend("Mere seene mein bahut dard ho raha hai")}
          className="btn btn-outline"
          style={{ padding: '4px 10px', fontSize: '0.8rem', minHeight: '32px', color: 'var(--emergency-red)', borderColor: 'var(--emergency-red)' }}
        >
          <PhoneCall size={14} /> "Emergency Alert"
        </button>
      </div>

      {/* WhatsApp Smartphone Frame */}
      <div style={{
        background: '#efeae2',
        border: '2px solid #075e54',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-lg)'
      }}>
        
        {/* WhatsApp Chat Header */}
        <div style={{ background: '#075e54', color: '#ffffff', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#ffffff', color: '#075e54', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
            <Bot size={24} />
          </div>
          <div>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Sehat Setu Assistant</h4>
            <p style={{ fontSize: '0.75rem', opacity: 0.9, margin: 0 }}>Verified Public Healthcare Bot • Online</p>
          </div>
        </div>

        {/* Chat Messages Body */}
        <div style={{ height: '400px', overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {messages.map((m) => {
            const isUser = m.sender === 'user';
            return (
              <div 
                key={m.id}
                style={{
                  alignSelf: isUser ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  background: isUser ? '#dcf8c6' : '#ffffff',
                  padding: '10px 14px',
                  borderRadius: isUser ? '12px 0 12px 12px' : '0 12px 12px 12px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                  fontSize: '0.9rem',
                  color: '#111',
                  whiteSpace: 'pre-line'
                }}
              >
                <div>{m.text}</div>
                
                {/* Structured Card Embedded in WhatsApp Msg */}
                {m.cardData && (
                  <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #eee', fontSize: '0.82rem', background: '#f9f9f9', padding: '8px', borderRadius: '6px' }}>
                    <strong style={{ color: '#075e54' }}>📍 Verified Facility Card:</strong>
                    <div style={{ fontWeight: 700, marginTop: '2px' }}>{m.cardData.name}</div>
                    <div style={{ color: '#555' }}>Phone: {m.cardData.phone}</div>
                  </div>
                )}

                <div style={{ textAlign: 'right', fontSize: '0.68rem', color: '#888', marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                  <span>{m.timestamp}</span>
                  {isUser && <CheckCheck size={12} style={{ color: '#34b7f1' }} />}
                </div>
              </div>
            );
          })}

          {isProcessing && (
            <div style={{ alignSelf: 'flex-start', background: '#fff', padding: '8px 14px', borderRadius: '12px', fontSize: '0.8rem', color: '#666' }}>
              Sehat Setu is typing...
            </div>
          )}
        </div>

        {/* Input Bar */}
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
          style={{ background: '#f0f0f0', padding: '8px 12px', display: 'flex', gap: '8px', alignItems: 'center' }}
        >
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a WhatsApp message..."
            style={{ flex: 1, padding: '10px 14px', borderRadius: '20px', border: '1px solid #ccc', fontSize: '0.9rem', outline: 'none' }}
          />
          <button 
            type="submit" 
            style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#075e54', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Send size={18} />
          </button>
        </form>

      </div>

    </div>
  );
};
