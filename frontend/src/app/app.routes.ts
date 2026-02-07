import { Route } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { activeGuard } from './core/auth/active.guard';
import { adminGuard } from './core/auth/admin.guard';

export const appRoutes: Route[] = [
  { path: '', loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent) },
  { path: 'events', loadComponent: () => import('./features/events/events.component').then(m => m.EventsComponent) },
  { path: 'events/new', loadComponent: () => import('./features/events/event-form/event-form.component').then(m => m.EventFormComponent), canActivate: [authGuard, activeGuard] },
  { path: 'events/:id', loadComponent: () => import('./features/event/event.component').then(m => m.EventComponent) },
  { path: 'events/:id/edit', loadComponent: () => import('./features/events/event-form/event-form.component').then(m => m.EventFormComponent), canActivate: [authGuard, activeGuard] },
  { path: 'events/:id/manage', loadComponent: () => import('./features/organizer/event-manage.component').then(m => m.EventManageComponent), canActivate: [authGuard, activeGuard] },
  { path: 'events/:id/chat', loadComponent: () => import('./features/chat/event-chat.component').then(m => m.EventChatComponent), canActivate: [authGuard, activeGuard] },
  { path: 'auth/login', loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent) },
  { path: 'auth/register', loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent) },
  { path: 'auth/activate', loadComponent: () => import('./features/auth/activate/activate.component').then(m => m.ActivateComponent) },
  { path: 'auth/forgot-password', loadComponent: () => import('./features/auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent) },
  { path: 'auth/reset-password', loadComponent: () => import('./features/auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent) },
  { path: 'profile', loadComponent: () => import('./features/user/profile/profile.component').then(m => m.ProfileComponent), canActivate: [authGuard] },
  { path: 'profile/events', loadComponent: () => import('./features/user/my-events/my-events.component').then(m => m.MyEventsComponent), canActivate: [authGuard, activeGuard] },
  { path: 'profile/participations', loadComponent: () => import('./features/user/my-participations/my-participations.component').then(m => m.MyParticipationsComponent), canActivate: [authGuard, activeGuard] },
  { path: 'profile/media', loadComponent: () => import('./features/user/media-gallery/media-gallery.component').then(m => m.MediaGalleryComponent), canActivate: [authGuard, activeGuard] },
  { path: 'wallet', loadComponent: () => import('./features/wallet/wallet.component').then(m => m.WalletComponent), canActivate: [authGuard, activeGuard] },
  { path: 'admin', loadComponent: () => import('./features/admin/admin-dashboard.component').then(m => m.AdminDashboardComponent), canActivate: [adminGuard] },
  { path: 'admin/users', loadComponent: () => import('./features/admin/admin-users.component').then(m => m.AdminUsersComponent), canActivate: [adminGuard] },
  { path: 'admin/users/:id', loadComponent: () => import('./features/admin/admin-user-detail.component').then(m => m.AdminUserDetailComponent), canActivate: [adminGuard] },
  { path: 'admin/events', loadComponent: () => import('./features/admin/admin-events.component').then(m => m.AdminEventsComponent), canActivate: [adminGuard] },
  { path: 'admin/settings', loadComponent: () => import('./features/admin/admin-settings.component').then(m => m.AdminSettingsComponent), canActivate: [adminGuard] },
  { path: 'faq', loadComponent: () => import('./features/static/faq/faq.component').then(m => m.FaqComponent) },
  { path: 'contact', loadComponent: () => import('./features/static/contact/contact.component').then(m => m.ContactComponent) },
  { path: 'privacy', loadComponent: () => import('./features/static/privacy/privacy.component').then(m => m.PrivacyComponent) },
  { path: 'terms', loadComponent: () => import('./features/static/terms/terms.component').then(m => m.TermsComponent) },
  { path: '**', redirectTo: '' },
];
