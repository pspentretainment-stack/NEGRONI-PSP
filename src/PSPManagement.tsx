
import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import {
  Users,
  ShieldCheck,
  Search,
  RefreshCw,
  UserPlus,
  Save,
  Lock,
  Unlock,
  X,
  LayoutGrid,
  Activity,
  AlertTriangle
} from "lucide-react";

type Role =
  | "super_admin"
  | "admin"
  | "manager"
  | "artist"
  | "collaborator";

type ModuleKey =
  | "passali"
  | "artists"
  | "business"
  | "management";

interface ManagedUser {
  id: string;
  email: string;
  role: Role | null;
  is_active: boolean;
  modules: ModuleKey[];
  created_at: string;
  last_sign_in_at: string | null;
}

interface Props {
  userId: string;
  role: Role;
}

const ROLES = [
  { value: "super_admin", label: "Super Admin" },
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "artist", label: "Artist" },
  { value: "collaborator", label: "Collaborator" }
];

const MODULES = [
  { value: "passali", label: "Passali Tickets" },
  { value: "artists", label: "Artist Portal" },
  { value: "business", label: "PSP Business" },
  { value: "management", label: "PSP Management" }
];

const styles: Record<string, React.CSSProperties> = {
  page: { color: "#f5f3fa", width: "100%" },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
    marginBottom: 24
  },
  eyebrow: {
    color: "#b794f6",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 2,
    marginBottom: 8
  },
  title: { fontSize: 28, margin: 0 },
  muted: { color: "#958ba2", fontSize: 12 },
  button: {
    background: "#8054d8",
    color: "#fff",
    border: 0,
    borderRadius: 8,
    padding: "10px 14px",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    cursor: "pointer",
    fontWeight: 600
  },
  secondary: {
    background: "#191521",
    color: "#ddd4e9",
    border: "1px solid #332a40",
    borderRadius: 8,
    padding: "9px 12px",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    cursor: "pointer"
  },
  panel: {
    background: "#100e16",
    border: "1px solid #292431",
    borderRadius: 12,
    padding: 16
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    background: "#0d0b12",
    color: "#f5f3fa",
    border: "1px solid #393044",
    borderRadius: 8,
    padding: "10px 12px"
  },
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 2000,
    background: "#000b",
    display: "grid",
    placeItems: "center",
    padding: 16
  },
  modal: {
    width: "100%",
    maxWidth: 560,
    maxHeight: "90vh",
    overflowY: "auto",
    background: "#15121c",
    border: "1px solid #40334f",
    borderRadius: 14,
    padding: 22
  },
  label: {
    display: "block",
    color: "#c9bfd4",
    fontSize: 11,
    margin: "14px 0 7px",
    fontWeight: 600
  }
};

