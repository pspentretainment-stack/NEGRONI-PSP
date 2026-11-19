
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode, CSSProperties } from "react";
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Euro,
  RefreshCw,
  Users,
  Wallet,
} from "lucide-react";
import { supabase } from "../supabase";

type Role =
  | "super_admin"
  | "admin"
  | "manager"
  | "artist"
  | "collaborator";

interface PSPBusinessProps {
  userId: string;
  role: Role;
}

interface ArtistRow {
  id: string;
  artist_name: string;
  is_active: boolean;
  created_at: string;
}

interface EventRow {
  id: string;
  title: string;
  location: string | null;
  starts_at: string;
  status: string;
}

interface TaskRow {
  id: string;
  title: string;
  is_completed: boolean;
  due_at: string | null;
}

interface FinanceRow {
  id: string;
  entry_type: string;
  description: string;
  amount: number | string;
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
}

const styles: Record<string, CSSProperties> = {
  page: {
    display: "flex",
    flexDirection: "column",
    gap: 22,
    color: "#f5f3f8",
  },
  intro: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    flexWrap: "wrap",
  },
  eyebrow: {
    color: "#b995ed",
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: 1.7,
    textTransform: "uppercase",
  },
  heading: {
    margin: "9px 0 6px",
    fontSize: 23,
    fontWeight: 700,
    letterSpacing: -0.7,
  },
  description: {
    margin: 0,
    color: "#9993a1",
    fontSize: 12,
    lineHeight: 1.7,
  },
  refresh: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 38,
    padding: "0 13px",
    border: "1px solid #3a3046",
    borderRadius: 8,
    background: "#191520",
    color: "#d7c5ef",
    fontSize: 11,
    cursor: "pointer",
  },
  metrics: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))",
    gap: 12,
  },
  metric: {
    minHeight: 124,
    padding: 16,
    border: "1px solid #292530",
    borderRadius: 12,
    background: "#121117",
  },
  metricTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    color: "#aaa4b1",
    fontSize: 10,
  },
  metricIcon: {
    width: 34,
    height: 34,
    display: "grid",
    placeItems: "center",
    borderRadius: 9,
    background: "#9b6bdb20",
    color: "#bd96f4",
  },
  metricValue: {
    marginTop: 13,
    fontSize: 27,
    fontWeight: 750,
    letterSpacing: -1,
  },
  metricNote: {
    marginTop: 4,
    color: "#77717f",
    fontSize: 9,
  },
  columns: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
    gap: 14,
  },
  panel: {
    minWidth: 0,
    padding: 17,
    border: "1px solid #292530",
    borderRadius: 12,
    background: "#121117",
  },
  panelTitle: {
    margin: 0,
    fontSize: 13,
    fontWeight: 700,
  },
  panelSub: {
    margin: "5px 0 14px",
    color: "#85808c",
    fontSize: 10,
  },
  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "11px 0",
    borderTop: "1px solid #292530",
  },
  rowMain: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  rowTitle: {
    overflow: "hidden",
    color: "#e9e5ee",
    fontSize: 11,
    fontWeight: 600,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  rowMeta: {
    color: "#85808c",
    fontSize: 9,
  },
  tag: {
    flexShrink: 0,
    padding: "5px 7px",
    border: "1px solid #463653",
    borderRadius: 5,
    color: "#c4a4e9",
    fontSize: 8,
    textTransform: "uppercase",
  },
  empty: {
    padding: "22px 8px",
    color: "#85808c",
    fontSize: 10,
    textAlign: "center",
  },
  notice: {
    padding: "11px 13px",
    border: "1px solid #654d2b",
    borderRadius: 8,
    background: "#211a11",
    color: "#e5c58f",
    fontSize: 10,
    lineHeight: 1.6,
  },
  error: {
    padding: "12px 14px",
    border: "1px solid #71323b",
    borderRadius: 8,
    background: "#291519",
    color: "#ffaaaa",
    fontSize: 11,
  },
};

