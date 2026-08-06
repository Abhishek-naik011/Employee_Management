import { useState } from 'react';
import { workflowConfig } from './workflowConfig';

export const useGuidedWorkflow = () => {
  const [activeIntent, setActiveIntent] = useState(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [collectedData, setCollectedData] = useState({});
  const [error, setError] = useState(null);
  const [isFinished, setIsFinished] = useState(false);
  const [editingKey, setEditingKey] = useState(null);

  const activeConfig = activeIntent ? workflowConfig[activeIntent] : null;
  const steps = activeConfig ? activeConfig.steps : [];
  const currentStep = editingKey 
    ? steps.find(s => s.key === editingKey)
    : steps[currentStepIndex];

  const normalizeData = (intent, initialData) => {
    if (!initialData) return {};
    const normalized = { ...initialData };
    
    // Alias mappings
    if (intent === 'CREATE_EMPLOYEE') {
      if (initialData.full_name) normalized.name = initialData.full_name;
      if (initialData.employee_name) normalized.name = initialData.employee_name;
      if (initialData.department_name) normalized.department = initialData.department_name;
      if (initialData.role_name) normalized.role = initialData.role_name;
    } else if (intent === 'UPDATE_EMPLOYEE') {
      if (initialData.employee_name) normalized.name = initialData.employee_name;
      if (initialData.full_name) normalized.name = initialData.full_name;
      if (initialData.fields_to_update) {
         const f = initialData.fields_to_update;
         if (f.email) normalized.new_email = f.email;
         if (f.phone) normalized.new_phone = f.phone;
         if (f.department_name || f.department) normalized.new_department = f.department_name || f.department;
         if (f.role_name || f.role) normalized.new_role = f.role_name || f.role;
         if (f.salary) normalized.new_salary = f.salary;
         if (f.status) normalized.new_status = f.status;
      }
    } else if (intent === 'DELETE_EMPLOYEE') {
      if (initialData.employee_name) normalized.id = initialData.employee_name;
    } else if (intent === 'CREATE_DEPARTMENT') {
      if (initialData.department_name) normalized.department_name = initialData.department_name;
    } else if (intent === 'UPDATE_DEPARTMENT') {
      if (initialData.current_department_name) normalized.name = initialData.current_department_name;
      if (initialData.new_department_head) normalized.new_head = initialData.new_department_head;
    } else if (intent === 'DELETE_DEPARTMENT') {
      if (initialData.department_name) normalized.id = initialData.department_name;
    } else if (intent === 'CREATE_ROLE') {
      if (initialData.role_name) normalized.role_name = initialData.role_name;
    } else if (intent === 'UPDATE_ROLE') {
      if (initialData.current_role_name) normalized.name = initialData.current_role_name;
    } else if (intent === 'DELETE_ROLE') {
      if (initialData.role_name) normalized.id = initialData.role_name;
    } else if (intent === 'UPDATE_PROJECT') {
      if (initialData.project_name) normalized.name = initialData.project_name;
    } else if (intent === 'DELETE_PROJECT') {
      if (initialData.project_name) normalized.id = initialData.project_name;
    }
    return normalized;
  };

  const start = (intent, initialData = {}) => {
    setActiveIntent(intent);
    
    const config = workflowConfig[intent];
    if (!config) {
       setCollectedData({});
       setCurrentStepIndex(0);
       setIsFinished(false);
       setError(null);
       setEditingKey(null);
       return;
    }
    
    const normalized = normalizeData(intent, initialData);
    setCollectedData(normalized);
    setError(null);
    setEditingKey(null);
    
    const cSteps = config.steps || [];
    let firstMissingIndex = 0;
    let allFilled = true;
    for (let i = 0; i < cSteps.length; i++) {
       const key = cSteps[i].key;
       if (normalized[key] === undefined || normalized[key] === null || normalized[key] === '') {
         firstMissingIndex = i;
         allFilled = false;
         break;
       }
    }
    
    if (cSteps.length === 0) {
       setCurrentStepIndex(0);
       setIsFinished(false);
    } else if (allFilled) {
       setCurrentStepIndex(cSteps.length - 1);
       setIsFinished(true);
    } else {
       // Find first step that doesn't have a condition or whose condition is met
       while (firstMissingIndex < cSteps.length && cSteps[firstMissingIndex].condition && !cSteps[firstMissingIndex].condition(normalized)) {
           firstMissingIndex++;
       }
       if (firstMissingIndex < cSteps.length) {
         setCurrentStepIndex(firstMissingIndex);
         setIsFinished(false);
       } else {
         setIsFinished(true);
       }
    }
  };

  const next = (value) => {
    if (!activeConfig || (isFinished && !editingKey)) return;
    
    const isSkip = typeof value === 'string' && value.toLowerCase() === 'skip';
    
    if (isSkip && !currentStep.optional) {
      setError('This field is required and cannot be skipped.');
      return;
    }

    if (!isSkip) {
      const validation = currentStep.validate(value);
      if (!validation.valid) {
        setError(validation.error);
        return;
      }
    }

    const newData = { ...collectedData, [currentStep.key]: isSkip ? null : value };
    setCollectedData(newData);
    setError(null);

    if (editingKey) {
      setEditingKey(null);
      setIsFinished(true);
    } else {
      let nextIndex = currentStepIndex + 1;
      while (nextIndex < steps.length && steps[nextIndex].condition && !steps[nextIndex].condition(newData)) {
          nextIndex++;
      }
      if (nextIndex < steps.length) {
        setCurrentStepIndex(nextIndex);
      } else {
        setIsFinished(true);
      }
    }
  };

  const back = () => {
    if (editingKey) {
      setEditingKey(null);
      setIsFinished(true);
      setError(null);
      return;
    }
    let prevIndex = currentStepIndex - 1;
    while (prevIndex >= 0 && steps[prevIndex].condition && !steps[prevIndex].condition(collectedData)) {
        prevIndex--;
    }
    if (prevIndex >= 0) {
      setCurrentStepIndex(prevIndex);
    }
    setError(null);
  };

  const cancel = () => {
    setActiveIntent(null);
    setCurrentStepIndex(0);
    setCollectedData({});
    setError(null);
    setIsFinished(false);
    setEditingKey(null);
  };

  const startEdit = (key) => {
    setEditingKey(key);
    setIsFinished(false);
    setError(null);
  };

  return {
    activeIntent,
    activeConfig,
    currentStep,
    currentStepIndex,
    totalSteps: steps.length,
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
  };
};
