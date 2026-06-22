# 01 — Visão Geral do Produto

← [Voltar ao índice](../README.md)

---

## 1.1 Visão

> Ser a camada digital padrão da noite brasileira: o aplicativo que toda pessoa abre ao
> sentar em uma mesa de bar — para saber quanto está gastando e para descobrir quem está
> por perto.

## 1.2 Missão

Tornar a ida ao bar **mais transparente, mais social e mais segura**, criando valor
simultâneo para o cliente (controle + conexões) e para o estabelecimento (vendas +
fidelização + dados).

## 1.3 Proposta de Valor

**Para o cliente:**
- Nunca mais ser surpreendido pela conta.
- Conhecer pessoas no mesmo ambiente sem expor sua identidade.
- Dividir a conta sem briga.

**Para o estabelecimento:**
- Aumentar ticket médio e tempo de permanência.
- Reduzir atrito no fechamento.
- Entender o comportamento do salão em tempo real.

**Para o garçom:**
- Menos idas à mesa para "trazer a conta".
- Chamadas organizadas por prioridade.

---

## 1.4 Mercado-Alvo

### Segmentos primários
| Segmento | Perfil | Por que se encaixa |
|---|---|---|
| **Bares e pubs** | Alto giro, público jovem-adulto, ambiente de socialização | Núcleo do Social Bar |
| **Baladas / casas noturnas** | Grande volume de pessoas, paquera natural | Mapa social brilha aqui |
| **Restaurantes casuais / botecos** | Famílias e grupos, foco em consumo | Módulo de consumo + divisão de conta |
| **Cervejarias e wine bars** | Público que permanece por horas | Engajamento e recompra |

### Dimensionamento (Brasil — ordem de grandeza para planejamento)
- ~1,3 milhão de bares e restaurantes (fonte: Abrasel, ordem de grandeza).
- Foco inicial: **bares com socialização** em capitais (recorte de dezenas de milhares).
- **SAM inicial realista:** 5.000 estabelecimentos em 5 capitais nos primeiros 3 anos.

> ⚠️ Números de mercado são estimativas de ordem de grandeza para planejamento e devem ser
> validados com pesquisa primária antes de decisões de investimento.

---

## 1.5 Personas

### 👤 Bia, 26 — "A Solteira Sociável"
- Vai ao bar com amigas nas sextas. Curiosa, mas tímida para abordar.
- **Quer:** saber se aquele cara da mesa 12 está afim de paquera **antes** de se expor.
- **Teme:** dar o número para a pessoa errada; situações constrangedoras.
- **Usa:** Social Bar com status ❤️, chat interno, bloqueio fácil.

### 👤 Rafael, 31 — "O Anfitrião do Rolê"
- Sempre organiza a saída do grupo. Paga e depois cobra todo mundo.
- **Quer:** dividir a conta de forma justa e rápida.
- **Teme:** ser "passado para trás" na divisão; conta inflada.
- **Usa:** acompanhamento em tempo real, divisão de conta, contestação.

### 👤 Seu Márcio, 52 — "O Dono do Bar"
- Dono de um pub de bairro. Margem apertada, equipe enxuta.
- **Quer:** vender mais, perder menos com erro de comanda, fidelizar.
- **Teme:** tecnologia complicada que atrapalhe a operação.
- **Usa:** painel admin, relatórios, gestão de cardápio.

### 👤 Camila, 23 — "A Garçonete"
- Atende 15 mesas numa noite cheia. Corre o tempo todo.
- **Quer:** lançar pedidos rápido e atender chamadas sem se perder.
- **Teme:** ferramenta lenta no meio da correria.
- **Usa:** app do garçom, fila de chamadas, lançamento rápido.

### 👤 Léo, 29 — "O Networker"
- Frequenta happy hours. Gosta de conhecer gente da área.
- **Quer:** trocar ideia com pessoas com interesses em comum (🤝).
- **Usa:** filtro por interesses, status de amizade/networking.

---

## 1.6 Objetivos do Produto e KPIs

### Objetivos estratégicos
1. **Engajamento:** ser aberto em toda visita ao bar parceiro.
2. **Receita do bar:** aumentar ticket médio e permanência de forma mensurável.
3. **Confiança:** ser percebido como seguro e privado (essencial para o social).

### KPIs por dimensão

| Dimensão | Métrica | Meta (piloto) |
|---|---|---|
| **Adoção** | % de mesas que escaneiam o QR | ≥ 60% |
| **Consumo** | % que ativa notificações WhatsApp | ≥ 70% dos que escaneiam |
| **Social** | % que ativa o Social Bar | ≥ 30% dos que escaneiam |
| **Social** | Conversas iniciadas / noite | ≥ 1,5 por usuário social |
| **Negócio** | Aumento de ticket médio | +8% a +15% |
| **Negócio** | Aumento de tempo de permanência | +10 a +20 min |
| **Operação** | Redução de contestações no fechamento | −50% |
| **Segurança** | Tempo médio p/ ação em denúncia | < 60 s (automático) |
| **Retenção** | Estabelecimentos ativos (NRR) | ≥ 90% trimestral |
| **NPS** | NPS do cliente final | ≥ 50 |

### North Star Metric
> **Conexões + transparência por noite** = (lançamentos vistos em tempo real) +
> (interações sociais significativas) por sessão de mesa.
>
> Captura simultaneamente os dois lados do valor do produto.

---

## 1.7 Riscos e Mitigações

| Risco | Impacto | Mitigação |
|---|---|---|
| Uso indevido do Social Bar (assédio) | Alto (reputação) | Moderação por IA, denúncia 1-toque, bloqueio instantâneo, banimento por device |
| Baixa adesão ao WhatsApp opt-in | Médio | Valor imediato no 1º lançamento; fallback no app |
| Custo por mensagem WhatsApp | Médio | Agrupar lançamentos, usar push do app quando possível |
| LGPD / dados sensíveis | Alto (legal) | Minimização, efemeridade, consentimento granular (ver doc 09) |
| Resistência do garçom/operação | Médio | App do garçom simples; integração com PDV existente |
| "Marketplace frio" (poucas pessoas no social) | Alto | Foco em bares cheios; gamificação; massa crítica por mesa |

---

← [Voltar ao índice](../README.md) | [Próximo: Arquitetura →](./02-arquitetura.md)
