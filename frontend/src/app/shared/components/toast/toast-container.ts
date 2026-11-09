import { Component, inject } from '@angular/core';
import { ToastService } from '../../../core/services/toast';
import { Toast } from './toast';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [Toast],
  templateUrl: './toast-container.html',
  styleUrl: './toast-container.css',
})
export class ToastContainer {
  readonly toastService = inject(ToastService);

  dismiss(id: string): void {
    this.toastService.dismiss(id);
  }
}
