import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StaticPageLayoutComponent } from '../../../../shared/layouts/static-page-layout/static-page-layout.component';

@Component({
 selector: 'app-terms',
 imports: [CommonModule, StaticPageLayoutComponent],
 template: `
 <app-static-page-layout
 variant="blue"
 heroIcon="edit"
 title="Regulamin Serwisu"
 subtitle="Zasady korzystania z platformy ZgadajSię. Poznaj swoje prawa i obowiązki."
 >
 <!-- Terms Header -->
 <div class="max-w-2xl mx-auto py-8">
 <div class="bg-white rounded-2xl shadow-sm p-6">
 <h2 class="text-xl font-bold text-neutral-900 mb-2">
 Regulamin Serwisu ZgadajSię
 </h2>
 <p class="text-xs text-info-400 mb-6">
 Ostatnia aktualizacja: 15 lutego 2026
 </p>
 <p class="text-sm text-neutral-600">
 Niniejszy regulamin określa zasady korzystania z platformy ZgadajSię, służącej do
 organizowania i uczestniczenia w lokalnych wydarzeniach sportowych.
 </p>
 </div>
 </div>

 <!-- Terms Content - Full Display -->
 <div class="max-w-2xl mx-auto pb-8">
 <div class="bg-white rounded-2xl shadow-sm p-6">
 <h3 class="text-lg font-semibold mb-3">1. Postanowienia ogólne</h3>
 <p class="text-sm text-neutral-600 mb-6">
 Niniejszy regulamin określa zasady korzystania z platformy ZgadajSię, służącej do
 organizowania i uczestniczenia w lokalnych wydarzeniach sportowych. Korzystanie z
 platformy jest równoznaczne z akceptacją postanowień regulaminu.
 </p>

 <h3 class="text-lg font-semibold mb-3">2. Rejestracja i konto użytkownika</h3>
 <p class="text-sm text-neutral-600 mb-6">
 <strong>2.1. Rejestracja</strong><br />
 Korzystanie z pełnej funkcjonalności platformy wymaga założenia konta. Użytkownik
 zobowiązuje się do podania prawdziwych, aktualnych i kompletnych danych podczas
 rejestracji.<br /><br />

 <strong>2.2. Bezpieczeństwo konta</strong><br />
 Użytkownik jest odpowiedzialny za utrzymanie bezpieczeństwa swojego konta, w tym za
 ochronę hasła przed dostępem osób trzecich. ZgadajSię nie ponosi odpowiedzialności za
 szkody wynikające z nieautoryzowanego dostępu do konta użytkownika.<br /><br />

 <strong>2.3. Zawartość profilu</strong><br />
 Zdjęcie profilowe i inne dane w profilu użytkownika nie mogą naruszać dobrych obyczajów
 ani prawa.
 </p>

 <h3 class="text-lg font-semibold mb-3">3. Organizacja wydarzeń</h3>
 <p class="text-sm text-neutral-600 mb-6">
 <strong>3.1. Obowiązki organizatora</strong><br />
 Organizator odpowiada za prawidłowe opisanie wydarzenia, w tym:<br />
 • Dokładne daty i godziny rozpoczęcia/zakończenia<br />
 • Precyzyjną lokalizację wydarzenia<br />
 • Rzeczywisty koszt uczestnictwa<br />
 • Zasady uczestnictwa i wymagania<br /><br />

 <strong>3.2. Anulowanie wydarzeń</strong><br />
 Organizator może anulować wydarzenie w uzasadnionych przypadkach. O anulowaniu
 uczestnicy zostaną powiadomieni niezwłocznie, a wpłacone środki zwrócone na portfel.<br /><br />

 <strong>3.3. Ograniczenia</strong><br />
 Organizator nie może tworzyć wydarzeń o charakterze niezgodnym z prawem lub sprzecznym z
 dobrymi obyczajami.
 </p>

 <h3 class="text-lg font-semibold mb-3">4. Uczestnictwo w wydarzeniach</h3>
 <p class="text-sm text-neutral-600 mb-6">
 <strong>4.1. Zgłoszenie udziału</strong><br />
 Dołączenie do wydarzenia wymaga zgłoszenia przez platformę. W przypadku wydarzeń
 wymagających akceptacji, organizator może zaakceptować lub odrzucić zgłoszenie bez
 podania przyczyny.<br /><br />

 <strong>4.2. Wypisanie się z wydarzenia</strong><br />
 Uczestnik może się wypisać z wydarzenia. Warunki zwrotu kosztów:<br />
 • Ponad 72h przed rozpoczęciem: pełny zwrot<br />
 • 24-72h przed rozpoczęciem: zwrot 50%<br />
 • Mniej niż 24h przed rozpoczęciem: brak zwrotu<br /><br />

 <strong>4.3. Obowiązki uczestnika</strong><br />
 Uczestnik zobowiązuje się do stosowania do zasad określonych przez organizatora oraz
 kulturalnego zachowania podczas wydarzenia.
 </p>

 <h3 class="text-lg font-semibold mb-3">5. Płatności i portfel</h3>
 <p class="text-sm text-neutral-600 mb-6">
 <strong>5.1. System płatności</strong><br />
 Płatności realizowane są przez wewnętrzny portfel zasilany przez zewnętrznego operatora
 płatności Tpay. Środki za wydarzenia płatne są pobierane automatycznie przy dołączaniu
 do wydarzenia.<br /><br />

 <strong>5.2. Doładowanie portfela</strong><br />
 Użytkownik może doładować portfel dostępnymi metodami płatności. Minimalna kwota
 doładowania wynosi 10 zł.<br /><br />

 <strong>5.3. Zwroty</strong><br />
 Środki z anulowanych wydarzeń lub zwrotów są automatycznie zwracane na portfel
 użytkownika.
 </p>

 <h3 class="text-lg font-semibold mb-3">6. Zasady społeczności</h3>
 <p class="text-sm text-neutral-600 mb-6">
 <strong>6.1. Zakazane zachowania</strong><br />
 Użytkownicy zobowiązani są do kulturalnego zachowania. Zakazane jest:<br />
 • Nękanie, zastraszanie lub obrażanie innych użytkowników<br />
 • Publikowanie treści o charakterze wulgarnym lub obraźliwym<br />
 • Podszywanie się pod inne osoby<br />
 • Spamowanie lub rozsyłanie niechcianych wiadomości<br /><br />

 <strong>6.2. Reprymendy i bany</strong><br />
 Organizator ma prawo wystawić reprymendę uczestnikowi za nieodpowiednie zachowanie. Po
 zebraniu 3 reprymend, użytkownik może zostać zbanowany z wydarzeń danego organizatora na
 okres 30 dni.<br /><br />

 <strong>6.3. Zgłaszanie naruszeń</strong><br />
 Użytkownicy mogą zgłaszać naruszenia regulaminu poprzez odpowiednią funkcję w aplikacji.
 </p>

 <h3 class="text-lg font-semibold mb-3">7. Odpowiedzialność</h3>
 <p class="text-sm text-neutral-600 mb-6">
 <strong>7.1. Odpowiedzialność platformy</strong><br />
 ZgadajSię nie ponosi odpowiedzialności za przebieg wydarzeń organizowanych przez
 użytkowników. Platforma pełni jedynie rolę pośrednika technicznego.<br /><br />

 <strong>7.2. Odpowiedzialność użytkowników</strong><br />
 Użytkownicy ponoszą pełną odpowiedzialność za swoje działania na platformie oraz podczas
 wydarzeń.<br /><br />

 <strong>7.3. Wyłączenie odpowiedzialności</strong><br />
 ZgadajSię nie ponosi odpowiedzialności za szkody wynikające z siły wyższej, działań osób
 trzecich lub technicznych awarii systemu.
 </p>

 <h3 class="text-lg font-semibold mb-3">8. Prawa autorskie i własność intelektualna</h3>
 <p class="text-sm text-neutral-600 mb-6">
 Wszelkie prawa autorskie do platformy ZgadajSię należą do jej właściciela. Użytkownicy
 nabywają jedynie prawo do korzystania z platformy w ramach określonych w regulaminie.
 </p>

 <h3 class="text-lg font-semibold mb-3">9. Reklamacje</h3>
 <p class="text-sm text-neutral-600 mb-6">
 Reklamacje dotyczące funkcjonowania platformy należy składać na adres
 kontakt@zgadajsie.pl w terminie 14 dni od wystąpienia zdarzenia. Reklamacje rozpatrywane
 są w ciągu 30 dni od ich otrzymania.
 </p>

 <h3 class="text-lg font-semibold mb-3">10. Zmiany w regulaminie</h3>
 <p class="text-sm text-neutral-600 mb-6">
 ZgadajSię zastrzega sobie prawo do zmiany niniejszego regulaminu. O wszelkich zmianach
 użytkownicy zostaną poinformowani z co najmniej 7-dniowym wyprzedzeniem. Kontynuowanie
 korzystania z platformy po zmianach jest równoznaczne z ich akceptacją.
 </p>
 </div>
 </div>
 </app-static-page-layout>
 `,
 changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TermsComponent {}
