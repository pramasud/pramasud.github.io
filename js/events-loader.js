(function () {
  'use strict';

  var MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

  function parseCSV(text) {
    var rows = [];
    var row = [];
    var field = '';
    var inQuotes = false;

    for (var i = 0; i < text.length; i++) {
      var c = text[i];

      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else { inQuotes = false; }
        } else {
          field += c;
        }
        continue;
      }

      if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        row.push(field);
        field = '';
      } else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else {
        field += c;
      }
    }
    if (field.length || row.length) {
      row.push(field);
      rows.push(row);
    }

    return rows.filter(function (r) {
      return r.some(function (cell) { return cell.trim() !== ''; });
    });
  }

  function sanitize(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function pad(n) {
    return (n < 10 ? '0' : '') + n;
  }

  function dayKey(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  // Accepts "16-Oct-2026 06:14 AM", "16-Oct-2026", "2026-10-16" or "2026-10-16 18:00".
  // Returns { when: Date, hasTime: bool } or null.
  function parseEventDate(str) {
    var m = str.match(/^(\d{1,2})-([A-Za-z]{3})[A-Za-z]*-(\d{4})(?:\s+(\d{1,2}):(\d{2})\s*([AaPp][Mm])?)?$/);
    var year, month, day, hour = 0, minute = 0, hasTime = false;

    if (m) {
      month = MONTHS[m[2].toLowerCase()];
      if (month === undefined) return null;
      day = +m[1];
      year = +m[3];
      if (m[4]) {
        hasTime = true;
        hour = +m[4];
        minute = +m[5];
        if (m[6]) {
          var pm = m[6].toLowerCase() === 'pm';
          if (hour === 12) hour = 0;
          if (pm) hour += 12;
        }
      }
    } else {
      m = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2}))?$/);
      if (!m) return null;
      year = +m[1];
      month = +m[2] - 1;
      day = +m[3];
      if (m[4]) {
        hasTime = true;
        hour = +m[4];
        minute = +m[5];
      }
    }

    var when = new Date(year, month, day, hour, minute);
    if (isNaN(when.getTime())) return null;
    return { when: when, hasTime: hasTime };
  }

  function formatDay(d) {
    return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  function formatTime(d) {
    var h = d.getHours();
    var suffix = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return pad(h) + ':' + pad(d.getMinutes()) + ' ' + suffix;
  }

  function getEvents(text, type) {
    var rows = parseCSV(text);
    if (rows.length <= 1) return [];

    var header = rows[0].map(function (h) { return h.trim().toLowerCase(); });
    var dateIdx = header.indexOf('date');
    var titleIdx = header.indexOf('title');
    var descIdx = header.indexOf('description');

    return rows.slice(1)
      .map(function (r) {
        var parsed = parseEventDate((r[dateIdx] || '').trim());
        return {
          type: type,
          when: parsed ? parsed.when : null,
          hasTime: parsed ? parsed.hasTime : false,
          title: (r[titleIdx] || '').trim(),
          description: (r[descIdx] || '').trim()
        };
      })
      .filter(function (ev) { return ev.title; });
  }

  // Groups events into days sorted by date; undated events go into a final "TBA" group.
  function groupByDay(events) {
    var groups = {};
    var undated = [];

    events.forEach(function (ev) {
      if (!ev.when) { undated.push(ev); return; }
      var key = dayKey(ev.when);
      if (!groups[key]) groups[key] = { key: key, date: ev.when, events: [] };
      groups[key].events.push(ev);
    });

    var days = Object.keys(groups).sort().map(function (key) {
      groups[key].events.sort(function (a, b) { return a.when - b.when; });
      return groups[key];
    });

    if (undated.length) days.push({ key: null, date: null, events: undated });
    return days;
  }

  function renderCard(ev) {
    return (
      '<div class="festival-box event-box ' + ev.type + '">' +
        (ev.hasTime ? '<div class="event-date">' + sanitize(formatTime(ev.when)) + '</div>' : '') +
        '<h4>' + sanitize(ev.title) + '</h4>' +
        '<p>' + sanitize(ev.description) + '</p>' +
      '</div>'
    );
  }

  function renderCell(events, type, label, colClass) {
    var items = events.filter(function (ev) { return ev.type === type; });
    return (
      '<div class="' + colClass + ' event-day-cell">' +
        (items.length ? '<h5 class="event-day-cell-title">' + label + '</h5>' : '') +
        items.map(renderCard).join('') +
      '</div>'
    );
  }

  function renderDays(container, days, showPuja, showCultural, todayKey) {
    var colClass = showPuja && showCultural ? 'col-md-6' : 'col-12';

    container.innerHTML = days.map(function (day) {
      var state = '';
      if (day.key && day.key < todayKey) state = ' past';
      else if (day.key === todayKey) state = ' today';

      return (
        '<div class="event-day' + state + '"' + (day.key ? ' data-day="' + day.key + '"' : '') + '>' +
          '<div class="event-day-header">' +
            (day.date ? sanitize(formatDay(day.date)) : 'Date to be announced') +
            (state === ' today' ? '<span class="event-day-badge">Today</span>' : '') +
          '</div>' +
          '<div class="row">' +
            (showPuja ? renderCell(day.events, 'puja', 'Puja Events', colClass) : '') +
            (showCultural ? renderCell(day.events, 'cultural', 'Cultural Events', colClass) : '') +
          '</div>' +
        '</div>'
      );
    }).join('');
  }

  // Scroll to today's box, else the next upcoming day, else (all past) the last day.
  function scrollToCurrentDay(container, todayKey) {
    var boxes = container.querySelectorAll('.event-day[data-day]');
    if (!boxes.length) return;

    var target = null;
    for (var i = 0; i < boxes.length; i++) {
      if (boxes[i].getAttribute('data-day') >= todayKey) { target = boxes[i]; break; }
    }
    if (!target) target = boxes[boxes.length - 1];
    if (target === boxes[0]) return;

    var top = target.getBoundingClientRect().top + window.pageYOffset - 20;
    window.scrollTo({ top: top, behavior: 'smooth' });
  }

  function fetchEvents(path, type) {
    return fetch(path, { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to load ' + path);
        return res.text();
      })
      .then(function (text) { return getEvents(text, type); })
      .catch(function () { return []; });
  }

  function init() {
    var container = document.getElementById('events-days');
    var columnsHead = document.getElementById('events-columns-head');
    if (!container) return;

    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

    Promise.all([
      fetchEvents('data/puja-events.csv', 'puja'),
      fetchEvents('data/cultural-events.csv', 'cultural')
    ]).then(function (results) {
      var pujaEvents = results[0];
      var culturalEvents = results[1];
      var showPuja = pujaEvents.length > 0;
      var showCultural = culturalEvents.length > 0;

      if (!showPuja && !showCultural) {
        container.innerHTML = '<p class="events-empty-msg">No events at this time.</p>';
        if (columnsHead) columnsHead.style.display = 'none';
        return;
      }

      // Column headings only make sense when both columns are shown side by side.
      if (columnsHead && !(showPuja && showCultural)) columnsHead.style.display = 'none';
      if (!(showPuja && showCultural)) container.classList.add('single-column');

      var todayKey = dayKey(new Date());
      renderDays(container, groupByDay(pujaEvents.concat(culturalEvents)), showPuja, showCultural, todayKey);
      requestAnimationFrame(function () { scrollToCurrentDay(container, todayKey); });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
