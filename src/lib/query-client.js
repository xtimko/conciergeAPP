import { QueryClient } from '@tanstack/react-query';

/**
 * Глобальный React Query клиент.
 * - refetchOnWindowFocus отключён: в Telegram Mini App нет «фокусов окна»
 * - retry: 1 — не молотить упавший эндпоинт несколько раз подряд
 * - staleTime: 30 сек — считаем кэш свежим. Это снимает дубли запросов когда
 *   несколько компонентов одновременно вызывают useQuery с тем же ключом
 *   (ProfileGate, AppRoutes, ThemeInitializer вызывают ['me'] параллельно).
 * - gcTime: 5 минут — кэш живёт после анмаунта компонента, при возврате
 *   на ту же страницу данные подтянутся мгновенно из кэша.
 */
export const queryClientInstance = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30_000,
      gcTime: 5 * 60_000,
    },
  },
});
