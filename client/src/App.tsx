import {
  Activity,
  BarChart3,
  CheckCircle2,
  CircleUserRound,
  ClipboardList,
  Flag,
  LayoutDashboard,
  Lock,
  LogOut,
  Search,
  Shield,
  UserX
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Admin, api, AuditLog, EventItem, FeatureFlag, setToken, User } from "./api";

type View = "dashboard" | "users" | "events" | "audit" | "flags";

const roleLabel = {
  SUPER_ADMIN: "Super Admin",
  SUPPORT: "Support",
  ANALYST: "Analyst"
};

const nav = [
  { id: "dashboard" as const, label: "Dashboard", icon: LayoutDashboard, roles: ["SUPER_ADMIN", "ANALYST"] },
  { id: "users" as const, label: "Users", icon: CircleUserRound, roles: ["SUPER_ADMIN", "SUPPORT", "ANALYST"] },
  { id: "events" as const, label: "Events", icon: Activity, roles: ["SUPER_ADMIN", "ANALYST"] },
  { id: "audit" as const, label: "Audit Logs", icon: ClipboardList, roles: ["SUPER_ADMIN", "SUPPORT"] },
  { id: "flags" as const, label: "Feature Flags", icon: Flag, roles: ["SUPER_ADMIN", "SUPPORT", "ANALYST"] }
];

export function App() {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [view, setView] = useState<View>("dashboard");

  useEffect(() => {
    api
      .me()
      .then(({ admin }) => setAdmin(admin))
      .catch(() => setToken(null))
      .finally(() => setLoadingSession(false));
  }, []);

  useEffect(() => {
    if (admin && !nav.find((item) => item.id === view)?.roles.includes(admin.role)) {
      setView(admin.role === "SUPPORT" ? "users" : "dashboard");
    }
  }, [admin, view]);

  if (loadingSession) {
    return <div className="boot">Loading admin session...</div>;
  }

  if (!admin) {
    return <Login onLogin={setAdmin} />;
  }

  const visibleNav = nav.filter((item) => item.roles.includes(admin.role));

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon"><Shield size={24} /></div>
          <div>
            <strong>AdminOps</strong>
            <span>Internal Portal</span>
          </div>
        </div>
        <nav>
          {visibleNav.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => setView(item.id)}>
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="admin-card">
          <span>{roleLabel[admin.role]}</span>
          <strong>{admin.name}</strong>
          <small>{admin.email}</small>
          <button
            className="ghost-button"
            onClick={() => {
              setToken(null);
              setAdmin(null);
            }}
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>
      <main>
        {view === "dashboard" && <Dashboard />}
        {view === "users" && <Users admin={admin} />}
        {view === "events" && <Events />}
        {view === "audit" && <AuditLogs />}
        {view === "flags" && <FeatureFlags admin={admin} />}
      </main>
    </div>
  );
}

function Login({ onLogin }: { onLogin: (admin: Admin) => void }) {
  const [email, setEmail] = useState("super@admin.local");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await api.login(email, password);
      setToken(result.token);
      onLogin(result.admin);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-screen">
      <form className="login-panel" onSubmit={submit}>
        <div className="brand large">
          <div className="brand-icon"><Lock size={26} /></div>
          <div>
            <strong>AdminOps</strong>
            <span>Secure admin login</span>
          </div>
        </div>
        <label>
          Email
          <input value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="primary-button" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</button>
        <p className="hint">Demo: super@admin.local / password123</p>
      </form>
    </div>
  );
}

