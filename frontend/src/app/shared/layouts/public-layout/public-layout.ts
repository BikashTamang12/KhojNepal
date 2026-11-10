import { Component, effect, inject, signal } from '@angular/core';
import {
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { AuthService } from '../../../features/auth/services/auth';
import { NotificationService } from '../../../features/notifications/services/notification';
import { ThemeService } from '../../../core/services/theme';
import { Icon } from '../../components/icon/icon';
import { Logo } from '../../components/logo/logo';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Logo, Icon],
  templateUrl: './public-layout.html',
  styleUrl: './public-layout.css',
})
export class PublicLayout {
  readonly themeService = inject(ThemeService);
  readonly authService = inject(AuthService);
  readonly notificationService = inject(NotificationService);
  readonly currentYear = new Date().getFullYear();
  readonly mobileMenuOpen = signal(false);

  constructor() {
    effect(() => {
      if (this.authService.isAuthenticated() && !this.authService.isAdmin()) {
        this.notificationService.refreshUnreadCount().subscribe();
      }
    });
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update((open) => !open);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  logout(): void {
    this.closeMobileMenu();
    this.authService.logout('/');
  }
}
