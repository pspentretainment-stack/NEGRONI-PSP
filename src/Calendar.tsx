
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, CSSProperties } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import {
  CalendarDays, ChevronLeft, ChevronRight, Plus, MapPin, Clock,
  X, Users, RefreshCw, Search, Pencil, Trash2, Euro,
  CheckCircle2, Circle, Paperclip, Download, FileText,
  ClipboardList, StickyNote, UserRound, Upload, Printer,
} from "lucide-react";

type Role = "super_admin" | "admin" | "manager" | "artist" | "collaborator";

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
  timezone: string;
  status: "confirmed" | "cancelled" | "archived";
  created_by: string;
  artists: string[];
}

interface Finance {
  id: string;
  event_id: string;
  entry_type: "artist_fee" | "expense" | "income";
  description: string;
  amount: number;
  artist_profile_id: string | null;
  due_date: string | null;
  paid_at: string | null;
}

interface Contact {
  id: string;
  event_id: string;
  name: string;
  role_description: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
}

interface Task {
  id: string;
  event_id: string;
  title: string;
  description: string | null;
  is_completed: boolean;
  assigned_to: string | null;
  due_at: string | null;
}

interface Note {
  id: string;
  event_id: string;
  content: string;
  created_by: string;
  created_at: string;
}

interface Attachment {
  id: string;
  event_id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_by: string;
  created_at: string;
}

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const BUCKET = "negroni-calendar";

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function localDateTime(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Lisbon"
  }).format(new Date(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Europe/Lisbon"
  }).format(new Date(value));
}

function money(value: number) {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR"
  }).format(value || 0);
}

