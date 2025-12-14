const User = require('../models/User');
const logger = require('../utils/logger');
const crypto = require('crypto');

/**
 * User Service - Xử lý logic nghiệp vụ liên quan đến user
 */
class UserService {
    /**
     * Tạo user mới với password đã hash
     */
    async createUser(userData) {
        try {
            const { username, email, password, fullName, role } = userData;

            // Validate password strength
            this.validatePasswordStrength(password);

            // Kiểm tra user đã tồn tại
            const existingUser = await User.findByEmailOrUsername(email);
            if (existingUser) {
                throw new Error('Email hoặc username đã tồn tại');
            }

            // Password sẽ tự động được hash bởi pre-save hook trong model
            const user = await User.create({
                username,
                email,
                password,
                fullName,
                role: role || 'user'
            });

            logger.info(`User created: ${user.username}`);
            return user;
        } catch (error) {
            logger.error('Error in createUser:', error);
            throw error;
        }
    }

    /**
     * Lấy user theo ID
     */
    async getUserById(userId) {
        try {
            const user = await User.findById(userId);
            return user;
        } catch (error) {
            logger.error('Error in getUserById:', error);
            throw error;
        }
    }

    /**
     * Lấy user theo email
     */
    async getUserByEmail(email) {
        try {
            const user = await User.findOne({ email: email.toLowerCase() });
            return user;
        } catch (error) {
            logger.error('Error in getUserByEmail:', error);
            throw error;
        }
    }

    /**
     * Lấy user theo username
     */
    async getUserByUsername(username) {
        try {
            const user = await User.findOne({ username });
            return user;
        } catch (error) {
            logger.error('Error in getUserByUsername:', error);
            throw error;
        }
    }

    /**
     * Lấy user theo email hoặc username
     */
    async getUserByEmailOrUsername(identifier) {
        try {
            const user = await User.findByEmailOrUsername(identifier);
            return user;
        } catch (error) {
            logger.error('Error in getUserByEmailOrUsername:', error);
            throw error;
        }
    }

    /**
     * Lấy tất cả users (có phân trang)
     */
    async getAllUsers(page = 1, limit = 20, filters = {}) {
        try {
            const skip = (page - 1) * limit;

            const query = {};
            if (filters.role) query.role = filters.role;
            if (filters.isActive !== undefined) query.isActive = filters.isActive;
            if (filters.search) {
                query.$or = [
                    { username: { $regex: filters.search, $options: 'i' } },
                    { email: { $regex: filters.search, $options: 'i' } },
                    { fullName: { $regex: filters.search, $options: 'i' } }
                ];
            }

            const users = await User.find(query)
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 });

            const total = await User.countDocuments(query);

