import './style.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const SESSION_KEY = 'mentalize.session';

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

function firstName(user = state.currentUser) {
  return user?.preferred_name || user?.name?.split(' ')[0] || 'voce';
}

function isProfessional() {
  return state.currentUser?.role === 'professional';
}

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };

  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 204) return null;

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Nao foi possivel concluir a acao.');
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
    const health = await api('/health');
    state.status = health.database === 'configured' ? 'Banco em nuvem conectado' : 'Modo demo local';
    state.users = await api('/api/users');
    state.professionals = isProfessional() ? await api('/api/professionals') : [];
    state.selectedUserId = isProfessional()
      ? state.selectedUserId || state.users[0]?.id || state.currentUser?.id || null
      : state.currentUser?.id || state.users[0]?.id || null;
    await loadEntries();
  } catch (error) {
    state.status = 'Backend indisponivel';
    state.message = error.message;
  }
}

async function loadEntries() {
  const query = isProfessional() && state.selectedUserId ? `?userId=${state.selectedUserId}` : '';
  // FIX: O backend retorna um array diretamente (não mais { items, pagination }).
  const result = await api(`/api/mood-entries${query}`);
  state.entries = Array.isArray(result) ? result : (result?.items ?? []);
  state.summary = await api(`/api/summary${query}`);
}

function navItem(route, label) {
  const active = state.route === route ? ' aria-current="page"' : '';
  return `<a href="#/${route}"${active}>${label}</a>`;
}

function renderBrand() {
  return `
    <a class="brand" href="#/${state.token ? 'painel' : 'login'}" aria-label="Mentalize">
      <span class="brand-mark">
        <img src="/logo.svg" alt="" onerror="this.hidden = true" />
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
          <span class="quiet-label">Plataforma de bem-estar mental</span>
          <h1>Acompanhamento emocional claro, leve e continuo.</h1>
          <p>Registre intensidade, contexto e padroes. Receba sugestoes adaptadas e compartilhe sua evolucao com profissionais autorizados.</p>
        </div>
        <div class="auth-proof">
          <span>Check-ins guiados</span>
          <span>CRP validado</span>
          <span>Historico inteligente</span>
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
            <option value="user">Usuario</option>
            <option value="professional">Profissional de saude mental</option>
          </select>
        </label>
        <label data-professional-field hidden>CRP<input name="crp" placeholder="06/123456" /></label>
        <label data-professional-field hidden>Especialidade<input name="specialty" placeholder="Psicologia clinica" /></label>
      </div>
      <button class="primary-button" type="submit">Criar conta</button>
      <p class="form-note">Ja tem conta? <a href="#/login">Entrar agora</a>.</p>
    </form>
  `;
}

function renderAppLayout() {
  return `
    <div class="app-shell">
      <aside class="sidebar">
        ${renderBrand()}
        <nav class="nav-links" aria-label="Navegacao principal">
          ${navItem('painel', 'Painel')}
          ${navItem('check-in', 'Check-in')}
          ${navItem('historico', 'Historico')}
          ${isProfessional() ? navItem('profissionais', 'Profissionais') : ''}
          ${isProfessional() ? navItem('usuarios', 'Usuarios') : ''}
          ${navItem('perfil', 'Perfil')}
        </nav>
        <div class="system-card">
          <span class="status-dot ${state.status.includes('indisponivel') ? 'offline' : ''}" aria-hidden="true"></span>
          <span>${escapeHtml(state.status)}</span>
        </div>
      </aside>

      <main class="content">
        <header class="topbar">
          <div>
            <p class="quiet-label">${escapeHtml(pageEyebrow())}</p>
            <h1>${escapeHtml(pageTitle())}</h1>
          </div>
          <div class="topbar-actions">
            <button class="ghost-button" type="button" data-action="refresh">Atualizar</button>
            <button class="ghost-button" type="button" data-action="logout">Sair</button>
          </div>
        </header>
        ${renderCurrentPage()}
      </main>
    </div>
  `;
}

function pageEyebrow() {
  const labels = {
    painel: `Ola, ${firstName()}`,
    'check-in': 'Registro emocional',
    historico: 'Padroes ao longo do tempo',
    profissionais: 'Rede de cuidado',
    usuarios: 'Acessos autorizados',
    perfil: 'Conta e preferencias',
  };
  return labels[state.route] || labels.painel;
}

function pageTitle() {
  const titles = {
    painel: 'Um painel calmo para acompanhar o que voce sente.',
    'check-in': 'Registre contexto, intensidade e sinais do dia.',
    historico: 'Veja registros e recorrencias com mais profundidade.',
    profissionais: 'Cadastre e valide profissionais pelo CRP.',
    usuarios: 'Gerencie usuarios e vinculos de acompanhamento.',
    perfil: 'Revise seus dados e o estado da integracao.',
  };
  return titles[state.route] || titles.painel;
}

