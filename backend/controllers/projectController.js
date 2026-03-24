const Project = require('../models/Project');

// @desc  Get all projects (manager sees all, employee sees assigned)
// @route GET /api/projects
const getProjects = async (req, res) => {
  try {
    const query = req.user.role === 'employee' ? { team: req.user._id } : {};
    const projects = await Project.find(query)
      .populate('manager', 'name email')
      .populate('team', 'name email role')
      .populate('tasks.assignedTo', 'name email role');
    res.json({ success: true, count: projects.length, projects });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Create project
// @route POST /api/projects
const createProject = async (req, res) => {
  try {
    const manager = req.user.role === 'admin' && req.body.manager ? req.body.manager : req.user._id;
    const team = Array.isArray(req.body.team) ? [...new Set(req.body.team.filter(Boolean))] : [];
    const project = await Project.create({ ...req.body, manager, team });
    res.status(201).json({ success: true, project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Update project / task status
// @route PUT /api/projects/:id
const updateProject = async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true, project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Delete project
// @route DELETE /api/projects/:id
const deleteProject = async (req, res) => {
  try {
    await Project.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getProjects, createProject, updateProject, deleteProject };
