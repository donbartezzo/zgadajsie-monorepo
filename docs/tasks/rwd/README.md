# Taski RWD — z audytu `docs/audits/rwd-audit-2026-06-25.md`

Ten katalog zawiera rozbicie audytu RWD na **niezależne taski**. Każdy task jest osobnym plikiem
`.md` i można go realizować samodzielnie, z poszanowaniem zależności i kolejności opisanej niżej.

## Zasada kolejności

1. **Najpierw poprawność mobile-first** (Faza A) — realne błędy na telefonach, tania robota, główna
   grupa użytkowników. Niskie/średnie ryzyko regresji.
2. **Potem cross-cutting** (Faza B) — obrazy, typografia, container queries. Niezależne.
3. **Fundament shell** (Faza C) — zmiana sztywnej szerokości 700px. **Wysokie ryzyko regresji**,
   ale odblokowuje całą adaptację desktopową.
4. **Adaptacja desktop** (Faza D) — per-widok. Zależne od Fazy C, wyższe ryzyko regresji → na końcu.

> Reguła z polecenia: **taski o wysokim ryzyku regresji wykonywane są na końcu.** Numeracja plików
> = rekomendowana kolejność wykonania.

## Legenda

- **Priorytet:** Wysoki / Średni / Niski — wartość biznesowa / wpływ na UX.
- **Ryzyko regresji:** Niskie / Średnie / Wysokie — szansa zepsucia istniejących widoków.
- **Zależności:** taski, które muszą być zrobione wcześniej.

## Mapa tasków

| #   | Task                                      | Priorytet | Ryzyko regresji | Zależności | Niezależny  |
| --- | ----------------------------------------- | --------- | --------------- | ---------- | ----------- |
| 01  | `rwd-01-scroll-restoration.md`            | Wysoki    | Niskie          | —          | ✅          |
| 02  | `rwd-02-mobile-viewport-safe-area.md`     | Wysoki    | Średnie         | —          | ✅          |
| 03  | `rwd-03-tap-targets.md`                   | Średni    | Niskie          | —          | ✅          |
| 04  | `rwd-04-landscape-orientation.md`         | Średni    | Niskie          | —          | ✅          |
| 05  | `rwd-05-form-ux-mobile.md`                | Średni    | Niskie          | —          | ✅          |
| 06  | `rwd-06-responsive-images.md`             | Średni    | Niskie          | —          | ✅          |
| 07  | `rwd-07-overlay-scrollbar-bottomsheet.md` | Średni    | Średnie         | —          | ✅          |
| 08  | `rwd-08-fluid-typography.md`              | Niski     | Średnie         | —          | ✅          |
| 09  | `rwd-09-container-queries.md`             | Niski     | Średnie         | —          | ✅          |
| 10  | `rwd-10-keyboard-shortcuts.md`            | Niski     | Niskie          | —          | ✅          |
| 11  | `rwd-11-app-shell-width-strategy.md`      | Wysoki    | **Wysokie**     | —          | ⚠ fundament |
| 12  | `rwd-12-desktop-navigation.md`            | Średni    | **Wysokie**     | 11         | —           |
| 13  | `rwd-13-desktop-modals.md`                | Średni    | **Wysokie**     | (07)       | częściowo   |
| 14  | `rwd-14-events-list-grid.md`              | Średni    | Średnie         | 11         | —           |
| 15  | `rwd-15-event-detail-layout.md`           | Średni    | **Wysokie**     | 11         | —           |
| 16  | `rwd-16-event-form-desktop.md`            | Niski     | Średnie         | 11         | —           |
| 17  | `rwd-17-organizer-panel-desktop.md`       | Średni    | **Wysokie**     | 11         | —           |
| 18  | `rwd-18-profile-desktop.md`               | Niski     | Średnie         | 11         | —           |
| 19  | `rwd-19-chat-side-panel.md`               | Średni    | **Wysokie**     | 11         | —           |
| 20  | `rwd-20-admin-notifications-tables.md`    | Niski     | Średnie         | 11         | —           |

## Fazy

### Faza A — Poprawność mobile-first (01–07)

Niezależne, tanie, wysoki zwrot. Można robić równolegle przez kilka osób. Sekcje audytu 6, 8, 16, 17.

### Faza B — Cross-cutting wizualne (08–10)

Niezależne od shella i od siebie. Sekcje 7, 18 + nowość (keyboard shortcuts, sekcja 5/15).

### Faza C — Fundament shell (11)

**Krytyczny prerequisite** dla Fazy D. Zmienia globalną szerokość `max-width: 700px` na progresywną.
Wysokie ryzyko regresji → robione po domknięciu Fazy A/B, jako brama do desktopu. Sekcje 1.1, 1.2, 4.2.

### Faza D — Adaptacja desktop per-widok (12–20)

Wszystkie zależą od taska 11 (poza 13, który częściowo zależy od 07). Wzajemnie niezależne — można
dzielić między osoby. Sekcje 1.3, 2, 3.x, 5, 11.x.

## Definicja ukończenia (wspólna)

- `nx build frontend` ✅
- `nx lint frontend` 0 errors (warningi pre-existing OK)
- Brak poziomego scrolla w zakresach: 320 / 375 / 390–430 / 768 / 1024 / 1440 / 1920 px.
- Zgodność z `docs/styleguide-frontend.md` (TYLKO semantyczne klasy kolorów, brak `dark:`,
  brak arbitralnych hexów, brak CSS vars w szablonach).
- Aktualizacja checklisty w audycie (sekcja 9 / 20) dla domkniętego zakresu.
