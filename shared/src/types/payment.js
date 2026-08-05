export const mapModeToEnum = (mode) => {
    const clean = mode.toUpperCase().replace(/\s/g, '_');
    if (['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'OTHER'].includes(clean)) {
        return clean;
    }
    return 'OTHER';
};
