# Apitou — Plano Técnico

> App para organizar peladas: eventos, times persistentes, fila "quem ganha fica", cronômetro ao vivo e súmula final.
> Este documento é a especificação completa. Siga a ordem da seção **Roadmap** e respeite as **Decisões Arquiteturais** — elas não são negociáveis, pois eliminam classes inteiras de bug.

---

## 1. Visão do produto

**Apitou** é operado por uma pessoa (o "mesário") na beira do campo, pelo celular, com uma mão, sob sol forte e com sinal de internet ruim.

Fluxo real de uso:

1. Antes da pelada: cria o evento, cadastra jogadores (com nota opcional), sorteia os times.
2. Na quadra: aperta play, marca gols/faltas/cartões conforme acontecem.
3. Fim da partida: o app sugere a próxima (quem ganha fica), o operador confirma ou ajusta.
4. Alguém se machuca: pausa, substitui, marca o jogador como indisponível, retoma.
5. Fim do evento: gera a **Súmula** — classificação dos times, artilharia, destaques.

**Princípio de design:** a tela da partida é o coração do app. Se ela não funcionar na beira do campo, o resto não importa.

---

## 2. Stack

| Camada | Escolha | Observações |
|---|---|---|
| Framework | **Next.js 15** (App Router, RSC) | Deploy na Vercel Hobby |
| Banco + Auth | **Supabase** | Postgres + Auth (email/senha + Google OAuth) + RLS |
| UI | **shadcn/ui + Tailwind CSS** | |
| Estado servidor | **TanStack Query** | Com persistência em IndexedDB |
| Estado local | **Zustand** | Estado da partida ao vivo |
| Offline | **IndexedDB** (via `idb-keyval` ou Dexie) | Fila de eventos pendentes |
| Validação | **Zod** | Schemas compartilhados client/server |
| Datas | **date-fns** | |

### Cuidados com o free tier

- **Supabase pausa o projeto após 7 dias sem requisição.** Configure um cron (GitHub Actions, 1x/dia) fazendo um `select 1` via REST. Alternativa sem pausa: Neon.
- **Vercel Hobby proíbe uso comercial.** Se houver monetização futura, migrar para Pro.
- Limites relevantes: 500 MB de Postgres, 50k MAU no Auth. Folgado para o escopo.

---

## 3. Decisões Arquiteturais (não alterar)

Estas quatro decisões se sustentam mutuamente. Quebrar uma quebra as outras.

### 3.1 Tudo é derivado de eventos

`match_events` é **append-only**. Placar, artilharia, classificação e estado da fila são **views/funções puras** sobre esse log. Nunca armazene placar em coluna.

**Por quê:** elimina dessincronização, torna o sync offline idempotente, dá replay e auditoria de graça.

### 3.2 O cronômetro é derivado, nunca incrementado

Nunca armazene "segundos decorridos" sendo somados por `setInterval`. Armazene três campos e calcule:

```ts
const elapsed = accumulated_ms + (status === 'running' ? serverNow() - started_at : 0)
```

| Ação | Efeito |
|---|---|
| Play | `started_at = now()`, `status = 'running'` |
| Pause | `accumulated_ms += now() - started_at`, `started_at = null`, `status = 'paused'` |

O `setInterval` **só re-renderiza a tela**. Nunca é fonte da verdade.

**Por quê:** se a aba fechar, o celular bloquear ou o app crashar, ao reabrir o tempo está correto.

> **Offset de relógio:** ao iniciar a partida, busque o horário do servidor uma vez e guarde `clockOffset = serverTime - Date.now()`. Use `serverNow()` em todos os cálculos. Não confie no relógio do celular.

### 3.3 A fila de times é derivada do histórico

Não armazene `posição atual na fila` mutável. Calcule com `reduce` sobre as partidas finalizadas (ver §7).

**Por quê:** funciona offline, permite desfazer, impossível corromper.

### 3.4 Correção nunca deleta

Erro de marcação vira um evento `void` apontando para o evento errado, seguido do evento correto. Todas as views filtram anulados.

**Por quê:** mantém append-only, preserva auditoria, sync continua idempotente.

---

## 4. Schema do banco

Rode como uma migration única no Supabase.

### 4.1 Tabelas

