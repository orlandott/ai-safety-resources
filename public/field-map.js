// Interactive AI-safety field map.
//
// Reads the JSON inlined by scripts/build.mjs (#field-map-data) and renders
// every research branch as a bubble sized by a chosen metric. A year slider
// animates the bubbles growing/shrinking as the field changes over time.
//
// Vanilla, zero-dependency, theme-aware (colors come from CSS custom props).
(function () {
  "use strict";

  var root = document.querySelector("[data-field-map]");
  var dataEl = document.getElementById("field-map-data");
  if (!root || !dataEl) return;

  var DATA;
  try {
    DATA = JSON.parse(dataEl.textContent);
  } catch (e) {
    return; // leave the no-JS fallback table in place
  }

  var SVG_NS = "http://www.w3.org/2000/svg";
  var prefersReduced =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ── Data helpers ──────────────────────────────────────────────────────────

  // Linear interpolation of a metric series at an arbitrary year. Clamps at the
  // ends (no wild extrapolation), returns 0 when the branch has no data.
  function valueAt(bucket, metric, year) {
    var series = bucket[metric];
    if (!series || !series.length) return 0;
    if (year <= series[0].year) return series[0].value;
    var last = series[series.length - 1];
    if (year >= last.year) return last.value;
    for (var i = 0; i < series.length - 1; i++) {
      var a = series[i],
        b = series[i + 1];
      if (year >= a.year && year <= b.year) {
        var t = (year - a.year) / (b.year - a.year);
        return a.value + t * (b.value - a.value);
      }
    }
    return last.value;
  }

  function isEstimated(bucket, metric, year) {
    var series = bucket[metric];
    if (!series || !series.length) return false;
    // estimated if either surrounding snapshot is flagged
    for (var i = 0; i < series.length; i++) {
      if (series[i].estimated) {
        // only the people metric carries the flag; treat the whole series as est. if any point is
        return true;
      }
    }
    return false;
  }

  // Metric keys actually present in the data, preserving meta order.
  var METRICS = Object.keys(DATA.meta.metrics).filter(function (k) {
    return DATA.buckets.some(function (b) {
      return b[k] && b[k].length;
    });
  });
  if (!METRICS.length) return;
  var metric =
    METRICS.indexOf(DATA.meta.defaultMetric) >= 0 ? DATA.meta.defaultMetric : METRICS[0];

  // Year range for the active metric.
  function yearRange(m) {
    var min = Infinity,
      max = -Infinity;
    DATA.buckets.forEach(function (b) {
      (b[m] || []).forEach(function (p) {
        if (p.year < min) min = p.year;
        if (p.year > max) max = p.year;
      });
    });
    return { min: min, max: max };
  }

  // Stable size scale: largest bubble across ALL years so growth reads visually.
  function maxValueFor(m) {
    var mv = 0;
    var r = yearRange(m);
    DATA.buckets.forEach(function (b) {
      for (var y = r.min; y <= r.max; y++) {
        var v = valueAt(b, m, y);
        if (v > mv) mv = v;
      }
    });
    return mv || 1;
  }

  // ── State ─────────────────────────────────────────────────────────────────

  var range = yearRange(metric);
  var year = range.max;
  var nodes = DATA.buckets.map(function (b) {
    return {
      b: b,
      x: 0,
      y: 0,
      r: 0,
      tr: 0, // target radius
      el: null,
      circle: null,
      label: null,
    };
  });

  // ── DOM scaffold ──────────────────────────────────────────────────────────

  root.hidden = false;
  var controls = root.querySelector("[data-field-map-controls]");
  var stage = root.querySelector("[data-field-map-stage]");
  var noteEl = root.querySelector("[data-field-map-note]");

  // Metric toggle
  var metricWrap = document.createElement("div");
  metricWrap.className = "field-map-metric";
  METRICS.forEach(function (m) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "field-map-metric-btn" + (m === metric ? " is-active" : "");
    btn.textContent = DATA.meta.metrics[m].label;
    btn.setAttribute("aria-pressed", m === metric ? "true" : "false");
    btn.addEventListener("click", function () {
      if (m === metric) return;
      setMetric(m);
    });
    metricWrap.appendChild(btn);
  });

  // Year slider + play
  var timeWrap = document.createElement("div");
  timeWrap.className = "field-map-time";
  var playBtn = document.createElement("button");
  playBtn.type = "button";
  playBtn.className = "field-map-play";
  playBtn.setAttribute("aria-label", "Play through the years");
  playBtn.textContent = "▶";
  var slider = document.createElement("input");
  slider.type = "range";
  slider.className = "field-map-slider";
  slider.min = String(range.min);
  slider.max = String(range.max);
  slider.step = "1";
  slider.value = String(year);
  slider.setAttribute("aria-label", "Year");
  var yearOut = document.createElement("output");
  yearOut.className = "field-map-year";
  yearOut.textContent = String(year);
  timeWrap.appendChild(playBtn);
  timeWrap.appendChild(slider);
  timeWrap.appendChild(yearOut);

  // Legend
  var legend = document.createElement("div");
  legend.className = "field-map-legend";
  DATA.meta.groups.forEach(function (g) {
    var item = document.createElement("span");
    item.className = "field-map-legend-item";
    item.setAttribute("data-group", g.key);
    var dot = document.createElement("span");
    dot.className = "field-map-legend-dot";
    item.appendChild(dot);
    item.appendChild(document.createTextNode(g.label));
    legend.appendChild(item);
  });

  // Only surface the metric toggle once more than one metric has data (the
  // "papers" series is empty until the monthly arXiv job populates it).
  if (METRICS.length > 1) controls.appendChild(metricWrap);
  controls.appendChild(timeWrap);
  controls.appendChild(legend);

  // SVG
  var svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", "field-map-svg");
  svg.setAttribute("role", "img");
  svg.setAttribute(
    "aria-label",
    "Bubble chart of AI safety research branches sized by " + DATA.meta.metrics[metric].label
  );
  stage.appendChild(svg);

  // Tooltip
  var tip = document.createElement("div");
  tip.className = "field-map-tip";
  tip.setAttribute("role", "status");
  tip.hidden = true;
  stage.appendChild(tip);

  // Build one group per node (circle + label) once.
  nodes.forEach(function (n) {
    var g = document.createElementNS(SVG_NS, "g");
    g.setAttribute("class", "fm-node");
    g.setAttribute("tabindex", "0");
    g.setAttribute("data-group", n.b.group);
    if (n.b.topic) g.setAttribute("data-href", n.b.topic);
    g.setAttribute("role", n.b.topic ? "link" : "img");

    var c = document.createElementNS(SVG_NS, "circle");
    c.setAttribute("class", "fm-bubble");
    g.appendChild(c);

    var t = document.createElementNS(SVG_NS, "text");
    t.setAttribute("class", "fm-label");
    t.setAttribute("text-anchor", "middle");
    t.setAttribute("dy", "0.32em");
    g.appendChild(t);

    n.el = g;
    n.circle = c;
    n.label = t;

    g.addEventListener("mouseenter", function () {
      showTip(n);
    });
    g.addEventListener("mousemove", function (ev) {
      positionTip(ev);
    });
    g.addEventListener("mouseleave", hideTip);
    g.addEventListener("focus", function () {
      showTip(n, true);
    });
    g.addEventListener("blur", hideTip);
    g.addEventListener("click", function () {
      if (n.b.topic) window.location.href = n.b.topic;
    });
    g.addEventListener("keydown", function (ev) {
      if ((ev.key === "Enter" || ev.key === " ") && n.b.topic) {
        ev.preventDefault();
        window.location.href = n.b.topic;
      }
    });

    svg.appendChild(g);
  });

  // ── Layout / simulation ───────────────────────────────────────────────────

  var W = 900,
    H = 540,
    maxValue = maxValueFor(metric);

  function measure() {
    W = Math.max(320, stage.clientWidth || 900);
    H = W < 560 ? 460 : 540;
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
  }

  // Group anchor x positions (thirds) so groups cluster but can overlap.
  function groupAnchorX(key) {
    var idx = DATA.meta.groups.findIndex(function (g) {
      return g.key === key;
    });
    var n = DATA.meta.groups.length;
    return (W * (idx + 0.5)) / n;
  }

  function radiusFor(value) {
    if (value <= 0) return 0;
    var minSide = Math.min(W, H);
    var rMax = minSide * 0.16; // largest bubble caps at ~16% of the short side
    var rMin = 6;
    return rMin + (rMax - rMin) * Math.sqrt(value / maxValue);
  }

  // Seed positions deterministically (by index) the first time.
  function seedPositions() {
    nodes.forEach(function (n, i) {
      var ax = groupAnchorX(n.b.group);
      // golden-angle spread around the group anchor for a stable, non-random start
      var ang = i * 2.399963;
      var rad = 30 + (i % 5) * 18;
      n.x = ax + Math.cos(ang) * rad;
      n.y = H / 2 + Math.sin(ang) * rad;
    });
  }

  function updateTargets() {
    nodes.forEach(function (n) {
      n.tr = radiusFor(valueAt(n.b, metric, year));
    });
  }

  // One relaxation step: ease radius toward target, resolve collisions, pull
  // toward the group anchor + vertical center. Returns total movement (for
  // settling detection).
  function step() {
    var moved = 0;
    // ease radii
    nodes.forEach(function (n) {
      n.r += (n.tr - n.r) * 0.18;
    });
    // centering / grouping pull
    nodes.forEach(function (n) {
      if (n.tr <= 0) return;
      var ax = groupAnchorX(n.b.group);
      n.x += (ax - n.x) * 0.04;
      n.y += (H / 2 - n.y) * 0.06;
    });
    // collision resolution
    for (var i = 0; i < nodes.length; i++) {
      var a = nodes[i];
      if (a.tr <= 0) continue;
      for (var j = i + 1; j < nodes.length; j++) {
        var b = nodes[j];
        if (b.tr <= 0) continue;
        var dx = b.x - a.x,
          dy = b.y - a.y;
        var d = Math.sqrt(dx * dx + dy * dy) || 0.01;
        var min = a.r + b.r + 2;
        if (d < min) {
          var push = (min - d) / 2;
          var ux = dx / d,
            uy = dy / d;
          a.x -= ux * push;
          a.y -= uy * push;
          b.x += ux * push;
          b.y += uy * push;
          moved += push;
        }
      }
    }
    // keep inside the box
    nodes.forEach(function (n) {
      if (n.tr <= 0) return;
      var r = n.r;
      if (n.x < r) n.x = r;
      if (n.x > W - r) n.x = W - r;
      if (n.y < r) n.y = r;
      if (n.y > H - r) n.y = H - r;
    });
    return moved;
  }

  function render() {
    nodes.forEach(function (n) {
      if (n.tr <= 0) {
        n.el.setAttribute("opacity", "0");
        n.el.style.pointerEvents = "none";
        return;
      }
      n.el.setAttribute("opacity", "1");
      n.el.style.pointerEvents = "";
      n.el.setAttribute("transform", "translate(" + n.x.toFixed(1) + "," + n.y.toFixed(1) + ")");
      n.circle.setAttribute("r", Math.max(0, n.r).toFixed(1));
      // show the label only when the bubble is roomy enough
      if (n.r > 30) {
        var fontSize = Math.min(15, 8 + n.r / 7);
        n.label.textContent = fitLabel(n.b.label, n.r, fontSize);
        n.label.setAttribute("opacity", "1");
        n.label.setAttribute("font-size", fontSize.toFixed(1));
      } else {
        n.label.setAttribute("opacity", "0");
      }
    });
  }

  // Trim a label to what fits inside a bubble of radius r at the given font
  // size: keep the full label if it fits, else the first word, else ellipsis.
  function fitLabel(s, r, fontSize) {
    var maxChars = Math.max(3, Math.floor((1.7 * r) / (0.56 * fontSize)));
    if (s.length <= maxChars) return s;
    var first = s.split(/\s*&\s*|\s+/)[0];
    if (first.length <= maxChars) return first;
    return first.slice(0, Math.max(1, maxChars - 1)) + "…";
  }

  var rafId = null,
    settleFrames = 0;
  function loop() {
    var moved = step();
    render();
    // also count radius easing as movement
    var rDelta = 0;
    nodes.forEach(function (n) {
      rDelta += Math.abs(n.tr - n.r);
    });
    if (moved < 0.4 && rDelta < 0.6) {
      settleFrames++;
    } else {
      settleFrames = 0;
    }
    if (settleFrames > 8 && !playing) {
      rafId = null;
      return; // settled — stop animating to save battery
    }
    rafId = requestAnimationFrame(loop);
  }

  function kick() {
    if (prefersReduced) {
      // snap to target without animating
      nodes.forEach(function (n) {
        n.r = n.tr;
      });
      for (var k = 0; k < 200; k++) step();
      render();
      return;
    }
    settleFrames = 0;
    if (rafId == null) rafId = requestAnimationFrame(loop);
  }

  // ── Tooltip ───────────────────────────────────────────────────────────────

  function showTip(n, keyboard) {
    var m = DATA.meta.metrics[metric];
    var v = valueAt(n.b, metric, year);
    var est = isEstimated(n.b, metric, year);
    var shown = metric === "people" ? Math.round(v) : Math.round(v);
    tip.innerHTML =
      '<strong>' +
      escapeHtml(n.b.label) +
      "</strong>" +
      '<span class="field-map-tip-num">' +
      shown +
      " " +
      escapeHtml(m.unit) +
      (est ? " <em>(est.)</em>" : "") +
      " · " +
      year +
      "</span>" +
      '<span class="field-map-tip-blurb">' +
      escapeHtml(n.b.blurb) +
      "</span>" +
      (n.b.topic ? '<span class="field-map-tip-cta">Open topic →</span>' : "");
    tip.hidden = false;
    if (keyboard) {
      // position near the node for keyboard users
      var rect = stage.getBoundingClientRect();
      var sx = (n.x / W) * rect.width;
      var sy = (n.y / H) * rect.height;
      tip.style.left = sx + "px";
      tip.style.top = Math.max(0, sy - 10) + "px";
    }
  }
  function positionTip(ev) {
    var rect = stage.getBoundingClientRect();
    tip.style.left = ev.clientX - rect.left + 14 + "px";
    tip.style.top = ev.clientY - rect.top + 14 + "px";
  }
  function hideTip() {
    tip.hidden = true;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // ── Note / caption ────────────────────────────────────────────────────────

  function updateNote() {
    var m = DATA.meta.metrics[metric];
    var total = 0;
    nodes.forEach(function (n) {
      total += valueAt(n.b, metric, year);
    });
    noteEl.innerHTML =
      "<strong>" +
      Math.round(total).toLocaleString() +
      " " +
      escapeHtml(m.unit) +
      "</strong> across " +
      nodes.filter(function (n) {
        return n.tr > 0;
      }).length +
      " branches in " +
      year +
      ". " +
      escapeHtml(m.note);
  }

  // ── Wiring ────────────────────────────────────────────────────────────────

  function setYear(y) {
    year = y;
    yearOut.textContent = String(y);
    slider.value = String(y);
    updateTargets();
    updateNote();
    kick();
  }

  function setMetric(m) {
    metric = m;
    range = yearRange(metric);
    maxValue = maxValueFor(metric);
    // keep year in range
    if (year < range.min) year = range.min;
    if (year > range.max) year = range.max;
    slider.min = String(range.min);
    slider.max = String(range.max);
    slider.value = String(year);
    yearOut.textContent = String(year);
    Array.prototype.forEach.call(metricWrap.children, function (btn, i) {
      var active = METRICS[i] === m;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
    svg.setAttribute(
      "aria-label",
      "Bubble chart of AI safety research branches sized by " + DATA.meta.metrics[metric].label
    );
    updateTargets();
    updateNote();
    kick();
  }

  slider.addEventListener("input", function () {
    setYear(parseInt(slider.value, 10));
  });

  // Play / pause sweeps the slider across the range.
  var playing = false,
    playTimer = null;
  function stopPlay() {
    playing = false;
    playBtn.textContent = "▶";
    playBtn.classList.remove("is-playing");
    if (playTimer) {
      clearInterval(playTimer);
      playTimer = null;
    }
  }
  function startPlay() {
    if (year >= range.max) setYear(range.min);
    playing = true;
    playBtn.textContent = "❚❚";
    playBtn.classList.add("is-playing");
    kick();
    playTimer = setInterval(function () {
      if (year >= range.max) {
        stopPlay();
        return;
      }
      setYear(year + 1);
    }, prefersReduced ? 1 : 1100);
  }
  playBtn.addEventListener("click", function () {
    if (playing) stopPlay();
    else startPlay();
  });

  // ── Init ──────────────────────────────────────────────────────────────────

  measure();
  seedPositions();
  updateTargets();
  updateNote();
  // warm the layout so first paint isn't a pile in the corner
  for (var w = 0; w < 60; w++) step();
  render();
  kick();

  var resizeT = null;
  window.addEventListener("resize", function () {
    if (resizeT) clearTimeout(resizeT);
    resizeT = setTimeout(function () {
      measure();
      maxValue = maxValueFor(metric);
      updateTargets();
      kick();
    }, 150);
  });
})();
