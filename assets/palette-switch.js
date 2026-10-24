/* Palette switcher — 시안 v2 리서치용 검토 도구.
   Real site would ship one fixed palette; this only exists so the remaining
   candidates can be flipped through on every screen during review.
   2026-10-22: Navy & Brass confirmed → it is the default (no data-theme attr). */
(function () {
  var THEMES = [
    { id: 'navy',      label: 'Navy & Brass (confirmed)', short: 'Navy',   swatch: '#1B3557' },
    { id: 'crimson',   label: 'Crimson & Gold',   short: 'Crimson',swatch: '#8E1F32' },
    { id: 'slate',     label: 'Slate & Coral',    short: 'Slate',  swatch: '#2E4A63' },
    { id: 'aubergine', label: 'Aubergine & Sand', short: 'Aubergine', swatch: '#4A2F52' },
    { id: 'ink',       label: 'Ink & Gold',       short: 'Ink',    swatch: '#1A1F2E' },
    { id: 'teal',      label: 'Teal (first draft)', short: 'Teal', swatch: '#0E6B70' }
  ];

  var KEY = 'sci.palette.v2';
  var DEFAULT = 'navy';

  function apply(id) {
    if (id === DEFAULT) document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', id);
  }

  function current() {
    var p = new URLSearchParams(location.search).get('theme');
    if (p) return p;
    var s = localStorage.getItem(KEY);
    return s || DEFAULT;
  }

  function build() {
    var nav = document.querySelector('.mock-nav');
    if (!nav) return;
    var wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;gap:7px;align-items:center;margin-left:16px;padding-left:16px;border-left:1px solid rgba(255,255,255,.16)';

    var label = document.createElement('span');
    label.textContent = 'Palette';
    label.style.cssText = 'font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:#7C8FA3';
    wrap.appendChild(label);

    THEMES.forEach(function (t) {
      var b = document.createElement('button');
      b.type = 'button';
      b.dataset.themeId = t.id;
      b.title = t.label;
      b.setAttribute('aria-label', t.label);
      b.style.cssText =
        'display:inline-flex;align-items:center;gap:6px;padding:3px 9px 3px 5px;border-radius:6px;' +
        'border:1px solid rgba(255,255,255,.16);background:transparent;color:#B7C6D1;' +
        'font-size:11px;cursor:pointer;white-space:nowrap;line-height:1.4;flex:none';
      var dot = document.createElement('i');
      dot.style.cssText = 'width:9px;height:9px;border-radius:50%;background:' + t.swatch + ';display:block;flex:none';
      var txt = document.createElement('span');
      txt.textContent = t.short || t.label;
      b.appendChild(dot);
      b.appendChild(txt);
      b.addEventListener('click', function () {
        apply(t.id);
        localStorage.setItem(KEY, t.id);
        sync();
        var u = new URL(location.href);
        u.searchParams.set('theme', t.id);
        history.replaceState(null, '', u);
      });
      wrap.appendChild(b);
    });

    nav.appendChild(wrap);
    sync();
  }

  function sync() {
    var cur = document.documentElement.getAttribute('data-theme') || DEFAULT;
    document.querySelectorAll('.mock-nav button[data-theme-id]').forEach(function (b) {
      var on = b.dataset.themeId === cur;
      b.style.background = on ? '#fff' : 'transparent';
      b.style.color = on ? '#1B2733' : '#B7C6D1';
      b.style.borderColor = on ? '#fff' : 'rgba(255,255,255,.16)';
      b.style.fontWeight = on ? '600' : '400';
    });
  }

  var start = current();
  apply(start);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