function renderCurrentPage() {
  const pages = {
    painel: renderDashboard,
    'check-in': renderCheckIn,
    historico: renderHistory,
    profissionais: renderProfessionalsPage,
    usuarios: renderUsersPage,
    perfil: renderProfile,
  };
  return (pages[state.route] || renderDashboard)();
}

function renderDashboard() {
  const recommendation = state.summary?.recommendation || {};
  return `
    <section class="dashboard-hero">
      <div>
        <p class="quiet-label">Sugestao de agora</p>
        <h2>${escapeHtml(recommendation.title || 'Comece pelo primeiro check-in')}</h2>
        <p>${escapeHtml(recommendation.summary || 'Registre como voce esta para gerar orientacoes personalizadas.')}</p>
      </div>
      <div class="breathing-card" aria-label="Exercicio rapido">
        <span>2 min</span>
        <strong>Respirar</strong>
        <small>Inspire por 4, segure por 4, solte por 4.</small>
      </div>
    </section>

    ${renderMetrics()}

    <section class="split-grid">
      <div class="panel">
        <div class="panel-heading">
          <div>
            <p class="quiet-label">Proximas acoes</p>
            <h2>Recomendacoes</h2>
          </div>
        </div>
        <ul class="action-list">
          ${(recommendation.actions || ['Registrar humor de hoje', 'Adicionar contexto', 'Revisar historico'])
            .map((action) => `<li>${escapeHtml(action)}</li>`)
            .join('')}
        </ul>
      </div>
      <div class="panel">
        <div class="panel-heading">
          <div>
            <p class="quiet-label">Recentes</p>
            <h2>Ultimos registros</h2>
          </div>
          <a class="text-link" href="#/historico">Ver todos</a>
        </div>
        ${renderEntryList(state.entries.slice(0, 3))}
      </div>
    </section>
  `;
}

