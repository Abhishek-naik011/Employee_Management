const express = require('express');
const router = express.Router();
const { requireAdmin, requirePermission } = require('../middleware/authMiddleware');
const { getProjects, createProject, updateProject, deleteProject } = require('../controllers/projectController');

router.route('/')
    .get(requirePermission(['View Projects', 'View Assigned Projects']), getProjects)
    .post(requirePermission('Manage Projects'), createProject);

router.route('/:id')
    .put(requirePermission('Manage Projects'), updateProject)
    .delete(requirePermission('Manage Projects'), deleteProject);

module.exports = router;
