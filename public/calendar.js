import { parseScheduleDate, dateToHours } from './availability-display.js';

const GRID_START = 7;
const GRID_END = 22;
const GRID_HOURS = GRID_END - GRID_START;
const HOUR_PX = 48;
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getWeekStart(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function startOfDay(d) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function endOfDay(d) {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
}

function formatDayHeader(d) {
  return `${DAY_NAMES[d.getDay()]}`;
}

function formatRangeTitle(viewMode, currentDate) {
  if (viewMode === 'day') {
    return `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getDate()}, ${currentDate.getFullYear()}`;
  }
  if (viewMode === 'month') {
    return `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  }
  const ws = getWeekStart(currentDate);
  const we = addDays(ws, 6);
  const sm = MONTH_NAMES[ws.getMonth()];
  if (ws.getMonth() === we.getMonth()) {
    return `${sm} ${ws.getDate()}–${we.getDate()}, ${ws.getFullYear()}`;
  }
  return `${sm} ${ws.getDate()} – ${MONTH_NAMES[we.getMonth()]} ${we.getDate()}, ${ws.getFullYear()}`;
}

function formatTime12(date) {
  let h = date.getHours();
  const m = date.getMinutes();
  const ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  return m ? `${h}:${String(m).padStart(2, '0')}${ampm}` : `${h}${ampm}`;
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function parseAndNormalizeEvents(agents) {
  const out = [];
  for (const agent of agents) {
    for (const av of agent.availabilities) {
      const start = parseScheduleDate(av.schedule?.start);
      if (!start) continue;
      let end = parseScheduleDate(av.schedule?.end);
      const openEnded = !end;
      if (!end) {
        end = new Date(start);
        end.setHours(end.getHours() + 1);
      }
      out.push({ agent, availability: av, start, end, role: av.role, openEnded });
    }
  }
  return out;
}

function filterEventsForRange(events, rangeStart, rangeEnd) {
  return events.filter((e) => e.start < rangeEnd && e.end > rangeStart);
}

function eventsForDay(events, day) {
  const ds = startOfDay(day);
  const de = endOfDay(day);
  return events.filter((e) => e.start <= de && e.end > ds);
}

function computeOverlapColumns(dayEvents) {
  const sorted = [...dayEvents].sort((a, b) => {
    const diff = a.start - b.start;
    if (diff !== 0) return diff;
    return (b.end - b.start) - (a.end - a.start);
  });

  const columns = [];
  for (const ev of sorted) {
    let placed = false;
    for (let c = 0; c < columns.length; c++) {
      const overlaps = columns[c].some(
        (other) => ev.start < other.end && ev.end > other.start,
      );
      if (!overlaps) {
        columns[c].push(ev);
        ev._col = c;
        placed = true;
        break;
      }
    }
    if (!placed) {
      ev._col = columns.length;
      columns.push([ev]);
    }
  }
  const total = columns.length || 1;
  for (const ev of sorted) ev._totalCols = total;
  return sorted;
}

function renderEventBlock(ev) {
  const startH = dateToHours(ev.start);
  const endH = dateToHours(ev.end);
  const top = (Math.max(startH, GRID_START) - GRID_START) * HOUR_PX;
  const bottom = (Math.min(endH, GRID_END) - GRID_START) * HOUR_PX;
  const height = Math.max(bottom - top, 18);
  const left = (ev._col / ev._totalCols) * 100;
  const width = (1 / ev._totalCols) * 100;
  const cls = ev.role === 'provider' ? 'cal-event--provider' : 'cal-event--receiver';
  const locName = ev.availability.location?.name || '';
  const timeStr = formatTime12(ev.start) + (ev.openEnded ? '+' : '–' + formatTime12(ev.end));

  return `<div class="cal-event ${cls}" style="top:${top}px;height:${height}px;left:${left}%;width:${width}%"
    title="${esc(ev.agent.name)}\n${esc(locName)}\n${esc(timeStr)}">
    <div class="cal-event-name">${esc(ev.agent.name)}</div>
    <div class="cal-event-loc">${esc(locName)}</div>
    <div class="cal-event-time">${esc(timeStr)}</div>
  </div>`;
}

function renderHourLines() {
  let html = '';
  for (let h = 0; h <= GRID_HOURS; h++) {
    html += `<div class="cal-hour-line" style="top:${h * HOUR_PX}px"></div>`;
  }
  return html;
}

function renderGutter() {
  let html = '';
  for (let h = GRID_START; h <= GRID_END; h++) {
    const label = h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`;
    html += `<div class="cal-gutter-label">${label}</div>`;
  }
  return html;
}

function renderToolbar(viewMode, currentDate) {
  const title = formatRangeTitle(viewMode, currentDate);
  return `<div class="cal-toolbar">
    <div class="cal-nav">
      <button data-action="prev" aria-label="Previous">&lsaquo;</button>
      <button data-action="next" aria-label="Next">&rsaquo;</button>
    </div>
    <button class="cal-today" data-action="today">Today</button>
    <span class="cal-title">${esc(title)}</span>
    <div class="cal-views">
      <button data-action="view-day" class="${viewMode === 'day' ? 'active' : ''}">Day</button>
      <button data-action="view-week" class="${viewMode === 'week' ? 'active' : ''}">Week</button>
      <button data-action="view-month" class="${viewMode === 'month' ? 'active' : ''}">Month</button>
    </div>
  </div>`;
}

function renderDayStrip(weekStart, selectedDay) {
  let html = '<div class="cal-day-strip">';
  for (let i = 0; i < 7; i++) {
    const d = addDays(weekStart, i);
    const active = sameDay(d, selectedDay) ? ' active' : '';
    html += `<button data-action="pick-day" data-day-offset="${i}" class="${active}">${DAY_LETTERS[d.getDay()]}<br>${d.getDate()}</button>`;
  }
  html += '</div>';
  return html;
}

function renderWeekView(events, currentDate, selectedDayIndex) {
  const ws = getWeekStart(currentDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const colHeight = GRID_HOURS * HOUR_PX;

  let strip = renderDayStrip(ws, addDays(ws, selectedDayIndex));

  let html = strip + '<div class="cal-scroll"><div class="cal-grid cal-grid--week">';
  html += '<div class="cal-corner"></div>';

  for (let i = 0; i < 7; i++) {
    const d = addDays(ws, i);
    const isToday = sameDay(d, today);
    const sel = i === selectedDayIndex ? ' cal-day--selected' : '';
    html += `<div class="cal-day-header${isToday ? ' cal-today' : ''}${sel}">
      ${formatDayHeader(d)} <span class="cal-day-num">${d.getDate()}</span>
    </div>`;
  }

  html += `<div class="cal-gutter">${renderGutter()}</div>`;

  for (let i = 0; i < 7; i++) {
    const d = addDays(ws, i);
    const sel = i === selectedDayIndex ? ' cal-day--selected' : '';
    const dayEvts = eventsForDay(events, d);
    computeOverlapColumns(dayEvts);
    html += `<div class="cal-day-col${sel}" style="height:${colHeight}px">`;
    html += renderHourLines();
    for (const ev of dayEvts) html += renderEventBlock(ev);
    html += '</div>';
  }

  html += '</div></div>';
  return html;
}

function renderDayView(events, currentDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const colHeight = GRID_HOURS * HOUR_PX;

  let html = '<div class="cal-scroll"><div class="cal-grid cal-grid--day">';
  const isToday = sameDay(currentDate, today);
  html += '<div class="cal-corner"></div>';
  html += `<div class="cal-day-header${isToday ? ' cal-today' : ''}">
    ${formatDayHeader(currentDate)} <span class="cal-day-num">${currentDate.getDate()}</span>
  </div>`;

  html += `<div class="cal-gutter">${renderGutter()}</div>`;

  const dayEvts = eventsForDay(events, currentDate);
  computeOverlapColumns(dayEvts);
  html += `<div class="cal-day-col" style="height:${colHeight}px">`;
  html += renderHourLines();
  for (const ev of dayEvts) html += renderEventBlock(ev);
  html += '</div>';

  html += '</div></div>';
  return html;
}

function renderMonthView(events, currentDate) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let startOffset = firstDay.getDay() - 1;
  if (startOffset < 0) startOffset = 6;

  const gridStart = addDays(firstDay, -startOffset);
  const totalCells = Math.ceil((startOffset + lastDay.getDate()) / 7) * 7;

  let html = '<div class="cal-month">';
  for (const name of ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']) {
    html += `<div class="cal-month-header">${name}</div>`;
  }

  const MAX_DOTS = 5;
  for (let i = 0; i < totalCells; i++) {
    const d = addDays(gridStart, i);
    const outside = d.getMonth() !== month;
    const isToday = sameDay(d, today);
    const cls = [
      'cal-month-cell',
      outside ? 'cal-outside' : '',
      isToday ? 'cal-today' : '',
    ].filter(Boolean).join(' ');

    const dayEvts = eventsForDay(events, d);
    const providers = dayEvts.filter((e) => e.role === 'provider');
    const receivers = dayEvts.filter((e) => e.role === 'receiver');

    let dots = '';
    const total = providers.length + receivers.length;
    if (total > 0) {
      dots = '<div class="cal-month-dots">';
      let shown = 0;
      for (let p = 0; p < Math.min(providers.length, MAX_DOTS); p++) {
        dots += '<span class="cal-dot cal-dot--provider"></span>';
        shown++;
      }
      for (let r = 0; r < Math.min(receivers.length, MAX_DOTS - shown); r++) {
        dots += '<span class="cal-dot cal-dot--receiver"></span>';
        shown++;
      }
      if (total > shown) {
        dots += `<span class="cal-month-more">+${total - shown}</span>`;
      }
      dots += '</div>';
    }

    html += `<div class="${cls}" data-action="month-day" data-date="${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}">
      <div class="cal-month-num">${d.getDate()}</div>${dots}
    </div>`;
  }

  html += '</div>';
  return html;
}

export function createCalendar(container, { onRangeChange } = {}) {
  let viewMode = 'week';
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);
  let selectedDayIndex = 0;
  let events = [];
  let initialJumpDone = false;

  function getRange() {
    if (viewMode === 'day') {
      return { start: startOfDay(currentDate), end: endOfDay(currentDate) };
    }
    if (viewMode === 'month') {
      const y = currentDate.getFullYear();
      const m = currentDate.getMonth();
      return { start: new Date(y, m, 1), end: new Date(y, m + 1, 0, 23, 59, 59, 999) };
    }
    const ws = getWeekStart(currentDate);
    return { start: ws, end: endOfDay(addDays(ws, 6)) };
  }

  function render() {
    let html = renderToolbar(viewMode, currentDate);
    if (viewMode === 'week') {
      html += renderWeekView(events, currentDate, selectedDayIndex);
    } else if (viewMode === 'day') {
      html += renderDayView(events, currentDate);
    } else {
      html += renderMonthView(events, currentDate);
    }
    container.innerHTML = html;

    if (viewMode === 'week' || viewMode === 'day') {
      const scroll = container.querySelector('.cal-scroll');
      if (scroll) scroll.scrollTop = (8 - GRID_START) * HOUR_PX;
    }
  }

  function navigate(dir) {
    if (viewMode === 'day') {
      currentDate = addDays(currentDate, dir);
    } else if (viewMode === 'week') {
      currentDate = addDays(currentDate, dir * 7);
    } else {
      currentDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + dir,
        1,
      );
    }
    render();
    if (onRangeChange) onRangeChange(getRange().start, getRange().end);
  }

  container.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;

    if (action === 'prev') navigate(-1);
    else if (action === 'next') navigate(1);
    else if (action === 'today') {
      currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);
      selectedDayIndex = 0;
      render();
      if (onRangeChange) onRangeChange(getRange().start, getRange().end);
    } else if (action === 'view-day') {
      viewMode = 'day';
      render();
      if (onRangeChange) onRangeChange(getRange().start, getRange().end);
    } else if (action === 'view-week') {
      viewMode = 'week';
      render();
      if (onRangeChange) onRangeChange(getRange().start, getRange().end);
    } else if (action === 'view-month') {
      viewMode = 'month';
      render();
      if (onRangeChange) onRangeChange(getRange().start, getRange().end);
    } else if (action === 'month-day') {
      const parts = btn.dataset.date.split('-');
      currentDate = new Date(+parts[0], +parts[1] - 1, +parts[2]);
      viewMode = 'day';
      render();
      if (onRangeChange) onRangeChange(getRange().start, getRange().end);
    } else if (action === 'pick-day') {
      selectedDayIndex = parseInt(btn.dataset.dayOffset, 10);
      render();
    }
  });

  return {
    setEvents(agents) {
      events = parseAndNormalizeEvents(agents);
      if (!initialJumpDone && events.length > 0) {
        initialJumpDone = true;
        const earliest = events.reduce(
          (min, e) => (e.start < min ? e.start : min),
          events[0].start,
        );
        currentDate = new Date(earliest);
        currentDate.setHours(0, 0, 0, 0);
        selectedDayIndex = (currentDate.getDay() + 6) % 7;
      }
      render();
    },
    getRange,
    destroy() {
      container.innerHTML = '';
    },
  };
}