function renderMetrics() {
  const summary = state.summary || {};
  const items = [
    ['Registros', summary.total_entries || 0],
    ['Intensidade media', summary.average_intensity || 0],
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
          <label>Usuario${renderUserSelect(editing?.user_id)}</label>
          <label>Emocao
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
          <button class="primary-button span-2" type="submit">${editing ? 'Salvar edicao' : 'Salvar registro'}</button>
        </form>
      </div>

      <aside class="panel support-panel">
        <p class="quiet-label">Exercicios guiados</p>
        <div class="exercise-list">
          <article><strong>Respiracao quadrada</strong><span>4 ciclos para reduzir ativacao.</span></article>
          <article><strong>Nomear para organizar</strong><span>Diferencie emocao, pensamento e fato.</span></article>
          <article><strong>Micro-habito</strong><span>Escolha uma acao de 5 minutos.</span></article>
        </div>
      </aside>
    </section>
  `;
}

function renderUserSelect(selectedId) {
  if (!isProfessional()) {
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
  return `
    ${renderMetrics()}
    <section class="panel">
      <div class="panel-heading">
        <div>
          <p class="quiet-label">Linha do tempo</p>
          <h2>Registros emocionais</h2>
        </div>
        ${isProfessional() ? renderUserSelect(state.selectedUserId) : ''}
      </div>
      ${renderEntryList(state.entries)}
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
            <p>${escapeHtml(entry.notes || 'Sem observacoes.')}</p>
            <small>${formatDate(entry.created_at)} · intensidade ${entry.intensity}/10</small>
          </div>
          <div class="item-actions">
            <button type="button" data-action="edit-entry" data-id="${entry.id}">Editar</button>
            <button type="button" data-action="delete-entry" data-id="${entry.id}">Excluir</button>
          </div>
        </article>
      `).join('')}
    </div>
  `;
}

function renderProfessionalsPage() {
  const editing = state.professionals.find((professional) => professional.id === state.editingProfessionalId);
  return `
    <section class="split-grid">
      <div class="panel">
        <div class="panel-heading">
          <div>
            <p class="quiet-label">Cadastro profissional</p>
            <h2>${editing ? 'Editar profissional' : 'Novo profissional'}</h2>
          </div>
          ${editing ? '<button class="text-button" type="button" data-action="cancel-professional-edit">Cancelar</button>' : ''}
        </div>
        <form class="form-grid" data-form="professional">
          <label>Nome<input name="name" value="${escapeHtml(editing?.name || '')}" required /></label>
          <label>CRP<input name="crp" value="${escapeHtml(editing?.crp || '')}" placeholder="06/123456" required /></label>
          <label>Especialidade<input name="specialty" value="${escapeHtml(editing?.specialty || '')}" /></label>
          <label>Email<input name="email" type="email" value="${escapeHtml(editing?.email || '')}" required /></label>
          <button class="primary-button span-2" type="submit">${editing ? 'Salvar edicao' : 'Salvar profissional'}</button>
        </form>
      </div>

      <div class="panel">
        <div class="panel-heading">
          <div>
            <p class="quiet-label">CRP validado</p>
            <h2>Profissionais cadastrados</h2>
          </div>
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
            <span>${escapeHtml(professional.specialty || 'Especialidade nao informada')}</span>
            <small>CRP ${escapeHtml(professional.crp)} · ${professional.verified ? 'validado' : 'pendente'}</small>
          </div>
          <div class="item-actions">
            <button type="button" data-action="edit-professional" data-id="${professional.id}">Editar</button>
            <button type="button" data-action="delete-professional" data-id="${professional.id}">Excluir</button>
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
            <p class="quiet-label">Usuario</p>
            <h2>${editing ? 'Editar usuario' : 'Novo usuario'}</h2>
          </div>
          ${editing ? '<button class="text-button" type="button" data-action="cancel-user-edit">Cancelar</button>' : ''}
        </div>
        <form class="form-grid" data-form="user">
          <label>Nome<input name="name" value="${escapeHtml(editing?.name || '')}" required /></label>
          <label>Como prefere ser chamado<input name="preferred_name" value="${escapeHtml(editing?.preferred_name || '')}" /></label>
          <label class="span-2">Email<input name="email" type="email" value="${escapeHtml(editing?.email || '')}" required /></label>
          <button class="primary-button span-2" type="submit">${editing ? 'Salvar edicao' : 'Salvar usuario'}</button>
        </form>
      </div>

      <div class="panel">
        <div class="panel-heading">
          <div>
            <p class="quiet-label">Acompanhamento</p>
            <h2>Usuarios autorizados</h2>
          </div>
        </div>
        ${renderUserList()}
      </div>
    </section>
  `;
}

function renderUserList() {
  if (!state.users.length) {
    return '<p class="empty-state">Nenhum usuario cadastrado.</p>';
  }

  return `
    <div class="compact-list">
      ${state.users.map((user) => `
        <article class="list-row ${state.selectedUserId === user.id ? 'selected-row' : ''}">
          <div>
            <strong>${escapeHtml(user.preferred_name || user.name)}</strong>
            <span>${escapeHtml(user.email)}</span>
          </div>
          <div class="item-actions">
            <button type="button" data-action="select-user" data-id="${user.id}">Ver</button>
            <button type="button" data-action="edit-user" data-id="${user.id}">Editar</button>
            <button type="button" data-action="delete-user" data-id="${user.id}">Excluir</button>
          </div>
        </article>
      `).join('')}
    </div>
  `;
}

function renderProfile() {
  return `
    <section class="profile-grid">
      <div class="panel profile-card">
        <div class="avatar">${escapeHtml(firstName().slice(0, 1).toUpperCase())}</div>
        <h2>${escapeHtml(state.currentUser?.name || '')}</h2>
        <p>${escapeHtml(state.currentUser?.email || '')}</p>
      </div>
      <div class="panel">
        <p class="quiet-label">Integracao</p>
        <h2>Backend e banco</h2>
        <dl class="definition-list">
          <div><dt>API</dt><dd>${escapeHtml(API_URL)}</dd></div>
          <div><dt>Status</dt><dd>${escapeHtml(state.status)}</dd></div>
          <div><dt>Sessao</dt><dd>${state.token ? 'Ativa' : 'Inativa'}</dd></div>
        </dl>
      </div>
    </section>
  `;
}

function render() {
  state.route = getRoute();

  if (state.token && !isProfessional() && ['profissionais', 'usuarios'].includes(state.route)) {
    setRoute('painel');
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
  await loadData();
  render();
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
  showMessage('Usuario salvo.');
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
  if (!form) return;

  try {
    if (['login', 'register'].includes(form.dataset.form)) await handleAuthSubmit(form);
    if (form.dataset.form === 'entry') await handleEntrySubmit(form);
    if (form.dataset.form === 'user') await handleUserSubmit(form);
    if (form.dataset.form === 'professional') await handleProfessionalSubmit(form);
  } catch (error) {
    showMessage(error.message);
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
  if (!event.target.matches('[data-user-select]')) return;

  state.selectedUserId = Number(event.target.value);
  try {
    await refresh();
  } catch (error) {
    showMessage(error.message);
  }
});

app.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;

  const action = button.dataset.action;
  const id = Number(button.dataset.id);

  try {
    if (action === 'refresh') await refresh();
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
