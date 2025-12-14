const userService = require('../service/userService');
const jwtHelper = require('../utils/jwtHelper');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const HTTP_STATUS = require('../constants/httpStatus');
const logger = require('../utils/logger');

/**
 * User Controller - Xử lý HTTP requests liên quan đến user
 */
class UserController {
    /**
     * Đăng ký user mới
     * POST /api/users/register
     */
    async register(req, res) {
        try {
            const userData = req.body;
            const user = await userService.createUser(userData);

            // Tạo tokens
            const accessToken = jwtHelper.generateAccessToken(user);
            const refreshToken = jwtHelper.generateRefreshToken(user);

            // Lưu refresh token
            await userService.updateRefreshToken(user._id, refreshToken);

            return successResponse(res, {
                user,
                accessToken,
                refreshToken
            }, 'Đăng ký thành công', HTTP_STATUS.CREATED);
        } catch (error) {
            logger.error('Error in register:', error);
            return errorResponse(res, error.message, HTTP_STATUS.BAD_REQUEST);
        }
    }

    /**
     * Tạo user mới (Admin function)
     * POST /api/users
     */
    async createUser(req, res) {
        try {
            const userData = req.body;
            const user = await userService.createUser(userData);
            return successResponse(res, user, 'User đã được tạo thành công', HTTP_STATUS.CREATED);
        } catch (error) {
            logger.error('Error in createUser:', error);
            return errorResponse(res, error.message, HTTP_STATUS.BAD_REQUEST);
        }
    }

