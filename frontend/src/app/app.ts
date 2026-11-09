import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './core/services/theme';
import { HttpLoadingBar } from './shared/components/loading/http-loading-bar';
import { ToastContainer } from './shared/components/toast/toast-container';

@Component({
  imports: [RouterOutlet, HttpLoadingBar, ToastContainer],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  private readonly _themeService = inject(ThemeService);
  protected readonly title = signal('frontend');
}