```sql
-- ─────────────────────────────────────────────
-- EVENTOS
-- ─────────────────────────────────────────────
create table events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  location text,
  scheduled_at timestamptz,
  team_size int not null default 5,          -- jogadores de LINHA por time
  has_goalkeeper boolean not null default true,
  status text not null default 'draft'
    check (status in ('draft','running','finished')),
  paused_at timestamptz,                     -- evento inteiro pausado
  pause_reason text,
  rules jsonb not null default '{
    "drawRule": "defender_leaves",
    "maxReign": null,
    "matchDurationMs": null,
    "goalLimit": null
  }'::jsonb,
  created_at timestamptz not null default now()
);

create index on events (owner_id, created_at desc);

-- ─────────────────────────────────────────────
-- JOGADORES DO EVENTO
-- ─────────────────────────────────────────────
create table event_players (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  user_id uuid references auth.users(id),    -- null = jogador avulso
  name text not null,
  rating numeric(3,1) check (rating between 0 and 10),   -- opcional
  is_goalkeeper boolean not null default false,
  is_substitute boolean not null default false,
  status text not null default 'active'
    check (status in ('active','injured','left')),
  status_note text,
  created_at timestamptz not null default now()
);

create index on event_players (event_id);

-- ─────────────────────────────────────────────
-- TIMES (persistem durante todo o evento)
-- ─────────────────────────────────────────────
create table event_teams (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null,                        -- "Time 1", "Coletes"
  color text,                                -- hex, para o badge na UI
  queue_position int not null,               -- ordem INICIAL da fila
  created_at timestamptz not null default now(),
  unique (event_id, name),
  unique (event_id, queue_position)
);

create index on event_teams (event_id, queue_position);

-- ─────────────────────────────────────────────
-- PARTIDAS
-- ─────────────────────────────────────────────
create table matches (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  sequence int not null,
  home_team_id uuid not null references event_teams(id),
  away_team_id uuid not null references event_teams(id),
  status text not null default 'scheduled'
    check (status in ('scheduled','running','paused','finished','cancelled')),
  started_at timestamptz,                    -- momento do último "play"
  accumulated_ms bigint not null default 0,
  regulation_ms bigint,                      -- tempo regulamentar (opcional)
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  unique (event_id, sequence),
  constraint different_teams check (home_team_id <> away_team_id)
);

-- Trava de concorrência: só UMA partida ativa por evento
create unique index one_active_match_per_event
  on matches (event_id)
  where status in ('running','paused');

create index on matches (event_id, sequence);

-- ─────────────────────────────────────────────
-- ESCALAÇÃO POR PARTIDA
-- ─────────────────────────────────────────────
create table match_lineups (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  event_team_id uuid not null references event_teams(id),
  event_player_id uuid not null references event_players(id),
  role text not null default 'line' check (role in ('line','gk')),
  unique (match_id, event_player_id)         -- impede estar nos 2 times
);

create index on match_lineups (match_id, event_team_id);

-- ─────────────────────────────────────────────
-- EVENTOS DA PARTIDA (append-only)
-- ─────────────────────────────────────────────
create table match_events (
  id uuid primary key,                       -- UUID GERADO NO CLIENTE (idempotência)
  match_id uuid not null references matches(id) on delete cascade,
  event_team_id uuid references event_teams(id),
  event_player_id uuid references event_players(id),
  related_player_id uuid references event_players(id),  -- assistência / sub
  type text not null check (type in (
    'goal','own_goal','penalty_goal','assist',
    'foul','yellow_card','red_card','blue_card','suspension',
    'sub_in','sub_out',
    'pause','resume','injury','void'
  )),
  clock_ms bigint not null,                  -- posição no cronômetro, NÃO wall-clock
  suspension_ms bigint,                      -- só para type='suspension'
  reason text check (reason in (
    'injury','substitution','correction','external','manual','halftime'
  )),
  voided_event_id uuid references match_events(id),
  note text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index on match_events (match_id, clock_ms);
create index on match_events (match_id, type);
create index on match_events (voided_event_id) where voided_event_id is not null;
```

### 4.2 Convenções semânticas

