# 08 — Wireframes das Telas Principais

← [Voltar ao índice](../README.md)

Wireframes de baixa fidelidade (ASCII) das telas-chave. Servem de base para o protótipo de
alta fidelidade (Figma). Convenções: `[Botão]`, `( )` opção, `▸` navegação, `🔘` ativo.

> **Design system EntreMesas:** tom noturno (dark-first), cantos arredondados, tipografia
> legível em baixa luz, cores de status sociais consistentes (💚❤️🔥🤝🎉🚫).

---

## 8.1 App do Cliente

### Tela 1 — Escanear QR (entrada)
```
┌─────────────────────────────┐
│         EntreMesas          │
│                             │
│   ┌───────────────────┐     │
│   │                   │     │
│   │   [ câmera QR ]   │     │
│   │     ▢ ▢ ▢ ▢       │     │
│   │                   │     │
│   └───────────────────┘     │
│                             │
│  Aponte para o QR da mesa   │
│                             │
│  ───────── ou ─────────     │
│  [ Digitar código da mesa ] │
└─────────────────────────────┘
```

### Tela 2 — Boas-vindas pós-scan
```
┌─────────────────────────────┐
│  🍻 Bar do Márcio           │
│  Você está na  MESA 07      │
│                             │
│  ┌───────────────────────┐  │
│  │ 💰 Conta da mesa      │  │
│  │      R$ 0,00          │  │
│  └───────────────────────┘  │
│                             │
│  Como quer aproveitar?      │
│  ┌───────────────────────┐  │
│  │ 📲 Acompanhar pelo    │  │
│  │    WhatsApp           │  │
│  └───────────────────────┘  │
│  ┌───────────────────────┐  │
│  │ 💞 Conhecer o         │  │
│  │    Social Bar         │  │
│  └───────────────────────┘  │
│                             │
│  🔒 Sua privacidade importa │
└─────────────────────────────┘
```

### Tela 3 — Minha Conta (tempo real)
```
┌─────────────────────────────┐
│ ‹ Mesa 07 · Bar do Márcio   │
├─────────────────────────────┤
│  💰 TOTAL ACUMULADO         │
│      R$ 159,00   ● ao vivo  │
├─────────────────────────────┤
│  21:43                      │
│  2x Heineken    R$ 24,00    │
│  1x Batata      R$ 35,00    │
│                             │
│  21:20                      │
│  4x Caipirinha  R$ 76,00 🚩 │
│     "em contestação"        │
│  2x Heineken    R$ 24,00    │
├─────────────────────────────┤
│ [ Dividir ] [ Chamar garçom]│
│ [     Solicitar fechamento ]│
└─────────────────────────────┘
   🏠 Conta   💞 Social   👤 Perfil
```

### Tela 4 — Dividir conta
```
┌─────────────────────────────┐
│ ‹ Dividir conta — R$ 159,00 │
├─────────────────────────────┤
│ Como dividir?               │
│ 🔘 Igual  ( )Por item ( )Valor│
├─────────────────────────────┤
│ Pessoas na mesa:  3         │
│                             │
│  Você        R$ 53,00  ⏳   │
│  Pessoa 2    R$ 53,00  ✅   │
│  Pessoa 3    R$ 53,00  ⏳   │
├─────────────────────────────┤
│  [ Pagar minha parte (Pix) ]│
│  [ Pagar no caixa ]         │
└─────────────────────────────┘
```

### Tela 5 — Contestar item
```
┌─────────────────────────────┐
│ ‹ Contestar lançamento      │
├─────────────────────────────┤
│ Item: 4x Caipirinha         │
│       R$ 76,00 · 21:20      │
│                             │
│ Qual o problema?            │
│  ( ) Não pedi este item     │
│  (🔘) Quantidade errada     │
│  ( ) Preço diferente        │
│  ( ) Outro                  │
│                             │
│ Observação (opcional):      │
│ ┌─────────────────────────┐ │
│ │ Pedimos só 2            │ │
│ └─────────────────────────┘ │
│                             │
│ [ Enviar contestação ]      │
└─────────────────────────────┘
```

---

## 8.2 App do Cliente — Social Bar

### Tela 6 — Criar perfil social
```
┌─────────────────────────────┐
│ ‹ Entrar no Social Bar      │
├─────────────────────────────┤
│   ( + foto opcional )       │
│                             │
│ Nickname                    │
│ ┌─────────────────────────┐ │
│ │ Bia                     │ │
│ └─────────────────────────┘ │
│ Faixa etária  [ 25-34 ▾ ]   │
│                             │
│ Seu status:                 │
│  💚 ❤️🔘 🔥 🤝 🎉 🚫        │
│                             │
│ Interesses:                 │
│ [música][viagem][+ add]     │
│                             │
│ Bio (curta):                │
│ ┌─────────────────────────┐ │
│ │ Aqui pra rir e dançar 🕺 │ │
│ └─────────────────────────┘ │
│                             │
│ 🔒 Ninguém vê seu telefone  │
│ [ Entrar no Social Bar ]    │
└─────────────────────────────┘
```

### Tela 7 — Mapa do Bar
```
┌─────────────────────────────┐
│  💞 Social · Bar do Márcio  │
│  Filtros:[Todos][❤️][🤝][⚙]│
├─────────────────────────────┤
│   ┌──────┐      ┌──────┐    │
│   │Mesa03│      │Mesa05│    │
│   │🎉 😎😎│      │ livre│    │
│   └──────┘      └──────┘    │
│   ┌──────┐      ┌──────┐    │
│   │Mesa07│      │Mesa12│    │
│   │❤️ Ana │      │💚Carlos│  │
│   │🤝 João│      │❤️Mariana│ │
│   └──────┘      └──────┘    │
│   ┌────────────────────┐    │
│   │ Balcão  🔥🔥🤝      │    │
│   └────────────────────┘    │
├─────────────────────────────┤
│ 28 pessoas no Social agora  │
└─────────────────────────────┘
   🏠 Conta   💞 Social   👤 Perfil
```

