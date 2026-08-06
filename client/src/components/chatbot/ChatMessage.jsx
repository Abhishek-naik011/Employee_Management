import React from 'react';
import { Bot, User } from 'lucide-react';
import ChatDataViewer from './ChatDataViewer';
import { useChatbot } from '../../context/ChatbotContext';

const ChatMessage = ({ message, searchQuery, isCurrentMatch, isLastMessage }) => {
  const isAssistant = message.sender === 'assistant';
  const { conversationState, confirmPendingDelete } = useChatbot();
  const pendingDelete = conversationState.pendingDelete;

  const handleConfirm = () => {
    if (pendingDelete) {
      confirmPendingDelete(true);
    }
  };

  const handleCancel = () => {
    if (pendingDelete) {
      confirmPendingDelete(false);
    }
  };

  const renderTextWithHighlights = (text) => {
    if (!searchQuery || !searchQuery.trim()) return text;
    
    const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === searchQuery.toLowerCase() ? (
        <mark key={index} className={`${isCurrentMatch ? 'bg-orange-300 font-bold text-black' : 'bg-yellow-200 text-black'} rounded px-0.5`}>{part}</mark>
      ) : part
    );
  };

  return (
    <div id={`msg-${message.id}`} className={`flex flex-col w-full ${isAssistant ? 'items-start' : 'items-end'} mb-2 transition-all ${isCurrentMatch ? 'ring-2 ring-orange-300 p-1 rounded-lg bg-orange-50/50' : ''}`}>
      <div className={`flex w-full max-w-full ${isAssistant ? 'flex-row' : 'flex-row-reverse'} gap-2`}> 
        {/* Avatar */}
        <div className="flex-shrink-0 mt-0.5">
          {isAssistant ? (
            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shadow-sm">
              <Bot className="w-3.5 h-3.5" />
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 shadow-sm">
              <User className="w-3.5 h-3.5" />
            </div>
          )}
        </div>

        {/* Message content column: bubble and optional table */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Message Bubble */}
          <div
            className={`flex-1 min-w-0 px-3 py-2 rounded-xl whitespace-pre-wrap text-[13px] leading-relaxed ${isAssistant
              ? 'bg-white border border-gray-100 shadow-sm text-gray-800 rounded-tl-sm'
              : 'bg-blue-600 text-white shadow-sm rounded-tr-sm'
              }`}
          >
            {renderTextWithHighlights(message.text)}
            {/* Render delete confirmation buttons if pendingDelete exists and this is the latest assistant message */}
            {isAssistant && pendingDelete && isLastMessage && (
              <div className="mt-2 flex gap-2">
                <button
                  onClick={handleConfirm}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
                >
                  Delete Anyway
                </button>
                <button
                  onClick={handleCancel}
                  className="bg-gray-300 hover:bg-gray-400 text-black px-3 py-1 rounded"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
          {/* Render ChatDataViewer below the bubble */}
          {message.dataPayload && (
            <ChatDataViewer
              dataPayload={message.dataPayload}
              moduleName={message.moduleName}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
