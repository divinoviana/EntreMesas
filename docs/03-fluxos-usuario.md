# 03 — Fluxos de Usuário

← [Voltar ao índice](../README.md)

---

## 3.1 Mapa de Jornadas

```mermaid
graph LR
    Q[📷 Escaneia QR<br/>da mesa] --> ASSOC[Associação<br/>à mesa]
    ASSOC --> OPT1{Ativar<br/>WhatsApp?}
    ASSOC --> OPT2{Entrar no<br/>Social Bar?}
    OPT1 -->|sim| CONS[Acompanhamento<br/>de consumo]
    OPT2 -->|sim| SOC[Perfil social<br/>+ mapa do bar]
    CONS --> DIV[Dividir conta]
    CONS --> FECHA[Fechar conta]
    SOC --> CHAT[Conversas]
    FECHA --> SAIR[Sair / sessão expira]
    CHAT --> SAIR
    SAIR --> END[Perfil social encerrado<br/>histórico de consumo guardado]
```

> **Princípio de design:** o cliente obtém **valor antes de qualquer cadastro pesado**. O
> primeiro lançamento aparece em segundos; a criação de perfil social é opcional e posterior.

---

## 3.2 Fluxo de Onboarding (escanear QR → associação)

```mermaid
sequenceDiagram
    actor U as Cliente
    participant App as App EntreMesas
    participant API as Backend
    participant DB as PostgreSQL

    U->>App: Abre câmera e escaneia QR da Mesa 07
    App->>App: Decodifica token dinâmico (TOTP)
    App->>API: POST /sessions {qrToken, deviceId, geo}
    API->>API: Valida token + geofence (PostGIS)
    alt Token válido e dentro do bar
        API->>DB: Cria session (device ↔ mesa 07 ↔ bar)
        API-->>App: 200 {sessionId, mesa, cardápio, conta atual}
        App-->>U: "Você está na Mesa 07 do Bar do Márcio 🍻"
        App-->>U: Mostra 2 opções: [Ativar WhatsApp] [Entrar no Social Bar]
    else Token inválido / fora do bar
        API-->>App: 403 (não está no local)
        App-->>U: "Não conseguimos confirmar que você está no bar."
    end
```

**Estados da tela inicial pós-scan:**
- Cabeçalho: nome do bar + número da mesa.
- Cartão de conta: "R$ 0,00" (ou valor atual se a mesa já tem consumo).
- Dois CTAs claros: **Acompanhar pelo WhatsApp** e **Conhecer o Social Bar**.
- Rodapé: "Sua privacidade é levada a sério. [Saiba como]".

---

## 3.3 Fluxo de Opt-in do WhatsApp

```mermaid
sequenceDiagram
    actor U as Cliente
    participant App
    participant API
    participant WA as WhatsApp Cloud API

    U->>App: Toca "Acompanhar pelo WhatsApp"
    App->>U: Explica o que receberá + pede consentimento
    U->>App: Confirma (checkbox LGPD)
    App->>API: POST /sessions/:id/whatsapp-optin {phone}
    API->>WA: Inicia conversa (template de boas-vindas)
    WA-->>U: 📲 "Olá! Você está na Mesa 07. Receberá aqui os lançamentos."
    U->>WA: Responde/confirma (janela de 24h aberta)
    WA-->>API: webhook (mensagem recebida → confirma opt-in)
    API->>DB: marca whatsapp_optin = true
```

> Detalhes técnicos de templates, janela de 24h e custos em
> [10 — Integração WhatsApp](./10-integracao-whatsapp.md).

---

## 3.4 Fluxo de Consumo em Tempo Real (núcleo do Módulo 1)

```mermaid
sequenceDiagram
    actor G as Garçom
    actor U as Cliente
    participant AppG as App Garçom
    participant API
    participant WS as WebSocket
    participant WA as WhatsApp
    participant App as App Cliente

    G->>AppG: Seleciona Mesa 07 → 2x Heineken, 1x Batata
    AppG->>API: POST /orders/07/items
    API->>API: Persiste + recalcula total da mesa
    par Tempo real no app
        API->>WS: order.created (room table:07)
        WS-->>App: 🔔 atualiza conta ao vivo
    and Notificação WhatsApp
        API->>WA: template de lançamento
        WA-->>U: 📲 mensagem com itens + total
    end
    U->>App: Vê "Total acumulado: R$ 159,00"
```

