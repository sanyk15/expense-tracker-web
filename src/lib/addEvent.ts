export const ADD_EVENT = 'finansy:add';

// Кнопка «+» в навбаре шлёт этот event; нужная страница подписана и открывает свою форму.
export function emitAdd() {
  window.dispatchEvent(new Event(ADD_EVENT));
}
