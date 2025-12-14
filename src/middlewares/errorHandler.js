const logger = require('../utils/logger');
const HTTP_STATUS = require('../constants/httpStatus');

/**
 * Global Error Handler Middleware
 */
const errorHandler = (err, req, res, next) => {
    logger.error('Error caught by middleware:', err);

    const statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    const message = err.message || 'Lỗi máy chủ';

    res.status(statusCode).json({
        success: false,
        error: message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
};

/**
 * 404 Not Found Handler
 */
const notFoundHandler = (req, res, next) => {
    res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: `Route ${req.originalUrl} không tồn tại`
    });
};

module.exports = {
    errorHandler,
    notFoundHandler
};
