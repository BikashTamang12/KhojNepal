import { Component, Input, inject } from '@angular/core';
import { LoadingService } from '../../../core/services/loading';

@Component({
  selector: 'app-http-loading-bar',
  standalone: true,
  templateUrl: './http-loading-bar.html',
  styleUrl: './http-loading-bar.css',
})
export class HttpLoadingBar {
  private readonly loadingService = inject(LoadingService);

  @Input() scope?: string;
  @Input() label = 'Loading data';

  get active(): boolean {
    if (this.scope) {
      return this.loadingService.isScopeLoading(this.scope);
    }
    return this.loadingService.isLoading();
  }
}
