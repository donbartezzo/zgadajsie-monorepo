# DiceBear pixel-art avatars

Dodano DiceBear pixel-art jako domyślny wariant avatara (2026-05-04).

**Schemat:** `avatarSeed String?` w modelu User (Prisma). Seed DiceBear = `userId + (avatarSeed ?? '')`. Gdy avatarSeed=null, seed = samo userId (deterministyczny unikalny default).

**Why:** User chciał uniknąć duplikatów avatarów - UUID gwarantuje unikalność, avatarSeed pozwala generować warianty.

**How to apply:** Przy używaniu UserAvatarComponent przekazuj `[userId]` i `[avatarSeed]` – bez userId komponent fallbackuje na inicjały. Variant `pixel-art` jest domyślny, `initials` jako fallback.

**Pliki kluczowe:**

- `frontend/src/app/shared/user/ui/user-avatar/user-avatar.component.ts` – nowe inputy: userId, avatarSeed, variant
- `frontend/src/app/shared/user/ui/avatar-picker/avatar-picker.component.ts+html` – picker uruchamiany w modalu zmiany avatara
- `frontend/src/app/features/user/overlays/avatar-change-modal.component.ts` – modal zmiany avatara wywoływany z ikony edycji w `app-user-profile-card`; potwierdzenie zmiany odbywa się przez globalny `ConfirmModalService`
- `backend/src/modules/users/users.service.ts` – avatarSeed w getMe/updateProfile selects
- `backend/src/modules/users/dto/update-profile.dto.ts` – avatarSeed: string | null (MaxLength: 32)
- `backend/prisma/migrations/20260504113951_avatar_seed_refactor/`
