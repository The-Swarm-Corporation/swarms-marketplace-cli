# Swarms Marketplace CLI

![Image Swarms CLI](../img.png)

[![npm version](https://img.shields.io/npm/v/swarms-market.svg)](https://www.npmjs.com/package/swarms-market)
[![node](https://img.shields.io/node/v/swarms-market.svg)](https://nodejs.org)
[![license](https://img.shields.io/npm/l/swarms-market.svg)](../LICENSE)

L'interface en ligne de commande officielle pour le [Swarms Marketplace](https://swarms.world). Publiez des agents, des prompts et des tokens, parcourez le catalogue et collectez les frais de créateur de vos produits tokenisés — entièrement depuis votre terminal, avec un support de premier ordre pour le scripting, le CI/CD et les environnements sans interface graphique.

> 🌐 Autres langues : [English](../README.md) · [中文](./README.zh-CN.md) · [日本語](./README.ja.md) · [हिन्दी](./README.hi.md) · [Deutsch](./README.de.md) · [Polski](./README.pl.md) · [Português](./README.pt-BR.md)

---

## Aperçu

`swarms` est un client entièrement scriptable au-dessus de l'API HTTP du Swarms Marketplace. Il se mappe directement sur les opérations qui pilotent un business de marketplace :

- **Publiez des produits à grande échelle.** Poussez des agents, des prompts et des outils vers le marketplace depuis une seule commande, un manifeste JSON, ou un répertoire de manifestes en CI. Pas de navigateur, pas de formulaire manuel.
- **Lancez des tokens on-chain.** Tokenisez un agent en un seul appel, incluant le ticker, la devise de quote, l'image et le mode de frais. La transaction de lancement est signée avec une clé de portefeuille fournie au runtime.
- **Collectez les frais de créateur, seul ou en masse.** Réclamez les frais sur un seul token, sur chaque token que vous possédez, ou balayez chaque mint tokenisé du marketplace en un seul lot avec une sémantique « continuer en cas d'échec ».
- **Auditez votre catalogue.** Rendez vos produits publiés comme un arbre structuré, filtrez sur tokenisé uniquement, et émettez du JSON pour les dashboards en aval.
- **Découvrez le marketplace.** Paginez à travers chaque produit tokenisé (aucune clé API requise) sous forme de liste plate ou de JSON, adapté à l'indexation, au miroir ou à l'analyse.
- **Automatisez tout.** Chaque commande est non-interactive quand les bonnes variables d'environnement sont définies, retourne des codes de sortie standards, et désactive animations / prompts lors de l'exécution hors TTY ou sous `$CI`.

### Capacités d'un coup d'œil

| Capacité                                       | Commande                                             | Authentification requise      |
| ---------------------------------------------- | ---------------------------------------------------- | ----------------------------- |
| Ouvrir la page des clés API                    | `swarms api-key`                                     | Aucune                        |
| Vérifier l'authentification de l'environnement | `swarms login` · `swarms whoami`                     | Clé API                       |
| Publier un agent                               | `swarms launch agent`                                | Clé API                       |
| Publier un prompt                              | `swarms launch prompt`                               | Clé API                       |
| Lancer un token on-chain pour un agent         | `swarms launch token`                                | Clé API + clé de portefeuille |
| Lister vos produits publiés                    | `swarms list`                                        | Clé API                       |
| Parcourir tous les produits tokenisés          | `swarms list-tokenized` (alias `swarms tokens`)      | Aucune                        |
| Ouvrir la page d'annonce d'un produit          | `swarms open <id\|ca>`                               | Aucune                        |
| Réclamer les frais sur un seul mint            | `swarms claim --ca <mint>`                           | Clé de portefeuille           |
| Réclamation de frais en lot                    | `swarms claim-all`                                   | Clé de portefeuille           |
| Sortie JSON pour toute commande de lecture     | flag `--json`                                        | Identique à la commande parente |

## Compatibilité

| Exigence            | Pris en charge                                                            |
| ------------------- | ------------------------------------------------------------------------- |
| Node.js             | ≥ 18 (utilise le `fetch` natif)                                           |
| Gestionnaires de paquets | `npm`, `pnpm`, `yarn`, `bun`                                         |
| OS                  | macOS, Linux, Windows (PowerShell + WSL) ; macOS / Linux sont primaires   |
| Terminaux           | Tout terminal compatible VT100 ; caractères de bloc Unicode requis        |
| Runners CI          | GitHub Actions, GitLab CI, CircleCI, Buildkite, Jenkins, etc.             |

## Installation

```bash
# Installation globale (recommandée pour un usage quotidien en shell)
npm install -g swarms-market

# Ou exécutez sans installer (pratique pour le CI)
npx swarms-market@latest --help

# Épingler une version spécifique en CI
npm install -g swarms-market@0.1.0
```

Après installation, vérifiez :

```bash
swarms --version
swarms --help
```

> **Attention :** le nom du paquet sur npm est `swarms-market`, mais le binaire qu'il installe s'appelle `swarms`. Si vous avez déjà installé le paquet Python `swarms` (il livre un binaire portant le même nom), l'un masquera l'autre dans votre `PATH`. Exécutez `which swarms` pour voir lequel l'emporte ; désinstallez celui dont vous n'avez pas besoin, ou invoquez celui-ci directement via `npx swarms-market <command>`.

### Désinstallation

```bash
npm uninstall -g swarms-market
```

## Démarrage rapide

```bash
# 1. Obtenez une clé API (ouvre https://swarms.world/platform/api-keys)
swarms api-key

# 2. Exportez-la
export SWARMS_API_KEY="sk-…"
export SWARMS_USERNAME="your-username"   # optionnel, mais évite --user sur la plupart des commandes

# 3. Vérifiez l'authentification
swarms login

# 4. Publiez votre premier agent depuis un manifeste
swarms launch agent \
  --name "Hello Agent" \
  --description "Says hi" \
  --code-file ./agent.py \
  --free

# 5. Voyez ce que vous avez publié
swarms list

# 6. Parcourez le marketplace
swarms list-tokenized
```

## Authentification

Obtenez une clé sur <https://swarms.world/platform/api-keys> (ou exécutez `swarms api-key`). Les clés peuvent être créées, nommées et révoquées depuis cette page.

```bash
export SWARMS_API_KEY="sk-…"
swarms whoami      # confirme que la clé est chargée ; affiche les 4 premiers/derniers caractères
```

Les commandes en lecture seule qui ne modifient pas votre compte (notamment `list-tokenized` et l'ouvreur `api-key`) fonctionnent sans clé API. Toutes les autres commandes en requièrent une.

## Configuration

Toute la configuration est pilotée par les variables d'environnement. Le CLI ne lit ni n'écrit aucun fichier de configuration.

| Variable                      | Rôle                                                                                         | Par défaut              |
| ----------------------------- | -------------------------------------------------------------------------------------------- | ----------------------- |
| `SWARMS_API_KEY`              | Token Bearer pour les endpoints du marketplace (publish, list, lectures avec portée compte).  | _requis pour l'auth_    |
| `SWARMS_USERNAME`             | `--user` par défaut pour `list`. Permet à `swarms list` de fonctionner sans flag.            | _(passer --user)_       |
| `SWARMS_WALLET_PRIVATE_KEY`   | Clé privée du portefeuille (base58) pour les opérations on-chain. Conservée uniquement en mémoire. | _(invite si absente)_ |
| `PRIVATE_KEY`                 | Alias de `SWARMS_WALLET_PRIVATE_KEY`, pour la compatibilité avec les conventions `.env` courantes. | _(invite si absente)_ |
| `SWARMS_NO_ANIM`              | Définissez à n'importe quelle valeur pour désactiver l'animation d'accueil, même en terminal interactif. | _(animée si TTY)_ |
| `CI`                          | Désactive automatiquement l'animation d'accueil quand défini (défini par tous les grands fournisseurs CI). | _(détecté)_     |
| `TERM=dumb`                   | Désactive aussi l'animation.                                                                  | _(détecté)_             |
| `NO_COLOR`                    | Respecté par `chalk` — définissez pour désactiver entièrement les couleurs ANSI. Utile dans certains visualiseurs de logs CI. | _(couleurs activées par défaut)_ |

## Référence des commandes

```
swarms api-key                Ouvre la page des clés API dans votre navigateur
swarms login                  Vérifie que SWARMS_API_KEY est défini
swarms whoami                 Affiche la clé active (masquée) et l'URL de base

swarms launch agent           Publie un agent
swarms launch prompt          Publie un prompt
swarms launch token           Tokenise un agent on-chain

swarms list                   Vos produits publiés, sous forme d'arbre rouge/blanc
swarms list-tokenized         Tous les produits tokenisés du marketplace
                              (alias : swarms tokens)
swarms open <id|ca>           Ouvre la page d'annonce d'un produit dans votre navigateur

swarms claim                  Réclame les frais d'un produit tokenisé (par mint du token)
swarms claim-all              Réclame les frais sur plusieurs produits
```

Exécutez `swarms <command> --help` à tout moment pour obtenir la liste canonique des flags. L'aide des sous-commandes (`swarms launch --help`, `swarms list-tokenized --help`, etc.) utilise le même rendu.

Pour la documentation détaillée des sous-commandes, les formats de manifeste et les exemples de workflow, voir le [README en anglais](../README.md#command-reference).

## Modèle de sécurité

Le CLI est conçu pour les environnements où les identifiants doivent être auditables et reproductibles.

**Authentification.**
La clé API est lue exclusivement depuis `$SWARMS_API_KEY` et envoyée comme `Authorization: Bearer <key>` sur HTTPS. Le CLI n'écrit, ne met en cache, ni ne persiste la clé API nulle part sur le disque. Les clés sont gérées sur <https://swarms.world/platform/api-keys> et peuvent être révoquées à tout moment.

**Traitement de la clé privée du portefeuille.**
La clé privée du portefeuille requise par `claim`, `claim-all` et `launch token` est obtenue dans l'ordre suivant : flag explicite `--private-key` → `$SWARMS_WALLET_PRIVATE_KEY` → `$PRIVATE_KEY` → invite interactive (saisie cachée, sans écho, sans historique). La clé est conservée en mémoire du processus pour la durée d'une seule commande et n'est **jamais** écrite sur disque, journalisée, ni mise en cache. Le CLI n'a aucun mode « se souvenir de mon portefeuille ».

**Transport.**
Toutes les requêtes utilisent HTTPS vers `https://swarms.world`. L'hôte est codé en dur — il n'y a pas de surcharge par variable d'environnement — donc une variable shell errante ne peut pas rediriger la clé Bearer ou la clé privée du portefeuille vers un autre hôte. Le CLI ne désactive la vérification TLS sous aucune flag.

**Télémétrie.**
Le CLI n'envoie aucune télémétrie d'aucune sorte. Les seuls appels réseau qu'il fait sont vers les endpoints API du marketplace listés dans la [Référence des commandes](../README.md#command-reference), et uniquement quand une commande qui en a besoin est invoquée.

## Codes de sortie

| Code | Signification                                                                       |
| ---- | ----------------------------------------------------------------------------------- |
| 0    | Succès                                                                              |
| 1    | Erreur de commande — entrée invalide, échec de validation, réponse API non-2xx      |
| 130  | Interrompu par SIGINT (Ctrl-C) ; le curseur est restauré à la sortie                |

`claim-all` retourne 1 si une réclamation individuelle a échoué, même si d'autres ont réussi ; consultez la ligne de résumé en bas de la sortie pour le statut par mint.

## Licence

Apache License 2.0. Voir [LICENSE](../LICENSE).
