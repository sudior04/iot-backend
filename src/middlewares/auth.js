const jwtHelper = require('../utils/jwtHelper');
const userService = require('../service/userService');
const { sendError } = require('../utils/responseHandler');
const httpStatus = require('../constants/httpStatus');
const messages = require('../constants/messages');

/**
 * Authentication Middleware - Xác thực JWT token
 */
const authenticate = async (req, res, next) => {
    try {
        // Lấy token từ header
        const authHeader = req.headers.authorization;
        const token = jwtHelper.extractTokenFromHeader(authHeader);

        if (!token) {
            return sendError(res, httpStatus.UNAUTHORIZED, 'Vui lòng đăng nhập để tiếp tục');
        }

        // Verify token
        const decoded = jwtHelper.verifyAccessToken(token);

        // Lấy user từ database
        const user = await userService.getUserById(decoded.id);

        if (!user) {
            return sendError(res, httpStatus.UNAUTHORIZED, 'User không tồn tại');
        }

        if (!user.isActive) {
            return sendError(res, httpStatus.FORBIDDEN, 'Tài khoản đã bị vô hiệu hóa');
        }

        // Kiểm tra xem password có thay đổi sau khi token được issue không
        if (userService.changedPasswordAfter(user, decoded.iat)) {
            return sendError(res, httpStatus.UNAUTHORIZED, 'Password đã thay đổi. Vui lòng đăng nhập lại');
        }

        // Gắn user vào request để sử dụng ở các middleware/controller tiếp theo
        req.user = user;
        next();
    } catch (error) {
        return sendError(res, httpStatus.UNAUTHORIZED, error.message || 'Token không hợp lệ');
    }
};

/**
 * Authorization Middleware - Kiểm tra role
 * @param {Array} roles - Danh sách roles được phép truy cập
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return sendError(res, httpStatus.UNAUTHORIZED, 'Vui lòng đăng nhập');
        }

        if (!roles.includes(req.user.role)) {
            return sendError(
                res,
                httpStatus.FORBIDDEN,
                `Chỉ ${roles.join(', ')} mới có quyền truy cập`
            );
        }

        next();
    };
};

/**
 * Optional Authentication - Không bắt buộc phải có token
 * Nếu có token hợp lệ thì gắn user vào request
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = jwtHelper.extractTokenFromHeader(authHeader);

        if (token) {
            const decoded = jwtHelper.verifyAccessToken(token);
            const user = await userService.getUserById(decoded.id);

            if (user && user.isActive) {
                req.user = user;
            }
        }
    } catch (error) {
        // Không throw error, chỉ log
        console.log('Optional auth failed:', error.message);
    }

    next();
};

/**
 * Rate Limiting - Giới hạn số request
 * Simple in-memory rate limiter (nên dùng Redis trong production)
 */
const rateLimitStore = new Map();

const rateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
    return (req, res, next) => {
        const identifier = req.user ? req.user._id.toString() : req.ip;
        const now = Date.now();

        if (!rateLimitStore.has(identifier)) {
            rateLimitStore.set(identifier, { count: 1, resetTime: now + windowMs });
            return next();
        }

        const userData = rateLimitStore.get(identifier);

        // Reset nếu đã hết window
        if (now > userData.resetTime) {
            rateLimitStore.set(identifier, { count: 1, resetTime: now + windowMs });
            return next();
        }

        // Tăng count
        userData.count++;

        if (userData.count > maxRequests) {
            const timeRemaining = Math.ceil((userData.resetTime - now) / 60000);
            return sendError(
                res,
                httpStatus.TOO_MANY_REQUESTS,
                `Quá nhiều request. Vui lòng thử lại sau ${timeRemaining} phút`
            );
        }

        next();
    };
};

/**
 * Check Account Status - Kiểm tra trạng thái tài khoản
 */
const checkAccountStatus = async (req, res, next) => {
    try {
        if (!req.user) {
            return next();
        }

        // Kiểm tra account lock
        if (req.user.isLocked()) {
            const lockTimeRemaining = Math.ceil((req.user.lockUntil - Date.now()) / 60000);
            return sendError(
                res,
                httpStatus.FORBIDDEN,
                `Tài khoản đã bị khóa. Vui lòng thử lại sau ${lockTimeRemaining} phút`
            );
        }

        next();
    } catch (error) {
        return sendError(res, httpStatus.INTERNAL_SERVER_ERROR, error.message);
    }
};

module.exports = {
    authenticate,
    authorize,
    optionalAuth,
    rateLimit,
    checkAccountStatus
};
