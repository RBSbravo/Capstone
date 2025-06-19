const { validationResult } = require('express-validator');
const { Task, User, Department, Comment } = require('../models');
const { Op } = require('sequelize');
const { emitTaskUpdate, emitTaskStatusChange, emitTaskAssignment } = require('../services/socketService');
const { createNotification } = require('./notificationController');

// Create a new task
const createTask = async (req, res) => {
  try {
    const { title, description, priority, dueDate, assignedToId, departmentId } = req.body;
    const createdBy = req.user.id;

    const task = await Task.create({
      title,
      description,
      priority,
      dueDate,
      status: 'pending',
      assignedToId,
      departmentId,
      createdBy
    });

    const taskWithAssociations = await Task.findByPk(task.id, {
      include: [
        {
          model: User,
          as: 'assignedUser',
          attributes: ['id', 'username', 'email']
        },
        {
          model: Department,
          attributes: ['id', 'name']
        }
      ]
    });

    res.status(201).json(taskWithAssociations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all tasks with filters
const getAllTasks = async (req, res) => {
  try {
    const { status, priority, departmentId, assignedToId } = req.query;
    const where = {};

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (departmentId) where.departmentId = departmentId;
    if (assignedToId) where.assignedToId = assignedToId;

    // If user is not admin or department head, only show tasks assigned to them
    if (req.user.role === 'employee') {
      where[Op.or] = [
        { assignedToId: req.user.id },
        { createdBy: req.user.id }
      ];
    }

    const tasks = await Task.findAll({
      where,
      include: [
        {
          model: User,
          as: 'assignedUser',
          attributes: ['id', 'username', 'email']
        },
        {
          model: Department,
          attributes: ['id', 'name']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get task by ID
const getTaskById = async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'assignedUser',
          attributes: ['id', 'username', 'email']
        },
        {
          model: Department,
          attributes: ['id', 'name']
        }
      ]
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Check if user has permission to view this task
    if (req.user.role === 'employee' && 
        task.assignedToId !== req.user.id && 
        task.createdBy !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to view this task' });
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update task
const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findByPk(id);
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check permissions
    if (req.user.role === 'employee' && 
        task.createdBy !== req.user.id && 
        task.assignedToId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this task' });
    }

    const updatedTask = await task.update(req.body);
    
    // Create and emit notifications based on what was updated
    if (req.body.status) {
      emitTaskStatusChange(id, req.body.status);
      // Notify task assignee about status change
      if (task.assignedToId && task.assignedToId !== req.user.id) {
        await createNotification(
          task.assignedToId,
          'task_updated',
          `Task "${task.title}" status has been updated to ${req.body.status}`,
          task.id,
          req.user.id
        );
      }
    }
    if (req.body.assignedToId) {
      emitTaskAssignment(id, req.body.assignedToId);
      // Notify new assignee
      if (req.body.assignedToId !== req.user.id) {
        await createNotification(
          req.body.assignedToId,
          'task_assigned',
          `You have been assigned to task "${task.title}"`,
          task.id,
          req.user.id
        );
      }
    }
    emitTaskUpdate({ taskId: id, status: updatedTask.status });

    res.json(updatedTask);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ message: 'Error updating task' });
  }
};

// Delete task
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Only admin can delete tasks
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete tasks' });
    }

    await task.destroy();
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createTask,
  getAllTasks,
  getTaskById,
  updateTask,
  deleteTask
}; 
