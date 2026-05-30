# Swarms Marketplace CLI

![Obraz Swarms CLI](../img.png)

[![npm version](https://img.shields.io/npm/v/swarms-market.svg)](https://www.npmjs.com/package/swarms-market)
[![node](https://img.shields.io/node/v/swarms-market.svg)](https://nodejs.org)
[![license](https://img.shields.io/npm/l/swarms-market.svg)](../LICENSE)

Oficjalny interfejs wiersza poleceń dla [Swarms Marketplace](https://swarms.world). Publikuj agentów, prompty i tokeny, przeglądaj katalog i odbieraj opłaty twórcy ze swoich tokenizowanych produktów — w całości z terminala, z pierwszorzędną obsługą skryptów, CI/CD i środowisk bez interfejsu graficznego.

> 🌐 Inne języki: [English](../README.md) · [中文](./README.zh-CN.md) · [日本語](./README.ja.md) · [हिन्दी](./README.hi.md) · [Deutsch](./README.de.md) · [Português (BR)](./README.pt-BR.md) · [Français](./README.fr.md)

---

## Przegląd

`swarms` to w pełni skryptowalny klient nad HTTP API Swarms Marketplace. Mapuje się bezpośrednio na operacje napędzające biznes marketplace'u:

- **Publikuj produkty na dużą skalę.** Wypchnij agentów, prompty i narzędzia do marketplace'u jednym poleceniem, manifestem JSON lub katalogiem manifestów w CI. Bez przeglądarki, bez ręcznych formularzy.
- **Uruchamiaj tokeny on-chain.** Stokenizuj agenta w jednym wywołaniu — wraz z tickerem, walutą kwotującą, obrazem i trybem opłat. Transakcja launch jest podpisywana kluczem portfela podanym w czasie wykonania.
- **Odbieraj opłaty twórcy pojedynczo lub hurtowo.** Twierdź opłaty za pojedynczy token, za każdy posiadany token lub przesweepuj wszystkie tokenizowane mints na marketplace w jednej partii z semantyką kontynuacji po błędzie.
- **Audytuj swój katalog.** Renderuj opublikowane produkty jako uporządkowane drzewo, filtruj tylko tokenizowane i emituj JSON dla dashboardów na końcu pipeline'u.
- **Odkrywaj marketplace.** Stronicowo przeglądaj każdy tokenizowany produkt (bez klucza API) jako płaską listę lub JSON — odpowiednie do indeksowania, mirroringu lub analityki.
- **Automatyzuj wszystko.** Każde polecenie jest nieinteraktywne, gdy ustawione są odpowiednie zmienne środowiskowe, zwraca standardowe kody wyjścia i wyłącza animacje / prompty, gdy działa poza TTY lub pod `$CI`.

### Możliwości w skrócie

| Możliwość                                  | Polecenie                                            | Wymagane uwierzytelnienie  |
| ------------------------------------------ | ---------------------------------------------------- | -------------------------- |
| Otwórz stronę kluczy API                   | `swarms api-key`                                     | Brak                       |
| Zweryfikuj uwierzytelnienie środowiska     | `swarms login` · `swarms whoami`                     | Klucz API                  |
| Opublikuj agenta                           | `swarms launch agent`                                | Klucz API                  |
| Opublikuj prompt                           | `swarms launch prompt`                               | Klucz API                  |
| Uruchom token on-chain dla agenta          | `swarms launch token`                                | Klucz API + klucz portfela |
| Wylistuj swoje opublikowane produkty       | `swarms list`                                        | Klucz API                  |
| Przeglądaj wszystkie tokenizowane produkty | `swarms list-tokenized` (alias `swarms tokens`)      | Brak                       |
| Otwórz stronę ofertową produktu            | `swarms open <id\|ca>`                               | Brak                       |
| Odbierz opłaty z pojedynczego mint         | `swarms claim --ca <mint>`                           | Klucz portfela             |
| Wsadowy odbiór opłat                       | `swarms claim-all`                                   | Klucz portfela             |
| Wyjście JSON dla dowolnego polecenia odczytu | `--json`                                           | Tak jak polecenie nadrzędne |

## Kompatybilność

| Wymaganie       | Wspierane                                                                 |
| --------------- | ------------------------------------------------------------------------- |
| Node.js         | ≥ 18 (używa natywnego `fetch`)                                            |
| Menedżery pakietów | `npm`, `pnpm`, `yarn`, `bun`                                          |
| OS              | macOS, Linux, Windows (PowerShell + WSL); macOS / Linux są podstawowe     |
| Terminale       | Dowolny terminal kompatybilny z VT100; wymagane znaki blokowe Unicode      |
| Runnery CI      | GitHub Actions, GitLab CI, CircleCI, Buildkite, Jenkins itd.              |

## Instalacja

```bash
# Instalacja globalna (zalecana do codziennego użycia z shella)
npm install -g swarms-market

# Lub uruchom bez instalacji (przydatne w CI)
npx swarms-market@latest --help

# Przypnij konkretną wersję w CI
npm install -g swarms-market@0.1.0
```

Po instalacji zweryfikuj:

```bash
swarms --version
swarms --help
```

> **Uwaga:** Nazwa pakietu na npm to `swarms-market`, ale instalowany binarny plik nazywa się `swarms`. Jeśli masz już zainstalowany pakiet Pythona `swarms` (dostarcza binarkę o tej samej nazwie), jeden będzie przesłaniał drugi w twoim `PATH`. Uruchom `which swarms`, by zobaczyć, który wygrywa; odinstaluj ten, którego nie potrzebujesz, albo wywołuj ten bezpośrednio przez `npx swarms-market <command>`.

### Odinstalowanie

```bash
npm uninstall -g swarms-market
```

## Szybki start

```bash
# 1. Pobierz klucz API (otwiera https://swarms.world/platform/api-keys)
swarms api-key

# 2. Wyeksportuj go
export SWARMS_API_KEY="sk-…"
export SWARMS_USERNAME="your-username"   # opcjonalne, ale pomija --user w większości poleceń

# 3. Zweryfikuj uwierzytelnienie
swarms login

# 4. Opublikuj swojego pierwszego agenta z manifestu
swarms launch agent \
  --name "Hello Agent" \
  --description "Says hi" \
  --code-file ./agent.py \
  --free

# 5. Zobacz, co opublikowałeś
swarms list

# 6. Przeglądaj marketplace
swarms list-tokenized
```

## Uwierzytelnianie

Pobierz klucz pod adresem <https://swarms.world/platform/api-keys> (lub uruchom `swarms api-key`). Klucze można tworzyć, nazywać i unieważniać z tej strony.

```bash
export SWARMS_API_KEY="sk-…"
swarms whoami      # potwierdza, że klucz został wczytany; wyświetla pierwsze/ostatnie 4 znaki
```

Polecenia tylko do odczytu, które nie modyfikują twojego konta (zwłaszcza `list-tokenized` oraz opener `api-key`), działają bez klucza API. Każde inne polecenie wymaga klucza.

## Konfiguracja

Cała konfiguracja opiera się na zmiennych środowiskowych. CLI nie czyta ani nie zapisuje żadnego pliku konfiguracyjnego.

| Zmienna                       | Cel                                                                                            | Domyślnie               |
| ----------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------- |
| `SWARMS_API_KEY`              | Token Bearer dla endpointów marketplace (publish, list, odczyty na zakres konta).              | _wymagane do auth_      |
| `SWARMS_USERNAME`             | Domyślne `--user` dla `list`. Pozwala uruchamiać `swarms list` bez flag.                       | _(przekaż --user)_      |
| `SWARMS_WALLET_PRIVATE_KEY`   | Klucz prywatny portfela (base58) do operacji on-chain. Trzymany tylko w pamięci.               | _(pyta, gdy nieustawione)_ |
| `PRIVATE_KEY`                 | Alias dla `SWARMS_WALLET_PRIVATE_KEY`, dla kompatybilności z popularnymi konwencjami `.env`.   | _(pyta, gdy nieustawione)_ |
| `SWARMS_NO_ANIM`              | Ustaw na dowolną wartość, by wyłączyć animację powitalną nawet w interaktywnym terminalu.       | _(animuje w TTY)_       |
| `CI`                          | Automatycznie wyłącza animację powitalną, gdy ustawione (ustawiane przez każdego dużego dostawcę CI). | _(wykrywane)_       |
| `TERM=dumb`                   | Również wyłącza animację.                                                                       | _(wykrywane)_           |
| `NO_COLOR`                    | Respektowane przez `chalk` — ustaw, by całkowicie wyłączyć kolory ANSI. Przydatne w niektórych przeglądarkach logów CI. | _(domyślnie kolory)_ |

## Referencja poleceń

```
swarms api-key                Otwórz stronę kluczy API w przeglądarce
swarms login                  Zweryfikuj, że SWARMS_API_KEY jest ustawione
swarms whoami                 Pokaż aktywny klucz (zamaskowany) i base URL

swarms launch agent           Opublikuj agenta
swarms launch prompt          Opublikuj prompt
swarms launch token           Stokenizuj agenta on-chain

swarms list                   Twoje opublikowane produkty, jako czerwono/białe drzewo
swarms list-tokenized         Każdy tokenizowany produkt na marketplace
                              (alias: swarms tokens)
swarms open <id|ca>           Otwórz stronę ofertową produktu w przeglądarce

swarms claim                  Odbierz opłaty z jednego tokenizowanego produktu (po mint tokena)
swarms claim-all              Odbierz opłaty z wielu produktów
```

Uruchom `swarms <command> --help` w dowolnym momencie, by zobaczyć kanoniczną listę flag. Pomoc dla podpoleceń (`swarms launch --help`, `swarms list-tokenized --help` itd.) używa tego samego renderowania.

Szczegółową dokumentację podpoleceń, formaty manifestów i przykłady workflow znajdziesz w [angielskim README](../README.md#command-reference).

## Model bezpieczeństwa

CLI jest zaprojektowane do użytku w środowiskach, gdzie poświadczenia muszą być audytowalne i odtwarzalne.

**Uwierzytelnianie.**
Klucz API jest czytany wyłącznie z `$SWARMS_API_KEY` i wysyłany jako `Authorization: Bearer <key>` przez HTTPS. CLI nie zapisuje, nie cache'uje ani nie utrwala klucza API nigdzie na dysku. Klucze są zarządzane pod adresem <https://swarms.world/platform/api-keys> i mogą być unieważnione w dowolnym momencie.

**Obsługa klucza prywatnego portfela.**
Klucz prywatny portfela wymagany przez `claim`, `claim-all` i `launch token` jest pozyskiwany w następującej kolejności: jawna flaga `--private-key` → `$SWARMS_WALLET_PRIVATE_KEY` → `$PRIVATE_KEY` → interaktywny prompt (ukryte wejście, bez echa, bez historii). Klucz jest trzymany w pamięci procesu przez czas trwania jednego polecenia i **nigdy** nie jest zapisywany na dysk, logowany ani cache'owany. CLI nie posiada trybu "zapamiętaj mój portfel".

**Transport.**
Wszystkie żądania używają HTTPS do `https://swarms.world`. Host jest zakodowany na sztywno — nie ma nadpisania przez zmienną środowiskową — więc zbłąkana zmienna shella nie może przekierować klucza Bearer ani klucza prywatnego portfela do innego hosta. CLI nigdy nie wyłącza weryfikacji TLS pod żadną flagą.

**Telemetria.**
CLI nie wysyła żadnej telemetrii. Jedyne wywołania sieciowe, jakie wykonuje, idą do endpointów API marketplace wymienionych w [Referencji poleceń](../README.md#command-reference) i tylko wtedy, gdy zostanie wywołane polecenie, które ich potrzebuje.

## Kody wyjścia

| Kod  | Znaczenie                                                                       |
| ---- | ------------------------------------------------------------------------------- |
| 0    | Sukces                                                                          |
| 1    | Błąd polecenia — niepoprawne wejście, błąd walidacji, odpowiedź API spoza 2xx   |
| 130  | Przerwane przez SIGINT (Ctrl-C); kursor jest przywracany przy wyjściu           |

`claim-all` zwraca 1, jeśli pojedyncze żądanie odbioru zawiodło, nawet jeśli inne się powiodły; sprawdź linię podsumowania na dole wyjścia, by zobaczyć status każdego mint.

## Licencja

Apache License 2.0. Zobacz [LICENSE](../LICENSE).
