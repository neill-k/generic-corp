import { create, type StateCreator } from "zustand";

const resettableStores: Array<() => void> = [];

export function createResettable<T>(initializer: StateCreator<T>) {
  const store = create(initializer);
  const initialState = store.getState();
  resettableStores.push(() => store.setState(initialState, true));
  return store;
}

export function resetAllStores() {
  resettableStores.forEach((reset) => reset());
}
