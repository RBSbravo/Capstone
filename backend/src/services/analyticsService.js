const { Task, User, Department, TaskMetrics, UserPerformance, DepartmentAnalytics, UserActivityLog, CustomReport } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/database');

class AnalyticsService {
  async calculateTaskMetrics(departmentId, date) {
    const tasks = await Task.findAll({
      where: {
        departmentId,
        createdAt: {
          [Op.lte]: date
        }
      }
    });

    const metrics = {
      totalTasks: tasks.length,
      completedTasks: tasks.filter(task => task.status === 'completed').length,
      pendingTasks: tasks.filter(task => task.status === 'pending').length,
      overdueTasks: tasks.filter(task => 
        task.status !== 'completed' && 
        new Date(task.dueDate) < new Date()
      ).length,
      averageCompletionTime: 0
    };

    const completedTasks = tasks.filter(task => task.status === 'completed');
    if (completedTasks.length > 0) {
      const totalCompletionTime = completedTasks.reduce((sum, task) => {
        const completionTime = new Date(task.updatedAt) - new Date(task.createdAt);
        return sum + completionTime;
      }, 0);
      metrics.averageCompletionTime = totalCompletionTime / completedTasks.length;
    }

    return metrics;
  }

  async calculateUserPerformance(userId, date) {
    const tasks = await Task.findAll({
      where: {
        assignedToId: userId,
        createdAt: {
          [Op.lte]: date
        }
      }
    });

    const performance = {
      tasksCompleted: tasks.filter(task => task.status === 'completed').length,
      tasksOverdue: tasks.filter(task => 
        task.status !== 'completed' && 
        new Date(task.dueDate) < new Date()
      ).length,
      averageResponseTime: 0,
      productivityScore: 0
    };

    // Calculate average response time (time to first action on task)
    const tasksWithComments = tasks.filter(task => task.comments && task.comments.length > 0);
    if (tasksWithComments.length > 0) {
      const totalResponseTime = tasksWithComments.reduce((sum, task) => {
        const firstComment = task.comments[0];
        const responseTime = new Date(firstComment.createdAt) - new Date(task.createdAt);
        return sum + responseTime;
      }, 0);
      performance.averageResponseTime = totalResponseTime / tasksWithComments.length;
    }

    // Calculate productivity score (0-100)
    const totalTasks = tasks.length;
    if (totalTasks > 0) {
      const completionRate = performance.tasksCompleted / totalTasks;
      const overdueRate = performance.tasksOverdue / totalTasks;
      performance.productivityScore = (completionRate * 100) - (overdueRate * 50);
    }

    return performance;
  }

  async calculateDepartmentAnalytics(departmentId, date) {
    const department = await Department.findByPk(departmentId, {
      include: [{
        model: User,
        as: 'Users'
      }]
    });

    const analytics = {
      totalEmployees: department.Users.length,
      activeEmployees: department.Users.filter(user => user.isActive).length,
      departmentEfficiency: 0,
      averageTaskCompletionTime: 0
    };

    // Calculate department efficiency
    const tasks = await Task.findAll({
      where: {
        departmentId,
        createdAt: {
          [Op.lte]: date
        }
      }
    });

    const completedTasks = tasks.filter(task => task.status === 'completed');
    if (completedTasks.length > 0) {
      const totalCompletionTime = completedTasks.reduce((sum, task) => {
        const completionTime = new Date(task.updatedAt) - new Date(task.createdAt);
        return sum + completionTime;
      }, 0);
      analytics.averageTaskCompletionTime = totalCompletionTime / completedTasks.length;
    }

    // Calculate department efficiency score (0-100)
    const totalTasks = tasks.length;
    if (totalTasks > 0) {
      const completionRate = completedTasks.length / totalTasks;
      const overdueRate = tasks.filter(task => 
        task.status !== 'completed' && 
        new Date(task.dueDate) < new Date()
      ).length / totalTasks;
      analytics.departmentEfficiency = (completionRate * 100) - (overdueRate * 50);
    }

    return analytics;
  }

  async getDepartmentMetrics(departmentId, startDate, endDate) {
    const metrics = await TaskMetrics.findAll({
      where: {
        departmentId,
        date: {
          [Op.between]: [startDate, endDate]
        }
      },
      order: [['date', 'ASC']]
    });

    return metrics;
  }