| Regra | Detalhe |
|---|---|
| `event_team_id` em `match_events` | **Sempre o time do jogador envolvido.** Gol contra de jogador do mandante → `event_team_id` = mandante, mas o gol conta para o visitante. |
| `penalty_goal` | Disputa de pênaltis. **Não conta no placar nem na artilharia** — só desempata o resultado. |
| `clock_ms` | Posição no cronômetro da partida. Um `void` de correção usa o `clock_ms` do evento original. |
| `id` do `match_events` | Gerado com `crypto.randomUUID()` **no cliente**, antes de enviar. Garante idempotência no sync. |

### 4.3 Views

```sql
-- Eventos válidos (exclui os anulados)
create view valid_match_events as
select e.*
from match_events e
where not exists (
  select 1 from match_events v
  where v.voided_event_id = e.id
)
and e.type <> 'void';

-- Placar da partida
create view match_scores as
select
  m.id as match_id,
  m.event_id,
  m.sequence,
  m.home_team_id,
  m.away_team_id,
  coalesce(count(*) filter (
    where e.type = 'goal' and e.event_team_id = m.home_team_id
  ), 0)
  + coalesce(count(*) filter (
    where e.type = 'own_goal' and e.event_team_id = m.away_team_id
  ), 0) as home_goals,
  coalesce(count(*) filter (
    where e.type = 'goal' and e.event_team_id = m.away_team_id
  ), 0)
  + coalesce(count(*) filter (
    where e.type = 'own_goal' and e.event_team_id = m.home_team_id
  ), 0) as away_goals,
  count(*) filter (
    where e.type = 'penalty_goal' and e.event_team_id = m.home_team_id
  ) as home_penalties,
  count(*) filter (
    where e.type = 'penalty_goal' and e.event_team_id = m.away_team_id
  ) as away_penalties,
  m.status
from matches m
left join valid_match_events e on e.match_id = m.id
group by m.id;

-- Resultado da partida
create view match_results as
select
  s.*,
  case
    when s.home_goals > s.away_goals then 'home'
    when s.away_goals > s.home_goals then 'away'
    when s.home_penalties > s.away_penalties then 'home'
    when s.away_penalties > s.home_penalties then 'away'
    else 'draw'
  end as result
from match_scores s;

-- Classificação do evento
create view event_standings as
with team_matches as (
  select
    r.event_id,
    m.home_team_id as team_id,
    r.home_goals as gf,
    r.away_goals as ga,
    case r.result when 'home' then 'W' when 'away' then 'L' else 'D' end as outcome
  from match_results r
  join matches m on m.id = r.match_id
  where m.status = 'finished'
  union all
  select
    r.event_id,
    m.away_team_id,
    r.away_goals,
    r.home_goals,
    case r.result when 'away' then 'W' when 'home' then 'L' else 'D' end
  from match_results r
  join matches m on m.id = r.match_id
  where m.status = 'finished'
)
select
  t.event_id,
  t.id as team_id,
  t.name as team_name,
  t.color,
  count(tm.*) as played,
  count(*) filter (where tm.outcome = 'W') as wins,
  count(*) filter (where tm.outcome = 'D') as draws,
  count(*) filter (where tm.outcome = 'L') as losses,
  coalesce(sum(tm.gf), 0) as goals_for,
  coalesce(sum(tm.ga), 0) as goals_against,
  coalesce(sum(tm.gf) - sum(tm.ga), 0) as goal_diff,
  count(*) filter (where tm.outcome = 'W') * 3
    + count(*) filter (where tm.outcome = 'D') as points
from event_teams t
left join team_matches tm on tm.team_id = t.id
group by t.id
order by points desc, goal_diff desc, goals_for desc;

-- Artilharia do evento
create view event_scorers as
select
  m.event_id,
  p.id as player_id,
  p.name as player_name,
  count(*) filter (where e.type = 'goal') as goals,
  count(*) filter (where e.type = 'assist') as assists,
  count(*) filter (where e.type = 'own_goal') as own_goals,
  count(*) filter (where e.type = 'yellow_card') as yellow_cards,
  count(*) filter (where e.type = 'red_card') as red_cards,
  count(*) filter (where e.type = 'foul') as fouls
from valid_match_events e
join matches m on m.id = e.match_id
join event_players p on p.id = e.event_player_id
group by m.event_id, p.id
order by goals desc, assists desc;
```

### 4.4 RLS

Ative em todas as tabelas. A política raiz é `events.owner_id = auth.uid()`; as filhas fazem join até `events`.

