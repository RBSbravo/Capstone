const analyticsService = require('../services/analyticsService');
const { validationResult } = require('express-validator');
const { CustomReport, User } = require('../models');

class AnalyticsController {
  async getDepartmentMetrics(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { departmentId } = req.params;
      const { startDate, endDate } = req.query;

      const metrics = await analyticsService.getDepartmentMetrics(
        departmentId,
        startDate,
        endDate
      );

      res.json(metrics);
    } catch (error) {
      console.error('Error getting department metrics:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getUserPerformance(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { userId } = req.params;
      const { startDate, endDate } = req.query;

      const performance = await analyticsService.getUserPerformanceMetrics(
        userId,
        startDate,
        endDate
      );

      res.json(performance);
    } catch (error) {
      console.error('Error getting user performance:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getDepartmentAnalytics(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { departmentId } = req.params;
      const { startDate, endDate } = req.query;

      const analytics = await analyticsService.getDepartmentAnalytics(
        departmentId,
        startDate,
        endDate
      );

      res.json(analytics);
    } catch (error) {
      console.error('Error getting department analytics:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateMetrics(req, res) {
    try {
      await analyticsService.updateDailyMetrics();
      res.json({ message: 'Metrics updated successfully' });
    } catch (error) {
      console.error('Error updating metrics:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getTaskTrends(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { departmentId } = req.params;
      const { period, startDate, endDate } = req.query;

      const trends = await analyticsService.calculateTaskTrends(
        departmentId,
        period,
        startDate,
        endDate
      );

      res.json(trends);
    } catch (error) {
      console.error('Error getting task trends:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getActivityLogs(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { userId } = req.params;
      const { startDate, endDate, action } = req.query;

      const logs = await analyticsService.getActivityLogs(
        userId,
        startDate,
        endDate,
        action
      );

      res.json(logs);
    } catch (error) {
      console.error('Error getting activity logs:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async createCustomReport(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Check if user has admin role
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only administrators can create custom reports' });
      }

      const { name, description, type, parameters, schedule } = req.body;
      const createdBy = req.user.id;

      const report = await CustomReport.create({
        name,
        description,
        type,
        parameters,
        schedule,
        createdBy
      });

      res.status(201).json(report);
    } catch (error) {
      console.error('Error creating custom report:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getCustomReport(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Check if user has admin role
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only administrators can view custom reports' });
      }

      const { reportId } = req.params;
      const report = await analyticsService.generateCustomReport(reportId);
      res.json(report);
    } catch (error) {
      console.error('Error getting custom report:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async listCustomReports(req, res) {
    try {
      // Check if user has admin role
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only administrators can list custom reports' });
      }

      const { type, isActive } = req.query;
      const where = {};

      if (type) where.type = type;
      if (isActive !== undefined) where.isActive = isActive === 'true';

      const reports = await CustomReport.findAll({
        where,
        include: [{
          model: User,
          as: 'reportCreator',
          attributes: ['id', 'username', 'email']
        }],
        order: [['createdAt', 'DESC']]
      });

      res.json(reports);
    } catch (error) {
      console.error('Error listing custom reports:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateCustomReport(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Check if user has admin role
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only administrators can update custom reports' });
      }

      const { reportId } = req.params;
      const { name, description, parameters, schedule, isActive } = req.body;

      const report = await CustomReport.findByPk(reportId);
      if (!report) {
        return res.status(404).json({ error: 'Report not found' });
      }

      await report.update({
        name,
        description,
        parameters,
        schedule,
        isActive
      });

      res.json(report);
    } catch (error) {
      console.error('Error updating custom report:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async deleteCustomReport(req, res) {
    try {
      // Check if user has admin role
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only administrators can delete custom reports' });
      }

      const { reportId } = req.params;
      const report = await CustomReport.findByPk(reportId);
      if (!report) {
        return res.status(404).json({ error: 'Report not found' });
      }

      await report.destroy();
      res.json({ message: 'Report deleted successfully' });
    } catch (error) {
      console.error('Error deleting custom report:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateCustomReportSchedule(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Check if user has admin role
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only administrators can update report schedules' });
      }

      const { reportId } = req.params;
      const { cron, recipientEmail } = req.body;

      const report = await CustomReport.findByPk(reportId);
      if (!report) {
        return res.status(404).json({ error: 'Report not found' });
      }

      // Update the schedule field
      report.schedule = { cron, recipientEmail };
      await report.update({ schedule: report.schedule });

      res.json({ message: 'Report schedule updated successfully', report });
    } catch (error) {
      console.error('Error updating report schedule:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new AnalyticsController(); 