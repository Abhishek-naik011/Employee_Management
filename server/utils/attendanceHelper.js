/**
 * Helper to safely calculate attendance working minutes.
 * Handles overnight shifts by correctly interpreting check-out times that appear earlier than check-in times.
 */
exports.calculateAttendanceDuration = (checkInStr, checkOutStr, previousMinutes = 0) => {
    // Standardize replacing spaces with 'T' if the string is just 'YYYY-MM-DD HH:mm:ss' to ensure reliable Date parsing in Node
    const parseDateSafe = (dStr) => {
        if (!dStr) return null;
        if (dStr instanceof Date) return dStr;
        return new Date(dStr.replace(' ', 'T'));
    };

    const inTime = parseDateSafe(checkInStr);
    const outTime = parseDateSafe(checkOutStr);

    if (!inTime || !outTime || isNaN(inTime.getTime()) || isNaN(outTime.getTime())) {
        return {
            workingMinutes: previousMinutes,
            correctedCheckOut: checkOutStr
        };
    }

    // Handle overnight shifts where the date part of checkout might have been forced 
    // to the check-in date or selected incorrectly in UI, making outTime appear earlier than inTime
    if (outTime < inTime) {
        outTime.setDate(outTime.getDate() + 1);
    }

    let minutes = Math.floor((outTime - inTime) / 60000);
    minutes += parseInt(previousMinutes, 10) || 0;

    // Protection against negative values
    if (minutes < 0) {
        minutes = 0;
    }

    // Convert corrected checkOut back to 'YYYY-MM-DD HH:mm:ss' or ISO string 
    // depending on what Postgres expects. Postgres accepts ISO string gracefully.
    // However, if the original checkOutStr had no 'T', let's return a string Postgres can easily parse as local time without Z confusion.
    // Easiest is formatting to 'YYYY-MM-DD HH:mm:ss' using local values (the ones we just manipulated).
    const pad = (n) => String(n).padStart(2, '0');
    const correctedCheckOut = `${outTime.getFullYear()}-${pad(outTime.getMonth()+1)}-${pad(outTime.getDate())} ${pad(outTime.getHours())}:${pad(outTime.getMinutes())}:${pad(outTime.getSeconds())}`;

    return {
        workingMinutes: minutes,
        correctedCheckOut: correctedCheckOut
    };
};
