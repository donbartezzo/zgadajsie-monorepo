import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-privacy',
  template: `
    <div class="py-6 prose prose-sm dark:prose-invert max-w-none">
      <h1>Polityka prywatności</h1>
      <p>Ostatnia aktualizacja: styczeń 2025</p>
      <h2>1. Administrator danych</h2>
      <p>Administratorem danych osobowych jest ZgadajSię z siedzibą w Zielonej Górze.</p>
      <h2>2. Zakres zbieranych danych</h2>
      <p>Zbieramy następujące dane: imię/pseudonim, adres email, avatar (opcjonalnie), dane dotyczące uczestnictwa w wydarzeniach, historię transakcji portfela.</p>
      <h2>3. Cel przetwarzania</h2>
      <p>Dane przetwarzamy w celu: świadczenia usług platformy, umożliwienia uczestnictwa w wydarzeniach, komunikacji między użytkownikami, obsługi płatności.</p>
      <h2>4. Podstawa prawna</h2>
      <p>Przetwarzanie odbywa się na podstawie zgody użytkownika (art. 6 ust. 1 lit. a RODO) oraz w celu wykonania umowy (art. 6 ust. 1 lit. b RODO).</p>
      <h2>5. Prawa użytkownika</h2>
      <p>Użytkownik ma prawo do: dostępu do swoich danych, ich sprostowania, usunięcia, ograniczenia przetwarzania, przenoszenia danych oraz wniesienia sprzeciwu.</p>
      <h2>6. Kontakt</h2>
      <p>W sprawach dotyczących ochrony danych osobowych prosimy o kontakt: kontakt&#64;zgadajsie.pl</p>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivacyComponent {}
