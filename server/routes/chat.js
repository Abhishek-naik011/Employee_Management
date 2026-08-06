const express = require('express');
const router = express.Router();
const { handleChat } = require('../controllers/chatController');
const { executeAction } = require('../controllers/chatActionExecutor');

const historyController = require('../controllers/chatHistoryController');

router.post('/', handleChat);
router.post('/execute', executeAction);
router.post('/undo', require('../controllers/chatActionExecutor').undoAction);

// History Routes
router.get('/history', historyController.getConversations);
router.post('/history', historyController.createConversation);
router.get('/history/:id', historyController.getMessages);
router.post('/history/:id/messages', historyController.addMessage);
router.put('/history/:id', historyController.renameConversation);
router.delete('/history/:id', historyController.deleteConversation);

module.exports = router;
