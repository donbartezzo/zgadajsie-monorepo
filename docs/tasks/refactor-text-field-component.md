# Refaktoryzacja: Komponenty `app-text-field` i `app-textarea`

## Cel

Zastąpić surowe `<input>` i `<textarea>` w całym frontendzie komponentami `app-text-field` / `app-textarea`, które:

1. Centralizują style (Tailwind) — jedno źródło prawdy wyglądu pól formularza.
2. Wymuszają a11y na poziomie API — `label`, `autocomplete`, `inputmode`, `enterkeyhint` jako deklaratywne `@Input()`.
3. Eliminują powtarzanie 10-15 klas Tailwind w każdym formularzu.
4. Zapobiegają zapominaniu o atrybutach mobilnych w przyszłości.

---

## Stan obecny

**~25 surowych `<input>` / `<textarea>` w 12+ komponentach.**

### Pełna lista lokalizacji

| Komponent                             | Typ                    | Uwagi                                                                            |
| ------------------------------------- | ---------------------- | -------------------------------------------------------------------------------- |
| `login-form.component.ts`             | 2× input               | email, password (z przełącznikiem widoczności)                                   |
| `register.component.ts`               | 5× input               | displayName, email, password, confirmPassword, 2× honeypot (hidden)              |
| `forgot-password.component.ts`        | 1× input               | email                                                                            |
| `reset-password.component.ts`         | 2× input               | password, confirmPassword                                                        |
| `activate.component.ts`               | 1× input               | email (resend)                                                                   |
| `contact-form.component.ts`           | 2× input + 1× textarea | name, email, message                                                             |
| `event-form.component.ts`             | 9× input + 1× textarea | title, desc, min/maxParticipants, ageMin/Max, costPerPerson, address, role slots |
| `organizer-settings.component.html`   | 1× textarea            | welcome message                                                                  |
| `chat-view.component.ts`              | 1× input               | message (z `(keyup.enter)`)                                                      |
| `faq.component.ts`                    | 1× input               | search                                                                           |
| `my-cover-images.component.ts`        | 2× input               | nazwa covera, upload name (modal)                                                |
| `admin-users.component.ts`            | 1× input               | search                                                                           |
| `admin-settings.component.ts`         | 2× input               | setting value, new dict slug                                                     |
| `admin-user-detail.component.ts`      | 1× input               | editName                                                                         |
| `admin-fake-users.component.ts`       | 1× input               | displayName                                                                      |
| `cancel-payment-overlay.component.ts` | 2× input               | checkboxy (potencjalnie osobny komponent)                                        |
| `confirm-modal.component.ts`          | ?                      | do weryfikacji                                                                   |

### Problem powtarzalności

Każdy input powiela ten sam zestaw klas Tailwind:

```
class="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-900
       focus:outline-hidden focus:ring-2 focus:ring-primary-500 ..."
```

plus logikę `appFormControlError`, stanów błędu, labelki itp.

---

## Proponowane API

### `TextFieldComponent` (`app-text-field`)

```typescript
@Input() type: 'text' | 'email' | 'password' | 'number' | 'search' = 'text';
@Input() label?: string;
@Input() placeholder?: string;
@Input({ required: true }) autocomplete!: string; // wymuszamy świadomość
@Input() inputmode?: 'numeric' | 'decimal' | 'email' | 'tel' | 'text';
@Input() enterkeyhint?: 'enter' | 'done' | 'go' | 'next' | 'previous' | 'search' | 'send';
@Input() formControlName?: string; // proxy do <input>
@Input() ngModel?: string;          // proxy do <input> (lub używamy tylko formControlName)
@Input() value?: string | number;
@Input() id?: string;
@Input() name?: string;
@Input() min?: number;
@Input() max?: number;
@Input() step?: string;
@Input() maxlength?: number;
@Input() minlength?: number;
@Input() required = false;
@Input() disabled = false;
@Input() readonly = false;
@Input() showError = true;           // czy pokazać walidację (appFormControlError)
@Input() errorStateMatcher?;        // opcjonalnie
@Output() blur = new EventEmitter<FocusEvent>();
@Output() change = new EventEmitter<Event>();
@Output() input = new EventEmitter<Event>();
@Output() keyupEnter = new EventEmitter<void>();

// Ref proxy (dla #uploadFileInput itp.)
@ViewChild('nativeInput') nativeInput!: ElementRef<HTMLInputElement>;
```

Template:

