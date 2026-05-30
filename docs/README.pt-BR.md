# Swarms Marketplace CLI

![Imagem Swarms CLI](../img.png)

[![npm version](https://img.shields.io/npm/v/swarms-market.svg)](https://www.npmjs.com/package/swarms-market)
[![node](https://img.shields.io/node/v/swarms-market.svg)](https://nodejs.org)
[![license](https://img.shields.io/npm/l/swarms-market.svg)](../LICENSE)

A interface oficial de linha de comando para o [Swarms Marketplace](https://swarms.world). Publique agentes, prompts e tokens, navegue pelo catálogo e colete taxas de criador dos seus produtos tokenizados — tudo pelo terminal, com suporte de primeira classe para scripts, CI/CD e ambientes sem interface gráfica.

> 🌐 Outros idiomas: [English](../README.md) · [中文](./README.zh-CN.md) · [日本語](./README.ja.md) · [हिन्दी](./README.hi.md) · [Deutsch](./README.de.md) · [Polski](./README.pl.md) · [Français](./README.fr.md)

---

## Visão geral

`swarms` é um cliente totalmente programável sobre a API HTTP do Swarms Marketplace. Ele mapeia diretamente as operações que movem um negócio de marketplace:

- **Publique produtos em escala.** Envie agentes, prompts e ferramentas para o marketplace com um único comando, um manifesto JSON ou um diretório de manifestos no CI. Sem navegador, sem formulário manual.
- **Lance tokens on-chain.** Tokenize um agente em uma única chamada, incluindo ticker, moeda de cotação, imagem e modo de taxas. A transação de lançamento é assinada com uma chave de carteira fornecida em tempo de execução.
- **Colete taxas de criador, sozinho ou em lote.** Reivindique taxas em um único token, em todos os tokens que você possui, ou varra cada mint tokenizado do marketplace em um lote único com semântica de "continuar em caso de falha".
- **Audite seu catálogo.** Renderize os produtos publicados como uma árvore estruturada, filtre apenas os tokenizados e emita JSON para dashboards downstream.
- **Descubra o marketplace.** Navegue por cada produto tokenizado (sem chave API) como uma lista plana ou JSON, adequado para indexação, espelhamento ou analytics.
- **Automatize tudo.** Todo comando é não-interativo quando as variáveis de ambiente certas estão definidas, retorna códigos de saída padrão, e desativa animações / prompts ao rodar fora de um TTY ou sob `$CI`.

### Capacidades em resumo

| Capacidade                                      | Comando                                              | Autenticação necessária       |
| ----------------------------------------------- | ---------------------------------------------------- | ----------------------------- |
| Abrir página de chaves API                      | `swarms api-key`                                     | Nenhuma                       |
| Verificar autenticação do ambiente              | `swarms login` · `swarms whoami`                     | Chave API                     |
| Publicar um agente                              | `swarms launch agent`                                | Chave API                     |
| Publicar um prompt                              | `swarms launch prompt`                               | Chave API                     |
| Lançar token on-chain para um agente            | `swarms launch token`                                | Chave API + chave da carteira |
| Listar seus produtos publicados                 | `swarms list`                                        | Chave API                     |
| Navegar por todos os produtos tokenizados       | `swarms list-tokenized` (alias `swarms tokens`)      | Nenhuma                       |
| Abrir a página de listagem de um produto        | `swarms open <id\|ca>`                               | Nenhuma                       |
| Reivindicar taxas em um único mint              | `swarms claim --ca <mint>`                           | Chave da carteira             |
| Reivindicar taxas em lote                       | `swarms claim-all`                                   | Chave da carteira             |
| Saída JSON para qualquer comando de leitura     | flag `--json`                                        | Mesma do comando pai          |

## Compatibilidade

| Requisito          | Suportado                                                                |
| ------------------ | ------------------------------------------------------------------------ |
| Node.js            | ≥ 18 (usa `fetch` nativo)                                                |
| Gerenciadores de pacotes | `npm`, `pnpm`, `yarn`, `bun`                                       |
| SO                 | macOS, Linux, Windows (PowerShell + WSL); macOS / Linux são primários    |
| Terminais          | Qualquer terminal compatível com VT100; necessários caracteres Unicode de bloco |
| Runners de CI      | GitHub Actions, GitLab CI, CircleCI, Buildkite, Jenkins etc.             |

## Instalação

```bash
# Instalação global (recomendado para uso diário no shell)
npm install -g swarms-market

# Ou rode sem instalar (útil para CI)
npx swarms-market@latest --help

# Fixar uma versão específica no CI
npm install -g swarms-market@0.1.0
```

Após a instalação, verifique:

```bash
swarms --version
swarms --help
```

> **Atenção:** o nome do pacote no npm é `swarms-market`, mas o binário instalado é `swarms`. Se você já tem o pacote Python `swarms` instalado (ele entrega um binário com o mesmo nome), um vai sobrepor o outro no seu `PATH`. Rode `which swarms` para ver qual está ativo; desinstale o que não precisa, ou invoque este diretamente via `npx swarms-market <command>`.

### Desinstalar

```bash
npm uninstall -g swarms-market
```

## Início rápido

```bash
# 1. Pegue uma chave API (abre https://swarms.world/platform/api-keys)
swarms api-key

# 2. Exporte
export SWARMS_API_KEY="sk-…"
export SWARMS_USERNAME="your-username"   # opcional, mas dispensa --user na maioria dos comandos

# 3. Verifique a autenticação
swarms login

# 4. Publique seu primeiro agente a partir de um manifesto
swarms launch agent \
  --name "Hello Agent" \
  --description "Says hi" \
  --code-file ./agent.py \
  --free

# 5. Veja o que você publicou
swarms list

# 6. Navegue pelo marketplace
swarms list-tokenized
```

## Autenticação

Obtenha uma chave em <https://swarms.world/platform/api-keys> (ou rode `swarms api-key`). Chaves podem ser criadas, nomeadas e revogadas a partir dessa página.

```bash
export SWARMS_API_KEY="sk-…"
swarms whoami      # confirma que a chave está carregada; imprime os 4 primeiros/últimos caracteres
```

Comandos somente-leitura que não modificam sua conta (em especial `list-tokenized` e o abridor `api-key`) funcionam sem chave API. Todos os outros comandos exigem uma.

## Configuração

Toda a configuração é orientada por variáveis de ambiente. O CLI não lê nem escreve nenhum arquivo de configuração.

| Variável                      | Propósito                                                                                   | Padrão                  |
| ----------------------------- | ------------------------------------------------------------------------------------------- | ----------------------- |
| `SWARMS_API_KEY`              | Token Bearer para endpoints do marketplace (publish, list, leituras com escopo de conta).    | _necessário para auth_  |
| `SWARMS_USERNAME`             | `--user` padrão para `list`. Permite que `swarms list` funcione sem flags.                  | _(passar --user)_       |
| `SWARMS_WALLET_PRIVATE_KEY`   | Chave privada da carteira (base58) para operações on-chain. Mantida só em memória.           | _(pergunta se ausente)_ |
| `PRIVATE_KEY`                 | Alias de `SWARMS_WALLET_PRIVATE_KEY`, para compatibilidade com convenções comuns de `.env`. | _(pergunta se ausente)_ |
| `SWARMS_NO_ANIM`              | Defina com qualquer valor para desativar a animação de boas-vindas, mesmo em terminal interativo. | _(anima se TTY)_   |
| `CI`                          | Desativa automaticamente a animação de boas-vindas quando definido (todos os principais provedores CI definem). | _(detectado)_ |
| `TERM=dumb`                   | Também desativa a animação.                                                                  | _(detectado)_           |
| `NO_COLOR`                    | Respeitado por `chalk` — defina para desativar cores ANSI por completo. Útil em alguns visualizadores de log de CI. | _(cores ativas por padrão)_ |

## Referência de comandos

```
swarms api-key                Abre a página de chaves API no seu navegador
swarms login                  Verifica que SWARMS_API_KEY está definido
swarms whoami                 Mostra a chave ativa (mascarada) e a URL base

swarms launch agent           Publica um agente
swarms launch prompt          Publica um prompt
swarms launch token           Tokeniza um agente on-chain

swarms list                   Seus produtos publicados, como árvore vermelho/branco
swarms list-tokenized         Todo produto tokenizado do marketplace
                              (alias: swarms tokens)
swarms open <id|ca>           Abre a página de listagem de um produto no navegador

swarms claim                  Reivindica taxas de um produto tokenizado (por mint do token)
swarms claim-all              Reivindica taxas em muitos produtos
```

Rode `swarms <command> --help` a qualquer momento para obter a lista canônica de flags. A ajuda de subcomandos (`swarms launch --help`, `swarms list-tokenized --help` etc.) usa a mesma renderização.

Para documentação detalhada de subcomandos, formatos de manifesto e exemplos de workflow, veja o [README em inglês](../README.md#command-reference).

## Modelo de segurança

O CLI é projetado para uso em ambientes onde credenciais precisam ser auditáveis e reprodutíveis.

**Autenticação.**
A chave API é lida exclusivamente de `$SWARMS_API_KEY` e enviada como `Authorization: Bearer <key>` por HTTPS. O CLI não escreve, faz cache ou persiste a chave API em lugar algum no disco. Chaves são gerenciadas em <https://swarms.world/platform/api-keys> e podem ser revogadas a qualquer momento.

**Tratamento da chave privada da carteira.**
A chave privada da carteira exigida por `claim`, `claim-all` e `launch token` é obtida na seguinte ordem: flag explícita `--private-key` → `$SWARMS_WALLET_PRIVATE_KEY` → `$PRIVATE_KEY` → prompt interativo (entrada oculta, sem echo, sem histórico). A chave fica na memória do processo apenas durante a execução de um comando e **nunca** é escrita em disco, registrada em log ou cacheada. O CLI não possui modo "lembrar minha carteira".

**Transporte.**
Todas as requisições usam HTTPS para `https://swarms.world`. O host é hardcoded — não há override por variável de ambiente — então uma variável shell perdida não pode redirecionar a chave Bearer ou a chave privada da carteira para outro host. O CLI não desativa a verificação TLS sob nenhuma flag.

**Telemetria.**
O CLI não envia telemetria de nenhuma forma. As únicas chamadas de rede que ele faz são para os endpoints da API do marketplace listados na [Referência de comandos](../README.md#command-reference), e somente quando um comando que precisa deles é invocado.

## Códigos de saída

| Código | Significado                                                                       |
| ------ | --------------------------------------------------------------------------------- |
| 0      | Sucesso                                                                           |
| 1      | Erro de comando — entrada inválida, falha de validação, resposta API não-2xx      |
| 130    | Interrompido por SIGINT (Ctrl-C); o cursor é restaurado na saída                  |

`claim-all` retorna 1 se alguma reivindicação individual falhou, mesmo que outras tenham tido sucesso; verifique a linha de resumo no final da saída para o status por mint.

## Licença

Apache License 2.0. Veja [LICENSE](../LICENSE).
