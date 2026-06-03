import './style.css';
import { renderCharts } from './charts.js';
import { resolveAnalytics } from './analytics.js';

const API_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? '' : 'https://soyuz-backend-h5md.onrender.com');
const SESSION_KEY = 'mentalize.session';
const THEME_KEY = 'mentalize.theme';
const FAVORITES_KEY = 'mentalize.materials.favorites';

const MATERIALS = [
  {
    id: 'respiracao-478',
    title: 'Respiração 4-7-8',
    category: 'Respiração',
    excerpt: 'Uma técnica simples para reduzir ansiedade e acalmar o corpo.',
    details: 'Inspire contando até 4, segure por 7 e expire por 8. Repita 4 vezes com atenção no ar entrando e saindo.',
  },
  {
    id: 'meditacao-breve',
    title: 'Meditação breve',
    category: 'Meditação',
    excerpt: 'Exercício de atenção plena para conectar corpo e mente em poucos minutos.',
    details: 'Sente-se confortável, feche os olhos, perceba a respiração e deixe os pensamentos passarem sem julgamento.',
  },
  {
    id: 'visualizacao-positiva',
    title: 'Visualização positiva',
    category: 'Mindfulness',
    excerpt: 'Use imagens mentais para gerar calma e reforçar bem-estar.',
    details: 'Imagine um lugar seguro e acolhedor, observe cores, sons e sensações, e mantenha a sensação positiva no corpo.',
  },
  {
    id: 'pausa-consciente',
    title: 'Pausa consciente',
    category: 'Autocuidado',
    excerpt: 'Uma pausa rápida para reconectar com o presente e aliviar o estresse.',
    details: 'Pare por dois minutos, observe os cinco sentidos e solte qualquer cobrança enquanto o corpo relaxa.',
  },
];

MATERIALS.push(
  {
    id: 'aterramento-54321',
    title: 'Aterramento 5-4-3-2-1',
    category: 'Mindfulness',
    excerpt: 'Uma prática rápida para voltar ao presente quando a mente acelera.',
    details: 'Nomeie 5 coisas que vê, 4 que sente no corpo, 3 que escuta, 2 cheiros e 1 sabor ou sensação agradável.',
  },
  {
    id: 'diario-pensamentos',
    title: 'Diário de pensamentos',
    category: 'Reflexão',
    excerpt: 'Separe fatos, interpretações e emoções para reduzir ruminação.',
    details: 'Escreva a situação, o pensamento automático, a emoção sentida e uma interpretação alternativa mais equilibrada.',
  },
  {
    id: 'sono-desaceleracao',
    title: 'Ritual de desaceleração',
    category: 'Sono',
    excerpt: 'Uma sequência curta para preparar corpo e mente antes de dormir.',
    details: 'Reduza luzes, deixe telas de lado, anote pendências para amanhã e faça respiração lenta por cinco minutos.',
  },
  {
    id: 'autocompaixao',
    title: 'Frase de autocompaixão',
    category: 'Autocuidado',
    excerpt: 'Um recurso simples para atravessar cobrança interna intensa.',
    details: 'Reconheça o momento difícil, lembre que dificuldades fazem parte da experiência humana e diga a si mesmo algo gentil.',
  },
  {
    id: 'check-corpo',
    title: 'Check-in corporal',
    category: 'Regulação',
    excerpt: 'Mapeie sinais físicos antes que a tensão vire pico emocional.',
    details: 'Percorra testa, mandíbula, peito, abdômen e mãos. Observe tensão sem julgamento e solte uma região por vez.',
  },
);

const EXERCISES = [
  {
    id: 'respiracao-quadrada',
    title: 'Respiração quadrada',
    subtitle: '4 ciclos para reduzir ativação.',
    steps: [
      'Sente-se com a coluna ereta e feche os olhos.',
      'Inspire pelo nariz contando 4 segundos.',
      'Segure o ar por 4 segundos.',
      'Expire pela boca contando 4 segundos.',
      'Aguarde 4 segundos antes de inspirar novamente.',
      'Repita o ciclo por 4 vezes.',
    ],
  },
  {
    id: 'nomear-emocao',
    title: 'Nomear para organizar',
    subtitle: 'Diferencie emoção, pensamento e fato.',
    steps: [
      'Pause por um momento e observe como você está.',
      'Identifique o que aconteceu (o fato): "Meu chefe me criticou na reunião."',
      'Identifique o pensamento automático: "Sou incompetente."',
      'Nomeie a emoção: "Estou sentindo vergonha e raiva."',
      'Pergunte: esse pensamento é um fato ou uma interpretação?',
      'Escreva uma versão mais equilibrada do pensamento.',
    ],
  },
  {
    id: 'micro-habito',
    title: 'Micro-hábito',
    subtitle: 'Escolha uma ação de 5 minutos.',
    steps: [
      'Pense em uma coisa pequena que faria você se sentir melhor agora.',
      'Deve ser algo que caiba em 5 minutos ou menos.',
      'Exemplos: beber um copo d\'água, alongar o pescoço, mandar mensagem para alguém.',
      'Faça agora, antes de fechar esta tela.',
      'Depois registre seu humor novamente e observe se mudou.',
    ],
  },
];

const state = {
  token: null,
  currentUser: null,
  users: [],
  professionals: [],
  entries: [],
  summary: null,
  route: getRoute(),
  selectedUserId: null,
  editingEntryId: null,
  editingUserId: null,
  editingProfessionalId: null,
  status: 'Conectando',
  message: '',
  loading: false,
  analytics: null,
  theme: localStorage.getItem(THEME_KEY) || 'light',
  materialsFilter: 'all',
  favorites: new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]')),
  activeExerciseId: null,
  isPremium: false,
};

const app = document.querySelector('#app');

function getRoute() {
  return window.location.hash.replace('#/', '') || 'painel';
}

function setRoute(route) {
  window.location.hash = `#/${route}`;
}

function readSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

