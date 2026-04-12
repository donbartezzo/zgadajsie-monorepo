# OrganizerUserRelation: Ulepszenia schematu (isTrusted/isBanned + trustedAt/bannedAt)

## Cel

Uproszczenie i wzbogacenie schematu relacji organizator-uzytkownik poprzez dodanie pól czasowych przy zachowaniu flag stanu dla lepszej czytelnoosci i przyszlych rozszerzen.

## Aktualny schemat

```prisma
model OrganizerUserRelation {
  id              String   @id @default(uuid())
  organizerUserId String
  targetUserId    String
  isBanned        Boolean  @default(false)
  isTrusted       Boolean  @default(false)
  note            String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([organizerUserId, targetUserId])
}
```

## Proponowany schemat

```prisma
model OrganizerUserRelation {
  id              String   @id @default(uuid())
  organizerUserId String
  targetUserId    String
  isBanned        Boolean  @default(false)
  isTrusted       Boolean  @default(false)
  bannedAt        DateTime?
  trustedAt       DateTime?
  note            String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([organizerUserId, targetUserId])
}
```

## Uzasadnienie zmian

### Dlaczego warto zachowac flagi (`isTrusted`/`isBanned`)?

1. **Czytelnosc zapytan**
   ```sql
   -- Z flaga (jasny stan)
   WHERE "isTrusted" = true
   
   -- Bez flagi (mniej czytelne)
   WHERE "trustedAt" IS NOT NULL
   ```

2. **Semantyka biznesowa**
   - `isTrusted` = **stan** (zaufany/niezaufany)
   - `trustedAt` = **kiedy** stal sie zaufany
   - Czasami potrzebujemy tylko stanu, bez daty.

3. **Wsteczna kompatybilnosc**
   - Obecny kod uzywa `isTrusted` w wielu miejscach.
   - Zmiana na `trustedAt IS NOT NULL` wymagalaby refaktoru wielu zapytan.

4. **Przyszle rozszerzenia**
   - Mozliwosc zawieszenia trusta bez usuwania daty:
     ```ts
     isTrusted: false,
     trustedAt: '2024-01-01', // kiedy byl zaufany
     // (future) suspendedAt: '2024-06-01' // kiedy trust zostal zawieszony
     ```

### Dlaczego dodac daty (`trustedAt`/`bannedAt`)?

1. **Historia i audyt**
   - Kiedy uzytkownik zostal zaufany/zbanowany?
   - Ile czasu uplynelo od zmiany statusu?

2. **Analizy biznesowe**
   - Sredni czas do zdobycia trusta przez organizatora.
   - Czestotliwosc banow i ich czas trwania.

3. **Debugowanie i support**
   - Precyzyjne informacje o tym, kiedy nastapila zmiana.
   - Pomoc w rozwiazywaniu sporow.

## Logika biznesowa

### Trust (zaufanie)

| Operacja                     | `isTrusted` | `trustedAt`       | Opis                                   |
|------------------------------|-------------|-------------------|----------------------------------------|
| Ustawienie trusta            | `true`      | `NOW()`           | Organizator uznaje uzytkownika za zaufanego |
| Zdjecie trusta               | `false`     | `null`            | Uzytkownik przestaje byc zaufany        |
| Automatyczny trust (pierwszy zatwierdzony) | `true`      | `NOW()`           | System ustawia trust po pierwszym zatwierdzeniu |

### Ban (blokada)

| Operacja                     | `isBanned`  | `bannedAt`        | Opis                                   |
|------------------------------|-------------|-------------------|----------------------------------------|
| Banowanie uzytkownika        | `true`      | `NOW()`           | Organizator blokuje uzytkownika         |
| Odbanowanie uzytkownika      | `false`     | `null`            | Organizator odblokowuje uzytkownika     |
| Ban ustawia `isTrusted = false` | `false`     | `null`            | Ban automatycznie zdjemuje trusta       |

## Zmiany w kodzie

### Backend

1. **EnrollmentEligibilityService**
   - `isNewUser()` pozostaje bez zmian (sprawdza `isTrusted`)
   - `isBannedByOrganizer()` pozostaje bez zmian (sprawdza `isBanned`)

2. **ModerationService**
   - `trustUser()`: ustawia `isTrusted = true, trustedAt = NOW()`
   - `untrustUser()`: ustawia `isTrusted = false, trustedAt = null`
   - `banUser()`: ustawia `isBanned = true, bannedAt = NOW(), isTrusted = false, trustedAt = null`
   - `unbanUser()`: ustawia `isBanned = false, bannedAt = null`

3. **ParticipationService**
   - `assignSlotToParticipant()`: dodaje automatyczne ustawienie trusta:
     ```ts
     await this.prisma.organizerUserRelation.upsert({
       where: { organizerUserId_targetUserId: { organizerUserId, targetUserId: participation.userId } },
       create: { organizerUserId, targetUserId, isTrusted: true, trustedAt: new Date() },
       update: { isTrusted: true, trustedAt: new Date() },
     });
     ```

### Frontend

1. **Typy**
   - Rozszerzenie `OrganizerUserRelation` interface o `trustedAt` i `bannedAt`
   - Aktualizacja DTOs i formularzy

2. **UI**
   - Mozliwosc wyswietlania daty zaufania/bana w panelu organizatora
   - Sortowanie po datach w liscie relacji

## Migration

```sql
-- Add new columns
ALTER TABLE "OrganizerUserRelation" 
ADD COLUMN "trustedAt" TIMESTAMP(3),
ADD COLUMN "bannedAt" TIMESTAMP(3);

-- Populate existing data
UPDATE "OrganizerUserRelation" 
SET "trustedAt" = "createdAt" 
WHERE "isTrusted" = true;

UPDATE "OrganizerUserRelation" 
SET "bannedAt" = "createdAt" 
WHERE "isBanned" = true;
```

## Korzysci

1. **Czytelnosc**: Flagi pozostaja jako glowny wskaznik stanu
2. **Historia**: Daty pozwalaja na sledzenie zmian w czasie
3. **Analizy**: Mozliwosc generowania statystyk i raportow
4. **Debugowanie**: Precyzyjne informacje o tym, kiedy nastapily zmiany
5. **Przyszlosc**: Prosta ekspansja o dodatkowe stany (np. `suspendedAt`)

## Koszty

- 2 dodatkowe pola w bazie danych (minimalny narzut)
- Prosta migration (jednorazowa operacja)
- Koniecznos aktualizacji typow i DTOs (niewielki wysilek)

## Podsumowanie

Propozycja laczy **czytelnosc flag** z **historia dat**, dajac najlepsze z obu swiatow:
- Prosta i szybka logika biznesowa oparta na flagach
- Pelny audyt i mozliwosc analiz dzieki datom
- Przygotowanie na przyszle rozszerzenia bez duzych zmian w istniejacym kodzie.
