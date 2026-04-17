/** Baş admin deyil, adi filial admini (admin + isBoss !== true) */
export function isFilialAdmin(user) {
    if (!user?.role?.name) return false;
    return user.role.name.toLowerCase() === 'admin' && user.isBoss !== true;
}

/** Filial admininin Tənzimləmələr altından keçməməli olduğu səhifə slug-ları */
export const FILIAL_ADMIN_BLOCKED_SETTINGS_SLUGS = new Set([
    'roles-management',
    'role-form',
    'credit-term-management',
    'branch-management',
    'branch-form',
    'branch-detail',
    'stock-transfer-form',
]);
