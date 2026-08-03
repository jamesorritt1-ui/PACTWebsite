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
    /* Every key we own, including the private ones. */
    allKeys: function () {
      var out = [];
      try {
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k && k.indexOf(NS) === 0) out.push(k.slice(NS.length));
        }
      } catch (e) {}
      return out;
    },
    /* Journal keys only. Anything starting "__" is private working
       data a tool keeps for itself (the DOTS diary array, the meta
       index) — it belongs to the athlete and is deleted with
       everything else, but it isn't a journal entry so it never
       gets rendered, exported or counted as one. */
    keys: function () {
      return store.allKeys().filter(function (k) { return k.indexOf('__') !== 0; });
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
    /* Tool headings carry their own "3 / 7" badge, so they move
       whenever the page-level progress does. */
    for (var i = 0; i < folds.length; i++) paintFoldState(folds[i]);
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
     8b. Collapsible tools

     A toolkit page opened flat runs 25-40 screens. That is
     the right amount of material and the wrong amount of
     scrolling, so every tool folds shut and the page opens
     as a contents list instead: number, name, who it's for,
     and whether the athlete has done it.

     Driven entirely off the existing markup — no page needs
     to change. Deep links (#dots) unfold themselves, and
     print unfolds everything.
     --------------------------------------------------------- */

  var CHEV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" ' +
             'stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';

  var folds = [];          /* { el, body, head, id, name, num, keys, setOpen } */
  var foldStoreKey = null;

  function pageName() {
    var f = (window.location.pathname.split('/').pop() || 'index').replace(/\.html$/, '');
    return f || 'index';
  }

  /* Which storage keys live inside this tool, so the head can
     show whether its activities have been done. */
  function keysInside(el) {
    var out = [];
    el.querySelectorAll('[data-aj],[data-aj-chips],[data-aj-check],[data-aj-builder]').forEach(function (n) {
      if (n.hasAttribute('data-aj') && n.getAttribute('data-aj-notrack') !== null) return;
      var k = n.getAttribute('data-aj') || n.getAttribute('data-aj-chips') ||
              n.getAttribute('data-aj-check') || n.getAttribute('data-aj-builder');
      if (k && out.indexOf(k) === -1) out.push(k);
    });
    return out;
  }

  function paintFoldState(f) {
    if (!f.stateEl || !f.keys.length) return;
    var done = f.keys.filter(function (k) {
      var v = store.get(k);
      return v !== null && String(v).trim() !== '';
    }).length;
    f.stateEl.className = 'aj-tool__state' +
      (done === 0 ? '' : (done === f.keys.length ? ' aj-tool__state--done' : ' aj-tool__state--part'));
    f.stateEl.textContent = done === 0
      ? f.keys.length + (f.keys.length === 1 ? ' answer' : ' answers')
      : (done === f.keys.length ? 'Complete' : done + ' / ' + f.keys.length);
  }

  function rememberFolds() {
    if (!foldStoreKey) return;
    var open = folds.filter(function (f) { return f.isOpen; }).map(function (f) { return f.id; });
    store.set(foldStoreKey, open.join(','));
  }

  /* Each tool sits in its own full-height section. Folded, that is
     ~180px of section padding wrapped around a 120px card, so a
     section whose tools are all shut collapses to a tight row in a
     list. */
  function paintSection(f) {
    var sec = f.el.closest ? f.el.closest('.aj-sec') : null;
    if (!sec) return;
    var shut = true;
    sec.querySelectorAll('.aj-tool--fold').forEach(function (t) {
      if (t.classList.contains('is-open')) shut = false;
    });
    sec.classList.toggle('aj-sec--folded', shut);
  }

  function setFold(f, open, remember) {
    f.isOpen = !!open;
    f.el.classList.toggle('is-open', f.isOpen);
    f.head.setAttribute('aria-expanded', f.isOpen ? 'true' : 'false');
    if (f.isOpen) {
      f.body.hidden = false;
      f.body.classList.add('aj-tool__body--fold');
    } else {
      f.body.hidden = true;
      f.body.classList.remove('aj-tool__body--fold');
    }
    paintSection(f);
    if (remember !== false) rememberFolds();
  }

  function bindTools() {
    var tools = Array.prototype.slice.call(document.querySelectorAll('.aj-tool'));
    if (tools.length < 2) return;            /* single-tool pages read better flat */

    foldStoreKey = '__folds:' + pageName();
    var remembered = (store.get(foldStoreKey) || '').split(',').filter(Boolean);

    tools.forEach(function (el, i) {
      var head = el.querySelector('.aj-tool__head');
      var body = el.querySelector('.aj-tool__body');
      if (!head || !body) return;

      /* The anchor for this tool is usually on the section that wraps it. */
      var host = el.id ? el : (el.closest('.aj-sec[id]') || el);
      var id = host.id || ('tool' + (i + 1));
      if (!host.id) host.id = id;
      if (!body.id) body.id = id + '-body';

      var nameEl = el.querySelector('.aj-tool__name');
      var numEl = el.querySelector('.aj-tool__num');

      el.classList.add('aj-tool--fold');
      head.classList.add('aj-tool__head--toggle');
      head.setAttribute('role', 'button');
      head.setAttribute('tabindex', '0');
      head.setAttribute('aria-controls', body.id);

      var meta = document.createElement('div');
      meta.className = 'aj-tool__meta';
      var keys = keysInside(el);
      var stateEl = null;
      if (keys.length) {
        stateEl = document.createElement('span');
        stateEl.className = 'aj-tool__state';
        meta.appendChild(stateEl);
      }
      var chev = document.createElement('span');
      chev.className = 'aj-tool__chev';
      chev.setAttribute('aria-hidden', 'true');
      chev.innerHTML = CHEV;
      meta.appendChild(chev);
      head.appendChild(meta);

      var f = {
        el: el, head: head, body: body, id: id, keys: keys, stateEl: stateEl,
        name: nameEl ? nameEl.textContent.trim() : id,
        num: numEl ? numEl.textContent.trim() : String(i + 1),
        isOpen: false
      };
      folds.push(f);

      head.addEventListener('click', function () { setFold(f, !f.isOpen); });
      head.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
          e.preventDefault();
          setFold(f, !f.isOpen);
        }
      });

      setFold(f, remembered.indexOf(id) !== -1, false);
      paintFoldState(f);
    });

    if (!folds.length) return;

    buildToolNav();
    /* The browser scrolls to the anchor before any of this runs, so
       by the time the folds settle the target has moved. Re-aim on
       the next frame. */
    if (window.location.hash) {
      window.requestAnimationFrame(function () { openFromHash(true); });
    }
    window.addEventListener('hashchange', function () { openFromHash(true); });

    /* Unfold before the site's smooth-scroll handler measures the
       target, so in-page links land in the right place. */
    document.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
      if (!a) return;
      var href = a.getAttribute('href');
      if (!href || href === '#') return;
      unfoldFor(href.slice(1));
    }, true);

    /* Printing a folded page would print the headings only. */
    if (window.matchMedia) {
      var mq = window.matchMedia('print');
      if (mq.addEventListener) mq.addEventListener('change', function (e) { if (e.matches) expandAll(true); });
    }
    window.addEventListener('beforeprint', function () { expandAll(true); });
  }

  function foldById(id) {
    for (var i = 0; i < folds.length; i++) if (folds[i].id === id) return folds[i];
    return null;
  }

  /* An id can be the tool itself, or anything nested inside it. */
  function unfoldFor(id) {
    if (!id) return null;
    var f = foldById(id);
    if (!f) {
      var node = null;
      try { node = document.getElementById(id); } catch (e) {}
      if (node) {
        var owner = node.closest ? node.closest('.aj-tool') : null;
        if (owner) {
          for (var i = 0; i < folds.length; i++) if (folds[i].el === owner) { f = folds[i]; break; }
        }
      }
    }
    if (f && !f.isOpen) setFold(f, true);
    return f;
  }

  function openFromHash(scroll) {
    var id = (window.location.hash || '').slice(1);
    if (!id) return;
    var f = unfoldFor(id);
    if (f && scroll) {
      var t = document.getElementById(id) || f.el;
      /* The site sets scroll-behavior:smooth, which turns arriving on a
         deep link into a second-long flight down the page. Someone who
         asked for one tool should just be at it. */
      if (t && t.scrollIntoView) t.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
  }

  function expandAll(open) {
    folds.forEach(function (f) { setFold(f, open, false); });
    rememberFolds();
    if (navBtn) navBtn.textContent = allOpen() ? 'Collapse all' : 'Expand all';
  }

  function allOpen() {
    return folds.length > 0 && folds.every(function (f) { return f.isOpen; });
  }

  var navBtn = null;
  var navSelect = null;

  /* The sticky progress strip is the only thing on screen at
     every scroll position, so it doubles as the page's nav. */
  function buildToolNav() {
    var bar = document.querySelector('.aj-progress');
    var inner = bar && bar.querySelector('.aj-progress__inner');
    if (!inner) return;
    bar.classList.add('aj-progress--nav');

    navSelect = document.createElement('select');
    navSelect.className = 'aj-navselect';
    navSelect.setAttribute('aria-label', 'Jump to a skill on this page');
    var opts = ['<option value="">Jump to a skill&hellip;</option>'];
    folds.forEach(function (f) {
      opts.push('<option value="' + esc(f.id) + '">' + esc(f.num) + ' &middot; ' + esc(f.name) + '</option>');
    });
    navSelect.innerHTML = opts.join('');
    navSelect.addEventListener('change', function () {
      var id = navSelect.value;
      if (!id) return;
      unfoldFor(id);
      var t = document.getElementById(id);
      if (t) {
        var head = document.getElementById('header');
        var off = (head ? head.offsetHeight : 70) + (bar.offsetHeight || 0) + 12;
        window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - off, behavior: 'smooth' });
      }
    });

    navBtn = document.createElement('button');
    navBtn.type = 'button';
    navBtn.className = 'aj-navbtn';
    navBtn.textContent = allOpen() ? 'Collapse all' : 'Expand all';
    navBtn.addEventListener('click', function () { expandAll(!allOpen()); });

    inner.insertBefore(navSelect, inner.firstChild);
    inner.appendChild(navBtn);

    /* Keep the dropdown showing wherever the athlete actually is. */
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        ticking = false;
        if (document.activeElement === navSelect) return;
        var line = (bar.getBoundingClientRect().bottom || 0) + 40;
        var here = '';
        folds.forEach(function (f) {
          if (f.el.getBoundingClientRect().top <= line) here = f.id;
        });
        if (navSelect.value !== here) navSelect.value = here;
      });
    }, { passive: true });
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
    start: 'GETTING STARTED',
    five: 'THE FIVE MOVES',
    prac: 'THE PRACTICE ROOM',
    open: 'OPEN — Acceptance & Defusion',
    aware: 'AWARE — Present Moment & Perspective',
    engaged: 'ENGAGED — Values & Committed Action',
    brain: 'BRAIN HEALTH BEHAVIOURS'
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

  var PILLAR_SHORT = {
    start: 'Getting started',
    five: 'Five Moves',
    prac: 'Practice',
    open: 'Open',
    aware: 'Aware',
    engaged: 'Engaged',
    brain: 'Brain health'
  };

  var jn = { filter: 'all', query: '', open: {}, built: false };

  function journalOrder(groups) {
    var order = ['start', 'five', 'prac', 'open', 'aware', 'engaged', 'brain'];
    var extras = Object.keys(groups).filter(function (p) { return order.indexOf(p) === -1; });
    return order.concat(extras).filter(function (p) { return groups[p] && groups[p].length; });
  }

  /* Group a pillar's answers under the tool they came from, keeping
     the order the tools appear in on the page. */
  function byTool(entries) {
    var map = {}, list = [];
    entries.forEach(function (e) {
      var t = e.tool || 'Other';
      if (!map[t]) { map[t] = { name: t, items: [] }; list.push(map[t]); }
      map[t].items.push(e);
    });
    return list;
  }

  function matches(e, q) {
    if (!q) return true;
    return (e.a + ' ' + e.q + ' ' + e.tool).toLowerCase().indexOf(q) !== -1;
  }

  /* Highlight the search term in the rendered answer. */
  function mark(text, q) {
    var safe = esc(text);
    if (!q) return safe;
    var needle = esc(q);
    var out = '', low = safe.toLowerCase(), from = 0, i;
    while ((i = low.indexOf(needle, from)) !== -1) {
      out += safe.slice(from, i) + '<span class="jn-hit">' + safe.slice(i, i + needle.length) + '</span>';
      from = i + needle.length;
    }
    return out + safe.slice(from);
  }

  function entryHTML(e, q) {
    var when = e.at ? new Date(e.at).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    return '<div class="aj-entry">' +
      (e.q ? '<p class="aj-entry__q">' + mark(e.q, q) + '</p>' : '') +
      '<p class="aj-entry__a">' + mark(e.a, q) + '</p>' +
      (when ? '<p class="aj-entry__meta">Last updated ' + esc(when) + '</p>' : '') +
      '</div>';
  }

  function renderJournalResults() {
    var host = document.getElementById('jnResults');
    if (!host) return;
    var groups = gatherEntries();
    var q = jn.query.trim().toLowerCase();
    var shown = 0;

    var html = journalOrder(groups).filter(function (p) {
      return jn.filter === 'all' || jn.filter === p;
    }).map(function (p) {
      var tools = byTool(groups[p]).map(function (t) {
        var items = t.items.filter(function (e) { return matches(e, q); });
        if (!items.length) return '';
        shown += items.length;
        /* A search is a request to see the hits, so matches open themselves. */
        var isOpen = q ? true : !!jn.open[p + '|' + t.name];
        return '<div class="jn-tool' + (isOpen ? ' is-open' : '') + '">' +
            '<button type="button" class="jn-tool__head" aria-expanded="' + isOpen + '" ' +
              'data-jn-tool="' + esc(p + '|' + t.name) + '">' +
              '<span class="jn-tool__name">' + esc(t.name) + '</span>' +
              '<span class="jn-tool__n">' + items.length + (items.length === 1 ? ' answer' : ' answers') + '</span>' +
              '<span class="jn-tool__chev">' + CHEV + '</span>' +
            '</button>' +
            '<div class="jn-tool__body"' + (isOpen ? '' : ' hidden') + '>' +
              items.map(function (e) { return entryHTML(e, q); }).join('') +
            '</div>' +
          '</div>';
      }).join('');

      if (!tools) return '';
      var n = groups[p].filter(function (e) { return matches(e, q); }).length;
      return '<section class="jn-group">' +
          '<h3 class="jn-group__h">' + esc(PILLAR_NAMES[p] || p.toUpperCase()) +
            '<span class="jn-group__n">' + n + (n === 1 ? ' answer' : ' answers') + '</span></h3>' +
          tools +
        '</section>';
    }).join('');

    host.innerHTML = html || '<p class="jn-none">Nothing matches &ldquo;' + esc(jn.query) + '&rdquo;.</p>';

    var live = document.getElementById('jnShowing');
    if (live) live.textContent = shown + (shown === 1 ? ' answer' : ' answers') + ' showing';

    host.querySelectorAll('[data-jn-tool]').forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.getAttribute('data-jn-tool');
        var wrap = b.parentNode;
        var body = wrap.querySelector('.jn-tool__body');
        var nowOpen = body.hidden;
        body.hidden = !nowOpen;
        wrap.classList.toggle('is-open', nowOpen);
        b.setAttribute('aria-expanded', nowOpen ? 'true' : 'false');
        jn.open[k] = nowOpen;
      });
    });
  }

  function renderJournal() {
    var host = document.getElementById('ajJournal');
    if (!host) return;
    var groups = gatherEntries();
    var all = journalOrder(groups);
    var total = all.reduce(function (n, p) { return n + groups[p].length; }, 0);

    var countEl = document.getElementById('ajJournalCount');
    if (countEl) countEl.textContent = total;

    if (!total) {
      jn.built = false;
      host.innerHTML =
        '<div class="aj-empty">Nothing saved yet.<br><br>' +
        'Head into a toolkit, complete an activity, and whatever you write will appear here &mdash; ' +
        'ready to print or bring to your next session.</div>';
      return;
    }

    /* Build the toolbar once — rebuilding it would steal focus
       from the search box on every keystroke. */
    if (!jn.built) {
      var chips = ['<button type="button" class="jn-filter" data-jn-f="all" aria-pressed="true">All <b>' + total + '</b></button>'];
      all.forEach(function (p) {
        chips.push('<button type="button" class="jn-filter" data-jn-f="' + esc(p) + '" aria-pressed="false">' +
          esc(PILLAR_SHORT[p] || p) + ' <b>' + groups[p].length + '</b></button>');
      });

      host.innerHTML =
        '<div class="jn-bar no-print">' +
          '<div class="jn-bar__row">' +
            '<input type="search" class="jn-search" id="jnSearch" placeholder="Search everything you&rsquo;ve written&hellip;" aria-label="Search your journal">' +
            '<button type="button" class="jn-filter" id="jnAll">Open all</button>' +
          '</div>' +
          '<div class="jn-bar__row" id="jnFilters">' + chips.join('') + '</div>' +
          '<div class="jn-bar__row"><span class="jn-tool__n" id="jnShowing" aria-live="polite"></span></div>' +
        '</div>' +
        '<div id="jnResults"></div>';
      jn.built = true;

      var search = document.getElementById('jnSearch');
      var t = null;
      search.addEventListener('input', function () {
        clearTimeout(t);
        t = setTimeout(function () { jn.query = search.value; renderJournalResults(); }, 160);
      });

      document.getElementById('jnFilters').querySelectorAll('[data-jn-f]').forEach(function (b) {
        b.addEventListener('click', function () {
          jn.filter = b.getAttribute('data-jn-f');
          document.getElementById('jnFilters').querySelectorAll('[data-jn-f]').forEach(function (o) {
            o.setAttribute('aria-pressed', o === b ? 'true' : 'false');
          });
          renderJournalResults();
        });
      });

      var allBtn = document.getElementById('jnAll');
      allBtn.addEventListener('click', function () {
        var opening = allBtn.textContent.indexOf('Open') === 0;
        var g = gatherEntries();
        jn.open = {};
        if (opening) {
          journalOrder(g).forEach(function (p) {
            byTool(g[p]).forEach(function (t2) { jn.open[p + '|' + t2.name] = true; });
          });
        }
        allBtn.textContent = opening ? 'Close all' : 'Open all';
        renderJournalResults();
      });
    }

    renderJournalResults();
  }

  function journalAsText() {
    var groups = gatherEntries();
    var order = ['start', 'five', 'prac', 'open', 'aware', 'engaged', 'brain'];
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
      store.allKeys().forEach(function (k) { store.remove(k); });
      try { localStorage.removeItem(META); } catch (e) {}
      renderJournal();
    });
  }

  /* ---------------------------------------------------------
     12. Log out — clears the GROW gateway session and returns
         to the login page.

         Note this deliberately does NOT touch anything the
         athlete has written. Their journal stays on the device
         so it's still here next time they log in; "Delete
         everything" on the journal page is the only thing that
         removes it.
     --------------------------------------------------------- */

  var GROW_SESSION_KEYS = ['grow_nomads_club', 'grow_nomads_role'];

  function bindLogout() {
    document.querySelectorAll('[data-aj-logout]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var entries = 0;
        try { entries = store.keys().length; } catch (err) {}
        var msg = 'Log out of GROW?\n\nYou\'ll need your password to get back in.';
        if (entries) {
          msg += '\n\nYour ' + entries + ' saved journal ' +
                 (entries === 1 ? 'entry stays' : 'entries stay') +
                 ' on this device and will still be here when you return.';
        }
        if (!window.confirm(msg)) return;
        GROW_SESSION_KEYS.forEach(function (k) {
          try { localStorage.removeItem(k); } catch (err) {}
        });
        window.location.href = 'grow-login.html';
      });
    });
  }

  /* ---------------------------------------------------------
     Boot
     --------------------------------------------------------- */

  function init() {
    bindLogout();
    bindFields();
    bindSliders();
    bindChips();
    bindChecks();
    bindBuilders();
    bindAccordions();
    bindVideos();
    bindTimers();
    bindJump();
    bindTools();
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
    /* Private working data for a tool — same device-only storage,
       cleared by "delete everything", but kept out of the journal. */
    getPrivate: function (name) { return store.get('__' + name); },
    setPrivate: function (name, v) { store.set('__' + name, v); },
    esc: esc,
    refresh: updateProgress
  };
})();
