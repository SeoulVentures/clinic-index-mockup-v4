/* v4 map — Leaflet + OpenStreetMap tiles (no API key).
   Points come from assets/price-points.js: only clinics whose own published
   price page we could read, with real registry coordinates. Marker colours
   use CSS custom properties so the palette switcher re-skins the map without
   a reload. */
(function () {
  'use strict';

  var TILE = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  var ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  var ALL = window.SCI_PRICE_POINTS || [];
  var META = window.SCI_PRICE_POINTS_META || {};

  function css(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name);
    return (v || '').trim() || fallback;
  }

  function pinIcon(kind) {
    return L.divIcon({
      className: 'sci-pin-wrap',
      html: '<i class="sci-pin sci-pin-' + kind + '"></i>',
      iconSize: [12, 12],
      iconAnchor: [6, 6]
    });
  }

  function clusterIcon(cluster) {
    var n = cluster.getChildCount();
    var size = n < 10 ? 30 : n < 50 ? 36 : n < 200 ? 42 : 48;
    return L.divIcon({
      html: '<div class="sci-cluster"><b>' + n + '</b></div>',
      className: 'sci-cluster-wrap',
      iconSize: [size, size]
    });
  }

  function popupHtml(c) {
    var rows = c[6] || [];
    var lines = '';
    for (var i = 0; i < rows.length && i < 5; i++) {
      lines += '<span class="sci-pop-price">' + rows[i][0] + ' — ' + rows[i][1] + '</span>';
    }
    var more = rows.length > 5 ? '<span class="sci-pop-price">+' + (rows.length - 5) + ' more published treatments</span>' : '';
    return '<div class="sci-pop">' +
      '<b>' + c[0] + '</b>' +
      '<span class="sci-pop-addr">' + (c[2] || c[1]) + ', ' + c[1] + '</span>' +
      '<span class="sci-pop-tag">' + rows.length + ' published price lines</span>' +
      lines + more +
      '<span class="sci-pop-note">Registry record &middot; prices read from the clinic&rsquo;s own page on 24 October 2026</span>' +
      '</div>';
  }

  function build(el) {
    var center = el.getAttribute('data-center');
    var zoom = parseInt(el.getAttribute('data-zoom') || '13', 10);
    var registryTotal = parseInt(el.getAttribute('data-registry-total') || '0', 10);
    var dong = el.getAttribute('data-dong') || '';
    var c = center ? center.split(',').map(Number) : [37.4955, 127.0375];

    var points = dong ? ALL.filter(function (x) { return x[2] === dong; }) : ALL;

    var map = L.map(el, {
      center: c,
      zoom: zoom,
      scrollWheelZoom: false,
      zoomControl: true,
      attributionControl: true
    });

    L.tileLayer(TILE, { attribution: ATTR, subdomains: 'abcd', maxZoom: 19 }).addTo(map);

    var group = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 46,
      showCoverageOnHover: false,
      iconCreateFunction: clusterIcon
    });

    var markers = points.map(function (clinic) {
      var m = L.marker([clinic[3], clinic[4]], {
        icon: pinIcon(clinic[5] >= 7 ? 'plastic' : 'derm'),
        title: clinic[0],
        riseOnHover: true
      });
      m.bindPopup(popupHtml(clinic), { maxWidth: 280, className: 'sci-popup' });
      return m;
    });

    group.addTo(map);

    var counter = el.parentNode.querySelector('[data-map-count]');
    if (counter) {
      if (dong) {
        counter.textContent = points.length + ' priced clinics' +
          (registryTotal ? ' of ' + registryTotal.toLocaleString() + ' in this neighborhood' : '');
      } else {
        counter.textContent = points.length + ' priced clinics drawn of ' +
          (registryTotal || 2387).toLocaleString() + ' registry records';
      }
    }

    map.on('popupopen', function (e) {
      var pop = e.popup.getElement();
      if (!pop) return;
      var strong = pop.querySelector('b');
      if (strong) strong.style.color = css('--brand', '#1B3557');
    });

    window.addEventListener('resize', function () { map.invalidateSize(); });
    return map;
  }

  function init() {
    var els = document.querySelectorAll('[data-map]');
    for (var i = 0; i < els.length; i++) build(els[i]);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
