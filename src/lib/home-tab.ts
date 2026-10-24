// Вкладки главной на телефоне: «Сейчас», «Списки», «Ещё».
// Выбранная вкладка — в адресе (/?tab=lists), чтобы работала кнопка «Назад».
// На компьютере вкладок нет: там вся главная одной страницей.
export type HomeTab = "now" | "lists" | "more";

export function parseHomeTab(value: string | string[] | undefined): HomeTab {
  return value === "lists" || value === "more" ? value : "now";
}

// Классы для блока, который на телефоне виден только на своей вкладке.
// display: contents не ломает отступы родителя на компьютере.
export function onTab(current: HomeTab, ...tabs: HomeTab[]): string {
  return tabs.includes(current) ? "contents" : "hidden sm:contents";
}