  async getUserPerformanceMetrics(userId, startDate, endDate) {
    const performance = await UserPerformance.findAll({
      where: {
        userId,
        date: {
          [Op.between]: [startDate, endDate]
        }
      },
      order: [['date', 'ASC']]
    });

    return performance;
  }

  async getDepartmentAnalytics(departmentId, startDate, endDate) {
    const analytics = await DepartmentAnalytics.findAll({
      where: {
        departmentId,
        date: {
          [Op.between]: [startDate, endDate]
        }
      },
      order: [['date', 'ASC']]
    });

    return analytics;
  }

  async updateDailyMetrics() {
    const today = new Date().toISOString().split('T')[0];
    const departments = await Department.findAll();

    for (const department of departments) {
      // Update task metrics
      const taskMetrics = await this.calculateTaskMetrics(department.id, today);
      await TaskMetrics.create({
        ...taskMetrics,
        departmentId: department.id,
        date: today
      });

      // Update department analytics
      const departmentAnalytics = await this.calculateDepartmentAnalytics(department.id, today);
      await DepartmentAnalytics.create({
        ...departmentAnalytics,
        departmentId: department.id,
        date: today
      });

      // Update user performance for each user in the department
      const users = await User.findAll({
        where: { departmentId: department.id }
      });

      for (const user of users) {
        const userPerformance = await this.calculateUserPerformance(user.id, today);
        await UserPerformance.create({
          ...userPerformance,
          userId: user.id,
          date: today
        });
      }
    }
  }

  async calculateTaskTrends(departmentId, period, startDate, endDate) {
    const tasks = await Task.findAll({
      where: {
        departmentId,
        createdAt: {
          [Op.between]: [startDate, endDate]
        }
      }
    });

    const trends = {
      completionRate: 0,
      averageResolutionTime: 0,
      priorityDistribution: {
        high: 0,
        medium: 0,
        low: 0
      },
      statusDistribution: {
        pending: 0,
        in_progress: 0,
        completed: 0,
        cancelled: 0
      }
    };

    // Calculate completion rate
    const completedTasks = tasks.filter(task => task.status === 'completed');
    trends.completionRate = tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0;

    // Calculate average resolution time
    if (completedTasks.length > 0) {
      const totalResolutionTime = completedTasks.reduce((sum, task) => {
        return sum + (new Date(task.updatedAt) - new Date(task.createdAt));
      }, 0);
      trends.averageResolutionTime = totalResolutionTime / completedTasks.length;
    }

    // Calculate priority distribution
    tasks.forEach(task => {
      trends.priorityDistribution[task.priority]++;
    });

    // Calculate status distribution
    tasks.forEach(task => {
      trends.statusDistribution[task.status]++;
    });

    return trends;
  }

  async logUserActivity(userId, action, entityType, entityId, details = {}) {
    return await UserActivityLog.create({
      userId,
      action,
      entityType,
      entityId,
      details
    });
  }

  async generateCustomReport(reportId) {
    const report = await CustomReport.findByPk(reportId, {
      include: [{
        model: User,
        as: 'reportCreator',
        attributes: ['id', 'username', 'email']
      }]
    });

    if (!report) {
      throw new Error('Report not found');
    }

    let data;
    switch (report.type) {
      case 'task':
        data = await this.generateTaskReport(report.parameters);
        break;
      case 'user':
        data = await this.generateUserReport(report.parameters);
        break;
      case 'department':
        data = await this.generateDepartmentReport(report.parameters);
        break;
      case 'custom':
        data = await this.generateCustomReportData(report.parameters);
        break;
      default:
        throw new Error('Invalid report type');
    }

    return {
      report,
      data
    };
  }

