const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export function renderCharts(analytics, escapeHtml) {
  if (!analytics) {
    return '<p class="empty-state">Faça check-ins para liberar os gráficos.</p>';
  }

  return `
    <section class="charts-grid" aria-label="Visualizações">
      ${renderMonthlyCalendar(analytics.calendar, escapeHtml)}
      ${renderIntensityTrend(analytics.trend, escapeHtml)}
      ${renderEmotionBars(analytics.emotions, escapeHtml)}
      ${renderContextBars(analytics.by_context, escapeHtml)}
    </section>
  `;
}

function intensityLevel(value) {
  if (value == null || value === 0) return 0;
  if (value <= 3) return 1;
  if (value <= 5) return 2;
  if (value <= 7) return 3;
  return 4;
}

function renderMonthlyCalendar(calendar, escapeHtml) {
  if (!calendar?.days?.length) {
    return chartPanel('Calendário mensal', '<p class="chart-empty">Sem dados neste mês.</p>');
  }

  const today = new Date();
  const isCurrentMonth = calendar.year === today.getFullYear() && calendar.month === today.getMonth() + 1;
  const blanks = Array.from({ length: calendar.first_weekday }, () => '<span class="cal-cell cal-blank"></span>');
  const cells = calendar.days.map((day) => {
    const level = day.count ? intensityLevel(day.avg_intensity) : 0;
    const isToday = isCurrentMonth && day.day === today.getDate();
    const title = day.count
      ? `${day.count} registro(s) · intensidade média ${day.avg_intensity}`
      : 'Sem registros';
    return `
      <span
        class="cal-cell cal-level-${level}${isToday ? ' cal-today' : ''}"
        title="${escapeHtml(title)}"
      >
        <span class="cal-day">${day.day}</span>
        ${day.count ? `<span class="cal-dot" aria-hidden="true"></span>` : ''}
      </span>
    `;
  });

  return chartPanel(
    'Calendário mensal',
    `
      <p class="chart-subtitle">${escapeHtml(calendar.month_label)}</p>
      <div class="cal-weekdays">
        ${WEEKDAYS.map((label) => `<span>${label}</span>`).join('')}
      </div>
      <div class="cal-grid">${blanks.join('')}${cells.join('')}</div>
      <div class="cal-legend">
        <span>menos</span>
        <span class="cal-level-1"></span>
        <span class="cal-level-2"></span>
        <span class="cal-level-3"></span>
        <span class="cal-level-4"></span>
        <span>mais</span>
      </div>
    `,
  );
}

function renderIntensityTrend(trend, escapeHtml) {
  if (!trend?.length) {
    return chartPanel('Intensidade (14 dias)', '<p class="chart-empty">Sem histórico recente.</p>');
  }

  const values = trend.map((point) => point.avg_intensity ?? 0);
  const max = Math.max(10, ...values);
  const width = 320;
  const height = 120;
  const step = width / Math.max(trend.length - 1, 1);
  const points = trend.map((point, index) => {
    const value = point.avg_intensity ?? 0;
    const x = index * step;
    const y = height - (value / max) * (height - 16) - 8;
    return `${x},${y}`;
  });
  const polyline = points.join(' ');
  const bars = trend
    .map((point, index) => {
      const value = point.count ? point.avg_intensity ?? 0 : 0;
      const barHeight = (value / max) * 100;
      return `
        <div class="trend-bar" style="--h: ${barHeight}%">
          <span class="trend-tooltip">${escapeHtml(point.label)}${point.count ? ` · ${point.avg_intensity}` : ''}</span>
        </div>
      `;
    })
    .join('');

  return chartPanel(
    'Intensidade (14 dias)',
    `
      <svg class="trend-line" viewBox="0 0 ${width} ${height}" role="img" aria-label="Linha de intensidade média nos últimos 14 dias">
        <polyline points="${polyline}" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <div class="trend-bars">${bars}</div>
      <div class="trend-labels">
        ${trend.filter((_, index) => index % 2 === 0).map((point) => `<span>${escapeHtml(point.label)}</span>`).join('')}
      </div>
    `,
  );
}

function renderEmotionBars(emotions, escapeHtml) {
  if (!emotions?.length) {
    return chartPanel('Emoções', '<p class="chart-empty">Nenhuma emoção registrada.</p>');
  }

  const max = Math.max(...emotions.map((item) => item.count), 1);
  const rows = emotions
    .slice(0, 6)
    .map(
      (item) => `
      <div class="bar-row">
        <span class="bar-label">${escapeHtml(item.emotion)}</span>
        <div class="bar-track"><span class="bar-fill" style="width: ${(item.count / max) * 100}%"></span></div>
        <span class="bar-value">${item.count}</span>
      </div>
    `,
    )
    .join('');

  return chartPanel('Emoções', rows);
}

function renderContextBars(contexts, escapeHtml) {
  if (!contexts?.length) {
    return chartPanel('Contextos', '<p class="chart-empty">Adicione contexto nos check-ins.</p>');
  }

  const max = Math.max(...contexts.map((item) => item.count), 1);
  const rows = contexts
    .map(
      (item) => `
      <div class="bar-row">
        <span class="bar-label">${escapeHtml(item.context)}</span>
        <div class="bar-track"><span class="bar-fill bar-fill-muted" style="width: ${(item.count / max) * 100}%"></span></div>
        <span class="bar-value">${item.count}</span>
      </div>
    `,
    )
    .join('');

  return chartPanel('Contextos', rows);
}

function chartPanel(title, body) {
  return `
    <article class="chart-card panel">
      <header class="chart-card-head">
        <h3>${title}</h3>
      </header>
      <div class="chart-card-body">${body}</div>
    </article>
  `;
}
