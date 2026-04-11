"use client";

import { useToast } from "@/hooks/use-toast";

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`rounded-lg border px-4 py-3 shadow-lg transition-all ${
            toast.variant === "destructive"
              ? "border-destructive bg-destructive text-destructive-foreground"
              : "border-border bg-background text-foreground"
          }`}
        >
          {toast.title && <p className="text-sm font-semibold">{toast.title}</p>}
          {toast.description && <p className="text-sm opacity-90">{toast.description}</p>}
          <button
            onClick={() => dismiss(toast.id)}
            className="absolute right-2 top-2 text-sm opacity-50 hover:opacity-100"
          >
            x
          </button>
        </div>
      ))}
    </div>
  );
}
