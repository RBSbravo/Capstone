const IDGenerator = require('../utils/idGenerator');

module.exports = (sequelize, DataTypes) => {
  const TaskMetrics = sequelize.define('TaskMetrics', {
    id: {
      type: DataTypes.STRING(20),
      primaryKey: true,
      allowNull: true,
      validate: {
        is: /^ANL-[0-9]{8}-[0-9]{5}$/ // ANL-YYYYMMDD-XXXXX format
      }
    },
    departmentId: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'department_id',
      references: {
        model: 'departments',
        key: 'id'
      }
    },
    totalTasks: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'total_tasks'
    },
    completedTasks: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'completed_tasks'
    },
    pendingTasks: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'pending_tasks'
    },
    overdueTasks: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'overdue_tasks'
    },
    averageCompletionTime: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      field: 'average_completion_time'
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    }
  }, {
    tableName: 'task_metrics',
    timestamps: true,
    underscored: true,
    hooks: {
      beforeCreate: async (taskMetrics) => {
        if (!taskMetrics.id) {
          // Get IDSequences model from sequelize
          const IDSequences = sequelize.models.IDSequences;
          const idGenerator = new IDGenerator(sequelize, IDSequences);
          taskMetrics.id = await idGenerator.generateID('ANL');
        }
      }
    }
  });

  const UserPerformance = sequelize.define('UserPerformance', {
    id: {
      type: DataTypes.STRING(20),
      primaryKey: true,
      allowNull: true,
      validate: {
        is: /^ANL-[0-9]{8}-[0-9]{5}$/ // ANL-YYYYMMDD-XXXXX format
      }
    },
    userId: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    tasksCompleted: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'tasks_completed'
    },
    tasksOverdue: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'tasks_overdue'
    },
    averageResponseTime: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      field: 'average_response_time'
    },
    productivityScore: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      field: 'productivity_score'
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    }
  }, {
    tableName: 'user_performance',
    timestamps: true,
    underscored: true,
    hooks: {
      beforeCreate: async (userPerformance) => {
        if (!userPerformance.id) {
          // Get IDSequences model from sequelize
          const IDSequences = sequelize.models.IDSequences;
          const idGenerator = new IDGenerator(sequelize, IDSequences);
          userPerformance.id = await idGenerator.generateID('ANL');
        }
      }
    }
  });

  const DepartmentAnalytics = sequelize.define('DepartmentAnalytics', {
    id: {
      type: DataTypes.STRING(20),
      primaryKey: true,
      allowNull: true,
      validate: {
        is: /^ANL-[0-9]{8}-[0-9]{5}$/ // ANL-YYYYMMDD-XXXXX format
      }
    },
    departmentId: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'department_id',
      references: {
        model: 'departments',
        key: 'id'
      }
    },
    totalEmployees: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'total_employees'
    },
    activeEmployees: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'active_employees'
    },
    departmentEfficiency: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      field: 'department_efficiency'
    },
    averageTaskCompletionTime: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      field: 'average_task_completion_time'
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    }
  }, {
    tableName: 'department_analytics',
    timestamps: true,
    underscored: true,
    hooks: {
      beforeCreate: async (departmentAnalytics) => {
        if (!departmentAnalytics.id) {
          // Get IDSequences model from sequelize
          const IDSequences = sequelize.models.IDSequences;
          const idGenerator = new IDGenerator(sequelize, IDSequences);
          departmentAnalytics.id = await idGenerator.generateID('ANL');
        }
      }
    }
  });

  const TaskTrends = sequelize.define('TaskTrends', {
    id: {
      type: DataTypes.STRING(20),
      primaryKey: true,
      allowNull: true,
      validate: {
        is: /^ANL-[0-9]{8}-[0-9]{5}$/ // ANL-YYYYMMDD-XXXXX format
      }
    },
    departmentId: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'department_id',
      references: {
        model: 'departments',
        key: 'id'
      }
    },
    period: {
      type: DataTypes.ENUM('daily', 'weekly', 'monthly'),
      allowNull: false
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'start_date'
    },
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'end_date'
    },
    completionRate: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      field: 'completion_rate'
    },
    averageResolutionTime: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      field: 'average_resolution_time'
    },
    priorityDistribution: {
      type: DataTypes.JSON,
      defaultValue: {
        high: 0,
        medium: 0,
        low: 0
      },
      field: 'priority_distribution'
    },
    statusDistribution: {
      type: DataTypes.JSON,
      defaultValue: {
        pending: 0,
        in_progress: 0,
        completed: 0
      },
      field: 'status_distribution'
    }
  }, {
    tableName: 'task_trends',
    timestamps: true,
    underscored: true,
    hooks: {
      beforeCreate: async (taskTrends) => {
        if (!taskTrends.id) {
          // Get IDSequences model from sequelize
          const IDSequences = sequelize.models.IDSequences;
          const idGenerator = new IDGenerator(sequelize, IDSequences);
          taskTrends.id = await idGenerator.generateID('ANL');
        }
      }
    }
  });

  const UserActivityLog = sequelize.define('UserActivityLog', {
    id: {
      type: DataTypes.STRING(20),
      primaryKey: true,
      allowNull: true,
      validate: {
        is: /^ANL-[0-9]{8}-[0-9]{5}$/ // ANL-YYYYMMDD-XXXXX format
      }
    },
    userId: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    action: {
      type: DataTypes.ENUM('login', 'task_create', 'task_update', 'task_complete', 'comment_add'),
      allowNull: false
    },
    entityType: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'entity_type'
    },
    entityId: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'entity_id'
    },
    details: {
      type: DataTypes.JSON,
      allowNull: true
    },
    timestamp: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'user_activity_logs',
    timestamps: true,
    underscored: true,
    hooks: {
      beforeCreate: async (userActivityLog) => {
        if (!userActivityLog.id) {
          // Get IDSequences model from sequelize
          const IDSequences = sequelize.models.IDSequences;
          const idGenerator = new IDGenerator(sequelize, IDSequences);
          userActivityLog.id = await idGenerator.generateID('ANL');
        }
      }
    }
  });

  const CustomReport = sequelize.define('CustomReport', {
    id: {
      type: DataTypes.STRING(20),
      primaryKey: true,
      allowNull: true,
      validate: {
        is: /^RPT-[0-9]{8}-[0-9]{5}$/ // RPT-YYYYMMDD-XXXXX format
      }
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    createdBy: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'created_by',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    type: {
      type: DataTypes.ENUM('task', 'user', 'department', 'custom'),
      allowNull: false
    },
    parameters: {
      type: DataTypes.JSON,
      allowNull: false
    },
    schedule: {
      type: DataTypes.JSON,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    }
  }, {
    tableName: 'custom_reports',
    timestamps: true,
    underscored: true,
    hooks: {
      beforeCreate: async (customReport) => {
        if (!customReport.id) {
          // Get IDSequences model from sequelize
          const IDSequences = sequelize.models.IDSequences;
          const idGenerator = new IDGenerator(sequelize, IDSequences);
          customReport.id = await idGenerator.generateID('RPT');
        }
      }
    }
  });

  return {
    TaskMetrics,
    UserPerformance,
    DepartmentAnalytics,
    TaskTrends,
    UserActivityLog,
    CustomReport
  };
}; 