### Tela 8 — Mini-perfil + convite
```
┌─────────────────────────────┐
│ ‹ Mesa 12                   │
├─────────────────────────────┤
│        ( foto )             │
│      Mariana  ❤️            │
│      25-34 · Mesa 12        │
│                             │
│ "Amo um forró e um vinho 🍷"│
│ Interesses: música, dança   │
├─────────────────────────────┤
│ [ 💬 Enviar convite ]       │
│ [ 🚫 Bloquear ] [ 🚩 Denunciar]│
└─────────────────────────────┘
```

### Tela 9 — Chat interno
```
┌─────────────────────────────┐
│ ‹ Mariana ❤️   🚫  🚩       │
├─────────────────────────────┤
│            Oi! Curti sua bio │
│            ──────────── 21:50│
│  Haha obrigada! Forró tb? 😄 │
│  21:51 ──────────────       │
│            Demais. Tô na 07  │
│            ──────────── 21:52│
│                             │
│  🛈 As mensagens somem ao    │
│     sair do bar.            │
├─────────────────────────────┤
│ [ mensagem... ]        [ ➤ ]│
└─────────────────────────────┘
```

---

## 8.3 App do Garçom

### Tela 10 — Painel do garçom
```
┌─────────────────────────────┐
│ 👋 Camila · Suas mesas      │
├─────────────────────────────┤
│ 🔔 FILA (3)                 │
│  Mesa 07 · Fechamento  2min │
│  Mesa 12 · Serviço     1min │
│  Balcão  · Ajuda       <1min│
├─────────────────────────────┤
│ MINHAS MESAS                │
│  03  R$120  •  05 livre     │
│  07  R$159 🚩 • 12  R$240   │
│  Balcão R$95                │
├─────────────────────────────┤
│ [ + Lançar pedido ]         │
└─────────────────────────────┘
```

### Tela 11 — Lançar pedido
```
┌─────────────────────────────┐
│ ‹ Lançar — Mesa 07          │
├─────────────────────────────┤
│ 🔎 [ buscar produto... ]    │
│ Cervejas                    │
│  Heineken   R$12  [ - 2 + ] │
│  Original   R$10  [ - 0 + ] │
│ Porções                     │
│  Batata     R$35  [ - 1 + ] │
│ Drinks                      │
│  Caipirinha R$19  [ - 0 + ] │
├─────────────────────────────┤
│ Carrinho: 2x Heineken,      │
│           1x Batata = R$59  │
│ [ Confirmar lançamento ]    │
└─────────────────────────────┘
```

### Tela 12 — Resolver contestação
```
┌─────────────────────────────┐
│ 🚩 Contestação — Mesa 07    │
├─────────────────────────────┤
│ Item: 4x Caipirinha R$76    │
│ Motivo: Quantidade errada   │
│ Cliente: "Pedimos só 2"     │
│ Lançado por: Camila · 21:20 │
├─────────────────────────────┤
│ [ ✅ Aceitar (corrigir p/ 2)]│
│ [ ❌ Manter lançamento ]     │
│ Nota: [_______________]     │
└─────────────────────────────┘
```

---

## 8.4 Painel Admin (web) — telas-chave

### Tela 13 — Dashboard (ver ASCII completo em [07](./07-painel-admin.md))
```
┌──────────────────────────────────────────────┐
│ Faturamento R$4.820 ▲12% │ Mesas 14/20 │ 63👥 │
│ [gráfico/hora] │ [top produtos] │ [mapa salão]│
│ 🚩2 contestações  🔔3 chamadas  ⚠️1 denúncia   │
└──────────────────────────────────────────────┘
```

### Tela 14 — Editor de mesas / geofence
```
┌──────────────────────────────────────────────┐
│ Mapa do salão            [Salvar layout]      │
│  ┌─────────── (arraste as mesas) ──────────┐  │
│  │  [03] [05]      ╭─ geofence ─╮          │  │
│  │  [07] [12]      │  (polígono) │          │  │
│  │  [Balcão]       ╰────────────╯          │  │
│  └──────────────────────────────────────────┘ │
│ [+ Nova mesa]  [Gerar QRs]  [Imprimir QRs]    │
└──────────────────────────────────────────────┘
```

### Tela 15 — Moderação local
```
┌──────────────────────────────────────────────┐
│ Denúncias da noite                            │
│ ───────────────────────────────────────────  │
│ ⚠️ Assédio · severidade ALTA · auto-suspenso  │
│    device #a1b2 · 21:55  [Ver evidência][Banir]│
│ • Spam · severidade média · em revisão        │
│    device #c3d4 · 21:30  [Aprovar][Banir]     │
└──────────────────────────────────────────────┘
```

---

## 8.5 Notificação WhatsApp (mock)
```
┌─────────────────────────────┐
│ EntreMesas · Bar do Márcio  │
├─────────────────────────────┤
│ 🧾 Novo lançamento — Mesa 07│
│                             │
│ • 2x Cerveja Heineken       │
│   R$ 24,00                  │
│ • 1x Batata Frita           │
│   R$ 35,00                  │
│                             │
│ 💰 Total da mesa: R$ 159,00 │
│ 🕒 21:43                    │
│                             │
│ Ver conta completa ▸        │
│              21:43 ✓✓       │
└─────────────────────────────┘
```

---

← [Anterior: Painel Admin](./07-painel-admin.md) | [Próximo: Segurança e Privacidade →](./09-seguranca-privacidade.md)
