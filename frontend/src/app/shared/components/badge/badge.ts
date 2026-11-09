
import { Component, Input } from '@angular/core';

export type BadgeVariant =
  | 'lost'
  | 'found'
  | 'pending'
  | 'verified'
  | 'returned'
  | 'rejected'
  | 'neutral';

@Component({
  selector: 'app-badge',
  standalone: true,
  templateUrl: './badge.html',
  styleUrl: './badge.css',
})
export class StatusBadge {
  @Input() variant: BadgeVariant = 'neutral';
  @Input() label = '';
  @Input() size: 'sm' | 'md' = 'md';
}
