import { Component, Input } from '@angular/core';

export type LoadingMode = 'spinner' | 'dots' | 'skeleton';
export type LoadingSize = 'sm' | 'md' | 'lg';
export type SkeletonVariant = 'text' | 'card' | 'list' | 'detail' | 'table';

@Component({
  selector: 'app-loading',
  standalone: true,
  templateUrl: './loading.html',
  styleUrl: './loading.css',
})
export class Loading {
  @Input() mode: LoadingMode = 'spinner';
  @Input() size: LoadingSize = 'md';
  @Input() label = 'Loading...';
  @Input() showLabel = true;
  @Input() inline = false;
  @Input() fullscreen = false;
  @Input() skeletonVariant: SkeletonVariant = 'card';
  @Input() count = 3;

  get skeletonItems(): number[] {
    const safeCount = Math.max(1, Math.min(12, Math.floor(this.count || 1)));
    return Array.from({ length: safeCount }, (_, index) => index);
  }
}
