import { Component, inject, signal } from '@angular/core';
import {
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { AuthService } from '../../../features/auth/services/auth';
import { ThemeService } from '../../../core/services/theme';
import { Icon, type IconName } from '../../components/icon/icon';
import { Logo } from '../../components/logo/logo';

interface AdminNavItem {
  label: string;
  route: string;
  icon: IconName;
  exact?: boolean;
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Logo, Icon],
  templateUrl: './admin-layout.html',
  styleUrl: '../workspace-layout/workspace-layout.css',
})
export class AdminLayout {
  readonly authService = inject(AuthService);
  readonly themeService = inject(ThemeService);
  readonly sidebarOpen = signal(false);

  readonly navItems: AdminNavItem[] = [
    { label: 'Dashboard', route: '/admin', icon: 'layers', exact: true },
    { label: 'Users', route: '/admin/users', icon: 'users' },
    { label: 'Items Moderation', route: '/admin/items', icon: 'package' },
    { label: 'Claims Queue', route: '/admin/claims', icon: 'shield-check' },
    { label: 'Matches Overview', route: '/admin/matches', icon: 'sparkles' },
    { label: 'Categories', route: '/admin/categories', icon: 'filter' },
  ];

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
