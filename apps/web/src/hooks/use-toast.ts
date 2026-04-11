import { useState, useCallback } from "react";

type Toast = {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
};

let toastCount = 0;
let listeners: Array<(toasts: Toast[]) => void> = [];
let memoryToasts: Toast[] = [];

function dispatch(toasts: Toast[]) {
  memoryToasts = toasts;
  listeners.forEach((listener) => listener(toasts));
}

export function toast(props: Omit<Toast, "id">) {
  const id = String(toastCount++);
  const newToast = { ...props, id };
  dispatch([...memoryToasts, newToast]);

  setTimeout(() => {
    dispatch(memoryToasts.filter((t) => t.id !== id));
  }, 5000);

  return id;
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>(memoryToasts);

  useState(() => {
    listeners.push(setToasts);
    return () => {
      listeners = listeners.filter((l) => l !== setToasts);
    };
  });

  const dismiss = useCallback((id: string) => {
    dispatch(memoryToasts.filter((t) => t.id !== id));
  }, []);

  return { toasts, toast, dismiss };
}