function saveSession(token, user) {
  state.token = token;
  state.currentUser = user;
  state.selectedUserId = user.id;
  localStorage.setItem(SESSION_KEY, JSON.stringify({ token, user }));
}

function clearSession() {
  state.token = null;
  state.currentUser = null;
  state.selectedUserId = null;
  localStorage.removeItem(SESSION_KEY);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function formatDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function saveFavorites() {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([...state.favorites]));
}

function applyTheme(theme = state.theme) {
  state.theme = theme;
  document.body.classList.toggle('theme-dark', theme === 'dark');
  document.body.classList.toggle('theme-light', theme !== 'dark');
  localStorage.setItem(THEME_KEY, theme);
  const toggleButtons = document.querySelectorAll('[data-action="toggle-theme"]');
  toggleButtons.forEach((btn) => {
    btn.textContent = theme === 'dark' ? '☀️' : '🌙';
    btn.title = theme === 'dark' ? 'Modo claro' : 'Modo escuro';
  });
}

function toggleTheme() {
  applyTheme(state.theme === 'dark' ? 'light' : 'dark');
}

function firstName(user = state.currentUser) {
  return user?.preferred_name || user?.name?.split(' ')[0] || 'você';
}

function isProfessional() {
  return state.currentUser?.role === 'professional';
}

function isAdmin() {
  return state.currentUser?.role === 'admin';
}

function isStaff() {
  return isProfessional() || isAdmin();
}

function roleLabel(role) {
  return {
    admin: 'Admin',
    professional: 'Profissional',
    user: 'Paciente',
  }[role] || 'Paciente';
}

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };

  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (state.token && options.auth !== false) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  delete options.auth;

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 204) return null;

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Não foi possível concluir a ação.');
  }

  return data;
}

function showMessage(message) {
  state.message = message;
  render();
  window.setTimeout(() => {
    state.message = '';
    render();
  }, 3200);
}

async function loadSession() {
  const session = readSession();
  if (!session?.token) return;

  state.token = session.token;
  state.currentUser = session.user;
  state.selectedUserId = session.user?.id || null;

  try {
    const data = await api('/api/auth/me');
    state.currentUser = data.user;
    state.selectedUserId = state.selectedUserId || data.user.id;
    localStorage.setItem(SESSION_KEY, JSON.stringify({ token: state.token, user: data.user }));
  } catch {
    clearSession();
  }
}

async function loadData() {
  if (!state.token) return;

  try {
    state.users = await api('/api/users');
    state.professionals = isStaff() ? await api('/api/professionals') : [];
    state.selectedUserId = isStaff()
      ? state.selectedUserId || state.users[0]?.id || state.currentUser?.id || null
      : state.currentUser?.id || state.users[0]?.id || null;
    state.isPremium = state.currentUser?.isPremium || false;
    await loadEntries();
  } catch (error) {
    console.error('Erro ao carregar dados:', error);
    state.status = `API indisponível: ${error.message || 'Verifique a conexão'}`;
    state.message = error.message;
  }
}

async function loadEntries() {
  const query = isStaff() && state.selectedUserId ? `?userId=${state.selectedUserId}` : '';
  // FIX: O backend retorna um array diretamente (não mais { items, pagination }).
  const result = await api(`/api/mood-entries${query}`);
  state.entries = Array.isArray(result) ? result : (result?.items ?? []);
  state.summary = await api(`/api/summary${query}`);
  state.analytics = resolveAnalytics(state.summary, state.entries);
}

function navItem(route, label, icon) {
  const active = state.route === route ? ' aria-current="page"' : '';
  const iconSvg = icon
    ? `<svg class="nav-icon" aria-hidden="true"><use href="/icons.svg#${icon}"/></svg>`
    : '';
  return `<a href="#/${route}"${active}>${iconSvg}<span>${label}</span></a>`;
}

function renderBrand() {
  return `
    <a class="brand" href="#/${state.token ? 'painel' : 'login'}" aria-label="Mentalize">
      <span class="brand-mark">
        <img src="/logo.png" alt="Mentalize Logo" onerror="this.hidden = true" />
        <span>M</span>
      </span>
      <span>
        <strong>Mentalize</strong>
        <small>Equilibre, Mentalize.</small>
      </span>
    </a>
  `;
}

function renderAuthLayout() {
  const isRegister = state.route === 'cadastro';
  return `
    <main class="auth-page">
      <section class="auth-visual">
        ${renderBrand()}
        <div class="auth-copy">
          <span class="quiet-label">Saúde mental</span>
          <h1>Registre como você está e acompanhe padrões ao longo do tempo.</h1>
          <p>Check-ins rápidos, histórico visual e espaço para profissionais com CRP validado.</p>
        </div>
      </section>

      <section class="auth-panel" aria-label="${isRegister ? 'Cadastro' : 'Login'}">
        <div class="auth-switch">
          <a href="#/login" ${!isRegister ? 'aria-current="page"' : ''}>Login</a>
          <a href="#/cadastro" ${isRegister ? 'aria-current="page"' : ''}>Cadastro</a>
        </div>
        ${isRegister ? renderRegisterForm() : renderLoginForm()}
      </section>
    </main>
  `;
}

function renderLoginForm() {
  return `
    <form class="auth-form" data-form="login">
      <div>
        <p class="quiet-label">Entrar</p>
        <h2>Continue sua rotina.</h2>
      </div>
      <label>Email<input name="email" type="email" autocomplete="email" required /></label>
      <label>Senha<input name="password" type="password" autocomplete="current-password" required /></label>
      <button class="primary-button" type="submit">Entrar</button>
      <p class="form-note">Primeiro acesso? <a href="#/cadastro">Crie sua conta</a>.</p>
    </form>
  `;
}

