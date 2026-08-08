import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Plus, Check, X } from 'lucide-react';
import { useChatbot } from '../../context/ChatbotContext';
import { usePermission } from '../../context/PermissionContext';
import authFetch from '../../utils/authFetch';
import { useGuidedWorkflow } from './useGuidedWorkflow';
import { workflowConfig } from './workflowConfig';
import ChatDataViewer from './ChatDataViewer';

const API = import.meta.env.VITE_API_URL;

const ChatInput = () => {
  const [text, setText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [executionState, setExecutionState] = useState(null);
  const [isSelectingEditField, setIsSelectingEditField] = useState(false);
  const [undoState, setUndoState] = useState(null);
  const [availablePermissions, setAvailablePermissions] = useState([]);
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [chatPermissionsMode, setChatPermissionsMode] = useState(false);
  const [fetchedEntity, setFetchedEntity] = useState(null);
  const [dataViewerPayload, setDataViewerPayload] = useState(null);
  const [dataViewerModule, setDataViewerModule] = useState(null);
  
  const menuRef = useRef(null);
  const inputRef = useRef(null);

  const { addMessage, messages, initializeConversation, updateConversation, confirmPendingDelete } = useChatbot();
  const { hasPermission, isAdmin } = usePermission();

  const {
    activeIntent,
    activeConfig,
    currentStep,
    currentStepIndex,
    totalSteps,
    collectedData,
    error,
    isFinished,
    editingKey,
    start,
    next,
    back,
    cancel,
    startEdit,
    setError
  } = useGuidedWorkflow();

  const allowedIntents = [
    'CREATE_EMPLOYEE', 'CREATE_ROLE', 'CREATE_DEPARTMENT', 'CREATE_PROJECT',
    'UPDATE_EMPLOYEE', 'UPDATE_ROLE', 'UPDATE_DEPARTMENT',
    'DELETE_EMPLOYEE', 'DELETE_ROLE', 'DELETE_DEPARTMENT', 'DELETE_PROJECT',
    'GET_EMPLOYEES', 'GET_DEPARTMENTS', 'GET_PROJECTS'
  ];

  const intentPermissionMap = {
    CREATE_EMPLOYEE: ['Manage Employees', 'Create Employee'],
    CREATE_DEPARTMENT: ['Manage Departments', 'Create Department'],
    CREATE_ROLE: ['Manage Roles', 'Create Role'],
    CREATE_PROJECT: ['Manage Projects', 'Create Project'],
    ASSIGN_PROJECT: ['Assign Employees', 'Assign Project', 'Assign Projects'],
    UPDATE_EMPLOYEE: ['Manage Employees', 'Update Employee'],
    UPDATE_ROLE: ['Manage Roles', 'Update Role'],
    UPDATE_DEPARTMENT: ['Manage Departments', 'Update Department'],
    UPDATE_PROJECT: ['Manage Projects', 'Update Project'],
    DELETE_EMPLOYEE: ['Manage Employees', 'Delete Employee'],
    DELETE_ROLE: ['Manage Roles', 'Delete Role'],
    DELETE_DEPARTMENT: ['Manage Departments', 'Delete Department'],
    DELETE_PROJECT: ['Manage Projects', 'Delete Project'],
    GET_EMPLOYEES: ['View Employees'],
    GET_DEPARTMENTS: ['View Departments'],
    GET_PROJECTS: ['View Projects', 'View Assigned Projects'],
  };

  const menuItems = allowedIntents.filter(intent => {
    if (isAdmin) return true;
    const requiredPerms = intentPermissionMap[intent] || [];
    const titlePerm = workflowConfig[intent].title;
    return requiredPerms.some(p => hasPermission(p)) || hasPermission(titlePerm);
  }).map(intent => ({
    label: workflowConfig[intent].title,
    icon: workflowConfig[intent].icon,
    intent
  }));

  useEffect(() => {
    const fetchPerms = async () => {
      try {
        const res = await authFetch(`${API}/roles/available-permissions`);
        const data = await res.json();
        if (data.success) {
          setAvailablePermissions(data.data || []);
        }
      } catch (e) {
        console.error("Failed to fetch permissions", e);
      }
    };
    fetchPerms();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    const handleKeyDown = (e) => {
      if (!showMenu) return;
      if (e.key === 'Escape') {
        setShowMenu(false);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % menuItems.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + menuItems.length) % menuItems.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleMenuSelect(menuItems[selectedIndex]);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    } else {
      setSelectedIndex(0);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showMenu, selectedIndex, menuItems.length]);

  const handleMenuSelect = (item) => {
    setExecutionState(null);
    setIsSelectingEditField(false);
    setFetchedEntity(null);
    start(item.intent);
    setShowMenu(false);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
  };

  const handleActionExecution = async (intent, parameters) => {
    try {
      const res = await authFetch(`${API}/chat/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent, parameters })
      });

      const data = await res.json();

      if (data.success) {
        if (data.require_confirmation) {
          updateConversation({
            pendingDelete: true,
            currentIntent: data.intent,
            entityType: data.module,
            entityId: data.entityId
          });
          addMessage(data.impact_analysis + "\n\nAre you sure you want to delete this?", 'assistant');
        } else if (data.action === 'GET') {
          if (data.module === 'attendance') {
            addMessage(data.message, 'assistant');
          } else {
            addMessage(`✅ Successfully retrieved data.`, 'assistant', data.data, data.module);
          }
        } else {
          try {
            window.dispatchEvent(new CustomEvent('chatbot_action_success', {
              detail: { module: data.module, action: data.action }
            }));
          } catch (e) {
            console.warn("Failed to dispatch global refresh event", e);
          }
          addMessage(`✅ Action completed successfully!`, 'assistant');
        }
      } else {
        addMessage(`❌ Failed to complete action: ${data.message || 'Unknown error'}`, 'assistant');
      }
    } catch (e) {
      console.error('Action execution failed:', e);
      addMessage(`❌ System error occurred during execution.`, 'assistant');
    }
  };

  const submitPermissions = async (perms) => {
    setChatPermissionsMode(false);
    setSelectedPermissions([]);
    const userMessage = "Selected permissions: " + JSON.stringify(perms);
    
    addMessage(userMessage, 'user');
    setIsTyping(true);

    const currentMessages = messages.map(msg => ({ role: msg.sender, content: msg.text }));
    currentMessages.push({ role: 'user', content: userMessage });
    
    try {
      const response = await authFetch(`${API}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: currentMessages })
      });
      const data = await response.json();
      if (data.success) {
        if (data.action_ready) {
           await handleActionExecution(data.intent, data.parameters);
        } else if (data.reply) {
           if (data.missing_field === 'permissions') setChatPermissionsMode(true);
           addMessage(data.reply, 'assistant');
        } else {
           addMessage("I'm not sure how to respond to that.", 'assistant');
        }
      } else {
        addMessage(data.reply || "Sorry, I couldn't process your request.", 'assistant');
      }
    } catch (error) {
      addMessage("Sorry, I couldn't process your request.", 'assistant');
    } finally {
      setIsTyping(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() || isTyping || executionState) return;

    const userMessage = text.trim();

    // INTERCEPT FOR GUIDED WORKFLOW
    if (activeIntent && (!isFinished || editingKey)) {
      const lowerVal = userMessage.toLowerCase();
      if (lowerVal === 'cancel') {
        cancel();
        setText('');
        return;
      }
      if (lowerVal === 'back') {
        back();
        setText('');
        return;
      }

      // FETCH ROLE/DEPARTMENT MID-WIZARD
      if ((activeIntent === 'UPDATE_ROLE' && currentStep.key === 'role_name') || 
          (activeIntent === 'UPDATE_DEPARTMENT' && currentStep.key === 'name')) {
        setIsTyping(true);
        try {
          const endpoint = activeIntent === 'UPDATE_ROLE' ? '/roles' : '/departments';
          const res = await authFetch(`${API}${endpoint}`);
          const data = await res.json();
          
          let entity = null;
          if (activeIntent === 'UPDATE_ROLE') {
             entity = data.data?.find(r => r.role_name.toLowerCase() === lowerVal);
          } else {
             entity = data.data?.find(d => d.department_name.toLowerCase() === lowerVal || String(d.department_code).toLowerCase() === lowerVal);
          }
          
          if (!entity) {
            setError(`${activeIntent === 'UPDATE_ROLE' ? 'Role' : 'Department'} not found.`);
            setIsTyping(false);
            return;
          }
          setFetchedEntity(entity);
          next(userMessage);
        } catch (e) {
          setError(`Error fetching ${activeIntent === 'UPDATE_ROLE' ? 'role' : 'department'} details.`);
        }
        setIsTyping(false);
        setText('');
        return;
      }

      next(userMessage);
      setText('');
      return;
    }

    // --- CLIENT-SIDE COMMAND INTERCEPTION (Pagination/Search) ---
    const lowerCmd = userMessage.toLowerCase();
    if (/^(next|prev|previous)$/.test(lowerCmd) || /^search\s+(.+)$/.test(lowerCmd)) {
      addMessage(userMessage, 'user');
      window.dispatchEvent(new CustomEvent('chatbot_data_command', { detail: lowerCmd }));
      setText('');
      return;
    }

    // --- PRE-FLIGHT PERMISSION VALIDATION ---
    if (!isAdmin) {
      let actionVerb = 'View';
      if (/(create|add|new|update|edit|delete|remove|change|set)/.test(lowerCmd)) {
        actionVerb = 'Manage';
      } else if (/(assign)/.test(lowerCmd)) {
        actionVerb = 'Assign';
      }

      let moduleMatch = null;
      if (lowerCmd.includes('employee') || lowerCmd.includes('user') || lowerCmd.includes('salary') || lowerCmd.includes('status')) moduleMatch = 'Employees';
      else if (lowerCmd.includes('department')) moduleMatch = 'Departments';
      else if (lowerCmd.includes('project')) moduleMatch = 'Projects';
      else if (lowerCmd.includes('role')) moduleMatch = 'Roles';

      if (moduleMatch) {
        let requiredPerm = `${actionVerb} ${moduleMatch}`;
        if (!hasPermission(requiredPerm) && !hasPermission(`Manage ${moduleMatch}`)) {
          addMessage(userMessage, 'user');
          setText('');
          addMessage(`❌ You do not have permission to perform this action.\n\nYour current role lacks: '${requiredPerm}'\n\nPlease contact your administrator.`, 'assistant');
          return;
        }
      }
    }
    // ----------------------------------------

    // NORMAL CHATBOT MESSAGE
    addMessage(userMessage, 'user');
    setText('');
    setIsTyping(true);

    const currentMessages = messages.map(msg => ({
      role: msg.sender,
      content: msg.text
    }));

    currentMessages.push({ role: 'user', content: userMessage });

    try {
      const response = await authFetch(`${API}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ messages: currentMessages })
      });

      const data = await response.json();

      if (data.success) {
        if (data.action_ready) {
          await handleActionExecution(data.intent, data.parameters);
        } else if (data.reply) {
          if (data.missing_field === 'permissions') setChatPermissionsMode(true);
          addMessage(data.reply, 'assistant');
        } else {
          addMessage("I'm not sure how to respond to that.", 'assistant');
        }
      } else {
        addMessage(data.reply || "Sorry, I couldn't process your request.", 'assistant');
      }
    } catch (error) {
      console.error('Chat API error:', error);
      addMessage("Sorry, I couldn't process your request.", 'assistant');
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col bg-white border-t border-gray-100 relative">
      {isTyping && (
        <div className="px-6 py-2 text-xs text-gray-400 flex items-center gap-2 italic">
          <Loader2 className="w-3 h-3 animate-spin" />
          AI is thinking...
        </div>
      )}

      {/* DATA VIEWER PANEL */}
      {dataViewerPayload && (
        <div className="px-1 py-1 mx-2 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg shadow-gray-200/50 animate-in fade-in slide-in-from-bottom-2 duration-300 z-10 flex flex-col overflow-hidden max-h-[350px]">
          <div className="flex justify-between items-center px-3 py-2 border-b border-gray-100 bg-gray-50">
            <h3 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
              <span className="text-base">📋</span> {dataViewerModule}
            </h3>
            <button type="button" onClick={() => { setDataViewerPayload(null); setDataViewerModule(null); cancel(); }} className="text-[10px] bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 px-2 py-1 rounded shadow-sm transition-colors font-semibold">
              Close
            </button>
          </div>
          <div className="flex-1 overflow-y-auto overflow-x-hidden relative bg-white" style={{ minHeight: '200px' }}>
            <ChatDataViewer dataPayload={dataViewerPayload} moduleName={dataViewerModule} />
          </div>
        </div>
      )}

      {/* DYNAMIC WORKFLOW PANEL */}
      {(activeIntent || executionState) && !dataViewerPayload && (
        <div className="px-3 py-2 mx-3 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg shadow-gray-200/50 animate-in fade-in slide-in-from-bottom-2 duration-300 z-10">
          
          {executionState ? (
            <div className="flex flex-col items-center justify-center py-2 gap-1.5 text-center">
              {executionState.status === 'loading' && (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                  <p className="text-[10px] font-medium text-gray-700">{executionState.message}</p>
                </>
              )}
              {executionState.status === 'success' && (
                <>
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center mb-1">
                    <Check className="w-3.5 h-3.5 text-green-600" />
                  </div>
                  <p className="text-[13px] font-semibold text-gray-900">✅ {executionState.message}</p>
                  {executionState.id && <p className="text-xs font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full text-[10px] border border-gray-100">{executionState.id}</p>}
                  
                  {undoState && (
                    <div className="mt-1.5 w-full max-w-sm bg-blue-50/50 rounded-lg p-2 border border-blue-100 text-[10px] flex flex-col items-center">
                      {undoState.isUndoSuccess ? (
                         <p className="text-green-700 font-semibold">✅ Last action has been reverted successfully.</p>
                      ) : undoState.isUndoing ? (
                         <p className="text-blue-600 font-semibold flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Undoing last action...</p>
                      ) : undoState.isExpired ? (
                         <p className="text-gray-500 font-medium italic">Undo expired.</p>
                      ) : (
                         <button onClick={async () => {
                           clearTimeout(undoState.timeoutId);
                           setUndoState(prev => ({ ...prev, isUndoing: true }));
                           try {
                             const res = await authFetch(`${API}/chat/undo`, {
                               method: 'POST',
                               headers: { 'Content-Type': 'application/json' },
                               body: JSON.stringify({ operationType: undoState.operationType, moduleName: undoState.moduleName, undoData: undoState.undoData })
                             });
                             const resData = await res.json();
                             if (resData.success) {
                               setUndoState(prev => ({ ...prev, isUndoing: false, isUndoSuccess: true }));
                               try {
                                 window.dispatchEvent(new CustomEvent('chatbot_action_success', { detail: { module: undoState.moduleName } }));
                               } catch (e) {}
                             } else {
                               setExecutionState({ status: 'error', message: resData.message || 'Failed to undo.' });
                             }
                           } catch (e) {
                             setExecutionState({ status: 'error', message: 'System error occurred while undoing.' });
                           }
                         }} className="bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 px-2.5 py-1 rounded-md font-semibold transition-colors shadow-sm">
                           [Undo]
                         </button>
                      )}
                    </div>
                  )}

                  <button onClick={() => { setExecutionState(null); cancel(); }} className="mt-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-1 rounded-md text-[10px] font-medium transition-colors">Done</button>
                </>
              )}
              {executionState.status === 'confirm_impact' && (
                <>
                  <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center mb-1">
                    <span className="text-orange-600 font-bold text-xs">!</span>
                  </div>
                  <p className="text-[13px] font-semibold text-gray-900 border-b border-gray-100 pb-1 mb-2 w-full text-center">Confirm Deletion</p>
                  <div className="w-full text-left text-[11px] text-gray-700 whitespace-pre-wrap bg-orange-50 p-2.5 rounded-lg border border-orange-100 mb-3">
                    {executionState.message}
                  </div>
                  <div className="flex gap-2 w-full">
                    <button onClick={async () => {
                      setExecutionState({ status: 'loading', message: `Executing deletion...` });
                      try {
                        const payload = { intent: executionState.intent, parameters: { ...collectedData, confirmed: true, id: executionState.entityId, project_id: executionState.entityId } };
                        console.log("Payload sent to /api/chat/execute:", JSON.stringify(payload, null, 2));
                        
                        const res = await authFetch(`${API}/chat/execute`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(payload)
                        });
                        const data = await res.json();
                        
                        if (data.success) {
                          try {
                            window.dispatchEvent(new CustomEvent('chatbot_action_success', { detail: { module: data.module, action: data.action } }));
                          } catch(e) {}
                          
                          setExecutionState({ status: 'success', message: `${activeConfig?.title?.split(' ')[1]} deleted successfully.` });
                        } else {
                          setExecutionState({ status: 'error', message: data.message || 'Unknown error occurred.' });
                        }
                      } catch (e) {
                        setExecutionState({ status: 'error', message: 'System error occurred.' });
                      }
                    }} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-1.5 rounded-md text-[11px] font-semibold transition-colors shadow-sm">
                      Delete Anyway
                    </button>
                    <button onClick={() => { setExecutionState(null); cancel(); }} className="flex-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 py-1.5 rounded-md text-[11px] font-semibold transition-colors shadow-sm">
                      Cancel
                    </button>
                  </div>
                </>
              )}
              {executionState.status === 'error' && (
                <>
                  <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center mb-1">
                    <X className="w-4 h-4 text-red-600" />
                  </div>
                  <p className="text-[13px] font-semibold text-gray-900">Action Failed</p>
                  <p className="text-xs text-red-600 px-2">{executionState.message}</p>
                  <button onClick={() => setExecutionState(null)} className="mt-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-1 rounded-md text-[10px] font-medium transition-colors">Close</button>
                </>
              )}
            </div>
          ) : (!isFinished || editingKey) ? (
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center text-[12px] font-semibold text-gray-800">
                <span className="flex items-center gap-2"><span className="text-[14px]">{activeConfig.icon}</span> {activeConfig.title} {editingKey && <span className="text-blue-500 text-xs ml-1">(Editing)</span>}</span>
                {!editingKey && <span className="text-[10px] text-gray-500 font-medium bg-gray-100 px-2 py-0.5 rounded-full">Step {currentStepIndex + 1} of {totalSteps}</span>}
              </div>
              
              {!editingKey && (
                <div className="flex gap-1.5 justify-center">
                  {Array.from({ length: totalSteps }).map((_, i) => (
                    <div key={i} className={`h-1 rounded-full flex-1 transition-colors duration-300 ${i === currentStepIndex ? 'bg-blue-600' : i < currentStepIndex ? 'bg-blue-200' : 'bg-gray-100'}`} />
                  ))}
                </div>
              )}
              
              {currentStepIndex > 0 && !editingKey && (
                <div className="bg-green-50/50 rounded-lg p-2 text-[11px] text-gray-700 mt-1 border border-green-100/50 flex items-start gap-2 shadow-sm">
                  <Check className="w-3.5 h-3.5 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-semibold text-gray-900">{activeConfig.steps[currentStepIndex - 1].label}:</span> {Array.isArray(collectedData[activeConfig.steps[currentStepIndex - 1].key]) ? collectedData[activeConfig.steps[currentStepIndex - 1].key].join(', ') : (collectedData[activeConfig.steps[currentStepIndex - 1].key] || (activeConfig.steps[currentStepIndex - 1].optional ? <span className="text-gray-400 italic">Skipped</span> : ''))}
                  </div>
                </div>
              )}
              
                            <div className="text-[13px] font-medium text-gray-900 mt-1">
                {currentStep.prompt}
                {currentStep.optional && currentStep.type !== 'multiselect' && currentStep.type !== 'info' && <span className="text-gray-400 text-xs ml-2 font-normal">(Type "skip" to skip)</span>}
              </div>
              
              {currentStep.type === 'info' && fetchedEntity && activeIntent === 'UPDATE_ROLE' && (
                <div className="bg-white border border-gray-200 rounded-lg p-3 text-[12px] mb-2 shadow-sm text-gray-700">
                   <div className="font-semibold mb-2 text-gray-900 border-b border-gray-100 pb-1">Current Details</div>
                   <div className="grid grid-cols-[100px_1fr] gap-y-1.5 gap-x-2">
                     <span className="font-semibold">Role Name:</span> <span>{fetchedEntity.role_name}</span>
                     <span className="font-semibold">Description:</span> <span>{fetchedEntity.description || <span className="text-gray-400 italic">None</span>}</span>
                     <span className="font-semibold">Permissions:</span> 
                     <div className="flex flex-wrap gap-1">
                       {(fetchedEntity.permissions || []).map(p => (
                         <span key={p} className="bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.5 rounded text-[10px] font-medium">
                           {p}
                         </span>
                       ))}
                       {(!fetchedEntity.permissions || fetchedEntity.permissions.length === 0) && <span className="text-gray-400 italic">None</span>}
                     </div>
                   </div>
                   <button onClick={() => next('continue')} className="mt-4 w-full bg-blue-600 hover:bg-blue-700 transition-colors text-white text-[11px] font-semibold px-3 py-1.5 rounded-md flex justify-center items-center gap-1.5 shadow-sm shadow-blue-200">
                     Continue <Check className="w-3.5 h-3.5" />
                   </button>
                </div>
              )}

              {currentStep.type === 'info' && fetchedEntity && activeIntent === 'UPDATE_DEPARTMENT' && (
                <div className="bg-white border border-gray-200 rounded-lg p-3 text-[12px] mb-2 shadow-sm text-gray-700">
                   <div className="font-semibold mb-2 text-gray-900 border-b border-gray-100 pb-1">Current Details</div>
                   <div className="grid grid-cols-[110px_1fr] gap-y-1.5 gap-x-2">
                     <span className="font-semibold">Department Name:</span> <span>{fetchedEntity.department_name}</span>
                     <span className="font-semibold">Description:</span> <span>{fetchedEntity.description || <span className="text-gray-400 italic">None</span>}</span>
                     <span className="font-semibold">Department Head:</span> <span>{fetchedEntity.head_name || <span className="text-gray-400 italic">Not Assigned</span>}</span>
                   </div>
                   <button onClick={() => next('continue')} className="mt-4 w-full bg-blue-600 hover:bg-blue-700 transition-colors text-white text-[11px] font-semibold px-3 py-1.5 rounded-md flex justify-center items-center gap-1.5 shadow-sm shadow-blue-200">
                     Continue <Check className="w-3.5 h-3.5" />
                   </button>
                </div>
              )}

              {currentStep.type === 'multiselect' && (
                <div className="mt-1">
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {(currentStep.options || availablePermissions).map(perm => {
                      const isSelected = selectedPermissions.includes(perm);
                      return (
                        <button
                          key={perm}
                          type="button"
                          onClick={() => {
                            if (isSelected) setSelectedPermissions(prev => prev.filter(p => p !== perm));
                            else setSelectedPermissions(prev => [...prev, perm]);
                          }}
                          className={`px-2 py-1 text-[11px] font-medium rounded-full border transition-colors ${isSelected ? 'bg-blue-100 border-blue-200 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                        >
                          {perm}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex gap-2">
                    <button 
                      type="button"
                      onClick={() => {
                        next(selectedPermissions);
                        setSelectedPermissions([]); // reset
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors shadow-sm"
                    >
                      Confirm Selection
                    </button>
                    {currentStep.optional && (
                      <button 
                        type="button"
                        onClick={() => {
                          next('skip');
                          setSelectedPermissions([]);
                        }}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors"
                      >
                        Skip
                      </button>
                    )}
                  </div>
                </div>
              )}
              
              {error && (
                <div className="text-[11px] text-red-600 bg-red-50 p-1.5 rounded-md border border-red-100 animate-in fade-in duration-200 shadow-sm">
                  {error}
                </div>
              )}
              
              <div className="text-[10px] text-gray-400 flex gap-3 mt-1 border-t border-gray-100 pt-1.5">
                {currentStepIndex > 0 && <span>Type <strong className="text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded font-mono">back</strong> to go back</span>}
                <span>Type <strong className="text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded font-mono">cancel</strong> to abort</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-1.5 text-[13px] font-bold text-gray-900 border-b border-gray-100 pb-1.5">
                <span className="text-base">{activeConfig.icon}</span> Confirm {activeConfig.title}
              </div>
              
              {isSelectingEditField ? (
                <div className="flex flex-col gap-2 mt-1">
                  <p className="text-[11px] font-medium text-gray-600 mb-1">Select a field to modify:</p>
                  {activeConfig.steps.map(step => (
                     <button key={step.key} onClick={() => { setIsSelectingEditField(false); startEdit(step.key); }} className="text-left px-3 py-1.5 text-xs bg-gray-50 hover:bg-blue-50 border border-gray-100 hover:border-blue-200 rounded-lg transition-colors flex justify-between items-center group">
                       <span><span className="font-medium text-gray-700">{step.label}:</span> <span className="text-gray-500">{Array.isArray(collectedData[step.key]) ? collectedData[step.key].join(', ') : (collectedData[step.key] || <span className="italic">None</span>)}</span></span>
                       <span className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">✏️</span>
                     </button>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-y-3 gap-x-5 text-xs px-2">
                  {activeConfig.steps.map(step => (
                    <div key={step.key} className="flex flex-col gap-1">
                      <span className="text-[10px] text-gray-500 font-medium">{step.label}</span>
                      <span className="font-semibold text-gray-900 break-words bg-gray-50 p-1.5 rounded-md border border-gray-100">{Array.isArray(collectedData[step.key]) ? collectedData[step.key].join(', ') : (collectedData[step.key] || <span className="text-gray-400 font-normal italic">None</span>)}</span>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                {isSelectingEditField ? (
                   <button type="button" onClick={() => setIsSelectingEditField(false)} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-1.5 rounded-lg text-[11px] font-semibold transition-colors">
                     Cancel Edit
                   </button>
                ) : (
                  <>
                    <button type="button" onClick={async () => {
                      setExecutionState({ status: 'loading', message: `Executing ${activeConfig.title}...` });
                      try {
                        let res, data;
                        if (activeIntent === 'GET_EMPLOYEES' || activeIntent === 'GET_DEPARTMENTS' || activeIntent === 'GET_PROJECTS') {
                          let endpoint = `${API}/employees`;
                          if (activeIntent === 'GET_DEPARTMENTS') endpoint = `${API}/departments`;
                          if (activeIntent === 'GET_PROJECTS') endpoint = `${API}/projects`;
                          
                          res = await authFetch(endpoint);
                          const json = await res.json();
                          if (json.success) {
                            let finalData = json.data;
                            if (activeIntent === 'GET_EMPLOYEES') {
                              if (collectedData.department && collectedData.department.toLowerCase() !== 'skip') {
                                  finalData = finalData.filter(emp => emp.department_name && emp.department_name.toLowerCase().includes(collectedData.department.toLowerCase()));
                              }
                              setDataViewerModule('Employees');
                            } else if (activeIntent === 'GET_DEPARTMENTS') {
                              if (collectedData.name && collectedData.name.toLowerCase() !== 'skip') {
                                  finalData = finalData.filter(dept => dept.department_name && dept.department_name.toLowerCase().includes(collectedData.name.toLowerCase()));
                              }
                              setDataViewerModule('Departments');
                            } else if (activeIntent === 'GET_PROJECTS') {
                              if (collectedData.status && collectedData.status.toLowerCase() !== 'skip') {
                                  finalData = finalData.filter(proj => proj.status && proj.status.toLowerCase() === collectedData.status.toLowerCase());
                              }
                              setDataViewerModule('Projects');
                            }
                            setDataViewerPayload(finalData);
                            setExecutionState(null);
                            return;
                          } else {
                            data = json;
                          }
                        } else {
                          res = await authFetch(`${API}/chat/execute`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ intent: activeIntent, parameters: collectedData })
                          });
                          data = await res.json();
                        }
                        
                        if (data.success) {
                          if (data.require_confirmation) {
                            setExecutionState({
                              status: 'confirm_impact',
                              message: data.impact_analysis,
                              intent: data.intent,
                              entityId: data.entityId
                            });
                            return;
                          }
                          try {
                            window.dispatchEvent(new CustomEvent('chatbot_action_success', {
                              detail: { module: data.module, action: data.action }
                            }));
                          } catch(e) {}
                          
                          let idStr = '';
                          if (data.data) {
                             const keys = Object.keys(data.data);
                             const idKey = keys.find(k => k.endsWith('_id'));
                             if (idKey) idStr = `ID: ${data.data[idKey]}`;
                          }
                          
                          if (data.undoData) {
                            const tid = setTimeout(() => {
                              setUndoState(prev => prev ? { ...prev, isExpired: true } : null);
                            }, 30000);
                            setUndoState({
                              operationType: data.action,
                              moduleName: data.module,
                              undoData: data.undoData,
                              isExpired: false,
                              isUndoing: false,
                              isUndoSuccess: false,
                              timeoutId: tid
                            });
                          }
                          setExecutionState({ status: 'success', message: `${activeConfig.title} completed successfully.`, id: idStr });
                        } else {
                          setExecutionState({ status: 'error', message: data.message || 'Unknown error occurred.' });
                        }
                      } catch (e) {
                        setExecutionState({ status: 'error', message: 'System error occurred.' });
                      }
                    }} className="flex-2 w-full bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded-lg text-[11px] font-semibold transition-all shadow-md shadow-blue-200 flex items-center justify-center gap-1.5">
                      <Check className="w-4 h-4" /> Confirm
                    </button>
                    <button type="button" onClick={() => setIsSelectingEditField(true)} className="flex-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 py-1.5 rounded-lg text-[11px] font-semibold transition-colors shadow-sm">
                      Edit
                    </button>
                    <button type="button" onClick={cancel} className="bg-white border border-red-200 hover:bg-red-50 text-red-600 px-4 py-1.5 rounded-lg text-[11px] font-semibold transition-colors shadow-sm">
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {chatPermissionsMode && (
        <div className="px-3 py-2 mx-3 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg shadow-gray-200/50 animate-in fade-in slide-in-from-bottom-2 duration-300 z-10">
          <div className="text-[13px] font-medium text-gray-900 mt-1 mb-2">Select permissions:</div>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {availablePermissions.map(perm => {
              const isSelected = selectedPermissions.includes(perm);
              return (
                <button
                  key={perm}
                  type="button"
                  onClick={() => {
                    if (isSelected) setSelectedPermissions(prev => prev.filter(p => p !== perm));
                    else setSelectedPermissions(prev => [...prev, perm]);
                  }}
                  className={`px-2 py-1 text-[11px] font-medium rounded-full border transition-colors ${isSelected ? 'bg-blue-100 border-blue-200 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                >
                  {perm}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <button 
              type="button"
              onClick={() => submitPermissions(selectedPermissions)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors shadow-sm"
            >
              Confirm Selection
            </button>
            <button
              type="button"
              onClick={() => {
                setChatPermissionsMode(false);
                setSelectedPermissions([]);
              }}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-2 flex gap-1.5 relative z-20">
        <div ref={menuRef} className="relative flex items-center justify-center">
          <button
            type="button"
            onClick={() => {
              if (activeIntent) {
                const isCancel = window.confirm("Cancel the current workflow?");
                if (isCancel) cancel();
              } else {
                setShowMenu(!showMenu);
              }
            }}
            className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-2 rounded-lg flex items-center justify-center transition-colors h-full"
            aria-label="Quick Actions"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          <div
            className={`absolute bottom-full left-0 mb-2 w-56 bg-white border border-gray-100 rounded-xl shadow-lg py-1.5 max-h-72 overflow-y-auto transition-all duration-200 ease-out origin-bottom-left ${
              showMenu ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' : 'opacity-0 scale-95 translate-y-2 pointer-events-none'
            }`}
          >
            {menuItems.map((item, idx) => (
              <button
                key={item.label}
                type="button"
                onMouseEnter={() => setSelectedIndex(idx)}
                onClick={() => handleMenuSelect(item)}
                className={`w-full text-left px-4 py-2 text-xs transition-colors flex items-center gap-2.5 ${
                  selectedIndex === idx ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="text-[14px]">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg flex items-center px-2 focus-within:ring-2 focus-within:ring-blue-500 transition-shadow">
          {activeIntent && (
            <div className="flex items-center gap-1 bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-lg whitespace-nowrap ml-2 shadow-sm animate-in zoom-in-95 duration-200">
              <span role="img" aria-label="icon">{activeConfig.icon}</span> {activeConfig.title}
              <button 
                type="button" 
                onClick={cancel} 
                className="ml-1.5 text-blue-500 hover:text-blue-800 hover:bg-blue-200 rounded-full p-0.5 transition-colors focus:outline-none"
              >
                ✕
              </button>
            </div>
          )}
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Backspace' && text === '' && activeIntent) {
                cancel();
              }
            }}
            placeholder={
              activeIntent 
                ? (isFinished ? 'Press Confirm above...' : (currentStep?.type === 'multiselect' ? 'Select options above...' : `Type your answer...`)) 
                : 'Type your message...'
            }
            disabled={isTyping || isFinished || currentStep?.type === 'multiselect'}
            autoFocus={!!activeIntent}
            className="flex-1 bg-transparent px-2.5 py-2 focus:outline-none text-[13px] disabled:opacity-70"
          />
        </div>
        
        <button
          type="submit"
          disabled={(!text.trim() && !isFinished) || isTyping}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white p-2 rounded-lg flex items-center justify-center transition-colors shadow-sm"
          aria-label="Send message"
        >
          {isTyping ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
        </button>
      </form>
    </div>
  );
};

export default ChatInput;
