"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { AuthScreen, SupabaseSetupScreen } from "./auth-screen";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

type Role = "alumno" | "facilitador";
type View = "hoy" | "portafolio" | "progreso" | "cohortes" | "membresia";

type Practice = {
  id?: string;
  date: string;
  practiceDate?: string;
  task: string;
  note: string;
  evidence: string;
  final?: boolean;
};

type Student = {
  name: string;
  initials: string;
  cohort: string;
  activeDays: number;
  last: string;
  completion: number;
  membership: boolean;
  status: string;
  finalSubmission: boolean;
};

const students: Student[] = [
  { name: "Valentina Rojas", initials: "VR", cohort: "Impulso IA · Mayo", activeDays: 5, last: "Hoy", completion: 88, membership: true, status: "Activa", finalSubmission: false },
  { name: "Mateo Cárdenas", initials: "MC", cohort: "Impulso IA · Mayo", activeDays: 4, last: "Ayer", completion: 75, membership: true, status: "Activa", finalSubmission: false },
  { name: "Laura Restrepo", initials: "LR", cohort: "Impulso IA · Mayo", activeDays: 3, last: "Hace 2 días", completion: 63, membership: true, status: "Activa", finalSubmission: false },
  { name: "Santiago Mejía", initials: "SM", cohort: "Impulso IA · Mayo", activeDays: 5, last: "Hoy", completion: 100, membership: false, status: "Cohorte", finalSubmission: true },
  { name: "Camila Torres", initials: "CT", cohort: "Impulso IA · Mayo", activeDays: 2, last: "Hace 3 días", completion: 50, membership: true, status: "Activa", finalSubmission: false },
  { name: "Juan Pablo Ruiz", initials: "JR", cohort: "Impulso IA · Mayo", activeDays: 1, last: "Hace 5 días", completion: 38, membership: false, status: "En riesgo", finalSubmission: false },
  { name: "Mariana López", initials: "ML", cohort: "Impulso IA · Mayo", activeDays: 4, last: "Hoy", completion: 75, membership: true, status: "Activa", finalSubmission: true },
  { name: "Andrés Ospina", initials: "AO", cohort: "Impulso IA · Mayo", activeDays: 0, last: "Hace 8 días", completion: 25, membership: false, status: "En riesgo", finalSubmission: false },
  { name: "Sara González", initials: "SG", cohort: "Laboratorio IA · Marzo", activeDays: 4, last: "Hoy", completion: 92, membership: true, status: "Activa", finalSubmission: true },
  { name: "Daniela Pardo", initials: "DP", cohort: "Laboratorio IA · Marzo", activeDays: 3, last: "Ayer", completion: 83, membership: true, status: "Activa", finalSubmission: true },
  { name: "Nicolás Vélez", initials: "NV", cohort: "Laboratorio IA · Marzo", activeDays: 2, last: "Hace 4 días", completion: 71, membership: false, status: "Terminó", finalSubmission: false },
  { name: "Juliana Acosta", initials: "JA", cohort: "Laboratorio IA · Marzo", activeDays: 0, last: "Hace 24 días", completion: 42, membership: false, status: "Abandonó", finalSubmission: false },
  { name: "Felipe Buitrago", initials: "FB", cohort: "Laboratorio IA · Marzo", activeDays: 0, last: "Hace 19 días", completion: 54, membership: false, status: "Abandonó", finalSubmission: false },
  { name: "Paula Sandoval", initials: "PS", cohort: "Laboratorio IA · Marzo", activeDays: 4, last: "Hoy", completion: 100, membership: true, status: "Activa", finalSubmission: true },
  { name: "Carlos Giraldo", initials: "CG", cohort: "Laboratorio IA · Marzo", activeDays: 1, last: "Hace 6 días", completion: 67, membership: false, status: "Terminó", finalSubmission: true },
];

type PracticeRow = {
  id: string;
  task: string;
  note: string;
  evidence: string | null;
  is_final_delivery: boolean;
  practice_date: string;
};

