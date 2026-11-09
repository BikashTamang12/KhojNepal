import { Injectable, OnDestroy, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  id?: string;
  type?: ToastType;
  title?: string;
  message: string;
  duration?: number;
  dismissible?: boolean;
}

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  duration: number;
  dismissible: boolean;
}

const DEFAULT_TITLES: Record<ToastType, string> = {
  success: 'Success',
  error: 'Error',
  warning: 'Warning',
  info: 'Information',
};

const MAX_VISIBLE_TOASTS = 5;

@Injectable({
  providedIn: 'root',
})
export class ToastService implements OnDestroy {
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  private counter = 0;

  readonly toasts = signal<ToastItem[]>([]);

  show(options: ToastOptions | string): string {
    const normalized: ToastOptions =
      typeof options === 'string' ? { message: options } : options;

    const type: ToastType = normalized.type ?? 'info';
    const id = normalized.id ?? `toast-${++this.counter}-${Date.now()}`;
    const duration = normalized.duration ?? (type === 'error' ? 6000 : 4500);

    const toast: ToastItem = {
      id,
      type,
      title: normalized.title ?? DEFAULT_TITLES[type],
      message: normalized.message,
      duration,
      dismissible: normalized.dismissible ?? true,
    };

    const existing = this.toasts().filter((item) => item.id !== id);
    const next = [...existing, toast];

    while (next.length > MAX_VISIBLE_TOASTS) {
      const dropped = next.shift();
      if (dropped) {
        this.clearTimer(dropped.id);
      }
    }

    this.toasts.set(next);
    this.clearTimer(id);

    if (duration > 0) {
      const timer = setTimeout(() => {
        this.dismiss(id);
      }, duration);
      this.timers.set(id, timer);
    }

    return id;
  }

  success(
    message: string,
    title = DEFAULT_TITLES.success,
    duration = 4500,
  ): string {
    return this.show({ type: 'success', title, message, duration });
  }

  error(
    message: string,
    title = DEFAULT_TITLES.error,
    duration = 6000,
  ): string {
    return this.show({ type: 'error', title, message, duration });
  }

  warning(
    message: string,
    title = DEFAULT_TITLES.warning,
    duration = 5000,
  ): string {
    return this.show({ type: 'warning', title, message, duration });
  }

  info(
    message: string,
    title = DEFAULT_TITLES.info,
    duration = 4500,
  ): string {
    return this.show({ type: 'info', title, message, duration });
  }

  dismiss(id: string): void {
    this.clearTimer(id);
    this.toasts.update((items) => items.filter((item) => item.id !== id));
  }

  clear(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.toasts.set([]);
  }

  ngOnDestroy(): void {
    this.clear();
  }

  private clearTimer(id: string): void {
    const existing = this.timers.get(id);
    if (existing !== undefined) {
      clearTimeout(existing);
      this.timers.delete(id);
    }
  }
}