  async generateTaskReport(parameters) {
    const { departmentId, startDate, endDate, status, priority } = parameters;
    const where = {
      createdAt: {
        [Op.between]: [startDate, endDate]
      }
    };

    if (departmentId) where.departmentId = departmentId;
    if (status) where.status = status;
    if (priority) where.priority = priority;

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
      ]
    });

    return tasks;
  }

  async generateUserReport(parameters) {
    const { userId, startDate, endDate } = parameters;
    const performance = await UserPerformance.findAll({
      where: {
        userId,
        date: {
          [Op.between]: [startDate, endDate]
        }
      },
      order: [['date', 'ASC']]
    });

    const activityLog = await UserActivityLog.findAll({
      where: {
        userId,
        timestamp: {
          [Op.between]: [startDate, endDate]
        }
      },
      order: [['timestamp', 'DESC']]
    });

    return {
      performance,
      activityLog
    };
  }

  async generateDepartmentReport(parameters) {
    const { departmentId, startDate, endDate } = parameters;
    const [metrics, analytics, trends] = await Promise.all([
      this.getDepartmentMetrics(departmentId, startDate, endDate),
      this.getDepartmentAnalytics(departmentId, startDate, endDate),
      this.calculateTaskTrends(departmentId, 'monthly', startDate, endDate)
    ]);

    return {
      metrics,
      analytics,
      trends
    };
  }

  async generateCustomReportData(parameters) {
    // Implement custom report generation based on parameters
    // This is a placeholder for custom report logic
    return {
      message: 'Custom report generation not implemented'
    };
  }

  async getActivityLogs(userId, startDate, endDate, action = null) {
    const where = {
      userId,
      timestamp: {
        [Op.between]: [startDate, endDate]
      }
    };

    if (action) {
      where.action = action;
    }

    return await UserActivityLog.findAll({
      where,
      order: [['timestamp', 'DESC']],
      include: [{
        model: User,
        attributes: ['id', 'username', 'email']
      }]
    });
  }

  async getTaskDistribution(departmentId, startDate, endDate, filters = {}) {
    const whereClause = {
      createdAt: {
        [Op.between]: [startDate, endDate]
      }
    };
    if (departmentId) whereClause.departmentId = departmentId;
    if (filters.status) whereClause.status = filters.status;
    if (filters.priority) whereClause.priority = filters.priority;
    if (filters.assignedTo) whereClause.assignedTo = filters.assignedTo;
    if (filters.createdBy) whereClause.createdBy = filters.createdBy;

    const tasks = await Task.findAll({
      where: whereClause,
      attributes: [
        'status',
        'priority',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status', 'priority']
    });

    return {
      byStatus: tasks.reduce((acc, task) => {
        const status = task.getDataValue('status');
        const count = parseInt(task.getDataValue('count'));
        acc[status] = (acc[status] || 0) + count;
        return acc;
      }, {}),
      byPriority: tasks.reduce((acc, task) => {
        const priority = task.getDataValue('priority');
        const count = parseInt(task.getDataValue('count'));
        acc[priority] = (acc[priority] || 0) + count;
        return acc;
      }, {})
    };
  }

  async getPerformanceTrends(departmentId, startDate, endDate, period) {
    try {
      const whereClause = {
        date: {
          [Op.between]: [startDate, endDate]
        }
      };

      if (departmentId) {
        whereClause.departmentId = departmentId;
      }

      const metrics = await TaskMetrics.findAll({
        where: whereClause,
        order: [['date', 'ASC']]
      });

      const formatDate = (date) => {
        const d = new Date(date);
        switch (period) {
          case 'daily':
            return d.toISOString().split('T')[0];
          case 'weekly':
            const week = this.getWeek(d);
            return `Week ${week}`;
          case 'monthly':
            return d.toISOString().slice(0, 7);
          default:
            return d.toISOString().split('T')[0];
        }
      };

      return metrics.map(metric => ({
        date: formatDate(metric.date),
        completionRate: metric.totalTasks > 0 ? (metric.completedTasks / metric.totalTasks) * 100 : 0,
        averageResolutionTime: metric.averageCompletionTime || 0,
        productivityScore: metric.productivityScore || 0
      }));
    } catch (error) {
      console.error('Error in getPerformanceTrends:', error);
      throw new Error('Failed to get performance trends');
    }
  }

  async getDepartmentComparison(startDate, endDate) {
    const departments = await Department.findAll({
      include: [{
        model: Task,
        where: {
          createdAt: {
            [Op.between]: [startDate, endDate]
          }
        },
        required: false
      }]
    });

    return departments.map(dept => ({
      departmentId: dept.id,
      departmentName: dept.name,
      totalTasks: dept.Tasks.length,
      completedTasks: dept.Tasks.filter(task => task.status === 'completed').length,
      averageCompletionTime: dept.Tasks.reduce((acc, task) => acc + (task.completedAt ? new Date(task.completedAt) - new Date(task.createdAt) : 0), 0) / dept.Tasks.length || 0,
      productivityScore: dept.Tasks.reduce((acc, task) => acc + (task.productivityScore || 0), 0) / dept.Tasks.length || 0
    }));
  }

  async getUserActivityMetrics(departmentId, startDate, endDate) {
    const whereClause = {
      createdAt: {
        [Op.between]: [startDate, endDate]
      }
    };

    if (departmentId) {
      whereClause.departmentId = departmentId;
    }

    const activities = await UserActivityLog.findAll({
      where: whereClause,
      include: [{
        model: User,
        attributes: ['username', 'email']
      }],
      order: [['createdAt', 'DESC']]
    });

    return activities.map(activity => ({
      userId: activity.userId,
      username: activity.User.username,
      action: activity.action,
      timestamp: activity.createdAt,
      details: activity.details
    }));
  }

  async getPriorityMetrics(departmentId, startDate, endDate, filters = {}) {
    try {
      const whereClause = {
        created_at: {
          [Op.between]: [startDate, endDate]
        }
      };
      if (departmentId) whereClause.departmentId = departmentId;
      if (filters.status) whereClause.status = filters.status;
      if (filters.priority) whereClause.priority = filters.priority;
      if (filters.assignedTo) whereClause.assignedTo = filters.assignedTo;
      if (filters.createdBy) whereClause.createdBy = filters.createdBy;

      const tasks = await Task.findAll({
        where: whereClause,
        attributes: [
          'priority',
          [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
          [sequelize.fn('AVG', sequelize.literal('TIMESTAMPDIFF(HOUR, created_at, updated_at)')), 'avgResolutionTime'],
          [sequelize.fn('SUM', sequelize.literal('CASE WHEN status = "completed" THEN 1 ELSE 0 END')), 'completed']
        ],
        group: ['priority']
      });

      return tasks.map(task => {
        const total = parseInt(task.getDataValue('total')) || 0;
        const completed = parseInt(task.getDataValue('completed')) || 0;
        return {
          priority: task.getDataValue('priority'),
          total,
          completed,
          avgResolutionTime: parseFloat(task.getDataValue('avgResolutionTime')) || 0,
          completionRate: total > 0 ? (completed / total) * 100 : 0
        };
      });
    } catch (error) {
      console.error('Error in getPriorityMetrics:', error);
      throw new Error('Failed to get priority metrics');
    }
  }

  // Helper function to get week number
  getWeek(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  // Anomaly & Trend Detection
  async detectTaskAnomalies(departmentId, startDate, endDate) {
    // Fetch metrics for the period
    const metrics = await this.getDepartmentMetrics(departmentId, startDate, endDate);
    if (!metrics || metrics.length < 2) return [];
    // Simple anomaly: sudden drop or spike in completedTasks or overdueTasks
    const anomalies = [];
    for (let i = 1; i < metrics.length; i++) {
      const prev = metrics[i - 1];
      const curr = metrics[i];
      // Detect >50% change in completedTasks or overdueTasks
      if (prev.completedTasks > 0 && Math.abs(curr.completedTasks - prev.completedTasks) / prev.completedTasks > 0.5) {
        anomalies.push({
          date: curr.date,
          type: 'completedTasks',
          message: `Significant change in completed tasks: ${prev.completedTasks} → ${curr.completedTasks}`
        });
      }
      if (prev.overdueTasks > 0 && Math.abs(curr.overdueTasks - prev.overdueTasks) / prev.overdueTasks > 0.5) {
        anomalies.push({
          date: curr.date,
          type: 'overdueTasks',
          message: `Significant change in overdue tasks: ${prev.overdueTasks} → ${curr.overdueTasks}`
        });
      }
    }
    return anomalies;
  }

  async detectUserActivityAnomalies(userId, startDate, endDate) {
    // Fetch user performance for the period
    const performance = await this.getUserPerformanceMetrics(userId, startDate, endDate);
    if (!performance || performance.length < 2) return [];
    const anomalies = [];
    for (let i = 1; i < performance.length; i++) {
      const prev = performance[i - 1];
      const curr = performance[i];
      // Detect >50% change in tasksCompleted or tasksOverdue
      if (prev.tasksCompleted > 0 && Math.abs(curr.tasksCompleted - prev.tasksCompleted) / prev.tasksCompleted > 0.5) {
        anomalies.push({
          date: curr.date,
          type: 'tasksCompleted',
          message: `Significant change in tasks completed: ${prev.tasksCompleted} → ${curr.tasksCompleted}`
        });
      }
      if (prev.tasksOverdue > 0 && Math.abs(curr.tasksOverdue - prev.tasksOverdue) / prev.tasksOverdue > 0.5) {
        anomalies.push({
          date: curr.date,
          type: 'tasksOverdue',
          message: `Significant change in overdue tasks: ${prev.tasksOverdue} → ${curr.tasksOverdue}`
        });
      }
    }
    return anomalies;
  }

  async detectDepartmentTrends(departmentId, startDate, endDate) {
    // Fetch metrics for the period
    const metrics = await this.getDepartmentMetrics(departmentId, startDate, endDate);
    if (!metrics || metrics.length < 2) return [];
    // Simple trend: check if completion rate is increasing or decreasing
    const first = metrics[0];
    const last = metrics[metrics.length - 1];
    const trend = last.completedTasks - first.completedTasks;
    let trendType = 'stable';
    if (trend > 0) trendType = 'increasing';
    else if (trend < 0) trendType = 'decreasing';
    return [{
      metric: 'completedTasks',
      trend: trendType,
      from: first.completedTasks,
      to: last.completedTasks
    }];
  }

  // Predictive Analytics & Forecasting
  async forecastTaskCompletion(departmentId, startDate, endDate) {
    // Fetch historical metrics for the period
    const metrics = await this.getDepartmentMetrics(departmentId, startDate, endDate);
    if (!metrics || metrics.length < 2) return [];
    // Simple forecast: linear projection of completedTasks
    const forecast = [];
    const lastMetric = metrics[metrics.length - 1];
    const avgChange = (lastMetric.completedTasks - metrics[0].completedTasks) / (metrics.length - 1);
    for (let i = 1; i <= 7; i++) {
      const nextDate = new Date(lastMetric.date);
      nextDate.setDate(nextDate.getDate() + i);
      forecast.push({
        date: nextDate.toISOString().split('T')[0],
        predictedCompletedTasks: Math.round(lastMetric.completedTasks + avgChange * i)
      });
    }
    return forecast;
  }

  async forecastUserProductivity(userId, startDate, endDate) {
    // Fetch historical performance for the period
    const performance = await this.getUserPerformanceMetrics(userId, startDate, endDate);
    if (!performance || performance.length < 2) return [];
    // Simple forecast: linear projection of productivityScore
    const forecast = [];
    const lastPerf = performance[performance.length - 1];
    const avgChange = (lastPerf.productivityScore - performance[0].productivityScore) / (performance.length - 1);
    for (let i = 1; i <= 7; i++) {
      const nextDate = new Date(lastPerf.date);
      nextDate.setDate(nextDate.getDate() + i);
      forecast.push({
        date: nextDate.toISOString().split('T')[0],
        predictedProductivityScore: Math.round(lastPerf.productivityScore + avgChange * i)
      });
    }
    return forecast;
  }

  async forecastDepartmentWorkload(departmentId, startDate, endDate) {
    // Fetch historical metrics for the period
    const metrics = await this.getDepartmentMetrics(departmentId, startDate, endDate);
    if (!metrics || metrics.length < 2) return [];
    // Simple forecast: linear projection of totalTasks
    const forecast = [];
    const lastMetric = metrics[metrics.length - 1];
    const avgChange = (lastMetric.totalTasks - metrics[0].totalTasks) / (metrics.length - 1);
    for (let i = 1; i <= 7; i++) {
      const nextDate = new Date(lastMetric.date);
      nextDate.setDate(nextDate.getDate() + i);
      forecast.push({
        date: nextDate.toISOString().split('T')[0],
        predictedTotalTasks: Math.round(lastMetric.totalTasks + avgChange * i)
      });
    }
    return forecast;
  }
}

module.exports = new AnalyticsService(); 