function formatPractice(row: PracticeRow): Practice {
  const date = new Date(`${row.practice_date}T12:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "short" });
  return { id: row.id, date, practiceDate: row.practice_date, task: row.task, note: row.note, evidence: row.evidence || "Sin evidencia añadida", final: row.is_final_delivery };
}

function Avatar({ initials, warm = false }: { initials: string; warm?: boolean }) {
  return <span className={`avatar ${warm ? "warm" : ""}`}>{initials}</span>;
}

function Stat({ label, value, detail, tone = "" }: { label: string; value: string | number; detail: string; tone?: string }) {
  return <article className={`stat-card ${tone}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>;
}

export default function Home() {
  const [role, setRole] = useState<Role>("alumno");
  const [view, setView] = useState<View>("hoy");
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [practices, setPractices] = useState<Practice[]>([]);
  const [dataMessage, setDataMessage] = useState("");
  const [task, setTask] = useState("Redactar un informe con IA");
  const [note, setNote] = useState("");
  const [evidence, setEvidence] = useState("");
  const [isFinalDelivery, setIsFinalDelivery] = useState(false);
  const [saved, setSaved] = useState(false);
  const [cohort, setCohort] = useState("Impulso IA · Mayo");
  const [thresholds, setThresholds] = useState<Record<string, number>>({ "Impulso IA · Mayo": 70, "Laboratorio IA · Marzo": 70 });
  const [editingRule, setEditingRule] = useState(false);

  const currentCohort = students.filter((student) => student.cohort === cohort);
  const activeThisWeek = currentCohort.filter((student) => student.activeDays > 0).length;
  const atRisk = currentCohort.filter((student) => student.activeDays <= 1 && student.status !== "Abandonó");
  const currentThreshold = thresholds[cohort];
  const cohortDone = currentCohort.filter((student) => student.completion >= currentThreshold && student.finalSubmission && student.status !== "Abandonó").length;
  const isStudent = role === "alumno";

  const weekProgress = useMemo(() => {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      const key = date.toISOString().slice(0, 10);
      return practices.some((practice) => practice.practiceDate === key);
    });
  }, [practices]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setAuthReady(true);
      return;
    }

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setAuthReady(true);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthReady(true);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setPractices([]);
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) return;
    supabase.from("practices").select("id, task, note, evidence, is_final_delivery, practice_date").order("practice_date", { ascending: false }).then(({ data, error }) => {
      if (error) setDataMessage("No pudimos cargar tus prácticas. Revisa la conexión y las reglas de Supabase.");
      else setPractices((data ?? []).map(formatPractice));
    });
  }, [user]);

  function savePractice(event: FormEvent) {
    event.preventDefault();
    if (!task.trim() || !note.trim()) return;
    const supabase = getSupabaseClient();
    if (!supabase || !user) return;

    supabase.from("practices").insert({ user_id: user.id, task: task.trim(), note: note.trim(), evidence: evidence.trim() || null, is_final_delivery: isFinalDelivery }).select("id, task, note, evidence, is_final_delivery, practice_date").single().then(({ data, error }) => {
      if (error) {
        setDataMessage("No pudimos guardar la práctica. Revisa la conexión con Supabase.");
        return;
      }
      setPractices((items) => [formatPractice(data), ...items]);
      setNote("");
      setEvidence("");
      setIsFinalDelivery(false);
      setSaved(true);
      setDataMessage("Tu práctica quedó guardada de forma segura.");
    });
  }

  async function signOut() {
    const supabase = getSupabaseClient();
    if (supabase) await supabase.auth.signOut();
  }

  function switchRole(next: Role) {
    setRole(next);
    setView(next === "alumno" ? "hoy" : "cohortes");
  }

  if (!isSupabaseConfigured) return <SupabaseSetupScreen />;
  if (!authReady) return <main className="auth-page"><p className="loading-message">Abriendo tu espacio...</p></main>;
  if (!user) return <AuthScreen />;

  return (
    <main>
      <header className="topbar">
        <div className="brand"><span className="brand-mark">✦</span><span>práctica<span>IA</span></span></div>
        <div className="role-switch" aria-label="Cambiar vista">
          <button className={isStudent ? "selected" : ""} onClick={() => switchRole("alumno")}>Alumno</button>
          <button className={!isStudent ? "selected" : ""} onClick={() => switchRole("facilitador")}>Facilitador</button>
        </div>
        <button className="logout" onClick={signOut}>Cerrar sesión</button>
        <Avatar initials={user.email?.slice(0, 2).toUpperCase() || "IA"} warm />
      </header>

      {isStudent ? (
        <StudentArea view={view} setView={setView} practices={practices} task={task} setTask={setTask} note={note} setNote={setNote} evidence={evidence} setEvidence={setEvidence} isFinalDelivery={isFinalDelivery} setIsFinalDelivery={setIsFinalDelivery} saved={saved} savePractice={savePractice} weekProgress={weekProgress} dataMessage={dataMessage} />
      ) : (
        <>
          <RuleEditor cohort={cohort} threshold={currentThreshold} completed={cohortDone} total={currentCohort.length} open={editingRule} setOpen={setEditingRule} setThreshold={(value) => setThresholds((items) => ({ ...items, [cohort]: value }))} />
          <FacilitatorArea view={view} setView={setView} cohort={cohort} setCohort={setCohort} students={currentCohort} activeThisWeek={activeThisWeek} atRisk={atRisk} cohortDone={cohortDone} threshold={currentThreshold} setThreshold={(value) => setThresholds((items) => ({ ...items, [cohort]: value }))} />
        </>
      )}
    </main>
  );
}

