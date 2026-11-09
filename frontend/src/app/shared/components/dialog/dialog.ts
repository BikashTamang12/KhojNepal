import { DOCUMENT } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
  inject,
} from '@angular/core';
import { Button, ButtonVariant } from '../button/button';
import { Icon, IconName } from '../icon/icon';

export type DialogVariant = 'default' | 'danger' | 'warning' | 'info';
export type DialogSize = 'sm' | 'md' | 'lg';

let nextDialogId = 0;

@Component({
  selector: 'app-dialog',
  standalone: true,
  imports: [Button, Icon],
  templateUrl: './dialog.html',
  styleUrl: './dialog.css',
})
export class Dialog implements OnChanges, OnDestroy {
  private readonly document = inject(DOCUMENT);
  private readonly instanceId = ++nextDialogId;
  private previousBodyOverflow = '';
  private lockedScroll = false;

  @ViewChild('dialogPanel') dialogPanel?: ElementRef<HTMLElement>;

  @Input() open = false;
  @Input() title = '';
  @Input() description = '';
  @Input() variant: DialogVariant = 'default';
  @Input() size: DialogSize = 'sm';
  @Input() icon: IconName | null = null;
  @Input() showIcon = true;
  @Input() confirmLabel = 'Confirm';
  @Input() cancelLabel = 'Cancel';
  @Input() showConfirm = true;
  @Input() showCancel = true;
  @Input() showFooter = true;
  @Input() showCloseButton = true;
  @Input() loading = false;
  @Input() closeOnBackdrop = true;
  @Input() closeOnEscape = true;

  @Output() openChange = new EventEmitter<boolean>();
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  readonly titleId = `khoj-dialog-title-${this.instanceId}`;
  readonly descriptionId = `khoj-dialog-desc-${this.instanceId}`;

  get resolvedIcon(): IconName | null {
    if (this.icon) {
      return this.icon;
    }

    switch (this.variant) {
      case 'danger':
        return 'trash';
      case 'warning':
        return 'alert-triangle';
      case 'info':
        return 'info';
      default:
        return 'info';
    }
  }

  get confirmButtonVariant(): ButtonVariant {
    return this.variant === 'danger' ? 'danger' : 'primary';
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open']) {
      if (this.open) {
        this.lockBodyScroll();
        queueMicrotask(() => this.dialogPanel?.nativeElement?.focus());
      } else {
        this.unlockBodyScroll();
      }
    }
  }

  ngOnDestroy(): void {
    this.unlockBodyScroll();
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.open && this.closeOnEscape && !this.loading) {
      this.closeDialog();
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if (
      event.target === event.currentTarget &&
      this.closeOnBackdrop &&
      !this.loading
    ) {
      this.closeDialog();
    }
  }

  onCancel(): void {
    if (this.loading) {
      return;
    }
    this.cancelled.emit();
    this.emitClose();
  }

  onConfirm(): void {
    if (this.loading) {
      return;
    }
    this.confirmed.emit();
  }

  closeDialog(): void {
    if (this.loading) {
      return;
    }
    this.cancelled.emit();
    this.emitClose();
  }

  private emitClose(): void {
    this.open = false;
    this.unlockBodyScroll();
    this.openChange.emit(false);
    this.closed.emit();
  }

  private lockBodyScroll(): void {
    if (this.lockedScroll || !this.document?.body) {
      return;
    }
    this.previousBodyOverflow = this.document.body.style.overflow;
    this.document.body.style.overflow = 'hidden';
    this.lockedScroll = true;
  }

  private unlockBodyScroll(): void {
    if (!this.lockedScroll || !this.document?.body) {
      return;
    }
    this.document.body.style.overflow = this.previousBodyOverflow;
    this.lockedScroll = false;
  }
}
