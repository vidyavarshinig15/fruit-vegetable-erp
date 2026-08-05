/**
 * System Permissions Enum
 * 13 Configurable permissions across the wholesale billing system
 */
export var Permission;
(function (Permission) {
    Permission["VIEW_CUSTOMERS"] = "VIEW_CUSTOMERS";
    Permission["MANAGE_CUSTOMERS"] = "MANAGE_CUSTOMERS";
    Permission["VIEW_PRODUCTS"] = "VIEW_PRODUCTS";
    Permission["MANAGE_PRODUCTS"] = "MANAGE_PRODUCTS";
    Permission["GENERATE_INVOICE"] = "GENERATE_INVOICE";
    Permission["VIEW_INVOICE"] = "VIEW_INVOICE";
    Permission["SHARE_INVOICE"] = "SHARE_INVOICE";
    Permission["COLLECT_PAYMENT"] = "COLLECT_PAYMENT";
    Permission["GENERATE_RECEIPT"] = "GENERATE_RECEIPT";
    Permission["VIEW_REPORTS"] = "VIEW_REPORTS";
    Permission["MANAGE_SETTINGS"] = "MANAGE_SETTINGS";
    Permission["MANAGE_USERS"] = "MANAGE_USERS";
    Permission["MANAGE_BACKUPS"] = "MANAGE_BACKUPS";
})(Permission || (Permission = {}));
export const ALL_PERMISSIONS = [
    { key: Permission.VIEW_CUSTOMERS, name: 'View Customers', category: 'CUSTOMERS', description: 'Access customer directory and details' },
    { key: Permission.MANAGE_CUSTOMERS, name: 'Manage Customers', category: 'CUSTOMERS', description: 'Create, update, and manage customer profiles' },
    { key: Permission.VIEW_PRODUCTS, name: 'View Products', category: 'PRODUCTS', description: 'View product catalog and daily prices' },
    { key: Permission.MANAGE_PRODUCTS, name: 'Manage Products', category: 'PRODUCTS', description: 'Create, edit products and update price list' },
    { key: Permission.GENERATE_INVOICE, name: 'Generate Invoice', category: 'INVOICING', description: 'Create new wholesale bills & order uploads' },
    { key: Permission.VIEW_INVOICE, name: 'View Invoice', category: 'INVOICING', description: 'View generated wholesale invoices and bills' },
    { key: Permission.SHARE_INVOICE, name: 'Share Invoice', category: 'INVOICING', description: 'Download PDF, print, or share invoices via SMS/WhatsApp' },
    { key: Permission.COLLECT_PAYMENT, name: 'Collect Payment', category: 'PAYMENTS', description: 'Record payment settlements against bills' },
    { key: Permission.GENERATE_RECEIPT, name: 'Generate Receipt', category: 'PAYMENTS', description: 'Issue payment receipts to customers' },
    { key: Permission.VIEW_REPORTS, name: 'View Reports', category: 'REPORTS', description: 'View daily sales, ledger summaries, and collection analytics' },
    { key: Permission.MANAGE_SETTINGS, name: 'Manage Settings', category: 'SYSTEM', description: 'Configure shop header, print preferences, and UPI settings' },
    { key: Permission.MANAGE_USERS, name: 'Manage Users', category: 'SYSTEM', description: 'Create, update, deactivate users and assign permissions' },
    { key: Permission.MANAGE_BACKUPS, name: 'Manage Backups', category: 'SYSTEM', description: 'Create and restore system database & file backups' },
];
