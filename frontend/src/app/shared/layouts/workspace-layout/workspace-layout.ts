import { Component, effect, inject, signal } from '@angular/core';
import {
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { AuthService } from '../../../features/auth/services/auth';
import { NotificationService } from '../../../features/notifications/services/notification';
import { ThemeService } from '../../../core/services/theme';
import { Icon, type IconName } from '../../components/icon/icon';
import { Logo } from '../../components/logo/logo';

interface NavLinkItem {
  label: string;
  route: string;
  icon: IconName;
  exact?: boolean;
  showBadge?: boolean;
}

@Component({
  selector: 'app-workspace-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Logo, Icon],
  templateUrl: './workspace-layout.html',
  styleUrl: './workspace-layout.css',
})
export class WorkspaceLayout {
  readonly authService = inject(AuthService);
  readonly themeService = inject(ThemeService);
  readonly notificationService = inject(NotificationService);
  readonly sidebarOpen = signal(false);

  readonly navItems: NavLinkItem[] = [
    { label: 'My Reports', route: '/items/my', icon: 'package', exact: true },
    { label: 'Report Lost Item', route: '/items/report-lost', icon: 'plus' },
    { label: 'Report Found Item', route: '/items/report-found', icon: 'check-circle' },
    { label: 'Smart Matches', route: '/matching', icon: 'sparkles' },
    { label: 'Claims & Handovers', route: '/claims', icon: 'clipboard' },
    { label: 'Notifications', route: '/notifications', icon: 'bell', showBadge: true },
    { label: 'My Profile', route: '/profile', icon: 'user' },
  ];

  constructor() {
    effect(() => {
      if (this.authService.isAuthenticated() && !this.authService.isAdmin()) {
        this.notificationService.refreshUnreadCount().subscribe();
      }
    });
  }

  toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  logout(): void {
    this.closeSidebar();
    this.authService.logout('/login');
  }
}
