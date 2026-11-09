import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HttpLoadingBar } from './shared/components/loading/http-loading-bar';
import { ToastContainer } from './shared/components/toast/toast-container';

@Component({
  imports: [RouterOutlet, HttpLoadingBar, ToastContainer],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('frontend');
}
