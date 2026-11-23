"use client";

import { FormEvent, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";

export function AuthScreen() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const supabase = getSupabaseClient();
    if (!supabase) return;

    setBusy(true);
    setMessage("");
    const result = mode === "login"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });

    setBusy(false);
    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    setMessage(mode === "signup"
      ? "Revisa tu correo: Supabase puede pedirte confirmar tu cuenta antes de entrar."
      : "¡Listo! Entrando a tu espacio de práctica...");
  }

  return <main className="auth-page"><section className="auth-card"><div className="brand auth-brand"><span className="brand-mark">✦</span><span>práctica<span>IA</span></span></div><p className="eyebrow">TU ESPACIO DE PRÁCTICA</p><h1>{mode === "login" ? "Qué bueno verte" : "Crea tu espacio"}</h1><p className="auth-intro">Guarda tu práctica diaria y vuelve a ella cuando quieras.</p><div className="auth-tabs"><button className={mode === "login" ? "selected" : ""} onClick={() => setMode("login")}>Entrar</button><button className={mode === "signup" ? "selected" : ""} onClick={() => setMode("signup")}>Crear cuenta</button></div><form onSubmit={submit}><label>Correo electrónico</label><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tu@correo.com" required /><label>Contraseña</label><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo 6 caracteres" minLength={6} required /><button className="primary" type="submit" disabled={busy}>{busy ? "Un momento..." : mode === "login" ? "Iniciar sesión" : "Crear mi cuenta"}<b>→</b></button></form>{message && <p className="auth-message">{message}</p>}</section></main>;
}

export function SupabaseSetupScreen() {
  return <main className="auth-page"><section className="auth-card setup-card"><div className="brand auth-brand"><span className="brand-mark">✦</span><span>práctica<span>IA</span></span></div><p className="eyebrow">CONEXIÓN PENDIENTE</p><h1>Conecta tu proyecto</h1><p className="auth-intro">Abre el archivo <code>.env</code> de esta app, pega la URL y la clave pública de tu proyecto Supabase, y reinicia la app.</p><div className="setup-code">NEXT_PUBLIC_SUPABASE_URL=<br />NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=</div></section></main>;
}