```html
<div class="space-y-1">
  @if (label()) {
  <label [for]="id()" class="block text-sm font-medium text-neutral-700 mb-1">
    {{ label() }} @if (required()) { <span class="text-danger-300">*</span> }
  </label>
  }
  <input
    #nativeInput
    [type]="type()"
    [id]="id()"
    [name]="name()"
    [placeholder]="placeholder()"
    [autocomplete]="autocomplete()"
    [inputmode]="inputmode()"
    [enterkeyhint]="enterkeyhint()"
    [min]="min()"
    [max]="max()"
    [step]="step()"
    [maxlength]="maxlength()"
    [minlength]="minlength()"
    [required]="required()"
    [disabled]="disabled()"
    [readonly]="readonly()"
    [value]="value()"
    class="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-900
           focus:outline-hidden focus:ring-2 focus:ring-primary-500
           disabled:opacity-50 disabled:cursor-not-allowed"
    (blur)="blur.emit($event)"
    (change)="change.emit($event)"
    (input)="input.emit($event)"
    (keyup.enter)="keyupEnter.emit()"
  />
  @if (showError()) {
  <!-- appFormControlError logic here or via directive -->
  }
</div>
```

### `TextAreaComponent` (`app-textarea`)

Analogiczne API, ale:

- `@Input() rows = 4`
- `@Input() maxLength?: number`
- Brak `type`, `inputmode`
- Obsługa `enterkeyhint` (np. "done” lub „send")

### `CheckboxFieldComponent` (`app-checkbox-field`) — opcjonalnie

Dla 2 checkboxów w `cancel-payment-overlay`. Można też zostawić jako surowe `<input type="checkbox">` — jest ich tylko kilka.

---

## Plan migracji (fazy)

### Faza 0 — Przygotowanie (1h)

1. **Audyt uzupełniający:** przejrzeć dokładnie każdy komponent z listy i spisać używane atrybuty per-input (formControlName vs ngModel, custom eventy, ref-y, conditional classów).
2. **Utworzyć `TextFieldComponent`** + `TextAreaComponent` + testy unit.
3. **Wydzielić do `shared/ui/text-field/`** (lub `shared/ui/form/`).

### Faza 1 — Pilotaż na 3 komponentach (1-2h)

Zastąpić komponenty o najniższym ryzyku:

- `login-form.component.ts` — 2 inputy, proste
- `forgot-password.component.ts` — 1 input
- `faq.component.ts` — 1 input (search)

Weryfikacja:

- `nx build frontend`
- `nx lint frontend`
- Testy e2e: login, forgot password

### Faza 2 — Auth + Contact (1-2h)

- `register.component.ts` — 5 inputów (tu jest honeypot + Turnstile)
- `reset-password.component.ts`
- `activate.component.ts`
- `contact-form.component.ts` — 2 inputy + textarea

### Faza 3 — Event-form (2-3h)

Największy i najbardziej złożony:

- 9 inputów, 1 textarea
- `appFormControlError` directive — trzeba przetestować czy działa na poziomie `app-text-field` (może wymagać forwardingu do `<input>`)
- Role slots — dynamiczne `[value]`, `(change)`, `min`/`max`
- Address — `(blur)`, `(keyup.enter)` nie jest tu, ale `(blur)` jest

**Decyzja do podjęcia:** czy `appFormControlError` to dyrektywa na `<input>` (wtedy `app-text-field` musi pozwolić na dyrektywę na swoim `<input>`), czy komponent sam zarządza błędami?

### Faza 4 — Chat + Admin + Pozostałe (1-2h)

- `chat-view.component.ts` — `(keyup.enter)`, `autocomplete="off"`
- `organizer-settings.component.html` — textarea
- `my-cover-images.component.ts` — 2 inputy, jeden z `(blur)` i `(keyup.enter)` (upewnić się)
- `admin-*` komponenty — 6 inputów łącznie
- `cancel-payment-overlay` — checkboxy (opcjonalnie)

### Faza 5 — Testy regresyjne (1h)

- `nx build frontend`
- `nx lint frontend`
- Testy e2e (login, register, event-create, contact, chat)
- Ręczna weryfikacja 3 najważniejszych formularzy na mobile (klawiatura, autocomplete, enterkey)

---

## Ryzyka i ograniczenia

