# 07 — Painel Administrativo

← [Voltar ao índice](../README.md)

Painel web (Next.js) para o **proprietário/gerente**. Tempo real via WebSocket
(`establishment:{id}:admin`). Acesso por papel (RBAC): `owner`, `manager`, `cashier`.

---

## 7.1 Visão Geral do Dashboard

```
┌─────────────────────────────────────────────────────────────────────┐
│ 🍻 Bar do Márcio        Sex, 22/06 · 21:47        [👤 Márcio ▾]      │
├─────────────────────────────────────────────────────────────────────┤
│  💰 FATURAMENTO HOJE     🪑 MESAS OCUPADAS    👥 PESSOAS NO SALÃO     │
│     R$ 4.820,00              14 / 20              63                  │
│     ▲ 12% vs. sex passada   70% ocupação         (28 no Social Bar)  │
├─────────────────────────────────────────────────────────────────────┤
│  📈 Faturamento por hora        │  🔥 Mais vendidos hoje              │
│  ▁▂▃▅▆█▆▅                       │  1. Heineken      87un  R$1.044     │
│  18h ────────────── 22h         │  2. Batata Frita  31un  R$1.085     │
│                                 │  3. Caipirinha    44un  R$ 836      │
├─────────────────────────────────────────────────────────────────────┤
│  🗺️ MAPA DO SALÃO (consumo + social)                                 │
│  [03]R$120  [05]livre  [07]R$159❤️  [12]R$240💚  [Balcão]R$95🔥      │
│                                                                       │
│  🚩 2 contestações abertas   🔔 3 chamadas na fila   ⚠️ 1 denúncia    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 7.2 Seções e Métricas

### 7.2.1 Operação em tempo real (do enunciado)
| Bloco | Conteúdo |
|---|---|
| **Mesas ocupadas** | nº ocupadas/total, % ocupação, tempo médio por mesa |
| **Faturamento em tempo real** | faturado hoje, em aberto, ticket médio, projeção |
| **Consumos por mesa** | drill-down: itens, total, garçom, tempo aberta |
| **Usuários conectados** | total no app + total no Social Bar |
| **Chamadas e contestações** | filas ao vivo (priorizadas) |

### 7.2.2 Indicadores de interação social (do enunciado)
| Métrica | Descrição |
|---|---|
| Perfis sociais ativos | quantos ativaram o Social Bar agora |
| Distribuição de status | % por 💚 ❤️ 🔥 🤝 🎉 |
| Conversas iniciadas / aceitas | volume e taxa de aceite |
| "Calor social" por zona | onde a interação está acontecendo |
| Denúncias / bloqueios | saúde da comunidade naquela noite |

> **Privacidade:** o painel mostra **agregados e métricas**, nunca conteúdo de conversa nem
> identidade dos clientes. Denúncias trazem apenas o necessário para moderação.

---

## 7.3 Relatórios

### Relatórios de Vendas
- Faturamento por dia/semana/mês, por garçom, por categoria/produto.
- Ticket médio, itens por mesa, horários de pico.
- Curva ABC de produtos; produtos com maior contestação (qualidade).
- Comparativo "com vs. sem EntreMesas" (impacto no ticket).
- Exportação CSV/PDF; integração contábil/fiscal (futuro).

### Relatórios de Engajamento
- Taxa de adoção do QR, opt-in WhatsApp, opt-in Social.
- Tempo médio de permanência (proxy via sessão).
- Volume e qualidade de interações sociais.
- Retorno de clientes (recorrência por device, anônima).
- Eficácia de campanhas/enquetes da casa.

---

## 7.4 Gestão (CRUD)

| Área | Funções |
|---|---|
| **Cardápio** | Categorias, produtos, preços, foto, disponibilidade, sincronização com PDV |
| **Mesas** | Criar/editar mesas, posicionar no mapa (drag-and-drop), gerar/imprimir QR |
| **Equipe** | Convidar staff, papéis (RBAC), atribuição de mesas por turno |
| **Estabelecimento** | Geofence (desenhar área), horário, on/off do Social Bar, regras |
| **Moderação local** | Ver denúncias da casa, banir device no local, ajustar rigor |
| **Promoções** | Happy hour, enquetes/temas da noite no mapa social |

### Editor de mapa de mesas
- Tela drag-and-drop que define `map_x/map_y/zone` de cada mesa.
- Desenho do **geofence** sobre mapa/planta (polígono) para presença real.

---

## 7.5 Alertas e Notificações ao Gestor

- Conta aberta há muito tempo sem movimento (possível "saiu sem pagar").
- Pico de contestações em um garçom/produto.
- Denúncia de alta severidade no Social Bar.
- Mesa ociosa ocupada / mesa livre com muita espera na porta.
- Meta de faturamento atingida.

---

## 7.6 Multiestabelecimento (redes/franquias)

Para grupos com várias casas:
- Visão consolidada (faturamento e engajamento por unidade).
- Comparativo entre unidades; benchmarking.
- Cardápio e regras "mãe" com override por unidade.
- Papéis de rede (`group_owner`) acima do `owner` por unidade.

---

## 7.7 Requisitos Não-Funcionais

- Atualização do dashboard em tempo real (p95 < 2 s).
- Relatórios pesados via **réplica de leitura** (não impacta operação).
- Cache de agregados (Redis, TTL curto) para o "ao vivo".
- Responsivo: usável em tablet no caixa.

---

← [Anterior: Módulo Social](./06-modulo-social.md) | [Próximo: Wireframes →](./08-wireframes.md)
