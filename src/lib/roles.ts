export const roleHierarchy: Record<string, number> = {
  Owner: 3,
  Manager: 2,
  Staff: 1,
};

export const canAccess = (userRole: string, requiredRole: string) => {
  const user = roleHierarchy[userRole] ?? 0;
  const required = roleHierarchy[requiredRole] ?? 0;
  return user >= required;
};