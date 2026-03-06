# Model płatności i zwrotów dla platformy eventowej

## 1. Założenia ogólne

- Uczestnik płaci **bezpośrednio przez Tpay** (BLIK, karta, przelew).  
- Pieniądze trafiają na konto organizatora (w MVP – Twoje konto, w przyszłości marketplace Tpay).  
- Platforma **nie przechowuje środków uczestników**.  
- Prowizja platformy (np. 1%) pobierana jest od organizatora lub split payment, zależnie od modelu.  
- W przypadku zwrotów domyślnym rozwiązaniem jest **Voucher Organizatora** do wykorzystania w przyszłych wydarzeniach u tego samego organizatora.  
- Zwrot pieniędzy odbywa się **tylko na żądanie** organizatora i jest wykonywany pojedynczo przez API Tpay.  
- Każdy ruch płatności i voucherów jest **dokładnie logowany**, z pełną historią.

---

## 2. Struktura przepływu płatności

### MVP – tylko Ty jako organizator

```
Uczestnik → Tpay → Twoje konto bankowe
```

- status transakcji w bazie: `paid`, `refunded`, `disputed`  
- każda płatność ma zapis w DB z: `user_id`, `event_id`, `amount`, `tpay_transaction_id`, `status`

### Docelowo – marketplace

```
Uczestnik → Tpay
             ├─> submerchant (organizator) – 99%
             └─> platforma – 1%
```

- split payment realizowany przez Tpay  
- brak przechowywania środków w serwisie  

---

## 3. Obsługa zwrotów i Event Refund Engine

### 3.1. Tabele w bazie

#### payments
```
id
user_id
event_id
amount
tpay_transaction_id
status        # paid, refunded, disputed
created_at
```

#### refund_jobs
```
id
event_id
created_by    # organizator_id
status        # pending, processing, completed, failed
refund_type   # voucher (default), money, mixed
created_at
```

#### refund_items
```
id
refund_job_id
payment_id
user_id
amount
status        # pending, processing, success, failed
attempts
last_error
created_at
```

#### organizer_vouchers
```
id
user_id
organizer_id
amount
source        # refund_default, refund_manual, manual_credit
reference_id  # powiązanie z refund_item lub ręcznym przyznaniem
status        # active, used, expired
created_at
expires_at
```

---

### 3.2. Flow odwołania wydarzenia

1. Organizator odwołuje wydarzenie lub przyznaje refund uczestnikowi.  
2. System tworzy **refund_job** dla wydarzenia.  
3. Generowane są **refund_items** dla każdej płatności wydarzenia.  
4. **Domyślny refund**: Voucher Organizatora – przypisany użytkownikowi i ważny tylko u tego organizatora.  
5. **Refund pieniężny**: tylko na żądanie organizatora, realizowany pojedynczo przez Tpay.  

#### Pseudocode – domyślny voucher
```python
for payment in payments_of_event:
    create_refund_item(payment)
    create_organizer_voucher(
        user_id=payment.user_id,
        organizer_id=event.organizer_id,
        amount=payment.amount,
        source="refund_default",
        reference_id=refund_item.id
    )
```

---

### 3.3. Worker / Event Refund Engine

- Worker przetwarza refund_items batchowo, np. 10–20 na raz, aby nie przeciążać API.  
- Retry logic: max 5 prób, z logowaniem błędów.  
- Statusy w DB: `pending → processing → success/failed`.  
- UI organizatora pokazuje:
  ```
  Refundy wydarzenia:
  ✔ 63 zakończone
  ⏳ 4 w trakcie
  ⚠ 2 błędy
  ```

---

## 4. Voucher Organizatora – zasady

- **Nie są pieniędzmi**, tylko **credit przypisany do organizatora**.  
- Mogą być przyznawane:  
  - domyślnie przy zwrotach (`refund_default`)  
  - ręcznie przez organizatora (`manual_credit`)  
  - przy częściowym zwrocie (`refund_manual`)  
- Ważne tylko w kontekście **wydarzeń tego organizatora**.  
- Nie mogą być wymieniane na gotówkę ani przesyłane do innych użytkowników.  
- Saldo i historia są przechowywane w **ledgerze** (każdy wpis z historią).  

### Przykład użycia voucherów
```
Użytkownik ma 20 zł voucherów od Organizatora X
Kupuje wydarzenie za 40 zł
→ system zużywa 20 zł voucherów + 20 zł płatności Tpay
```

---

## 5. Logging i audyt

Każda akcja powinna być logowana:
```
payment_created
payment_completed
refund_job_created
refund_item_created
voucher_created
voucher_used
voucher_expired
refund_success
refund_failed
refund_retried
```
- pełny audit trail dla działu księgowości i w razie sporów  

---

## 6. Kwestie księgowe i podatkowe

- Voucher Organizatora **nie jest przychodem**, dopóki użytkownik nie użyje go na wydarzenie.  
- Zwrot pieniędzy to korekta sprzedaży w tym samym okresie.  
- Każda transakcja, refund i voucher zapisane w bazie → pełny audyt.

---

## 7. UX dla użytkownika

- Można wyświetlać quasi-portfel, np.:
```
Twoje Vouchery Organizatora:

⚽ Klub Tenisowy Zielona Góra
20 zł do wykorzystania
```
- Wskazanie, że voucher **dotyczy tylko wydarzeń tego organizatora**  
- Saldo aktualizowane po każdej płatności / użyciu / przyznaniu vouchera  

---

## 8. Podsumowanie

- **MVP**: tylko Ty jako organizator → proste płatności Tpay  
- **Domyślny refund**: Voucher Organizatora  
- **Refund pieniężny**: tylko ręcznie przez organizatora  
- **Event Refund Engine**: batchowe przetwarzanie zwrotów, pełny audit i retry logic  
- **Ledger**: pełna historia voucherów i płatności  
- UX: quasi-portfel w kontekście organizatora, bez przechowywania pieniędzy  

