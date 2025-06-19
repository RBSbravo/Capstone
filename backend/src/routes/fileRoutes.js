const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { FileAttachment, User } = require('../models');
const { body, param } = require('express-validator');

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Add file type validation if needed
    cb(null, true);
  }
});

// Upload file for ticket
router.post(
  '/ticket/:ticketId',
  authenticateToken,
  upload.single('file'),
  param('ticketId').isString().matches(/^TKT-\d{8}-\d{5}$/),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const fileAttachment = await FileAttachment.create({
        ticket_id: req.params.ticketId,
        file_name: req.file.originalname,
        file_path: req.file.path,
        file_type: req.file.mimetype,
        file_size: req.file.size,
        uploaded_by: req.user.id
      });

      res.status(201).json(fileAttachment);
    } catch (error) {
      console.error('Error uploading file:', error);
      res.status(500).json({ error: 'Error uploading file' });
    }
  }
);

// Upload file for task
router.post(
  '/task/:taskId',
  authenticateToken,
  upload.single('file'),
  param('taskId').isString().matches(/^TSK-\d{8}-\d{5}$/),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const fileAttachment = await FileAttachment.create({
        task_id: req.params.taskId,
        file_name: req.file.originalname,
        file_path: req.file.path,
        file_type: req.file.mimetype,
        file_size: req.file.size,
        uploaded_by: req.user.id
      });

      res.status(201).json(fileAttachment);
    } catch (error) {
      console.error('Error uploading file:', error);
      res.status(500).json({ error: 'Error uploading file' });
    }
  }
);

// Upload file for comment
router.post(
  '/comment/:commentId',
  authenticateToken,
  upload.single('file'),
  param('commentId').isString().matches(/^CMT-\d{8}-\d{5}$/),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const fileAttachment = await FileAttachment.create({
        comment_id: req.params.commentId,
        file_name: req.file.originalname,
        file_path: req.file.path,
        file_type: req.file.mimetype,
        file_size: req.file.size,
        uploaded_by: req.user.id
      });

      res.status(201).json(fileAttachment);
    } catch (error) {
      console.error('Error uploading file:', error);
      res.status(500).json({ error: 'Error uploading file' });
    }
  }
);

// Get file by ID
router.get(
  '/:fileId',
  authenticateToken,
  param('fileId').isString().matches(/^FIL-\d{8}-\d{5}$/),
  async (req, res) => {
    try {
      const fileAttachment = await FileAttachment.findByPk(req.params.fileId, {
        include: [{ model: User, as: 'uploader', attributes: ['id', 'username', 'email'] }]
      });

      if (!fileAttachment) {
        return res.status(404).json({ error: 'File not found' });
      }

      res.json(fileAttachment);
    } catch (error) {
      console.error('Error getting file:', error);
      res.status(500).json({ error: 'Error getting file' });
    }
  }
);

// Download file
router.get(
  '/:fileId/download',
  authenticateToken,
  param('fileId').isString().matches(/^FIL-\d{8}-\d{5}$/),
  async (req, res) => {
    try {
      const fileAttachment = await FileAttachment.findByPk(req.params.fileId);

      if (!fileAttachment) {
        return res.status(404).json({ error: 'File not found' });
      }

      if (!fs.existsSync(fileAttachment.file_path)) {
        return res.status(404).json({ error: 'File not found on server' });
      }

      res.download(fileAttachment.file_path, fileAttachment.file_name);
    } catch (error) {
      console.error('Error downloading file:', error);
      res.status(500).json({ error: 'Error downloading file' });
    }
  }
);

// Delete file
router.delete(
  '/:fileId',
  authenticateToken,
  param('fileId').isString().matches(/^FIL-\d{8}-\d{5}$/),
  async (req, res) => {
    try {
      const fileAttachment = await FileAttachment.findByPk(req.params.fileId);

      if (!fileAttachment) {
        return res.status(404).json({ error: 'File not found' });
      }

      // Check if user is authorized to delete
      if (fileAttachment.uploaded_by !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Not authorized to delete this file' });
      }

      // Delete file from filesystem
      if (fs.existsSync(fileAttachment.file_path)) {
        fs.unlinkSync(fileAttachment.file_path);
      }

      // Delete record from database
      await fileAttachment.destroy();

      res.json({ message: 'File deleted successfully' });
    } catch (error) {
      console.error('Error deleting file:', error);
      res.status(500).json({ error: 'Error deleting file' });
    }
  }
);

// List files for ticket
router.get(
  '/ticket/:ticketId',
  authenticateToken,
  param('ticketId').isString().matches(/^TKT-\d{8}-\d{5}$/),
  async (req, res) => {
    try {
      const files = await FileAttachment.findAll({
        where: { ticket_id: req.params.ticketId },
        include: [{ model: User, as: 'uploader', attributes: ['id', 'username', 'email'] }]
      });

      res.json(files);
    } catch (error) {
      console.error('Error listing files:', error);
      res.status(500).json({ error: 'Error listing files' });
    }
  }
);

// List files for task
router.get(
  '/task/:taskId',
  authenticateToken,
  param('taskId').isString().matches(/^TSK-\d{8}-\d{5}$/),
  async (req, res) => {
    try {
      const files = await FileAttachment.findAll({
        where: { task_id: req.params.taskId },
        include: [{ model: User, as: 'uploader', attributes: ['id', 'username', 'email'] }]
      });

      res.json(files);
    } catch (error) {
      console.error('Error listing files:', error);
      res.status(500).json({ error: 'Error listing files' });
    }
  }
);

// List files for comment
router.get(
  '/comment/:commentId',
  authenticateToken,
  param('commentId').isString().matches(/^CMT-\d{8}-\d{5}$/),
  async (req, res) => {
    try {
      const files = await FileAttachment.findAll({
        where: { comment_id: req.params.commentId },
        include: [{ model: User, as: 'uploader', attributes: ['id', 'username', 'email'] }]
      });

      res.json(files);
    } catch (error) {
      console.error('Error listing files:', error);
      res.status(500).json({ error: 'Error listing files' });
    }
  }
);

module.exports = router; 