    /**
     * Lấy tất cả users
     * GET /api/users?page=1&limit=20&role=user&isActive=true&search=keyword
     */
    async getAllUsers(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const filters = {
                role: req.query.role,
                isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
                search: req.query.search
            };

            const result = await userService.getAllUsers(page, limit, filters);
            return successResponse(res, result, 'Lấy danh sách users thành công');
        } catch (error) {
            return errorResponse(res, error, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Lấy user theo ID
     * GET /api/users/:id
     */
    async getUserById(req, res) {
        try {
            const { id } = req.params;
            const user = await userService.getUserById(id);

            if (!user) {
                return errorResponse(res, 'User không tồn tại', HTTP_STATUS.NOT_FOUND);
            }

            return successResponse(res, user, 'Lấy thông tin user thành công');
        } catch (error) {
            return errorResponse(res, error, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Cập nhật user
     * PUT /api/users/:id
     */
    async updateUser(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;

            const user = await userService.updateUser(id, updateData);
            return successResponse(res, user, 'Cập nhật user thành công');
        } catch (error) {
            return errorResponse(res, error, HTTP_STATUS.BAD_REQUEST);
        }
    }

    /**
     * Cập nhật password
     * PUT /api/users/:id/password
     */
    async updatePassword(req, res) {
        try {
            const { id } = req.params;
            const { currentPassword, newPassword } = req.body;

            if (!currentPassword || !newPassword) {
                return errorResponse(res, 'currentPassword và newPassword là bắt buộc', HTTP_STATUS.BAD_REQUEST);
            }

            const user = await userService.updatePassword(id, currentPassword, newPassword);
            return successResponse(res, user, 'Cập nhật password thành công');
        } catch (error) {
            return errorResponse(res, error, HTTP_STATUS.BAD_REQUEST);
        }
    }

    /**
     * Xóa user (soft delete)
     * DELETE /api/users/:id
     */
    async deleteUser(req, res) {
        try {
            const { id } = req.params;
            const user = await userService.softDeleteUser(id);
            return successResponse(res, user, 'Xóa user thành công');
        } catch (error) {
            return errorResponse(res, error, HTTP_STATUS.BAD_REQUEST);
        }
    }

    /**
     * Xóa user vĩnh viễn (hard delete)
     * DELETE /api/users/:id/permanent
     */
    async permanentDeleteUser(req, res) {
        try {
            const { id } = req.params;
            const user = await userService.hardDeleteUser(id);
            return successResponse(res, user, 'Xóa vĩnh viễn user thành công');
        } catch (error) {
            return errorResponse(res, error, HTTP_STATUS.BAD_REQUEST);
        }
    }

    /**
     * Đếm số lượng users
     * GET /api/users/count
     */
    async countUsers(req, res) {
        try {
            const filters = {
                role: req.query.role,
                isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined
            };

            const count = await userService.countUsers(filters);
            return successResponse(res, { count }, 'Đếm users thành công');
        } catch (error) {
            return errorResponse(res, error, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Login
     * POST /api/users/login
     */
    async login(req, res) {
        try {
            const { identifier, password } = req.body;

            if (!identifier || !password) {
                return errorResponse(res, 'Email/Username và password là bắt buộc', HTTP_STATUS.BAD_REQUEST);
            }

            const user = await userService.verifyCredentials(identifier, password);

            // Tạo tokens
            const accessToken = jwtHelper.generateAccessToken(user);
            const refreshToken = jwtHelper.generateRefreshToken(user);

            // Lưu refresh token
            await userService.updateRefreshToken(user._id, refreshToken);

            return successResponse(res, {
                user,
                accessToken,
                refreshToken
            }, 'Đăng nhập thành công');
        } catch (error) {
            logger.error('Error in login:', error);
            return errorResponse(res, error.message, HTTP_STATUS.UNAUTHORIZED);
        }
    }

    /**
     * Logout
     * POST /api/users/logout
     */
    async logout(req, res) {
        try {
            const userId = req.user._id; // Từ authenticate middleware

            await userService.clearRefreshToken(userId);

            return successResponse(res, null, 'Đăng xuất thành công');
        } catch (error) {
            logger.error('Error in logout:', error);
            return errorResponse(res, error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Refresh token
     * POST /api/users/refresh-token
     * Body: { refreshToken }
     */
    async refreshToken(req, res) {
        try {
            const { refreshToken } = req.body;

            if (!refreshToken) {
                return errorResponse(res, 'Refresh token là bắt buộc', HTTP_STATUS.BAD_REQUEST);
            }

            // Verify refresh token
            const decoded = jwtHelper.verifyRefreshToken(refreshToken);

            // Lấy user
            const user = await userService.getUserById(decoded.id);
            if (!user) {
                return errorResponse(res, 'User không tồn tại', HTTP_STATUS.NOT_FOUND);
            }

            // Kiểm tra refresh token có khớp không
            if (user.refreshToken !== refreshToken) {
                return errorResponse(res, 'Refresh token không hợp lệ', HTTP_STATUS.UNAUTHORIZED);
            }

            // Tạo access token mới
            const newAccessToken = jwtHelper.generateAccessToken(user);

            return successResponse(res, {
                accessToken: newAccessToken
            }, 'Refresh token thành công');
        } catch (error) {
            logger.error('Error in refreshToken:', error);
            return errorResponse(res, error.message, HTTP_STATUS.UNAUTHORIZED);
        }
    }

    /**
     * Yêu cầu reset password
     * POST /api/users/forgot-password
     * Body: { email }
     */
    async forgotPassword(req, res) {
        try {
            const { email } = req.body;

            if (!email) {
                return errorResponse(res, 'Email là bắt buộc', HTTP_STATUS.BAD_REQUEST);
            }

            const { resetToken } = await userService.createPasswordResetToken(email);

            // TODO: Gửi email với resetToken
            // Trong development, trả về token (KHÔNG LÀM NHƯ VẬY TRONG PRODUCTION!)
            return successResponse(res, {
                message: 'Reset token đã được tạo. Kiểm tra email của bạn.',
                resetToken // Remove this in production
            }, 'Yêu cầu reset password thành công');
        } catch (error) {
            logger.error('Error in forgotPassword:', error);
            return errorResponse(res, error.message, HTTP_STATUS.BAD_REQUEST);
        }
    }

    /**
     * Reset password với token
     * POST /api/users/reset-password
     * Body: { token, newPassword }
     */
    async resetPassword(req, res) {
        try {
            const { token, newPassword } = req.body;

            if (!token || !newPassword) {
                return errorResponse(res, 'Token và newPassword là bắt buộc', HTTP_STATUS.BAD_REQUEST);
            }

            await userService.resetPasswordWithToken(token, newPassword);

            return successResponse(res, null, 'Reset password thành công');
        } catch (error) {
            logger.error('Error in resetPassword:', error);
            return errorResponse(res, error.message, HTTP_STATUS.BAD_REQUEST);
        }
    }

    /**
     * Thay đổi password (cần đăng nhập)
     * PUT /api/users/change-password
     * Body: { currentPassword, newPassword }
     */
    async changePassword(req, res) {
        try {
            const userId = req.user._id; // Từ authenticate middleware
            const { currentPassword, newPassword } = req.body;

            if (!currentPassword || !newPassword) {
                return errorResponse(res, 'currentPassword và newPassword là bắt buộc', HTTP_STATUS.BAD_REQUEST);
            }

            await userService.updatePassword(userId, currentPassword, newPassword);

            return successResponse(res, null, 'Đổi password thành công');
        } catch (error) {
            logger.error('Error in changePassword:', error);
            return errorResponse(res, error.message, HTTP_STATUS.BAD_REQUEST);
        }
    }

    /**
     * Lấy profile của user hiện tại
     * GET /api/users/profile
     */
    async getProfile(req, res) {
        try {
            const userId = req.user._id; // Từ authenticate middleware
            const user = await userService.getUserById(userId);

            if (!user) {
                return errorResponse(res, 'User không tồn tại', HTTP_STATUS.NOT_FOUND);
            }

            return successResponse(res, user, 'Lấy profile thành công');
        } catch (error) {
            logger.error('Error in getProfile:', error);
            return errorResponse(res, error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Cập nhật profile của user hiện tại
     * PUT /api/users/profile
     */
    async updateProfile(req, res) {
        try {
            const userId = req.user._id; // Từ authenticate middleware
            const updateData = req.body;

            // Không cho phép thay đổi role qua endpoint này
            delete updateData.role;
            delete updateData.isActive;

            const user = await userService.updateUser(userId, updateData);

            return successResponse(res, user, 'Cập nhật profile thành công');
        } catch (error) {
            logger.error('Error in updateProfile:', error);
            return errorResponse(res, error.message, HTTP_STATUS.BAD_REQUEST);
        }
    }

    /**
     * Lấy thống kê users (Admin)
     * GET /api/users/stats
     */
    async getUserStats(req, res) {
        try {
            const stats = await userService.getUserStats();
            return successResponse(res, stats, 'Lấy thống kê users thành công');
        } catch (error) {
            logger.error('Error in getUserStats:', error);
            return errorResponse(res, error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Unlock account (Admin)
     * POST /api/users/:id/unlock
     */
    async unlockAccount(req, res) {
        try {
            const { id } = req.params;
            const user = await userService.unlockAccount(id);

            return successResponse(res, user, 'Mở khóa tài khoản thành công');
        } catch (error) {
            logger.error('Error in unlockAccount:', error);
            return errorResponse(res, error.message, HTTP_STATUS.BAD_REQUEST);
        }
    }

    /**
     * Thay đổi role user (Admin)
     * PUT /api/users/:id/role
     * Body: { role }
     */
    async changeRole(req, res) {
        try {
            const { id } = req.params;
            const { role } = req.body;

            if (!role) {
                return errorResponse(res, 'Role là bắt buộc', HTTP_STATUS.BAD_REQUEST);
            }

            const user = await userService.changeUserRole(id, role);

            return successResponse(res, user, 'Thay đổi role thành công');
        } catch (error) {
            logger.error('Error in changeRole:', error);
            return errorResponse(res, error.message, HTTP_STATUS.BAD_REQUEST);
        }
    }
}

module.exports = new UserController();
