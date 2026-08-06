import React, { useEffect, useRef, useState, useMemo } from 'react';
import { X, Sparkles, History, Search, ChevronUp, ChevronDown } from 'lucide-react';
import { useChatbot } from '../../context/ChatbotContext';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import ChatHistoryPanel from './ChatHistoryPanel';

const ChatPanel = () => {
  const {
    isOpen,
    toggleChatbot,
    messages,
    toggleHistory,
    historyIsOpen,
  } = useChatbot();

  const messagesEndRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  const matchedMessages = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return messages.filter(msg => msg.text.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [messages, searchQuery]);

  useEffect(() => {
    setCurrentMatchIndex(0);
  }, [searchQuery]);

  useEffect(() => {
    if (matchedMessages.length > 0 && isSearchOpen) {
      const matchId = matchedMessages[currentMatchIndex]?.id;
      if (matchId) {
        document.getElementById(`msg-${matchId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentMatchIndex, matchedMessages, isSearchOpen]);

  const handleNextMatch = () => {
    if (matchedMessages.length === 0) return;
    setCurrentMatchIndex((prev) => (prev + 1) % matchedMessages.length);
  };

  const handlePrevMatch = () => {
    if (matchedMessages.length === 0) return;
    setCurrentMatchIndex((prev) => (prev - 1 + matchedMessages.length) % matchedMessages.length);
  };

  // Auto-scroll to bottom when messages change unless search is active
  useEffect(() => {
    if (!isSearchOpen || !searchQuery) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isSearchOpen, searchQuery]);

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-40 md:hidden"
          onClick={toggleChatbot}
        />
      )}

      {/* Chat Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full md:w-[500px] bg-[#f8fafc] shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
      >
        {/* History Panel */}
        {historyIsOpen && <ChatHistoryPanel />}

        {/* Header */}
        <div className="bg-white border-b border-gray-100 flex flex-col z-20 shadow-sm relative">
          <div className="px-4 py-3 flex items-center justify-between">
            <div>
              <h2 className="text-[14px] font-bold text-gray-900 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                AI Assistant
              </h2>
              <p className="text-[11px] text-gray-500 mt-px">
                Ask me anything about the Employee Management System.
              </p>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setIsSearchOpen(!isSearchOpen);
                  if (isSearchOpen) setSearchQuery('');
                }}
                className={`p-1 rounded-lg transition-colors ${isSearchOpen ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100 text-gray-500 hover:text-blue-600'}`}
                title="Search Chat"
              >
                <Search className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={toggleHistory}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-blue-600"
                title="History"
              >
                <History className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={toggleChatbot}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                title="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          
          {/* Search Bar */}
          {isSearchOpen && (
            <div className="px-4 pb-3 pt-1 bg-white border-t border-gray-50 flex items-center gap-2 animate-in slide-in-from-top-2 duration-200">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search in chat..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              <div className="flex items-center gap-1 text-sm text-gray-500 font-medium min-w-[50px] justify-center">
                {matchedMessages.length > 0 ? `${currentMatchIndex + 1}/${matchedMessages.length}` : '0/0'}
              </div>
              <div className="flex items-center">
                <button onClick={handlePrevMatch} disabled={matchedMessages.length === 0} className="p-1 rounded text-gray-500 hover:bg-gray-100 disabled:opacity-50 transition-colors">
                  <ChevronUp className="w-5 h-5" />
                </button>
                <button onClick={handleNextMatch} disabled={matchedMessages.length === 0} className="p-1 rounded text-gray-500 hover:bg-gray-100 disabled:opacity-50 transition-colors">
                  <ChevronDown className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
          {messages.map((msg, index) => (
            <ChatMessage 
              key={msg.id} 
              message={msg} 
              isLastMessage={index === messages.length - 1}
              searchQuery={searchQuery} 
              isCurrentMatch={isSearchOpen && matchedMessages.length > 0 && matchedMessages[currentMatchIndex]?.id === msg.id} 
            />
          ))}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <ChatInput />
      </div>
    </>
  );
};

export default ChatPanel;