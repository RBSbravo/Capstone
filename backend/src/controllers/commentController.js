const { Comment, User, Task, Notification } = require('../models');
const { emitNewComment } = require('../services/socketService');

// Create a new comment
const createComment = async (req, res) => {
  try {
    const { content, taskId } = req.body;
    const authorId = req.user.id;

    // Check if task exists
    const task = await Task.findByPk(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Create comment
    const comment = await Comment.create({
      content,
      taskId,
      authorId
    });

    // Create notification for task assignee and creator
    const notificationMessage = `${req.user.username} commented on task: ${task.title}`;
    
    // Notify task assignee if different from comment author
    if (task.assignedToId !== authorId) {
      await Notification.create({
        type: 'comment_added',
        message: notificationMessage,
        userId: task.assignedToId,
        taskId,
        relatedUserId: authorId
      });
    }

    // Notify task creator if different from comment author and assignee
    if (task.createdBy !== authorId && task.createdBy !== task.assignedToId) {
      await Notification.create({
        type: 'comment_added',
        message: notificationMessage,
        userId: task.createdBy,
        taskId,
        relatedUserId: authorId
      });
    }

    const commentWithAuthor = await Comment.findByPk(comment.id, {
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'email']
        }
      ]
    });

    // Emit WebSocket event for new comment
    emitNewComment(commentWithAuthor);

    res.status(201).json(commentWithAuthor);
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ message: 'Error creating comment' });
  }
};

// Get comments for a task
const getTaskComments = async (req, res) => {
  try {
    const { taskId } = req.params;

    // Check if task exists
    const task = await Task.findByPk(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const comments = await Comment.findAll({
      where: { taskId },
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'username', 'email']
      }],
      order: [['createdAt', 'DESC']]
    });

    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update a comment
const updateComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    const comment = await Comment.findByPk(id);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Only allow comment author to update
    if (comment.authorId !== userId) {
      return res.status(403).json({ error: 'Not authorized to update this comment' });
    }

    await comment.update({ content });

    const updatedComment = await Comment.findByPk(id, {
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'username', 'email']
      }]
    });

    res.json(updatedComment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete a comment
const deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const comment = await Comment.findByPk(id);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Only allow comment author or admin to delete
    if (comment.authorId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this comment' });
    }

    await comment.destroy();
    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createComment,
  getTaskComments,
  updateComment,
  deleteComment
}; 