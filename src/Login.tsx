
import { useEffect, useState } from "react";
import type { FormEvent, CSSProperties } from "react";
import {
  LockKeyhole,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  KeyRound
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

type Role =
  | "super_admin"
  | "admin"
  | "manager"
  | "artist"
  | "collaborator";

type ModuleKey = "passali" | "artists" | "business" | "management";

interface LoginProps {
  onLogin: (
    user: User,
    role: Role,
    modules: ModuleKey[]
  ) => void;
}

type PageMode = "login" | "invite";

export default function Login({ onLogin }: LoginProps) {
  const [mode, setMode] = useState<PageMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [artistName, setArtistName] = useState("");
const [isArtistInvite, setIsArtistInvite] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingInvite, setCheckingInvite] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
async function checkArtistInvite(userId: string) {
  const { data, error } = await supabase
    .from("negroni_user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  setIsArtistInvite(data?.role === "artist");
}
  useEffect(() => {
    let mounted = true;

    async function checkInvitation() {
      try {
        const url = new URL(window.location.href);
        const hash = new URLSearchParams(
          url.hash.replace(/^#/, "")
        );

        const isInvite =
          url.searchParams.get("accept-invite") === "1" ||
          hash.get("type") === "invite" ||
          hash.get("type") === "recovery";

        // Se existir um código PKCE na URL, trocar por sessão.
        const code = url.searchParams.get("code");

        if (code) {
          const { error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            throw exchangeError;
          }
        }

        const { data, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!mounted) return;

      if (isInvite && data.session) {
  setMode("invite");
  setEmail(data.session.user.email || "");
        await checkArtistInvite(session.user.id);
  await checkArtistInvite(data.session.user.id);
}
        } else if (isInvite && !data.session) {
          setError(
            "O convite não foi validado ou já expirou. Solicita um novo convite ao administrador."
          );
        }
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Não foi possível validar o convite."
          );
        }
      } finally {
        if (mounted) {
          setCheckingInvite(false);
        }
      }
    }

    checkInvitation();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (
          session &&
          (event === "PASSWORD_RECOVERY" ||
            event === "SIGNED_IN")
        ) {
          const url = new URL(window.location.href);
          const hash = new URLSearchParams(
            url.hash.replace(/^#/, "")
          );

          if (
            url.searchParams.get("accept-invite") === "1" ||
            hash.get("type") === "invite" ||
            event === "PASSWORD_RECOVERY"
          ) {
            setMode("invite");
            setEmail(session.user.email || "");
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function completeLogin(user: User) {
    const { data: roleData, error: roleError } = await supabase
      .from("negroni_user_roles")
      .select("role, is_active")
      .eq("user_id", user.id)
      .maybeSingle();

    if (roleError) {
      throw new Error("Não foi possível verificar as permissões.");
    }

    if (!roleData || !roleData.is_active) {
      await supabase.auth.signOut();
      throw new Error("A tua conta não tem acesso ativo ao Negroni.");
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
      throw new Error("Função de utilizador inválida.");
    }

    const role = roleData.role as Role;

    const { data: accessData, error: accessError } = await supabase
      .from("negroni_module_access")
      .select("module_key")
      .eq("user_id", user.id)
      .eq("is_active", true);

    if (accessError) {
      throw new Error("Não foi possível carregar os acessos.");
    }

    const allModules: ModuleKey[] = [
      "passali",
      "artists",
      "business",
      "management"
    ];

    const modules =
      role === "super_admin"
        ? allModules
        : (accessData || []).map(
            (item: { module_key: string }) =>
              item.module_key as ModuleKey
          );

    onLogin(user, role, modules);
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const { data, error: authError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });

      if (authError || !data.user) {
        throw new Error("Email ou palavra-passe incorretos.");
      }

      await completeLogin(data.user);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocorreu um erro ao iniciar sessão."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSetPassword(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (password.length < 8) {
      setError("A palavra-passe deve ter pelo menos 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("As palavras-passe não coincidem.");
      return;
    }

    setLoading(true);

    try {
      const { data: sessionData } =
        await supabase.auth.getSession();

      if (!sessionData.session) {
        throw new Error(
          "A sessão do convite expirou. Solicita um novo convite."
        );
      }
const { data, error: updateError } =
  await supabase.auth.updateUser({
    password
  });
      const { data, error: updateError } =
        await supabase.auth.updateUser({
          password
        });

      if (updateError || !data.user) {
        throw new Error(
          updateError?.message ||
          "Não foi possível definir a palavra-passe."
        );
      }

      setSuccess("Palavra-passe criada com sucesso. A entrar no Negroni...");

      // Limpar os parâmetros do convite do endereço.
      window.history.replaceState(
        {},
        document.title,
        window.location.pathname
      );

      await completeLogin(data.user);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocorreu um erro ao criar a palavra-passe."
      );
    } finally {
      setLoading(false);
    }
  }

  if (checkingInvite) {
    return (
      <main style={styles.page}>
        <section style={styles.card}>
          <div style={styles.logo}>N<span>.</span></div>
          <div style={styles.brand}>NEGRONI</div>
          <p style={styles.description}>
            A verificar o teu convite...
          </p>
        </section>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <div style={styles.logo}>N<span>.</span></div>

        <div style={styles.brand}>NEGRONI</div>
        <div style={styles.subtitle}>PSP ENTERTAINMENT</div>

        <div style={styles.icon}>
          {mode === "invite"
            ? <KeyRound size={25} />
            : <ShieldCheck size={25} />}
        </div>

        <h1 style={styles.heading}>
          {mode === "invite"
            ? "Criar palavra-passe"
            : "Bem-vindo de volta"}
        </h1>

        <p style={styles.description}>
          {mode === "invite"
            ? "Define a tua palavra-passe para ativar o acesso ao Negroni."
            : "Inicia sessão para aceder à central de gestão."}
        </p>

        {mode === "invite" ? (
          <form onSubmit={handleSetPassword} style={styles.form}>
            <label style={styles.label}>Email do convite</label>

            <div style={styles.inputWrapper}>
              <Mail size={18} style={styles.inputIcon} />
              <input
                type="email"
                value={email}
                readOnly
                style={styles.input}
              />
            </div>
{isArtistInvite && (
  <>
    <label style={styles.label}>
      Nome artístico
    </label>

    <div style={styles.inputWrapper}>
      <input
        type="text"
        placeholder="Introduz o teu nome artístico"
        value={artistName}
        onChange={event => setArtistName(event.target.value)}
        required
        minLength={2}
        maxLength={60}
        autoComplete="nickname"
        style={styles.input}
      />
    </div>
  </>
)}
            <label style={styles.label}>Nova palavra-passe</label>

            <div style={styles.inputWrapper}>
              <LockKeyhole size={18} style={styles.inputIcon} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Mínimo de 8 caracteres"
                value={password}
                onChange={event => setPassword(event.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                style={styles.input}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
                aria-label="Mostrar ou ocultar palavra-passe"
              >
                {showPassword
                  ? <EyeOff size={18} />
                  : <Eye size={18} />}
              </button>
            </div>

            <label style={styles.label}>
              Confirmar palavra-passe
            </label>

            <div style={styles.inputWrapper}>
              <LockKeyhole size={18} style={styles.inputIcon} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Repete a palavra-passe"
                value={confirmPassword}
                onChange={event =>
                  setConfirmPassword(event.target.value)
                }
                required
                minLength={8}
                autoComplete="new-password"
                style={styles.input}
              />
            </div>

            {error && <div style={styles.error}>{error}</div>}
            {success && <div style={styles.success}>{success}</div>}

            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.submit,
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading
                ? "A criar conta..."
                : "Criar palavra-passe e entrar"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin} style={styles.form}>
            <label style={styles.label}>Email profissional</label>

            <div style={styles.inputWrapper}>
              <Mail size={18} style={styles.inputIcon} />
              <input
                type="email"
                placeholder="nome@pspentertainment.com"
                value={email}
                onChange={event => setEmail(event.target.value)}
                required
                autoComplete="username"
                style={styles.input}
              />
            </div>

            <label style={styles.label}>Palavra-passe</label>

            <div style={styles.inputWrapper}>
              <LockKeyhole size={18} style={styles.inputIcon} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Introduz a tua palavra-passe"
                value={password}
                onChange={event => setPassword(event.target.value)}
                required
                autoComplete="current-password"
                style={styles.input}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
                aria-label="Mostrar ou ocultar palavra-passe"
              >
                {showPassword
                  ? <EyeOff size={18} />
                  : <Eye size={18} />}
              </button>
            </div>

            {error && <div style={styles.error}>{error}</div>}

            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.submit,
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? "A verificar acesso..." : "Iniciar sessão"}
            </button>
          </form>
        )}

        <div style={styles.security}>
          <LockKeyhole size={13} />
          Acesso privado e protegido
        </div>
      </section>

      <footer style={styles.footer}>
        NEGRONI · PSP ENTERTAINMENT · 2026
      </footer>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#09080d",
    color: "#ffffff",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "30px 20px",
    fontFamily: "Inter, Arial, sans-serif"
  },
  card: {
    width: "100%",
    maxWidth: "420px",
    background: "#111016",
    border: "1px solid #292431",
    borderRadius: "18px",
    padding: "42px 36px",
    textAlign: "center",
    boxSizing: "border-box",
    boxShadow: "0 25px 80px rgba(0,0,0,0.35)"
  },
  logo: {
    fontSize: "38px",
    fontWeight: 800,
    color: "#ffffff"
  },
  brand: {
    fontSize: "15px",
    fontWeight: 800,
    letterSpacing: "4px",
    marginTop: "5px"
  },
  subtitle: {
    color: "#8f899b",
    fontSize: "9px",
    letterSpacing: "3px",
    marginTop: "5px"
  },
  icon: {
    width: "52px",
    height: "52px",
    borderRadius: "15px",
    background: "#21172e",
    color: "#b98aff",
    display: "grid",
    placeItems: "center",
    margin: "35px auto 20px"
  },
  heading: {
    fontSize: "24px",
    margin: "0 0 9px",
    fontWeight: 700
  },
  description: {
    color: "#9993a3",
    fontSize: "13px",
    marginBottom: "30px"
  },
  form: {
    display: "flex",
    flexDirection: "column",
    textAlign: "left",
    gap: "10px"
  },
  label: {
    color: "#d6d1df",
    fontSize: "12px",
    fontWeight: 600,
    marginTop: "8px"
  },
  inputWrapper: {
    minHeight: "49px",
    display: "flex",
    alignItems: "center",
    border: "1px solid #37313f",
    borderRadius: "9px",
    background: "#0c0b11",
    padding: "0 13px",
    gap: "10px"
  },
  inputIcon: {
    color: "#8c829b",
    flexShrink: 0
  },
  input: {
    flex: 1,
    minWidth: 0,
    background: "transparent",
    border: "none",
    outline: "none",
    color: "#ffffff",
    fontSize: "13px"
  },
  eyeButton: {
    border: "none",
    background: "transparent",
    color: "#9993a3",
    cursor: "pointer",
    display: "flex",
    padding: "4px"
  },
  error: {
    color: "#ff8585",
    background: "#35191e",
    border: "1px solid #71323b",
    borderRadius: "8px",
    padding: "11px",
    fontSize: "12px",
    lineHeight: 1.5
  },
  success: {
    color: "#7de5b0",
    background: "#102c20",
    border: "1px solid #245d40",
    borderRadius: "8px",
    padding: "11px",
    fontSize: "12px",
    lineHeight: 1.5
  },
  submit: {
    minHeight: "49px",
    border: "none",
    borderRadius: "9px",
    background: "linear-gradient(100deg, #7542b8, #9b61d7)",
    color: "#ffffff",
    fontWeight: 700,
    fontSize: "13px",
    cursor: "pointer",
    marginTop: "13px"
  },
  security: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "7px",
    color: "#777181",
    fontSize: "11px",
    marginTop: "27px"
  },
  footer: {
    color: "#625c6c",
    fontSize: "9px",
    letterSpacing: "2px",
    marginTop: "30px",
    textAlign: "center"
  }
};

