const express = require('express');
const router = express.Router();
const userController = require('../controller/userController');

/**
 * User Routes
 */

// GET /api/users/count - Đếm số lượng users (phải đặt trước /:id)
router.get('/count', (req, res) => userController.countUsers(req, res));

// POST /api/users/login - Login
router.post('/login', (req, res) => userController.login(req, res));

// POST /api/users - Tạo user mới
router.post('/', (req, res) => userController.createUser(req, res));

// GET /api/users - Lấy tất cả users (có phân trang)
router.get('/', (req, res) => userController.getAllUsers(req, res));

// GET /api/users/:id - Lấy user theo ID
router.get('/:id', (req, res) => userController.getUserById(req, res));

// PUT /api/users/:id - Cập nhật user
router.put('/:id', (req, res) => userController.updateUser(req, res));

// PUT /api/users/:id/password - Cập nhật password
router.put('/:id/password', (req, res) => userController.updatePassword(req, res));

// DELETE /api/users/:id - Xóa user (soft delete)
router.delete('/:id', (req, res) => userController.deleteUser(req, res));

// DELETE /api/users/:id/permanent - Xóa user vĩnh viễn
router.delete('/:id/permanent', (req, res) => userController.permanentDeleteUser(req, res));

module.exports = router;
