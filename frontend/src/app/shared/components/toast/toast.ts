import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ToastType } from '../../../core/services/toast';
import { Icon, IconName } from '../icon/icon';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [Icon],
  templateUrl: './toast.html',
  styleUrl: './toast.css',
})
export class Toast {
  @Input() type: ToastType = 'info';
  @Input() title = '';
  @Input() message = '';
  @Input() dismissible = true;

  @Output() dismissed = new EventEmitter<void>();

  get iconName(): IconName {
    switch (this.type) {
      case 'success':
        return 'check-circle';
      case 'error':
        return 'alert-circle';
      case 'warning':
        return 'alert-triangle';
      default:
        return 'info';
    }
  }

  onDismiss(): void {
    this.dismissed.emit();
  }
}
