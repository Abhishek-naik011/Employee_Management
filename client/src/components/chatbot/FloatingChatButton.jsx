import React, { useEffect, useRef } from 'react';
import { X, Sparkles, MessageCircle, History } from 'lucide-react';
import { useChatbot } from '../../context/ChatbotContext';

import ChatHistoryPanel from './ChatHistoryPanel';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';

const FloatingChatButton = () => {
  const { isOpen, toggleChatbot, messages, toggleHistory, historyIsOpen } = useChatbot();
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const closeBoth = () => {
    toggleChatbot();
    toggleHistory();
  };

  return (
    <>
      {/* Floating button when closed */}
      {!isOpen && (
        <button
          onClick={toggleChatbot}
          className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 z-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          aria-label="Toggle AI Assistant"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}
      {/* Backdrop for mobile (optional, but helps focus) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-40 md:hidden"
          onClick={closeBoth}
        />
      )}

      {/* Slide-in Panel */}
      {isOpen && (
        <div
          className={`fixed top-0 right-0 h-full w-full max-w-full md:w-[420px] bg-[#f8fafc] shadow-2xl z-50 flex transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        >
          {/* Left: Chat History */}
          {historyIsOpen && (
            <ChatHistoryPanel />
          )}
          {/* Right: AI Assistant */}
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 px-6 py-5 flex items-center justify-between z-10 relative">
              <div className="flex flex-col">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                  AI Assistant
                </h2>
                <p className="text-sm text-gray-500">Ask me anything about the Employee Management System.</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={toggleHistory}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-blue-600"
                  title="History"
                >
                  <History className="w-5 h-5" />
                </button>
                <button
                  onClick={closeBoth}
                  className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Close chat"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col relative">
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <ChatInput />
          </div>
        </div>
      )}
    </>
  );
};
export default FloatingChatButton;
