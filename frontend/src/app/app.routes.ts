import { Route } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { activeGuard } from './core/auth/active.guard';
import { adminGuard } from './core/auth/admin.guard';

export const appRoutes: Route[] = [
  { path: '', loadComponent: () => import('./features/home/pages/home/home.component').then(m => m.HomeComponent), data: { title: '' } },
  { path: 'events', loadComponent: () => import('./features/events/pages/events/events.component').then(m => m.EventsComponent), data: { title: 'Wydarzenia' } },
  { path: 'events/new', loadComponent: () => import('./features/events/pages/event-form/event-form.component').then(m => m.EventFormComponent), canActivate: [authGuard, activeGuard], data: { title: 'Nowe wydarzenie' } },
  { path: 'events/:id', loadComponent: () => import('./features/event/pages/event/event.component').then(m => m.EventComponent), data: { title: 'Wydarzenie' } },
  { path: 'events/:id/edit', loadComponent: () => import('./features/events/pages/event-form/event-form.component').then(m => m.EventFormComponent), canActivate: [authGuard, activeGuard], data: { title: 'Edycja wydarzenia' } },
  { path: 'events/:id/manage', loadComponent: () => import('./features/organizer/pages/event-manage/event-manage.component').then(m => m.EventManageComponent), canActivate: [authGuard, activeGuard], data: { title: 'Zarządzanie' } },
  { path: 'events/:id/chat', loadComponent: () => import('./features/chat/pages/event-chat/event-chat.component').then(m => m.EventChatComponent), canActivate: [authGuard, activeGuard], data: { title: 'Czat' } },
  { path: 'auth/login', loadComponent: () => import('./features/auth/pages/login/login.component').then(m => m.LoginComponent), data: { title: 'Logowanie' } },
  { path: 'auth/register', loadComponent: () => import('./features/auth/pages/register/register.component').then(m => m.RegisterComponent), data: { title: 'Rejestracja' } },
  { path: 'auth/activate', loadComponent: () => import('./features/auth/pages/activate/activate.component').then(m => m.ActivateComponent), data: { title: 'Aktywacja' } },
  { path: 'auth/forgot-password', loadComponent: () => import('./features/auth/pages/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent), data: { title: 'Odzyskiwanie hasła' } },
  { path: 'auth/reset-password', loadComponent: () => import('./features/auth/pages/reset-password/reset-password.component').then(m => m.ResetPasswordComponent), data: { title: 'Reset hasła' } },
  { path: 'profile', loadComponent: () => import('./features/user/pages/profile/profile.component').then(m => m.ProfileComponent), canActivate: [authGuard], data: { title: 'Profil' } },
  { path: 'profile/events', loadComponent: () => import('./features/user/pages/my-events/my-events.component').then(m => m.MyEventsComponent), canActivate: [authGuard, activeGuard], data: { title: 'Moje wydarzenia' } },
  { path: 'profile/participations', loadComponent: () => import('./features/user/pages/my-participations/my-participations.component').then(m => m.MyParticipationsComponent), canActivate: [authGuard, activeGuard], data: { title: 'Moje uczestnictwa' } },
  { path: 'profile/media', loadComponent: () => import('./features/user/pages/media-gallery/media-gallery.component').then(m => m.MediaGalleryComponent), canActivate: [authGuard, activeGuard], data: { title: 'Galeria' } },
  { path: 'wallet', loadComponent: () => import('./features/wallet/pages/wallet/wallet.component').then(m => m.WalletComponent), canActivate: [authGuard, activeGuard], data: { title: 'Portfel' } },
  { path: 'admin', loadComponent: () => import('./features/admin/pages/admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent), canActivate: [adminGuard], data: { title: 'Panel admina' } },
  { path: 'admin/users', loadComponent: () => import('./features/admin/pages/admin-users/admin-users.component').then(m => m.AdminUsersComponent), canActivate: [adminGuard], data: { title: 'Użytkownicy' } },
  { path: 'admin/users/:id', loadComponent: () => import('./features/admin/pages/admin-user-detail/admin-user-detail.component').then(m => m.AdminUserDetailComponent), canActivate: [adminGuard], data: { title: 'Użytkownik' } },
  { path: 'admin/events', loadComponent: () => import('./features/admin/pages/admin-events/admin-events.component').then(m => m.AdminEventsComponent), canActivate: [adminGuard], data: { title: 'Wydarzenia (admin)' } },
  { path: 'admin/settings', loadComponent: () => import('./features/admin/pages/admin-settings/admin-settings.component').then(m => m.AdminSettingsComponent), canActivate: [adminGuard], data: { title: 'Ustawienia' } },
  { path: 'faq', loadComponent: () => import('./features/static/pages/faq/faq.component').then(m => m.FaqComponent), data: { title: 'FAQ' } },
  { path: 'contact', loadComponent: () => import('./features/static/pages/contact/contact.component').then(m => m.ContactComponent), data: { title: 'Kontakt' } },
  { path: 'privacy', loadComponent: () => import('./features/static/pages/privacy/privacy.component').then(m => m.PrivacyComponent), data: { title: 'Polityka prywatności' } },
  { path: 'terms', loadComponent: () => import('./features/static/pages/terms/terms.component').then(m => m.TermsComponent), data: { title: 'Regulamin' } },
  { path: '**', redirectTo: '' },
];
