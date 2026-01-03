const HTTP_STATUS = require('../constants/httpStatus');

/**
 * Validate threshold request body
 */
const validateThreshold = (req, res, next) => {
    const { THRESHOLD34, THRESHOLD35, THRESHOLD_HUMD, THRESHOLD_TEMP, THRESHOLD_DUST } = req.body;

    // Kiểm tra có ít nhất 1 threshold
    if (!THRESHOLD34 && !THRESHOLD35 && !THRESHOLD_HUMD && !THRESHOLD_TEMP && !THRESHOLD_DUST) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
            success: false,
            error: "Vui lòng cung cấp ít nhất một threshold"
        });
    }

    // Validate các threshold được cung cấp
    const thresholds = { THRESHOLD34, THRESHOLD35, THRESHOLD_HUMD, THRESHOLD_TEMP, THRESHOLD_DUST };
    for (const [key, value] of Object.entries(thresholds)) {
        if (value !== undefined && isNaN(value)) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                error: `${key} phải là số hợp lệ`
            });
        }
    }

    next();
};

module.exports = {
    validateThreshold
};
