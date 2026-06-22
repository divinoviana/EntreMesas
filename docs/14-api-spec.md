# 14 — Especificação de API

← [Voltar ao índice](../README.md)

Contrato de alto nível da API. REST para CRUD/comandos; **WebSocket (Socket.IO)** para
tempo real. Base: `https://api.entremesas.app/v1`. Auth: `Authorization: Bearer <jwt>`.

> Convenções: valores monetários em **centavos** (`*_cents`); datas em **ISO-8601 UTC**;
> erros no padrão *RFC 7807* (`application/problem+json`); paginação por cursor.

---

## 14.1 Autenticação e Sessão

| Método | Rota | Descrição | Auth |
|---|---|---|---|
| POST | `/auth/device` | Registra/retoma device anônimo → tokens | pública |
| POST | `/auth/refresh` | Renova access token (refresh rotativo) | refresh |
| POST | `/auth/staff/login` | Login de equipe (e-mail/senha) | pública |
| POST | `/sessions` | Cria sessão de mesa (escaneou QR) | device |
| GET | `/sessions/:id` | Estado da sessão (mesa, conta, flags) | device |
| POST | `/sessions/:id/heartbeat` | Mantém presença (TTL) | device |
| POST | `/sessions/:id/whatsapp-optin` | Ativa WhatsApp (telefone + consentimento) | device |
| POST | `/sessions/:id/social-optin` | Ativa Social Bar | device |
| POST | `/sessions/:id/close` | Encerra sessão (sai do bar) | device |

### Exemplo — criar sessão
```http
POST /v1/sessions
Authorization: Bearer <device_jwt>
Content-Type: application/json

{
  "qrToken": "07.482913",          // tablePublicId.totp
  "deviceUid": "a1b2c3...",
  "geo": { "lat": -23.561, "lng": -46.656 }
}
```
```json
// 201 Created
{
  "sessionId": "9f...",
  "establishment": { "id": "e1", "name": "Bar do Márcio" },
  "table": { "id": "t7", "label": "07" },
  "order": { "id": "o1", "totalCents": 0, "items": [] },
  "features": { "social": true, "payInApp": false },
  "wsToken": "eyJ..."              // token p/ conectar no WebSocket
}
```
```json
// 403 — fora do estabelecimento
{ "type":"/errors/presence", "title":"Fora do local",
  "detail":"Não confirmamos que você está no estabelecimento." }
```

---

## 14.2 Consumo (Módulo 1)

| Método | Rota | Descrição | Auth |
|---|---|---|---|
| GET | `/orders/:tableId/current` | Conta atual da mesa | device(sessão) |
| POST | `/orders/:tableId/items` | Lançar item(ns) na mesa | staff |
| PATCH | `/orders/items/:id` | Editar/anular item | staff |
| POST | `/orders/items/:id/dispute` | Contestar item | device |
| POST | `/disputes/:id/resolve` | Resolver contestação | staff |
| GET | `/orders/history` | Histórico de visitas do device | device |
| POST | `/waiter-calls` | Chamar garçom (service/checkout/help) | device |
| PATCH | `/waiter-calls/:id` | Atualizar status (enroute/done) | staff |
| POST | `/sessions/:id/checkout-request` | Solicitar fechamento | device |

### Exemplo — lançar item
```http
POST /v1/orders/t7/items
Authorization: Bearer <staff_jwt>

{
  "items": [
    { "productId": "p_heineken", "quantity": 2 },
    { "productId": "p_batata", "quantity": 1 }
  ],
  "externalRef": "pdv-9931"        // idempotência (integração PDV)
}
```
```json
// 201
{
  "orderId": "o1",
  "added": [
    {"name":"Cerveja Heineken","quantity":2,"unitPriceCents":1200,"lineTotalCents":2400},
    {"name":"Batata Frita","quantity":1,"unitPriceCents":3500,"lineTotalCents":3500}
  ],
  "totalCents": 15900
}
```

### Exemplo — contestar item
```http
POST /v1/orders/items/oi_55/dispute
{ "reason": "wrong_qty", "detail": "Pedimos só 2" }
```

---

## 14.3 Divisão e Pagamento (Módulo 1)

| Método | Rota | Descrição | Auth |
|---|---|---|---|
| POST | `/orders/:id/split` | Cria divisão (equal/by_item/by_amount) | device |
| GET | `/orders/:id/split` | Estado da divisão (parcelas) | device |
| PATCH | `/splits/:id/shares/:shareId` | Atualiza/confirma parcela | device |
| POST | `/payments` | Inicia pagamento (Pix/cartão) — Fase 2 | device |
| GET | `/payments/:id` | Status do pagamento | device |

```http
POST /v1/orders/o1/split
{ "mode": "by_item",
  "assignments": [ { "deviceId":"d1", "orderItemIds":["oi1","oi2"] } ] }
```

---

## 14.4 Social Bar (Módulo 2)

| Método | Rota | Descrição | Auth |
|---|---|---|---|
| POST | `/social/profile` | Cria/atualiza perfil efêmero | device(social) |
| PATCH | `/social/profile/status` | Muda status (💚❤️🔥🤝🎉🚫) | device(social) |
| GET | `/social/map` | Mapa do bar (mesas, pessoas, status) | device(social) |
| GET | `/social/profiles/:id` | Mini-perfil de alguém | device(social) |
| POST | `/conversations/invite` | Enviar convite | device(social) |
| POST | `/conversations/:id/respond` | Aceitar/recusar | device(social) |
| GET | `/conversations` | Minhas conversas | device(social) |
| GET | `/conversations/:id/messages` | Mensagens (paginado) | device(social) |
| POST | `/conversations/:id/messages` | Enviar mensagem (moderada) | device(social) |
| POST | `/blocks` | Bloquear usuário | device |
| POST | `/reports` | Denunciar | device |