function formatDate(value: string | null) {
  if (!value) return "Sem data definida";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Data indisponível";
  }

  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: value.includes("T") ? "2-digit" : undefined,
    minute: value.includes("T") ? "2-digit" : undefined,
  }).format(date);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export default function PSPBusiness({
  userId,
  role,
}: PSPBusinessProps) {
  const [artists, setArtists] = useState<ArtistRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [finances, setFinances] = useState<FinanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState("");

  const loadData = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);

    setError("");

    try {
      const [
        artistsResult,
        eventsResult,
        tasksResult,
        financesResult,
      ] = await Promise.all([
        supabase
          .from("negroni_artist_profiles")
          .select("id, artist_name, is_active, created_at")
          .order("created_at", { ascending: false }),

        supabase
          .from("negroni_calendar_events")
          .select("id, title, location, starts_at, status")
          .order("starts_at", { ascending: true }),

        supabase
          .from("negroni_calendar_tasks")
          .select("id, title, is_completed, due_at")
          .order("created_at", { ascending: false }),

        supabase
          .from("negroni_calendar_finances")
          .select(
            "id, entry_type, description, amount, due_date, paid_at, created_at"
          )
          .order("created_at", { ascending: false }),
      ]);

      const firstError =
        artistsResult.error ||
        eventsResult.error ||
        tasksResult.error ||
        financesResult.error;

      if (firstError) throw firstError;

      setArtists((artistsResult.data || []) as ArtistRow[]);
      setEvents((eventsResult.data || []) as EventRow[]);
      setTasks((tasksResult.data || []) as TaskRow[]);
      setFinances((financesResult.data || []) as FinanceRow[]);
      setLastUpdated(new Date());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível carregar os dados do PSP Business."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadData();

    const interval = window.setInterval(() => {
      void loadData(true);
    }, 60_000);

    const channel = supabase
      .channel(`psp-business-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "negroni_artist_profiles",
        },
        () => void loadData(true)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "negroni_calendar_events",
        },
        () => void loadData(true)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "negroni_calendar_tasks",
        },
        () => void loadData(true)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "negroni_calendar_finances",
        },
        () => void loadData(true)
      )
      .subscribe();

    return () => {
      window.clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [loadData, userId]);

  const summary = useMemo(() => {
    const now = Date.now();

    const activeArtists = artists.filter(
      (artist) => artist.is_active
    ).length;

    const upcomingEvents = events.filter(
      (event) => new Date(event.starts_at).getTime() >= now
    ).length;

    const pendingTasks = tasks.filter(
      (task) => !task.is_completed
    ).length;

    const completedTasks = tasks.filter(
      (task) => task.is_completed
    ).length;

    const overdueTasks = tasks.filter(
      (task) =>
        !task.is_completed &&
        task.due_at &&
        new Date(task.due_at).getTime() < now
    ).length;

    const recordedAmount = finances.reduce(
      (total, item) => total + Number(item.amount || 0),
      0
    );

    return {
      activeArtists,
      upcomingEvents,
      pendingTasks,
      completedTasks,
      overdueTasks,
      recordedAmount,
    };
  }, [artists, events, tasks, finances]);

  const recentEvents = events.slice(0, 5);
  const recentFinances = finances.slice(0, 5);

  if (loading) {
    return (
      <div style={{ color: "#f5f3f8", padding: 30 }}>
        A carregar dados reais do PSP Business...
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22, color: "#f5f3f8" }}>
      <section style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={styles.eyebrow}>NEGRONI · PSP ENTERTAINMENT</div>
          <h2 style={styles.heading}>PSP Business</h2>
          <p style={styles.description}>
            Visão operacional da empresa, alimentada pelos registos existentes no Negroni.
          </p>
        </div>

        <button
          type="button"
          style={{ ...styles.refresh, opacity: refreshing ? 0.65 : 1 }}
          onClick={() => void loadData(true)}
          disabled={refreshing}
        >
          <RefreshCw size={14} />
          {refreshing ? "A atualizar..." : "Atualizar dados"}
        </button>
      </section>

      {error && (
        <div style={styles.error}>
          <CircleAlert size={15} style={{ verticalAlign: "middle", marginRight: 7 }} />
          Não foi possível obter todos os dados. Verifica as permissões RLS e a ligação ao Supabase.
          <div style={{ marginTop: 5 }}>{error}</div>
        </div>
      )}

      <section style={styles.metrics}>
        <Metric
          icon={<Users size={17} />}
          label="Artistas ativos"
          value={summary.activeArtists}
          note={`${artists.length} perfis registados`}
        />

        <Metric
          icon={<CalendarDays size={17} />}
          label="Próximos eventos"
          value={summary.upcomingEvents}
          note={`${events.length} eventos no calendário`}
        />

        <Metric
          icon={<CheckCircle2 size={17} />}
          label="Tarefas concluídas"
          value={summary.completedTasks}
          note={`${summary.pendingTasks} tarefas pendentes`}
        />

        <Metric
          icon={<Clock3 size={17} />}
          label="Tarefas atrasadas"
          value={summary.overdueTasks}
          note="Pendentes com prazo ultrapassado"
        />

        <Metric
          icon={<Wallet size={17} />}
          label="Movimentos financeiros"
          value={finances.length}
          note="Registos existentes na tabela financeira"
        />

        <Metric
          icon={<Euro size={17} />}
          label="Valor movimentado"
          value={formatCurrency(summary.recordedAmount)}
          note="Soma dos movimentos registados; não representa lucro"
        />
      </section>

      <div style={styles.notice}>
        <Activity size={14} style={{ verticalAlign: "middle", marginRight: 7 }} />
        Os valores são calculados a partir dos registos atuais do Supabase. A soma financeira inclui todos os movimentos sem os classificar como receita ou despesa, porque os tipos ainda não foram confirmados.
      </div>

      <section style={styles.columns}>
        <div style={styles.panel}>
          <h3 style={styles.panelTitle}>Eventos recentes e próximos</h3>
          <p style={styles.panelSub}>
            Informação do calendário central do Negroni
          </p>

          {recentEvents.length === 0 ? (
            <div style={styles.empty}>
              Ainda não existem eventos registados.
            </div>
          ) : (
            recentEvents.map((event) => (
              <div key={event.id} style={styles.row}>
                <div style={styles.rowMain}>
                  <span style={styles.rowTitle}>{event.title}</span>
                  <span style={styles.rowMeta}>
                    {formatDate(event.starts_at)}
                    {event.location ? ` · ${event.location}` : ""}
                  </span>
                </div>
                <span style={styles.tag}>
                  {event.status || "Sem estado"}
                </span>
              </div>
            ))
          )}
        </div>

        <div style={styles.panel}>
          <h3 style={styles.panelTitle}>
            Movimentos financeiros recentes
          </h3>
          <p style={styles.panelSub}>
            Valores efetivamente registados, sem classificação presumida
          </p>

          {recentFinances.length === 0 ? (
            <div style={styles.empty}>
              Ainda não existem movimentos financeiros.
            </div>
          ) : (
            recentFinances.map((item) => (
              <div key={item.id} style={styles.row}>
                <div style={styles.rowMain}>
                  <span style={styles.rowTitle}>
                    {item.description}
                  </span>
                  <span style={styles.rowMeta}>
                    {item.entry_type} · {formatDate(item.created_at)}
                  </span>
                </div>
                <span style={styles.tag}>
                  {formatCurrency(Number(item.amount || 0))}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      <section style={styles.panel}>
        <h3 style={styles.panelTitle}>Estado operacional</h3>
        <p style={styles.panelSub}>
          Resumo dos dados registados nos departamentos ligados
        </p>

        <StatusRow
          title="Perfis de artistas"
          detail={`${artists.length} perfis · ${summary.activeArtists} ativos`}
          tag="Artist Management"
        />

        <StatusRow
          title="Tarefas"
          detail={`${summary.completedTasks} concluídas · ${summary.pendingTasks} pendentes`}
          tag="Operações"
        />

        <StatusRow
          title="Última atualização"
          detail={
            lastUpdated
              ? new Intl.DateTimeFormat("pt-PT", {
                  dateStyle: "short",
                  timeStyle: "medium",
                }).format(lastUpdated)
              : "Ainda não atualizado"
          }
          tag={refreshing ? "A atualizar" : "Sincronizado"}
        />

        <StatusRow
          title="Sessão e permissões"
          detail={`Utilizador: ${userId.slice(0, 8)}… · Função: ${role.replace("_", " ")}`}
          tag="Acesso ativo"
        />
      </section>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  note,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  note: string;
}) {
  return (
    <article style={styles.metric}>
      <div style={styles.metricTop}>
        <span>{label}</span>
        <span style={styles.metricIcon}>{icon}</span>
      </div>
      <div style={styles.metricValue}>{value}</div>
      <div style={styles.metricNote}>{note}</div>
    </article>
  );
}

function StatusRow({
  title,
  detail,
  tag,
}: {
  title: string;
  detail: string;
  tag: string;
}) {
  return (
    <div style={styles.row}>
      <div style={styles.rowMain}>
        <span style={styles.rowTitle}>{title}</span>
        <span style={styles.rowMeta}>{detail}</span>
      </div>
      <span style={styles.tag}>{tag}</span>
    </div>
  );
}
