import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-terms',
  standalone: true,
  template: `
    <div class="py-6 prose prose-sm dark:prose-invert max-w-none">
      <h1>Regulamin serwisu ZgadajSię</h1>
      <p>Ostatnia aktualizacja: styczeń 2025</p>
      <h2>1. Postanowienia ogólne</h2>
      <p>Niniejszy regulamin określa zasady korzystania z platformy ZgadajSię, służącej do organizowania i uczestniczenia w lokalnych wydarzeniach sportowych.</p>
      <h2>2. Rejestracja i konto</h2>
      <p>Korzystanie z pełnej funkcjonalności wymaga założenia konta. Użytkownik zobowiązuje się do podania prawdziwych danych i utrzymania bezpieczeństwa swojego konta.</p>
      <h2>3. Organizacja wydarzeń</h2>
      <p>Organizator odpowiada za prawidłowe opisanie wydarzenia, w tym daty, lokalizacji, kosztu i zasad uczestnictwa. Organizator może anulować wydarzenie, o czym uczestnicy zostaną powiadomieni.</p>
      <h2>4. Uczestnictwo</h2>
      <p>Dołączenie do wydarzenia wymaga zgłoszenia i ewentualnej akceptacji przez organizatora. Uczestnik może się wypisać — warunki zwrotu kosztów zależą od czasu pozostałego do rozpoczęcia.</p>
      <h2>5. Płatności</h2>
      <p>Płatności realizowane są przez wewnętrzny portfel zasilany via Tpay. Środki za wydarzenia płatne są pobierane automatycznie przy dołączaniu.</p>
      <h2>6. Zasady społeczności</h2>
      <p>Użytkownicy zobowiązani są do kulturalnego zachowania. Organizator ma prawo wystawić reprymendę lub zbanować użytkownika naruszającego zasady.</p>
      <h2>7. Odpowiedzialność</h2>
      <p>ZgadajSię nie ponosi odpowiedzialności za przebieg wydarzeń organizowanych przez użytkowników. Platforma pełni jedynie rolę pośrednika.</p>
      <h2>8. Kontakt</h2>
      <p>Pytania dotyczące regulaminu: kontakt&#64;zgadajsie.pl</p>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TermsComponent {}