```sql
alter table events          enable row level security;
alter table event_players   enable row level security;
alter table event_teams     enable row level security;
alter table matches         enable row level security;
alter table match_lineups   enable row level security;
alter table match_events    enable row level security;

-- Helper
create or replace function owns_event(e uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from events
    where id = e and owner_id = auth.uid()
  );
$$;

create policy "own events" on events
  for all using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "own event players" on event_players
  for all using (owns_event(event_id)) with check (owns_event(event_id));

create policy "own event teams" on event_teams
  for all using (owns_event(event_id)) with check (owns_event(event_id));

create policy "own matches" on matches
  for all using (owns_event(event_id)) with check (owns_event(event_id));

create policy "own lineups" on match_lineups
  for all using (
    owns_event((select event_id from matches where id = match_id))
  ) with check (
    owns_event((select event_id from matches where id = match_id))
  );

create policy "own match events" on match_events
  for all using (
    owns_event((select event_id from matches where id = match_id))
  ) with check (
    owns_event((select event_id from matches where id = match_id))
  );
```

> **Nota:** views herdam RLS das tabelas base no Postgres 15+ com `security_invoker = on`. Crie as views com `create view ... with (security_invoker = on)`.

---

## 5. Autenticação

Supabase Auth com dois providers:

- **Email + senha** — com confirmação por email
- **Google OAuth** — configurar no console do Google Cloud + painel do Supabase

Rotas protegidas via checagem de sessão nos layouts (Server Components,
`@supabase/ssr`) de `(app)` e `(auth)` — não middleware, já que o Next.js 16
exige runtime Node.js pra Proxy e o Cloudflare Workers ainda não suporta
isso. Landing page e `/login` públicas; todo o resto exige sessão.

---

## 6. Cronômetro

### 6.1 Hook

```ts
// hooks/useMatchClock.ts
export function useMatchClock(match: Match, clockOffset: number) {
  const [, tick] = useReducer(x => x + 1, 0)

  useEffect(() => {
    if (match.status !== 'running') return
    const id = setInterval(tick, 200)   // só re-render
    return () => clearInterval(id)
  }, [match.status])

  const serverNow = () => Date.now() + clockOffset

  const elapsed = match.accumulated_ms +
    (match.status === 'running' && match.started_at
      ? serverNow() - new Date(match.started_at).getTime()
      : 0)

  return { elapsed, serverNow }
}
```

### 6.2 Pause e resume

Sempre gravar o evento **antes** de mexer no estado da partida:

```ts
async function pauseMatch(match, reason: PauseReason, note?: string) {
  const elapsed = computeElapsed(match)
  await appendEvent({
    id: crypto.randomUUID(),
    match_id: match.id,
    type: 'pause',
    clock_ms: elapsed,
    reason,
    note,
  })
  await updateMatch(match.id, {
    status: 'paused',
    accumulated_ms: elapsed,
    started_at: null,
  })
}

async function resumeMatch(match) {
  await appendEvent({
    id: crypto.randomUUID(),
    match_id: match.id,
    type: 'resume',
    clock_ms: match.accumulated_ms,
  })
  await updateMatch(match.id, {
    status: 'running',
    started_at: new Date().toISOString(),
  })
}
```

### 6.3 Suspensão temporária

Um `match_events` com `type='suspension'`, `clock_ms` e `suspension_ms`. O jogador retorna quando:

```ts
const isSuspended = (s: SuspensionEvent, elapsed: number) =>
  elapsed < s.clock_ms + s.suspension_ms

const remainingMs = (s, elapsed) =>
  Math.max(0, s.clock_ms + s.suspension_ms - elapsed)
```

**Nenhum timer paralelo.** Como tudo deriva do mesmo `elapsed`, pausar a partida congela as suspensões automaticamente.

### 6.4 Tempo parado

```ts
// Soma dos intervalos entre cada 'pause' e o 'resume' seguinte
function totalStoppageMs(events: MatchEvent[]): number {
  const sorted = events
    .filter(e => e.type === 'pause' || e.type === 'resume')
    .sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at))

  let total = 0, pausedAt: number | null = null
  for (const e of sorted) {
    if (e.type === 'pause') pausedAt = +new Date(e.created_at)
    if (e.type === 'resume' && pausedAt) {
      total += +new Date(e.created_at) - pausedAt
      pausedAt = null
    }
  }
  if (pausedAt) total += Date.now() - pausedAt
  return total
}
```

