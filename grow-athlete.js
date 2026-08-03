/* =========================================================
   THE PERFORMANCE ACT — ATHLETE SKILLS JOURNAL
   grow-athlete.js v1

   One shared engine for every page in the athlete area.

   Everything an athlete writes is stored ONLY in their own
   browser (localStorage). Nothing is sent anywhere. The
   journal page reads the same store back and lets them
   print or download it.

   Markup contract
   ---------------
   <textarea data-aj="open.struggle.cost"
             data-aj-tool="The Struggle Switch"
             data-aj-q="What has the struggle cost you?"></textarea>

   data-aj      unique storage key (also groups by the bit
                before the first dot: open / aware / engaged / brain)
   data-aj-tool the tool it belongs to (shown in the journal)
   data-aj-q    the question (shown in the journal)

   Works on <input>, <textarea>, <select> and range sliders.
   Chip groups use [data-aj-chips], check rows [data-aj-check],
   list builders [data-aj-builder].
   ========================================================= */

(function () {
  'use strict';

  var NS = 'pact_aj_v1_';
  var META = NS + '__meta';

  /* ---------------------------------------------------------
     Storage helpers — never throw, even in private browsing
     --------------------------------------------------------- */

  var store = {
    get: function (k) {
      try { return localStorage.getItem(NS + k); } catch (e) { return null; }
    },
    set: function (k, v) {
      try { localStorage.setItem(NS + k, v); } catch (e) {}
    },
    remove: function (k) {
      try { localStorage.removeItem(NS + k); } catch (e) {}
    },
    keys: function () {
      var out = [];
      try {
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k && k.indexOf(NS) === 0 && k !== META) out.push(k.slice(NS.length));
        }
      } catch (e) {}
      return out;
    }
  };

  /* Meta = the question / tool / timestamp for each saved key,
     so the journal page can render entries it has never seen. */
  function readMeta() {
    try { return JSON.parse(localStorage.getItem(META) || '{}'); }
    catch (e) { return {}; }
  }
  function writeMeta(m) {
    try { localStorage.setItem(META, JSON.stringify(m)); } catch (e) {}
  }
  function noteMeta(key, tool, question, pillar) {
    var m = readMeta();
    m[key] = {
      tool: tool || (m[key] && m[key].tool) || '',
      q: question || (m[key] && m[key].q) || '',
      pillar: pillar || (m[key] && m[key].pillar) || key.split('.')[0],
      at: Date.now()
    };
    writeMeta(m);
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /* ---------------------------------------------------------
     Saved-badge helper
     --------------------------------------------------------- */

  function badgeFor(el) {
    var key = el.getAttribute('data-aj');
    return document.querySelector('[data-aj-saved="' + key + '"]');
  }
  function flagSaved(el, state) {
    var b = badgeFor(el);
    if (!b) return;
    b.style.opacity = state === 'typing' ? '0.4' : (state === 'saved' ? '1' : '0');
  }

  /* ---------------------------------------------------------
     1. Autosave every [data-aj] field
     --------------------------------------------------------- */

  function bindFields(root) {
    (root || document).querySelectorAll('[data-aj]').forEach(function (el) {
      var tag = el.tagName.toLowerCase();
      if (tag !== 'input' && tag !== 'textarea' && tag !== 'select') return;

      var key = el.getAttribute('data-aj');
      var saved = store.get(key);

      if (saved !== null) {
        el.value = saved;
        flagSaved(el, 'saved');
        el.dispatchEvent(new Event('aj:restored', { bubbles: true }));
      } else if (tag !== 'input' || el.type !== 'range') {
        /* Anything typed before the engine finished binding would otherwise
           be lost if the athlete then stopped typing. Capture it now. */
        if ((el.value || '').trim() !== '') {
          store.set(key, el.value);
          noteMeta(key, el.getAttribute('data-aj-tool'), el.getAttribute('data-aj-q'));
          flagSaved(el, 'saved');
        }
      }

      var timer;
      var handler = function () {
        flagSaved(el, 'typing');
        clearTimeout(timer);
        timer = setTimeout(function () {
          var v = el.value;
          if (v === '' || v == null) {
            store.remove(key);
            flagSaved(el, 'empty');
          } else {
            store.set(key, v);
            noteMeta(key, el.getAttribute('data-aj-tool'), el.getAttribute('data-aj-q'));
            flagSaved(el, 'saved');
          }
          updateProgress();
        }, 350);
      };

      el.addEventListener('input', handler);
      el.addEventListener('change', handler);
    });
  }

  /* ---------------------------------------------------------
     2. Range sliders — live number + save
     --------------------------------------------------------- */

  function bindSliders(root) {
    (root || document).querySelectorAll('input[type=range][data-aj-out]').forEach(function (el) {
      var out = document.getElementById(el.getAttribute('data-aj-out'));
      var paint = function () { if (out) out.textContent = el.value; };
      paint();
      el.addEventListener('input', paint);
      el.addEventListener('aj:restored', paint);
    });
  }

  /* ---------------------------------------------------------
     3. Chip groups — multi or single select, saved as a
        comma-separated list
     --------------------------------------------------------- */

  function bindChips(root) {
    (root || document).querySelectorAll('[data-aj-chips]').forEach(function (group) {
      var key = group.getAttribute('data-aj-chips');
      var single = group.hasAttribute('data-aj-single');
      var max = parseInt(group.getAttribute('data-aj-max') || '0', 10);
      var counter = group.getAttribute('data-aj-counter')
        ? document.getElementById(group.getAttribute('data-aj-counter')) : null;
      var chips = Array.prototype.slice.call(group.querySelectorAll('.aj-chip'));

      function selected() {
        return chips.filter(function (c) { return c.getAttribute('aria-pressed') === 'true'; })
          .map(function (c) { return c.textContent.trim(); });
      }

      function paintCounter() {
        if (!counter) return;
        var n = selected().length;
        counter.textContent = max ? (n + ' of ' + max + ' chosen') : (n + ' chosen');
      }

      function persist() {
        var list = selected();
        if (list.length) {
          store.set(key, list.join(', '));
          noteMeta(key, group.getAttribute('data-aj-tool'), group.getAttribute('data-aj-q'));
        } else {
          store.remove(key);
        }
        paintCounter();
        updateProgress();
        group.dispatchEvent(new CustomEvent('aj:chips', { detail: { selected: list }, bubbles: true }));
      }

      /* restore */
      var savedRaw = store.get(key);
      if (savedRaw) {
        var savedList = savedRaw.split(',').map(function (s) { return s.trim(); });
        chips.forEach(function (c) {
          if (savedList.indexOf(c.textContent.trim()) > -1) c.setAttribute('aria-pressed', 'true');
        });
      }
      paintCounter();
      group.dispatchEvent(new CustomEvent('aj:chips', { detail: { selected: selected() }, bubbles: true }));

      chips.forEach(function (chip) {
        if (!chip.hasAttribute('aria-pressed')) chip.setAttribute('aria-pressed', 'false');
        chip.setAttribute('type', 'button');
        chip.addEventListener('click', function () {
          var on = chip.getAttribute('aria-pressed') === 'true';
          if (single && !on) {
            chips.forEach(function (c) { c.setAttribute('aria-pressed', 'false'); });
          }
          if (!on && max && selected().length >= max) {
            /* at the cap — nudge rather than silently ignore */
            chip.animate(
              [{ transform: 'translateX(0)' }, { transform: 'translateX(-4px)' },
               { transform: 'translateX(4px)' }, { transform: 'translateX(0)' }],
              { duration: 220 }
            );
            return;
          }
          chip.setAttribute('aria-pressed', on ? 'false' : 'true');
          persist();
        });
      });
    });
  }

  /* ---------------------------------------------------------
     4. Check rows — audits, trackers, checklists
     --------------------------------------------------------- */

  function bindChecks(root) {
    (root || document).querySelectorAll('[data-aj-check]').forEach(function (list) {
      var key = list.getAttribute('data-aj-check');
      var rows = Array.prototype.slice.call(list.querySelectorAll('.aj-check__row'));
      var meterFill = list.getAttribute('data-aj-meter')
        ? document.getElementById(list.getAttribute('data-aj-meter')) : null;
      var meterVal = list.getAttribute('data-aj-meter-val')
        ? document.getElementById(list.getAttribute('data-aj-meter-val')) : null;

      function ticked() {
        return rows.filter(function (r) { return r.classList.contains('is-on'); });
      }
      function paint() {
        var n = ticked().length;
        if (meterFill) meterFill.style.width = Math.round(n / rows.length * 100) + '%';
        if (meterVal) meterVal.textContent = n + ' / ' + rows.length;
      }
      function persist() {
        var labels = ticked().map(function (r) {
          var b = r.querySelector('.aj-check__text b');
          return b ? b.textContent.trim() : r.querySelector('.aj-check__text').textContent.trim();
        });
        if (labels.length) {
          store.set(key, labels.join(' · '));
          noteMeta(key, list.getAttribute('data-aj-tool'), list.getAttribute('data-aj-q'));
        } else {
          store.remove(key);
        }
        paint();
        updateProgress();
      }

      var savedRaw = store.get(key);
      if (savedRaw) {
        var savedList = savedRaw.split('·').map(function (s) { return s.trim(); });
        rows.forEach(function (r) {
          var b = r.querySelector('.aj-check__text b');
          var label = b ? b.textContent.trim() : r.querySelector('.aj-check__text').textContent.trim();
          if (savedList.indexOf(label) > -1) r.classList.add('is-on');
        });
      }
      paint();

      rows.forEach(function (row) {
        row.setAttribute('role', 'checkbox');
        row.setAttribute('tabindex', '0');
        row.setAttribute('aria-checked', row.classList.contains('is-on') ? 'true' : 'false');
        var toggle = function () {
          row.classList.toggle('is-on');
          row.setAttribute('aria-checked', row.classList.contains('is-on') ? 'true' : 'false');
          persist();
        };
        row.addEventListener('click', toggle);
        row.addEventListener('keydown', function (e) {
          if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); }
        });
      });
    });
  }

  /* ---------------------------------------------------------
     5. List builders — add your own items as chips
     --------------------------------------------------------- */

  function bindBuilders(root) {
    (root || document).querySelectorAll('[data-aj-builder]').forEach(function (wrap) {
      var key = wrap.getAttribute('data-aj-builder');
      var input = wrap.querySelector('.aj-input');
      var addBtn = wrap.querySelector('[data-aj-add]');
      var list = wrap.querySelector('.aj-builder__list');
      var emptyMsg = wrap.getAttribute('data-aj-empty') || 'Nothing added yet.';
      var items = [];

      var savedRaw = store.get(key);
      if (savedRaw) items = savedRaw.split('|').filter(Boolean);

      function persist() {
        if (items.length) {
          store.set(key, items.join('|'));
          noteMeta(key, wrap.getAttribute('data-aj-tool'), wrap.getAttribute('data-aj-q'));
        } else {
          store.remove(key);
        }
        updateProgress();
      }

      function render() {
        if (!items.length) {
          list.innerHTML = '<p class="aj-builder__empty">' + esc(emptyMsg) + '</p>';
          return;
        }
        list.innerHTML = items.map(function (t, i) {
          return '<span class="aj-builder__chip">' + esc(t) +
                 '<button type="button" aria-label="Remove ' + esc(t) + '" data-i="' + i + '">&times;</button></span>';
        }).join('');
        list.querySelectorAll('button[data-i]').forEach(function (b) {
          b.addEventListener('click', function () {
            items.splice(parseInt(b.getAttribute('data-i'), 10), 1);
            persist(); render();
          });
        });
      }

      function add() {
        var v = (input.value || '').trim();
        if (!v) return;
        items.push(v);
        input.value = '';
        persist(); render();
        input.focus();
      }

      if (addBtn) addBtn.addEventListener('click', add);
      if (input) input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); add(); }
      });
      render();
    });
  }

  /* ---------------------------------------------------------
     6. Accordions (7-day trackers, FAQ rows)
     --------------------------------------------------------- */

  function bindAccordions(root) {
    (root || document).querySelectorAll('.aj-day').forEach(function (day) {
      var trigger = day.querySelector('.aj-day__trigger');
      var panel = day.querySelector('.aj-day__panel');
      if (!trigger || !panel) return;
      trigger.setAttribute('aria-expanded', 'false');
      trigger.addEventListener('click', function () {
        var open = day.classList.toggle('is-open');
        panel.hidden = !open;
        trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      /* a day counts as done once anything inside it is filled in */
      panel.addEventListener('input', function () {
        var filled = Array.prototype.slice.call(panel.querySelectorAll('[data-aj]'))
          .some(function (f) { return (f.value || '').trim() !== ''; });
        day.classList.toggle('is-done', filled);
      });
      var preFilled = Array.prototype.slice.call(panel.querySelectorAll('[data-aj]'))
        .some(function (f) { return (f.value || '').trim() !== ''; });
      day.classList.toggle('is-done', preFilled);
    });
  }

  /* ---------------------------------------------------------
     7. Click-to-play videos (nothing loads from YouTube until
        the athlete asks for it)
     --------------------------------------------------------- */

  function bindVideos(root) {
    (root || document).querySelectorAll('.aj-vid__frame').forEach(function (frame) {
      var btn = frame.querySelector('.aj-vid__play');
      if (!btn) return;
      btn.addEventListener('click', function () {
        var id = frame.getAttribute('data-yt');
        var start = frame.getAttribute('data-start');
        var ifr = document.createElement('iframe');
        ifr.src = 'https://www.youtube-nocookie.com/embed/' + id +
                  '?autoplay=1&rel=0' + (start ? '&start=' + start : '');
        ifr.title = btn.getAttribute('aria-label') || 'Video';
        ifr.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
        ifr.setAttribute('allowfullscreen', '');
        ifr.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
        frame.innerHTML = '';
        frame.appendChild(ifr);
      });
    });
  }

  /* ---------------------------------------------------------
     8. Page progress strip — "how much of this toolkit have
        I actually done?"
     --------------------------------------------------------- */

  var progressEls = null;

  function collectTrackable() {
    var keys = {};
    document.querySelectorAll('[data-aj]').forEach(function (el) {
      if (el.getAttribute('data-aj-notrack') === null) keys[el.getAttribute('data-aj')] = 'field';
    });
    document.querySelectorAll('[data-aj-chips]').forEach(function (el) { keys[el.getAttribute('data-aj-chips')] = 'chips'; });
    document.querySelectorAll('[data-aj-check]').forEach(function (el) { keys[el.getAttribute('data-aj-check')] = 'check'; });
    document.querySelectorAll('[data-aj-builder]').forEach(function (el) { keys[el.getAttribute('data-aj-builder')] = 'builder'; });
    return Object.keys(keys);
  }

  function updateProgress() {
    if (!progressEls) return;
    var keys = collectTrackable();
    if (!keys.length) return;
    var done = keys.filter(function (k) {
      var v = store.get(k);
      return v !== null && String(v).trim() !== '';
    }).length;
    var pct = Math.round(done / keys.length * 100);
    if (progressEls.fill) progressEls.fill.style.width = pct + '%';
    if (progressEls.count) progressEls.count.textContent = done + ' / ' + keys.length + ' saved';
  }

  function bindProgress() {
    var fill = document.getElementById('ajProgressFill');
    var count = document.getElementById('ajProgressCount');
    if (!fill && !count) return;
    progressEls = { fill: fill, count: count };
    updateProgress();
  }

  /* ---------------------------------------------------------
     9. Jump menu — the "choose your area" dropdown
     --------------------------------------------------------- */

  function bindJump() {
    document.querySelectorAll('[data-aj-jump]').forEach(function (form) {
      var select = form.querySelector('select');
      var go = form.querySelector('[data-aj-jump-go]');
      function navigate() {
        var v = select.value;
        if (v) window.location.href = v;
      }
      if (go) go.addEventListener('click', function (e) { e.preventDefault(); navigate(); });
      form.addEventListener('submit', function (e) { e.preventDefault(); navigate(); });
      select.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); navigate(); }
      });
    });
  }

  /* ---------------------------------------------------------
     10. Practice timer — used by the guided practices
     --------------------------------------------------------- */

  function bindTimers(root) {
    (root || document).querySelectorAll('[data-aj-timer]').forEach(function (wrap) {
      var clock = wrap.querySelector('[data-timer-clock]');
      var phaseEl = wrap.querySelector('[data-timer-phase]');
      var cueEl = wrap.querySelector('[data-timer-cue]');
      var startBtn = wrap.querySelector('[data-timer-start]');
      var resetBtn = wrap.querySelector('[data-timer-reset]');
      var steps;
      try { steps = JSON.parse(wrap.getAttribute('data-aj-timer')); } catch (e) { return; }

      var idx = 0, left = 0, tick = null, running = false;

      function fmt(s) {
        var m = Math.floor(s / 60), r = s % 60;
        return m + ':' + (r < 10 ? '0' : '') + r;
      }
      function paint() {
        if (clock) clock.textContent = fmt(left);
        if (phaseEl) phaseEl.textContent = steps[idx] ? steps[idx].phase : 'Done';
        if (cueEl) cueEl.innerHTML = steps[idx] ? steps[idx].cue : 'Practice complete. Notice what shifted &mdash; then write it down below.';
      }
      function loadStep(i) {
        idx = i;
        left = steps[i] ? steps[i].secs : 0;
        paint();
      }
      function stop() {
        running = false;
        clearInterval(tick);
        if (startBtn) startBtn.textContent = 'Resume';
      }
      function run() {
        running = true;
        if (startBtn) startBtn.textContent = 'Pause';
        tick = setInterval(function () {
          left--;
          if (left <= 0) {
            if (idx + 1 < steps.length) {
              loadStep(idx + 1);
            } else {
              idx = steps.length;
              left = 0;
              clearInterval(tick);
              running = false;
              paint();
              if (startBtn) startBtn.textContent = 'Run it again';
              return;
            }
          }
          paint();
        }, 1000);
      }

      loadStep(0);

      if (startBtn) startBtn.addEventListener('click', function () {
        if (idx >= steps.length) { loadStep(0); run(); return; }
        if (running) stop(); else run();
      });
      if (resetBtn) resetBtn.addEventListener('click', function () {
        clearInterval(tick); running = false;
        if (startBtn) startBtn.textContent = 'Start';
        loadStep(0);
      });
    });
  }

  /* ---------------------------------------------------------
     11. Journal page — collate, print, download, clear
     --------------------------------------------------------- */

  var PILLAR_NAMES = {
    open: 'OPEN — Acceptance & Defusion',
    aware: 'AWARE — Present Moment & Perspective',
    engaged: 'ENGAGED — Values & Committed Action',
    brain: 'BRAIN HEALTH BEHAVIOURS',
    start: 'GETTING STARTED'
  };

  function gatherEntries() {
    var meta = readMeta();
    var out = {};
    store.keys().forEach(function (k) {
      var v = store.get(k);
      if (v === null || String(v).trim() === '') return;
      var m = meta[k] || {};
      var pillar = m.pillar || k.split('.')[0];
      if (!out[pillar]) out[pillar] = [];
      out[pillar].push({
        key: k,
        tool: m.tool || '',
        q: m.q || '',
        a: v,
        at: m.at || 0
      });
    });
    Object.keys(out).forEach(function (p) {
      out[p].sort(function (a, b) {
        return (a.tool || '').localeCompare(b.tool || '') || a.key.localeCompare(b.key);
      });
    });
    return out;
  }

  function renderJournal() {
    var host = document.getElementById('ajJournal');
    if (!host) return;
    var groups = gatherEntries();
    var order = ['start', 'open', 'aware', 'engaged', 'brain'];
    var extras = Object.keys(groups).filter(function (p) { return order.indexOf(p) === -1; });
    var all = order.concat(extras).filter(function (p) { return groups[p] && groups[p].length; });

    var countEl = document.getElementById('ajJournalCount');
    var total = all.reduce(function (n, p) { return n + groups[p].length; }, 0);
    if (countEl) countEl.textContent = total;

    if (!total) {
      host.innerHTML =
        '<div class="aj-empty">Nothing saved yet.<br><br>' +
        'Head into a toolkit, complete an activity, and whatever you write will appear here &mdash; ' +
        'ready to print or bring to your next session.</div>';
      return;
    }

    host.innerHTML = all.map(function (p) {
      var head = '<h3 class="aj-groupheads">' + esc(PILLAR_NAMES[p] || p.toUpperCase()) + '</h3>';
      var lastTool = null;
      var body = groups[p].map(function (e) {
        var toolLine = (e.tool && e.tool !== lastTool)
          ? '<p class="aj-entry__tool">' + esc(e.tool) + '</p>' : '';
        lastTool = e.tool;
        var when = e.at ? new Date(e.at).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
        return '<div class="aj-entry">' + toolLine +
          (e.q ? '<p class="aj-entry__q">' + esc(e.q) + '</p>' : '') +
          '<p class="aj-entry__a">' + esc(e.a) + '</p>' +
          (when ? '<p class="aj-entry__meta">Last updated ' + esc(when) + '</p>' : '') +
          '</div>';
      }).join('');
      return head + body;
    }).join('');
  }

  function journalAsText() {
    var groups = gatherEntries();
    var order = ['start', 'open', 'aware', 'engaged', 'brain'];
    var extras = Object.keys(groups).filter(function (p) { return order.indexOf(p) === -1; });
    var lines = [
      'MY SKILLS JOURNAL',
      'The Performance Act — GROW Platform',
      'Exported ' + new Date().toLocaleString('en-NZ'),
      ''
    ];
    order.concat(extras).forEach(function (p) {
      if (!groups[p] || !groups[p].length) return;
      lines.push('');
      lines.push('==============================================');
      lines.push(PILLAR_NAMES[p] || p.toUpperCase());
      lines.push('==============================================');
      var lastTool = null;
      groups[p].forEach(function (e) {
        if (e.tool && e.tool !== lastTool) {
          lines.push('');
          lines.push('--- ' + e.tool + ' ---');
          lastTool = e.tool;
        }
        if (e.q) lines.push('Q: ' + e.q);
        lines.push('A: ' + e.a);
        lines.push('');
      });
    });
    return lines.join('\n');
  }

  function bindJournalActions() {
    var dl = document.getElementById('ajDownload');
    if (dl) dl.addEventListener('click', function () {
      var blob = new Blob([journalAsText()], { type: 'text/plain;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'my-skills-journal-' + new Date().toISOString().slice(0, 10) + '.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    });

    var pr = document.getElementById('ajPrint');
    if (pr) pr.addEventListener('click', function () { window.print(); });

    var clear = document.getElementById('ajClear');
    if (clear) clear.addEventListener('click', function () {
      var ok = window.confirm(
        'This permanently deletes everything you have written across the whole athlete area, ' +
        'on this device. It cannot be undone.\n\nDownload a copy first if you want to keep it.\n\nDelete everything?'
      );
      if (!ok) return;
      store.keys().forEach(function (k) { store.remove(k); });
      try { localStorage.removeItem(META); } catch (e) {}
      renderJournal();
    });
  }

  /* ---------------------------------------------------------
     Boot
     --------------------------------------------------------- */

  function init() {
    bindFields();
    bindSliders();
    bindChips();
    bindChecks();
    bindBuilders();
    bindAccordions();
    bindVideos();
    bindTimers();
    bindJump();
    bindProgress();
    renderJournal();
    bindJournalActions();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* expose a tiny API for page-specific widgets */
  window.AJ = {
    get: store.get,
    set: function (k, v, tool, q) { store.set(k, v); noteMeta(k, tool, q); updateProgress(); },
    remove: function (k) { store.remove(k); updateProgress(); },
    esc: esc,
    refresh: updateProgress
  };
})();
