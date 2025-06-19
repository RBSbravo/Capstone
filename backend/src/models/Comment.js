const { Model } = require('sequelize');
const IDGenerator = require('../utils/idGenerator');

module.exports = (sequelize, DataTypes) => {
  class Comment extends Model {
    static associate(models) {
      Comment.belongsTo(models.User, {
        foreignKey: 'author_id',
        as: 'author'
      });
      Comment.belongsTo(models.Task, {
        foreignKey: 'task_id'
      });
    }
  }

  Comment.init({
    id: {
      type: DataTypes.STRING(20),
      primaryKey: true,
      allowNull: true,
      validate: {
        is: /^CMT-[0-9]{8}-[0-9]{5}$/ // CMT-YYYYMMDD-XXXXX format
      }
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    taskId: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'task_id',
      references: {
        model: 'tasks',
        key: 'id'
      }
    },
    authorId: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'author_id',
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    sequelize,
    modelName: 'Comment',
    tableName: 'comments',
    timestamps: true,
    underscored: true,
    hooks: {
      beforeCreate: async (comment) => {
        if (!comment.id) {
          // Get IDSequences model from sequelize
          const IDSequences = sequelize.models.IDSequences;
          const idGenerator = new IDGenerator(sequelize, IDSequences);
          comment.id = await idGenerator.generateID('CMT');
        }
      }
    }
  });

  return Comment;
}; 