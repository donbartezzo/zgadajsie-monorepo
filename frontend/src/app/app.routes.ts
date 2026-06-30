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

// RWD-19: wspólny layout dla wszystkich czatów strefy wydarzenia. Fullscreen (czat wypełnia wysokość)
// + only-mini-bar; od `lg` tryb 2-kol → czat jako biała karta w kolumnie głównej + event-rail w aside
// (rail dostarcza EventAreaComponent). Bez `layoutClass` (tło boxa neutralne; biała karta z contentClass).
const CHAT_LAYOUT = {
  heroVariant: 'only-mini-bar',
  showFooter: false,
  showBorder: false,
  fullscreenContent: true,
  contentClass: 'bg-white',
  desktopLayout: 'two-column',
} as const;

const BREADCRUMB_TO_HOME = {
  parent: '/',
  label: 'Strona główna',
} as const;

const BREADCRUMB_TO_PROFILE = {
  parent: '/profile',
  label: 'Profil użytkownika',
} as const;

const BREADCRUMB_TO_EVENTS = {
  parent: '/profile/organizer/events',
  label: 'Moje wydarzenia',
} as const;

export const appRoutes: Route[] = [
  // ── Home ──
  {
    path: '',
    loadComponent: () =>
      import('./features/home/pages/home/home.component').then((m) => m.HomeComponent),
    canActivate: [paymentRedirectGuard],
    data: { title: 'Strona główna', fullscreenContent: true, showFooter: false },
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
      desktopLayout: 'wide',
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
          desktopLayout: 'two-column',
        },
      },
      // Participants list
      {
        path: 'participants',
        loadComponent: () =>
          import('./features/event/pages/event-enrollments/event-enrollments.component').then(
            (m) => m.EventEnrollmentsComponent,
          ),
        canActivate: [verifiedUserGuard],
        resolve: setEventResolvedTitle('Lista uczestników wydarzenia'),
        data: {
          heroVariant: 'only-mini-bar',
          showFooter: false,
          showBorder: false,
        },
      },
      // Event map
      {
        path: 'map',
        loadComponent: () =>
          import('./features/event/pages/event-map/event-map.component').then(
            (m) => m.EventMapComponent,
          ),
        resolve: setEventResolvedTitle('Mapa wydarzenia'),
        data: {
          ...WHITE_BARE_LAYOUT,
          centerContent: false,
          heroVariant: 'only-mini-bar',
          fullscreenContent: true,
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
        data: { ...CHAT_LAYOUT },
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
          ...CHAT_LAYOUT,
          isPrivate: true,
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
        data: { ...CHAT_LAYOUT },
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
      breadcrumb: { parent: '/profile/organizer/events', label: 'Moje wydarzenia' },
      desktopLayout: 'two-column',
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
      desktopLayout: 'two-column',
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
      desktopLayout: 'two-column',
    },
  },

  // ── Organizer: create series from event ──
  {
    path: 'o/w/:id/create-series',
    loadComponent: () =>
      import('./features/organizer/pages/create-series-from-event/create-series-from-event.component').then(
        (m) => m.CreateSeriesFromEventComponent,
      ),
    canActivate: [verifiedUserGuard, organizerGuard],
    data: {
      title: 'Utwórz serię z wydarzenia',
      breadcrumb: { parent: '/profile/organizer/events', label: 'Moje wydarzenia' },
    },
  },

  // ── Organizer: series details ──
  {
    path: 'series/:id',
    loadComponent: () =>
      import('./features/organizer/pages/series-details/series-details.component').then(
        (m) => m.SeriesDetailsComponent,
      ),
    canActivate: [verifiedUserGuard],
    data: {
      title: 'Seria wydarzeń',
      breadcrumb: BREADCRUMB_TO_EVENTS,
      desktopLayout: 'two-column',
    },
  },

  // ── Organizer: edit series template ──
  {
    path: 'o/s/:seriesId/edit-template',
    loadComponent: () =>
      import('./features/events/pages/event-form/event-form.component').then(
        (m) => m.EventFormComponent,
      ),
    canActivate: [verifiedUserGuard],
    data: {
      title: 'Edycja danych wydarzeń serii',
      breadcrumb: BREADCRUMB_TO_EVENTS,
      desktopLayout: 'two-column',
    },
  },

  // ── Public: confirm series event by email token ──
  {
    path: 'o/confirm-event',
    loadComponent: () =>
      import('./features/organizer/pages/confirm-event/confirm-event.component').then(
        (m) => m.ConfirmEventComponent,
      ),
    data: {
      title: 'Potwierdzenie wydarzenia',
      ...WHITE_BARE_LAYOUT,
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

  // ── Account panel (parent route dla wszystkich podstron /profile/**) ──
  // Analogicznie do strefy wydarzenia (EventArea): rail nawigacyjny konta rejestrowany RAZ w
  // `ProfileAreaComponent`, który przeżywa nawigację między dziećmi (rail nie miga). Podział na
  // kategorie: `general` (Konto), `enrollment` (Uczestnik), `organizer` (Organizator).
  {
    path: 'profile',
    loadComponent: () =>
      import('./features/user/pages/profile-area/profile-area.component').then(
        (m) => m.ProfileAreaComponent,
      ),
    canActivate: [authGuard],
    children: [
      // Profil (index)
      {
        path: '',
        loadComponent: () =>
          import('./features/user/pages/profile/profile.component').then((m) => m.ProfileComponent),
        data: {
          title: 'Profil',
          breadcrumb: BREADCRUMB_TO_HOME,
          desktopLayout: 'two-column',
        },
      },

      // ── Konto (general) ──
      {
        path: 'general/notifications',
        loadComponent: () =>
          import('./features/notifications/pages/notifications/notifications-page.component').then(
            (m) => m.NotificationsPageComponent,
          ),
        data: {
          title: 'Powiadomienia',
          breadcrumb: BREADCRUMB_TO_PROFILE,
          desktopLayout: 'two-column',
        },
      },

      // ── Uczestnik (enrollment) ──
      {
        path: 'enrollment/participations',
        loadComponent: () =>
          import('./features/user/pages/my-participations/my-participations.component').then(
            (m) => m.MyParticipationsComponent,
          ),
        canActivate: [activeGuard],
        data: {
          title: 'Moje uczestnictwa',
          breadcrumb: BREADCRUMB_TO_PROFILE,
          desktopLayout: 'two-column',
        },
      },
      {
        path: 'enrollment/media',
        loadComponent: () =>
          import('./features/user/pages/media-gallery/media-gallery.component').then(
            (m) => m.MediaGalleryComponent,
          ),
        canActivate: [activeGuard],
        data: { title: 'Galeria', breadcrumb: BREADCRUMB_TO_PROFILE, desktopLayout: 'two-column' },
      },
      {
        path: 'enrollment/payments',
        loadComponent: () =>
          import('./features/payments/pages/my-payments/my-payments.component').then(
            (m) => m.MyPaymentsComponent,
          ),
        canActivate: [activeGuard],
        data: {
          title: 'Moje płatności',
          breadcrumb: BREADCRUMB_TO_PROFILE,
          desktopLayout: 'two-column',
        },
      },
      {
        path: 'enrollment/vouchers',
        loadComponent: () =>
          import('./features/vouchers/pages/my-vouchers/my-vouchers.component').then(
            (m) => m.MyVouchersComponent,
          ),
        canActivate: [activeGuard],
        data: {
          title: 'Moje vouchery',
          breadcrumb: BREADCRUMB_TO_PROFILE,
          desktopLayout: 'two-column',
        },
      },

      // ── Organizator ──
      {
        path: 'organizer/events',
        loadComponent: () =>
          import('./features/user/pages/my-events/my-events.component').then(
            (m) => m.MyEventsComponent,
          ),
        canActivate: [activeGuard],
        data: {
          title: 'Moje wydarzenia',
          breadcrumb: BREADCRUMB_TO_PROFILE,
          desktopLayout: 'two-column',
        },
      },
      {
        path: 'organizer/digest',
        loadComponent: () =>
          import('./features/organizer/pages/organizer-digest/organizer-digest.component').then(
            (m) => m.OrganizerDigestComponent,
          ),
        canActivate: [activeGuard],
        data: {
          title: 'Zestawienie organizatora',
          breadcrumb: BREADCRUMB_TO_PROFILE,
          desktopLayout: 'two-column',
        },
      },
      {
        path: 'organizer/settings',
        loadComponent: () =>
          import('./features/organizer/pages/organizer-settings/organizer-settings.component').then(
            (m) => m.OrganizerSettingsComponent,
          ),
        canActivate: [activeGuard],
        data: {
          title: 'Ustawienia organizatora',
          breadcrumb: BREADCRUMB_TO_PROFILE,
          desktopLayout: 'two-column',
        },
      },
      {
        path: 'organizer/cover-images',
        loadComponent: () =>
          import('./features/me/pages/my-cover-images/my-cover-images.component').then(
            (m) => m.MyCoverImagesComponent,
          ),
        canActivate: [activeGuard],
        data: {
          title: 'Moja galeria cover images',
          breadcrumb: BREADCRUMB_TO_PROFILE,
          desktopLayout: 'two-column',
        },
      },

      // ── Back-compat: stare ścieżki /profile/* → nowe (kategoryzowane) ──
      { path: 'events', redirectTo: '/profile/organizer/events', pathMatch: 'full' },
      {
        path: 'participations',
        redirectTo: '/profile/enrollment/participations',
        pathMatch: 'full',
      },
      { path: 'media', redirectTo: '/profile/enrollment/media', pathMatch: 'full' },
    ],
  },

  // ── Back-compat: stare top-level ścieżki panelu → nowe ──
  { path: 'notifications', redirectTo: '/profile/general/notifications', pathMatch: 'full' },
  { path: 'payments', redirectTo: '/profile/enrollment/payments', pathMatch: 'full' },
  { path: 'vouchers', redirectTo: '/profile/enrollment/vouchers', pathMatch: 'full' },

  // ── Payments ──
  {
    path: 'payment/status',
    loadComponent: () =>
      import('./features/payments/pages/payment-status/payment-status.component').then(
        (m) => m.PaymentStatusComponent,
      ),
    data: { title: 'Status płatności' },
  },

  // ── Admin ──
  // Parent route `AdminAreaComponent` — dwukolumnowo jak reszta paneli (main 700 + aside),
  // aside z LEWEJ. Rail admina rejestrowany raz (nie miga). `desktopLayout`/`asideSide` dziedziczone.
  {
    path: 'admin',
    loadComponent: () =>
      import('./features/admin/pages/admin-area/admin-area.component').then(
        (m) => m.AdminAreaComponent,
      ),
    canActivate: [adminGuard],
    data: { desktopLayout: 'two-column', asideSide: 'left' },
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/admin/pages/admin-dashboard/admin-dashboard.component').then(
            (m) => m.AdminDashboardComponent,
          ),
        data: { title: 'Panel admina', breadcrumb: BREADCRUMB_TO_PROFILE },
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./features/admin/pages/admin-users/admin-users.component').then(
            (m) => m.AdminUsersComponent,
          ),
        data: { title: 'Użytkownicy', breadcrumb: { parent: '/admin', label: 'Panel admina' } },
      },
      {
        path: 'users/:id',
        loadComponent: () =>
          import('./features/admin/pages/admin-user-detail/admin-user-detail.component').then(
            (m) => m.AdminUserDetailComponent,
          ),
        data: {
          title: 'Użytkownik',
          breadcrumb: { parent: '/admin/users', label: 'Lista użytkowników' },
        },
      },
      {
        path: 'events',
        loadComponent: () =>
          import('./features/admin/pages/admin-events/admin-events.component').then(
            (m) => m.AdminEventsComponent,
          ),
        data: {
          title: 'Wydarzenia (admin)',
          breadcrumb: { parent: '/admin', label: 'Panel admina' },
        },
      },
      {
        path: 'cover-images',
        loadComponent: () =>
          import('./features/admin/pages/admin-cover-images/admin-cover-images.component').then(
            (m) => m.AdminCoverImagesComponent,
          ),
        data: {
          title: 'Galeria cover images',
          breadcrumb: { parent: '/admin', label: 'Panel admina' },
        },
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/admin/pages/admin-settings/admin-settings.component').then(
            (m) => m.AdminSettingsComponent,
          ),
        data: { title: 'Ustawienia', breadcrumb: { parent: '/admin', label: 'Panel admina' } },
      },
      {
        path: 'crons',
        loadComponent: () =>
          import('./features/admin/pages/admin-crons/admin-crons.component').then(
            (m) => m.AdminCronsComponent,
          ),
        data: {
          title: 'Zarządzanie cronami',
          breadcrumb: { parent: '/admin', label: 'Panel admina' },
        },
      },
      {
        path: 'fake-users',
        loadComponent: () =>
          import('./features/admin/pages/admin-fake-users/admin-fake-users.component').then(
            (m) => m.AdminFakeUsersComponent,
          ),
        data: { title: 'Fake users', breadcrumb: { parent: '/admin', label: 'Panel admina' } },
      },
      {
        path: 'contact-messages',
        loadComponent: () =>
          import('./features/admin/pages/admin-contact-messages/admin-contact-messages.component').then(
            (m) => m.AdminContactMessagesComponent,
          ),
        data: {
          title: 'Wiadomości kontaktowe',
          breadcrumb: { parent: '/admin', label: 'Panel admina' },
        },
      },
      {
        path: 'pending-emails',
        loadComponent: () =>
          import('./features/admin/pages/admin-pending-emails/admin-pending-emails.component').then(
            (m) => m.AdminPendingEmailsComponent,
          ),
        data: { title: 'Kolejka emaili', breadcrumb: { parent: '/admin', label: 'Panel admina' } },
      },
    ],
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
      ]
    : []),

  // ── Catch-all ──
  { path: '**', redirectTo: '' },
];