function renderRegisterForm() {
  return `
    <form class="auth-form" data-form="register">
      <div>
        <p class="quiet-label">Cadastro</p>
        <h2>Crie sua conta.</h2>
      </div>
      <div class="form-grid">
        <label>Nome<input name="name" autocomplete="name" required /></label>
        <label>Como prefere ser chamado<input name="preferred_name" /></label>
        <label>Email<input name="email" type="email" autocomplete="email" required /></label>
        <label>Senha<input name="password" type="password" minlength="6" autocomplete="new-password" required /></label>
        <label class="span-2">Tipo de conta
          <select name="role" data-role-select>
            <option value="user">Usuário</option>
            <option value="professional">Profissional de saúde mental</option>
          </select>
        </label>
        <label data-professional-field hidden>CRP<input name="crp" placeholder="06/123456" /></label>
        <label data-professional-field hidden>Especialidade<input name="specialty" placeholder="Psicologia clinica" /></label>
      </div>
      <button class="primary-button" type="submit">Criar conta</button>
      <p class="form-note">Já tem conta? <a href="#/login">Entrar agora</a>.</p>
    </form>
  `;
}

function renderAppLayout() {
  return `
    <div class="app-shell">
      <aside class="sidebar">
        ${renderBrand()}
        <nav class="nav-links" aria-label="Navegação principal">
          ${navItem('painel', 'Painel', 'home')}
          ${navItem('check-in', 'Check-in', 'plus-circle')}
          ${navItem('historico', 'Histórico', 'clock')}
          ${navItem('materiais', 'Materiais', 'book-open')}
          ${isStaff() ? navItem('profissionais', 'Profissionais', 'users') : ''}
          ${isAdmin() ? navItem('usuarios', 'Usuários', '👤') : ''}
          ${navItem('perfil', 'Perfil', 'settings')}
        </nav>
      </aside>

      <main class="content">
        <header class="topbar">
        <div>
          <p class="quiet-label">${escapeHtml(pageEyebrow())}</p>
          <h1>${escapeHtml(pageTitle())}</h1>
        </div>
        <div class="topbar-actions">
          <button class="ghost-button" type="button" data-action="refresh" ${state.loading ? 'disabled' : ''}>Atualizar</button>
          <button class="ghost-button" type="button" data-action="toggle-theme" title="Alternar modo claro/escuro">${state.theme === 'dark' ? '☀️' : '🌙'}</button>
          <div class="topbar-user" data-action="goto-perfil" title="Ir para perfil">
            <div class="topbar-avatar">${escapeHtml(firstName().slice(0, 1).toUpperCase())}</div>
            <span class="topbar-name">${escapeHtml(firstName())}</span>
          </div>
          <button class="ghost-button" type="button" data-action="logout">Sair</button>
        </div>
      </header>
        ${state.loading ? '<div class="loading-bar" role="status"><span></span> Carregando dados…</div>' : ''}
        ${renderCurrentPage()}
      </main>
      <nav class="mobile-nav" aria-label="Menu mobile">
        ${navItem('painel', 'Painel')}
        ${navItem('check-in', 'Check-in')}
        ${navItem('historico', 'Histórico')}
        ${navItem('materiais', 'Materiais')}
        ${navItem('perfil', 'Perfil')}
      </nav>
    </div>
  `;
}

function pageEyebrow() {
  const greetings = contextualGreeting();
  if (isAdmin()) {
    const labels = { painel: 'Administração', 'check-in': 'Check-in', historico: 'Histórico', materiais: 'Materiais', profissionais: 'Equipe', usuarios: 'Gestão de acessos', perfil: 'Conta' };
    return labels[state.route] || labels.painel;
  }
  if (isProfessional()) {
    const labels = { painel: 'Acompanhamento clínico', 'check-in': 'Registro de sessão', historico: 'Histórico do paciente', materiais: 'Materiais', profissionais: 'Equipe', perfil: 'Conta' };
    return labels[state.route] || labels.painel;
  }
  const labels = { painel: greetings, 'check-in': 'Check-in', historico: 'Histórico', materiais: 'Materiais', perfil: 'Conta' };
  return labels[state.route] || labels.painel;
}

function contextualGreeting() {
  const name = firstName();
  const hour = new Date().getHours();
  const day  = new Date().getDay();

  if (hour >= 5  && hour < 12) return `Bom dia, ${name} ☀️`;
  if (hour >= 12 && hour < 18) return `Boa tarde, ${name}`;
  if (hour >= 18 && hour < 23) return `Boa noite, ${name} 🌙`;

  if (day === 0 || day === 6) return `Curtindo o fim de semana, ${name}?`;
  return `Ainda acordado, ${name}?`;
}

function pageTitle() {
  if (isAdmin()) {
    const titles = { painel: adminDashboardTitle(), 'check-in': 'Novo registro', historico: 'Histórico do sistema', materiais: 'Materiais de apoio', profissionais: 'Profissionais cadastrados', usuarios: 'Usuários e permissões', perfil: 'Dados da conta' };
    return titles[state.route] || titles.painel;
  }
  if (isProfessional()) {
    const sel = state.users.find((u) => u.id === state.selectedUserId);
    const nm = escapeHtml(sel?.preferred_name || sel?.name || 'Paciente');
    const titles = { painel: `Painel de ${nm}`, 'check-in': 'Registrar evolução', historico: `Histórico de ${nm}`, materiais: 'Materiais de apoio', profissionais: 'Equipe de saúde mental', perfil: 'Dados da conta' };
    return titles[state.route] || titles.painel;
  }
  const titles = { painel: dashboardTitle(), 'check-in': 'Como você está agora?', historico: 'Todos os registros', materiais: 'Materiais de apoio', perfil: 'Dados da conta' };
  return titles[state.route] || titles.painel;
}

function dashboardTitle() {
  const total = state.summary?.total_entries || 0;
  if (total === 0) return 'Vamos começar?';
  if (total < 5)  return 'Continue registrando';
  const avg = state.summary?.average_intensity || 0;
  if (avg >= 7)   return 'Atenção ao seu estado';
  if (avg <= 3)   return 'Você está bem 👌';
  return 'Resumo do seu bem-estar';
}