**Conteúdo da notificação (exemplo real):**
```
🧾 Novo lançamento — Mesa 07

• 2x Cerveja Heineken — R$ 24,00
• 1x Batata Frita — R$ 35,00

💰 Total acumulado da mesa: R$ 159,00
🕒 21:43

Ver conta completa ▸ entremesas.app/m/07
```

---

## 3.5 Fluxo de Divisão de Conta

```mermaid
graph TD
    A[Cliente abre 'Dividir conta'] --> B{Modo de divisão}
    B -->|Igual| C[Divide total ÷ nº de pessoas na mesa]
    B -->|Por item| D[Cada um marca o que consumiu]
    B -->|Por valor| E[Define valor manual por pessoa]
    C & D & E --> F[Mostra valor de cada participante]
    F --> G{Pagar agora?}
    G -->|Pix/cartão no app| H[Gateway de pagamento]
    G -->|No caixa| I[Gera resumo p/ o garçom]
    H --> J[Confirma pagamento individual]
    J --> K{Todos pagaram?}
    K -->|sim| L[Conta da mesa quitada ✅]
    K -->|não| F
```

**Regras-chave:**
- A divisão é **colaborativa**: cada participante na mesa vê e confirma sua parte.
- "Por item" usa os `order_items` reais — sem digitação manual de produtos.
- Itens compartilhados (ex.: a porção de batata) podem ser rateados entre quem marcar.
- A conta só é considerada quitada quando a soma das partes = total da mesa.

---

## 3.6 Fluxo de Contestação de Lançamento

```mermaid
sequenceDiagram
    actor U as Cliente
    participant App
    participant API
    participant WS
    participant AppG as App Garçom/Gerente

    U->>App: Toca "Contestar" em "1x Caipirinha"
    App->>U: Pede motivo (não pedi / quantidade errada / preço)
    U->>App: "Não pedi este item"
    App->>API: POST /orders/items/:id/dispute
    API->>DB: cria dispute (status: aberta) + congela item
    API->>WS: dispute.created (room admin do bar)
    WS-->>AppG: 🚩 "Mesa 07 contestou 1x Caipirinha"
    AppG->>API: resolve (aceitar/rejeitar + nota)
    API->>WS: dispute.resolved
    WS-->>App: notifica cliente do desfecho
```

> Contestar **não** remove o item automaticamente — ele entra em estado "em revisão" e
> exige decisão da equipe, preservando o controle do estabelecimento e o histórico.

---

## 3.7 Fluxo de Chamar Garçom

```mermaid
graph LR
    A[Cliente toca 'Chamar garçom'] --> B{Tipo}
    B -->|Pedir algo| C[Garçom voltar à mesa]
    B -->|Fechar conta| D[Pedido de fechamento]
    B -->|Ajuda| E[Atendimento geral]
    C & D & E --> F[Entra na FILA priorizada]
    F --> G[App do garçom mostra mesa + tipo + tempo de espera]
    G --> H[Garçom marca 'a caminho' → 'atendido']
    H --> I[Cliente vê status da chamada]
```

A fila prioriza por **tempo de espera** e **tipo** (fechamento e contestação acima de
chamadas genéricas), evitando que mesas fiquem esquecidas.

---

## 3.8 Fluxo de Fechamento da Conta

```mermaid
sequenceDiagram
    actor U as Cliente
    participant App
    participant API
    participant AppG as Garçom
    participant PAY as Pagamento

    U->>App: "Solicitar fechamento"
    App->>API: POST /sessions/:id/checkout-request
    API->>AppG: 🔔 Mesa 07 quer fechar
    alt Pagamento no app
        U->>PAY: Paga (Pix/cartão) — individual ou total
        PAY-->>API: confirmação
        API->>App: "Conta paga ✅ Boa noite!"
    else Pagamento no caixa
        AppG->>API: confirma recebimento
        API->>App: "Conta fechada. Até a próxima!"
    end
    API->>API: encerra sessão → expira perfil social
```