Exibir na UI durante a pausa: `04:32 · parado 1:15`.

---

## 7. Motor da fila ("quem ganha fica")

### 7.1 Tipos

```ts
type DrawRule = 'both_leave' | 'defender_leaves' | 'challenger_leaves' | 'penalties'

type Rules = {
  drawRule: DrawRule
  maxReign: number | null      // teto de partidas seguidas em quadra
  matchDurationMs: number | null
  goalLimit: number | null
}

type QueueState = {
  onCourt: [TeamId, TeamId] | null
  queue: TeamId[]
  reign: Record<TeamId, number>   // partidas seguidas já jogadas
}
```

### 7.2 Função pura

```ts
export function applyResult(
  s: QueueState,
  m: { home: TeamId; away: TeamId; result: 'home' | 'away' | 'draw' },
  r: Rules
): QueueState {
  const reign = { ...s.reign }
  let stays: TeamId[] = []
  let leaves: TeamId[] = []

  if (m.result === 'draw') {
    // defensor = quem está há mais tempo em quadra
    const [def, cha] = (reign[m.home] ?? 0) >= (reign[m.away] ?? 0)
      ? [m.home, m.away]
      : [m.away, m.home]

    switch (r.drawRule) {
      case 'both_leave':        leaves = [def, cha]; break
      case 'defender_leaves':   leaves = [def]; stays = [cha]; break
      case 'challenger_leaves': leaves = [cha]; stays = [def]; break
      case 'penalties':         leaves = [def, cha]; break // não deve chegar aqui
    }
  } else {
    const winner = m.result === 'home' ? m.home : m.away
    const loser  = m.result === 'home' ? m.away : m.home
    stays = [winner]
    leaves = [loser]
  }

  // reinado: quem fica incrementa; quem bate o teto vai pro fim da fila
  stays = stays.filter(t => {
    reign[t] = (reign[t] ?? 0) + 1
    if (r.maxReign && reign[t] >= r.maxReign) {
      leaves.push(t)
      return false
    }
    return true
  })
  leaves.forEach(t => { reign[t] = 0 })

  const queue = [...s.queue, ...leaves]
  const onCourt = [...stays]
  while (onCourt.length < 2 && queue.length) onCourt.push(queue.shift()!)

  return {
    onCourt: onCourt.length === 2 ? (onCourt as [TeamId, TeamId]) : null,
    queue,
    reign,
  }
}

export function computeQueueState(
  teams: EventTeam[],
  finished: FinishedMatch[],
  rules: Rules
): QueueState {
  const ordered = [...teams].sort((a, b) => a.queue_position - b.queue_position)
  const initial: QueueState = {
    onCourt: [ordered[0].id, ordered[1].id],
    queue: ordered.slice(2).map(t => t.id),
    reign: Object.fromEntries(teams.map(t => [t.id, 0])),
  }
  return [...finished]
    .sort((a, b) => a.sequence - b.sequence)
    .reduce((s, m) => applyResult(s, m, rules), initial)
}
```

### 7.3 Criação da próxima partida

- Somente a **partida 1** é criada previamente (na configuração do evento).
- As demais nascem ao encerrar a anterior: `sequence = max(sequence) + 1`, times vindos de `computeQueueState`.
- **O `unique (event_id, sequence)` é a trava de concorrência.** Se dois dispositivos criarem a mesma sequência, o segundo falha — trate renumerando.

### 7.4 Override sempre disponível

A sugestão é default, **não lei**. A tela de fim de partida sempre permite:

- Trocar qualquer um dos dois times sugeridos
- Reordenar a fila (drag-and-drop)
- Cancelar a partida sugerida

Se o app não deixar mudar, é abandonado na segunda pelada.

### 7.5 Escalação herdada

Ao criar a próxima partida, copie a escalação da última partida de cada time. Só mostre a tela de escalação se houver suplente disponível ou jogador com `status <> 'active'`.

---

## 8. Sorteio balanceado

