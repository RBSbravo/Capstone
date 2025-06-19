const { Sequelize } = require('sequelize');
const testConfig = require('../config/test.config');

const sequelize = new Sequelize(
  testConfig.database.database,
  testConfig.database.username,
  testConfig.database.password,
  {
    host: testConfig.database.host,
    dialect: testConfig.database.dialect,
    logging: false,
    define: {
      timestamps: true,
      underscored: true
    }
  }
);

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Import models
db.User = require('./User')(sequelize, Sequelize);
db.Department = require('./Department')(sequelize, Sequelize);
db.Task = require('./Task')(sequelize, Sequelize);
db.Ticket = require('./Ticket')(sequelize, Sequelize);
db.Comment = require('./Comment')(sequelize, Sequelize);
db.Notification = require('./Notification')(sequelize, Sequelize);
db.FileAttachment = require('./FileAttachment')(sequelize, Sequelize);
db.UserSession = require('./UserSession')(sequelize, Sequelize);
db.IDSequences = require('./IDSequences')(sequelize, Sequelize);

// Import analytics models using the same sequelize instance
const analyticsModels = require('./analytics')(sequelize, Sequelize);
db.TaskMetrics = analyticsModels.TaskMetrics;
db.UserPerformance = analyticsModels.UserPerformance;
db.DepartmentAnalytics = analyticsModels.DepartmentAnalytics;
db.TaskTrends = analyticsModels.TaskTrends;
db.UserActivityLog = analyticsModels.UserActivityLog;
db.CustomReport = analyticsModels.CustomReport;

// Call associate for all models if defined
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

// Define associations
db.Department.hasMany(db.User, { foreignKey: 'department_id' });
db.User.belongsTo(db.Department, { foreignKey: 'department_id' });

db.Department.hasMany(db.Task, { foreignKey: 'department_id' });
db.Task.belongsTo(db.Department, { foreignKey: 'department_id' });

db.User.hasMany(db.Task, { foreignKey: 'created_by', as: 'createdTasks' });
db.Task.belongsTo(db.User, { foreignKey: 'created_by', as: 'taskCreator' });

db.User.hasMany(db.Task, { foreignKey: 'assigned_to_id', as: 'assignedTasks' });
db.Task.belongsTo(db.User, { foreignKey: 'assigned_to_id', as: 'taskAssignee' });

// Ticket associations
db.Department.hasMany(db.Ticket, { foreignKey: 'department_id' });
db.Ticket.belongsTo(db.Department, { foreignKey: 'department_id' });

db.User.hasMany(db.Ticket, { foreignKey: 'created_by', as: 'createdTickets' });
db.Ticket.belongsTo(db.User, { foreignKey: 'created_by', as: 'ticketCreator' });

db.User.hasMany(db.Ticket, { foreignKey: 'assigned_to', as: 'assignedTickets' });
db.Ticket.belongsTo(db.User, { foreignKey: 'assigned_to', as: 'ticketAssignee' });

// File Attachment associations
db.Ticket.hasMany(db.FileAttachment, { foreignKey: 'ticket_id' });
db.Task.hasMany(db.FileAttachment, { foreignKey: 'task_id' });
db.Comment.hasMany(db.FileAttachment, { foreignKey: 'comment_id' });
db.User.hasMany(db.FileAttachment, { foreignKey: 'uploaded_by', as: 'uploadedFiles' });

// Analytics associations
db.Department.hasMany(db.TaskMetrics, { foreignKey: 'department_id' });
db.TaskMetrics.belongsTo(db.Department, { foreignKey: 'department_id' });

db.User.hasMany(db.UserPerformance, { foreignKey: 'user_id' });
db.UserPerformance.belongsTo(db.User, { foreignKey: 'user_id' });

db.Department.hasMany(db.DepartmentAnalytics, { foreignKey: 'department_id' });
db.DepartmentAnalytics.belongsTo(db.Department, { foreignKey: 'department_id' });

// New analytics associations
db.Department.hasMany(db.TaskTrends, { foreignKey: 'department_id' });
db.TaskTrends.belongsTo(db.Department, { foreignKey: 'department_id' });

db.User.hasMany(db.UserActivityLog, { foreignKey: 'user_id' });
db.UserActivityLog.belongsTo(db.User, { foreignKey: 'user_id' });

db.User.hasMany(db.CustomReport, { foreignKey: 'created_by', as: 'createdReports' });
db.CustomReport.belongsTo(db.User, { foreignKey: 'created_by', as: 'reportCreator' });

// Session associations
db.User.hasMany(db.UserSession, { foreignKey: 'user_id', as: 'sessions' });
db.UserSession.belongsTo(db.User, { foreignKey: 'user_id', as: 'sessionUser' });

// Sync models with database
const syncModels = async () => {
  try {
    // Disable foreign key checks temporarily
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');
    
    // Drop all tables in the correct order
    await sequelize.query('DROP TABLE IF EXISTS file_attachments;');
    await sequelize.query('DROP TABLE IF EXISTS user_sessions;');
    await sequelize.query('DROP TABLE IF EXISTS comments;');
    await sequelize.query('DROP TABLE IF EXISTS notifications;');
    await sequelize.query('DROP TABLE IF EXISTS department_analytics;');
    await sequelize.query('DROP TABLE IF EXISTS user_performance;');
    await sequelize.query('DROP TABLE IF EXISTS task_metrics;');
    await sequelize.query('DROP TABLE IF EXISTS task_trends;');
    await sequelize.query('DROP TABLE IF EXISTS user_activity_logs;');
    await sequelize.query('DROP TABLE IF EXISTS custom_reports;');
    await sequelize.query('DROP TABLE IF EXISTS tasks;');
    await sequelize.query('DROP TABLE IF EXISTS tickets;');
    await sequelize.query('DROP TABLE IF EXISTS users;');
    await sequelize.query('DROP TABLE IF EXISTS departments;');
    await sequelize.query('DROP TABLE IF EXISTS id_sequences;');
    
    // Create IDSequences table first
    await db.IDSequences.sync({ force: true });
    
    // Sync all other models
    await sequelize.sync({ force: true });
    
    // Re-enable foreign key checks
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');
  } catch (error) {
    console.error('Error syncing models:', error);
    throw error;
  }
};

module.exports = {
  ...db,
  sequelize,
  syncModels
}; 