function adminDashboardTitle() {
  const total = state.users?.length || 0;
  const profs = state.professionals?.length || 0;
  if (total === 0) return 'Sistema vazio';
  return `${total} usuário${total !== 1 ? 's' : ''} · ${profs} profissional${profs !== 1 ? 'is' : ''}`;
}

function renderCurrentPage() {
  const pages = {
    painel: renderDashboard,
    'check-in': renderCheckIn,
    historico: renderHistory,
    materiais: renderMaterialsPage,
    profissionais: renderProfessionalsPage,
    usuarios: renderUsersPage,
    perfil: renderProfile,
  };
  return (pages[state.route] || renderDashboard)();
}

function renderDashboard() {
  if (isAdmin())        return renderAdminDashboard();
  if (isProfessional()) return renderProfessionalDashboard();
  return renderPatientDashboard();
}

function renderPatientDashboard() {
  const recommendation = state.summary?.recommendation || {};
  const analytics = state.analytics || resolveAnalytics(state.summary, state.entries);
  return `
    <section class="dashboard-hero dashboard-hero--light">
      <div>
        <p class="quiet-label">Sugestão</p>
        <h2>${escapeHtml(recommendation.title || 'Primeiro check-in')}</h2>
        <p>${escapeHtml(recommendation.summary || 'Registre humor e contexto para ver gráficos e tendências.')}</p>
      </div>
      <a class="breathing-card" href="#/check-in">
        <span>Novo</span>
        <strong>Check-in</strong>
        <small>Leva cerca de 1 minuto</small>
      </a>
    </section>
    ${renderMetrics()}
    ${renderCharts(analytics, escapeHtml)}
    <section class="split-grid">
      <div class="panel">
        <div class="panel-heading">
          <div><p class="quiet-label">Próximos passos</p><h2>Sugestões</h2></div>
        </div>
        <ul class="action-list">
          ${(recommendation.actions || ['Registrar humor de hoje', 'Adicionar contexto', 'Revisar histórico'])
            .map((action) => `<li>${escapeHtml(action)}</li>`).join('')}
        </ul>
      </div>
      <div class="panel">
        <div class="panel-heading">
          <div><p class="quiet-label">Recentes</p><h2>Últimos registros</h2></div>
          <a class="text-link" href="#/historico">Ver todos</a>
        </div>
        ${renderEntryList(state.entries.slice(0, 4))}
      </div>
    </section>
  `;
}

function renderProfessionalDashboard() {
  const analytics = state.analytics || resolveAnalytics(state.summary, state.entries);
  const sel = state.users.find((u) => u.id === state.selectedUserId);
  const patientName = sel?.preferred_name || sel?.name || 'Nenhum paciente selecionado';
  return `
    <section class="dashboard-hero dashboard-hero--professional">
      <div>
        <p class="quiet-label">Paciente em foco</p>
        <h2>${escapeHtml(patientName)}</h2>
        <p>${escapeHtml(sel?.email || 'Selecione um paciente para visualizar os dados.')}</p>
      </div>
      <div class="professional-quick-actions">
        ${renderUserSelect(state.selectedUserId)}
        <a class="breathing-card breathing-card--compact" href="#/historico">
          <span>Ver</span>
          <strong>Histórico completo</strong>
        </a>
      </div>
    </section>
    ${renderMetrics()}
    ${renderCharts(analytics, escapeHtml)}
    <section class="panel">
      <div class="panel-heading">
        <div><p class="quiet-label">Evolução recente</p><h2>Últimos registros de ${escapeHtml(patientName)}</h2></div>
        <a class="text-link" href="#/historico">Ver todos</a>
      </div>
      ${renderEntryList(state.entries.slice(0, 5))}
    </section>
  `;
}

function renderAdminDashboard() {
  const totalUsers = state.users?.length || 0;
  const totalProfs = state.professionals?.length || 0;
  const admins     = state.users?.filter((u) => u.role === 'admin').length || 0;
  const patients   = state.users?.filter((u) => u.role === 'user').length || 0;
  return `
    <section class="admin-overview">
      <div class="admin-stat"><span>Pacientes</span><strong>${patients}</strong></div>
      <div class="admin-stat"><span>Profissionais</span><strong>${totalProfs}</strong></div>
      <div class="admin-stat"><span>Administradores</span><strong>${admins}</strong></div>
      <div class="admin-stat"><span>Total de contas</span><strong>${totalUsers}</strong></div>
    </section>
    <section class="split-grid">
      <div class="panel">
        <div class="panel-heading">
          <div><p class="quiet-label">Acesso rápido</p><h2>Gestão do sistema</h2></div>
        </div>
        <ul class="admin-shortcut-list">
          <li><a href="#/usuarios" class="admin-shortcut">
            <strong>Usuários e permissões</strong>
            <span>Promover roles, editar e remover contas</span>
          </a></li>
          <li><a href="#/profissionais" class="admin-shortcut">
            <strong>Profissionais</strong>
            <span>Gerenciar cadastros e validações de CRP</span>
          </a></li>
        </ul>
      </div>
      <div class="panel">
        <div class="panel-heading">
          <div><p class="quiet-label">Contas recentes</p><h2>Últimas entradas</h2></div>
          <a class="text-link" href="#/usuarios">Ver todos</a>
        </div>
        <div class="compact-list">
          ${(state.users?.slice(-5).reverse() || []).map((u) => `
            <article class="list-row">
              <div>
                <strong>${escapeHtml(u.preferred_name || u.name)}</strong>
                <span>${escapeHtml(u.email)}</span>
              </div>
              <small class="pill pill--${u.role}">${roleLabel(u.role)}</small>
            </article>
          `).join('')}
        </div>
      </div>
    </section>
  `;
}

