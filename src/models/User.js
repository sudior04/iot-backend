const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Username là bắt buộc'],
        unique: true,
        trim: true,
        minlength: [3, 'Username phải có ít nhất 3 ký tự'],
        maxlength: [50, 'Username không được quá 50 ký tự']
    },
    email: {
        type: String,
        required: [true, 'Email là bắt buộc'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Email không hợp lệ']
    },
    password: {
        type: String,
        required: [true, 'Password là bắt buộc'],
        minlength: [6, 'Password phải có ít nhất 6 ký tự']
    },
    fullName: {
        type: String,
        trim: true,
        maxlength: [100, 'Tên đầy đủ không được quá 100 ký tự']
    },
    role: {
        type: String,
        enum: ['user', 'admin', 'moderator'],
        default: 'user'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: {
        type: Date
    },
    refreshToken: {
        type: String
    },
    // Password reset
    passwordResetToken: {
        type: String
    },
    passwordResetExpires: {
        type: Date
    },
    // Account security
    loginAttempts: {
        type: Number,
        default: 0
    },
    lockUntil: {
        type: Date
    },
    passwordChangedAt: {
        type: Date
    }
}, {
    timestamps: true // Tự động tạo createdAt và updatedAt
});

/**
 * Pre-save hook - Hash password trước khi lưu
 */
userSchema.pre('save', async function () {
    // Chỉ hash password nếu nó được modify
    if (!this.isModified('password')) return;

    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);

    // Nếu password thay đổi (không phải lần đầu tạo), lưu thời gian thay đổi
    if (!this.isNew) {
        this.passwordChangedAt = Date.now() - 1000; // Trừ 1s để đảm bảo token được tạo sau khi password thay đổi
    }
});

/**
 * Indexes
 */
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ passwordResetToken: 1 });

/**
 * Methods
 */

// Ẩn password khi convert sang JSON
userSchema.methods.toJSON = function () {
    const user = this.toObject();
    delete user.password;
    delete user.refreshToken;
    return user;
};

// So sánh password với bcrypt
userSchema.methods.comparePassword = async function (candidatePassword) {
    try {
        const bcrypt = require('bcryptjs');
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        return false;
    }
};

// Kiểm tra xem account có bị lock không
userSchema.methods.isLocked = function () {
    return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Tăng login attempts
userSchema.methods.incLoginAttempts = function () {
    // Nếu có lockUntil và đã hết hạn, reset attempts
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return this.updateOne({
            $set: { loginAttempts: 1 },
            $unset: { lockUntil: 1 }
        });
    }

    const updates = { $inc: { loginAttempts: 1 } };
    const maxAttempts = 5;
    const lockTime = 2 * 60 * 60 * 1000; // 2 giờ

    // Lock account nếu đạt max attempts
    if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked()) {
        updates.$set = { lockUntil: Date.now() + lockTime };
    }

    return this.updateOne(updates);
};

// Reset login attempts khi login thành công
userSchema.methods.resetLoginAttempts = function () {
    return this.updateOne({
        $set: { loginAttempts: 0 },
        $unset: { lockUntil: 1 }
    });
};

// Tạo password reset token
userSchema.methods.createPasswordResetToken = function () {
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Hash token trước khi lưu vào database
    this.passwordResetToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    // Token hết hạn sau 10 phút
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

    return resetToken; // Trả về token chưa hash để gửi cho user
};

/**
 * Statics
 */

// Tìm user theo email hoặc username
userSchema.statics.findByEmailOrUsername = function (identifier) {
    return this.findOne({
        $or: [
            { email: identifier.toLowerCase() },
            { username: identifier }
        ]
    });
};

const User = mongoose.model('User', userSchema);

module.exports = User;
