# Dokończenie gry i System Podróży

## Cel
Dodać czasowe podróże między regionami oraz domknąć wszystkie wcześniej wskazane braki tak, aby systemy współdzieliły ekwipunek, postęp, nagrody i eksplorację.

## Zakres

### 1. System Podróży
- Dodać kupowany za Catch Coins, jednorazowy **Bilet Podróży** i pokazać go w Sklepie oraz Ekwipunku.
- Dodać kafelek **Podróże** z ikoną samolotu oraz osobny ekran z regionami.
- Ustawić codzienne, niepokrywające się okna regionów według strefy `Europe/Warsaw`; region domowy będzie wyłączony.
- Pokazywać stan otwarte/zamknięte i sekundowe odliczanie do najbliższego otwarcia.
- Lot zużyje jeden bilet i zapisze region wycieczki oraz jej koniec. Eksploracja będzie używać puli wycieczki tylko do końca okna, po czym automatycznie wróci do regionu domowego.

### 2. Zadania i Profesor Oak
- Dodać stronę **Zadania** z dwoma zadaniami dziennymi: łapanie i walki/eksploracja.
- Gracz wybierze łatwy, średni lub trudny wariant przed rozpoczęciem; trudność ustali cel i nagrodę.
- Dodać badania Profesora Oaka odblokowywane poziomem trenera, z pixel-artowym portretem, dialogiem, celami typu „złap gatunek” i „przynieś przedmiot” oraz odbiorem nagrody.
- Postęp będzie naliczany przez istniejące łapanie, walki, eksplorację i oddawanie przedmiotów; zadania dzienne odświeżą się według polskiej daty.

### 3. Progresja i przedmioty
- Przy każdym awansie trenera przyznać skalowane pakiety Balli i Flakonów Energii oraz pokazać zdobyte nagrody w logu.
- Rozszerzyć ofertę o Premier, Net, Dive, Dusk, Quick, Timer, Repeat i Luxury Ball z odrębnymi premiami do łapania.
- Dodać limit czasowy zakupu Master Balla i widoczny licznik do kolejnego zakupu.
- Uporządkować ekwipunek tak, by nowe Balle, bilety i materiały miały własne liczniki i grafiki.

### 4. Ewolucje i Mega Ewolucja
- Eksploracja będzie losowo przyznawać materiały Mega powiązane z gatunkami, które mogą mieć Mega Ewolucję.
- Dodać tworzenie gatunkowego Kamienia Mega z wymaganych materiałów oraz przechowywanie gotowych kamieni.
- Zastąpić ogólny Kamień Mega wyborem kamienia pasującego do Pokémona; bonus +30% pozostanie aktywny tylko dla zgodnego gatunku.
- Na ekranie Pokémona dodać wykonanie zwykłej ewolucji po spełnieniu poziomu, przyjaźni lub posiadaniu wymaganego przedmiotu.

### 5. Walki i postacie
- Niskopoziomowy Pokémon będzie miał tyle ruchów, ile faktycznie poznał, maksymalnie cztery — bez sztucznego dopełniania.
- Dokończyć stronę **Trenerzy**: wybór przeciwnika, pixel-art klasy, pełny wynik walki, nagrody i log.
- Dodać pixel-artowe wizerunki Profesora Oaka, Liderów Sal i zróżnicowanych klas trenerów z trwałego zestawu zasobów.
- Uporządkować duże ekrany walk w rozwijane sekcje; wybór ruchu i leczenie zastosować również tam, gdzie obecnie wynik jest automatyczny, zachowując aktualny balans Sal i PvP.

### 6. Skup i płatności
- NPC-Kupiec nadal poda jedną niepodlegającą negocjacji ofertę przed sprzedażą; interfejs jasno pokaże wycenę i potwierdzenie.
- Uruchomić płatności PLN dla istniejących pakietów, z bezpiecznym potwierdzeniem płatności i jednorazowym przyznaniem zakupów.

## Dane i bezpieczeństwo
- Dodać skalowalny ekwipunek przedmiotów, aktywną wycieczkę, cooldown Master Balla, zadania, postęp zadań, badania i gatunkowe materiały/kamienie Mega.
- Każda nowa tabela otrzyma wymagane uprawnienia, RLS i reguły dostępu wyłącznie do własnych danych gracza; przyznawanie nagród i zużywanie przedmiotów odbędzie się po stronie serwera.
- Płatności będą naliczane dopiero po zweryfikowanym potwierdzeniu operatora, odpornym na ponowne wysłanie.

## Nawigacja i ekrany
- Nowe kafelki: **Podróże** w części eksploracyjnej oraz **Zadania** w części postępu.
- Nowe strony dostaną własne opisy udostępniania i będą dopasowane do obecnego ciemnego, kafelkowego wyglądu oraz telefonu.

## Weryfikacja
- Sprawdzić zakup i zużycie biletu, wszystkie stany okien czasu polskiego oraz automatyczny powrót.
- Sprawdzić naliczanie i reset zadań, nagrody poziomowe, cooldown Master Balla, ewolucję i tworzenie kamieni.
- Przejść pełne walki, Sklep, Ekwipunek, Podróże i Zadania na telefonie i komputerze oraz potwierdzić brak błędów kompilacji i działania.