```ts
export function drawTeams(
  players: EventPlayer[],
  teamCount: number,
  teamSize: number,
  hasGoalkeeper: boolean
): EventPlayer[][] {
  const active = players.filter(p => p.status === 'active' && !p.is_substitute)

  // 1. Jogadores sem nota recebem a mediana
  const rated = active.filter(p => p.rating != null).map(p => p.rating!)
  const median = rated.length
    ? rated.sort((a, b) => a - b)[Math.floor(rated.length / 2)]
    : 5
  const score = (p: EventPlayer) => (p.rating ?? median) + Math.random() * 0.01

  const teams: EventPlayer[][] = Array.from({ length: teamCount }, () => [])

  // 2. Goleiros: 1 por time
  if (hasGoalkeeper) {
    const gks = active.filter(p => p.is_goalkeeper)
      .sort((a, b) => score(b) - score(a))
    gks.slice(0, teamCount).forEach((gk, i) => teams[i].push(gk))
  }

  // 3. Snake draft por nota decrescente
  const pool = active
    .filter(p => !teams.flat().includes(p))
    .sort((a, b) => score(b) - score(a))

  let idx = 0, dir = 1
  for (const p of pool) {
    if (teams[idx].length < teamSize + (hasGoalkeeper ? 1 : 0)) teams[idx].push(p)
    idx += dir
    if (idx === teamCount) { idx = teamCount - 1; dir = -1 }
    if (idx === -1) { idx = 0; dir = 1 }
  }

  // 4. Otimização local: swaps que reduzem a diferença de força
  return optimize(teams, score)
}

function optimize(teams: EventPlayer[][], score: (p: EventPlayer) => number) {
  const sum = (t: EventPlayer[]) => t.reduce((a, p) => a + score(p), 0)
  const spread = (ts: EventPlayer[][]) => {
    const sums = ts.map(sum)
    return Math.max(...sums) - Math.min(...sums)
  }

  let improved = true
  while (improved) {
    improved = false
    let best = spread(teams)
    for (let a = 0; a < teams.length; a++) {
      for (let b = a + 1; b < teams.length; b++) {
        for (let i = 0; i < teams[a].length; i++) {
          for (let j = 0; j < teams[b].length; j++) {
            // não trocar goleiro por jogador de linha
            if (teams[a][i].is_goalkeeper !== teams[b][j].is_goalkeeper) continue
            ;[teams[a][i], teams[b][j]] = [teams[b][j], teams[a][i]]
            const s = spread(teams)
            if (s < best - 1e-9) { best = s; improved = true }
            else [teams[a][i], teams[b][j]] = [teams[b][j], teams[a][i]]
          }
        }
      }
    }
  }
  return teams
}
```

> O `Math.random() * 0.01` no `score` evita que o sorteio saia idêntico toda vez — senão o pessoal reclama. O passo 4 é O(n²) por iteração, instantâneo para 10–20 jogadores.

---

## 9. Pausa, lesão e correção

### 9.1 Modos da tela de partida

A tela alterna entre dois modos:

| Modo | Conteúdo |
|---|---|
| **Jogando** | Cronômetro gigante, placar, botões de ação rápida (gol, falta, cartão). Tela limpa. |
| **Pausado** | Painel de ajustes: escalação, correção de placar, fila, status dos jogadores. |

Isso resolve a tensão entre "tela limpa em campo" e "tudo editável na pausa" sem esconder nada em submenu.

### 9.2 Botão de pausa

Grande, sempre visível, na altura do polegar. Quando alguém se machuca, ninguém procura menu.

### 9.3 Fluxo de lesão

```
⏸ Partida pausada — 04:32
Motivo: Lesão

Jogador: [ Zé ▾ ]
O que fazer?
  ( ) Substituir por suplente  → [ Marcos ▾ ]
  ( ) Time joga desfalcado
  ( ) Vai voltar, só atendimento

☐ Marcar Zé como indisponível no evento
```

O checkbox seta `event_players.status = 'injured'`. A partir daí, o jogador é excluído do sorteio e das escalações futuras — **mas suas estatísticas permanecem intactas na súmula.**

Eventos gerados: `injury` + (se houver troca) `sub_out` e `sub_in`.

### 9.4 Times desfalcados

**Não valide `lineup.length === team_size` de forma rígida.** Na pelada real, times jogam com um a menos o tempo todo. Mostre apenas um aviso discreto: `Time 2 · 4 jogadores (–1)`.

### 9.5 Correção de eventos

Nunca deletar. Padrão:

