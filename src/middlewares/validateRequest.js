const HTTP_STATUS = require('../constants/httpStatus');

/**
 * Validate threshold request body
 */
const validateThreshold = (req, res, next) => {
    const { MQ2Threshold, MQ135Threshold, HumThreshold, TempThreshold, DustThreshold } = req.body;

    // Kiểm tra có ít nhất 1 threshold được cung cấp (không phải undefined/null)
    const hasAtLeastOne = [MQ2Threshold, MQ135Threshold, HumThreshold, TempThreshold, DustThreshold]
        .some(val => val !== undefined && val !== null && val !== '');

    if (!hasAtLeastOne) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
            success: false,
            error: "Vui lòng cung cấp ít nhất một threshold"
        });
    }

    // Validate các threshold được cung cấp
    const thresholds = { MQ2Threshold, MQ135Threshold, HumThreshold, TempThreshold, DustThreshold };
    for (const [key, value] of Object.entries(thresholds)) {
        if (value !== undefined && value !== null && value !== '' && isNaN(value)) {
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
