const pool = require('../config/db');
const attendanceController = require('./attendanceController');

const SYSTEM_PROMPT = `You are a conversational AI assistant for an Employee Management System. Your job is to help users manage employees, departments, roles, and projects.

You must ALWAYS respond strictly in valid JSON format.

{
  "action_ready": boolean,
  "intent": "<INTENT>",
  "missing_field": "<OPTIONAL_FIELD_NAME>",
  "parameters": {},
  "reply": "Your conversational response here"
}

The possible intents are:
CREATE_EMPLOYEE, UPDATE_EMPLOYEE, DELETE_EMPLOYEE, VIEW_EMPLOYEES, CREATE_PROJECT, UPDATE_PROJECT, DELETE_PROJECT, ASSIGN_PROJECT, VIEW_PROJECTS, CREATE_DEPARTMENT, UPDATE_DEPARTMENT, DELETE_DEPARTMENT, VIEW_DEPARTMENTS, VIEW_PROFILE, CREATE_ROLE, UPDATE_ROLE, DELETE_ROLE, CHANGE_PASSWORD, QUERY_ATTENDANCE, UNKNOWN.

Rules for conversation:
1. If the user wants to perform an action (e.g. CREATE_EMPLOYEE, CREATE_ROLE) but has not provided all necessary required fields (e.g., name, email, department, role, salary, description, permissions), you MUST set "action_ready": false and use the "reply" field to naturally ask them for the missing information.
2. CRITICAL: For CREATE_ROLE and UPDATE_ROLE, you MUST explicitly ask for "permissions". When asking for permissions, you MUST set "missing_field": "permissions".
3. Maintain the context. Gather all required parameters step by step or all at once.
4. Once ALL required parameters for the intent are collected (including permissions for roles), set "action_ready": true. You do not need to populate the "reply" field when action_ready is true.
5. For data retrieval intents (e.g., VIEW_EMPLOYEES, VIEW_PROJECTS), usually no parameters are strictly required unless the user specified a filter. Set "action_ready": true immediately.
6. If you do not understand the request, set intent to UNKNOWN, action_ready to false, and provide a helpful reply.
7. NEVER ask the user for an ID (e.g., Employee ID, Role ID, Department ID, Project ID). The backend automatically resolves names. Always ask for the entity's name instead.
8. For QUERY_ATTENDANCE questions, you MUST set "intent": "QUERY_ATTENDANCE" and "action_ready": true. Do NOT write a formatted answer in the reply field. The backend will execute the query. Extract any mentioned employee names into the parameters object (e.g., {"employee_name": "Ashok"}). If asking about missing or currently working employees in general, leave parameters empty or include query details.

Examples:

User: "Create an employee"
{
  "action_ready": false,
  "intent": "CREATE_EMPLOYEE",
  "missing_field": "full_name",
  "parameters": {},
  "reply": "I can help with that. What is the employee's name, email, department, role, and salary?"
}

User: "Create a role named Admin"
{
  "action_ready": false,
  "intent": "CREATE_ROLE",
  "missing_field": "permissions",
  "parameters": {
    "role_name": "Admin"
  },
  "reply": "What permissions should be assigned to the Admin role?"
}
`;

// ---------------------------------------------------------------------------
// Groq API Key Rotation Utilities
// ---------------------------------------------------------------------------

/**
 * Collect all environment variables matching GROQ_API_KEY_<n>, trim whitespace,
 * and return an array of objects { name, value } ordered by numeric suffix.
 */
function getGroqApiKeys() {
  const keyPattern = /^GROQ_API_KEY_(\d+)$/;
  return Object.entries(process.env)
    .filter(([envName]) => keyPattern.test(envName))
    .sort((a, b) => {
      const aNum = parseInt(a[0].match(keyPattern)[1], 10);
      const bNum = parseInt(b[0].match(keyPattern)[1], 10);
      return aNum - bNum;
    })
    .map(([envName, envValue]) => ({
      name: envName,
      value: typeof envValue === 'string' ? envValue.trim() : ''
    }));
}