```ts
// Gol atribuído ao jogador errado
await appendEvent({
  id: crypto.randomUUID(),
  match_id, type: 'void',
  voided_event_id: wrongGoalId,
  reason: 'correction',
  clock_ms: originalClockMs,
})
await appendEvent({
  id: crypto.randomUUID(),
  match_id, type: 'goal',
  event_player_id: correctPlayerId,
  event_team_id: correctTeamId,
  clock_ms: originalClockMs,
})
```

### 9.6 Pausa do evento inteiro

Chuva, jantar, briga. Seta `events.paused_at` e `pause_reason`.

Regras:
- Pausar o evento **força pausa** na partida em andamento.
- Retomar o evento **não retoma** a partida — quem decide é o operador.
- Nesse estado, liberar: adicionar jogador atrasado, remover quem foi embora, refazer times, reordenar a fila.

---

## 10. Offline-first

A pelada acontece em quadra com sinal ruim. A tela da partida é **local-first**.

### 10.1 Estratégia

1. Estado da partida vive no Zustand, hidratado do IndexedDB.
2. Toda ação gera um `match_event` com `id` = `crypto.randomUUID()` **no cliente** e vai para uma fila local.
3. Um worker tenta enviar a fila; ao falhar, mantém e retenta com backoff.
4. Como `match_events` é append-only e o `id` vem do cliente, o replay é **idempotente**: use `upsert` com `on conflict (id) do nothing`.

### 10.2 Conflitos

| Situação | Resolução |
|---|---|
| Mesmo evento enviado 2x | `on conflict (id) do nothing` |
| Duas partidas com mesmo `sequence` | `unique` estoura → renumerar a local e reenviar |
| `matches.accumulated_ms` divergente | Recalcular a partir dos eventos `pause`/`resume`; o log vence |

### 10.3 Indicador na UI

Badge discreto no topo: `● Sincronizado` / `↻ 3 pendentes` / `⚠ Offline`.

---

## 11. Súmula (relatório final)

Gerada ao encerrar o evento. Conteúdo:

**Classificação** — de `event_standings`: J, V, E, D, GP, GC, SG, Pts.

**Artilharia** — de `event_scorers`: gols, assistências, cartões.

**Destaques:**
- 🥇 **Artilheiro do evento** — maior `goals`
- 👑 **Maior reinado** — `max(reign)` por time, vindo do motor da fila
- 🧤 **Goleiro menos vazado** — menor `goals_against` entre partidas em que atuou como `gk`
- ⚽ **Artilheiro da partida** — por partida individual

**Histórico** — lista de todas as partidas com placar, resultado e linha do tempo de eventos.

Exportação: PDF ou imagem compartilhável no WhatsApp (o grupo vai querer). Use `html-to-image` ou uma rota `/api/sumula/[id]/og` com `@vercel/og`.

---

## 12. Identidade e microcopy

**Nome:** Apitou

**Paleta:** preto + amarelo-apito (alto contraste, legível sob sol). Alternativa: verde-escuro + laranja. **Contraste alto é requisito funcional**, não estético.

**Logo:** apito reduzido a formas simples (duas curvas + bolinha, ou só as ondas sonoras). Nada realista — vira borrão em 32px.

### Microcopy

| Ação | Copy |
|---|---|
| Iniciar partida | **Apitar início** |
| Pausar | **Bola parada** |
| Retomar | **Bola rolando** |
| Encerrar partida | **Apitar fim** |
| Encerrar evento | **Apito final** |
| Relatório | **Súmula** |
| Fila de times | **Banco** |
| Sortear times | **Tirar time** |

### Landing page

- Headline: *"Apitou. O resto é com a gente."*
- Hero mostrando a **tela de partida em ação** (cronômetro grande, placar, botão de gol) — é o que vende.
- Seções: como funciona (3 passos), recursos, screenshots, CTA de cadastro.
- Responsiva, mobile-first, Lighthouse > 90.

---

## 13. Estrutura de pastas

