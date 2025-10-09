export const roleHierarchy: Record<string, number> = {
  owner: 3,
  manager: 2,
  staff: 1,
};

export const canAccess = (userRole: string, requiredRole: string) => {
  const user = roleHierarchy[userRole] ?? 0;
  const required = roleHierarchy[requiredRole] ?? 0;
  return user >= required;
};