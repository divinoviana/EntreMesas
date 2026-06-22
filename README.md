# 🍻 EntreMesas

> **Gestão de consumo em tempo real + rede social local efêmera para bares e restaurantes.**
>
> _"O que acontece entre as mesas, fica entre as mesas."_

[![Status](https://img.shields.io/badge/status-especifica%C3%A7%C3%A3o-blue)]()
[![Versão](https://img.shields.io/badge/spec-v1.0-green)]()
[![Licença](https://img.shields.io/badge/licen%C3%A7a-propriet%C3%A1ria-lightgrey)]()

---

## 📌 Sumário Executivo

**EntreMesas** é uma plataforma que transforma a experiência de quem frequenta bares e
restaurantes, unindo dois mundos que hoje vivem separados:

1. **Transparência de consumo** — o cliente acompanha em tempo real, pelo WhatsApp e pelo
   app, cada item lançado na conta da sua mesa, evitando surpresas no fechamento.
2. **Social Bar** — uma rede social *temporária e geolocalizada*, válida apenas enquanto o
   cliente está no estabelecimento, que facilita paquera, amizade e networking entre as
   pessoas presentes — **sem nunca expor telefone, e-mail ou nome real**.

Para o **estabelecimento**, é uma ferramenta de aumento de ticket médio, tempo de
permanência e fidelização, com um painel administrativo em tempo real.

O nome resume a proposta: tudo acontece **entre as mesas** — o consumo e as conexões.

---

## 🎯 O Problema

| Dor do Cliente | Dor do Estabelecimento |
|---|---|
| "Não sei quanto já gastei." | Contestações e atritos no fechamento. |
| Surpresa desagradável na conta. | Baixo ticket médio por falta de estímulo. |
| Ambiente cheio de gente, mas difícil interagir. | Clientes vão embora cedo. |
| Medo de expor dados pessoais ao paquerar. | Pouca recorrência e fidelização. |
| Dividir a conta é confuso e gera discussão. | Sem dados sobre o comportamento do salão. |

## 💡 A Solução

```
┌─────────────────────────────────────────────────────────────────┐
│                         QR CODE DA MESA                          │
│                              ↓                                   │
│        ┌──────────────────────┴──────────────────────┐         │
│        ▼                                              ▼         │
│  MÓDULO 1: CONSUMO                          MÓDULO 2: SOCIAL BAR │
│  • Notificações em tempo real               • Perfil efêmero    │
│  • Conta sempre visível                     • Status social     │
│  • Divisão de conta                         • Mapa do bar       │
│  • Chamar garçom / fechar conta             • Chat interno      │
│  • Contestar lançamento                     • 100% anônimo      │
│        │                                              │         │
│        └──────────────────────┬──────────────────────┘         │
│                              ▼                                   │
│                  PAINEL ADMIN (tempo real)                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🧭 Diferencial Competitivo

> Nenhum concorrente une, em um único produto: **(1)** transparência de consumo em tempo
> real via WhatsApp, **(2)** rede social geolocalizada e efêmera limitada ao bar, **(3)**
> ferramentas de paquera/amizade/networking, **(4)** privacidade total e **(5)** aumento
> comprovável de vendas e engajamento para o estabelecimento.

| | Comandas digitais (ex.: sistemas de PDV) | Apps de relacionamento | **EntreMesas** |
|---|:---:|:---:|:---:|
| Consumo em tempo real | ✅ | ❌ | ✅ |
| Notificação por WhatsApp | ⚠️ raro | ❌ | ✅ |
| Rede social local | ❌ | ⚠️ global | ✅ efêmera |
| Privacidade (sem expor contato) | n/a | ❌ | ✅ |
| Presença real verificada | ❌ | ❌ | ✅ |
| Valor para o bar | ⚠️ operacional | ❌ | ✅ vendas + dados |

---

## 📚 Índice da Documentação

| # | Documento | Conteúdo |
|---|---|---|
| 00 | **[README](./README.md)** | Visão geral e índice (este arquivo) |
| 01 | [Visão Geral do Produto](./docs/01-visao-geral.md) | Visão, mercado, personas, objetivos, KPIs |
| 02 | [Arquitetura do Sistema](./docs/02-arquitetura.md) | Diagramas, stack, tempo real, escalabilidade |
| 03 | [Fluxos de Usuário](./docs/03-fluxos-usuario.md) | Jornadas, diagramas de sequência |
| 04 | [Banco de Dados](./docs/04-banco-de-dados.md) | Modelo ER, DDL SQL, retenção de dados |
| 05 | [Módulo 1 — Consumo](./docs/05-modulo-consumo.md) | QR, pedidos, notificações, divisão, contestação |
| 06 | [Módulo 2 — Social Bar](./docs/06-modulo-social.md) | Perfil, status, mapa, chat, matching |
| 07 | [Painel Administrativo](./docs/07-painel-admin.md) | Dashboard, métricas, relatórios |
| 08 | [Wireframes](./docs/08-wireframes.md) | Telas principais (cliente, garçom, admin) |
| 09 | [Segurança e Privacidade](./docs/09-seguranca-privacidade.md) | LGPD, moderação por IA, anti-assédio |
| 10 | [Integração WhatsApp](./docs/10-integracao-whatsapp.md) | Business Cloud API, templates, custos |
| 11 | [Monetização](./docs/11-monetizacao.md) | Receitas, planos, precificação, unit economics |
| 12 | [MVP Inicial](./docs/12-mvp.md) | Escopo, cronograma, métricas de sucesso |
| 13 | [Roadmap](./docs/13-roadmap.md) | Evolução do produto por fases |
| 14 | [Especificação de API](./docs/14-api-spec.md) | Endpoints REST e eventos WebSocket |

---

## 🛠️ Stack Tecnológica (resumo)

| Camada | Tecnologia escolhida | Por quê |
|---|---|---|
| App mobile (cliente + garçom) | **Flutter** | Código único iOS/Android, UI fluida para o mapa de mesas, ótima performance em tempo real |
| Painel admin (web) | **Next.js (React) + TypeScript** | SSR, dashboards ricos, ecossistema maduro |
| Backend | **NestJS (Node.js + TypeScript)** | Modular, DI, WebSocket nativo (Gateways), escala bem |
| Banco de dados | **PostgreSQL + PostGIS** | Transacional, geoespacial para o mapa do bar |
| Cache / tempo real / presença | **Redis** | Pub/Sub, presença efêmera, rate limiting, filas |
| Tempo real | **Socket.IO (WebSocket) + Redis adapter** | Escala horizontal de conexões |
| Mensageria assíncrona | **BullMQ (sobre Redis)** | Jobs de notificação, moderação, expiração de sessão |
| Notificações | **WhatsApp Business Cloud API (Meta)** + FCM/APNs | Canal principal + push do app |
| Autenticação | **JWT (access + refresh)** + sessões efêmeras | Stateless, com revogação |
| Moderação por IA | **LLM + visão computacional** (texto e imagem) | Antiassédio, antispam, antinudez |
| Infraestrutura | **AWS** (ECS Fargate, RDS, ElastiCache, S3, CloudFront) | Gerenciado, elástico |
| Observabilidade | **OpenTelemetry + Grafana/Prometheus + Sentry** | Métricas, traces, erros |

> Detalhes e justificativas completas em **[02 — Arquitetura](./docs/02-arquitetura.md)**.

---

## 🚀 MVP em uma frase

> Em um **único bar piloto**, o cliente escaneia o QR da mesa, recebe lançamentos por
> WhatsApp e pelo app, vê e divide a conta, e — se quiser — ativa um perfil anônimo para
> ver quem está no salão e trocar mensagens; o dono acompanha tudo por um painel.

Escopo completo e cronograma em **[12 — MVP](./docs/12-mvp.md)**.

---

## 🗺️ Roadmap em uma imagem

```
FASE 0        FASE 1            FASE 2             FASE 3            FASE 4
Discovery  →  MVP (1 bar)   →   Social completo →  Escala (rede)  →  Plataforma
(0–2 mês)     (3–5 mês)         + pagamentos       multi-bar         (eventos, IA, B2B2C)
```

Detalhamento em **[13 — Roadmap](./docs/13-roadmap.md)**.

---

## ⚖️ Princípios de Privacidade (inegociáveis)

1. **Anonimato por padrão** — nenhum dado de contato é exposto entre usuários.
2. **Efemeridade** — o perfil social e as conversas expiram ao sair do estabelecimento.
3. **Minimização** — coletamos o mínimo necessário (LGPD, art. 6º).
4. **Presença real** — só interage quem está fisicamente no local.
5. **Consentimento explícito** — opt-in para WhatsApp e para o Social Bar separadamente.

Veja **[09 — Segurança e Privacidade](./docs/09-seguranca-privacidade.md)**.

---

_Documento de especificação preparado como entregável de arquitetura de produto. Todos os
valores monetários, métricas e prazos são estimativas para planejamento e devem ser
validados com dados de mercado e com o piloto._
