(function () {
  'use strict';

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

  function formatDate(dateStr) {
    var d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function getUpcomingEvents(text) {
    var rows = parseCSV(text);
    if (rows.length <= 1) return [];

    var header = rows[0].map(function (h) { return h.trim().toLowerCase(); });
    var dateIdx = header.indexOf('date');
    var titleIdx = header.indexOf('title');
    var descIdx = header.indexOf('description');

    var today = new Date();
    today.setHours(0, 0, 0, 0);

    return rows.slice(1)
      .map(function (r) {
        return {
          date: (r[dateIdx] || '').trim(),
          title: (r[titleIdx] || '').trim(),
          description: (r[descIdx] || '').trim()
        };
      })
      .filter(function (ev) { return ev.title; })
      .filter(function (ev) {
        if (!ev.date) return true;
        var d = new Date(ev.date + 'T00:00:00');
        return isNaN(d.getTime()) || d >= today;
      })
      .sort(function (a, b) {
        return new Date(a.date || '9999-12-31') - new Date(b.date || '9999-12-31');
      });
  }

  function renderColumn(container, events, cssModifier, emptyMsg) {
    if (!events.length) {
      container.innerHTML = '<div class="col-12"><p class="events-empty-msg">' + sanitize(emptyMsg) + '</p></div>';
      return;
    }
    container.innerHTML = events.map(function (ev) {
      return (
        '<div class="col-12">' +
          '<div class="festival-box event-box ' + cssModifier + '">' +
            (ev.date ? '<div class="event-date">' + sanitize(formatDate(ev.date)) + '</div>' : '') +
            '<h4>' + sanitize(ev.title) + '</h4>' +
            '<p>' + sanitize(ev.description) + '</p>' +
          '</div>' +
        '</div>'
      );
    }).join('');
  }

  function fetchEvents(path) {
    return fetch(path, { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to load ' + path);
        return res.text();
      })
      .then(getUpcomingEvents)
      .catch(function () { return []; });
  }

  function init() {
    var pujaColumn = document.getElementById('puja-events-column');
    var culturalColumn = document.getElementById('cultural-events-column');
    var pujaContainer = document.getElementById('puja-events-container');
    var culturalContainer = document.getElementById('cultural-events-container');

    if (!pujaContainer || !culturalContainer) return;

    Promise.all([
      fetchEvents('data/puja-events.csv'),
      fetchEvents('data/cultural-events.csv')
    ]).then(function (results) {
      var pujaEvents = results[0];
      var culturalEvents = results[1];

      renderColumn(pujaContainer, pujaEvents, 'puja', 'No upcoming Puja events at this time.');
      renderColumn(culturalContainer, culturalEvents, 'cultural', 'No upcoming Cultural events at this time.');

      if (!culturalEvents.length && pujaEvents.length && culturalColumn && pujaColumn) {
        culturalColumn.style.display = 'none';
        pujaColumn.classList.remove('col-md-6');
        pujaColumn.classList.add('col-md-12');
      } else if (!pujaEvents.length && culturalEvents.length && pujaColumn && culturalColumn) {
        pujaColumn.style.display = 'none';
        culturalColumn.classList.remove('col-md-6');
        culturalColumn.classList.add('col-md-12');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
