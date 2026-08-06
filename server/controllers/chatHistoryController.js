const pool = require('../config/db');

// GET /api/chat/history
exports.getConversations = async (req, res) => {
    try {
        const userId = req.user.id; // From verifyToken
        const query = `
            SELECT * FROM chat_conversations
            WHERE user_id = $1
            ORDER BY updated_at DESC
        `;
        const result = await pool.query(query, [userId]);
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// GET /api/chat/history/:id
exports.getMessages = async (req, res) => {
    try {
        const conversationId = req.params.id;
        const userId = req.user.id;
        
        // Verify ownership
        const convCheck = await pool.query(`SELECT id FROM chat_conversations WHERE id = $1 AND user_id = $2`, [conversationId, userId]);
        if (convCheck.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'Unauthorized access to this conversation' });
        }

        const query = `
            SELECT id, sender, message as text, timestamp
            FROM chat_messages
            WHERE conversation_id = $1
            ORDER BY timestamp ASC
        `;
        const result = await pool.query(query, [conversationId]);
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// POST /api/chat/history
exports.createConversation = async (req, res) => {
    try {
        const { title, initialMessage } = req.body;
        const userId = req.user.id;
        
        // Auto-generate a title if not provided
        let conversationTitle = title || 'New Conversation';
        if (!title && initialMessage) {
            conversationTitle = initialMessage.split(' ').slice(0, 4).join(' ') + '...';
        }

        const query = `
            INSERT INTO chat_conversations (user_id, title)
            VALUES ($1, $2)
            RETURNING *
        `;
        const result = await pool.query(query, [userId, conversationTitle]);
        const conversation = result.rows[0];

        res.status(201).json({ success: true, data: conversation });
    } catch (error) {
        console.error('Error creating conversation:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// POST /api/chat/history/:id/messages
exports.addMessage = async (req, res) => {
    try {
        const conversationId = req.params.id;
        const userId = req.user.id;
        // Accept optional dataPayload and moduleName
        const { sender, text, dataPayload = null, moduleName = null } = req.body;

        // Verify ownership
        const convCheck = await pool.query(`SELECT id FROM chat_conversations WHERE id = $1 AND user_id = $2`, [conversationId, userId]);
        if (convCheck.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        // Store message as JSON string to preserve payload and module info
        const messageObj = { text, dataPayload, moduleName };
        const messageContent = JSON.stringify(messageObj);

        const query = `
            INSERT INTO chat_messages (conversation_id, sender, message)
            VALUES ($1, $2, $3)
            RETURNING *
        `;
        const result = await pool.query(query, [conversationId, sender, messageContent]);
        
        // Update the updated_at timestamp on the conversation
        await pool.query(`UPDATE chat_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [conversationId]);

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error adding message:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// PUT /api/chat/history/:id
exports.renameConversation = async (req, res) => {
    try {
        const conversationId = req.params.id;
        const userId = req.user.id;
        const { title } = req.body;

        const query = `
            UPDATE chat_conversations
            SET title = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2 AND user_id = $3
            RETURNING *
        `;
        const result = await pool.query(query, [title, conversationId, userId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Conversation not found or unauthorized' });
        }

        res.status(200).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error renaming conversation:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// DELETE /api/chat/history/:id
exports.deleteConversation = async (req, res) => {
    try {
        const conversationId = req.params.id;
        const userId = req.user.id;

        const query = `
            DELETE FROM chat_conversations
            WHERE id = $1 AND user_id = $2
            RETURNING *
        `;
        const result = await pool.query(query, [conversationId, userId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Conversation not found or unauthorized' });
        }

        res.status(200).json({ success: true, message: 'Conversation deleted' });
    } catch (error) {
        console.error('Error deleting conversation:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