function renderMetrics() {
  const summary = state.summary || {};
  const items = [
    ['Registros', summary.total_entries || 0],
    ['Intensidade média', summary.average_intensity || 0],
    ['Picos recentes', summary.high_intensity_entries || 0],
    ['Contexto frequente', summary.main_context || '--'],
  ];

  return `
    <section class="overview" aria-label="Resumo emocional">
      ${items.map(([label, value]) => `
        <div class="metric">
          <span>${label}</span>
          <strong>${escapeHtml(value)}</strong>
        </div>
      `).join('')}
    </section>
  `;
}

function renderCheckIn() {
  const editing = state.entries.find((entry) => entry.id === state.editingEntryId);
  return `
    <section class="split-grid">
      <div class="panel roomy-panel">
        <div class="panel-heading">
          <div>
            <p class="quiet-label">Check-in guiado</p>
            <h2>${editing ? 'Editar registro' : 'Novo registro'}</h2>
          </div>
          ${editing ? '<button class="text-button" type="button" data-action="cancel-entry-edit">Cancelar</button>' : ''}
        </div>
        <form class="form-grid" data-form="entry">
          <label>Usuário${renderUserSelect(editing?.user_id)}</label>
          <label>Emoção
            <select name="emotion" required>
              ${['Ansiedade', 'Estresse', 'Tristeza', 'Calma', 'Alegria', 'Cansaco'].map((emotion) => (
                `<option value="${emotion}" ${editing?.emotion === emotion ? 'selected' : ''}>${emotion}</option>`
              )).join('')}
            </select>
          </label>
          <label>Intensidade
            <input name="intensity" type="range" min="1" max="10" value="${editing?.intensity || 5}" data-range />
            <span class="range-value">${editing?.intensity || 5}</span>
          </label>
          <label>Contexto<input name="context" value="${escapeHtml(editing?.context || '')}" placeholder="Trabalho, estudos, familia" /></label>
          <label class="span-2">Gatilhos<input name="triggers" value="${escapeHtml((editing?.triggers || []).join(', '))}" placeholder="prazos, sono, conflito" /></label>
          <label class="span-2">Observacoes<textarea name="notes" rows="4" placeholder="O que aconteceu antes, durante e depois?">${escapeHtml(editing?.notes || '')}</textarea></label>
          <button class="primary-button span-2" type="submit">${editing ? 'Salvar edição' : 'Salvar registro'}</button>
        </form>
      </div>

      <aside class="panel support-panel">
        <p class="quiet-label">Exercícios guiados</p>
        <div class="exercise-list">
          ${EXERCISES.map((ex) => `
            <article class="exercise-card" data-action="open-exercise" data-id="${ex.id}" tabindex="0" role="button">
              <strong>${escapeHtml(ex.title)}</strong>
              <span>${escapeHtml(ex.subtitle)}</span>
              <small class="exercise-cta">Iniciar →</small>
            </article>
          `).join('')}
        </div>
        ${state.activeExerciseId ? renderExerciseModal() : ''}
      </aside>
    </section>
  `;
}

function renderExerciseModal() {
  const ex = EXERCISES.find((e) => e.id === state.activeExerciseId);
  if (!ex) return '';
  return `
    <div class="exercise-modal" role="dialog" aria-modal="true" aria-label="${escapeHtml(ex.title)}">
      <div class="exercise-modal-inner">
        <button class="modal-close" type="button" data-action="close-exercise" aria-label="Fechar">×</button>
        <p class="quiet-label">Exercício</p>
        <h3>${escapeHtml(ex.title)}</h3>
        <ol class="exercise-steps">
          ${ex.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}
        </ol>
      </div>
    </div>
  `;
}

function renderUserSelect(selectedId) {
  if (!isStaff()) {
    const user = state.currentUser || state.users[0];
    return `
      <input type="hidden" name="user_id" value="${escapeHtml(user?.id || '')}" />
      <span class="readonly-value">${escapeHtml(user?.preferred_name || user?.name || 'Minha conta')}</span>
    `;
  }

  return `
    <select name="user_id" data-user-select required>
      ${state.users.map((user) => `
        <option value="${user.id}" ${(Number(selectedId || state.selectedUserId) === user.id) ? 'selected' : ''}>
          ${escapeHtml(user.preferred_name || user.name)}
        </option>
      `).join('')}
    </select>
  `;
}

function renderHistory() {
  const analytics = state.analytics || resolveAnalytics(state.summary, state.entries);
  return `
    ${renderMetrics()}
    ${renderCharts(analytics, escapeHtml)}
    <section class="panel">
      <div class="panel-heading">
        <div>
          <p class="quiet-label">Linha do tempo</p>
          <h2>Registros emocionais</h2>
        </div>
        ${isStaff() ? renderUserSelect(state.selectedUserId) : ''}
      </div>
      ${renderEntryList(state.entries)}
    </section>
  `;
}

function renderMaterialsPage() {
  const materials = state.materialsFilter === 'favorites'
    ? MATERIALS.filter((item) => state.favorites.has(item.id))
    : MATERIALS;

  return `
    <section class="panel materials-panel">
      <div class="panel-heading">
        <div>
          <p class="quiet-label">Materiais</p>
          <h2>Guias de respiração e meditação</h2>
        </div>
      </div>
      <p class="materials-description">Explore práticas para acalmar, focar e equilibrar seu dia. Marque como favorito o que funcionar melhor para você.</p>
      <div class="materials-tabs">
        <button class="tab-button ${state.materialsFilter === 'all' ? 'active' : ''}" type="button" data-action="set-materials-tab" data-tab="all">Todos</button>
        <button class="tab-button ${state.materialsFilter === 'favorites' ? 'active' : ''}" type="button" data-action="set-materials-tab" data-tab="favorites">Favoritos</button>
      </div>
      <div class="materials-grid">
        ${materials.length ? materials.map((item) => `
          <article class="material-card">
            <div class="material-card-header">
              <div>
                <strong>${escapeHtml(item.title)}</strong>
                <span>${escapeHtml(item.category)}</span>
              </div>
              <button class="favorite-button ${state.favorites.has(item.id) ? 'active' : ''}" type="button" data-action="toggle-favorite" data-id="${item.id}">
                ${state.favorites.has(item.id) ? '★ Favorito' : '☆ Favoritar'}
              </button>
            </div>
            <p class="material-excerpt">${escapeHtml(item.excerpt)}</p>
            <p class="material-details">${escapeHtml(item.details)}</p>
          </article>
        `).join('') : `
          <div class="empty-state">${state.materialsFilter === 'favorites' ? 'Nenhum favorito ainda. Marque um material como favorito para encontrá-lo aqui.' : 'Nenhum material disponível no momento.'}</div>
        `}
      </div>
    </section>
  `;
}

