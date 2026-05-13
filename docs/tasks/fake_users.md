Potrzebuję wdrożyć "zestaw" fejkowych użytkowników, którzy będą służyli do robienia "sztucznego tłoku". Będzie to opcja dostępna tylko dla administratora serwisu, który będzie miał możliwość "aktywowania" na wskazanym wydarzeniu (albo serii wydarzeń) fejkowego ruchu w zapisach.

System fake users powinien opierać się na zwykłych kontach użytkowników posiadających flagę `is_fake`, dzięki czemu będą one działały w aplikacji dokładnie tak jak normalni użytkownicy — będą miały profile, avatary, historię aktywności, będą mogły zapisywać się na wydarzenia, być akceptowane, usuwane i banowane przez organizatorów.

Najważniejsza zasada:
fake users nie mogą blokować prawdziwych miejsc na wydarzeniu.

Dzięki temu:

- prawdziwi użytkownicy zawsze mogą się zapisać,
- organizator nie traci uczestników,
- nie ma problemów z waitlistą,
- system jest dużo prostszy i bezpieczniejszy.

Dodawanie fake users powinno odbywać się stopniowo i realistycznie:

- z losowymi odstępami czasu,
- przy użyciu delayed jobs / queue,
- nigdy wszystkimi naraz.

Z wypisywaniem/usuwaniem podobnie - o tym poniżej.

Nie należy używać prostego crona wykonującego wszystko jednocześnie. Każdy zapis powinien być osobnym jobem zaplanowanym na konkretny czas.

System powinien działać dynamicznie:

- nie dodawać stałej liczby fake users,
- tylko dążyć do określonego poziomu widocznego obłożenia wydarzenia.

Przykład:

- target occupancy: 35%,
- jeśli wydarzenie ma mało prawdziwych uczestników → system dodaje fake users,
- jeśli liczba prawdziwych uczestników rośnie → fake users są stopniowo usuwani.

Fake users muszą być automatycznie wypisywani:

- gdy realne obłożenie wydarzenia jest wysokie,
- gdy pojawia się waitlista,
- najpóźniej kilka/kilkanaście godzin przed startem wydarzenia.

Na końcowym etapie zapisów wszystkie miejsca powinny być dostępne wyłącznie dla prawdziwych użytkowników.

Fake users muszą wyglądać realistycznie:

- różne imiona i nazwiska (większość nmożna to maksymalnie zróżnicować i zapisywać także jakieś pseudonimy lub niepełne imię i nazwisko, np. Paweł K. zamiast Paweł Kowalski, a także mieszać imię z ksywką i różne takie warianty)
- różne avatary,
- określona płeć (a więc trzeba dodać do `users` flagę `gender`: "female" | "male" no i undefinied lub null jako nieokreślony)

Nie można stale używać tych samych zestawów person, ponieważ użytkownicy szybko zauważą powtarzalność.

Dobór fake users musi respektować zasady wydarzenia dotyczące płci, a więc jeśli wydarzenie jest tylko dla mężczyzn to fake users również muszą być mężczyznami.

Organizator wydarzenia powinien móc zarządzać fake users dokładnie tak jak normalnymi użytkownikami: zatwierdzać, wypisywać, banować itp.

Jeśli organizator zbanuje fake usera, system nie powinien ponownie używać tej persony u tego organizatora.

Cały subsystem powinien posiadać:

- cleanup,
- możliwość anulowania pending jobs,
- recovery po błędach,
- możliwość globalnego wyłączenia systemu jedną flagą.

Rola Fake users powinna ograniczać się wyłącznie do:

- budowania social proof,
- sprawiania wrażenia aktywności wydarzenia,
- „rozruszania” pustych eventów.

---

Pozostałe wytyczne:

- W panelu adminsitratora trzeba dodać panel zarządzania fake users - listing z prostą edycją, np. możliwość szybkiej zmiany avatara.

- Na start fake users może być ok. 40 mężczyzn i 10 kobiet.

- Organizator nie określa ile fake users ma być dodanych, system sam to oblicza - organizator wskazuje tylko, ze w danym wydarzeniu (bądź serii wydarzeń) fake users są akceptowalni (domyślnie nie są)
- Organizator musi tez mieć możliwość ręcznego dodawania fake user, ale wtedy tylko pojedyńczo! Nie wskazuje którego - sytem dobiera jak powyżej.
- Żaden fake users nie może zostać dodany jeśli w wydarzeniu wolnych jest mniej niż 3 sloty/miejsca.
