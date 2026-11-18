
import { useState } from "react";
import { supabase } from "./supabase";
import { ShieldCheck, Eye, EyeOff, Lock, CheckCircle2 } from "lucide-react";

export default function AcceptInvite() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    if (password.length < 8) {
      setMessage("A palavra-passe deve ter pelo menos 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("As palavras-passe não coincidem.");
      return;
    }

    setLoading(true);

    try {
      const { data: { session }, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError || !session) {
        setMessage(
          "O convite é inválido ou expirou. Solicita um novo convite ao administrador."
        );
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      setSuccess(true);
    } catch {
      setMessage("Ocorreu um erro. Tenta novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{
      minHeight: "100vh",
      background: "#09080d",
      display: "grid",
      placeItems: "center",
      padding: "24px",
      color: "#f5f2fa",
      fontFamily: "Arial, sans-serif",
    }}>
      <section style={{
        width: "100%",
        maxWidth: "440px",
        background: "#121019",
        border: "1px solid #30263e",
        borderRadius: "20px",
        padding: "38px",
        boxSizing: "border-box",
        boxShadow: "0 20px 70px #0008",
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "38px",
        }}>
          <div style={{
            width: "43px",
            height: "43px",
            borderRadius: "12px",
            background: "linear-gradient(135deg,#a875ff,#6535bd)",
            display: "grid",
            placeItems: "center",
            color: "#09080d",
            fontSize: "26px",
            fontWeight: 900,
          }}>N</div>
          <div>
            <div style={{
              fontSize: "21px",
              fontWeight: 800,
              letterSpacing: "2px",
            }}>NEGRONI<span style={{ color: "#a875ff" }}>.</span></div>
            <div style={{
              fontSize: "10px",
              letterSpacing: "3px",
              color: "#958ba5",
              marginTop: "4px",
            }}>PSP ENTERTAINMENT</div>
          </div>
        </div>

        {success ? (
          <div style={{ textAlign: "center" }}>
            <CheckCircle2 size={54} color="#8bdfb0" />
            <h1 style={{ fontSize: "25px" }}>Conta ativada!</h1>
            <p style={{ color: "#aaa1b5", lineHeight: 1.7 }}>
              A tua palavra-passe foi definida com sucesso.
              Já podes entrar no Negroni PSP.
            </p>
            <button
              onClick={() => window.location.href = "/"}
              style={buttonStyle}
            >
              Entrar no Negroni
            </button>
          </div>
        ) : (
          <>
            <div style={{
              color: "#a875ff",
              fontSize: "11px",
              letterSpacing: "2px",
              fontWeight: 700,
              marginBottom: "12px",
            }}>ATIVAÇÃO DE CONTA</div>

            <h1 style={{
              fontSize: "27px",
              margin: "0 0 12px",
            }}>Bem-vindo à Negroni.</h1>

            <p style={{
              color: "#a59caf",
              lineHeight: 1.7,
              fontSize: "14px",
              marginBottom: "30px",
            }}>
              Define a tua palavra-passe para ativar o acesso
              à plataforma PSP Entertainment.
            </p>

            <form onSubmit={handleSubmit}>
              <label style={labelStyle}>Nova palavra-passe</label>
              <div style={inputWrapperStyle}>
                <Lock size={17} color="#958ba5" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo de 8 caracteres"
                  required
                  minLength={8}
                  style={inputStyle}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={eyeStyle}
                  aria-label="Mostrar ou ocultar palavra-passe"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>

              <label style={labelStyle}>Confirmar palavra-passe</label>
              <div style={inputWrapperStyle}>
                <ShieldCheck size={17} color="#958ba5" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repete a palavra-passe"
                  required
                  style={inputStyle}
                  autoComplete="new-password"
                />
              </div>

              {message && (
                <div style={{
                  color: "#ff9292",
                  background: "#351b25",
                  border: "1px solid #703040",
                  padding: "12px",
                  borderRadius: "9px",
                  fontSize: "13px",
                  marginTop: "16px",
                }}>
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  ...buttonStyle,
                  opacity: loading ? 0.6 : 1,
                  cursor: loading ? "wait" : "pointer",
                }}
              >
                {loading ? "A ativar conta..." : "Ativar a minha conta"}
              </button>
            </form>

            <p style={{
              color: "#746b80",
              fontSize: "11px",
              textAlign: "center",
              marginTop: "25px",
            }}>
              Acesso protegido · PSP Entertainment
            </p>
          </>
        )}
      </section>
    </main>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "13px",
  color: "#c9c1d3",
  marginBottom: "9px",
  marginTop: "20px",
};

const inputWrapperStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  background: "#0b0a10",
  border: "1px solid #393044",
  borderRadius: "10px",
  padding: "0 13px",
  minHeight: "49px",
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  background: "transparent",
  border: "none",
  outline: "none",
  color: "#fff",
  fontSize: "14px",
};

const eyeStyle: React.CSSProperties = {
  border: "none",
  background: "transparent",
  color: "#a99eb7",
  cursor: "pointer",
  display: "flex",
  padding: "5px",
};

const buttonStyle: React.CSSProperties = {
  width: "100%",
  border: "none",
  borderRadius: "10px",
  padding: "15px",
  marginTop: "25px",
  background: "linear-gradient(100deg,#9b65ed,#7040c5)",
  color: "#fff",
  fontSize: "14px",
  fontWeight: 700,
  cursor: "pointer",
};
