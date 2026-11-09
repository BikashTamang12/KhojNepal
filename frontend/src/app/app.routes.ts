import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
  {
    path: 'items/my',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./shared/layouts/workspace-layout/workspace-layout').then(
        (m) => m.WorkspaceLayout,
      ),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/items/pages/item-list/item-list').then(
            (m) => m.ItemList,
          ),
      },
    ],
  },
  {
    path: 'items/report-lost',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./shared/layouts/workspace-layout/workspace-layout').then(
        (m) => m.WorkspaceLayout,
      ),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/items/pages/report-lost/report-lost').then(
            (m) => m.ReportLost,
          ),
      },
    ],
  },
  {
    path: 'items/report-found',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./shared/layouts/workspace-layout/workspace-layout').then(
        (m) => m.WorkspaceLayout,
      ),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/items/pages/report-found/report-found').then(
            (m) => m.ReportFound,
          ),
      },
    ],
  },
  {
    path: 'matching',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./shared/layouts/workspace-layout/workspace-layout').then(
        (m) => m.WorkspaceLayout,
      ),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/matching/pages/match-list/match-list').then(
            (m) => m.MatchList,
          ),
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./features/matching/pages/match-detail/match-detail').then(
            (m) => m.MatchDetail,
          ),
      },
    ],
  },
  {
    path: 'claims',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./shared/layouts/workspace-layout/workspace-layout').then(
        (m) => m.WorkspaceLayout,
      ),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/claims/pages/claim-list/claim-list').then(
            (m) => m.ClaimList,
          ),
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./features/claims/pages/claim-detail/claim-detail').then(
            (m) => m.ClaimDetail,
          ),
      },
    ],
  },
  {
    path: 'notifications',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./shared/layouts/workspace-layout/workspace-layout').then(
        (m) => m.WorkspaceLayout,
      ),
    children: [
      {
        path: '',
        loadComponent: () =>
          import(
            './features/notifications/pages/notification-list/notification-list'
          ).then((m) => m.NotificationList),
      },
    ],
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./shared/layouts/workspace-layout/workspace-layout').then(
        (m) => m.WorkspaceLayout,
      ),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/users/pages/profile/profile').then(
            (m) => m.Profile,
          ),
      },
    ],
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./shared/layouts/admin-layout/admin-layout').then(
        (m) => m.AdminLayout,
      ),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/admin/pages/admin-dashboard/admin-dashboard').then(
            (m) => m.AdminDashboard,
          ),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./features/admin/pages/user-management/user-management').then(
            (m) => m.UserManagement,
          ),
      },
      {
        path: 'items',
        loadComponent: () =>
          import('./features/admin/pages/item-management/item-management').then(
            (m) => m.ItemManagement,
          ),
      },
      {
        path: 'claims',
        loadComponent: () =>
          import(
            './features/admin/pages/claim-management/claim-management'
          ).then((m) => m.ClaimManagement),
      },
      {
        path: 'matches',
        loadComponent: () =>
          import(
            './features/admin/pages/match-management/match-management'
          ).then((m) => m.MatchManagement),
      },
      {
        path: 'categories',
        loadComponent: () =>
          import(
            './features/admin/pages/category-management/category-management'
          ).then((m) => m.CategoryManagement),
      },
    ],
  },
  {
    path: '',
    loadComponent: () =>
      import('./shared/layouts/public-layout/public-layout').then(
        (m) => m.PublicLayout,
      ),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/home/pages/home/home').then((m) => m.Home),
      },
      {
        path: 'about',
        loadComponent: () =>
          import('./features/home/pages/about/about').then((m) => m.About),
      },
      {
        path: 'items',
        loadComponent: () =>
          import('./features/items/pages/browse-items/browse-items').then(
            (m) => m.BrowseItems,
          ),
      },
      {
        path: 'items/:id',
        loadComponent: () =>
          import('./features/items/pages/item-detail/item-detail').then(
            (m) => m.ItemDetail,
          ),
      },
      {
        path: 'login',
        loadComponent: () =>
          import('./features/auth/pages/login/login').then((m) => m.Login),
      },
      {
        path: 'register',
        canActivate: [guestGuard],
        loadComponent: () =>
          import('./features/auth/pages/register/register').then(
            (m) => m.Register,
          ),
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
