import React, { createContext, useContext, useState, useEffect } from 'react';
import authFetch from '../utils/authFetch';
import { usePermission } from './PermissionContext'; // need to know if logged in

const ChatbotContext = createContext();

const defaultGreeting = {
  id: 1,
  sender: 'assistant',
  text: '👋 Hello!\n\nHow may I help you today?',
};

export const ChatbotProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [historyIsOpen, setHistoryIsOpen] = useState(false);
  const [messages, setMessages] = useState([defaultGreeting]);
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);


  const { user } = usePermission(); // Assume we have a user context

  // Fetch conversations on load if user is logged in
  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  const fetchConversations = async () => {
    try {
      const res = await authFetch(`${import.meta.env.VITE_API_URL}/chat/history`);
      if (res.ok) {
        const data = await res.json();
        setConversations(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    }
  };

  const loadConversation = async (id) => {
    try {
      const res = await authFetch(`${import.meta.env.VITE_API_URL}/chat/history/${id}`);
      if (res.ok) {
        const data = await res.json();
        const loadedMessages = data.data.map(msg => {
          let parsed = { text: msg.text, dataPayload: null, moduleName: null };
          try {
            parsed = JSON.parse(msg.text);
          } catch (e) {
            // fallback if not JSON
          }
          return {
            id: msg.id,
            sender: msg.sender,
            text: parsed.text ?? msg.text,
            dataPayload: parsed.dataPayload ?? null,
            moduleName: parsed.moduleName ?? null,
            timestamp: msg.timestamp,
          };
        });

        // Load all messages and open the chat panel
        setMessages(loadedMessages.length > 0 ? loadedMessages : [defaultGreeting]);
        setCurrentConversationId(id);
        setIsOpen(true); // ensure chatbot window is visible
        setHistoryIsOpen(false); // hide history after loading
      }
    } catch (err) {
      console.error('Failed to load conversation:', err);
    }
  };

  // Centralized conversation workflow state
  const initialConversationState = {
    currentIntent: null, // e.g., CREATE_EMPLOYEE, UPDATE_ROLE, DELETE_PROJECT
    entityType: null, // EMPLOYEE, DEPARTMENT, ROLE, PROJECT
    entityId: null, // for update/delete
    pendingData: {}, // collected field values
    requiredFields: [], // fields still to ask
    currentStep: 0,
    completed: false,
    awaitingConfirmation: false, // for delete confirmation
  };
  const [conversationState, setConversationState] = useState({ ...initialConversationState });

  // Helper functions
  const initializeConversation = ({ intent, entityType, requiredFields, entityId = null }) => {
    setConversationState({
      currentIntent: intent,
      entityType,
      entityId,
      pendingData: {},
      requiredFields,
      currentStep: 0,
      completed: false,
      awaitingConfirmation: false,
    });
  };
  const updateConversation = (updates) => setConversationState(prev => ({ ...prev, ...updates }));
  const clearConversation = () => setConversationState({ ...initialConversationState });

  // Delete confirmation using unified state
  const confirmPendingDelete = async (confirmed) => {
    const { currentIntent, entityType, entityId } = conversationState;
    if (!currentIntent || !currentIntent.startsWith('DELETE_')) {
      clearConversation();
      return;
    }
    if (confirmed) {
      try {
        const res = await authFetch(`${import.meta.env.VITE_API_URL}/chat/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ intent: currentIntent, parameters: { id: entityId, confirmed: true } }),
        });
        const result = await res.json();
        if (result.success) {
          window.dispatchEvent(new CustomEvent('chatbot_action_success', { detail: { module: result.module, action: result.action } }));
          const friendly = entityType.toLowerCase();
          addMessage(`✅ ${friendly.charAt(0).toUpperCase() + friendly.slice(1)} deleted successfully.`, 'assistant');
        } else {
          addMessage(`❌ Deletion failed: ${result.message || 'Unknown error'}`, 'assistant');
        }
      } catch (e) {
        addMessage(`❌ Deletion error: ${e.message}`, 'assistant');
      }
    } else {
      addMessage('Deletion cancelled.', 'assistant');
    }
    clearConversation();
  };

  const startNewConversation = () => {
    setIsOpen(true);
    setCurrentConversationId(null);
    setMessages([defaultGreeting]);
  };

  const renameConversation = async (id, newTitle) => {
    try {
      const res = await authFetch(`${import.meta.env.VITE_API_URL}/chat/history/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle })
      });
      if (res.ok) {
        fetchConversations();
      }
    } catch (err) {
      console.error('Failed to rename conversation', err);
    }
  };

  const deleteConversation = async (id) => {
    try {
      const res = await authFetch(`${import.meta.env.VITE_API_URL}/chat/history/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        if (currentConversationId === id) {
          startNewConversation();
        }
        fetchConversations();
      }
    } catch (err) {
      console.error('Failed to delete conversation', err);
    }
  };

  const toggleChatbot = () => setIsOpen((prev) => !prev);
  const toggleHistory = () => setHistoryIsOpen((prev) => !prev);

  const addMessage = async (text, sender = 'user', dataPayload = null, moduleName = null) => {
    const newMessage = {
      id: Date.now(),
      sender,
      text,
      dataPayload,
      moduleName,
    };

    // Optimistically update UI
    setMessages((prev) => [...prev, newMessage]);

    // Persist to backend
    console.log("Current User:", user);

    if (!user) return; // Don't save if not logged in


    try {
      let activeId = currentConversationId;

      // If it's a new conversation and user is sending a message
      if (!activeId) {
        const res = await authFetch(`${import.meta.env.VITE_API_URL}/chat/history`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initialMessage: text })
        });
        if (res.ok) {
          const data = await res.json();
          activeId = data.data.id;
          setCurrentConversationId(activeId);
          fetchConversations(); // refresh list
        }
      }

      // Append message (now includes optional payload and module name)
      if (activeId) {
        const messageBody = { sender, text };
        if (dataPayload !== null) messageBody.dataPayload = dataPayload;
        if (moduleName !== null) messageBody.moduleName = moduleName;
        await authFetch(`${import.meta.env.VITE_API_URL}/chat/history/${activeId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(messageBody)
        });
      }
    } catch (err) {
      console.error('Failed to persist message', err);
    }
  };

  return (
    <ChatbotContext.Provider value={{
      isOpen, toggleChatbot,
      historyIsOpen, toggleHistory, setHistoryIsOpen,
      messages, addMessage,
      conversations, currentConversationId,
      loadConversation, startNewConversation, renameConversation, deleteConversation,
      conversationState, initializeConversation, updateConversation, clearConversation, confirmPendingDelete
    }}>
      {children}
    </ChatbotContext.Provider>
  );
};

export const useChatbot = () => useContext(ChatbotContext);
