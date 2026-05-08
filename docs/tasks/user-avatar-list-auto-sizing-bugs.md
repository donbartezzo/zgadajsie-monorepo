# Analiza defektów `computedAutoMaxDisplay` w `UserAvatarListComponent`

Plik: `frontend/src/app/shared/ui/user-avatar-list/user-avatar-list.component.ts`

## Struktura DOM komponentu

Host `flex items-center min-w-0` ma **dwoje dzieci flexa**:

```
[avatar-container flex-1 min-w-0] [ml-6=24px] [button shrink-0]
```

Czyli: `hostWidth = avatarContainerWidth + 24 (ml-6) + buttonWidth`.

## Bug #1 — pominięty margines `ml-6` (24px) — REALNY

Linia 101:

```ts
const avatarContainerWidth = width - BUTTON_WIDTH_PX;
```

Brakuje 24px na `ml-6` przy wrapperze przycisku. Powinno być:

```ts
const avatarContainerWidth = width - BUTTON_WIDTH_PX - 24;
```

Skutek: kalkulator zakłada 24px **więcej** miejsca niż jest faktycznie → może zwrócić o 2 avatary za dużo. Avatary wykraczające za szerokość są maskowane przez `overflow-hidden` na avatar-containerze, więc wizualny defekt jest cichy — ale logicznie błędny.

## Bug #2 — pomyłka "overlap" vs "step" — REALNY (uśpiony)

Stała opisana jako overlap:

```ts
const AVATAR_OVERLAP_PX = 12; // -space-x-3 = -0.75rem = 12px
```

W rzeczywistości w formułach używana jest jako "step na avatar" (przyrost szerokości każdego kolejnego avatara):

```ts
const widthForAll = AVATAR_SIZE_PX + (total - 1) * AVATAR_OVERLAP_PX;
const fits = 1 + Math.floor((availableForAvatars - AVATAR_SIZE_PX) / AVATAR_OVERLAP_PX);
```

Geometria ujemnego marginesu daje step = `AVATAR_SIZE_PX − overlap = 24 − 12 = 12`. Numerycznie **przypadkowo** zgadza się z `AVATAR_OVERLAP_PX = 12`. Po zmianie z `-space-x-3` na np. `-space-x-2` (overlap=8, step=16) całe obliczenie cicho rozjedzie się. Bezpieczniej:

```ts
const AVATAR_STEP_PX = AVATAR_SIZE_PX - AVATAR_OVERLAP_PX; // 12
const widthForAll = AVATAR_SIZE_PX + (total - 1) * AVATAR_STEP_PX;
const fits = 1 + Math.floor((availableForAvatars - AVATAR_SIZE_PX) / AVATAR_STEP_PX);
```

## Bug #3 — badge też ma `-space-x-3` overlap, nieuwzględniony — REALNY

Badge `+N` jest **wewnątrz tego samego** divu z `-space-x-3`, więc jako kolejne dziecko też dostaje `margin-left: -12px` i nakłada się na ostatni avatar. Realna szerokość N avatarów + badge to:

```
24 + (N-1)*12 + (40 - 12) = 52 + (N-1)*12
```

a kod liczy:

```
availableForAvatars = container - 40    // pełna szerokość badge bez overlapu
```

→ przeszacowuje budżet badge'a o 12px → w sytuacji "zbyt mało miejsca" pokazuje o 1 avatar mniej niż mogłoby się zmieścić.

Powinno być `BADGE_WIDTH_PX - AVATAR_OVERLAP_PX` jako efektywna szerokość badge w kontenerze.

## Bug #4 — `BUTTON_WIDTH_PX = 160` jako stała

Przycisk `xs` ghost z tekstem "Lista zapisanych" w realu ma ~110–130px. 160 to pesymistyczny upper bound → niedoszacowanie miejsca dla avatarów (kierunek bezpieczny, ale w połączeniu z Bug #1 (+24) i Bug #3 (+12) zaczyna się robić znaczący błąd kompensowany).

Dodatkowo: szerokość zależy od i18n / długości tekstu (`Lista zapisanych` w innych językach). Bezpieczniej zmierzyć ten węzeł osobnym `ResizeObserver` albo wyciągnąć przycisk na zewnątrz hosta i obserwować tylko avatar-container.

## Bug #5 — fallback `width === 0` daje magiczną liczbę 3

Linia 98:

```ts
if (width === 0) return Math.min(total, 3);
```

Arbitralnie 3 — przy SSR/pierwszym renderze powoduje "flash" 3→N po pierwszym pomiarze. Spec dokumentu to akceptuje, ale wartość 3 jest wzięta z sufitu (nie skorelowana z `AVATAR_*` ani z minimalną sensowną szerokością).

## Bug #6 — `min-w-0` na hoście vs sygnał szerokości

Host ma `min-w-0` (z `host: { class: 'flex items-center min-w-0' }`). To pozwala parentowi zwęzić host poniżej szerokości jego zawartości — ale sam ResizeObserver mierzy `entry.contentRect.width` hosta, co przy `min-w-0` może się zerować, gdy avatary i przycisk razem nie mieszczą się w parencie. Edge case, ale w wąskich layoutach (mobile <320px) komponent może oscylować między fallbackiem (width=0 → 3 avatary) a realnym pomiarem.

## Mniejszy defekt — `Math.max(1, ...)` przy bardzo wąskim kontenerze

Linia 111: gdy `availableForAvatars < 24`, `fits` jest ≤ 0, zaciska się do 1, ale w praktyce 1 avatar + badge nie zmieści się. `overflow-hidden` ratuje wizualnie, ale logika udaje że 1 + badge się mieści.

## Podsumowanie najważniejszych poprawek

```ts
const AVATAR_SIZE_PX = 24;
const AVATAR_OVERLAP_PX = 12;
const AVATAR_STEP_PX = AVATAR_SIZE_PX - AVATAR_OVERLAP_PX; // 12 — fix #2
const BADGE_EFFECTIVE_PX = 40 - AVATAR_OVERLAP_PX; // 28 — fix #3
const BUTTON_BLOCK_PX = 160 + 24; // przycisk + ml-6 — fix #1

private readonly computedAutoMaxDisplay = computed(() => {
  const width = this.hostWidth();
  const total = this.items().length;
  if (total === 0) return 0;
  if (width === 0) return Math.min(total, 3);

  const avatarContainerWidth = width - BUTTON_BLOCK_PX;
  if (avatarContainerWidth <= 0) return 1;

  const widthForAll = AVATAR_SIZE_PX + (total - 1) * AVATAR_STEP_PX;
  if (widthForAll <= avatarContainerWidth) return total;

  const availableForAvatars = avatarContainerWidth - BADGE_EFFECTIVE_PX;
  const fits = 1 + Math.floor((availableForAvatars - AVATAR_SIZE_PX) / AVATAR_STEP_PX);
  return Math.max(1, Math.min(total - 1, fits));
});
```

Najpoważniejsze do naprawy: **Bug #1** (brakujące `ml-6` 24px) i **Bug #3** (badge overlap). Bug #2 jest "uśpiony" — działa przez przypadek dopóki nie zmienisz `-space-x-3` ani rozmiaru avatara.
