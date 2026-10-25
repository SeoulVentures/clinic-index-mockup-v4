/* ==========================================================================
   SeoulClinicIndex — map explorer (explore.html)
   Full-viewport Leaflet map + floating results panel, in the manner of a
   modern travel explorer. Reads:
     window.SCI_REGISTRY_POINTS  [[name,gu,dong,lat,lon,state,pricedRows,url],...]
     window.SCI_GU3              district boundary GeoJSON
     window.SCI_DATA             priced-clinic detail (prices per treatment)
     window.SCI_DONG_EN          dong → English name
   ========================================================================== */
(function () {
  "use strict";
  var PTS = window.SCI_REGISTRY_POINTS || [];
  var DONG_EN = window.SCI_DONG_EN || {};
  var GU_EN = { "강남구": "Gangnam", "서초구": "Seocho", "송파구": "Songpa" };
  var DETAIL = {};
  /* keyed name|gu — same-name clinics in different districts are different records */
  (window.SCI_DATA && window.SCI_DATA.clinics || []).forEach(function (c) { DETAIL[c.name + "|" + c.gu] = c; });

  function cssVar(v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); }
  var C = {};
  function palette() {
    C.brand = cssVar("--brand") || "#1B3557";
    C.accent = cssVar("--accent") || "#A8802F";
    C.faint = cssVar("--faint") || "#97A2B0";
  }
  palette();

  var WON = function (n) { return "₩" + Number(n).toLocaleString("en-US"); };
  var ST_LABEL = { 2: "Published price", 1: "Website on file", 0: "Registry record" };
  var ST_COLOR = { 2: C.accent, 1: C.brand, 0: C.faint };

  /* ---------- map ---------- */
  var map = L.map("xp-map", { zoomControl: false, attributionControl: false,
                              minZoom: 9, maxZoom: 19, zoomSnap: .25, zoomDelta: .5 });
  L.control.zoom({ position: "bottomright" }).addTo(map);
  /* schematic basemap — district polygons and labels drawn from the
     registry's own coordinates. No third-party tiles: nothing to gate,
     watermark or go stale. */
  var BOUND = window.SCI_GU3;
  if (BOUND) {
    var bl = L.geoJSON(BOUND, {
      style: { color: C.brand, weight: 1.2, opacity: .38, dashArray: "5 7",
               fillColor: "#FBFCF8", fillOpacity: .92, className: "gu-poly" }
    }).addTo(map);
    /* fit into the area you can actually see: right of the results panel,
       below the floating header — so the districts fill the live viewport.
       On small screens the panel is a bottom sheet, so pad plainly instead. */
    if (window.matchMedia("(max-width: 1020px)").matches) {
      var sheetEl = document.getElementById("xp-side");
      var sheetH = sheetEl ? sheetEl.getBoundingClientRect().height : 0;
      map.fitBounds(bl.getBounds(), { paddingTopLeft: [20, 90], paddingBottomRight: [20, sheetH + 16] });
    } else {
      var sideEl = document.getElementById("xp-side");
      var padL = sideEl ? sideEl.getBoundingClientRect().width + 34 : 30;
      map.fitBounds(bl.getBounds(), { paddingTopLeft: [padL, 96], paddingBottomRight: [30, 30] });
    }
  } else {
    map.setView([37.497, 127.04], 12);
  }

  /* the Han River sits on top of the land — real geometry, OSM ODbL */
  if (window.SCI_HAN) {
    window.SCI_HAN.forEach(function (seg) {
      L.polyline(seg, { color: "#DCE7F1", weight: 38, opacity: .5, lineCap: "round",
                        lineJoin: "round", interactive: false }).addTo(map);
    });
    window.SCI_HAN.forEach(function (seg) {
      L.polyline(seg, { color: "#C2D6E8", weight: 24, opacity: .95, lineCap: "round",
                        lineJoin: "round", interactive: false }).addTo(map);
    });
    window.SCI_HAN.forEach(function (seg) {
      L.polyline(seg, { color: "#DFEAF4", weight: 13, opacity: .95, lineCap: "round",
                        lineJoin: "round", interactive: false }).addTo(map);
    });
  }

  /* ---------------- map labels with collision avoidance ----------------
     District labels sit at polygon centroids, neighborhood labels at the
     point-mass centroid of their clinics. At every zoom and pan we place
     them greedily by priority (district > busiest neighborhood > river)
     and hide whatever would overlap a placed label, a panel or the
     floating header — the way a real map's label engine behaves. */
  var labels = L.layerGroup().addTo(map);
  /* labels paint above clusters (pane 620 > markerPane 600) so a place name
     never ends up half-buried under a cluster circle, and never eats clicks */
  map.createPane("xpLabels").style.zIndex = 620;
  map.getPane("xpLabels").style.pointerEvents = "none";
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
  function massCentroid(rows, i) {
    var agg = {};
    rows.forEach(function (p) {
      var k = p[i]; if (!k) return;
      var a = agg[k] = agg[k] || { lat: 0, lon: 0, n: 0 };
      a.lat += p[3]; a.lon += p[4]; a.n++;
    });
    return agg;
  }
  function textLabel(lat, lon, txt, cls, minZ) {
    var m = L.marker([lat, lon], {
      interactive: false, keyboard: false, pane: "xpLabels",
      icon: L.divIcon({ className: "xp-dlabel " + cls,
                        html: "<span>" + esc_(txt) + "</span>", iconSize: [0, 0] })
    });
    m._txt = txt; m._cls = cls; m._minZ = minZ;
    labels.addLayer(m);
  }
  if (BOUND) {
    BOUND.features.forEach(function (f) {
      var c = ringCentroid(f.geometry.coordinates[0]);
      textLabel(c[0], c[1], GU_EN[f.properties.name] || f.properties.name, "gu", 0);
    });
  }
  var dongAgg = massCentroid(PTS, 2);
  if (window.SCI_HAN && window.SCI_HAN.length && BOUND) {
    /* name the river at its quietest stretch — the in-view point farthest
       from every neighborhood centroid, so the water label never fights a
       dong label and never lands off the fitted view */
    var bb = { w: 999, e: -999, s: 999, n: -999 };
    BOUND.features.forEach(function (f) {
      f.geometry.coordinates[0].forEach(function (pt) {
        bb.w = Math.min(bb.w, pt[0]); bb.e = Math.max(bb.e, pt[0]);
        bb.s = Math.min(bb.s, pt[1]); bb.n = Math.max(bb.n, pt[1]);
      });
    });
    var dongs = Object.keys(dongAgg).map(function (k) {
      var a = dongAgg[k]; return [a.lat / a.n, a.lon / a.n];
    });
    var best = null, bd = -1;
    window.SCI_HAN.forEach(function (seg) {
      seg.forEach(function (pt) {
        /* SCI_HAN points are [lat, lon] */
        if (pt[0] < bb.s || pt[0] > bb.n || pt[1] < bb.w || pt[1] > bb.e) return;
        var d = 1e9;
        dongs.forEach(function (c) {
          d = Math.min(d, Math.abs(pt[0] - c[0]) + Math.abs(pt[1] - c[1]) * 1.2);
        });
        if (d > bd) { bd = d; best = pt; }
      });
    });
    if (best) textLabel(best[0], best[1], "Han River", "water", 0);
  }
  Object.keys(dongAgg)
    .sort(function (a, b) { return dongAgg[b].n - dongAgg[a].n; })
    .forEach(function (d) {
      var a = dongAgg[d];
      textLabel(a.lat / a.n, a.lon / a.n, DONG_EN[d] || d, "dong", 12);
    });
  function labelRect(m, mr) {
    var pt = map.latLngToContainerPoint(m.getLatLng());
    var w = m._txt.length * (m._cls === "gu" ? 8.6 : m._cls === "water" ? 7.6 : 6.6) + 12;
    return [mr.left + pt.x - w / 2, mr.top + pt.y - 9, mr.left + pt.x + w / 2, mr.top + pt.y + 9];
  }
  function avoidRects() {
    var zones = [];
    ["#xp-side", ".xp-legend", "header.nav"].forEach(function (sel) {
      var el = document.querySelector(sel);
      if (el && el.offsetParent !== null) {
        var r = el.getBoundingClientRect();
        zones.push([r.left, r.top, r.right, r.bottom]);
      }
    });
    return zones;
  }
  function layoutLabels() {
    var mr = map.getContainer().getBoundingClientRect();
    var placed = avoidRects();
    var z = map.getZoom();
    labels.eachLayer(function (m) {
      var el = m.getElement();
      if (!el) return;
      var on = z >= (m._minZ || 0);
      if (on) {
        var r = labelRect(m, mr);
        for (var i = 0; i < placed.length; i++) {
          if (r[0] < placed[i][2] && r[2] > placed[i][0] && r[1] < placed[i][3] && r[3] > placed[i][1]) { on = false; break; }
        }
        if (on) placed.push(r);
      }
      el.style.opacity = on ? "" : "0";
    });
  }
  map.on("zoomend", layoutLabels);
  map.on("moveend", layoutLabels);
  map.whenReady(layoutLabels);

  /* ---------- markers ---------- */
  var group = L.markerClusterGroup({
    showCoverageOnHover: false, maxClusterRadius: 46, spiderfyOnMaxZoom: true,
    iconCreateFunction: function (c) {
      var n = c.getChildCount();
      var s = n >= 300 ? 46 : n >= 80 ? 40 : 34;
      return L.divIcon({
        html: "<span>" + n + "</span>",
        className: "xp-cluster", iconSize: [s, s]
      });
    }
  });
  var INDEX = [];   // {m: marker, p: point}
  PTS.forEach(function (p) {
    var st = p[5];
    var m = L.circleMarker([p[3], p[4]], {
      radius: st === 2 ? 6 : st === 1 ? 5 : 3.5,
      fillColor: ST_COLOR[st], color: "#fff", weight: 1.4, opacity: .9,
      fillOpacity: st === 0 ? .55 : .92
    });
    m.on("click", function () {
      popup.setLatLng(m.getLatLng()).setContent(popupHtml(p)).openOn(map);
    });
    INDEX.push({ m: m, p: p });
    group.addLayer(m);
  });
  map.addLayer(group);

  function esc_(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  function popupHtml(p) {
    var st = p[5], url = p[7], name = p[0];
    var place = esc_(GU_EN[p[1]] || p[1]) + " · " + esc_(DONG_EN[p[2]] || p[2] || "—");
    var priceLine = "";
    var links = "";
    if (st === 2) {
      var d = DETAIL[name + "|" + p[1]];
      var first = d && d.prices && d.prices[0];
      if (first) priceLine = '<div class="xpp-price">' + esc_(first.proc) + " from <b>" + WON(first.low) + "</b></div>";
      links += '<a class="xpp-link primary" href="clinic-detail.html">View clinic</a>';
    } else if (st === 1 && url) {
      priceLine = '<div class="xpp-sub">Website on file — no price we could read yet.</div>';
      links += '<a class="xpp-link primary" target="_blank" rel="noopener" href="' + esc_(url) + '">Website ↗</a>';
    } else {
      priceLine = '<div class="xpp-sub">In the registry. No website found yet — the sweep is still looking.</div>';
    }
    links += '<a class="xpp-link" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=' + p[3] + "," + p[4] + '">Map ↗</a>';
    return '<div class="xp-popup">' +
      '<div class="xpp-top"><span class="xp-dot st' + st + '"></span><b>' + esc_(name) + "</b></div>" +
      '<div class="xpp-place">' + place + " · " + ST_LABEL[st] + "</div>" +
      priceLine + '<div class="xpp-links">' + links + "</div></div>";
  }
  var popup = L.popup({ closeButton: false, minWidth: 232, className: "xp-pop" });

  /* ---------- filters + list ---------- */
  var f = { q: "", gu: "all", st: "all" };
  var listEl = document.getElementById("xp-list");
  var countEl = document.getElementById("xp-count");
  var capNote = document.getElementById("xp-cap");
  var LIST_CAP = 150;

  function pass(p) {
    if (f.gu !== "all" && p[1] !== f.gu) return false;
    if (f.st !== "all" && p[5] !== Number(f.st)) return false;
    if (f.q) {
      var q = f.q.toLowerCase();
      var hay = (p[0] + " " + (p[2] || "") + " " + (DONG_EN[p[2]] || "")).toLowerCase();
      if (hay.indexOf(q) < 0) return false;
    }
    return true;
  }

  function cardHtml(p) {
    var st = p[5];
    var priceLine = "";
    if (st === 2) {
      var d = DETAIL[p[0] + "|" + p[1]];
      var first = d && d.prices && d.prices[0];
      if (first) priceLine = '<div class="xc-price">' + esc_(first.proc) + " from <b>" + WON(first.low) + "</b></div>";
    } else if (st === 1) {
      priceLine = '<div class="xc-sub">Website on file · price not readable yet</div>';
    } else {
      priceLine = '<div class="xc-sub">Registry record · no website found yet</div>';
    }
    return '<button class="xc" type="button">' +
      '<span class="xc-pin st' + st + '"></span>' +
      '<span class="xc-body"><span class="xc-name">' + esc_(p[0]) + "</span>" +
      '<span class="xc-place">' + esc_(GU_EN[p[1]] || p[1]) + " · " + esc_(DONG_EN[p[2]] || p[2] || "—") + "</span>" +
      priceLine + "</span>" +
      (st === 1 && p[7] ? '<span class="xc-go">↗</span>' : "") +
      "</button>";
  }

  function render() {
    var shown = 0, total = 0;
    var htmlArr = [];
    for (var i = 0; i < PTS.length; i++) {
      var p = PTS[i];
      if (!pass(p)) continue;
      total++;
      if (shown < LIST_CAP) { htmlArr.push(cardHtml(p)); shown++; }
    }
    listEl.innerHTML = htmlArr.join("");
    listEl.removeAttribute("data-total");
    listEl.setAttribute("data-total", String(total));
    countEl.innerHTML = "<b>" + total.toLocaleString("en-US") + "</b> match" + (total === 1 ? "" : "es") +
      " · " + PTS.length.toLocaleString("en-US") + " plotted of 2,387 registry records";
    capNote.style.display = total > LIST_CAP ? "" : "none";
    /* map sync */
    group.clearLayers();
    INDEX.forEach(function (it) { if (pass(it.p)) group.addLayer(it.m); });
  }

  /* fly to a card's clinic on click */
  listEl.addEventListener("click", function (ev) {
    var btn = ev.target.closest(".xc");
    if (!btn) return;
    var idx = Array.prototype.indexOf.call(listEl.children, btn);
    var shownIdx = 0, target = null;
    for (var i = 0; i < PTS.length; i++) {
      if (!pass(PTS[i])) continue;
      if (shownIdx === idx) { target = PTS[i]; break; }
      shownIdx++;
    }
    if (!target) return;
    var latlng = L.latLng(target[3], target[4]);
    function open() { popup.setLatLng(latlng).setContent(popupHtml(target)).openOn(map); }
    if (map.getBounds().pad(-.12).contains(latlng)) open();
    else { map.flyTo(latlng, Math.max(map.getZoom(), 14), { duration: .55 }); map.once("moveend", open); }
    document.getElementById("xp-side").classList.remove("open");
  });

  /* chip wiring */
  document.querySelectorAll("[data-gu]").forEach(function (b) {
    b.addEventListener("click", function () {
      f.gu = b.getAttribute("data-gu");
      document.querySelectorAll("[data-gu]").forEach(function (x) { x.classList.toggle("on", x === b); });
      render();
    });
  });
  document.querySelectorAll("[data-st]").forEach(function (b) {
    b.addEventListener("click", function () {
      f.st = b.getAttribute("data-st");
      document.querySelectorAll("[data-st]").forEach(function (x) { x.classList.toggle("on", x === b); });
      render();
    });
  });
  var qEl = document.getElementById("xp-q");
  var qTimer = null;
  qEl.addEventListener("input", function () {
    clearTimeout(qTimer);
    qTimer = setTimeout(function () { f.q = qEl.value.trim(); render(); }, 140);
  });

  /* mobile: panel toggle */
  var toggle = document.getElementById("xp-toggle");
  if (toggle) toggle.addEventListener("click", function () {
    document.getElementById("xp-side").classList.toggle("open");
  });

  /* keep the app under the review chrome */
  function fit() {
    var anchor = document.querySelector(".mock-nav");
    var top = anchor ? anchor.getBoundingClientRect().bottom + window.scrollY : 0;
    document.documentElement.style.setProperty("--xp-top", top + "px");
  }
  fit();
  window.addEventListener("resize", fit);
  if (window.ResizeObserver) new ResizeObserver(fit).observe(document.querySelector(".mock-banner"));

  render();
})();
