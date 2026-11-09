import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Icon } from '../icon/icon';

export type PaginationToken =
  | { id: string; type: 'page'; value: number }
  | { id: string; type: 'ellipsis' };

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [Icon],
  templateUrl: './pagination.html',
  styleUrl: './pagination.css',
})
export class Pagination {
  @Input() page = 1;
  @Input() pageSize = 10;
  @Input() totalItems = 0;
  @Input() maxVisiblePages = 5;
  @Input() showSummary = true;
  @Input() showPageSizeSelector = false;
  @Input() pageSizeOptions: number[] = [10, 20, 50];
  @Input() itemLabel = 'items';
  @Input() hideWhenEmpty = true;
  @Input() hideWhenSinglePage = false;
  @Input() disabled = false;

  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();

  get safePageSize(): number {
    return Math.max(1, Math.floor(this.pageSize || 10));
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(Math.max(0, this.totalItems) / this.safePageSize));
  }

  get currentPage(): number {
    return Math.min(Math.max(1, Math.floor(this.page || 1)), this.totalPages);
  }

  get startItem(): number {
    if (this.totalItems <= 0) {
      return 0;
    }
    return (this.currentPage - 1) * this.safePageSize + 1;
  }

  get endItem(): number {
    if (this.totalItems <= 0) {
      return 0;
    }
    return Math.min(this.totalItems, this.currentPage * this.safePageSize);
  }

  get isVisible(): boolean {
    if (this.hideWhenEmpty && this.totalItems <= 0) {
      return false;
    }
    if (this.hideWhenSinglePage && this.totalPages <= 1) {
      return false;
    }
    return true;
  }

  get canGoPrevious(): boolean {
    return !this.disabled && this.currentPage > 1;
  }

  get canGoNext(): boolean {
    return !this.disabled && this.currentPage < this.totalPages;
  }

  get pageTokens(): PaginationToken[] {
    const total = this.totalPages;
    const current = this.currentPage;
    const windowSize = Math.max(5, Math.floor(this.maxVisiblePages || 5));

    if (total <= windowSize + 2) {
      return Array.from({ length: total }, (_, index) => ({
        id: `page-${index + 1}`,
        type: 'page',
        value: index + 1,
      }));
    }

    const tokens: PaginationToken[] = [{ id: 'page-1', type: 'page', value: 1 }];
    const half = Math.floor((windowSize - 2) / 2);

    let start = Math.max(2, current - half);
    let end = Math.min(total - 1, current + half);

    if (current - 1 <= half + 1) {
      start = 2;
      end = Math.min(total - 1, windowSize - 1);
    } else if (total - current <= half + 1) {
      start = Math.max(2, total - (windowSize - 2));
      end = total - 1;
    }

    if (start > 2) {
      tokens.push({ id: 'ellipsis-start', type: 'ellipsis' });
    }

    for (let pageNumber = start; pageNumber <= end; pageNumber += 1) {
      tokens.push({
        id: `page-${pageNumber}`,
        type: 'page',
        value: pageNumber,
      });
    }

    if (end < total - 1) {
      tokens.push({ id: 'ellipsis-end', type: 'ellipsis' });
    }

    tokens.push({ id: `page-${total}`, type: 'page', value: total });
    return tokens;
  }

  goToPage(targetPage: number): void {
    if (this.disabled) {
      return;
    }

    const clamped = Math.min(Math.max(1, Math.floor(targetPage)), this.totalPages);
    if (clamped !== this.currentPage) {
      this.pageChange.emit(clamped);
    }
  }

  onPageSizeSelect(event: Event): void {
    const select = event.target as HTMLSelectElement | null;
    const nextSize = Number(select?.value);
    if (Number.isFinite(nextSize) && nextSize > 0 && nextSize !== this.safePageSize) {
      this.pageSizeChange.emit(nextSize);
    }
  }
}
