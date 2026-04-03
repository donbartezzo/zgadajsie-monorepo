import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-privacy',
  imports: [CommonModule],
  template: `
    <div class="p-4">
      <!-- Privacy Content -->
      <div>
        <div class="bg-white rounded-2xl shadow-xs p-6 mb-4">
          <p class="text-xs text-success-400 mb-4">Ostatnia aktualizacja: 15 lutego 2026</p>
          <p class="text-sm text-neutral-600">
            Niniejsza Polityka Prywatności opisuje, jak aplikacja "zgadajsie" zbiera, używa, chroni
            i udostępnia Twoje dane osobowe w związku z korzystaniem z naszej platformy wydarzeń.
          </p>
        </div>

        <div class="bg-white rounded-2xl shadow-xs p-6">
          <h2 class="text-xl font-bold mb-0">1. Administrator danych</h2>
          <p class="text-xs text-success-400 mb-6">Ostatnia aktualizacja: 15 lutego 2026</p>
          <p class="text-sm text-neutral-600 mb-6">
            Niniejsza Polityka Prywatności opisuje, jak aplikacja"zgadajsie" zbiera, używa, chroni i
            udostępnia Twoje dane osobowe w związku z korzystaniem z naszej platformy wydarzeń.
          </p>

          <h3 class="text-lg font-semibold mb-3">1. Administrator danych</h3>
          <p class="text-sm text-neutral-600 mb-6">
            Administratorem Twoich danych osobowych jest:<br />
            • ZgadajSię - platforma wydarzeń sportowych<br />
            • Kontakt: privacy@zgadajsie.pl<br />
            • Strona: zgadajsie.pl<br /><br />
            Jesteśmy odpowiedzialni za bezpieczne przetwarzanie Twoich danych zgodnie z RODO.
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

          <h3 class="text-lg font-semibold mb-3">9. Pliki cookies</h3>
          <p class="text-sm text-neutral-600 mb-6">
            Używamy plików cookies w celu:<br />
            • Utrzymania sesji logowania<br />
            • Pamiętania preferencji<br />
            • Analizy ruchu w aplikacji<br />
            • Personalizacji treści<br /><br />

            Możesz zarządzać cookies w ustawieniach przeglądarki.
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
export class PrivacyComponent {}
