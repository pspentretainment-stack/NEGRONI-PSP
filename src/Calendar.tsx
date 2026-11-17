
import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  MapPin,
  Clock,
  X,
  Users,
  RefreshCw
} from "lucide-react";

type Role =
  | "super_admin"
  | "admin"
  | "manager"
  | "artist"
  | "collaborator";

interface CalendarProps {
  user: User;
  role: Role;
}

interface Artist {
  id: string;
  artist_name: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string;
  status: "confirmed" | "cancelled" | "archived";
  created_by: string;
  artists: string[];
}

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril",
  "Maio", "Junho", "Julho", "Agosto",
  "Setembro", "Outubro", "Novembro", "Dezembro"
];

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function localDateTime(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}


function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-PT", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Lisbon"
  }).format(new Date(value));
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

export default function Calendar({ user, role }: CalendarProps) {
  const isAdmin = role === "super_admin" || role === "admin";
  const canCreate = isAdmin || role === "artist";

  const [currentMonth, setCurrentMonth] = useState(
    startOfMonth(new Date())
  );

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [myArtistId, setMyArtistId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [selectedArtists, setSelectedArtists] = useState<string[]>([]);

  const today = new Date();
  const horizon = new Date(
    today.getFullYear() + 12,
    today.getMonth(),
    today.getDate()
  );

  const firstMonth = startOfMonth(today);
  const lastMonth = startOfMonth(horizon);

  const canGoBack = currentMonth > firstMonth;
  const canGoForward = currentMonth < lastMonth;

  const loadCalendar = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { data: profileData, error: profileError } = await supabase
        .from("negroni_artist_profiles")
        .select("id, artist_name")
        .eq("is_active", true)
        .order("artist_name");

      if (profileError) throw profileError;

      setArtists(profileData || []);

      const { data: links, error: linksError } = await supabase
        .from("negroni_artist_users")
        .select("artist_profile_id")
        .eq("user_id", user.id);

      if (linksError) throw linksError;

      const ownId = links?.[0]?.artist_profile_id || null;
      setMyArtistId(ownId);

      const monthStart = startOfMonth(currentMonth);
      const monthEnd = addMonths(monthStart, 1);

      const { data: eventData, error: eventError } = await supabase
        .from("negroni_calendar_events")
        .select("*")
        .lt("starts_at", monthEnd.toISOString())
        .gt("ends_at", monthStart.toISOString())
        .order("starts_at", { ascending: true });

      if (eventError) throw eventError;

      const ids = (eventData || []).map((event) => event.id);

      let associations: {
        event_id: string;
        artist_profile_id: string;
      }[] = [];

      if (ids.length > 0) {
        const { data, error: associationError } = await supabase
          .from("negroni_calendar_event_artists")
          .select("event_id, artist_profile_id")
          .in("event_id", ids);

        if (associationError) throw associationError;
        associations = data || [];
      }

      const result: CalendarEvent[] = (eventData || []).map((event) => ({
        ...event,
        artists: associations
          .filter((item) => item.event_id === event.id)
          .map((item) => item.artist_profile_id)
      }));

      setEvents(result);
    } catch (err) {
      console.error("Calendar loading error:", err);
      setError("Não foi possível carregar o calendário. Verifica as permissões e tenta novamente.");
    } finally {
      setLoading(false);
    }
  }, [currentMonth, user.id]);

  useEffect(() => {
    loadCalendar();
  }, [loadCalendar]);

  const calendarDays = useMemo(() => {
    const firstDay = startOfMonth(currentMonth);
    const offset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      0
    ).getDate();

    const total = Math.ceil((offset + daysInMonth) / 7) * 7;

    return Array.from({ length: total }, (_, index) => {
      const dayNumber = index - offset + 1;

      if (dayNumber < 1 || dayNumber > daysInMonth) return null;

      return new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        dayNumber
      );
    });
  }, [currentMonth]);

  function eventsForDay(date: Date) {
    return events.filter((event) => {
      const start = new Date(event.starts_at);
      const end = new Date(event.ends_at);

      return (
        date >= new Date(start.getFullYear(), start.getMonth(), start.getDate()) &&
        date <= new Date(end.getFullYear(), end.getMonth(), end.getDate())
      );
    });
  }

  function openNewEvent() {
    setError("");
    setSuccess("");
    setTitle("");
    setDescription("");
    setLocation("");
    setSelectedArtists(myArtistId ? [myArtistId] : []);

    const start = new Date();
    start.setMinutes(0, 0, 0);
    start.setHours(start.getHours() + 1);

    const end = new Date(start);
    end.setHours(end.getHours() + 1);

    setStartsAt(localDateTime(start));
    setEndsAt(localDateTime(end));
    setShowForm(true);
  }

  async function createEvent(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!title.trim()) {
      setError("Indica o título do evento.");
      return;
    }

    if (!startsAt || !endsAt) {
      setError("Indica a data e hora de início e fim.");
      return;
    }

    const start = new Date(startsAt);
    const end = new Date(endsAt);

    if (end <= start) {
      setError("A hora de fim tem de ser posterior à hora de início.");
      return;
    }

    if (start < new Date()) {
      setError("Não é possível criar eventos no passado.");
      return;
    }

    if (start > horizon) {
      setError("O evento ultrapassa o horizonte de 12 anos.");
      return;
    }

    if (!isAdmin && !myArtistId) {
      setError("A tua conta ainda não está associada a um perfil de artista. Contacta o administrador.");
      return;
    }

    const artistIds = isAdmin
      ? selectedArtists
      : myArtistId
        ? [myArtistId]
        : [];

    if (artistIds.length === 0) {
      setError("Seleciona pelo menos um artista.");
      return;
    }

    setSaving(true);

    try {
      const { data: newEvent, error: insertError } = await supabase
        .from("negroni_calendar_events")
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          location: location.trim() || null,
          starts_at: start.toISOString(),
          ends_at: end.toISOString(),
          timezone: "Europe/Lisbon",
          status: "confirmed",
          created_by: user.id
        })
        .select("id")
        .single();

      if (insertError) throw insertError;

      const { error: associationError } = await supabase
        .from("negroni_calendar_event_artists")
        .insert(
          artistIds.map((artistId) => ({
            event_id: newEvent.id,
            artist_profile_id: artistId
          }))
        );

      if (associationError) {
        throw new Error(
          "O evento foi criado, mas não foi possível associar os artistas. Contacta o administrador."
        );
      }

      setShowForm(false);
      setSuccess("Evento criado com sucesso.");
      await loadCalendar();
    } catch (err) {
      console.error("Event creation error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível criar o evento."
      );
    } finally {
      setSaving(false);
    }
  }

  async function cancelEvent(eventId: string) {
    if (!isAdmin) return;

    const confirmed = window.confirm(
      "Tens a certeza de que pretendes cancelar este evento?"
    );

    if (!confirmed) return;

    const { error: updateError } = await supabase
      .from("negroni_calendar_events")
      .update({ status: "cancelled" })
      .eq("id", eventId);

    if (updateError) {
      setError("Não foi possível cancelar o evento.");
      return;
    }

    setSuccess("Evento cancelado.");
    await loadCalendar();
  }

  function artistNames(ids: string[]) {
    return ids
      .map((id) => artists.find((artist) => artist.id === id)?.artist_name)
      .filter(Boolean)
      .join(", ");
  }

  const monthEvents = events.filter(
    (event) => event.status !== "archived"
  );

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <div style={styles.eyebrow}>NEGRONI PSP · OPERATIONS</div>
          <h2 style={styles.heading}>PSP Calendar<span style={{ color: "#a78bfa" }}>.</span></h2>
          <p style={styles.subtitle}>
            Gestão centralizada de eventos, atuações e compromissos.
          </p>
        </div>

        {canCreate && (
          <button style={styles.primaryButton} onClick={openNewEvent}>
            <Plus size={17} /> Novo evento
          </button>
        )}
      </div>

      {error && <div style={styles.error}>{error}</div>}
      {success && <div style={styles.success}>{success}</div>}

      <div style={styles.toolbar}>
        <div style={styles.monthNavigation}>
          <button
            style={styles.iconButton}
            disabled={!canGoBack}
            onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
          >
            <ChevronLeft size={19} />
          </button>

          <h3 style={styles.monthTitle}>
            {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h3>

          <button
            style={styles.iconButton}
            disabled={!canGoForward}
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight size={19} />
          </button>
        </div>

        <button style={styles.refreshButton} onClick={loadCalendar}>
          <RefreshCw size={15} /> Atualizar
        </button>
      </div>

      <div style={styles.calendarCard}>
        <div style={styles.weekHeader}>
          {WEEKDAYS.map((day) => (
            <div key={day} style={styles.weekday}>{day}</div>
          ))}
        </div>

        {loading ? (
          <div style={styles.loading}>A carregar calendário...</div>
        ) : (
          <div style={styles.calendarGrid}>
            {calendarDays.map((date, index) => {
              if (!date) {
                return <div key={`empty-${index}`} style={styles.dayCell} />;
              }

              const dayEvents = eventsForDay(date);
              const isToday =
                date.toDateString() === new Date().toDateString();

              return (
                <div key={date.toISOString()} style={styles.dayCell}>
                  <div style={{
                    ...styles.dayNumber,
                    ...(isToday ? styles.todayNumber : {})
                  }}>
                    {date.getDate()}
                  </div>

                  <div style={styles.dayEvents}>
                    {dayEvents.slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        title={`${event.title} · ${formatTime(event.starts_at)}`}
                        style={{
                          ...styles.eventChip,
                          ...(event.status === "cancelled"
                            ? styles.cancelledChip
                            : {})
                        }}
                      >
                        <span style={styles.eventTime}>
                          {formatTime(event.starts_at)}
                        </span>
                        <span style={styles.eventTitle}>{event.title}</span>
                      </div>
                    ))}

                    {dayEvents.length > 3 && (
                      <div style={styles.moreEvents}>
                        +{dayEvents.length - 3} mais
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={styles.sectionHeader}>
        <div>
          <h3 style={styles.sectionTitle}>Eventos do mês</h3>
          <p style={styles.sectionSubtitle}>
            {monthEvents.length} evento(s) neste período
          </p>
        </div>
      </div>

      <div style={styles.eventList}>
        {!loading && monthEvents.length === 0 && (
          <div style={styles.emptyState}>
            <CalendarDays size={30} color="#8b7ca8" />
            <strong>Sem eventos agendados</strong>
            <span>Os eventos deste mês aparecerão aqui.</span>
          </div>
        )}

        {monthEvents.map((event) => (
          <div key={event.id} style={styles.eventRow}>
            <div style={styles.eventDate}>
              <strong>{new Date(event.starts_at).toLocaleDateString("pt-PT", {
                day: "2-digit",
                timeZone: "Europe/Lisbon"
              })}</strong>
              <span>{new Date(event.starts_at).toLocaleDateString("pt-PT", {
                month: "short",
                timeZone: "Europe/Lisbon"
              })}</span>
            </div>

            <div style={styles.eventDetails}>
              <strong>{event.title}</strong>
              <div style={styles.eventMeta}>
                <span><Clock size={13} /> {formatTime(event.starts_at)} – {formatTime(event.ends_at)}</span>
                {event.location && (
                  <span><MapPin size={13} /> {event.location}</span>
                )}
                {event.artists.length > 0 && (
                  <span><Users size={13} /> {artistNames(event.artists)}</span>
                )}
              </div>
              {event.description && (
                <p style={styles.description}>{event.description}</p>
              )}
            </div>

            <div style={styles.eventActions}>
              <span style={{
                ...styles.status,
                ...(event.status === "cancelled"
                  ? styles.cancelledStatus
                  : {})
              }}>
                {event.status === "cancelled" ? "Cancelado" : "Confirmado"}
              </span>

              {isAdmin && event.status === "confirmed" && (
                <button
                  style={styles.cancelButton}
                  onClick={() => cancelEvent(event.id)}
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={styles.footerNote}>
        Fuso horário: Europe/Lisbon · Horizonte de planeamento: 12 anos
      </div>

      {showForm && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <div>
                <div style={styles.eyebrow}>PSP CALENDAR</div>
                <h3 style={styles.modalTitle}>Criar evento</h3>
              </div>
              <button
                style={styles.iconButton}
                onClick={() => setShowForm(false)}
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={createEvent}>
              <label style={styles.label}>Nome do evento *</label>
              <input
                style={styles.input}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex.: Atuação ao vivo"
                required
              />

              <label style={styles.label}>Descrição</label>
              <textarea
                style={styles.textarea}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalhes adicionais..."
                rows={3}
              />

              <label style={styles.label}>Localização</label>
              <input
                style={styles.input}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Local do evento"
              />

              <div style={styles.formGrid}>
                <div>
                  <label style={styles.label}>Início *</label>
                  <input
                    style={styles.input}
                    type="datetime-local"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label style={styles.label}>Fim *</label>
                  <input
                    style={styles.input}
                    type="datetime-local"
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                    required
                  />
                </div>
              </div>

              <label style={styles.label}>Artistas associados *</label>

              {isAdmin ? (
                <select
                  multiple
                  style={{ ...styles.input, minHeight: "100px" }}
                  value={selectedArtists}
                  onChange={(e) => setSelectedArtists(
                    Array.from(e.target.selectedOptions, (option) => option.value)
                  )}
                >
                  {artists.map((artist) => (
                    <option key={artist.id} value={artist.id}>
                      {artist.artist_name}
                    </option>
                  ))}
                </select>
              ) : (
                <div style={styles.artistNotice}>
                  {myArtistId
                    ? artists.find((artist) => artist.id === myArtistId)?.artist_name
                    : "Perfil de artista não associado"}
                </div>
              )}

              <p style={styles.helper}>
                {isAdmin
                  ? "Podes selecionar vários artistas. Mantém Ctrl (Windows) ou Command (Mac) para selecionar mais do que um."
                  : "O evento ficará imediatamente visível na tua agenda."}
              </p>

              {error && <div style={styles.error}>{error}</div>}

              <div style={styles.modalActions}>
                <button
                  type="button"
                  style={styles.secondaryButton}
                  onClick={() => setShowForm(false)}
                >
                  Fechar
                </button>

                <button
                  type="submit"
                  style={styles.primaryButton}
                  disabled={saving}
                >
                  {saving ? "A guardar..." : "Criar evento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { color: "#f5f3fa", width: "100%" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap", marginBottom: 28 },
  eyebrow: { color: "#a78bfa", fontSize: 10, letterSpacing: 2, fontWeight: 700, marginBottom: 8 },
  heading: { fontSize: 29, margin: 0, fontWeight: 700 },
  subtitle: { color: "#9991a8", fontSize: 13, marginTop: 8 },
  primaryButton: { background: "#8054d8", color: "#fff", border: 0, borderRadius: 9, padding: "12px 17px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, fontWeight: 600, cursor: "pointer" },
  toolbar: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 15, flexWrap: "wrap", gap: 12 },
  monthNavigation: { display: "flex", alignItems: "center", gap: 13 },
  monthTitle: { fontSize: 17, minWidth: 175, textAlign: "center", margin: 0 },
  iconButton: { background: "#191521", color: "#e9e2f5", border: "1px solid #30283b", borderRadius: 8, width: 36, height: 36, display: "grid", placeItems: "center", cursor: "pointer" },
  refreshButton: { background: "transparent", color: "#b9adc9", border: "1px solid #30283b", borderRadius: 8, padding: "9px 12px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer" },
  calendarCard: { background: "#100e16", border: "1px solid #292431", borderRadius: 13, overflow: "hidden" },
  weekHeader: { display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", background: "#17131f", borderBottom: "1px solid #292431" },
  weekday: { textAlign: "center", padding: "13px 3px", color: "#9b91a9", fontSize: 11, fontWeight: 700 },
  calendarGrid: { display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))" },
  dayCell: { minHeight: 105, padding: 8, borderRight: "1px solid #292431", borderBottom: "1px solid #292431", minWidth: 0 },
  dayNumber: { width: 25, height: 25, display: "grid", placeItems: "center", color: "#bdb4c9", fontSize: 12, borderRadius: "50%", marginBottom: 7 },
  todayNumber: { background: "#8054d8", color: "#fff", fontWeight: 700 },
  dayEvents: { display: "flex", flexDirection: "column", gap: 4 },
  eventChip: { background: "#302044", borderLeft: "2px solid #a78bfa", borderRadius: 4, padding: "4px 5px", color: "#e5d9fa", fontSize: 10, overflow: "hidden" },
  cancelledChip: { background: "#352126", borderLeftColor: "#c16b75", color: "#d6aab0", textDecoration: "line-through" },
  eventTime: { display: "block", fontSize: 9, opacity: 0.75, marginBottom: 2 },
  eventTitle: { display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  moreEvents: { color: "#a99bb9", fontSize: 10 },
  loading: { padding: 50, textAlign: "center", color: "#a99bb9" },
  sectionHeader: { margin: "27px 0 13px" },
  sectionTitle: { fontSize: 17, margin: 0 },
  sectionSubtitle: { color: "#8e849b", fontSize: 12, marginTop: 5 },
  eventList: { display: "flex", flexDirection: "column", gap: 9 },
  eventRow: { display: "flex", alignItems: "center", gap: 16, background: "#100e16", border: "1px solid #292431", borderRadius: 11, padding: 14, minWidth: 0 },
  eventDate: { minWidth: 48, height: 48, borderRadius: 9, background: "#241a32", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#c9b2f3" },
  eventDetails: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 },
  eventMeta: { display: "flex", flexWrap: "wrap", gap: "7px 14px", color: "#9d93aa", fontSize: 11 },
  description: { color: "#a79caf", fontSize: 12, margin: 0 },
  eventActions: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 },
  status: { color: "#8fd4ae", background: "#173026", padding: "5px 8px", borderRadius: 20, fontSize: 10 },
  cancelledStatus: { color: "#e1a2a9", background: "#382027" },
  cancelButton: { color: "#d99ba3", background: "transparent", border: "1px solid #58323a", borderRadius: 6, padding: "5px 8px", cursor: "pointer", fontSize: 10 },
  emptyState: { background: "#100e16", border: "1px dashed #393044", borderRadius: 12, padding: 35, display: "flex", flexDirection: "column", alignItems: "center", gap: 9, color: "#a79caf", fontSize: 12 },
  footerNote: { color: "#71687d", fontSize: 10, marginTop: 20, textAlign: "right" },
  modalOverlay: { position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,.78)", display: "flex", alignItems: "center", justifyContent: "center", padding: 15 },
  modal: { background: "#15121c", border: "1px solid #3a3048", borderRadius: 15, padding: 23, width: "100%", maxWidth: 550, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 80px #0009" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 },
  modalTitle: { fontSize: 21, margin: 0 },
  label: { display: "block", color: "#c7bdcf", fontSize: 12, fontWeight: 600, marginBottom: 7, marginTop: 14 },
  input: { width: "100%", boxSizing: "border-box", background: "#0d0b12", color: "#f5f3fa", border: "1px solid #393044", borderRadius: 8, padding: "11px 12px", fontSize: 13 },
  textarea: { width: "100%", boxSizing: "border-box", background: "#0d0b12", color: "#f5f3fa", border: "1px solid #393044", borderRadius: 8, padding: 12, fontSize: 13, resize: "vertical" },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  artistNotice: { background: "#211a2c", color: "#d9c7f5", border: "1px solid #49365e", borderRadius: 8, padding: 12, fontSize: 13 },
  helper: { color: "#8f849b", fontSize: 10, lineHeight: 1.5 },
  modalActions: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 },
  secondaryButton: { background: "transparent", color: "#c5bbd0", border: "1px solid #393044", borderRadius: 8, padding: "11px 15px", cursor: "pointer" },
  error: { background: "#351d25", border: "1px solid #67313e", color: "#f0b3bb", padding: 12, borderRadius: 8, fontSize: 12, marginBottom: 14 },
  success: { background: "#183126", border: "1px solid #315a43", color: "#a7dfbb", padding: 12, borderRadius: 8, fontSize: 12, marginBottom: 14 }
};
