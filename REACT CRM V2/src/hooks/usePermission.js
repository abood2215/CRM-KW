import { useAuthStore } from '../store/useAuthStore';

export const usePermission = (key) => useAuthStore((s) => s.user?.permissions?.includes(key) ?? false);