export default function PSPManagement({ userId, role }: Props) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const [notice, setNotice] = useState<{
    type: "ok" | "error";
    text: string;
  } | null>(null);

  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("artist");
  const [inviteModules, setInviteModules] =
    useState<ModuleKey[]>(["artists"]);

  const isSuperAdmin = role === "super_admin";

  const callAdmin = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke(
      "negroni-management",
      { body }
    );

    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);

    return data;
  };

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setNotice(null);

    try {
      const data = await callAdmin({ action: "list" });
      setUsers(data.users || []);
    } catch (error) {
      setNotice({
        type: "error",
        text: error instanceof Error
          ? error.message
          : "Erro ao carregar utilizadores."
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const filtered = users.filter((user) => {
    const matchesSearch = user.email
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesRole =
      roleFilter === "all" || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const activeCount = users.filter((u) => u.is_active).length;
  const inactiveCount = users.length - activeCount;

  async function saveUser() {
    if (!editing) return;

    setBusy(true);
    setNotice(null);

    try {
      await callAdmin({
        action: "update",
        user_id: editing.id,
        role: editing.role,
        is_active: editing.is_active,
        modules: editing.modules
      });

      setEditing(null);

      setNotice({
        type: "ok",
        text: "Utilizador atualizado com sucesso."
      });

      await loadUsers();
    } catch (error) {
      setNotice({
        type: "error",
        text: error instanceof Error
          ? error.message
          : "Erro ao guardar alterações."
      });
    } finally {
      setBusy(false);
    }
  }

  async function inviteUser(e: React.FormEvent) {
    e.preventDefault();

    setBusy(true);
    setNotice(null);

    try {
      await callAdmin({
        action: "invite",
        email: inviteEmail.trim(),
        role: inviteRole,
        modules: inviteModules
      });

      setInviteOpen(false);
      setInviteEmail("");

      setNotice({
        type: "ok",
        text: "Convite enviado com sucesso."
      });

      await loadUsers();
    } catch (error) {
      setNotice({
        type: "error",
        text: error instanceof Error
          ? error.message
          : "Erro ao enviar convite."
      });
    } finally {
      setBusy(false);
    }
  }

  function toggleModule(module: ModuleKey) {
    if (!editing) return;

    setEditing({
      ...editing,
      modules: editing.modules.includes(module)
        ? editing.modules.filter((m) => m !== module)
        : [...editing.modules, module]
    });
  }

  function toggleInviteModule(module: ModuleKey) {
    setInviteModules((old) =>
      old.includes(module)
        ? old.filter((m) => m !== module)
        : [...old, module]
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.eyebrow}>
            NEGRONI PSP · CONTROL CENTER
          </div>

          <h2 style={styles.title}>
            PSP Management
            <span style={{ color: "#a78bfa" }}>.</span>
          </h2>

          <p style={styles.muted}>
            Administração central, utilizadores, permissões e segurança.
          </p>
        </div>

        <div style={{ display: "flex", gap: 9 }}>
          <button
            style={styles.secondary}
            onClick={() => void loadUsers()}
          >
            <RefreshCw size={15} />
            Atualizar
          </button>

          <button
            style={styles.button}
            onClick={() => setInviteOpen(true)}
          >
            <UserPlus size={16} />
            Convidar utilizador
          </button>
        </div>
      </div>

      {notice && (
        <div style={{
          padding: 12,
          borderRadius: 8,
          marginBottom: 14,
          background: notice.type === "ok" ? "#183126" : "#351d25",
          color: notice.type === "ok" ? "#a7dfbb" : "#f0b3bb",
          border: `1px solid ${
            notice.type === "ok" ? "#315a43" : "#67313e"
          }`
        }}>
          {notice.text}
        </div>
      )}

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
        gap: 12,
        marginBottom: 18
      }}>
        <div style={styles.panel}>
          <Users size={18} color="#b794f6" />
          <p style={styles.muted}>Utilizadores registados</p>
          <strong style={{ fontSize: 25 }}>{users.length}</strong>
        </div>

        <div style={styles.panel}>
          <Activity size={18} color="#8fd4ae" />
          <p style={styles.muted}>Contas ativas</p>
          <strong style={{ fontSize: 25 }}>{activeCount}</strong>
        </div>

        <div style={styles.panel}>
          <Lock size={18} color="#e1a2a9" />
          <p style={styles.muted}>Contas inativas</p>
          <strong style={{ fontSize: 25 }}>{inactiveCount}</strong>
        </div>

        <div style={styles.panel}>
          <LayoutGrid size={18} color="#8bb9f5" />
          <p style={styles.muted}>Módulos disponíveis</p>
          <strong style={{ fontSize: 25 }}>04</strong>
        </div>
      </div>

      <div style={styles.panel}>
        <div style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 15
        }}>
          <div style={{ position: "relative", flex: "1 1 240px" }}>
            <Search
              size={15}
              style={{
                position: "absolute",
                left: 11,
                top: 12,
                color: "#8e849b"
              }}
            />

            <input
              style={{ ...styles.input, paddingLeft: 34 }}
              placeholder="Pesquisar por email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            style={{ ...styles.input, width: "auto", minWidth: 170 }}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">Todas as funções</option>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: 720
          }}>
            <thead>
              <tr>
                {[
                  "UTILIZADOR",
                  "FUNÇÃO",
                  "MÓDULOS",
                  "ESTADO",
                  "ÚLTIMO ACESSO",
                  "AÇÃO"
                ].map((heading) => (
                  <th key={heading} style={{
                    textAlign: "left",
                    color: "#968ba4",
                    fontSize: 10,
                    padding: 12,
                    borderBottom: "1px solid #30283b"
                  }}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: 20 }}>
                    A carregar utilizadores...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 20 }}>
                    Não foram encontrados utilizadores.
                  </td>
                </tr>
              ) : filtered.map((u) => (
                <tr key={u.id}>
                  <td style={{ padding: 12, fontSize: 12 }}>
                    <strong>{u.email || "Email indisponível"}</strong>
                    <div style={styles.muted}>
                      {u.id.slice(0, 8)}…
                    </div>
                  </td>

                  <td style={{ padding: 12 }}>
                    <span style={{
                      background: "#251c32",
                      color: "#cbb2f4",
                      borderRadius: 20,
                      padding: "5px 8px",
                      fontSize: 10
                    }}>
                      {ROLES.find((r) => r.value === u.role)?.label || "Sem função"}
                    </span>
                  </td>

                  <td style={{ padding: 12, fontSize: 12 }}>
                    {u.role === "super_admin"
                      ? "Todos"
                      : `${u.modules.length} atribuídos`}
                  </td>

                  <td style={{ padding: 12 }}>
                    {u.is_active ? "Ativo" : "Inativo"}
                  </td>

                  <td style={{ padding: 12, fontSize: 11 }}>
                    {u.last_sign_in_at
                      ? new Date(u.last_sign_in_at).toLocaleString("pt-PT")
                      : "Nunca"}
                  </td>

                  <td style={{ padding: 12 }}>
                    <button
                      style={styles.secondary}
                      onClick={() => setEditing({ ...u })}
                    >
                      Gerir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{
        ...styles.panel,
        marginTop: 14,
        display: "flex",
        gap: 10
      }}>
        <ShieldCheck size={20} color="#b794f6" />

        <div>
          <strong style={{ fontSize: 12 }}>
            Segurança administrativa
          </strong>

          <p style={styles.muted}>
            As operações administrativas são executadas no servidor.
            A chave service_role nunca deve ser colocada no frontend.
          </p>
        </div>
      </div>

      {editing && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={{
              display: "flex",
              justifyContent: "space-between"
            }}>
              <div>
                <div style={styles.eyebrow}>GESTÃO DE CONTA</div>
                <h3 style={{ margin: 0 }}>Editar utilizador</h3>
              </div>

              <button
                style={styles.secondary}
                onClick={() => setEditing(null)}
              >
                <X size={16} />
              </button>
            </div>

            <p style={styles.muted}>{editing.email}</p>

            <label style={styles.label}>Função</label>

            <select
              style={styles.input}
              value={editing.role || "collaborator"}
              onChange={(e) => setEditing({
                ...editing,
                role: e.target.value as Role
              })}
            >
              {ROLES.filter((r) =>
                isSuperAdmin || r.value !== "super_admin"
              ).map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>

            <label style={styles.label}>Estado da conta</label>

            <button
              style={styles.secondary}
              onClick={() => setEditing({
                ...editing,
                is_active: !editing.is_active
              })}
            >
              {editing.is_active
                ? <><Unlock size={15} /> Ativa — suspender</>
                : <><Lock size={15} /> Suspensa — ativar</>}
            </button>

            <label style={styles.label}>Permissões dos módulos</label>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))",
              gap: 9
            }}>
              {MODULES.map((m) => (
                <label key={m.value} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "#0d0b12",
                  border: "1px solid #393044",
                  padding: 10,
                  borderRadius: 8,
                  fontSize: 12
                }}>
                  <input
                    type="checkbox"
                    checked={editing.modules.includes(m.value as ModuleKey)}
                    onChange={() => toggleModule(m.value as ModuleKey)}
                  />
                  {m.label}
                </label>
              ))}
            </div>

            {editing.id === userId && (
              <p style={{ color: "#e5b86b", fontSize: 11 }}>
                <AlertTriangle size={13} />
                Estás a editar a tua própria conta.
              </p>
            )}

            <div style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 9,
              marginTop: 22
            }}>
              <button
                style={styles.secondary}
                onClick={() => setEditing(null)}
              >
                Cancelar
              </button>

              <button
                style={styles.button}
                disabled={busy}
                onClick={() => void saveUser()}
              >
                <Save size={15} />
                {busy ? "A guardar..." : "Guardar alterações"}
              </button>
            </div>
          </div>
        </div>
      )}

      {inviteOpen && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={{
              display: "flex",
              justifyContent: "space-between"
            }}>
              <div>
                <div style={styles.eyebrow}>NOVO ACESSO</div>
                <h3 style={{ margin: 0 }}>Convidar utilizador</h3>
              </div>

              <button
                style={styles.secondary}
                onClick={() => setInviteOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={(e) => void inviteUser(e)}>
              <label style={styles.label}>Endereço de email</label>

              <input
                style={styles.input}
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="nome@exemplo.com"
              />

              <label style={styles.label}>Função inicial</label>

              <select
                style={styles.input}
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as Role)}
              >
                {ROLES.filter((r) =>
                  isSuperAdmin || r.value !== "super_admin"
                ).map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>

              <label style={styles.label}>Módulos autorizados</label>

              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))",
                gap: 9
              }}>
                {MODULES.map((m) => (
                  <label key={m.value} style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: "#0d0b12",
                    border: "1px solid #393044",
                    padding: 10,
                    borderRadius: 8,
                    fontSize: 12
                  }}>
                    <input
                      type="checkbox"
                      checked={inviteModules.includes(m.value as ModuleKey)}
                      onChange={() => toggleInviteModule(m.value as ModuleKey)}
                    />
                    {m.label}
                  </label>
                ))}
              </div>

              <div style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 9,
                marginTop: 22
              }}>
                <button
                  type="button"
                  style={styles.secondary}
                  onClick={() => setInviteOpen(false)}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  style={styles.button}
                  disabled={busy}
                >
                  <UserPlus size={15} />
                  {busy ? "A enviar..." : "Enviar convite"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
