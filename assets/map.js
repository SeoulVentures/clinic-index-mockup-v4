/* v4 map — Leaflet, schematic basemap (no tiles, no API key).
   Points come from assets/price-points.js: only clinics whose own published
   price page we could read, with real registry coordinates. Marker colours
   use CSS custom properties so the palette switcher re-skins the map without
   a reload. */
(function () {
  'use strict';

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

  /* schematic basemap — district polygons and labels from the registry's
     own coordinates (window.SCI_GU3), same treatment as the explorer. */
  function addSchematic(map, pts) {
    if (window.SCI_GU3) {
      L.geoJSON(window.SCI_GU3, {
        style: { color: css('--brand', '#1B3557'), weight: 1.2, opacity: .38,
                 dashArray: '5 7', fillColor: '#FBFCF8', fillOpacity: .92, className: 'gu-poly' }
      }).addTo(map);
    }
    if (window.SCI_HAN) {
      window.SCI_HAN.forEach(function (seg) {
        L.polyline(seg, { color: '#DCE7F1', weight: 38, opacity: .5, lineCap: 'round',
                          lineJoin: 'round', interactive: false }).addTo(map);
      });
      window.SCI_HAN.forEach(function (seg) {
        L.polyline(seg, { color: '#C2D6E8', weight: 24, opacity: .95, lineCap: 'round',
                          lineJoin: 'round', interactive: false }).addTo(map);
      });
      window.SCI_HAN.forEach(function (seg) {
        L.polyline(seg, { color: '#DFEAF4', weight: 13, opacity: .95, lineCap: 'round',
                          lineJoin: 'round', interactive: false }).addTo(map);
      });
    }
    function massCentroid(i) {
      var agg = {};
      pts.forEach(function (p) {
        var k = p[i]; if (!k) return;
        var a = agg[k] = agg[k] || { lat: 0, lon: 0, n: 0 };
        a.lat += p[3]; a.lon += p[4]; a.n++;
      });
      return agg;
    }
    map.createPane('sciLabels').style.zIndex = 620;
    map.getPane('sciLabels').style.pointerEvents = 'none';
    function textLabel(lat, lon, txt, cls, minZ) {
      var m = L.marker([lat, lon], {
        interactive: false, keyboard: false, pane: 'sciLabels',
        icon: L.divIcon({ className: 'xp-dlabel ' + cls,
                          html: '<span>' + txt + '</span>', iconSize: [0, 0] })
      });
      m._minZ = minZ; m._txt = txt; m._cls = cls;
      m.addTo(map);
    }
    var dongAgg = massCentroid(2), dongEn = window.SCI_DONG_EN || {};
    Object.keys(dongAgg).forEach(function (d) {
      var a = dongAgg[d];
      textLabel(a.lat / a.n, a.lon / a.n, dongEn[d] || d, 'dong', 12);
    });
    if (window.SCI_GU3) {
      function ringCentroid(ring) {
        /* signed area is half the cross sum, so the divisor is 3*A; a clockwise
           ring makes A and the sums negative together and the signs cancel */
        var A = 0, cx = 0, cy = 0;
        for (var i = 0; i < ring.length - 1; i++) {
          var cr = ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
          A += cr; cx += (ring[i][0] + ring[i + 1][0]) * cr; cy += (ring[i][1] + ring[i + 1][1]) * cr;
        }
        var a3 = A * 3;
        return ring.length < 3 || a3 === 0 ? [ring[0][1], ring[0][0]] : [cy / a3, cx / a3];
      }
      var guEn = { '강남구': 'Gangnam', '서초구': 'Seocho', '송파구': 'Songpa' };
      window.SCI_GU3.features.forEach(function (f) {
        var c = ringCentroid(f.geometry.coordinates[0]);
        textLabel(c[0], c[1], guEn[f.properties.name] || f.properties.name, 'gu', 0);
      });
    }
    function tune() {
      /* greedy placement: hide labels that would overlap a placed one */
      var placed = [];
      var z = map.getZoom();
      map.eachLayer(function (l) {
        if (l._minZ === undefined) return;
        var el = l.getElement();
        if (!el) return;
        var on = z >= (l._minZ || 0);
        if (on) {
          var pt = map.latLngToContainerPoint(l.getLatLng());
          var w = l._txt.length * (l._cls === 'gu' ? 8.6 : 6.6) + 12;
          var r = [pt.x - w / 2, pt.y - 9, pt.x + w / 2, pt.y + 9];
          for (var i = 0; i < placed.length; i++) {
            if (r[0] < placed[i][2] && r[2] > placed[i][0] && r[1] < placed[i][3] && r[3] > placed[i][1]) { on = false; break; }
          }
          if (on) placed.push(r);
        }
        el.style.opacity = on ? '' : '0';
      });
    }
    map.on('zoomend', tune);
    map.whenReady(tune);
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
      attributionControl: false,
      minZoom: 9,
      maxZoom: 19
    });

    addSchematic(map, points);

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
