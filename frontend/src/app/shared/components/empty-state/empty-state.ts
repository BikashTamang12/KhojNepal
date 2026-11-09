import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button, ButtonVariant } from '../button/button';
import { Icon, IconName } from '../icon/icon';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [RouterLink, Button, Icon],
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.css',
})
export class EmptyState {
  @Input() title = 'Nothing here yet';
  @Input() description = '';
  @Input() icon: IconName = 'inbox';
  @Input() actionLabel = '';
  @Input() actionRouterLink: string | readonly unknown[] | null = null;
  @Input() actionVariant: ButtonVariant = 'primary';
  @Input() compact = false;

  @Output() actionClick = new EventEmitter<void>();

  onAction(): void {
    this.actionClick.emit();
  }
}
