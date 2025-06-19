const { Department, User } = require('../models');

// Create a new department
const createDepartment = async (req, res) => {
  try {
    const { name, description } = req.body;
    const department = await Department.create({ name, description });
    res.status(201).json(department);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all departments
const getAllDepartments = async (req, res) => {
  try {
    const departments = await Department.findAll({
      include: [{
        model: User,
        attributes: ['id', 'username', 'email', 'role']
      }]
    });
    res.json(departments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get department by ID
const getDepartmentById = async (req, res) => {
  try {
    const department = await Department.findByPk(req.params.id, {
      include: [{
        model: User,
        attributes: ['id', 'username', 'email', 'role']
      }]
    });

    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }

    res.json(department);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update department
const updateDepartment = async (req, res) => {
  try {
    const { name, description } = req.body;
    const department = await Department.findByPk(req.params.id);

    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }

    await department.update({ name, description });
    res.json(department);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete department
const deleteDepartment = async (req, res) => {
  try {
    const department = await Department.findByPk(req.params.id);

    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }

    // Check if department has users
    const userCount = await User.count({ where: { departmentId: req.params.id } });
    if (userCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete department with assigned users' 
      });
    }

    await department.destroy();
    res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createDepartment,
  getAllDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment
}; 