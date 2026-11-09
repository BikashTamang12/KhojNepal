import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Button } from '../button/button';
import { Icon, IconName } from '../icon/icon';

@Component({
  selector: 'app-error-state',
  standalone: true,
  imports: [Button, Icon],
  templateUrl: './error-state.html',
  styleUrl: './error-state.css',
})
export class ErrorState {
  @Input() title = 'Something went wrong';
  @Input() message =
    'We could not load this information right now. Please try again.';
  @Input() errorCode = '';
  @Input() icon: IconName = 'alert-circle';
  @Input() retryLabel = 'Try Again';
  @Input() showRetry = true;
  @Input() retrying = false;
  @Input() secondaryLabel = '';
  @Input() compact = false;

  @Output() retry = new EventEmitter<void>();
  @Output() secondaryAction = new EventEmitter<void>();

  onRetry(): void {
    if (!this.retrying) {
      this.retry.emit();
    }
  }

  onSecondaryAction(): void {
    this.secondaryAction.emit();
  }
}