function RuleEditor({ cohort, threshold, completed, total, open, setOpen, setThreshold }: { cohort: string; threshold: number; completed: number; total: number; open: boolean; setOpen: (value: boolean) => void; setThreshold: (value: number) => void }) {
  return <div className="rule-editor-wrap"><button className="rule-trigger" onClick={() => setOpen(!open)}>⚙ Regla de finalización</button>{open && <section className="rule-editor"><div><p className="eyebrow">REGLA PARA {cohort.toUpperCase()}</p><strong>{Math.round(completed / total * 100)}% finaliza</strong><p>Incluye práctica mínima y entrega final.</p></div><label>Práctica mínima <input aria-label="Porcentaje mínimo de práctica" type="number" min="1" max="100" value={threshold} onChange={(event) => setThreshold(Math.min(100, Math.max(1, Number(event.target.value) || 1)))} />%</label></section>}</div>;
}

function StudentArea({ view, setView, practices, task, setTask, note, setNote, evidence, setEvidence, isFinalDelivery, setIsFinalDelivery, saved, savePractice, weekProgress, dataMessage }: { view: View; setView: (view: View) => void; practices: Practice[]; task: string; setTask: (value: string) => void; note: string; setNote: (value: string) => void; evidence: string; setEvidence: (value: string) => void; isFinalDelivery: boolean; setIsFinalDelivery: (value: boolean) => void; saved: boolean; savePractice: (event: FormEvent) => void; weekProgress: boolean[]; dataMessage: string }) {
  const week = ["L", "M", "M", "J", "V", "S", "D"];
  return <div className="app-shell student-shell">
    <aside className="sidebar">
      <p className="sidebar-label">TU ESPACIO</p>
      <button className={view === "hoy" ? "nav-active" : ""} onClick={() => setView("hoy")}>☼ &nbsp; Hoy</button>
      <button className={view === "portafolio" ? "nav-active" : ""} onClick={() => setView("portafolio")}>▣ &nbsp; Mi portafolio</button>
      <button className={view === "progreso" ? "nav-active" : ""} onClick={() => setView("progreso")}>↗ &nbsp; Mi progreso</button>
      <div className="membership-card"><span>MI RUTA</span><strong>Impulso IA · Mayo</strong><small>Semana 3 de 6</small><div className="mini-progress"><i /></div><a>Ver mi cohorte →</a></div>
    </aside>
    <section className="content">
      {view === "hoy" && <>
        <div className="welcome"><div><p className="eyebrow">MARTES, 18 DE NOVIEMBRE</p><h1>Hola, Valentina <span>✦</span></h1><p>Una práctica pequeña hoy también cuenta.</p></div><div className="streak"><span>🔥</span><strong>12</strong><small>días seguidos</small></div></div>
        <section className="practice-card">
          <div className="card-heading"><div><p className="eyebrow">PRÁCTICA DE HOY</p><h2>¿Qué vas a resolver con IA?</h2><p>Elige una tarea real de tu trabajo. No hace falta que sea perfecta.</p></div><span className="sun-icon">☼</span></div>
          <form onSubmit={savePractice}>
            <label>Tu tarea <span>obligatorio</span></label>
            <input value={task} onChange={(event) => setTask(event.target.value)} placeholder="Ej: preparar una propuesta para un cliente" />
            <label>¿Qué hiciste? <span>obligatorio</span></label>
            <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Cuéntalo con tus palabras: qué probaste, cómo usaste la IA..." rows={4} />
            <label>Evidencia <em>opcional</em></label>
            <div className="evidence-row"><input value={evidence} onChange={(event) => setEvidence(event.target.value)} placeholder="Pega un enlace o escribe qué entregaste" /><span>↗</span></div>
            <label className="final-toggle"><input type="checkbox" checked={isFinalDelivery} onChange={(event) => setIsFinalDelivery(event.target.checked)} /> Esta es mi entrega final de la cohorte</label>
            <button className="primary" type="submit">Guardar mi práctica <b>→</b></button>
            {saved && <p className="saved">¡Práctica guardada! Ya hace parte de tu portafolio.</p>}
            {dataMessage && <p className="data-message">{dataMessage}</p>}
          </form>
        </section>
        <section className="week-card"><div><p className="eyebrow">TU SEMANA</p><h2>Vas 4 de 5 días hábiles</h2></div><div className="week-days">{week.map((day, index) => <div key={day + index}><span className={weekProgress[index] ? "done" : ""}>{weekProgress[index] ? "✓" : ""}</span><small>{day}</small></div>)}</div><p>Te falta una práctica para completar tu meta semanal.</p></section>
      </>}
      {view === "portafolio" && <Portfolio practices={practices} />}
      {view === "progreso" && <Progress weekProgress={weekProgress} />}
    </section>
    <StudentMobileNav view={view} setView={setView} />
  </div>;
}

