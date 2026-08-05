import { Permission } from './permission.js';
export var UserRole;
(function (UserRole) {
    UserRole["SUPER_ADMIN"] = "SUPER_ADMIN";
    UserRole["ADMIN"] = "ADMIN";
    UserRole["STAFF"] = "STAFF";
    UserRole["VIEWER"] = "VIEWER";
})(UserRole || (UserRole = {}));
export const DEFAULT_ROLE_PERMISSIONS = {
    [UserRole.SUPER_ADMIN]: Object.values(Permission),
    [UserRole.ADMIN]: [
        Permission.VIEW_CUSTOMERS,
        Permission.MANAGE_CUSTOMERS,
        Permission.VIEW_PRODUCTS,
        Permission.MANAGE_PRODUCTS,
        Permission.GENERATE_INVOICE,
        Permission.VIEW_INVOICE,
        Permission.SHARE_INVOICE,
        Permission.COLLECT_PAYMENT,
        Permission.GENERATE_RECEIPT,
        Permission.VIEW_REPORTS,
        Permission.MANAGE_SETTINGS,
    ],
    [UserRole.STAFF]: [
        Permission.VIEW_CUSTOMERS,
        Permission.GENERATE_INVOICE,
        Permission.VIEW_INVOICE,
        Permission.SHARE_INVOICE,
        Permission.COLLECT_PAYMENT,
        Permission.GENERATE_RECEIPT,
    ],
    [UserRole.VIEWER]: [
        Permission.VIEW_CUSTOMERS,
        Permission.VIEW_PRODUCTS,
        Permission.VIEW_INVOICE,
        Permission.VIEW_REPORTS,
    ],
};