| Ryzyko                                                                                                        | Prawdopodobieństwo | Wpływ  | Mitigacja                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------- | ------------------ | ------ | -------------------------------------------------------------------------------------------------------------------------- |
| `appFormControlError` nie działa na `<input>` wewnątrz komponentu                                             | Średnie            | Wysoki | Przetestować w fazie 0; jeśli nie działa — przekazać dyrektywę lub wbudować logikę błędów w komponent                      |
| Template reference `#uploadFileInput` wymaga proxy                                                            | Niskie             | Średni | `nativeInput` `@ViewChild` + publiczna metoda `focus()` / `click()`                                                        |
| E2E testy polegają na `data-testid` na `<input>` — przesunięcie w DOM                                         | Średnie            | Średni | Upewnić się że `data-testid` jest przekazywany lub stosowany na `<input>` wewnątrz komponentu; zaktualizować selektory e2e |
| Honeypot (`website`, `company` w register) wymaga `autocomplete="off"`, `tabindex="-1"`, `aria-hidden="true"` | Niskie             | Średni | Obsługa w API komponentu lub zostawić jako surowe `<input>` (honeypot to edge case)                                        |
| Conditional `[class.border-danger-300]` w contact-form — trudne do przeniesienia                              | Niskie             | Niski  | Komponent sam zarządza stanem błędu (wbudowana logika border-error)                                                        |
| Password visibility toggle w login/register — obecnie ręczny `<button>` obok `<input>`                        | Średnie            | Średni | `app-text-field` z `@Input() showVisibilityToggle = false` lub zostawić jako surowe dla password                           |
| `ngModel` + standalone — wymaga `FormsModule` w komponencie                                                   | Niskie             | Niski  | Import `FormsModule` w `TextFieldComponent` lub wymusić `formControlName` (ReactiveForms)                                  |

## Decyzje do podjęcia przed startem

1. **Czy wspierać `ngModel` czy tylko `formControlName`?**
   - Obecnie mix: auth używa `ngModel`, event-form `ReactiveForms`, admin też `ngModel`.
   - Rekomendacja: wspierać oba (transparent proxy do `<input>`).

2. **Czy `app-text-field` sam zarządza labelką i błędami?**
   - Tak — to główna korzyść. Label + error state wbudowane.
   - Ale niektóre formularze mają customowe teksty błędów (contact-form).
   - Rekomendacja: `@Input() errorMessages?: Record<string, string>` lub `@ContentChild` dla custom error template.

3. **Czy wydzielić osobno `app-password-field` z visibility toggle?**
   - Warto rozważyć — login i register mają ten sam wzorzec (input + eye icon).
   - Ale to dodatkowy komponent.

4. **Czy checkboxy też objąć?**
   - Wątpliwe — jest ich tylko kilka, nie powtarzają klas Tailwind tak bardzo. Zostawić jako surowe.

---

## Kryteria akceptacji

- [ ] `TextFieldComponent` i `TextAreaComponent` utworzone w `shared/ui/` z testami unit.
- [ ] Każdy komponent z listy w fazach 1-4 migrowany — zero surowych `<input>` / `<textarea>` (poza checkboxami, file inputami, honeypotem).
- [ ] `nx build frontend` przechodzi.
- [ ] `nx lint frontend` — zero nowych błędów.
- [ ] Testy e2e: login, register, create-event, contact, chat przechodzą.
- [ ] Mobile: `enterkeyhint` działa, klawiatura numeryczna na polach liczbowych, autofill na email/hasło.
- [ ] (Opcjonalnie) `admin-*` komponenty też zmigrowane.

---

## Oszacowanie czasowe

| Faza                           | Szacunek   |
| ------------------------------ | ---------- |
| Faza 0 — Przygotowanie + API   | 1h         |
| Faza 1 — Pilotaż               | 1-2h       |
| Faza 2 — Auth + Contact        | 1-2h       |
| Faza 3 — Event-form            | 2-3h       |
| Faza 4 — Chat + Admin + reszta | 1-2h       |
| Faza 5 — Testy regresyjne      | 1h         |
| **Razem**                      | **~7-11h** |

---

## Rollback

Migracja jest inkrementalna (fazowa). Jeśli coś pójdzie nie tak w dowolnej fazie:

- Komponenty z danej fazy można przywrócić do surowych `<input>` w ~15-30 min.
- Sam `TextFieldComponent` można usunąć bez wpływu na resztę aplikacji, jeśli nie został jeszcze użyty.
- Należy robić commity per faza (polecam: `git commit` po fazie 0, 1, 2, 3, 4).

---

## Rekomendacja

Zadanie ma **sens długoterminowy** (utrzymanie, a11y, DRY), ale **nie blokujące RWD**. Proponuję:

1. Dodać do backlogu jako osobny task (nie część RWD).
2. Wykonać po zakończeniu RWD lub w osobnej sesji.
3. Rozpocząć od **fazy 0** (projekt API + 1 komponent) jako proof-of-concept.
