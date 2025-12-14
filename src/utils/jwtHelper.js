const jwt = require('jsonwebtoken');
const config = require('../config/config');

/**
 * JWT Helper - Xử lý tạo và verify JWT tokens
 */
class JWTHelper {
    /**
     * Tạo access token
     */
    generateAccessToken(user) {
        const payload = {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role
        };

        return jwt.sign(
            payload,
            process.env.JWT_SECRET || 'your-secret-key-change-in-production',
            {
                expiresIn: process.env.JWT_EXPIRES_IN || '15m' // 15 phút
            }
        );
    }

    /**
     * Tạo refresh token
     */
    generateRefreshToken(user) {
        const payload = {
            id: user._id,
            username: user.username
        };

        return jwt.sign(
            payload,
            process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production',
            {
                expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' // 7 ngày
            }
        );
    }

    /**
     * Verify access token
     */
    verifyAccessToken(token) {
        try {
            return jwt.verify(
                token,
                process.env.JWT_SECRET || 'your-secret-key-change-in-production'
            );
        } catch (error) {
            throw new Error('Token không hợp lệ hoặc đã hết hạn');
        }
    }

    /**
     * Verify refresh token
     */
    verifyRefreshToken(token) {
        try {
            return jwt.verify(
                token,
                process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production'
            );
        } catch (error) {
            throw new Error('Refresh token không hợp lệ hoặc đã hết hạn');
        }
    }

    /**
     * Decode token không verify (để xem payload)
     */
    decodeToken(token) {
        return jwt.decode(token);
    }

    /**
     * Lấy token từ header
     */
    extractTokenFromHeader(authHeader) {
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return null;
        }
        return authHeader.substring(7);
    }
}

module.exports = new JWTHelper();