function renderEntryList(entries) {
  if (!entries.length) {
    return '<p class="empty-state">Nenhum registro emocional ainda.</p>';
  }

  return `
    <div class="entry-list">
      ${entries.map((entry) => `
        <article class="entry-item">
          <div class="entry-meter" style="--level: ${Number(entry.intensity) * 10}%"></div>
          <div>
            <span class="pill">${escapeHtml(entry.emotion)}</span>
            <h3>${escapeHtml(entry.context || 'Sem contexto')}</h3>
            <p>${escapeHtml(entry.notes || 'Sem observações.')}</p>
            <small>${formatDate(entry.created_at)} · intensidade ${entry.intensity}/10</small>
          </div>
          <div class="item-actions">
            <button type="button" data-action="edit-entry" data-id="${entry.id}">Editar</button>
            ${isAdmin() ? `<button type="button" data-action="delete-entry" data-id="${entry.id}">Excluir</button>` : ''}
          </div>
        </article>
      `).join('')}
    </div>
  `;
}

function renderProfessionalsPage() {
  if (isProfessional()) {
    return `
      <section class="panel">
        <div class="panel-heading">
          <div><p class="quiet-label">Equipe</p><h2>Profissionais de saúde mental</h2></div>
        </div>
        <p style="color:var(--muted);font-size:0.88rem;margin-bottom:18px;line-height:1.6">
          Outros profissionais registrados na plataforma. Para alterações de cadastro, contate o administrador.
        </p>
        ${renderProfessionalList()}
      </section>
    `;
  }
  const editing = state.professionals.find((p) => p.id === state.editingProfessionalId);
  return `
    <section class="split-grid">
      <div class="panel">
        <div class="panel-heading">
          <div><p class="quiet-label">Cadastro profissional</p><h2>${editing ? 'Editar profissional' : 'Novo profissional'}</h2></div>
          ${editing ? '<button class="text-button" type="button" data-action="cancel-professional-edit">Cancelar</button>' : ''}
        </div>
        <form class="form-grid" data-form="professional">
          <label>Nome<input name="name" value="${escapeHtml(editing?.name || '')}" required /></label>
          <label>CRP<input name="crp" value="${escapeHtml(editing?.crp || '')}" placeholder="06/123456" required /></label>
          <label>Especialidade<input name="specialty" value="${escapeHtml(editing?.specialty || '')}" /></label>
          <label>Email<input name="email" type="email" value="${escapeHtml(editing?.email || '')}" required /></label>
          <button class="primary-button span-2" type="submit">${editing ? 'Salvar edição' : 'Salvar profissional'}</button>
        </form>
      </div>
      <div class="panel">
        <div class="panel-heading">
          <div><p class="quiet-label">CRP validado</p><h2>Profissionais cadastrados</h2></div>
        </div>
        ${renderProfessionalList()}
      </div>
    </section>
  `;
}

function renderProfessionalList() {
  if (!state.professionals.length) {
    return '<p class="empty-state">Nenhum profissional cadastrado.</p>';
  }

  return `
    <div class="compact-list">
      ${state.professionals.map((professional) => `
        <article class="list-row">
          <div>
            <strong>${escapeHtml(professional.name)}</strong>
            <span>${escapeHtml(professional.specialty || 'Especialidade não informada')}</span>
            <small>CRP ${escapeHtml(professional.crp)} · ${professional.verified ? 'validado' : 'pendente'}</small>
          </div>
          <div class="item-actions">
            <button type="button" data-action="edit-professional" data-id="${professional.id}">Editar</button>
            ${isAdmin() ? `<button type="button" data-action="delete-professional" data-id="${professional.id}">Excluir</button>` : ''}
          </div>
        </article>
      `).join('')}
    </div>
  `;
}

function renderUsersPage() {
  const editing = state.users.find((user) => user.id === state.editingUserId);
  return `
    <section class="split-grid">
      <div class="panel">
        <div class="panel-heading">
          <div>
            <p class="quiet-label">Usuário</p>
            <h2>${editing ? 'Editar usuário' : 'Novo usuário'}</h2>
          </div>
          ${editing ? '<button class="text-button" type="button" data-action="cancel-user-edit">Cancelar</button>' : ''}
        </div>
        <form class="form-grid" data-form="user">
          <label>Nome<input name="name" value="${escapeHtml(editing?.name || '')}" required /></label>
          <label>Como prefere ser chamado<input name="preferred_name" value="${escapeHtml(editing?.preferred_name || '')}" /></label>
          <label class="span-2">Email<input name="email" type="email" value="${escapeHtml(editing?.email || '')}" required /></label>
          <button class="primary-button span-2" type="submit">${editing ? 'Salvar edição' : 'Salvar usuário'}</button>
        </form>
      </div>

      <div class="panel">
        <div class="panel-heading">
          <div>
            <p class="quiet-label">Acompanhamento</p>
            <h2>Usuários autorizados</h2>
          </div>
        </div>
        ${renderUserList()}
      </div>
    </section>
  `;
}

