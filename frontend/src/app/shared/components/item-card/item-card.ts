
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StatusBadge } from '../badge/badge';
import { Icon } from '../icon/icon';

@Component({
  selector: 'app-item-card',
  standalone: true,
  imports: [RouterLink, StatusBadge, Icon],
  templateUrl: './item-card.html',
  styleUrl: './item-card.css',
})
export class ItemCard {
  @Input() id = '';
  @Input() title = '';
  @Input() description = '';
  @Input() imageUrl = '';
  @Input() category = '';
  @Input() location = '';
  @Input() date = '';
  @Input() status: 'lost' | 'found' = 'lost';
}
