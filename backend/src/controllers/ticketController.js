const { Ticket, User, Department, Comment, sequelize } = require('../models');
const { Op } = require('sequelize');
const { validationResult } = require('express-validator');
const notificationService = require('../services/notificationService');

// Create a new ticket
exports.createTicket = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title,
      description,
      priority,
      category,
      tags
    } = req.body;
    const departmentId = req.body.departmentId || req.body.department_id;
    const assignedTo = req.body.assignedTo || req.body.assigned_to;
    const dueDate = req.body.dueDate || req.body.due_date;
    const createdBy = req.user.id;

    // Check department access
    if (req.user.role === 'employee' || req.user.role === 'department_head') {
      if (departmentId !== req.user.departmentId) {
        return res.status(403).json({ error: 'Not authorized to create tickets in this department' });
      }
    }

    const ticket = await Ticket.create({
      title,
      description,
      priority,
      category,
      department_id: departmentId,
      assigned_to: assignedTo,
      due_date: dueDate,
      tags,
      created_by: createdBy
    });

    // Notify assigned user
    if (assignedTo) {
      await notificationService.createNotification({
        userId: assignedTo,
        type: 'ticket_assigned',
        title: 'New Ticket Assigned',
        message: `You have been assigned to ticket: ${title}`,
        ticketId: ticket.id
      });
    }

    // Notify department head
    const department = await Department.findByPk(departmentId, {
      include: [{ model: User, where: { role: 'department_head' } }]
    });

    if (department && department.Users.length > 0) {
      await notificationService.createNotification({
        userId: department.Users[0].id,
        type: 'new_ticket',
        title: 'New Ticket Created',
        message: `A new ticket has been created in your department: ${title}`,
        ticketId: ticket.id
      });
    }

    res.status(201).json(ticket);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// Get all tickets with filtering
exports.getAllTickets = async (req, res) => {
  try {
    const {
      status,
      priority,
      department_id: departmentId,
      assigned_to: assignedTo,
      created_by: createdBy,
      category,
      search,
      page = 1,
      limit = 10
    } = req.query;

    const where = {};
    
    // Add department filter based on user role
    if (req.user.role === 'employee' || req.user.role === 'department_head') {
      where.department_id = req.user.departmentId;
    }
    
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (departmentId) where.department_id = departmentId;
    if (assignedTo) where.assigned_to = assignedTo;
    if (createdBy) where.created_by = createdBy;
    if (category) where.category = category;
    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    const tickets = await Ticket.findAndCountAll({
      where,
      include: [
        { model: User, as: 'creator', attributes: ['id', 'username', 'email'] },
        { model: User, as: 'assignee', attributes: ['id', 'username', 'email'] },
        { model: Department, attributes: ['id', 'name'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (page - 1) * limit
    });

    res.json({
      tickets: tickets.rows,
      total: tickets.count,
      currentPage: parseInt(page),
      totalPages: Math.ceil(tickets.count / limit)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// Get ticket by ID
exports.getTicketById = async (req, res) => {
  try {
    const ticket = await Ticket.findByPk(req.params.id, {
      include: [
        { model: User, as: 'creator', attributes: ['id', 'username', 'email'] },
        { model: User, as: 'assignee', attributes: ['id', 'username', 'email'] },
        { model: Department, attributes: ['id', 'name'] },
        { model: Comment, include: [{ model: User, as: 'author', attributes: ['id', 'username'] }] }
      ]
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json(ticket);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// Update ticket
exports.updateTicket = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const ticket = await Ticket.findByPk(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Check authorization
    if (req.user.role === 'employee') {
      if (ticket.department_id !== req.user.departmentId) {
        return res.status(403).json({ error: 'Not authorized to update this ticket' });
      }
    } else if (req.user.role === 'department_head') {
      if (ticket.department_id !== req.user.departmentId) {
        return res.status(403).json({ error: 'Not authorized to update this ticket' });
      }
    }

    const {
      title,
      description,
      status,
      priority,
      category,
      assigned_to: assignedTo,
      due_date: dueDate,
      resolution,
      tags
    } = req.body;

    // Check if assignment changed
    const wasAssigned = ticket.assigned_to;
    const isNewAssignment = assignedTo && assignedTo !== wasAssigned;

    const updatedTicket = await ticket.update({
      title,
      description,
      status,
      priority,
      category,
      assigned_to: assignedTo,
      due_date: dueDate,
      resolution,
      tags
    });

    // Notify new assignee if assignment changed
    if (isNewAssignment) {
      await notificationService.createNotification({
        userId: assignedTo,
        type: 'ticket_assigned',
        title: 'Ticket Assigned',
        message: `You have been assigned to ticket: ${title}`,
        ticketId: ticket.id
      });
    }

    // Notify status change
    if (status && status !== ticket.status) {
      const notifyUsers = [ticket.created_by];
      if (ticket.assigned_to) notifyUsers.push(ticket.assigned_to);

      for (const userId of notifyUsers) {
        await notificationService.createNotification({
          userId,
          type: 'ticket_status_changed',
          title: 'Ticket Status Updated',
          message: `Ticket "${title}" status changed to ${status}`,
          ticketId: ticket.id
        });
      }
    }

    res.json(updatedTicket);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// Delete ticket
exports.deleteTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findOne({
      where: { id: req.params.id },
      include: [{ model: Department }]
    });

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Only admin can delete tickets
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admin can delete tickets' });
    }

    await ticket.destroy();
    res.status(200).json({ message: 'Ticket deleted successfully' });
  } catch (error) {
    console.error('Error deleting ticket:', error);
    res.status(500).json({ message: 'Error deleting ticket' });
  }
};

// Get ticket statistics
exports.getTicketStats = async (req, res) => {
  try {
    const { department_id: departmentId, startDate, endDate } = req.query;
    const where = {};

    if (departmentId) where.department_id = departmentId;
    if (startDate && endDate) {
      where.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const stats = await Ticket.findAll({
      where,
      attributes: [
        'status',
        'priority',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status', 'priority']
    });

    res.json(stats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}; 