function escapeCsv(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export default function Calendar({ user, role }: CalendarProps) {
  const isAdmin = role === "super_admin" || role === "admin";
  const isManager = role === "manager";
  const canManage = isAdmin || isManager;
  const canCreate = canManage || role === "artist";

  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [myArtistId, setMyArtistId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [selectedArtists, setSelectedArtists] = useState<string[]>([]);
  const [artistSearch, setArtistSearch] = useState("");

  const [finances, setFinances] = useState<Finance[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const [financeType, setFinanceType] = useState<Finance["entry_type"]>("expense");
  const [financeDescription, setFinanceDescription] = useState("");
  const [financeAmount, setFinanceAmount] = useState("");
  const [financeArtist, setFinanceArtist] = useState("");

  const [contactName, setContactName] = useState("");
  const [contactRole, setContactRole] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  const [taskTitle, setTaskTitle] = useState("");
  const [taskDue, setTaskDue] = useState("");

  const [noteText, setNoteText] = useState("");
  const [uploading, setUploading] = useState(false);

  const today = new Date();
  const horizon = new Date(today.getFullYear() + 12, today.getMonth(), today.getDate());

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
        .order("starts_at");

      if (eventError) throw eventError;

      const ids = (eventData || []).map((event) => event.id);
      let associations: { event_id: string; artist_profile_id: string }[] = [];

      if (ids.length) {
        const { data, error: associationError } = await supabase
          .from("negroni_calendar_event_artists")
          .select("event_id, artist_profile_id")
          .in("event_id", ids);

        if (associationError) throw associationError;
        associations = data || [];
      }

      setEvents((eventData || []).map((event) => ({
        ...event,
        artists: associations
          .filter((item) => item.event_id === event.id)
          .map((item) => item.artist_profile_id)
      })));
    } catch (err) {
      console.error(err);
      setError("Não foi possível carregar o calendário. Verifica as permissões e tenta novamente.");
    } finally {
      setLoading(false);
    }
  }, [currentMonth, user.id]);

  useEffect(() => {
    loadCalendar();
  }, [loadCalendar]);

  const calendarDays = useMemo(() => {
    const first = startOfMonth(currentMonth);
    const offset = (first.getDay() + 6) % 7;
    const days = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    const total = Math.ceil((offset + days) / 7) * 7;

    return Array.from({ length: total }, (_, index) => {
      const day = index - offset + 1;
      if (day < 1 || day > days) return null;
      return new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    });
  }, [currentMonth]);

  function eventsForDay(date: Date) {
    return events.filter((event) => {
      const start = new Date(event.starts_at);
      const end = new Date(event.ends_at);
      const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const first = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      return day >= first && day <= last;
    });
  }

  function artistNames(ids: string[]) {
    return ids.map((id) => artists.find((artist) => artist.id === id)?.artist_name)
      .filter(Boolean).join(", ");
  }

  function openNewEvent() {
    setError("");
    setEditingEvent(null);
    setTitle("");
    setDescription("");
    setLocation("");
    setSelectedArtists(myArtistId ? [myArtistId] : []);
    setArtistSearch("");

    const start = new Date();
    start.setMinutes(0, 0, 0);
    start.setHours(start.getHours() + 1);
    const end = new Date(start);
    end.setHours(end.getHours() + 1);

    setStartsAt(localDateTime(start));
    setEndsAt(localDateTime(end));
    setShowForm(true);
  }

  function openEditEvent(event: CalendarEvent) {
    if (!canManage && !(role === "artist" && event.created_by === user.id)) return;

    setEditingEvent(event.id);
    setTitle(event.title);
    setDescription(event.description || "");
    setLocation(event.location || "");
    setStartsAt(localDateTime(new Date(event.starts_at)));
    setEndsAt(localDateTime(new Date(event.ends_at)));
    setSelectedArtists(event.artists);
    setArtistSearch("");
    setError("");
    setShowForm(true);
  }

  async function saveEvent(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!title.trim()) return setError("Indica o título do evento.");
    if (!startsAt || !endsAt) return setError("Indica as datas de início e fim.");

    const start = new Date(startsAt);
    const end = new Date(endsAt);

    if (end <= start) return setError("A hora de fim tem de ser posterior à hora de início.");
    if (start < new Date() && !editingEvent) return setError("Não é possível criar eventos no passado.");
    if (start > horizon) return setError("O evento ultrapassa o horizonte de 12 anos.");

    if (!canManage && !myArtistId) {
      return setError("A tua conta não está associada a um perfil de artista.");
    }

    const artistIds = canManage
      ? selectedArtists
      : myArtistId ? [myArtistId] : [];

    if (!artistIds.length) return setError("Seleciona pelo menos um artista.");

    setSaving(true);

    try {
      let eventId = editingEvent;

      if (editingEvent) {
        const { error: updateError } = await supabase
          .from("negroni_calendar_events")
          .update({
            title: title.trim(),
            description: description.trim() || null,
            location: location.trim() || null,
            starts_at: start.toISOString(),
            ends_at: end.toISOString(),
            timezone: "Europe/Lisbon",
            updated_at: new Date().toISOString()
          })
          .eq("id", editingEvent);

        if (updateError) throw updateError;
      } else {
        const { data, error: insertError } = await supabase
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
        eventId = data.id;
      }

      if (!eventId) throw new Error("Não foi possível identificar o evento.");

      if (canManage) {
        const { error: deleteError } = await supabase
          .from("negroni_calendar_event_artists")
          .delete()
          .eq("event_id", eventId);

        if (deleteError) throw deleteError;

        const { error: associationError } = await supabase
          .from("negroni_calendar_event_artists")
          .insert(artistIds.map((artistId) => ({
            event_id: eventId,
            artist_profile_id: artistId
          })));

        if (associationError) throw associationError;
      } else if (!editingEvent) {
        const { error: associationError } = await supabase
          .from("negroni_calendar_event_artists")
          .insert(artistIds.map((artistId) => ({
            event_id: eventId,
            artist_profile_id: artistId
          })));

        if (associationError) throw associationError;
      }

      setShowForm(false);
      setSuccess(editingEvent ? "Evento atualizado com sucesso." : "Evento criado com sucesso.");
      await loadCalendar();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Não foi possível guardar o evento.");
    } finally {
      setSaving(false);
    }
  }

  async function cancelEvent(eventId: string) {
    if (!canManage) return;
    if (!window.confirm("Tens a certeza de que pretendes cancelar este evento?")) return;

    const { error: updateError } = await supabase
      .from("negroni_calendar_events")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", eventId);

    if (updateError) {
      setError("Não foi possível cancelar o evento.");
      return;
    }

    setSuccess("Evento cancelado.");
    setSelectedEvent(null);
    await loadCalendar();
  }

  async function moveEvent(event: CalendarEvent, targetDate: Date) {
    if (!canManage && !(role === "artist" && event.created_by === user.id)) return;
    if (event.status !== "confirmed") return;

    const oldStart = new Date(event.starts_at);
    const oldEnd = new Date(event.ends_at);
    const duration = oldEnd.getTime() - oldStart.getTime();

    const newStart = new Date(
      targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(),
      oldStart.getHours(), oldStart.getMinutes()
    );
    const newEnd = new Date(newStart.getTime() + duration);

    const { error: moveError } = await supabase
      .from("negroni_calendar_events")
      .update({
        starts_at: newStart.toISOString(),
        ends_at: newEnd.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", event.id);

    if (moveError) {
      setError("Não foi possível reagendar o evento. Verifica as permissões.");
      return;
    }

    setSuccess("Evento reagendado.");
    await loadCalendar();
  }

  async function openEventDetails(event: CalendarEvent) {
    setSelectedEvent(event);
    setDetailLoading(true);
    setFinances([]);
    setContacts([]);
    setTasks([]);
    setNotes([]);
    setAttachments([]);

    try {
      const [f, c, t, n, a] = await Promise.all([
        supabase.from("negroni_calendar_finances").select("*").eq("event_id", event.id).order("created_at"),
        supabase.from("negroni_calendar_contacts").select("*").eq("event_id", event.id).order("created_at"),
        supabase.from("negroni_calendar_tasks").select("*").eq("event_id", event.id).order("created_at"),
        supabase.from("negroni_calendar_notes").select("*").eq("event_id", event.id).order("created_at", { ascending: false }),
        supabase.from("negroni_calendar_attachments").select("*").eq("event_id", event.id).order("created_at", { ascending: false })
      ]);

      const errors = [f.error, c.error, t.error, n.error, a.error].filter(Boolean);
      if (errors.length) throw errors[0];

      setFinances(f.data || []);
      setContacts(c.data || []);
      setTasks(t.data || []);
      setNotes(n.data || []);
      setAttachments(a.data || []);
    } catch (err) {
      console.error(err);
      setError("Não foi possível carregar os detalhes. Confirma as permissões da equipa.");
    } finally {
      setDetailLoading(false);
    }
  }

  async function addFinance() {
    if (!selectedEvent || !financeDescription.trim() || !financeAmount) return;
    const amount = Number(financeAmount);
    if (!Number.isFinite(amount) || amount < 0) return setError("Indica um valor válido.");

    const { error: insertError } = await supabase
      .from("negroni_calendar_finances")
      .insert({
        event_id: selectedEvent.id,
        entry_type: financeType,
        description: financeDescription.trim(),
        amount,
        artist_profile_id: financeArtist || null,
        created_by: user.id
      });

    if (insertError) return setError("Não foi possível adicionar o registo financeiro.");

    setFinanceDescription("");
    setFinanceAmount("");
    setFinanceArtist("");
    await openEventDetails(selectedEvent);
  }

  async function deleteFinance(id: string) {
    if (!selectedEvent || !canManage) return;
    if (!window.confirm("Eliminar este registo financeiro?")) return;

    const { error: deleteError } = await supabase
      .from("negroni_calendar_finances")
      .delete()
      .eq("id", id);

    if (deleteError) return setError("Não foi possível eliminar o registo.");
    await openEventDetails(selectedEvent);
  }

  async function addContact() {
    if (!selectedEvent || !contactName.trim()) return;

    const { error: insertError } = await supabase
      .from("negroni_calendar_contacts")
      .insert({
        event_id: selectedEvent.id,
        name: contactName.trim(),
        role_description: contactRole.trim() || null,
        phone: contactPhone.trim() || null,
        email: contactEmail.trim() || null,
        created_by: user.id
      });

    if (insertError) return setError("Não foi possível guardar o contacto.");

    setContactName("");
    setContactRole("");
    setContactPhone("");
    setContactEmail("");
    await openEventDetails(selectedEvent);
  }

  async function deleteContact(id: string) {
    if (!selectedEvent || !canManage) return;
    const { error: deleteError } = await supabase
      .from("negroni_calendar_contacts")
      .delete()
      .eq("id", id);

    if (deleteError) return setError("Não foi possível eliminar o contacto.");
    await openEventDetails(selectedEvent);
  }

  async function addTask() {
    if (!selectedEvent || !taskTitle.trim()) return;

    const { error: insertError } = await supabase
      .from("negroni_calendar_tasks")
      .insert({
        event_id: selectedEvent.id,
        title: taskTitle.trim(),
        due_at: taskDue ? new Date(taskDue).toISOString() : null,
        created_by: user.id
      });

    if (insertError) return setError("Não foi possível criar a tarefa.");

    setTaskTitle("");
    setTaskDue("");
    await openEventDetails(selectedEvent);
  }

  async function toggleTask(task: Task) {
    if (!selectedEvent || !canManage) return;

    const { error: updateError } = await supabase
      .from("negroni_calendar_tasks")
      .update({
        is_completed: !task.is_completed,
        updated_at: new Date().toISOString()
      })
      .eq("id", task.id);

    if (updateError) return setError("Não foi possível atualizar a tarefa.");
    await openEventDetails(selectedEvent);
  }

  async function deleteTask(id: string) {
    if (!selectedEvent || !canManage) return;
    const { error: deleteError } = await supabase
      .from("negroni_calendar_tasks")
      .delete()
      .eq("id", id);

    if (deleteError) return setError("Não foi possível eliminar a tarefa.");
    await openEventDetails(selectedEvent);
  }

  async function addNote() {
    if (!selectedEvent || !noteText.trim()) return;

    const { error: insertError } = await supabase
      .from("negroni_calendar_notes")
      .insert({
        event_id: selectedEvent.id,
        content: noteText.trim(),
        created_by: user.id
      });

    if (insertError) return setError("Não foi possível guardar a nota.");

    setNoteText("");
    await openEventDetails(selectedEvent);
  }

  async function deleteNote(id: string) {
    if (!selectedEvent || !canManage) return;
    const { error: deleteError } = await supabase
      .from("negroni_calendar_notes")
      .delete()
      .eq("id", id);

    if (deleteError) return setError("Não foi possível eliminar a nota.");
    await openEventDetails(selectedEvent);
  }

  async function uploadAttachment(file: File) {
    if (!selectedEvent || !canManage) return;
    if (file.size > 20 * 1024 * 1024) {
      setError("O ficheiro não pode ultrapassar 20 MB.");
      return;
    }

    setUploading(true);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${selectedEvent.id}/${Date.now()}-${safeName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: false });

      if (uploadError) throw uploadError;

      const { error: metadataError } = await supabase
        .from("negroni_calendar_attachments")
        .insert({
          event_id: selectedEvent.id,
          file_name: file.name,
          file_path: path,
          file_type: file.type || null,
          file_size: file.size,
          uploaded_by: user.id
        });

      if (metadataError) {
        await supabase.storage.from(BUCKET).remove([path]);
        throw metadataError;
      }

      await openEventDetails(selectedEvent);
      setSuccess("Documento carregado com sucesso.");
    } catch (err) {
      console.error(err);
      setError("Não foi possível carregar o documento.");
    } finally {
      setUploading(false);
    }
  }

  async function downloadAttachment(file: Attachment) {
    const { data, error: downloadError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(file.file_path, 60);

    if (downloadError || !data?.signedUrl) {
      setError("Não foi possível gerar o acesso ao documento.");
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function deleteAttachment(file: Attachment) {
    if (!selectedEvent || !canManage) return;
    if (!window.confirm(`Eliminar o documento "${file.file_name}"?`)) return;

    const { error: storageError } = await supabase.storage
      .from(BUCKET)
      .remove([file.file_path]);

    if (storageError) return setError("Não foi possível eliminar o ficheiro.");

    const { error: metadataError } = await supabase
      .from("negroni_calendar_attachments")
      .delete()
      .eq("id", file.id);

    if (metadataError) return setError("Ficheiro removido, mas não foi possível atualizar o registo.");
    await openEventDetails(selectedEvent);
  }

  function exportCsv() {
    const rows = [
      ["Evento", "Início", "Fim", "Local", "Artistas", "Estado", "Descrição"],
      ...events.map((event) => [
        event.title,
        formatDate(event.starts_at) + " " + formatTime(event.starts_at),
        formatDate(event.ends_at) + " " + formatTime(event.ends_at),
        event.location || "",
        artistNames(event.artists),
        event.status,
        event.description || ""
      ])
    ];

    const csv = "\uFEFF" + rows.map((row) => row.map(escapeCsv).join(";")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `negroni-calendar-${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportPdf() {
    window.print();
  }

  const monthEvents = events.filter((event) => event.status !== "archived");
  const filteredArtists = artists.filter((artist) =>
    artist.artist_name.toLowerCase().includes(artistSearch.toLowerCase())
  );

  const totalExpenses = finances
    .filter((item) => item.entry_type === "expense" || item.entry_type === "artist_fee")
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const totalIncome = finances
    .filter((item) => item.entry_type === "income")
    .reduce((sum, item) => sum + Number(item.amount), 0);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <div style={styles.eyebrow}>NEGRONI PSP · OPERATIONS</div>
          <h2 style={styles.heading}>PSP Calendar<span style={{ color: "#a78bfa" }}>.</span></h2>
          <p style={styles.subtitle}>Gestão centralizada de eventos, atuações e compromissos.</p>
        </div>

        <div style={styles.headerActions}>
          <button style={styles.secondaryButton} onClick={exportCsv}>
            <Download size={15} /> Excel / CSV
          </button>
          <button style={styles.secondaryButton} onClick={exportPdf}>
            <Printer size={15} /> PDF
          </button>
          {canCreate && (
            <button style={styles.primaryButton} onClick={openNewEvent}>
              <Plus size={17} /> Novo evento
            </button>
          )}
        </div>
      </div>

      {error && <div style={styles.error}>{error}</div>}
      {success && <div style={styles.success}>{success}</div>}

      <div style={styles.toolbar}>
        <div style={styles.monthNavigation}>
          <button style={styles.iconButton} disabled={!canGoBack}
            onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}>
            <ChevronLeft size={19} />
          </button>
          <h3 style={styles.monthTitle}>
            {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h3>
          <button style={styles.iconButton} disabled={!canGoForward}
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight size={19} />
          </button>
        </div>
        <button style={styles.refreshButton} onClick={loadCalendar}>
          <RefreshCw size={15} /> Atualizar
        </button>
      </div>

      <div style={styles.calendarCard}>
        <div style={styles.weekHeader}>
          {WEEKDAYS.map((day) => <div key={day} style={styles.weekday}>{day}</div>)}
        </div>

        {loading ? (
          <div style={styles.loading}>A carregar calendário...</div>
        ) : (
          <div style={styles.calendarGrid}>
            {calendarDays.map((date, index) => {
              if (!date) return <div key={`empty-${index}`} style={styles.dayCell} />;

              const dayEvents = eventsForDay(date);
              const isToday = date.toDateString() === new Date().toDateString();

              return (
                <div
                  key={date.toISOString()}
                  style={styles.dayCell}
                  onDragOver={(e) => {
                    if (canManage) e.preventDefault();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const id = e.dataTransfer.getData("text/plain");
                    const event = events.find((item) => item.id === id);
                    if (event) moveEvent(event, date);
                  }}
                >
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
                        draggable={canManage || (role === "artist" && event.created_by === user.id)}
                        onDragStart={(e) => e.dataTransfer.setData("text/plain", event.id)}
                        onClick={() => openEventDetails(event)}
                        title={`${event.title} · ${formatTime(event.starts_at)}`}
                        style={{
                          ...styles.eventChip,
                          ...(event.status === "cancelled" ? styles.cancelledChip : {})
                        }}
                      >
                        <span style={styles.eventTime}>{formatTime(event.starts_at)}</span>
                        <span style={styles.eventTitle}>{event.title}</span>
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div style={styles.moreEvents}>+{dayEvents.length - 3} mais</div>
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
          <p style={styles.sectionSubtitle}>{monthEvents.length} evento(s) neste período</p>
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
                day: "2-digit", timeZone: "Europe/Lisbon"
              })}</strong>
              <span>{new Date(event.starts_at).toLocaleDateString("pt-PT", {
                month: "short", timeZone: "Europe/Lisbon"
              })}</span>
            </div>

            <div style={styles.eventDetails}>
              <strong>{event.title}</strong>
              <div style={styles.eventMeta}>
                <span><Clock size={13} /> {formatTime(event.starts_at)} – {formatTime(event.ends_at)}</span>
                {event.location && <span><MapPin size={13} /> {event.location}</span>}
                {event.artists.length > 0 && <span><Users size={13} /> {artistNames(event.artists)}</span>}
              </div>
              {event.description && <p style={styles.description}>{event.description}</p>}
            </div>

            <div style={styles.eventActions}>
              <span style={{
                ...styles.status,
                ...(event.status === "cancelled" ? styles.cancelledStatus : {})
              }}>
                {event.status === "cancelled" ? "Cancelado" : "Confirmado"}
              </span>

              <button style={styles.smallButton} onClick={() => openEventDetails(event)}>
                Ver detalhes
              </button>

              {(canManage || (role === "artist" && event.created_by === user.id)) &&
                event.status === "confirmed" && (
                <button style={styles.smallButton} onClick={() => openEditEvent(event)}>
                  <Pencil size={12} /> Editar
                </button>
              )}

              {canManage && event.status === "confirmed" && (
                <button style={styles.cancelButton} onClick={() => cancelEvent(event.id)}>
                  Cancelar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={styles.footerNote}>
        Fuso horário: Europe/Lisbon · Planeamento até 12 anos
      </div>

      {showForm && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <div>
                <div style={styles.eyebrow}>PSP CALENDAR</div>
                <h3 style={styles.modalTitle}>{editingEvent ? "Editar evento" : "Criar evento"}</h3>
              </div>
              <button style={styles.iconButton} onClick={() => setShowForm(false)}>
                <X size={19} />
              </button>
            </div>

            <form onSubmit={saveEvent}>
              <label style={styles.label}>Nome do evento *</label>
              <input style={styles.input} value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex.: Atuação ao vivo" required />

              <label style={styles.label}>Descrição</label>
              <textarea style={styles.textarea} value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalhes adicionais..." rows={3} />

              <label style={styles.label}>Localização</label>
              <input style={styles.input} value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Local do evento" />

              <div style={styles.formGrid}>
                <div>
                  <label style={styles.label}>Início *</label>
                  <input style={styles.input} type="datetime-local"
                    value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required />
                </div>
                <div>
                  <label style={styles.label}>Fim *</label>
                  <input style={styles.input} type="datetime-local"
                    value={endsAt} onChange={(e) => setEndsAt(e.target.value)} required />
                </div>
              </div>

              <label style={styles.label}>Artistas associados *</label>

              {canManage ? (
                <>
                  <div style={styles.searchBox}>
                    <Search size={15} />
                    <input value={artistSearch}
                      onChange={(e) => setArtistSearch(e.target.value)}
                      placeholder="Pesquisar artista..." />
                  </div>
                  <div style={styles.artistList}>
                    {filteredArtists.map((artist) => (
                      <label key={artist.id} style={styles.artistOption}>
                        <input type="checkbox"
                          checked={selectedArtists.includes(artist.id)}
                          onChange={(e) => setSelectedArtists((previous) =>
                            e.target.checked
                              ? [...previous, artist.id]
                              : previous.filter((id) => id !== artist.id)
                          )} />
                        <span>{artist.artist_name}</span>
                      </label>
                    ))}
                    {filteredArtists.length === 0 && (
                      <p style={styles.helper}>Não foram encontrados artistas.</p>
                    )}
                  </div>
                  <p style={styles.helper}>
                    {selectedArtists.length} artista(s) selecionado(s).
                  </p>
                </>
              ) : (
                <div style={styles.artistNotice}>
                  {artists.find((artist) => artist.id === myArtistId)?.artist_name ||
                    "Perfil de artista não associado"}
                </div>
              )}

              {error && <div style={styles.error}>{error}</div>}

              <div style={styles.modalActions}>
                <button type="button" style={styles.secondaryButton}
                  onClick={() => setShowForm(false)}>Fechar</button>
                <button type="submit" style={styles.primaryButton} disabled={saving}>
                  {saving ? "A guardar..." : editingEvent ? "Guardar alterações" : "Criar evento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedEvent && (
        <div style={styles.modalOverlay}>
          <div style={styles.detailModal}>
            <div style={styles.modalHeader}>
              <div>
                <div style={styles.eyebrow}>PSP CALENDAR · EVENTO</div>
                <h3 style={styles.modalTitle}>{selectedEvent.title}</h3>
                <p style={styles.sectionSubtitle}>
                  {formatDate(selectedEvent.starts_at)} · {formatTime(selectedEvent.starts_at)}
                  {" – "}{formatTime(selectedEvent.ends_at)}
                </p>
              </div>
              <button style={styles.iconButton} onClick={() => setSelectedEvent(null)}>
                <X size={19} />
              </button>
            </div>

            {selectedEvent.location && (
              <p style={styles.detailLine}><MapPin size={14} /> {selectedEvent.location}</p>
            )}
            {selectedEvent.description && (
              <p style={styles.description}>{selectedEvent.description}</p>
            )}
            <p style={styles.detailLine}><Users size={14} /> {artistNames(selectedEvent.artists) || "Sem artistas associados"}</p>

            {detailLoading ? (
              <div style={styles.loading}>A carregar detalhes...</div>
            ) : canManage ? (
              <div style={styles.detailSections}>
                <section style={styles.detailSection}>
                  <h4><Euro size={16} /> Gestão financeira</h4>
                  <div style={styles.formGrid}>
                    <select style={styles.input} value={financeType}
                      onChange={(e) => setFinanceType(e.target.value as Finance["entry_type"])}>
                      <option value="expense">Despesa</option>
                      <option value="artist_fee">Cachê</option>
                      <option value="income">Receita</option>
                    </select>
                    <input style={styles.input} type="number" min="0" step="0.01"
                      placeholder="Valor (€)" value={financeAmount}
                      onChange={(e) => setFinanceAmount(e.target.value)} />
                  </div>
                  <input style={styles.input} placeholder="Descrição do movimento"
                    value={financeDescription} onChange={(e) => setFinanceDescription(e.target.value)} />
                  {financeType === "artist_fee" && (
                    <select style={styles.input} value={financeArtist}
                      onChange={(e) => setFinanceArtist(e.target.value)}>
                      <option value="">Associar artista (opcional)</option>
                      {artists.map((artist) => (
                        <option key={artist.id} value={artist.id}>{artist.artist_name}</option>
                      ))}
                    </select>
                  )}
                  <button style={styles.primaryButton} onClick={addFinance}>Adicionar movimento</button>

                  <div style={styles.financeSummary}>
                    <span>Custos: <strong>{money(totalExpenses)}</strong></span>
                    <span>Receitas: <strong>{money(totalIncome)}</strong></span>
                    <span>Saldo: <strong>{money(totalIncome - totalExpenses)}</strong></span>
                  </div>
                  {finances.map((item) => (
                    <div key={item.id} style={styles.detailRow}>
                      <span>{item.description} · {item.entry_type === "artist_fee" ? "Cachê" : item.entry_type === "income" ? "Receita" : "Despesa"}</span>
                      <strong>{money(Number(item.amount))}</strong>
                      <button style={styles.deleteIcon} onClick={() => deleteFinance(item.id)}><Trash2 size={13} /></button>
                    </div>
                  ))}
                </section>

                <section style={styles.detailSection}>
                  <h4><UserRound size={16} /> Contactos e responsáveis</h4>
                  <input style={styles.input} placeholder="Nome" value={contactName}
                    onChange={(e) => setContactName(e.target.value)} />
                  <input style={styles.input} placeholder="Função / responsabilidade" value={contactRole}
                    onChange={(e) => setContactRole(e.target.value)} />
                  <div style={styles.formGrid}>
                    <input style={styles.input} placeholder="Telefone" value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)} />
                    <input style={styles.input} placeholder="Email" value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)} />
                  </div>
                  <button style={styles.primaryButton} onClick={addContact}>Adicionar contacto</button>
                  {contacts.map((contact) => (
                    <div key={contact.id} style={styles.detailRow}>
                      <span>
                        <strong>{contact.name}</strong>
                        <small>{contact.role_description || ""} {contact.phone || ""} {contact.email || ""}</small>
                      </span>
                      <button style={styles.deleteIcon} onClick={() => deleteContact(contact.id)}><Trash2 size={13} /></button>
                    </div>
                  ))}
                </section>

                <section style={styles.detailSection}>
                  <h4><ClipboardList size={16} /> Tarefas e checklist</h4>
                  <input style={styles.input} placeholder="Nova tarefa" value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)} />
                  <input style={styles.input} type="datetime-local" value={taskDue}
                    onChange={(e) => setTaskDue(e.target.value)} />
                  <button style={styles.primaryButton} onClick={addTask}>Adicionar tarefa</button>
                  {tasks.map((task) => (
                    <div key={task.id} style={styles.detailRow}>
                      <button style={styles.taskToggle} onClick={() => toggleTask(task)}>
                        {task.is_completed ? <CheckCircle2 size={17} /> : <Circle size={17} />}
                      </button>
                      <span style={task.is_completed ? styles.completedTask : {}}>
                        {task.title}
                        {task.due_at && <small>{formatDate(task.due_at)}</small>}
                      </span>
                      <button style={styles.deleteIcon} onClick={() => deleteTask(task.id)}><Trash2 size={13} /></button>
                    </div>
                  ))}
                </section>

                <section style={styles.detailSection}>
                  <h4><StickyNote size={16} /> Notas internas</h4>
                  <textarea style={styles.textarea} rows={3} value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Escrever uma nota privada para a equipa..." />
                  <button style={styles.primaryButton} onClick={addNote}>Guardar nota</button>
                  {notes.map((note) => (
                    <div key={note.id} style={styles.noteCard}>
                      <p>{note.content}</p>
                      <small>{formatDate(note.created_at)}</small>
                      <button style={styles.deleteIcon} onClick={() => deleteNote(note.id)}><Trash2 size={13} /></button>
                    </div>
                  ))}
                </section>

                <section style={styles.detailSection}>
                  <h4><Paperclip size={16} /> Documentos e anexos</h4>
                  <label style={styles.uploadButton}>
                    <Upload size={15} /> {uploading ? "A carregar..." : "Carregar documento"}
                    <input type="file" hidden disabled={uploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadAttachment(file);
                        e.currentTarget.value = "";
                      }} />
                  </label>
                  <p style={styles.helper}>Ficheiros até 20 MB. Armazenamento privado.</p>
                  {attachments.map((file) => (
                    <div key={file.id} style={styles.detailRow}>
                      <FileText size={16} />
                      <span>{file.file_name}<small>{file.file_size ? `${(file.file_size / 1024 / 1024).toFixed(2)} MB` : ""}</small></span>
                      <button style={styles.deleteIcon} onClick={() => downloadAttachment(file)}><Download size={14} /></button>
                      <button style={styles.deleteIcon} onClick={() => deleteAttachment(file)}><Trash2 size={13} /></button>
                    </div>
                  ))}
                </section>
              </div>
            ) : (
              <div style={styles.artistNotice}>
                Os detalhes de gestão financeira, documentos internos e notas estão disponíveis apenas para Admin e Manager.
              </div>
            )}

            <div style={styles.modalActions}>
              {(canManage || (role === "artist" && selectedEvent.created_by === user.id)) && (
                <button style={styles.secondaryButton} onClick={() => {
                  const event = selectedEvent;
                  setSelectedEvent(null);
                  openEditEvent(event);
                }}>
                  <Pencil size={14} /> Editar evento
                </button>
              )}
              <button style={styles.secondaryButton} onClick={() => setSelectedEvent(null)}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  container: { color: "#f5f3fa", width: "100%" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap", marginBottom: 28 },
  headerActions: { display: "flex", flexWrap: "wrap", gap: 8 },
  eyebrow: { color: "#a78bfa", fontSize: 10, letterSpacing: 2, fontWeight: 700, marginBottom: 8 },
  heading: { fontSize: 29, margin: 0, fontWeight: 700 },
  subtitle: { color: "#9991a8", fontSize: 13, marginTop: 8 },
  primaryButton: { background: "#8054d8", color: "#fff", border: 0, borderRadius: 9, padding: "11px 15px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, fontWeight: 600, cursor: "pointer" },
  secondaryButton: { background: "transparent", color: "#c5bbd0", border: "1px solid #393044", borderRadius: 8, padding: "10px 13px", display: "inline-flex", alignItems: "center", gap: 7, cursor: "pointer" },
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
  eventChip: { background: "#302044", borderLeft: "2px solid #a78bfa", borderRadius: 4, padding: "4px 5px", color: "#e5d9fa", fontSize: 10, overflow: "hidden", cursor: "pointer" },
  cancelledChip: { background: "#352126", borderLeftColor: "#c16b75", color: "#d6aab0", textDecoration: "line-through" },
  eventTime: { display: "block", fontSize: 9, opacity: 0.75, marginBottom: 2 },
  eventTitle: { display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  moreEvents: { color: "#a99bb9", fontSize: 10 },
  loading: { padding: 35, textAlign: "center", color: "#a99bb9" },
  sectionHeader: { margin: "27px 0 13px" },
  sectionTitle: { fontSize: 17, margin: 0 },
  sectionSubtitle: { color: "#8e849b", fontSize: 12, marginTop: 5 },
  eventList: { display: "flex", flexDirection: "column", gap: 9 },
  eventRow: { display: "flex", alignItems: "center", gap: 16, background: "#100e16", border: "1px solid #292431", borderRadius: 11, padding: 14, minWidth: 0, flexWrap: "wrap" },
  eventDate: { minWidth: 48, height: 48, borderRadius: 9, background: "#241a32", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#c9b2f3" },
  eventDetails: { flex: 1, minWidth: 160, display: "flex", flexDirection: "column", gap: 6 },
  eventMeta: { display: "flex", flexWrap: "wrap", gap: "7px 14px", color: "#9d93aa", fontSize: 11 },
  description: { color: "#a79caf", fontSize: 12, margin: 0, whiteSpace: "pre-wrap" },
  eventActions: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 7 },
  status: { color: "#8fd4ae", background: "#173026", padding: "5px 8px", borderRadius: 20, fontSize: 10 },
  cancelledStatus: { color: "#e1a2a9", background: "#382027" },
  cancelButton: { color: "#d99ba3", background: "transparent", border: "1px solid #58323a", borderRadius: 6, padding: "5px 8px", cursor: "pointer", fontSize: 10 },
  smallButton: { color: "#cbb8eb", background: "#211a2c", border: "1px solid #49365e", borderRadius: 6, padding: "6px 9px", display: "flex", gap: 5, alignItems: "center", cursor: "pointer", fontSize: 10 },
  emptyState: { background: "#100e16", border: "1px dashed #393044", borderRadius: 12, padding: 35, display: "flex", flexDirection: "column", alignItems: "center", gap: 9, color: "#a79caf", fontSize: 12 },
  footerNote: { color: "#71687d", fontSize: 10, marginTop: 20, textAlign: "right" },
  modalOverlay: { position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,.78)", display: "flex", alignItems: "center", justifyContent: "center", padding: 15 },
  modal: { background: "#15121c", border: "1px solid #3a3048", borderRadius: 15, padding: 23, width: "100%", maxWidth: 570, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 80px #0009" },
  detailModal: { background: "#15121c", border: "1px solid #3a3048", borderRadius: 15, padding: 23, width: "100%", maxWidth: 760, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 20px 80px #0009" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 21, margin: 0 },
  label: { display: "block", color: "#c7bdcf", fontSize: 12, fontWeight: 600, marginBottom: 7, marginTop: 14 },
  input: { width: "100%", boxSizing: "border-box", background: "#0d0b12", color: "#f5f3fa", border: "1px solid #393044", borderRadius: 8, padding: "11px 12px", fontSize: 13, marginBottom: 9 },
  textarea: { width: "100%", boxSizing: "border-box", background: "#0d0b12", color: "#f5f3fa", border: "1px solid #393044", borderRadius: 8, padding: 12, fontSize: 13, resize: "vertical", marginBottom: 9 },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  artistNotice: { background: "#211a2c", color: "#d9c7f5", border: "1px solid #49365e", borderRadius: 8, padding: 12, fontSize: 13 },
  searchBox: { display: "flex", alignItems: "center", gap: 9, background: "#0d0b12", color: "#a99bb9", border: "1px solid #393044", borderRadius: 8, padding: "0 11px", marginBottom: 8 },
  artistList: { maxHeight: 155, overflowY: "auto", border: "1px solid #393044", borderRadius: 8, padding: 8, background: "#0d0b12" },
  artistOption: { display: "flex", alignItems: "center", gap: 9, padding: "7px 5px", color: "#ddd4e8", fontSize: 12, cursor: "pointer" },
  helper: { color: "#8f849b", fontSize: 10, lineHeight: 1.5 },
  modalActions: { display: "flex", justifyContent: "flex-end", flexWrap: "wrap", gap: 10, marginTop: 22 },
  error: { background: "#351d25", border: "1px solid #67313e", color: "#f0b3bb", padding: 12, borderRadius: 8, fontSize: 12, marginBottom: 14 },
  success: { background: "#183126", border: "1px solid #315a43", color: "#a7dfbb", padding: 12, borderRadius: 8, fontSize: 12, marginBottom: 14 },
  detailLine: { display: "flex", alignItems: "center", gap: 8, color: "#b9adc9", fontSize: 12 },
  detailSections: { display: "flex", flexDirection: "column", gap: 15, marginTop: 20 },
  detailSection: { border: "1px solid #393044", borderRadius: 10, padding: 14, display: "flex", flexDirection: "column", gap: 8 },
  detailRow: { display: "flex", alignItems: "center", gap: 10, padding: "9px 5px", borderBottom: "1px solid #30283b", color: "#d9d0e3", fontSize: 12 },
  detailRowText: { flex: 1 },
  deleteIcon: { color: "#c58c98", background: "transparent", border: 0, cursor: "pointer", padding: 5 },
  financeSummary: { display: "flex", flexWrap: "wrap", gap: 14, padding: 10, background: "#211a2c", borderRadius: 8, color: "#cbb8eb", fontSize: 11 },
  taskToggle: { color: "#b79be8", background: "transparent", border: 0, cursor: "pointer" },
  completedTask: { color: "#8b8296", textDecoration: "line-through" },
  noteCard: { position: "relative", padding: 10, borderRadius: 8, background: "#211a2c", color: "#d9d0e3", fontSize: 12 },
  uploadButton: { background: "#211a2c", color: "#d9c7f5", border: "1px solid #49365e", borderRadius: 8, padding: 11, display: "inline-flex", alignItems: "center", gap: 8, width: "fit-content", cursor: "pointer", fontSize: 12 },
  "@media print": { background: "#fff", color: "#000" }
};