exports.handleChat = async (req, res) => {
  try {
    const { messages, message } = req.body;

    // Support both old {message} payload and new {messages} array
    const chatHistory = messages || (message ? [{ role: 'user', content: message }] : []);

    if (chatHistory.length === 0) {
      return res.status(400).json({ success: false, message: 'Messages history is required' });
    }

    // Load all GROQ API keys (GROQ_API_KEY_1, GROQ_API_KEY_2, ...)
    const groqKeys = getGroqApiKeys();
    if (groqKeys.length === 0) {
      console.error('No GROQ_API_KEY_* environment variables found.');
      return res.status(500).json({ success: false, message: 'API Key not configured' });
    }
    // Log which key (masked) will be used first
    const apiKey = groqKeys[0].value;
    console.log('Using Groq API key:', `${groqKeys[0].name}: ${apiKey.slice(-4)}`);

    const apiUrl = 'https://api.groq.com/openai/v1/chat/completions';

    // Log original messages and prompt for debugging
    console.log('Original messages:');
    console.log(JSON.stringify(messages));
    console.log('SYSTEM_PROMPT: ' + SYSTEM_PROMPT);

    // Sanitize messages to remove any non-ASCII characters that cause ByteString errors
    const sanitizedMessages = chatHistory.map(msg => {
      if (typeof msg.content === 'string') {
        const cleaned = msg.content.replace(/[^\x00-\x7F]/g, (char) => {
          console.log('Removed non-ASCII character from message content: ' + char + ' code: ' + char.charCodeAt(0));
          return '';
        });
        return { ...msg, content: cleaned };
      }
      return msg;
    });

    // Sanitize the system prompt as well, in case it contains em dashes, smart quotes, bullets, etc.
    const cleanSystemPrompt = SYSTEM_PROMPT.replace(/[^\x00-\x7F]/g, (char) => {
      console.log(
        "Removed non-ASCII from SYSTEM_PROMPT:",
        char,
        "code:",
        char.charCodeAt(0)
      );
      return "";
    });

    const bodyPayload = {
      model: 'llama-3.3-70b-versatile',
      response_format: { type: "json_object" },
      messages: [
        { role: 'system', content: cleanSystemPrompt },
        ...sanitizedMessages
      ],
      temperature: 0.7,
      max_tokens: 1024,
    };

    console.log(
      JSON.stringify(bodyPayload, null, 2)
    );

    // Attempt Groq request with key rotation on rate limit (429)
    let apiResponse = null;
    let usedKeyName = '';
    for (let i = 0; i < groqKeys.length; i++) {
      const key = groqKeys[i].value;
      usedKeyName = groqKeys[i].name;
      console.log(`Attempting Groq request with key ${usedKeyName}`);
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bodyPayload)
      });
      if (response.ok) {
        apiResponse = response;
        console.log(`Groq request succeeded with key ${usedKeyName}`);
        break;
      } else if (response.status === 429) {
        console.warn(`Rate limit hit for ${usedKeyName}, trying next key`);
        // continue to next key
      } else {
        const errorText = await response.text();
        console.error('Groq API Error:', response.status, errorText);
        throw new Error(`Groq API returned status ${response.status}`);
      }
    }
    if (!apiResponse) {
      // All keys exhausted with 429
      return res.status(429).json({ success: false, message: 'All Groq API keys have reached their rate limits' });
    }

    const data = await apiResponse.json();

    try {
      const parsedContent = JSON.parse(data.choices[0].message.content);

      console.log("========== GROQ OUTPUT ==========");
      console.log(JSON.stringify(parsedContent, null, 2));
      console.log("================================");

      res.status(200).json({ success: true, ...parsedContent });
    } catch (e) {
      console.error('Failed to parse Groq response as JSON:', data.choices[0].message.content);
      res.status(200).json({ success: true, reply: "Sorry, I encountered an internal formatting error." });
    }
  } catch (error) {
    console.error("========== CHAT ERROR ==========");
    console.error(error);
    console.error(error.stack);

    res.status(500).json({
      success: false,
      reply: error.message
    });
  }
}