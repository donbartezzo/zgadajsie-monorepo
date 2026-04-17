import { isDevMode } from '@angular/core';
import { Route } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { activeGuard } from './core/auth/active.guard';
import { adminGuard } from './core/auth/admin.guard';
import { paymentRedirectGuard } from './features/payments/guards/payment-redirect.guard';
import { eventResolver } from './core/guards/event.resolver';
import { setEventResolvedTitle } from './core/guards/event-seo-title.resolver';
import { verifiedUserGuard } from './core/guards/verified-user.guard';
import { organizerGuard } from './core/guards/organizer.guard';
import { eventCreationGuard } from './core/guards/event-creation.guard';

const WHITE_BARE_LAYOUT = {
  showBorder: false,
  showFooter: false,
  showHeader: false,
  centerContent: true,
  layoutClass: 'bg-white',
  contentClass: 'bg-transparent',
} as const;

const BREADCRUMB_TO_HOME = {
  parent: '/',
  label: 'Strona główna',
} as const;

const BREADCRUMB_TO_PROFILE = {
  parent: '/profile',
  label: 'Profil użytkownika',
} as const;

export const appRoutes: Route[] = [
  // ── Home ──
  {
    path: '',
    loadComponent: () =>
      import('./features/home/pages/home/home.component').then((m) => m.HomeComponent),
    canActivate: [paymentRedirectGuard],
    data: { title: 'Strona główna', centerContent: true, showFooter: false },
  },

  // ── Public: event list per city ──
  {
    path: 'w/:citySlug',
    loadComponent: () =>
      import('./features/events/pages/events/events.component').then((m) => m.EventsComponent),
    data: {
      breadcrumb: BREADCRUMB_TO_HOME,
      showBorder: false,
      showHeader: true,
      heroVariant: 'extended',
    },
  },

  // ── Event area (parent route for all event subpages) ──
  {
    path: 'w/:citySlug/:id',
    loadComponent: () =>
      import('./features/event/pages/event-area/event-area.component').then(
        (m) => m.EventAreaComponent,
      ),
    data: {
      breadcrumb: { parent: '/w/:citySlug/:id', label: 'Wydarzenie' },
      showBorder: true,
      showHeader: true,
      heroVariant: 'extended',
    },
    resolve: { event: eventResolver },
    children: [
      // Event detail (default child)
      {
        path: '',
        loadComponent: () =>
          import('./features/event/pages/event-detail/event-detail.component').then(
            (m) => m.EventDetailComponent,
          ),
        resolve: setEventResolvedTitle('Szczegóły wydarzenia'),
        data: {
          breadcrumb: { parent: '/w/:citySlug', label: 'Lista wydarzeń' }, // Nadpisuje domyślne z parenta!
          contentClass: 'bg-white',
        },
      },
      // Participants list
      {
        path: 'participants',
        loadComponent: () =>
          import('./features/event/pages/event-participants/event-participants.component').then(
            (m) => m.EventParticipantsComponent,
          ),
        canActivate: [verifiedUserGuard],
        resolve: setEventResolvedTitle('Lista uczestników wydarzenia'),
        data: {
          showFooter: false,
          showBorder: false,
        },
      },
      // Chat with organizer (participant view) / Conversation list (organizer view)
      {
        path: 'host-chat',
        loadComponent: () =>
          import('./features/chat/pages/host-chat/host-chat.component').then(
            (m) => m.HostChatComponent,
          ),
        canActivate: [verifiedUserGuard],
        resolve: setEventResolvedTitle('Czat z organizatorem'),
        data: {
          showFooter: false,
          showBorder: false,
          contentClass: 'bg-white',
        },
      },
      // Organizer private chat with specific participant
      {
        path: 'host-chat/:userId',
        loadComponent: () =>
          import('./features/chat/pages/unified-chat/unified-chat.component').then(
            (m) => m.UnifiedChatComponent,
          ),
        canActivate: [verifiedUserGuard],
        data: {
          isPrivate: true,
          showFooter: false,
          contentClass: 'bg-white',
          breadcrumb: { parent: '/w/:citySlug/:id/host-chat', label: 'Konwersacje' },
        },
      },
      // Group chat (participants only)
      {
        path: 'chat',
        loadComponent: () =>
          import('./features/chat/pages/unified-chat/unified-chat.component').then(
            (m) => m.UnifiedChatComponent,
          ),
        resolve: setEventResolvedTitle('Czat grupowy'),
        canActivate: [verifiedUserGuard],
        data: {
          showFooter: false,
          showBorder: false,
          contentClass: 'bg-white',
        },
      },
    ],
  },

  // ── Organizer: new event ──
  {
    path: 'o/w/new',
    loadComponent: () =>
      import('./features/events/pages/event-form/event-form.component').then(
        (m) => m.EventFormComponent,
      ),
    canActivate: [verifiedUserGuard, eventCreationGuard],
    data: {
      title: 'Nowe wydarzenie',
      breadcrumb: { parent: '/profile/events', label: 'Moje wydarzenia' },
    },
  },

  // ── Organizer: edit event ──
  {
    path: 'o/w/:id/edit',
    loadComponent: () =>
      import('./features/events/pages/event-form/event-form.component').then(
        (m) => m.EventFormComponent,
      ),
    canActivate: [verifiedUserGuard, organizerGuard],
    data: {
      title: 'Edycja wydarzenia',
    },
  },

  // ── Organizer: manage event ──
  {
    path: 'o/w/:id/manage',
    loadComponent: () =>
      import('./features/organizer/pages/event-manage/event-manage.component').then(
        (m) => m.EventManageComponent,
      ),
    canActivate: [verifiedUserGuard, organizerGuard],
    data: {
      title: 'Zarządzanie',
    },
  },

  // ── Announcement confirm (from email link, no auth required) ──
  {
    path: 'announcements/confirm/:token',
    loadComponent: () =>
      import('./features/announcements/pages/confirm-announcement/confirm-announcement.component').then(
        (m) => m.ConfirmAnnouncementComponent,
      ),
    data: {
      title: 'Potwierdzenie komunikatu',
      ...WHITE_BARE_LAYOUT,
    },
  },

  // ── Utility (internal, skipLocationChange) ──
  {
    path: 'not-found',
    loadComponent: () =>
      import('./features/error/pages/not-found/not-found-page.component').then(
        (m) => m.NotFoundPageComponent,
      ),
    data: {
      title: 'Nie znaleziono',
      breadcrumb: BREADCRUMB_TO_HOME,
      ...WHITE_BARE_LAYOUT,
    },
  },
  {
    path: 'unverified',
    loadComponent: () =>
      import('./features/auth/pages/unverified-account/unverified-account-page.component').then(
        (m) => m.UnverifiedAccountPageComponent,
      ),
    data: { title: 'Konto niezweryfikowane', ...WHITE_BARE_LAYOUT },
  },

  // ── Auth ──
  {
    path: 'auth/login',
    loadComponent: () =>
      import('./features/auth/pages/login/login.component').then((m) => m.LoginComponent),
    data: { title: 'Logowanie', ...WHITE_BARE_LAYOUT },
  },
  {
    path: 'auth/register',
    loadComponent: () =>
      import('./features/auth/pages/register/register.component').then((m) => m.RegisterComponent),
    data: { title: 'Rejestracja', ...WHITE_BARE_LAYOUT },
  },
  {
    path: 'auth/activate',
    loadComponent: () =>
      import('./features/auth/pages/activate/activate.component').then((m) => m.ActivateComponent),
    data: { title: 'Aktywacja', ...WHITE_BARE_LAYOUT },
  },
  {
    path: 'auth/forgot-password',
    loadComponent: () =>
      import('./features/auth/pages/forgot-password/forgot-password.component').then(
        (m) => m.ForgotPasswordComponent,
      ),
    data: { title: 'Odzyskiwanie hasła', ...WHITE_BARE_LAYOUT },
  },
  {
    path: 'auth/reset-password',
    loadComponent: () =>
      import('./features/auth/pages/reset-password/reset-password.component').then(
        (m) => m.ResetPasswordComponent,
      ),
    data: { title: 'Reset hasła', ...WHITE_BARE_LAYOUT },
  },

  // ── User ──
  {
    path: 'profile',
    loadComponent: () =>
      import('./features/user/pages/profile/profile.component').then((m) => m.ProfileComponent),
    canActivate: [authGuard],
    data: { title: 'Profil', breadcrumb: BREADCRUMB_TO_HOME },
  },
  {
    path: 'profile/events',
    loadComponent: () =>
      import('./features/user/pages/my-events/my-events.component').then(
        (m) => m.MyEventsComponent,
      ),
    canActivate: [authGuard, activeGuard],
    data: {
      title: 'Moje wydarzenia',
      breadcrumb: BREADCRUMB_TO_PROFILE,
    },
  },
  {
    path: 'profile/participations',
    loadComponent: () =>
      import('./features/user/pages/my-participations/my-participations.component').then(
        (m) => m.MyParticipationsComponent,
      ),
    canActivate: [authGuard, activeGuard],
    data: {
      title: 'Moje uczestnictwa',
      breadcrumb: BREADCRUMB_TO_PROFILE,
    },
  },
  {
    path: 'profile/media',
    loadComponent: () =>
      import('./features/user/pages/media-gallery/media-gallery.component').then(
        (m) => m.MediaGalleryComponent,
      ),
    canActivate: [authGuard, activeGuard],
    data: { title: 'Galeria', breadcrumb: BREADCRUMB_TO_PROFILE },
  },

  // ── Payments ──
  {
    path: 'payments',
    loadComponent: () =>
      import('./features/payments/pages/my-payments/my-payments.component').then(
        (m) => m.MyPaymentsComponent,
      ),
    canActivate: [authGuard, activeGuard],
    data: {
      title: 'Moje płatności',
      breadcrumb: BREADCRUMB_TO_PROFILE,
    },
  },
  {
    path: 'vouchers',
    loadComponent: () =>
      import('./features/vouchers/pages/my-vouchers/my-vouchers.component').then(
        (m) => m.MyVouchersComponent,
      ),
    canActivate: [authGuard, activeGuard],
    data: {
      title: 'Moje vouchery',
      breadcrumb: BREADCRUMB_TO_PROFILE,
    },
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
    data: {
      title: 'Panel admina',
      breadcrumb: BREADCRUMB_TO_PROFILE,
    },
  },
  {
    path: 'admin/users',
    loadComponent: () =>
      import('./features/admin/pages/admin-users/admin-users.component').then(
        (m) => m.AdminUsersComponent,
      ),
    canActivate: [adminGuard],
    data: {
      title: 'Użytkownicy',
      breadcrumb: { parent: '/admin', label: 'Panel admina' },
    },
  },
  {
    path: 'admin/users/:id',
    loadComponent: () =>
      import('./features/admin/pages/admin-user-detail/admin-user-detail.component').then(
        (m) => m.AdminUserDetailComponent,
      ),
    canActivate: [adminGuard],
    data: {
      title: 'Użytkownik',
      breadcrumb: { parent: '/admin/users', label: 'Lista użytkowników' },
    },
  },
  {
    path: 'admin/events',
    loadComponent: () =>
      import('./features/admin/pages/admin-events/admin-events.component').then(
        (m) => m.AdminEventsComponent,
      ),
    canActivate: [adminGuard],
    data: {
      title: 'Wydarzenia (admin)',
      breadcrumb: { parent: '/admin', label: 'Panel admina' },
    },
  },
  {
    path: 'admin/cover-images',
    loadComponent: () =>
      import('./features/admin/pages/admin-cover-images/admin-cover-images.component').then(
        (m) => m.AdminCoverImagesComponent,
      ),
    canActivate: [adminGuard],
    data: {
      title: 'Galeria cover images',
      breadcrumb: { parent: '/admin', label: 'Panel admina' },
    },
  },
  {
    path: 'admin/settings',
    loadComponent: () =>
      import('./features/admin/pages/admin-settings/admin-settings.component').then(
        (m) => m.AdminSettingsComponent,
      ),
    canActivate: [adminGuard],
    data: {
      title: 'Ustawienia',
      breadcrumb: { parent: '/admin', label: 'Panel admina' },
    },
  },

  // ── Static ──
  {
    path: 'faq',
    loadComponent: () =>
      import('./features/static/pages/faq/faq.component').then((m) => m.FaqComponent),
    data: {
      title: 'Baza wiedzy',
      subtitle: 'Często zadawane pytania. Jeśli nie znajdziesz odpowiedzi, skontaktuj się z nami.',
      breadcrumb: BREADCRUMB_TO_HOME,
      showHeader: true,
    },
  },
  {
    path: 'join-us',
    loadComponent: () =>
      import('./features/static/pages/join-us/join-us.component').then((m) => m.JoinUsComponent),
    data: {
      title: 'Dołącz do nas',
      subtitle: 'Szukamy osób do współpracy',
      breadcrumb: BREADCRUMB_TO_HOME,
      showHeader: true,
    },
  },
  {
    path: 'contact',
    loadComponent: () =>
      import('./features/static/pages/contact/contact.component').then((m) => m.ContactComponent),
    data: {
      title: 'Kontakt',
      subtitle: 'Skontaktuj się z nami',
      breadcrumb: BREADCRUMB_TO_HOME,
      showHeader: true,
    },
  },
  {
    path: 'privacy',
    loadComponent: () =>
      import('./features/static/pages/privacy/privacy.component').then((m) => m.PrivacyComponent),
    data: {
      title: 'Polityka prywatności',
      subtitle: 'Twoja prywatność jest naszym priorytetem. Dowiedz się jak chronimy Twoje dane.',
      breadcrumb: BREADCRUMB_TO_HOME,
      showHeader: true,
    },
  },
  {
    path: 'terms',
    loadComponent: () =>
      import('./features/static/pages/terms/terms.component').then((m) => m.TermsComponent),
    data: {
      title: 'Regulamin serwisu',
      subtitle: 'Zasady korzystania z platformy. Poznaj swoje prawa i obowiązki.',
      breadcrumb: BREADCRUMB_TO_HOME,
      showHeader: true,
    },
  },

  // ── Dev-only: Design System ──
  ...(isDevMode()
    ? [
        {
          path: 'dev/design-system',
          loadComponent: () =>
            import('./features/dev/pages/design-system/design-system.component').then(
              (m) => m.DesignSystemComponent,
            ),
          data: {
            title: 'Design System',
            showBorder: false,
            showFooter: false,
            showHeader: false,
          },
        },
        {
          path: 'dev/participation-status-matrix',
          loadComponent: () =>
            import('./features/dev/pages/participation-status-matrix/participation-status-matrix.component').then(
              (m) => m.ParticipationStatusMatrixComponent,
            ),
          data: {
            title: 'Matryca statusów uczestnictwa',
            showBorder: false,
            showFooter: false,
            showHeader: false,
          },
        },
      ]
    : []),

  // ── Catch-all ──
  { path: '**', redirectTo: '' },
];