function Portfolio({ practices }: { practices: Practice[] }) {
  return <><div className="page-title"><p className="eyebrow">TU EVIDENCIA</p><h1>Mi portafolio</h1><p>Cada práctica deja una huella de lo que sabes hacer.</p></div><div className="portfolio-summary"><Stat label="PRÁCTICAS" value={practices.length + 24} detail="en los últimos 30 días" /><Stat label="EVIDENCIAS" value={practices.length + 18} detail="piezas guardadas" /><Stat label="RACHA MAYOR" value="12 días" detail="tu mejor momento" /></div><div className="practice-list">{practices.map((practice, index) => <article key={index} className="portfolio-item"><div className="date-chip">{practice.date}</div><div><h3>{practice.task} {practice.final && <small className="final-badge">Entrega final</small>}</h3><p>{practice.note}</p><span className="evidence-link">↗ {practice.evidence}</span></div><button aria-label="Más opciones">•••</button></article>)}</div></>;
}

function Progress({ weekProgress }: { weekProgress: boolean[] }) {
  return <><div className="page-title"><p className="eyebrow">TU HÁBITO</p><h1>Mi progreso</h1><p>Estás construyendo una práctica que se nota en tu trabajo.</p></div><div className="progress-hero"><span>🔥</span><div><strong>12 días de racha</strong><p>Tu mejor racha hasta ahora. ¡Sigue así!</p></div></div><section className="progress-grid"><article><p className="eyebrow">ESTA SEMANA</p><h2>4 de 5 días</h2><div className="big-week">{weekProgress.map((done, index) => <i className={done ? "done" : ""} key={index}>{done ? "✓" : ""}</i>)}</div></article><article><p className="eyebrow">EN TU COHORTE</p><h2>75% completado</h2><div className="large-progress"><i /></div><p>Necesitas 70% y una entrega final.</p></article></section></>;
}