### Exemplo — mapa social
```json
// GET /v1/social/map
{
  "establishmentId":"e1",
  "activeProfiles": 28,
  "tables": [
    { "label":"07", "count":2, "dominantStatus":"flirt",
      "profiles":[
        {"id":"sp1","nickname":"Ana","status":"flirt"},
        {"id":"sp2","nickname":"João","status":"friends"}
      ] },
    { "label":"12", "count":2, "dominantStatus":"serious",
      "profiles":[
        {"id":"sp3","nickname":"Carlos","status":"serious"},
        {"id":"sp4","nickname":"Mariana","status":"flirt"}
      ] }
  ]
}
```

### Exemplo — enviar mensagem (com moderação)
```http
POST /v1/conversations/c1/messages
{ "body": "Oi! Curti sua bio 😄" }
```
```json
// 201 — aprovada
{ "id":"m1","status":"approved","createdAt":"2026-06-22T00:50:00Z" }
// 422 — bloqueada pela moderação
{ "type":"/errors/moderation","title":"Mensagem bloqueada",
  "detail":"Conteúdo viola as regras da comunidade.","category":"contact_sharing" }
```

---

## 14.5 Painel Admin

| Método | Rota | Descrição | Auth |
|---|---|---|---|
| GET | `/admin/dashboard` | Métricas ao vivo | manager+ |
| GET | `/admin/reports/sales` | Relatório de vendas (filtros) | manager+ |
| GET | `/admin/reports/engagement` | Relatório de engajamento | manager+ |
| CRUD | `/admin/products` `/admin/categories` | Cardápio | manager+ |
| CRUD | `/admin/tables` | Mesas + posição no mapa | manager+ |
| POST | `/admin/tables/:id/qr` | (Re)gerar QR da mesa | manager+ |
| PUT | `/admin/geofence` | Definir polígono do local | owner |
| CRUD | `/admin/staff` | Equipe + papéis | owner |
| GET | `/admin/moderation/reports` | Denúncias do local | manager+ |
| POST | `/admin/moderation/ban` | Banir device no local | manager+ |

---

## 14.6 Webhooks (entrada)

| Método | Rota | Origem |
|---|---|---|
| GET/POST | `/webhooks/whatsapp` | WhatsApp Cloud API (verify + inbound/status) |
| POST | `/webhooks/payments` | Gateway de pagamento |
| POST | `/webhooks/pdv/:provider` | PDV integrado (lançamentos externos) |

Segurança: validação de assinatura, idempotência por id de evento, processamento assíncrono.

---

## 14.7 Eventos WebSocket (Socket.IO)

Conexão: `wss://api.entremesas.app` com `auth: { wsToken }`. Cliente entra em *rooms*
conforme o contexto (mesa, social, conversa, admin).

### Servidor → Cliente (emit)

| Evento | Room | Payload | Quem recebe |
|---|---|---|---|
| `order:new` | `table:{id}` | itens + `totalCents` | clientes da mesa |
| `order:updated` | `table:{id}` | item alterado/anulado | clientes da mesa |
| `dispute:resolved` | `table:{id}` | resultado | cliente |
| `waiter-call:update` | `table:{id}` / `est:{id}:waiters` | status | cliente/garçom |
| `split:update` | `table:{id}` | parcelas | mesa |
| `social:presence` | `est:{id}:social` | join/leave/status | salão social |
| `social:invite` | `social:{deviceId}` | convite recebido | alvo |
| `conversation:opened` | `conversation:{id}` | conversa criada | ambos |
| `message:new` | `conversation:{id}` | mensagem (já moderada) | participantes |
| `moderation:action` | `social:{deviceId}` | bloqueio/suspensão | alvo |
| `admin:metrics` | `est:{id}:admin` | snapshot ao vivo | gestor |

### Cliente → Servidor (emit)

| Evento | Payload | Efeito |
|---|---|---|
| `presence:heartbeat` | `{ sessionId }` | renova TTL de presença |
| `typing` | `{ conversationId }` | indicador "digitando" |
| `message:send` | `{ conversationId, body }` | envia (passa por moderação) |

### Exemplo — recebimento de lançamento em tempo real
```js
socket.on('order:new', (e) => {
  // e = { tableId, added:[...], totalCents:15900, at:'2026-06-22T00:43:00Z' }
  updateBill(e);
});
```

---

## 14.8 Padrões Transversais

- **Versionamento:** prefixo `/v1`; mudanças incompatíveis → `/v2`.
- **Rate limiting:** por device/IP/rota (cabeçalhos `X-RateLimit-*`).
- **Idempotência:** header `Idempotency-Key` em POSTs sensíveis (lançar, pagar).
- **Erros:** RFC 7807 com `type`, `title`, `detail`, `instance`.
- **Paginação:** `?cursor=...&limit=...` → `{ data:[], nextCursor }`.
- **OpenAPI:** spec gerada (Swagger) para o app/admin consumirem tipos.

---

← [Anterior: Roadmap](./13-roadmap.md) | [Voltar ao índice](../README.md)