---

## 3.9 Fluxo do Social Bar (opt-in → conexão)

```mermaid
sequenceDiagram
    actor U as Bia (Mesa 07)
    actor V as João (Mesa 12)
    participant App
    participant API
    participant WS
    participant MOD as Moderação IA

    U->>App: "Entrar no Social Bar"
    App->>U: Cria perfil efêmero (nick, foto opc., faixa etária, status)
    U->>MOD: foto/descrição passam por moderação
    MOD-->>API: aprovado
    API->>WS: presence.join (room social do bar)
    WS-->>V: mapa atualiza: "Mesa 07 — Bia ❤️"
    V->>App: Vê Bia no mapa → "Enviar convite p/ conversa"
    App->>API: POST /conversations/invite {to: Bia}
    API->>MOD: valida (não está bloqueado, sem spam)
    API->>WS: invite.received
    WS-->>U: 🔔 "João quer conversar"
    U->>App: Aceita
    API->>WS: conversation.opened (room conversation:{id})
    U<<->>V: 💬 chat interno (sem trocar contato)
```

**Salvaguardas embutidas no fluxo:**
- Status `🚫 Não disponível` esconde o usuário de convites.
- Convite passa por checagem de bloqueio e *rate limit* (antispam).
- Toda mensagem é moderada (texto e imagem) antes/ao ser entregue.
- Botões **Bloquear** e **Denunciar** sempre acessíveis no chat.

---

## 3.10 Fluxo de Denúncia e Bloqueio

```mermaid
sequenceDiagram
    actor U as Cliente
    participant App
    participant API
    participant MOD as Moderação
    participant ADM as Equipe / Admin Bar

    U->>App: Toca "Denunciar" (assédio)
    App->>API: POST /reports {targetUser, motivo, evidência=chat}
    API->>MOD: avalia automaticamente (severidade)
    alt Severidade alta (IA confiante)
        MOD->>API: suspende alvo imediatamente
        API-->>U: "Usuário suspenso. Obrigado por avisar."
    else Severidade ambígua
        MOD->>ADM: encaminha p/ revisão humana
    end
    API->>API: registra para histórico anti-reincidência (por device)
```

- **Bloqueio** é instantâneo e unilateral: some do mapa e do chat um do outro.
- **Banimento por device** impede que o agressor crie novo perfil na mesma noite/local.

---

## 3.11 Fluxo do Garçom (operação)

```mermaid
graph TD
    L[Login no app do garçom] --> M[Vê mesas atribuídas]
    M --> N{Ação}
    N -->|Lançar pedido| O[Seleciona mesa → itens → confirma]
    N -->|Atender chamada| P[Fila priorizada de chamadas]
    N -->|Resolver contestação| Q[Aceitar/rejeitar item]
    N -->|Fechar mesa| R[Confirma pagamento]
    O --> S[Dispara tempo real + WhatsApp]
    P & Q & R --> M
```

---

## 3.12 Fluxo do Proprietário (gestão)

```mermaid
graph LR
    A[Login no painel web] --> B[Dashboard tempo real]
    B --> C[Mesas ocupadas + faturamento ao vivo]
    B --> D[Mapa social: engajamento]
    A --> E[Gestão de cardápio]
    A --> F[Gestão de mesas e QR codes]
    A --> G[Gestão de equipe RBAC]
    A --> H[Relatórios: vendas + engajamento]
    A --> I[Moderação: denúncias do local]
```

> Telas detalhadas em [08 — Wireframes](./08-wireframes.md) e métricas em
> [07 — Painel Administrativo](./07-painel-admin.md).

---

← [Anterior: Arquitetura](./02-arquitetura.md) | [Próximo: Banco de Dados →](./04-banco-de-dados.md)
