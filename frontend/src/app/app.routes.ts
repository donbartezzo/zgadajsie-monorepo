import { Route } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { activeGuard } from './core/auth/active.guard';
import { adminGuard } from './core/auth/admin.guard';
import { paymentRedirectGuard } from './features/payments/guards/payment-redirect.guard';
import { eventResolver } from './core/guards/event.resolver';
import { verifiedUserGuard } from './core/guards/verified-user.guard';
import { participantGuard } from './core/guards/participant.guard';
import { organizerGuard } from './core/guards/organizer.guard';

export const appRoutes: Route[] = [
  // ── Home ──
  {
    path: '',
    loadComponent: () =>
      import('./features/home/pages/home/home.component').then((m) => m.HomeComponent),
    canActivate: [paymentRedirectGuard],
    data: { title: '', showHeader: false, showFooter: false },
  },

  // ── Public: event list per city ──
  {
    path: 'w/:citySlug',
    loadComponent: () =>
      import('./features/events/pages/events/events.component').then((m) => m.EventsComponent),
    data: { title: 'Wydarzenia' },
  },

  // ── Public: event detail ──
  {
    path: 'w/:citySlug/:id',
    loadComponent: () =>
      import('./features/event/pages/event/event.component').then((m) => m.EventComponent),
    resolve: { event: eventResolver },
    data: { title: 'Wydarzenie' },
  },

  // ── Verified users: participants ──
  {
    path: 'w/:citySlug/:id/participants',
    loadComponent: () =>
      import('./features/event/pages/event-participants/event-participants.component').then(
        (m) => m.EventParticipantsComponent,
      ),
    canActivate: [verifiedUserGuard],
    data: { title: 'Uczestnicy' },
  },

  // ── Verified users: chat with organizer ──
  {
    path: 'w/:citySlug/:id/host-chat',
    loadComponent: () =>
      import('./features/chat/pages/host-chat/host-chat.component').then(
        (m) => m.HostChatComponent,
      ),
    canActivate: [verifiedUserGuard],
    data: { title: 'Wiadomość do organizatora', showFooter: false },
  },

  // ── Participants: group chat ──
  {
    path: 'w/:citySlug/:id/chat',
    loadComponent: () =>
      import('./features/chat/pages/unified-chat/unified-chat.component').then(
        (m) => m.UnifiedChatComponent,
      ),
    canActivate: [verifiedUserGuard, participantGuard],
    data: { title: 'Czat', showFooter: false },
  },

  // ── Organizer: new event ──
  {
    path: 'o/w/new',
    loadComponent: () =>
      import('./features/events/pages/event-form/event-form.component').then(
        (m) => m.EventFormComponent,
      ),
    canActivate: [verifiedUserGuard],
    data: { title: 'Nowe wydarzenie' },
  },

  // ── Organizer: edit event ──
  {
    path: 'o/w/:id/edit',
    loadComponent: () =>
      import('./features/events/pages/event-form/event-form.component').then(
        (m) => m.EventFormComponent,
      ),
    canActivate: [verifiedUserGuard, organizerGuard],
    data: { title: 'Edycja wydarzenia' },
  },

  // ── Organizer: manage event ──
  {
    path: 'o/w/:id/manage',
    loadComponent: () =>
      import('./features/organizer/pages/event-manage/event-manage.component').then(
        (m) => m.EventManageComponent,
      ),
    canActivate: [verifiedUserGuard, organizerGuard],
    data: { title: 'Zarządzanie' },
  },

  // ── Organizer: conversation list ──
  {
    path: 'o/w/:id/conversations',
    loadComponent: () =>
      import('./features/chat/pages/host-chat/host-chat.component').then(
        (m) => m.HostChatComponent,
      ),
    canActivate: [verifiedUserGuard, organizerGuard],
    data: { title: 'Konwersacje', showFooter: false },
  },

  // ── Organizer: chat with participant ──
  {
    path: 'o/w/:id/conversations/:userId',
    loadComponent: () =>
      import('./features/chat/pages/unified-chat/unified-chat.component').then(
        (m) => m.UnifiedChatComponent,
      ),
    canActivate: [verifiedUserGuard, organizerGuard],
    data: { title: 'Wiadomość prywatna', isPrivate: true, showFooter: false },
  },

  // ── Utility (internal, skipLocationChange) ──
  {
    path: 'not-found',
    loadComponent: () =>
      import('./features/error/pages/not-found/not-found-page.component').then(
        (m) => m.NotFoundPageComponent,
      ),
    data: { title: 'Nie znaleziono' },
  },
  {
    path: 'unverified',
    loadComponent: () =>
      import('./features/auth/pages/unverified-account/unverified-account-page.component').then(
        (m) => m.UnverifiedAccountPageComponent,
      ),
    data: { title: 'Konto niezweryfikowane' },
  },

  // ── Auth ──
  {
    path: 'auth/login',
    loadComponent: () =>
      import('./features/auth/pages/login/login.component').then((m) => m.LoginComponent),
    data: { title: 'Logowanie' },
  },
  {
    path: 'auth/register',
    loadComponent: () =>
      import('./features/auth/pages/register/register.component').then((m) => m.RegisterComponent),
    data: { title: 'Rejestracja' },
  },
  {
    path: 'auth/activate',
    loadComponent: () =>
      import('./features/auth/pages/activate/activate.component').then((m) => m.ActivateComponent),
    data: { title: 'Aktywacja' },
  },
  {
    path: 'auth/forgot-password',
    loadComponent: () =>
      import('./features/auth/pages/forgot-password/forgot-password.component').then(
        (m) => m.ForgotPasswordComponent,
      ),
    data: { title: 'Odzyskiwanie hasła' },
  },
  {
    path: 'auth/reset-password',
    loadComponent: () =>
      import('./features/auth/pages/reset-password/reset-password.component').then(
        (m) => m.ResetPasswordComponent,
      ),
    data: { title: 'Reset hasła' },
  },

  // ── User ──
  {
    path: 'profile',
    loadComponent: () =>
      import('./features/user/pages/profile/profile.component').then((m) => m.ProfileComponent),
    canActivate: [authGuard],
    data: { title: 'Profil' },
  },
  {
    path: 'profile/events',
    loadComponent: () =>
      import('./features/user/pages/my-events/my-events.component').then(
        (m) => m.MyEventsComponent,
      ),
    canActivate: [authGuard, activeGuard],
    data: { title: 'Moje wydarzenia' },
  },
  {
    path: 'profile/participations',
    loadComponent: () =>
      import('./features/user/pages/my-participations/my-participations.component').then(
        (m) => m.MyParticipationsComponent,
      ),
    canActivate: [authGuard, activeGuard],
    data: { title: 'Moje uczestnictwa' },
  },
  {
    path: 'profile/media',
    loadComponent: () =>
      import('./features/user/pages/media-gallery/media-gallery.component').then(
        (m) => m.MediaGalleryComponent,
      ),
    canActivate: [authGuard, activeGuard],
    data: { title: 'Galeria' },
  },

  // ── Payments ──
  {
    path: 'payments',
    loadComponent: () =>
      import('./features/payments/pages/my-payments/my-payments.component').then(
        (m) => m.MyPaymentsComponent,
      ),
    canActivate: [authGuard, activeGuard],
    data: { title: 'Moje płatności' },
  },
  {
    path: 'vouchers',
    loadComponent: () =>
      import('./features/vouchers/pages/my-vouchers/my-vouchers.component').then(
        (m) => m.MyVouchersComponent,
      ),
    canActivate: [authGuard, activeGuard],
    data: { title: 'Moje vouchery' },
  },
  {
    path: 'payment/status',
    loadComponent: () =>
      import('./features/payments/pages/payment-status/payment-status.component').then(
        (m) => m.PaymentStatusComponent,
      ),
    data: { title: 'Status płatności' },
  },

  // ── Admin ──
  {
    path: 'admin',
    loadComponent: () =>
      import('./features/admin/pages/admin-dashboard/admin-dashboard.component').then(
        (m) => m.AdminDashboardComponent,
      ),
    canActivate: [adminGuard],
    data: { title: 'Panel admina' },
  },
  {
    path: 'admin/users',
    loadComponent: () =>
      import('./features/admin/pages/admin-users/admin-users.component').then(
        (m) => m.AdminUsersComponent,
      ),
    canActivate: [adminGuard],
    data: { title: 'Użytkownicy' },
  },
  {
    path: 'admin/users/:id',
    loadComponent: () =>
      import('./features/admin/pages/admin-user-detail/admin-user-detail.component').then(
        (m) => m.AdminUserDetailComponent,
      ),
    canActivate: [adminGuard],
    data: { title: 'Użytkownik' },
  },
  {
    path: 'admin/events',
    loadComponent: () =>
      import('./features/admin/pages/admin-events/admin-events.component').then(
        (m) => m.AdminEventsComponent,
      ),
    canActivate: [adminGuard],
    data: { title: 'Wydarzenia (admin)' },
  },
  {
    path: 'admin/cover-images',
    loadComponent: () =>
      import('./features/admin/pages/admin-cover-images/admin-cover-images.component').then(
        (m) => m.AdminCoverImagesComponent,
      ),
    canActivate: [adminGuard],
    data: { title: 'Galeria cover images' },
  },
  {
    path: 'admin/settings',
    loadComponent: () =>
      import('./features/admin/pages/admin-settings/admin-settings.component').then(
        (m) => m.AdminSettingsComponent,
      ),
    canActivate: [adminGuard],
    data: { title: 'Ustawienia' },
  },

  // ── Static ──
  {
    path: 'faq',
    loadComponent: () =>
      import('./features/static/pages/faq/faq.component').then((m) => m.FaqComponent),
    data: { title: 'FAQ' },
  },
  {
    path: 'contact',
    loadComponent: () =>
      import('./features/static/pages/contact/contact.component').then((m) => m.ContactComponent),
    data: { title: 'Kontakt' },
  },
  {
    path: 'privacy',
    loadComponent: () =>
      import('./features/static/pages/privacy/privacy.component').then((m) => m.PrivacyComponent),
    data: { title: 'Polityka prywatności' },
  },
  {
    path: 'terms',
    loadComponent: () =>
      import('./features/static/pages/terms/terms.component').then((m) => m.TermsComponent),
    data: { title: 'Regulamin' },
  },

  // ── Catch-all ──
  { path: '**', redirectTo: '' },
];
