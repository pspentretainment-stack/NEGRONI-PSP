
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import Login from "./Login";
import Calendar from "./Calendar";
import { supabase } from "./supabase";
import PSPManagement from "./PSPManagement";
import AcceptInvite from "./AcceptInvite";
import PSPBusiness from "./PSPBusiness";
import {
  LayoutDashboard,
  Ticket,
  Mic2,
  BriefcaseBusiness,
  ShieldCheck,
  Bell,
  Search,
  ChevronDown,
  Menu,
  X,
  ArrowUpRight,
  CalendarDays,
  Users,
  Activity,
  LogOut,
  Command
} from "lucide-react";
type Role =
  | "super_admin"
  | "admin"
  | "manager"
  | "artist"
  | "collaborator";

type ModuleKey = "passali" | "artists" | "business" | "management";

interface DashboardProps {
  user: User;
  role: Role;
  modules: ModuleKey[];
  onLogout: () => void;
}
type ModuleId =
  | "dashboard"
  | "passali"
  | "artists"
  | "business"
  | "management";

const navigation = [
  { id: "dashboard" as ModuleId, label: "Dashboard", icon: LayoutDashboard },
  { id: "passali" as ModuleId, label: "Passali Tickets", icon: Ticket },
  { id: "artists" as ModuleId, label: "Artist Portal", icon: Mic2 },
  { id: "business" as ModuleId, label: "PSP Business", icon: BriefcaseBusiness },
  { id: "management" as ModuleId, label: "PSP Management", icon: ShieldCheck }
];

const moduleContent: Record<ModuleId, { title: string; description: string }> = {
  dashboard: {
    title: "Visão geral",
    description: "Bem-vindo ao centro de gestão da PSP Entertainment."
  },
  passali: {
    title: "Passali Tickets",
    description: "Gestão centralizada da plataforma de bilhética."
  },
  artists: {
    title: "Artist Portal",
    description: "Gestão de artistas, agendas e compromissos."
  },
  business: {
    title: "PSP Business",
    description: "Operações, projetos, clientes e finanças da empresa."
  },
  management: {
    title: "PSP Management",
    description: "Administração global e controlo da PSP Entertainment."
  }
};

