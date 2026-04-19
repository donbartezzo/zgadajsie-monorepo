import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { APP_BRAND } from '@zgadajsie/shared';

@Component({
  selector: 'app-privacy',
  imports: [CommonModule],
  template: `
    <div class="p-4">
      <!-- Privacy Content -->
      <div>
        <div class="bg-white rounded-2xl shadow-xs p-6 mb-4">
          <p class="text-xs text-success-400 mb-4">Ostatnia aktualizacja: 16 kwietnia 2026</p>
          <p class="text-sm text-neutral-600">
            Niniejsza Polityka Prywatności opisuje, jak serwis {{ brandName }} zbiera, używa, chroni
            i udostępnia Twoje dane osobowe w związku z korzystaniem z naszej platformy wydarzeń
            sportowych.
          </p>
        </div>

        <div class="bg-white rounded-2xl shadow-xs p-6">
          <h3 class="text-lg font-semibold mb-3">1. Administrator danych osobowych</h3>
          <p class="text-sm text-neutral-600 mb-6">
            Administratorem Twoich danych osobowych w rozumieniu Rozporządzenia Parlamentu
            Europejskiego i Rady (UE) 2016/679 z dnia 27 kwietnia 2016 r. (RODO) jest:<br /><br />
            <strong>{{ APP_BRAND.BUSINESS_NAME }}</strong
            ><br />
            prowadzący działalność gospodarczą wpisaną do Centralnej Ewidencji i Informacji o
            Działalności Gospodarczej (CEiDG)<br />
            Adres: {{ APP_BRAND.BUSINESS_ADDRESS }}<br />
            NIP: {{ APP_BRAND.BUSINESS_NIP }}<br />
            REGON: {{ APP_BRAND.BUSINESS_REGON }}<br /><br />
            Kontakt w sprawach ochrony danych osobowych:<br />
            • E-mail: {{ APP_BRAND.BUSINESS_EMAIL }}<br />
            • Adres korespondencyjny: {{ APP_BRAND.BUSINESS_ADDRESS }}
          </p>

          <h3 class="text-lg font-semibold mb-3">2. Zakres zbieranych danych</h3>
          <p class="text-sm text-neutral-600 mb-6">
            Dane osobowe:<br />
            • Imię i nazwisko oraz adres email<br />
            • Zdjęcie profilowe (opcjonalnie)<br />
            • Numer telefonu (opcjonalnie)<br /><br />

            Dane związane z wydarzeniami:<br />
            • Historia uczestnictwa w wydarzeniach<br />
            • Oceny i recenzje<br />
            • Preferencje dotyczące dyscyplin sportowych<br /><br />

            Dane finansowe:<br />
            • Historia transakcji w portfelu<br />
            • Metody płatności (zabezpieczone)<br /><br />

            Dane techniczne:<br />
            • Adres IP<br />
            • Typ urządzenia i przeglądarki<br />
            • Lokalizacja (wyłącznie za Twoją zgodą)
          </p>

          <h3 class="text-lg font-semibold mb-3">3. Cel przetwarzania</h3>
          <p class="text-sm text-neutral-600 mb-6">
            Realizacja usług:<br />
            • Rejestracja i logowanie do konta<br />
            • Umożliwienie udziału w wydarzeniach<br />
            • Przetwarzanie płatności<br /><br />

            Komunikacja:<br />
            • Wysyłanie powiadomień o wydarzeniach<br />
            • Informacje o zmianach w regulaminie<br />
            • Odpowiedzi na Twoje zapytania<br /><br />

            Bezpieczeństwo:<br />
            • Weryfikacja tożsamości użytkowników<br />
            • Ochrona przed oszustwami<br />
            • Zapewnienie bezpieczeństwa transakcji<br /><br />

            Udoskonalenie serwisu:<br />
            • Analiza użyteczności aplikacji<br />
            • Personalizacja rekomendacji wydarzeń<br />
            • Statystyki i analityka
          </p>

          <h3 class="text-lg font-semibold mb-3">4. Podstawa prawna przetwarzania</h3>
          <p class="text-sm text-neutral-600 mb-6">
            Przetwarzamy Twoje dane na podstawie:<br />
            • Umowy o świadczenie usług korzystania z aplikacji<br />
            • Twojej dobrowolnej zgody (np. lokalizacja, marketing)<br />
            • Obowiązku prawnego (np. przepisy podatkowe)<br />
            • Prawnie uzasadnionego interesu (bezpieczeństwo, optymalizacja)<br /><br />

            Twoja zgoda jest dobrowolna, ale bez niektórych danych nie będziemy mogli świadczyć
            pełnej funkcjonalności aplikacji.
          </p>

          <h3 class="text-lg font-semibold mb-3">5. Komu udostępniamy dane</h3>
          <p class="text-sm text-neutral-600 mb-6">
            Twoje dane mogą być udostępniane:<br />
            • Organizatorom wydarzeń (tylko niezbędne dane do realizacji wydarzenia)<br />
            • Dostawcom usług płatniczych (Tpay - do przetwarzania płatności)<br />
            • Podmiotom technicznym (hosting, wsparcie IT)<br />
            • Microsoft Corporation — w zakresie anonimowych danych behawioralnych zbieranych przez
            narzędzie Microsoft Clarity (wyłącznie po udzieleniu zgody na pliki cookie analityczne;
            dane są przetwarzane zgodnie z polityką prywatności Microsoft)<br />
            • Organom ścigania (wyłącznie na podstawie prawnych żądań)<br /><br />

            Nigdy nie sprzedajemy Twoich danych osobowych stronom trzecim w celach marketingowych
            bez Twojej wyraźnej zgody.
          </p>

          <h3 class="text-lg font-semibold mb-3">6. Okres przechowywania danych</h3>
          <p class="text-sm text-neutral-600 mb-6">
            Okres przechowywania danych:<br />
            • Dane konta: przez okres korzystania z aplikacji + 5 lat<br />
            • Historia transakcji: 7 lat (wymogi podatkowe)<br />
            • Historia wydarzeń: przez okres korzystania z aplikacji<br />
            • Dane analityczne: 24 miesiące<br /><br />

            Po upływie okresów przechowywania dane są trwale usuwane lub zanonimizowane.
          </p>

          <h3 class="text-lg font-semibold mb-3">7. Twoje prawa</h3>
          <p class="text-sm text-neutral-600 mb-6">
            Masz prawo do:<br />
            • Dostępu do swoich danych<br />
            • Sprostowania nieprawidłowych danych<br />
            • Usunięcia danych (prawo do bycia zapomnianym)<br />
            • Ograniczenia przetwarzania<br />
            • Przenoszenia danych<br />
            • Sprzeciwu wobec przetwarzania<br />
            • Wniesienia skargi do organu nadzorczego (UODO)<br /><br />

            Możesz zarządzać swoimi danymi w ustawieniach konta lub kontaktując się z nami.
          </p>

          <h3 class="text-lg font-semibold mb-3">8. Bezpieczeństwo danych</h3>
          <p class="text-sm text-neutral-600 mb-6">
            Stosujemy następujące środki bezpieczeństwa:<br />
            • Szyfrowanie danych (SSL/TLS)<br />
            • Zabezpieczenie baz danych<br />
            • Regularne audyty bezpieczeństwa<br />
            • Kontrola dostępu do danych<br />
            • Szkolenia personelu<br /><br />

            Pomimo stosowanych środków, pamiętaj że żadne systemy nie są 100% bezpieczne.
          </p>

          <h3 class="text-lg font-semibold mb-3">9. Pliki cookies i narzędzia analityczne</h3>
          <p class="text-sm text-neutral-600 mb-6">
            Używamy plików cookies w celu:<br />
            • Utrzymania sesji logowania<br />
            • Pamiętania preferencji użytkownika<br />
            • Analizy ruchu w aplikacji<br />
            • Personalizacji treści<br /><br />

            <strong>Cookies analityczne — Microsoft Clarity</strong><br />
            Za Twoją zgodą korzystamy z narzędzia Microsoft Clarity dostarczanego przez Microsoft
            Corporation. Narzędzie to rejestruje anonimowe dane behawioralne (m.in. ruchy kursora,
            kliknięcia, mapy cieplne) w celu poprawy użyteczności serwisu. Treści wiadomości
            prywatnych oraz dane wprowadzane w formularzach są chronione przed przechwyceniem przez
            to narzędzie.<br /><br />

            Clarity może ustawiać własne pliki cookie (m.in. <em>_clck</em>, <em>_clsk</em>)
            umożliwiające identyfikację sesji przeglądarki. Więcej informacji znajdziesz w polityce
            prywatności Microsoft:
            <a
              href="https://privacy.microsoft.com/pl-pl/privacystatement"
              target="_blank"
              rel="noopener noreferrer"
              class="text-primary-500 underline"
              >privacy.microsoft.com</a
            >.<br /><br />

            Możesz w dowolnym momencie wycofać zgodę na cookies analityczne, korzystając z opcji
            dostępnych w ustawieniach przeglądarki lub kontaktując się z nami.
          </p>

          <h3 class="text-lg font-semibold mb-3">10. Zmiany w polityce</h3>
          <p class="text-sm text-neutral-600 mb-6">
            Zastrzegamy sobie prawo do zmiany niniejszej polityki. O wszelkich zmianach
            poinformujemy Cię:<br />
            • Przez wiadomość w aplikacji<br />
            • Przez email na adres konta<br />
            • Publikując nową wersję na stronie<br /><br />

            Zmiany wchodzą w życie po 14 dniach od powiadomienia.
          </p>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivacyComponent {
  protected readonly APP_BRAND = APP_BRAND;
  readonly brandName = APP_BRAND.NAME;
}
