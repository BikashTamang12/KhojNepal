import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-logo',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './logo.html',
  styleUrl: './logo.css',
})
export class Logo {
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() showText = true;
}