function Dashboard({ user, role, modules, onLogout }: DashboardProps) {
  const [activeModule, setActiveModule] = useState<ModuleId>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const visibleNavigation = navigation.filter(
  item => item.id === "dashboard" || modules.includes(item.id as ModuleKey)
);

  const current = moduleContent[activeModule];
  const hasAccess =
  activeModule === "dashboard" ||
  modules.includes(activeModule as ModuleKey);

  return (
    <div className="app-shell">
      {sidebarOpen && (
        <button
          className="mobile-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-label="Fechar menu"
        />
      )}

      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">N</div>
          <div>
            <div className="brand-name">NEGRONI<span>.</span></div>
            <div className="brand-caption">PSP ENTERTAINMENT</div>
          </div>
          <button
            className="mobile-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Fechar menu"
          >
            <X size={19} />
          </button>
        </div>

        <div className="workspace-label">WORKSPACE</div>

        <div className="workspace-card">
          <div className="workspace-icon">P</div>
          <div className="workspace-info">
            <strong>PSP Entertainment</strong>
            <span>Central de operações</span>
          </div>
          <ChevronDown size={15} />
        </div>

        <div className="nav-label">MENU PRINCIPAL</div>

        <nav className="main-navigation">
         {visibleNavigation.map((item) => {
            const Icon = item.icon;
            const active = activeModule === item.id;

            return (
              <button
                key={item.id}
                className={`nav-item ${active ? "active" : ""}`}
                onClick={() => {
                  setActiveModule(item.id);
                  setSidebarOpen(false);
                }}
              >
                <Icon size={18} strokeWidth={1.8} />
                <span>{item.label}</span>
                {active && <span className="active-indicator" />}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="system-status">
            <span className="status-dot" />
            <span>Sistema operacional</span>
          </div>

        <button className="nav-item secondary-item" onClick={onLogout}>
  <LogOut size={18} />
  <span>Terminar sessão</span>
</button>

          <div className="sidebar-profile">
            <div className="avatar">PS</div>
            <div className="profile-info">
              <strong>{user.email || "Utilizador"}</strong>
<span>{role.replace("_", " ")}</span><strong>{user.email || "Utilizador"}</strong>
<span>{role.replace("_", " ")}</span>
            </div>
            <ChevronDown size={15} />
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="mobile-menu"
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu size={21} />
            </button>
            <div className="breadcrumb">
              <span>Negroni PSP</span>
              <span className="breadcrumb-separator">/</span>
              <strong>{current.title}</strong>
            </div>
          </div>

          <div className="topbar-actions">
            <div className="search-box">
              <Search size={16} />
              <span>Pesquisar...</span>
              <kbd>⌘ K</kbd>
            </div>
            <button className="icon-button notification-button" aria-label="Notificações">
              <Bell size={19} />
              <span className="notification-dot" />
            </button>
            <div className="topbar-avatar">PS</div>
          </div>
        </header>

        <div className="page-content">
          <section className="welcome-section">
            <div>
              <div className="eyebrow">
                <span className="eyebrow-line" />
                PSP ENTERTAINMENT · MANAGEMENT SYSTEM
              </div>
              <h1>{current.title}<span>.</span></h1>
              <p>{current.description}</p>
            </div>
            <div className="date-display">
              <CalendarDays size={16} />
              <span>{new Intl.DateTimeFormat("pt-PT", {
                day: "numeric",
                month: "long",
                year: "numeric"
              }).format(new Date())}</span>
            </div>
          </section>

         {!hasAccess ? (
  <section
    style={{
      minHeight: "420px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      padding: "40px 20px",
      background: "#111016",
      border: "1px solid #33283d",
      borderRadius: "16px"
    }}
  >
    <div
      style={{
        width: "70px",
        height: "70px",
        borderRadius: "20px",
        background: "#351b25",
        color: "#ff8585",
        display: "grid",
        placeItems: "center",
        marginBottom: "24px"
      }}
    >
      <ShieldCheck size={34} />
    </div>

    <h2 style={{ color: "#ffffff", marginBottom: "12px" }}>
      Acesso restrito
    </h2>

    <p style={{
      color: "#a49cac",
      maxWidth: "430px",
      lineHeight: 1.7
    }}>
      Não tens acesso a esta página. A tua conta não tem
      autorização para utilizar este módulo.
      Contacta o administrador do Negroni PSP caso
      precises de acesso.
    </p>

    <button
      className="back-button"
      onClick={() => setActiveModule("dashboard")}
      style={{ marginTop: "20px" }}
    >
      Voltar ao Dashboard
    </button>
  </section>
) : activeModule === "dashboard" ? (
            <>
              <section className="hero-banner">
                <div className="hero-content">
                  <div className="hero-tag">
                    <Command size={13} />
                    CENTRAL MANAGEMENT
      </div>
        </div>

        <div className="hero-art">
                  <div className="orbit orbit-one" />
                  <div className="orbit orbit-two" />
                  <div className="orbit orbit-three" />
                  <div className="hero-core">
                    <span>N</span>
                  </div>
                  <div className="orbit-label orbit-label-one">MANAGEMENT</div>
                  <div className="orbit-label orbit-label-two">OPERATIONS</div>
                  <div className="orbit-label orbit-label-three">CREATIVE</div>
                </div>
                <div className="hero-watermark">N</div>
              </section>

              <section className="stats-grid">
                <div className="stat-card">
                  <div className="stat-top">
                    <span>Projetos ativos</span>
                    <span className="stat-icon purple"><BriefcaseBusiness size={18} /></span>
                  </div>
                  <div className="stat-value">04</div>
                  <div className="stat-note">Módulos da plataforma</div>
                </div>
                <div className="stat-card">
                  <div className="stat-top">
                    <span>Artistas geridos</span>
                    <span className="stat-icon gold"><Mic2 size={18} /></span>
                  </div>
                  <div className="stat-value">—</div>
                  <div className="stat-note">A aguardar integração</div>
                </div>
                <div className="stat-card">
                  <div className="stat-top">
                    <span>Eventos</span>
                    <span className="stat-icon blue"><CalendarDays size={18} /></span>
                  </div>
                  <div className="stat-value">—</div>
                  <div className="stat-note">A aguardar integração</div>
                </div>
                <div className="stat-card">
                  <div className="stat-top">
                    <span>Utilizadores</span>
                    <span className="stat-icon green"><Users size={18} /></span>
                  </div>
                  <div className="stat-value">—</div>
                  <div className="stat-note">A aguardar integração</div>
                </div>
              </section>

              <section className="section-heading">
                <div>
                  <h3>Os teus espaços de trabalho</h3>
                  <p>Acede diretamente aos módulos da plataforma.</p>
                </div>
                <span className="section-count">04 MÓDULOS</span>
              </section>

              <section className="modules-grid">
                <button className="module-card" onClick={() => setActiveModule("passali")}>
                  <div className="module-card-top">
                    <div className="module-icon passali-icon"><Ticket size={21} /></div>
                    <ArrowUpRight size={18} className="module-arrow" />
                  </div>
                  <div className="module-name">Passali Tickets</div>
                  <p>Eventos, bilhetes, vendas e organizadores.</p>
                  <div className="module-footer">
                    <span className="module-status"><i /> Módulo disponível</span>
                    <span>01</span>
                  </div>
                </button>

                <button className="module-card" onClick={() => setActiveModule("artists")}>
                  <div className="module-card-top">
                    <div className="module-icon artists-icon"><Mic2 size={21} /></div>
                    <ArrowUpRight size={18} className="module-arrow" />
                  </div>
                  <div className="module-name">Artist Portal</div>
                  <p>Artistas, agendas, atuações e compromissos.</p>
                  <div className="module-footer">
                    <span className="module-status"><i /> Módulo disponível</span>
                    <span>02</span>
                  </div>
                </button>

                <button className="module-card" onClick={() => setActiveModule("business")}>
                  <div className="module-card-top">
                    <div className="module-icon business-icon"><BriefcaseBusiness size={21} /></div>
                    <ArrowUpRight size={18} className="module-arrow" />
                  </div>
                  <div className="module-name">PSP Business</div>
                  <p>Projetos, tarefas, clientes e finanças.</p>
                  <div className="module-footer">
                    <span className="module-status"><i /> Módulo disponível</span>
                    <span>03</span>
                  </div>
                </button>

                <button className="module-card" onClick={() => setActiveModule("management")}>
                  <div className="module-card-top">
                    <div className="module-icon management-icon"><ShieldCheck size={21} /></div>
                    <ArrowUpRight size={18} className="module-arrow" />
                  </div>
                  <div className="module-name">PSP Management</div>
                  <p>Administração, acessos e controlo global.</p>
                  <div className="module-footer">
                    <span className="module-status"><i /> Área administrativa</span>
                    <span>04</span>
                  </div>
                </button>
              </section>

              <section className="bottom-grid">
                <div className="panel-card activity-panel">
                  <div className="panel-heading">
                    <div>
                      <h3>Atividade recente</h3>
                      <p>Acompanhamento das operações</p>
                    </div>
                    <Activity size={19} />
                  </div>
                  <div className="empty-state">
                    <div className="empty-icon"><Activity size={21} /></div>
                    <strong>Sem atividade registada</strong>
                    <span>As atividades aparecerão aqui quando os módulos forem integrados.</span>
                  </div>
                </div>

                <div className="panel-card quick-panel">
                  <div className="panel-heading">
                    <div>
                      <h3>Acesso rápido</h3>
                      <p>Ferramentas da plataforma</p>
                    </div>
                    <ArrowUpRight size={19} />
                  </div>
                  <button className="quick-link" onClick={() => setActiveModule("passali")}>
                    <span className="quick-link-icon"><Ticket size={17} /></span>
                    <span>Gestão de bilhética</span>
                    <ArrowUpRight size={15} />
                  </button>
                  <button className="quick-link" onClick={() => setActiveModule("artists")}>
                    <span className="quick-link-icon"><CalendarDays size={17} /></span>
                    <span>Agendas dos artistas</span>
                    <ArrowUpRight size={15} />
                  </button>
                  <button className="quick-link" onClick={() => setActiveModule("management")}>
                    <span className="quick-link-icon"><ShieldCheck size={17} /></span>
                    <span>Administração PSP</span>
                    <ArrowUpRight size={15} />
                  </button>
                </div>
              </section>
            </>
        ) : (activeModule as ModuleId) === "passali" ? (
  <section
    style={{
      width: "100%",
      minHeight: "750px",
      height: "calc(100vh - 160px)",
      borderRadius: "14px",
      overflow: "hidden",
      background: "#09080d",
      border: "1px solid #292431"
    }}
  >
    <iframe
     src="https://pspentretainment-stack.github.io/PASSALI-ADMIN/"
      title="Passali Tickets — Administração"
      style={{
        width: "100%",
        height: "100%",
        border: "none",
        display: "block"
      }}
      allow="clipboard-read; clipboard-write"
    />
  </section>
) : activeModule === "artists" ? (
  <Calendar user={user} role={role} />
) : activeModule === "management" ? (
  <PSPManagement userId={user.id} role={role} />
) : activeModule === "business" ? (
  <PSPBusiness userId={user.id} role={role} />
) : (
  <section className="module-placeholder">
            <div className="placeholder-icon">
  <Activity size={32} />
</div>
              <div className="eyebrow">NEGRONI PSP · MODULE {navigation.findIndex(item => item.id === activeModule)}</div>
              <h2>{current.title}</h2>
              <p>{current.description}</p>
              <span className="coming-soon">MÓDULO EM DESENVOLVIMENTO</span>
              <button className="back-button" onClick={() => setActiveModule("dashboard")}>
                Voltar ao dashboard
              </button>
            </section>
          )}

          <footer className="app-footer">
            <span>NEGRONI<span className="footer-dot">.</span> PSP ENTERTAINMENT</span>
            <span>Central Management System · 2026</span>
          </footer>
        </div>
      </main>
    </div>
  );
}


export default function App() {
  const isAcceptInvite =
  new URLSearchParams(window.location.search).get("accept-invite") === "1";
  const [auth, setAuth] = useState<{
    user: User;
    role: Role;
    modules: ModuleKey[];
  } | null>(null);

  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function restoreSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          if (mounted) setChecking(false);
          return;
        }

        const { data: roleData, error: roleError } = await supabase
          .from("negroni_user_roles")
          .select("role, is_active")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (roleError || !roleData || !roleData.is_active) {
          await supabase.auth.signOut();
          if (mounted) setChecking(false);
          return;
        }

        const validRoles: Role[] = [
          "super_admin",
          "admin",
          "manager",
          "artist",
          "collaborator"
        ];

        if (!validRoles.includes(roleData.role as Role)) {
          await supabase.auth.signOut();
          if (mounted) setChecking(false);
          return;
        }

        const role = roleData.role as Role;

        const { data: accessData, error: accessError } = await supabase
          .from("negroni_module_access")
          .select("module_key")
          .eq("user_id", session.user.id)
          .eq("is_active", true);

        if (accessError) {
          await supabase.auth.signOut();
          if (mounted) setChecking(false);
          return;
        }

        const allModules: ModuleKey[] = [
          "passali",
          "artists",
          "business",
          "management"
        ];

        const modules: ModuleKey[] =
          role === "super_admin"
            ? allModules
            : (accessData || []).map(
                (item: { module_key: string }) =>
                  item.module_key as ModuleKey
              );

        if (mounted) {
          setAuth({ user: session.user, role, modules });
        }
      } catch {
        if (mounted) setAuth(null);
      } finally {
        if (mounted) setChecking(false);
      }
    }

    restoreSession();

    const { data: { subscription } } =
      supabase.auth.onAuthStateChange((event, session) => {
        if (event === "SIGNED_OUT" || !session) {
          setAuth(null);
        }
      });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    setAuth(null);
  }
if (isAcceptInvite) {
  return <AcceptInvite />;
}
  if (checking) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#09080d",
        color: "#ffffff",
        display: "grid",
        placeItems: "center",
        fontFamily: "Arial, sans-serif"
      }}>
        A verificar acesso ao Negroni PSP...
      </div>
    );
  }

  if (!auth) {
    return (
      <Login
        onLogin={(user, role, modules) => {
          setAuth({ user, role, modules });
        }}
      />
    );
  }

  return (
    <Dashboard
      user={auth.user}
      role={auth.role}
      modules={auth.modules}
      onLogout={handleLogout}
    />
  );
}