function renderUserList() {
  if (!state.users.length) {
    return '<p class="empty-state">Nenhum usuário cadastrado.</p>';
  }

  return `
    <div class="compact-list">
      ${state.users.map((user) => `
        <article class="list-row ${state.selectedUserId === user.id ? 'selected-row' : ''}">
          <div>
            <strong>${escapeHtml(user.preferred_name || user.name)}</strong>
            <span>${escapeHtml(user.email)}</span>
            <small class="pill pill--${user.role}">${roleLabel(user.role)}</small>
          </div>
          <div class="item-actions">
            <button type="button" data-action="select-user" data-id="${user.id}">Ver</button>
            <button type="button" data-action="edit-user" data-id="${user.id}">Editar</button>
            ${isAdmin() ? `
              <select data-action="change-role" data-id="${user.id}" class="role-select">
                <option value="user"     ${user.role === 'user'         ? 'selected' : ''}>Paciente</option>
                <option value="professional" ${user.role === 'professional' ? 'selected' : ''}>Profissional</option>
                <option value="admin"    ${user.role === 'admin'        ? 'selected' : ''}>Admin</option>
              </select>
              <button type="button" data-action="delete-user" data-id="${user.id}">Excluir</button>
            ` : ''}
          </div>
        </article>
      `).join('')}
    </div>
  `;
}

function renderProfile() {
  const profData = isProfessional()
    ? state.professionals.find((p) => p.email === state.currentUser?.email)
    : null;
  return `
    <section class="profile-grid">
      <div class="panel profile-card">
        <div class="avatar avatar--${state.currentUser?.role || 'user'}">${escapeHtml(firstName().slice(0, 1).toUpperCase())}</div>
        <h2>${escapeHtml(state.currentUser?.name || '')}</h2>
        <p>${escapeHtml(state.currentUser?.email || '')}</p>
        <p class="quiet-label">${roleLabel(state.currentUser?.role)}</p>
        ${profData ? `
          <div class="profile-badge">
            <span class="profile-crp">CRP ${escapeHtml(profData.crp)}</span>
            <span class="pill pill--${profData.verified ? 'professional' : 'user'}">${profData.verified ? 'Validado' : 'Pendente'}</span>
          </div>
          <p class="profile-specialty">${escapeHtml(profData.specialty || 'Especialidade não informada')}</p>
        ` : ''}
      </div>
      <div class="panel">
        <p class="quiet-label">Conta</p>
        <h2>Informações</h2>
        <dl class="definition-list">
          <div><dt>Nome preferido</dt><dd>${escapeHtml(state.currentUser?.preferred_name || state.currentUser?.name || '—')}</dd></div>
          <div><dt>Email</dt><dd>${escapeHtml(state.currentUser?.email || '—')}</dd></div>
          <div><dt>Perfil</dt><dd>${roleLabel(state.currentUser?.role)}</dd></div>
          <div><dt>Sessão</dt><dd>${state.token ? 'Ativa' : 'Inativa'}</dd></div>
          <div><dt>Plano</dt><dd>${state.isPremium ? 'Premium' : 'Básico'}</dd></div>
        </dl>
      </div>
    </section>

    <section class="plans-section">
      <div class="panel">
        <p class="quiet-label">Planos</p>
        <h2>Escolha seu plano</h2>
        <div class="plans-grid">
          <article class="plan-card plan-card--basic">
            <div class="plan-header">
              <h3>Plano Básico</h3>
              <span class="plan-price">Gratuito</span>
            </div>
            <ul class="plan-features">
              <li>Registro diário de emoções</li>
              <li>Registro de intensidade emocional</li>
              <li>Adição de observações/contexto</li>
              <li>Histórico dos últimos 30 dias</li>
              <li>Calendário emocional básico</li>
              <li>Exercícios guiados básicos</li>
              <li>Lembretes de registro</li>
            </ul>
            <button class="plan-button plan-button--active" type="button" disabled>Plano Atual</button>
          </article>
          <article class="plan-card plan-card--premium ${state.isPremium ? 'plan-card--active' : ''}">
            <div class="plan-header">
              <h3>Plano Premium</h3>
              <span class="plan-price">R$ 14,90/mês</span>
              <small>ou R$ 149,90/ano</small>
            </div>
            <ul class="plan-features">
              <li>Tudo do plano Básico</li>
              <li>Histórico emocional ilimitado</li>
              <li>Gráficos de evolução emocional</li>
              <li>Estatísticas mensais automáticas</li>
              <li>Identificação de emoções frequentes</li>
              <li>Relatórios em PDF</li>
              <li>Recomendações personalizadas</li>
              <li>Compartilhamento com psicólogos</li>
              <li>Exercícios guiados exclusivos</li>
              <li>Acesso antecipado a novas funcionalidades</li>
              <li>Suporte prioritário</li>
            </ul>
            ${state.isPremium
              ? '<button class="plan-button plan-button--active" type="button" disabled>Plano Ativo</button>'
              : '<button class="plan-button plan-button--premium" type="button" data-action="activate-premium">Ativar Premium</button>'
            }
          </article>
        </div>
      </div>
    </section>
  `;
}

function render() {
  state.route = getRoute();

  applyTheme();

  if (state.token && !isStaff() && ['profissionais', 'usuarios'].includes(state.route)) {
    setRoute('painel');
    return;
  }
  if (state.token && isProfessional() && state.route === 'usuarios') {
    setRoute('profissionais');
    return;
  }

  if (!state.token && !['login', 'cadastro'].includes(state.route)) {
    setRoute('login');
    return;
  }

  if (state.token && ['login', 'cadastro'].includes(state.route)) {
    setRoute('painel');
    return;
  }

  app.innerHTML = `
    ${state.token ? renderAppLayout() : renderAuthLayout()}
    ${state.message ? `<div class="toast">${escapeHtml(state.message)}</div>` : ''}
  `;
}

async function refresh() {
  state.loading = true;
  render();
  try {
    await loadData();
  } finally {
    state.loading = false;
    render();
  }
}

async function handleAuthSubmit(form) {
  const payload = formData(form);
  const path = form.dataset.form === 'register' ? '/api/auth/register' : '/api/auth/login';
  const data = await api(path, { method: 'POST', body: JSON.stringify(payload) });
  saveSession(data.token, data.user);
  await loadData();
  setRoute('painel');
}