function StudentMobileNav({ view, setView }: { view: View; setView: (view: View) => void }) {
  return <nav className="mobile-nav"><button className={view === "hoy" ? "active" : ""} onClick={() => setView("hoy")}><b>☼</b>Hoy</button><button className={view === "portafolio" ? "active" : ""} onClick={() => setView("portafolio")}><b>▣</b>Portafolio</button><button className={view === "progreso" ? "active" : ""} onClick={() => setView("progreso")}><b>↗</b>Progreso</button></nav>;
}

function FacilitatorArea({ view, setView, cohort, setCohort, students, activeThisWeek, atRisk, cohortDone, threshold, setThreshold }: { view: View; setView: (view: View) => void; cohort: string; setCohort: (cohort: string) => void; students: Student[]; activeThisWeek: number; atRisk: Student[]; cohortDone: number; threshold: number; setThreshold: (value: number) => void }) {
  return <div className="app-shell facilitator-shell"><aside className="sidebar facilitator-side"><p className="sidebar-label">FACILITADOR</p><button className={view === "cohortes" ? "nav-active" : ""} onClick={() => setView("cohortes")}>▦ &nbsp; Cohortes</button><button className={view === "membresia" ? "nav-active" : ""} onClick={() => setView("membresia")}>✦ &nbsp; Membresía</button><div className="facilitator-note"><span>✦</span><strong>Tu escuela crece con la práctica.</strong><p>Revisa dónde tu acompañamiento puede hacer la diferencia.</p></div></aside><section className="content facilitator-content">{view === "cohortes" ? <Cohorts cohort={cohort} setCohort={setCohort} students={students} activeThisWeek={activeThisWeek} atRisk={atRisk} cohortDone={cohortDone} threshold={threshold} setThreshold={setThreshold} /> : <Membership />}</section><nav className="mobile-nav facilitator-mobile"><button className={view === "cohortes" ? "active" : ""} onClick={() => setView("cohortes")}><b>▦</b>Cohortes</button><button className={view === "membresia" ? "active" : ""} onClick={() => setView("membresia")}><b>✦</b>Membresía</button></nav></div>;
}

