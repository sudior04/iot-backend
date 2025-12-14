const userService = require('../service/userService');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const HTTP_STATUS = require('../constants/httpStatus');

/**
 * User Controller
 */
class UserController {
    /**
     * Tạo user mới
     * POST /api/users
     */
    async createUser(req, res) {
        try {
            const userData = req.body;
            const user = await userService.createUser(userData);
            return successResponse(res, user, 'User đã được tạo thành công', HTTP_STATUS.CREATED);
        } catch (error) {
            return errorResponse(res, error, HTTP_STATUS.BAD_REQUEST);
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
     * Login (verify credentials)
     * POST /api/users/login
     */
    async login(req, res) {
        try {
            const { identifier, password } = req.body;

            if (!identifier || !password) {
                return errorResponse(res, 'Email/Username và password là bắt buộc', HTTP_STATUS.BAD_REQUEST);
            }

            const user = await userService.verifyCredentials(identifier, password);

            // TODO: Tạo JWT token trong production
            return successResponse(res, { user }, 'Đăng nhập thành công');
        } catch (error) {
            return errorResponse(res, error, HTTP_STATUS.UNAUTHORIZED);
        }
    }
}

module.exports = new UserController();
