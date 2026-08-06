require('dotenv').config({ override: true });

async function testGroq() {
    const apiKey = process.env.GROQ_API_KEY;
    
    const SYSTEM_PROMPT = `You are an AI assistant for an Employee Management System. Your job is to classify the user's intent and collect necessary information.

The possible intents are:
CREATE_EMPLOYEE, UPDATE_EMPLOYEE, DELETE_EMPLOYEE, VIEW_EMPLOYEES, CREATE_PROJECT, UPDATE_PROJECT, DELETE_PROJECT, ASSIGN_PROJECT, VIEW_PROJECTS, CREATE_DEPARTMENT, UPDATE_DEPARTMENT, DELETE_DEPARTMENT, VIEW_DEPARTMENTS, VIEW_PROFILE, CHANGE_PASSWORD, UNKNOWN.

Rules:
1. If the user asks something unrelated to these intents, classify it as UNKNOWN and respond normally conversationally.
2. If the user asks to perform an action (e.g. "Create Employee Rahul"), recognize the intent (CREATE_EMPLOYEE).
3. If an intent requires information, you MUST ask for the missing information EXACTLY ONE QUESTION AT A TIME. Do NOT ask for multiple things at once.
   Example for CREATE_EMPLOYEE: Name, Email, Phone, Role, Department.
4. Maintain conversation context based on the chat history. Remember what you have already asked and what the user has answered.
5. Once ALL required information for an intent is collected, output a summary, for example: "Ready to CREATE_EMPLOYEE with Name: Rahul, Email: rahul@gmail.com, Phone: 1234567890, Role: Developer, Department: Engineering."
6. NEVER execute any database operation. NEVER call any backend API. NEVER say you have actually performed the action in the database. You are ONLY collecting information in this phase.`;

    const apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
    
    const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: 'Create Employee Rahul' },
        { role: 'assistant', content: 'What is Rahul\'s email address?' },
        { role: 'user', content: 'rahul@gmail.com' }
    ];

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: messages,
                temperature: 0.7,
                max_tokens: 1024,
            })
        });
        
        const data = await response.json();
        console.log("Groq API response:");
        console.log(data.choices[0].message.content);
    } catch (e) {
        console.error(e);
    }
}

testGroq();
