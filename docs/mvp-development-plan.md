# Plan rozwoju MVP – Lokalna Społeczność Sportowa

## 1. Analiza obecnego stanu
- Monorepo Nx: backend (NestJS + Prisma), frontend (Angular), biblioteki współdzielone.
- Brak zaawansowanej logiki domenowej i kluczowych funkcji biznesowych.

## 2. Plan działania – kolejne kroki

### A. Backend (NestJS + Prisma)
1. Zaprojektować modele bazy danych (schema.prisma):
   - User (email, socialId, rola)
   - Event (pola obowiązkowe i opcjonalne z PRD)
   - Participation (relacja user-event)
2. Zaimplementować serwisy i kontrolery:
   - Rejestracja/logowanie (email, social login)
   - CRUD wydarzeń (tworzenie, edycja, anulowanie, pobieranie, historia)
   - Zgłaszanie udziału w wydarzeniu
3. Zabezpieczyć REST API (JWT, CORS, ograniczenie do frontendu)
4. Przygotować endpointy do powiadomień push (np. Web Push API)
5. Obsłużyć lokalizację wydarzenia (przechowywanie współrzędnych)

### B. Frontend (Angular + Angular Material + Tailwind i czysty SCSS)
1. Stworzyć routing i widoki:
   - Lista wydarzeń (dla niezalogowanych i zalogowanych)
   - Szczegóły wydarzenia
   - Formularz tworzenia/edycji wydarzenia
   - Historia wydarzeń organizatora
   - Rejestracja/logowanie (email, Google, Facebook)
2. Zaimplementować obsługę PWA (manifest, service worker)
3. Dodać integrację z mapą (np. ngx-leaflet)
4. Zaimplementować powiadomienia push (rejestracja, obsługa, UI)
5. Zadbaj o UI oparte na Angular Material, Tailwind i czystym SCSS

### C. Wspólne
1. Ustalić i zaimplementować podział danych obowiązkowych/opcjonalnych (zgodnie z PRD)
2. Przygotować walidacje i obsługę błędów (frontend + backend)
3. Ustalić i wdrożyć standardy kodowania (wg styleguide.md)
4. Przygotować dokumentację API i architektury

### D. Testy i wdrożenie
1. Manualne testy funkcjonalności MVP
2. Przygotować proces build/deploy na serwer współdzielony
3. Zbierać feedback i planować kolejne etapy (czat, płatności, AI, offline)

---

## 3. Sposób pracy
- Zadania można odhaczać lub rozbijać na mniejsze w miarę postępu.
- Plik ten służy jako główny punkt odniesienia do kontynuacji implementacji.

---

# Checklisty rozwoju MVP – Lokalna Społeczność Sportowa

## Backend (NestJS + Prisma)
- [ ] Zaprojektować modele bazy danych w schema.prisma
  - [ ] User (email, socialId, rola)
  - [ ] Event (zgodnie z PRD)
  - [ ] Participation (relacja user-event)
- [ ] Wygenerować migracje i zainicjować bazę danych
- [ ] Zaimplementować serwisy i kontrolery:
  - [ ] Rejestracja/logowanie (email, social login)
  - [ ] CRUD wydarzeń (tworzenie, edycja, anulowanie, pobieranie, historia)
  - [ ] Zgłaszanie udziału w wydarzeniu
- [ ] Zabezpieczyć REST API (JWT, CORS, ograniczenie do frontendu)
- [ ] Endpointy do powiadomień push
- [ ] Obsługa lokalizacji wydarzenia
- [ ] Walidacje i obsługa błędów
- [ ] Testy jednostkowe i e2e

## Frontend (Angular + Angular Material + Tailwind i czysty SCSS)
- [ ] Routing i widoki:
  - [ ] Lista wydarzeń (niezalogowani/zalogowani)
  - [ ] Szczegóły wydarzenia
  - [ ] Formularz tworzenia/edycji wydarzenia
  - [ ] Historia wydarzeń organizatora
  - [ ] Rejestracja/logowanie (email, Google, Facebook)
- [ ] Obsługa PWA (manifest, service worker)
- [ ] Integracja z mapą (np. ngx-leaflet)
- [ ] Powiadomienia push (rejestracja, obsługa, UI)
- [ ] UI oparte na Angular Material, Tailwind i czystym SCSS
- [ ] Walidacje i obsługa błędów
- [ ] Testy jednostkowe i e2e

## Wspólne
- [ ] Ustalić i zaimplementować podział danych obowiązkowych/opcjonalnych (zgodnie z PRD)
- [ ] Standardy kodowania (wg styleguide.md)
- [ ] Dokumentacja API i architektury

## Testy i wdrożenie
- [ ] Manualne testy funkcjonalności MVP
- [ ] Proces build/deploy na serwer współdzielony
- [ ] Zbieranie feedbacku i planowanie kolejnych etapów (czat, płatności, AI, offline)
