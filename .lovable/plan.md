# Dzienne zadania 3×3 i czat graczy

## Cel
Zastąpić obecny zestaw 30 zadań zestawem 9 zadań (3 łatwe, 3 średnie, 3 trudne), dodać bezpieczne rozpoczęcie dnia i jeden wspólny reroll, a także stały czat globalny/handlowy.

## Zakres

### 1. Zadania dzienne
- Generator będzie tworzył dokładnie 9 zadań: po 3 dla każdego poziomu trudności.
- Na ekranie Zadań pojawi się przycisk „Rozpocznij nowy dzień”. Pierwsze użycie danego dnia według czasu polskiego zastąpi bieżący zestaw nowymi 9 zadaniami.
- Ponowne rozpoczęcie tego samego dnia zostanie zablokowane po stronie serwera, aby nie dało się bez końca losować korzystniejszego zestawu.
- Jeden wspólny stan `reroll_used` będzie obowiązywał dla całego dnia. Po wymianie jednego aktywnego zadania wszystkie przyciski „Losuj ponownie” zostaną wyłączone.
- Wymiana zachowa poziom trudności i wylosuje inne zadanie; wszystkie operacje będą sprawdzać właściciela, datę, stan zadania i limit na serwerze.

### 2. Czat graczy
- Dodać tabelę wiadomości z identyfikatorem autora, utrwalonym nickiem, kanałem `global`/`trade`, treścią i czasem wysłania.
- Odczyt będzie dostępny tylko zalogowanym graczom, a zapis wyłącznie przez chronioną funkcję serwerową.
- Serwer pobierze nick z profilu — klient nie będzie mógł podszyć się pod innego gracza.
- Walidacja ograniczy długość wiadomości, odrzuci pustą treść i zastosuje krótki limit częstotliwości wysyłania.
- Widżet będzie stale przypięty w prawym dolnym rogu, z zakładkami „Czat Globalny” i „Czat Handlowy”, przewijaną historią, polem wiadomości oraz stanami ładowania/błędu.
- Zwinięty czat będzie małą belką/dymkiem i nie zasłoni pozostałych elementów gry.

## Bezpieczeństwo i dane
- Nowe tabele otrzymają jawne uprawnienia, włączone reguły dostępu i brak bezpośredniego zapisu z przeglądarki.
- Rezerwacja rozpoczęcia dnia i darmowego rerollu będzie atomowa w bazie, odporna na podwójne kliknięcia i równoległe żądania.
- Wiadomości będą pobierane w ograniczonej liczbie i bez danych prywatnych autora.

## Weryfikacja
- Sprawdzić dokładnie 3/3/3 zadania, blokadę drugiego rozpoczęcia dnia i jeden wspólny reroll.
- Sprawdzić oba kanały czatu, wysyłanie, odświeżanie historii, zwijanie oraz brak możliwości podania własnego nicku.
- Sprawdzić widok desktopowy i mobilny, błędy konsoli oraz stan kompilacji.
