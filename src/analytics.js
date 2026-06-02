export function buildAnalyticsFromEntries(entries) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const byEmotion = {};
  const byDay = {};
  const calendarDays = {};

  entries.forEach((entry) => {
    const intensity = Number(entry.intensity);
    const emotion = entry.emotion;

    if (!byEmotion[emotion]) {
      byEmotion[emotion] = { count: 0, totalIntensity: 0 };
    }
    byEmotion[emotion].count += 1;
    byEmotion[emotion].totalIntensity += intensity;

    const createdAt = new Date(entry.created_at);
    const dayKey = createdAt.toISOString().slice(0, 10);
    if (!byDay[dayKey]) {
      byDay[dayKey] = { count: 0, totalIntensity: 0 };
    }
    byDay[dayKey].count += 1;
    byDay[dayKey].totalIntensity += intensity;

    if (createdAt.getFullYear() === year && createdAt.getMonth() === month) {
      const day = createdAt.getDate();
      if (!calendarDays[day]) {
        calendarDays[day] = { count: 0, totalIntensity: 0 };
      }
      calendarDays[day].count += 1;
      calendarDays[day].totalIntensity += intensity;
    }
  });

  const trend = [];
  for (let offset = 13; offset >= 0; offset -= 1) {
    const date = new Date(now);
    date.setDate(date.getDate() - offset);
    const key = date.toISOString().slice(0, 10);
    const bucket = byDay[key];
    trend.push({
      date: key,
      label: date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
      avg_intensity: bucket ? Number((bucket.totalIntensity / bucket.count).toFixed(1)) : null,
      count: bucket?.count || 0,
    });
  }

  const emotions = Object.entries(byEmotion)
    .map(([emotion, bucket]) => ({
      emotion,
      count: bucket.count,
      avg_intensity: Number((bucket.totalIntensity / bucket.count).toFixed(1)),
    }))
    .sort((a, b) => b.count - a.count);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const contexts = entries.reduce((acc, entry) => {
    if (entry.context) acc[entry.context] = (acc[entry.context] || 0) + 1;
    return acc;
  }, {});

  return {
    emotions,
    trend,
    calendar: {
      year,
      month: month + 1,
      month_label: now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
      first_weekday: new Date(year, month, 1).getDay(),
      days: Array.from({ length: daysInMonth }, (_, index) => {
        const day = index + 1;
        const bucket = calendarDays[day];
        return {
          day,
          count: bucket?.count || 0,
          avg_intensity: bucket ? Number((bucket.totalIntensity / bucket.count).toFixed(1)) : null,
        };
      }),
    },
    by_context: Object.entries(contexts)
      .map(([context, count]) => ({ context, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6),
  };
}

export function resolveAnalytics(summary, entries) {
  if (summary?.analytics) return summary.analytics;
  return buildAnalyticsFromEntries(entries);
}
