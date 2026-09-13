# Mobilny ranking i dokończenie testów walk

## Cel
Przebudować ranking tak, aby na telefonie wszystkie dane były czytelne bez ucinania tabeli, oraz domknąć dwie rzeczy wskazane po wczorajszym teście gry.

## Zakres
- Zastąpić szeroką tabelę mobilnym rankingiem w formie przełączanych zestawień.
- Dodać cztery listy po 10 graczy:
  - najwyższy poziom trenera,
  - najwięcej złapanych Pokémonów,
  - najwięcej Catch Coins,
  - najwięcej zwycięstw PvP.
- W każdym zestawieniu pokazać miejsce, nick, główny wynik, dodatkową wartość pomocniczą i oznaczenie „to Ty”.
- Zachować wyróżnioną odznakę, ale pokazywać ją kompaktowo, bez poszerzania ekranu.
- Na telefonie użyć pionowych wierszy/kart; na większych ekranach utrzymać czytelny, zwarty układ.
- Dokończyć wczorajsze sprawy:
  - dodać wyraźny komunikat przy Raidach, gdy cała drużyna jest zemdlona,
  - zweryfikować w przeglądarce kolor paska HP na różnych poziomach zdrowia.

## Szczegóły techniczne
- Rozszerzyć bezpieczną funkcję rankingu po stronie serwera o agregację liczby Pokémonów dla każdego gracza i cztery posortowane listy TOP 10.
- Nie ujawniać prywatnych danych kont ani pełnych profili.
- Zbudować przełączniki rankingu z istniejących elementów interfejsu i semantycznych kolorów projektu.
- Po zmianach sprawdzić kompilację oraz widok rankingu i Raidów na telefonie i komputerze.