            return {
                users,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            logger.error('Error in getAllUsers:', error);
            throw error;
        }
    }

    /**
     * Cập nhật thông tin user
     */
    async updateUser(userId, updateData) {
        try {
            const { username, email, fullName, role, isActive } = updateData;

            // Kiểm tra email/username trùng với user khác
            if (email || username) {
                const existingUser = await User.findOne({
                    _id: { $ne: userId },
                    $or: [
                        ...(email ? [{ email: email.toLowerCase() }] : []),
                        ...(username ? [{ username }] : [])
                    ]
                });

                if (existingUser) {
                    throw new Error('Email hoặc username đã được sử dụng bởi user khác');
                }
            }

            const user = await User.findByIdAndUpdate(
                userId,
                {
                    ...(username && { username }),
                    ...(email && { email: email.toLowerCase() }),
                    ...(fullName !== undefined && { fullName }),
                    ...(role && { role }),
                    ...(isActive !== undefined && { isActive })
                },
                { new: true, runValidators: true }
            );

            if (!user) {
                throw new Error('User không tồn tại');
            }

            logger.info(`User updated: ${user.username}`);
            return user;
        } catch (error) {
            logger.error('Error in updateUser:', error);
            throw error;
        }
    }

    /**
     * Cập nhật password với validation
     */
    async updatePassword(userId, currentPassword, newPassword) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User không tồn tại');
            }

            // Kiểm tra password hiện tại
            const isMatch = await user.comparePassword(currentPassword);
            if (!isMatch) {
                throw new Error('Password hiện tại không đúng');
            }

            // Validate password strength
            this.validatePasswordStrength(newPassword);

            // Password sẽ tự động được hash bởi pre-save hook
            user.password = newPassword;
            await user.save();

            logger.info(`Password updated for user: ${user.username}`);
            return user;
        } catch (error) {
            logger.error('Error in updatePassword:', error);
            throw error;
        }
    }

    /**
     * Cập nhật lastLogin
     */
    async updateLastLogin(userId) {
        try {
            const user = await User.findByIdAndUpdate(
                userId,
                { lastLogin: new Date() },
                { new: true }
            );
            return user;
        } catch (error) {
            logger.error('Error in updateLastLogin:', error);
            throw error;
        }
    }

    /**
     * Xóa user (soft delete - set isActive = false)
     */
    async softDeleteUser(userId) {
        try {
            const user = await User.findByIdAndUpdate(
                userId,
                { isActive: false },
                { new: true }
            );

            if (!user) {
                throw new Error('User không tồn tại');
            }

            logger.info(`User soft deleted: ${user.username}`);
            return user;
        } catch (error) {
            logger.error('Error in softDeleteUser:', error);
            throw error;
        }
    }

    /**
     * Xóa user vĩnh viễn (hard delete)
     */
    async hardDeleteUser(userId) {
        try {
            const user = await User.findByIdAndDelete(userId);

            if (!user) {
                throw new Error('User không tồn tại');
            }

            logger.info(`User hard deleted: ${user.username}`);
            return user;
        } catch (error) {
            logger.error('Error in hardDeleteUser:', error);
            throw error;
        }
    }

    /**
     * Đếm tổng số users
     */
    async countUsers(filters = {}) {
        try {
            const query = {};
            if (filters.role) query.role = filters.role;
            if (filters.isActive !== undefined) query.isActive = filters.isActive;

            const count = await User.countDocuments(query);
            return count;
        } catch (error) {
            logger.error('Error in countUsers:', error);
            throw error;
        }
    }

    /**
     * Verify user credentials (dùng cho login) với security features
     */
    async verifyCredentials(identifier, password) {
        try {
            const user = await User.findByEmailOrUsername(identifier);

            if (!user) {
                throw new Error('Email/Username hoặc password không đúng');
            }

            if (!user.isActive) {
                throw new Error('Tài khoản đã bị vô hiệu hóa');
            }

            // Kiểm tra account lock
            if (user.isLocked()) {
                const lockTimeRemaining = Math.ceil((user.lockUntil - Date.now()) / 60000);
                throw new Error(`Tài khoản đã bị khóa. Vui lòng thử lại sau ${lockTimeRemaining} phút`);
            }

            // Kiểm tra password
            const isMatch = await user.comparePassword(password);
            if (!isMatch) {
                // Tăng login attempts
                await user.incLoginAttempts();
                const attemptsLeft = 5 - (user.loginAttempts + 1);

                if (attemptsLeft > 0) {
                    throw new Error(`Password không đúng. Còn ${attemptsLeft} lần thử`);
                } else {
                    throw new Error('Password không đúng. Tài khoản đã bị khóa trong 2 giờ');
                }
            }

            // Login thành công - reset attempts
            if (user.loginAttempts > 0) {
                await user.resetLoginAttempts();
            }

            // Cập nhật lastLogin
            await this.updateLastLogin(user._id);

            return user;
        } catch (error) {
            logger.error('Error in verifyCredentials:', error);
            throw error;
        }
    }

    /**
     * Validate password strength
     */
    validatePasswordStrength(password) {
        if (!password || password.length < 8) {
            throw new Error('Password phải có ít nhất 8 ký tự');
        }

        // Kiểm tra có ít nhất 1 chữ hoa
        if (!/[A-Z]/.test(password)) {
            throw new Error('Password phải có ít nhất 1 chữ cái viết hoa');
        }

        // Kiểm tra có ít nhất 1 chữ thường
        if (!/[a-z]/.test(password)) {
            throw new Error('Password phải có ít nhất 1 chữ cái viết thường');
        }

        // Kiểm tra có ít nhất 1 số
        if (!/[0-9]/.test(password)) {
            throw new Error('Password phải có ít nhất 1 chữ số');
        }

        // Kiểm tra có ít nhất 1 ký tự đặc biệt
        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
            throw new Error('Password phải có ít nhất 1 ký tự đặc biệt');
        }

        return true;
    }

    /**
     * Tạo password reset token
     */
    async createPasswordResetToken(email) {
        try {
            const user = await User.findOne({ email: email.toLowerCase() });

            if (!user) {
                throw new Error('Không tìm thấy user với email này');
            }

            if (!user.isActive) {
                throw new Error('Tài khoản đã bị vô hiệu hóa');
            }

            // Tạo reset token
            const resetToken = user.createPasswordResetToken();
            await user.save({ validateBeforeSave: false });

            logger.info(`Password reset token created for user: ${user.username}`);
            return { resetToken, user };
        } catch (error) {
            logger.error('Error in createPasswordResetToken:', error);
            throw error;
        }
    }

    /**
     * Reset password bằng token
     */
    async resetPasswordWithToken(token, newPassword) {
        try {
            // Hash token để so sánh với database
            const hashedToken = crypto
                .createHash('sha256')
                .update(token)
                .digest('hex');

            // Tìm user với token hợp lệ và chưa hết hạn
            const user = await User.findOne({
                passwordResetToken: hashedToken,
                passwordResetExpires: { $gt: Date.now() }
            });

            if (!user) {
                throw new Error('Token không hợp lệ hoặc đã hết hạn');
            }

            // Validate password strength
            this.validatePasswordStrength(newPassword);

            // Cập nhật password
            user.password = newPassword;
            user.passwordResetToken = undefined;
            user.passwordResetExpires = undefined;
            user.loginAttempts = 0;
            user.lockUntil = undefined;

            await user.save();

            logger.info(`Password reset successful for user: ${user.username}`);
            return user;
        } catch (error) {
            logger.error('Error in resetPasswordWithToken:', error);
            throw error;
        }
    }

    /**
     * Cập nhật refresh token
     */
    async updateRefreshToken(userId, refreshToken) {
        try {
            const user = await User.findByIdAndUpdate(
                userId,
                { refreshToken },
                { new: true }
            );

            if (!user) {
                throw new Error('User không tồn tại');
            }

            return user;
        } catch (error) {
            logger.error('Error in updateRefreshToken:', error);
            throw error;
        }
    }

    /**
     * Xóa refresh token (logout)
     */
    async clearRefreshToken(userId) {
        try {
            const user = await User.findByIdAndUpdate(
                userId,
                { $unset: { refreshToken: 1 } },
                { new: true }
            );

            if (!user) {
                throw new Error('User không tồn tại');
            }

            logger.info(`Refresh token cleared for user: ${user.username}`);
            return user;
        } catch (error) {
            logger.error('Error in clearRefreshToken:', error);
            throw error;
        }
    }

    /**
     * Kiểm tra password đã thay đổi sau khi JWT được issue
     */
    changedPasswordAfter(user, JWTTimestamp) {
        if (user.passwordChangedAt) {
            const changedTimestamp = parseInt(user.passwordChangedAt.getTime() / 1000, 10);
            return JWTTimestamp < changedTimestamp;
        }
        return false;
    }

    /**
     * Lấy thống kê users
     */
    async getUserStats() {
        try {
            const totalUsers = await User.countDocuments();
            const activeUsers = await User.countDocuments({ isActive: true });
            const inactiveUsers = await User.countDocuments({ isActive: false });
            const lockedAccounts = await User.countDocuments({
                lockUntil: { $gt: Date.now() }
            });

            const usersByRole = await User.aggregate([
                {
                    $group: {
                        _id: '$role',
                        count: { $sum: 1 }
                    }
                }
            ]);

            // Số users đăng ký trong 30 ngày qua
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const recentUsers = await User.countDocuments({
                createdAt: { $gte: thirtyDaysAgo }
            });

            return {
                total: totalUsers,
                active: activeUsers,
                inactive: inactiveUsers,
                locked: lockedAccounts,
                byRole: usersByRole,
                recentRegistrations: recentUsers
            };
        } catch (error) {
            logger.error('Error in getUserStats:', error);
            throw error;
        }
    }

    /**
     * Unlock account manually (admin function)
     */
    async unlockAccount(userId) {
        try {
            const user = await User.findByIdAndUpdate(
                userId,
                {
                    $set: { loginAttempts: 0 },
                    $unset: { lockUntil: 1 }
                },
                { new: true }
            );

            if (!user) {
                throw new Error('User không tồn tại');
            }

            logger.info(`Account unlocked for user: ${user.username}`);
            return user;
        } catch (error) {
            logger.error('Error in unlockAccount:', error);
            throw error;
        }
    }

    /**
     * Thay đổi role user (admin function)
     */
    async changeUserRole(userId, newRole) {
        try {
            const validRoles = ['user', 'admin', 'moderator'];
            if (!validRoles.includes(newRole)) {
                throw new Error(`Role không hợp lệ. Phải là: ${validRoles.join(', ')}`);
            }

            const user = await User.findByIdAndUpdate(
                userId,
                { role: newRole },
                { new: true }
            );

            if (!user) {
                throw new Error('User không tồn tại');
            }

            logger.info(`Role changed to ${newRole} for user: ${user.username}`);
            return user;
        } catch (error) {
            logger.error('Error in changeUserRole:', error);
            throw error;
        }
    }
}

module.exports = new UserService();