async function handleEntrySubmit(form) {
  const payload = formData(form);
  const method = state.editingEntryId ? 'PUT' : 'POST';
  const path = state.editingEntryId ? `/api/mood-entries/${state.editingEntryId}` : '/api/mood-entries';

  await api(path, { method, body: JSON.stringify(payload) });
  state.editingEntryId = null;
  state.selectedUserId = Number(payload.user_id);
  await refresh();
  showMessage('Registro salvo.');
}

async function handleUserSubmit(form) {
  const payload = formData(form);
  const method = state.editingUserId ? 'PUT' : 'POST';
  const path = state.editingUserId ? `/api/users/${state.editingUserId}` : '/api/users';
  const saved = await api(path, { method, body: JSON.stringify(payload) });

  state.selectedUserId = saved.id;
  state.editingUserId = null;
  await refresh();
  showMessage('Usuário salvo.');
}

async function handleProfessionalSubmit(form) {
  const payload = formData(form);
  const method = state.editingProfessionalId ? 'PUT' : 'POST';
  const path = state.editingProfessionalId
    ? `/api/professionals/${state.editingProfessionalId}`
    : '/api/professionals';

  await api(path, { method, body: JSON.stringify(payload) });
  state.editingProfessionalId = null;
  await refresh();
  showMessage('Profissional salvo.');
}

app.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.target.closest('form');
  if (!form || state.loading) return;

  const submitButton = form.querySelector('[type="submit"]');
  const previousLabel = submitButton?.textContent;
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = 'Salvando…';
  }

  try {
    if (['login', 'register'].includes(form.dataset.form)) await handleAuthSubmit(form);
    if (form.dataset.form === 'entry') await handleEntrySubmit(form);
    if (form.dataset.form === 'user') await handleUserSubmit(form);
    if (form.dataset.form === 'professional') await handleProfessionalSubmit(form);
  } catch (error) {
    showMessage(error.message);
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = previousLabel;
    }
  }
});

app.addEventListener('input', (event) => {
  if (event.target.matches('[data-range]')) {
    event.target.nextElementSibling.textContent = event.target.value;
  }

  if (event.target.matches('[data-role-select]')) {
    const show = event.target.value === 'professional';
    document.querySelectorAll('[data-professional-field]').forEach((field) => {
      field.hidden = !show;
      field.querySelector('input').required = show;
    });
  }
});

app.addEventListener('change', async (event) => {
  if (event.target.matches('[data-user-select]')) {
    state.selectedUserId = Number(event.target.value);
    try {
      await refresh();
    } catch (error) {
      showMessage(error.message);
    }
  }

  if (event.target.matches('[data-action="change-role"]')) {
    const userId = Number(event.target.dataset.id);
    const newRole = event.target.value;
    try {
      await api(`/api/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      });
      await refresh();
      showMessage(`Role atualizado para ${roleLabel(newRole)}.`);
    } catch (error) {
      showMessage(error.message);
      await refresh();
    }
  }
});

app.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;

  const action = button.dataset.action;
  const id = Number(button.dataset.id);

  try {
    if (action === 'refresh') await refresh();
    if (action === 'goto-perfil') {
      setRoute('perfil');
    }
    if (action === 'logout') {
      await api('/api/auth/logout', { method: 'POST' }).catch(() => null);
      clearSession();
      setRoute('login');
    }
    if (action === 'edit-entry') {
      state.editingEntryId = id;
      setRoute('check-in');
    }
    if (action === 'delete-entry') {
      await api(`/api/mood-entries/${id}`, { method: 'DELETE' });
      await refresh();
    }
    if (action === 'cancel-entry-edit') {
      state.editingEntryId = null;
      render();
    }
    if (action === 'toggle-theme') {
      toggleTheme();
    }
    if (action === 'open-exercise') {
      state.activeExerciseId = button.dataset.id;
      render();
    }
    if (action === 'close-exercise') {
      state.activeExerciseId = null;
      render();
    }
    if (action === 'set-materials-tab') {
      state.materialsFilter = button.dataset.tab || 'all';
      render();
    }
    if (action === 'toggle-favorite') {
      const materialId = button.dataset.id;
      if (state.favorites.has(materialId)) {
        state.favorites.delete(materialId);
      } else {
        state.favorites.add(materialId);
      }
      saveFavorites();
      render();
    }
    if (action === 'activate-premium') {
      try {
        const userId = state.currentUser?.id;
        if (!userId) {
          showMessage('Erro: usuário não encontrado');
          return;
        }
        const updated = await api(`/api/users/${userId}/premium`, {
          method: 'PATCH',
          body: JSON.stringify({ isPremium: true }),
        });
        state.currentUser = updated;
        state.isPremium = updated.isPremium;
        showMessage('Plano Premium ativado! (Demo)');
        render();
      } catch (error) {
        showMessage(error.message || 'Erro ao ativar plano Premium');
      }
    }
    if (action === 'select-user') {
      state.selectedUserId = id;
      await refresh();
      setRoute('historico');
    }
    if (action === 'edit-user') {
      state.editingUserId = id;
      setRoute('usuarios');
    }
    if (action === 'delete-user') {
      await api(`/api/users/${id}`, { method: 'DELETE' });
      if (state.selectedUserId === id) state.selectedUserId = state.currentUser?.id || null;
      await refresh();
    }
    if (action === 'cancel-user-edit') {
      state.editingUserId = null;
      render();
    }
    if (action === 'edit-professional') {
      state.editingProfessionalId = id;
      setRoute('profissionais');
    }
    if (action === 'delete-professional') {
      await api(`/api/professionals/${id}`, { method: 'DELETE' });
      await refresh();
    }
    if (action === 'cancel-professional-edit') {
      state.editingProfessionalId = null;
      render();
    }
  } catch (error) {
    showMessage(error.message);
  }
});

window.addEventListener('hashchange', () => {
  state.route = getRoute();
  render();
});

await loadSession();
await loadData();
render();