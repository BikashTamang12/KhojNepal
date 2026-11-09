import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./shared/layouts/public-layout/public-layout').then(
        (m) => m.PublicLayout
      ),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/home/pages/home/home').then(
            (m) => m.Home
          ),
      },
      {
        path: 'login',
        loadComponent: () =>
          import('./features/auth/pages/login/login').then(
            (m) => m.Login
          ),
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./features/auth/pages/register/register').then(
            (m) => m.Register
          ),
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];