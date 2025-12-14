const HTTP_STATUS = require('../constants/httpStatus');

/**
 * Validate threshold request body
 */
const validateThreshold = (req, res, next) => {
    const { THRESHOLD34, THRESHOLD35, THRESHOLD_HUMD, THRESHOLD_TEMP } = req.body;

    if ([THRESHOLD34, THRESHOLD35, THRESHOLD_HUMD, THRESHOLD_TEMP].some(v => v === undefined || isNaN(v))) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
            success: false,
            error: "Cần truyền đầy đủ các trường threshold"
        });
    }

    next();
};

module.exports = {
    validateThreshold
};