function Dashboard() {
  const [data, setData] = useState<{
    metrics: Record<string, number>;
    series: Array<Record<string, number | string>>;
    topEvents: Array<{ eventName: string; count: number }>;
    funnel: Array<{ step: string; users: number; conversion: number }>;
  } | null>(null);

  useEffect(() => {
    Promise.all([api.overview(), api.timeseries(), api.topEvents(), api.funnel()]).then(([overview, timeseries, topEvents, funnel]) => {
      setData({ metrics: overview.metrics, series: timeseries.series, topEvents: topEvents.events, funnel: funnel.funnel });
    });
  }, []);

  if (!data) return <PanelLoader title="Dashboard" />;

  const cards = [
    ["DAU", data.metrics.dau],
    ["MAU", data.metrics.mau],
    ["Retention", `${data.metrics.retentionRate}%`],
    ["30d Events", data.metrics.events30],
    ["Revenue", `$${data.metrics.revenue}`],
    ["Active Users", data.metrics.activeUsers]
  ];

  return (
    <section className="page">
      <PageHeader title="Analytics Dashboard" subtitle="Live product usage, conversion, and growth signals." />
      <div className="metric-grid">
        {cards.map(([label, value]) => (
          <div className="metric-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div className="grid two">
        <section className="panel wide">
          <h2>Activity Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.series}>
              <defs>
                <linearGradient id="events" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#d8dee8" />
              <XAxis dataKey="date" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <Tooltip />
              <Area type="monotone" dataKey="events" stroke="#2563eb" fill="url(#events)" strokeWidth={2} />
              <Line type="monotone" dataKey="activeUsers" stroke="#0f766e" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </section>
        <section className="panel">
          <h2>Top Events</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.topEvents} layout="vertical">
              <XAxis type="number" hide />
              <YAxis dataKey="eventName" type="category" width={120} tickLine={false} axisLine={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#0f766e" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>
      </div>
      <section className="panel">
        <h2>Funnel Conversion</h2>
        <div className="funnel">
          {data.funnel.map((step, index) => (
            <div className="funnel-step" key={step.step}>
              <span>{index + 1}</span>
              <strong>{step.step.replaceAll("_", " ")}</strong>
              <small>{step.users} users · {step.conversion}%</small>
              <div><i style={{ width: `${Math.max(step.conversion, 8)}%` }} /></div>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}

function Users({ admin }: { admin: Admin }) {
  const [users, setUsers] = useState<User[]>([]);
  const [selected, setSelected] = useState<{ user: User; events: EventItem[] } | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [sortBy, setSortBy] = useState("createdAt");

  function load() {
    const params = new URLSearchParams({ search, page: String(page), pageSize: "10", sortBy, sortOrder: "desc" });
    if (status) params.set("status", status);
    api.users(params).then((result) => {
      setUsers(result.users);
      setPages(result.pagination.pages);
    });
  }

  useEffect(load, [search, status, page, sortBy]);

  async function updateStatus(user: User, nextStatus: User["status"]) {
    await api.updateUserStatus(user.id, nextStatus, `Changed from admin portal to ${nextStatus}`);
    load();
    if (selected?.user.id === user.id) {
      const activity = await api.userActivity(user.id);
      setSelected(activity);
    }
  }

  return (
    <section className="page">
      <PageHeader title="User Management" subtitle="Search accounts, inspect activity, and take support actions." />
      <div className="toolbar">
        <div className="searchbox"><Search size={16} /><input placeholder="Search users, email, country" value={search} onChange={(event) => { setPage(1); setSearch(event.target.value); }} /></div>
        <select value={status} onChange={(event) => { setPage(1); setStatus(event.target.value); }}>
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="DEACTIVATED">Deactivated</option>
          <option value="BANNED">Banned</option>
        </select>
        <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
          <option value="createdAt">Newest</option>
          <option value="lastSeenAt">Last seen</option>
          <option value="name">Name</option>
          <option value="plan">Plan</option>
        </select>
      </div>
      <div className="split">
        <section className="panel table-panel">
          <table>
            <thead><tr><th>User</th><th>Plan</th><th>Status</th><th>Last Seen</th><th>Actions</th></tr></thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td><strong>{user.name}</strong><small>{user.email}</small></td>
                  <td>{user.plan}</td>
                  <td><StatusPill status={user.status} /></td>
                  <td>{formatDate(user.lastSeenAt)}</td>
                  <td className="actions">
                    <button title="View activity" onClick={() => api.userActivity(user.id).then(setSelected)}><BarChart3 size={16} /></button>
                    {admin.role !== "ANALYST" && (
                      <>
                        <button title="Deactivate" onClick={() => updateStatus(user, "DEACTIVATED")}><UserX size={16} /></button>
                        <button title="Restore" onClick={() => updateStatus(user, "ACTIVE")}><CheckCircle2 size={16} /></button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="pagination">
            <button disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Previous</button>
            <span>Page {page} of {pages}</span>
            <button disabled={page === pages} onClick={() => setPage((value) => value + 1)}>Next</button>
          </div>
        </section>
        <section className="panel activity-panel">
          <h2>Activity History</h2>
          {!selected && <p className="muted">Select a user to inspect recent events.</p>}
          {selected && (
            <>
              <div className="selected-user">
                <strong>{selected.user.name}</strong>
                <small>{selected.user.email}</small>
              </div>
              <EventList events={selected.events} />
            </>
          )}
        </section>
      </div>
    </section>
  );
}

function Events() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventName, setEventName] = useState("button_clicked");

  useEffect(() => {
    api.events().then((result) => setEvents(result.events));
  }, []);

  async function simulate() {
    await api.trackEvent({ eventName, properties: { source: "admin_simulator" } });
    const result = await api.events();
    setEvents(result.events);
  }

  return (
    <section className="page">
      <PageHeader title="Event Stream" subtitle="Inspect recent analytics events and test the ingestion endpoint." />
      <div className="toolbar">
        <select value={eventName} onChange={(event) => setEventName(event.target.value)}>
          <option value="button_clicked">button_clicked</option>
          <option value="report_viewed">report_viewed</option>
          <option value="purchase_made">purchase_made</option>
          <option value="invite_sent">invite_sent</option>
        </select>
        <button className="primary-button compact" onClick={simulate}>Track test event</button>
      </div>
      <section className="panel">
        <EventList events={events} />
      </section>
    </section>
  );
}

function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    api.auditLogs().then((result) => setLogs(result.logs));
  }, []);

  return (
    <section className="page">
      <PageHeader title="Audit Logs" subtitle="Every sensitive admin action is captured with actor, target, and metadata." />
      <section className="panel">
        <div className="timeline">
          {logs.map((log) => (
            <article key={log.id}>
              <span>{formatDate(log.createdAt)}</span>
              <strong>{log.action.replaceAll("_", " ")}</strong>
              <small>{log.admin?.name ?? "System"} · {log.targetType}</small>
              <code>{JSON.stringify(log.metadata)}</code>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

function FeatureFlags({ admin }: { admin: Admin }) {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);

  function load() {
    api.featureFlags().then((result) => setFlags(result.flags));
  }

  useEffect(load, []);

  async function update(flag: FeatureFlag, data: Partial<FeatureFlag>) {
    await api.updateFeatureFlag(flag.id, data);
    load();
  }

  return (
    <section className="page">
      <PageHeader title="Feature Flags" subtitle="Control staged releases and rollout percentages." />
      <div className="flag-grid">
        {flags.map((flag) => (
          <section className="panel flag-card" key={flag.id}>
            <div>
              <strong>{flag.key}</strong>
              <p>{flag.description}</p>
            </div>
            <label className="switch">
              <input type="checkbox" checked={flag.enabled} disabled={admin.role !== "SUPER_ADMIN"} onChange={(event) => update(flag, { enabled: event.target.checked })} />
              <span />
            </label>
            <label>
              Rollout {flag.rollout}%
              <input type="range" min="0" max="100" value={flag.rollout} disabled={admin.role !== "SUPER_ADMIN"} onChange={(event) => update(flag, { rollout: Number(event.target.value) })} />
            </label>
          </section>
        ))}
      </div>
    </section>
  );
}

function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="page-header">
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </header>
  );
}

function PanelLoader({ title }: { title: string }) {
  return (
    <section className="page">
      <PageHeader title={title} subtitle="Loading data..." />
    </section>
  );
}

function EventList({ events }: { events: EventItem[] }) {
  return (
    <div className="event-list">
      {events.map((event) => (
        <article key={event.id}>
          <span>{event.eventName}</span>
          <strong>{event.user?.email ?? event.userId ?? "anonymous"}</strong>
          <small>{formatDate(event.createdAt)}</small>
          <code>{JSON.stringify(event.properties)}</code>
        </article>
      ))}
    </div>
  );
}

function StatusPill({ status }: { status: User["status"] }) {
  return <span className={`status ${status.toLowerCase()}`}>{status.toLowerCase()}</span>;
}

function formatDate(value?: string) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