```
src/
  app/
    (marketing)/
      page.tsx                    # landing
    (auth)/
      login/page.tsx
      cadastro/page.tsx
      callback/route.ts           # OAuth callback
    (app)/
      eventos/
        page.tsx                  # lista + histórico
        novo/page.tsx
        [id]/
          page.tsx                # dashboard do evento
          jogadores/page.tsx
          times/page.tsx          # sorteio
          partida/[matchId]/page.tsx   # TELA PRINCIPAL
          sumula/page.tsx
    api/
      time/route.ts               # horário do servidor (clock offset)
  components/
    match/
      MatchClock.tsx
      ScoreBoard.tsx
      ActionBar.tsx               # gol, falta, cartão
      PausePanel.tsx
      SuspensionList.tsx
      NextMatchDialog.tsx
    team/
      TeamCard.tsx
      QueueList.tsx
      DrawDialog.tsx
  lib/
    supabase/{client,server,middleware}.ts
    queue-engine.ts               # §7 — função pura, 100% testada
    draw-engine.ts                # §8 — função pura, 100% testada
    clock.ts                      # §6
    offline/{queue,sync}.ts
  types/database.ts               # gerado via supabase gen types
```

---

## 14. Roadmap

Construir **nesta ordem**. Não pular para os relatórios antes de validar o item 4 em campo.

### Fase 1 — Fundação
- [ ] Setup Next.js 15 + Tailwind + shadcn/ui
- [ ] Projeto Supabase + migration completa (§4)
- [ ] Auth: email/senha + Google + middleware de rotas
- [ ] Landing page (§12)

### Fase 2 — Configuração do evento
- [ ] CRUD de eventos (nome, local, data, `team_size`, `rules`)
- [ ] CRUD de jogadores (nome, nota, goleiro, suplente)
- [ ] Criação manual de times + `queue_position`
- [ ] Motor de sorteio (§8) **com testes unitários**

### Fase 3 — Tela da partida ⭐ CRÍTICO
- [ ] Cronômetro derivado (§6) + offset de servidor
- [ ] Modo Jogando: placar, ações rápidas
- [ ] Registro de gol / gol contra / assistência
- [ ] Faltas e cartões
- [ ] Suspensão temporária com contagem regressiva
- [ ] Modo Pausado (§9) + motivos
- [ ] Fluxo de lesão e substituição
- [ ] Correção via `void`

> **Ponto de validação:** jogue uma pelada real usando o app antes de seguir. A UI precisa funcionar com uma mão, sol na tela e alguém gritando "gol do Zé!".

### Fase 4 — Fila e continuidade
- [ ] Motor da fila (§7) **com testes unitários cobrindo as 4 `drawRule`**
- [ ] Diálogo de fim de partida com sugestão + override
- [ ] Criação automática da próxima partida
- [ ] Escalação herdada
- [ ] Pausa do evento inteiro

### Fase 5 — Súmula e histórico
- [ ] Views de classificação e artilharia
- [ ] Tela da Súmula com destaques
- [ ] Exportação PDF / imagem
- [ ] Histórico de eventos anteriores

### Fase 6 — Offline
- [ ] Persistência em IndexedDB
- [ ] Fila de sync com backoff
- [ ] Indicador de status
- [ ] PWA (manifest + service worker + instalável)

---

## 15. Testes obrigatórios

Estas três funções puras precisam de cobertura completa antes de ir para produção:

**`queue-engine.ts`**
- Vitória do mandante / visitante
- Empate nas 4 regras (`both_leave`, `defender_leaves`, `challenger_leaves`, `penalties`)
- `maxReign` atingido → time sai mesmo vencendo
- Fila com 2, 3, 4+ times
- Fila vazia (só 2 times no evento — ficam alternando)

**`draw-engine.ts`**
- Todos sem nota → distribuição uniforme
- Notas muito desiguais → spread mínimo
- Goleiros distribuídos 1 por time
- Jogadores `injured` excluídos
- Número de jogadores não divisível por `teamCount`

**`clock.ts`**
- `elapsed` correto em `running` / `paused` / `finished`
- Sequência play → pause → play → pause acumula corretamente
- `totalStoppageMs` com pausa aberta
- Suspensão congela durante pausa

---

## 16. Checklist de qualidade

- [ ] Todas as tabelas com RLS ativa e testada (tentar ler evento de outro usuário deve falhar)
- [ ] Views criadas com `security_invoker = on`
- [ ] Nenhum `setInterval` como fonte da verdade
- [ ] Nenhum placar armazenado em coluna
- [ ] Nenhum `delete` em `match_events`
- [ ] Todos os `match_events.id` gerados no cliente
- [ ] Botões da tela de partida com alvo mínimo de 48×48px
- [ ] Contraste AA em todos os textos da tela de partida
- [ ] `wake lock` ativo durante a partida (tela não apaga)