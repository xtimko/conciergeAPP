import { createContext, useContext } from 'react';

/** Слот справа в шапке админки (кнопка «Новый заказ» и т.п.) */
export const AdminChromeContext = createContext(null);

export function useAdminChrome() {
  return useContext(AdminChromeContext);
}
