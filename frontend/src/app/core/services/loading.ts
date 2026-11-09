import { Injectable, computed, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LoadingService {
  private readonly activeCount = signal(0);
  private readonly scopedCounts = signal<Record<string, number>>({});

  readonly activeRequests = this.activeCount.asReadonly();
  readonly isLoading = computed(() => this.activeCount() > 0);

  show(scope?: string): void {
    this.activeCount.update((count) => count + 1);

    if (scope) {
      this.scopedCounts.update((counts) => ({
        ...counts,
        [scope]: (counts[scope] ?? 0) + 1,
      }));
    }
  }

  hide(scope?: string): void {
    this.activeCount.update((count) => Math.max(0, count - 1));

    if (scope) {
      this.scopedCounts.update((counts) => {
        const nextCount = Math.max(0, (counts[scope] ?? 0) - 1);
        if (nextCount === 0) {
          const { [scope]: _removed, ...rest } = counts;
          return rest;
        }
        return {
          ...counts,
          [scope]: nextCount,
        };
      });
    }
  }

  isScopeLoading(scope: string): boolean {
    return (this.scopedCounts()[scope] ?? 0) > 0;
  }

  reset(): void {
    this.activeCount.set(0);
    this.scopedCounts.set({});
  }
}
