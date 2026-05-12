# DiceBear pixel-art avatars

Dodano DiceBear pixel-art jako domyślny wariant avatara (2026-05-04).

**Schemat:** `avatarSeed String?` w modelu User (Prisma). Seed DiceBear = `userId + (avatarSeed ?? '')`. Gdy avatarSeed=null, seed = samo userId (deterministyczny unikalny default).

**Why:** User chciał uniknąć duplikatów avatarów - UUID gwarantuje unikalność, avatarSeed pozwala generować warianty.

**How to apply:** Przy używaniu UserAvatarComponent przekazuj `AvatarUser` z `{ id, displayName, avatarSeed }` – bez id komponent fallbackuje na inicjały. DiceBear pixel-art jest domyślny, inicjały jako fallback.

**Przepływ zmiany avatara:**

- AvatarPickerComponent jest wbudowany w UserProfileCardComponent (renderowany inline gdy `editingAvatarMode=true`)
- Ikona edycji avatara w profilu ustawia `editingAvatarMode=true` → picker pojawia się w miejscu avatara
- Picker generuje losowy seed (12-znakowy hex) jako preview
- Potwierdzenie zapisuje `avatarSeed` przez UserService.updateProfile()
- Zmiana jest propagowana przez ProfileBroadcastService do innych komponentów

**Pliki kluczowe:**

- `frontend/src/app/shared/user/ui/user-avatar/user-avatar.component.ts` – komponent wyświetlania avatara (DiceBear pixel-art + initials fallback)
- `frontend/src/app/shared/user/ui/avatar-picker/avatar-picker.component.ts+html` – picker generujący i zapisujący nowy avatarSeed
- `frontend/src/app/shared/user/ui/user-profile-card/user-profile-card.component.ts+html` – karta profilu z wbudowanym pickerem (editingAvatarMode signal)
- `backend/src/modules/users/users.service.ts` – avatarSeed w getMe/updateProfile selects
- `backend/src/modules/users/dto/update-profile.dto.ts` – avatarSeed: string | null (MaxLength: 32)
- `backend/prisma/migrations/20260504113951_avatar_seed_refactor/`
