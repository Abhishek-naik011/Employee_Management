import React, { useState, useMemo } from 'react';
import { Search, Edit2, Trash2, MessageSquare, X, Clock, CalendarDays } from 'lucide-react';
import { useChatbot } from '../../context/ChatbotContext';

const ChatHistoryPanel = () => {
  const { 
    historyIsOpen, 
    toggleHistory, 
    setHistoryIsOpen,
    conversations, 
    currentConversationId, 
    loadConversation, 
    startNewConversation, 
    renameConversation, 
    deleteConversation 
  } = useChatbot();

  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  // Group conversations by Today, Yesterday, etc.
  const groupedConversations = useMemo(() => {
    if (!conversations) return {};
    
    let filtered = conversations;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = conversations.filter(c => c.title.toLowerCase().includes(term));
    }

    const groups = { 'Today': [], 'Yesterday': [], 'Older': [] };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    filtered.forEach(conv => {
      const convDate = new Date(conv.updated_at);
      if (convDate >= today) groups['Today'].push(conv);
      else if (convDate >= yesterday) groups['Yesterday'].push(conv);
      else groups['Older'].push(conv);
    });

    return groups;
  }, [conversations, searchTerm]);

  const handleRename = (id, currentTitle) => {
    setEditingId(id);
    setEditTitle(currentTitle);
  };

  const submitRename = (id) => {
    if (editTitle.trim()) {
      renameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  if (!historyIsOpen) return null;

  return (
    <div className="absolute top-0 right-full h-full w-[300px] bg-white border-l border-gray-100 shadow-xl z-50 flex flex-col transition-transform">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          Chat History
        </h3>
        <div className="flex items-center gap-2">
          <button onClick={startNewConversation} className="text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
            New Chat
          </button>
          <button type="button" onClick={() => setHistoryIsOpen(false)} className="p-1.5 rounded-full hover:bg-gray-200 transition-colors" aria-label="Close History">
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-gray-100">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2">
        {conversations.length === 0 ? (
          <div className="text-center p-6 text-gray-400 text-sm mt-10">
            <MessageSquare className="w-8 h-8 mx-auto mb-3 text-gray-300" />
            📝 No previous conversations yet.
          </div>
        ) : (
          Object.entries(groupedConversations).map(([group, items]) => {
            if (items.length === 0) return null;
            return (
              <div key={group} className="mb-4">
                <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider sticky top-0 bg-white z-10 flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5" /> {group}
                </div>
                {items.map(conv => {
                  const isActive = currentConversationId === conv.id;
                  const dateObj = new Date(conv.updated_at);
                  const timeString = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                  return (
                    <div 
                      key={conv.id} 
                      className={`group relative flex items-center gap-3 p-3 mx-2 my-1 rounded-xl cursor-pointer transition-all ${
                        isActive ? 'bg-blue-50 border border-blue-100' : 'hover:bg-gray-50 border border-transparent'
                      }`}
                      onClick={() => !editingId && loadConversation(conv.id)}
                    >
                      <MessageSquare className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-blue-500' : 'text-gray-400'}`} />
                      
                      <div className="flex-1 min-w-0">
                        {editingId === conv.id ? (
                          <input
                            autoFocus
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onBlur={() => submitRename(conv.id)}
                            onKeyDown={(e) => e.key === 'Enter' && submitRename(conv.id)}
                            className="w-full text-sm bg-white border border-blue-300 rounded px-2 py-1 outline-none"
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <div className="flex flex-col">
                            <span className={`text-sm truncate font-medium ${isActive ? 'text-blue-700' : 'text-gray-700'}`}>
                              {conv.title}
                            </span>
                            <span className="text-[10px] text-gray-400 mt-0.5">{timeString}</span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${isActive ? 'opacity-100' : ''}`}>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleRename(conv.id, conv.title); }}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-white rounded-lg transition-colors"
                          title="Rename"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-white rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ChatHistoryPanel;
