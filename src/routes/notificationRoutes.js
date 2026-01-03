const express = require('express');
const router = express.Router();
const notificationController = require('../controller/notificationController');

/**
 * Notification Routes
 */

// GET /api/notifications/:deviceId - Lấy notifications theo device
router.get('/:deviceId', (req, res) => notificationController.getNotifications(req, res));

// GET /api/notifications/:deviceId/unread-count - Lấy số lượng chưa đọc
router.get('/:deviceId/unread-count', (req, res) => notificationController.getUnreadCount(req, res));

// GET /api/notifications/:deviceId/stats - Lấy thống kê notifications
router.get('/:deviceId/stats', (req, res) => notificationController.getStats(req, res));

// GET /api/notifications/:deviceId/settings - Lấy cài đặt thông báo
router.get('/:deviceId/settings', (req, res) => notificationController.getSettings(req, res));

// POST /api/notifications/:deviceId - Tạo notification mới (manual)
router.post('/:deviceId', (req, res) => notificationController.createNotification(req, res));

// PUT /api/notifications/:deviceId/settings - Cập nhật cài đặt thông báo
router.put('/:deviceId/settings', (req, res) => notificationController.updateSettings(req, res));

// PUT /api/notifications/:deviceId/toggle - Bật/tắt thông báo
router.put('/:deviceId/toggle', (req, res) => notificationController.toggleNotifications(req, res));

// PUT /api/notifications/:deviceId/read-all - Đánh dấu tất cả đã đọc
router.put('/:deviceId/read-all', (req, res) => notificationController.markAllAsRead(req, res));

// PUT /api/notifications/:notificationId/read - Đánh dấu notification đã đọc
router.put('/:notificationId/read', (req, res) => notificationController.markAsRead(req, res));

// DELETE /api/notifications/:notificationId - Xóa notification
router.delete('/:notificationId', (req, res) => notificationController.deleteNotification(req, res));

// DELETE /api/notifications/:deviceId/old - Xóa notifications cũ
router.delete('/:deviceId/old', (req, res) => notificationController.deleteOldNotifications(req, res));

module.exports = router;