function Cohorts({ cohort, setCohort, students, activeThisWeek, atRisk, cohortDone, threshold, setThreshold }: { cohort: string; setCohort: (cohort: string) => void; students: Student[]; activeThisWeek: number; atRisk: Student[]; cohortDone: number; threshold: number; setThreshold: (value: number) => void }) {
  const isCurrent = cohort.includes("Mayo");
  return <><div className="dashboard-head"><div><p className="eyebrow">PANEL DE FACILITACIÓN</p><h1>Cohortes</h1><p>Así va la práctica de tu comunidad.</p></div><button className="outline-button">+ Crear cohorte</button></div><div className="cohort-tabs"><button className={isCurrent ? "current" : ""} onClick={() => setCohort("Impulso IA · Mayo")}>Impulso IA · Mayo <span>En curso</span></button><button className={!isCurrent ? "current" : ""} onClick={() => setCohort("Laboratorio IA · Marzo")}>Laboratorio IA · Marzo <span>Terminada</span></button></div><section className="cohort-hero"><div><span className="cohort-symbol">✦</span><p className="eyebrow">{isCurrent ? "SEMANA 3 DE 6" : "COHORTE FINALIZADA"}</p><h2>{cohort}</h2><p>{isCurrent ? "8 personas · 3 también en membresía" : "7 personas · 4 continúan en membresía"}</p></div><div className="threshold"><span>REGLA DE FINALIZACIÓN</span><strong>70%</strong><p>de días hábiles + entrega final</p><button>Configurar</button></div></section><div className="facilitator-stats"><Stat label="PRACTICARON ESTA SEMANA" value={`${activeThisWeek}/${students.length}`} detail={`${Math.round(activeThisWeek / students.length * 100)}% de la cohorte`} tone="mint" /><Stat label="DÍAS ACTIVOS" value={students.reduce((total, student) => total + student.activeDays, 0)} detail="acumulados esta semana" tone="yellow" /><Stat label="RUMBO A FINALIZAR" value={`${cohortDone}/${students.length}`} detail="cumplen el mínimo del 70%" tone="lilac" /></div><section className="people-section"><div className="section-title"><div><p className="eyebrow">ACTIVIDAD DE LA COHORTE</p><h2>Personas y práctica</h2></div><span className="filter">Todas las personas⌄</span></div><div className="people-table"><div className="table-head"><span>PERSONA</span><span>ESTA SEMANA</span><span>AVANCE</span><span>ÚLTIMA PRÁCTICA</span></div>{students.map((student) => <div className="person-row" key={student.name}><div className="person"><Avatar initials={student.initials} /><div><strong>{student.name}</strong><small className={student.status === "En riesgo" || student.status === "Abandonó" ? "risk" : ""}>{student.status}</small></div></div><span>{student.activeDays} {student.activeDays === 1 ? "día" : "días"}</span><div className="table-progress"><i style={{ width: `${student.completion}%` }} /><small>{student.completion}%</small></div><span className={student.last.includes("Hace") ? "last-risk" : ""}>{student.last}</span></div>)}</div></section>{atRisk.length > 0 && <section className="attention"><div><span>⚑</span><div><p className="eyebrow">ACOMPAÑAMIENTO OPORTUNO</p><h2>{atRisk.length} personas necesitan un empujón</h2><p>Llevan varios días sin practicar. Un mensaje breve puede ayudarles a volver.</p></div></div><button>Ver personas</button></section>}</>;
}

function Membership() {
  const members = students.filter((student) => student.membership);
  return <><div className="dashboard-head"><div><p className="eyebrow">COMUNIDAD CONTINUA</p><h1>Membresía</h1><p>La práctica que sigue después de la cohorte.</p></div><button className="outline-button">Ver historial</button></div><section className="membership-hero"><div><span>✦</span><div><p className="eyebrow">MEMBRESÍA PRÁCTICA IA</p><h2>Una comunidad que sigue haciendo</h2><p>Personas que eligen mantener el hábito de usar IA en su trabajo.</p></div></div><strong>9 <small>miembros activos</small></strong></section><div className="facilitator-stats membership-stats"><Stat label="MIEMBROS ACTIVOS" value="9" detail="+2 frente al mes anterior" tone="mint" /><Stat label="PRÁCTICAS ESTE MES" value="47" detail="5,2 por persona activa" tone="yellow" /><Stat label="DESERCIÓN MENSUAL" value="8%" detail="1 persona dejó de participar" tone="lilac" /></div><section className="people-section"><div className="section-title"><div><p className="eyebrow">MIEMBROS ACTIVOS</p><h2>Cómo va la comunidad</h2></div><span className="filter">Este mes⌄</span></div><div className="member-cards">{members.map((student) => <article key={student.name}><div className="person"><Avatar initials={student.initials} /><div><strong>{student.name}</strong><small>{student.cohort.replace(" · ", " ")}</small></div></div><div><strong>{student.activeDays}</strong><small>días activos esta semana</small></div><span className={student.last.includes("Hace") ? "last-risk" : ""}>{student.last === "Hoy" ? "Practicó hoy" : student.last}</span></article>)}</div></section><section className="retention-card"><div><p className="eyebrow">SEÑAL DE RETENCIÓN</p><h2>8 de 9 miembros practicaron este mes</h2><p>La participación constante es tu primera señal de valor percibido.</p></div><div className="retention-bar"><i /><span>89%</span></div></section></>;
}
