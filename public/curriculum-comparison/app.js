// Curriculum comparison (unlisted page). Progressive enhancement over the
// static table in index.html: course chips, preset views, and a toggle that
// fades rows where every selected course has the same value. The table is the
// single source of truth — this script only reads the DOM, so the two cannot
// drift apart.
//
// Selection persists in localStorage only, matching the site-wide promise
// that nothing leaves the browser.
(function () {
  "use strict";

  var STORAGE_KEY = "asr-curriculum-comparison";

  var table = document.getElementById("comparison-table");
  var controls = document.getElementById("comparison-controls");
  if (!table || !controls) return;

  var headerCells = Array.prototype.slice.call(
    table.querySelectorAll("thead th[data-course]")
  );
  var courses = headerCells.map(function (th) {
    return {
      id: th.getAttribute("data-course"),
      name: th.getAttribute("data-short-name") || th.textContent.trim(),
    };
  });
  var allIds = courses.map(function (c) {
    return c.id;
  });

  var PRESETS = [
    { label: "All nine", ids: allIds },
    { label: "Beginner-friendly", ids: ["future-of-ai", "lens-academy", "aises"] },
    { label: "Hands-on technical", ids: ["tech-ai-safety", "project-sprint", "intro-ml-safety", "arena"] },
    { label: "Start today, self-paced", ids: ["future-of-ai", "lens-academy", "intro-ml-safety", "arena"] },
    { label: "Short on time", ids: ["future-of-ai", "ops-bootcamp"] },
  ];

  var state = { selected: allIds.slice(), fade: false };

  function loadState() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var parsed = JSON.parse(raw);
      if (Array.isArray(parsed.selected)) {
        var valid = parsed.selected.filter(function (id) {
          return allIds.indexOf(id) !== -1;
        });
        if (valid.length > 0) state.selected = valid;
      }
      state.fade = parsed.fade === true;
    } catch (error) {
      /* Corrupt or unavailable storage: fall back to defaults. */
    }
  }

  function saveState() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      /* Private browsing or full storage: selection just won't persist. */
    }
  }

  var presetRow = controls.querySelector(".compare-preset-row");
  var chipRow = controls.querySelector(".compare-chip-row");
  var fadeToggle = controls.querySelector("#compare-fade");
  var countLine = controls.querySelector(".compare-count");

  PRESETS.forEach(function (preset) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "compare-preset";
    button.textContent = preset.label;
    button.addEventListener("click", function () {
      state.selected = preset.ids.slice();
      apply();
    });
    presetRow.appendChild(button);
  });

  var chipsById = {};
  courses.forEach(function (course) {
    var chip = document.createElement("button");
    chip.type = "button";
    chip.className = "compare-chip";
    chip.textContent = course.name;
    chip.addEventListener("click", function () {
      var at = state.selected.indexOf(course.id);
      if (at === -1) {
        state.selected.push(course.id);
      } else {
        state.selected.splice(at, 1);
      }
      apply();
    });
    chipsById[course.id] = chip;
    chipRow.appendChild(chip);
  });

  fadeToggle.addEventListener("change", function () {
    state.fade = fadeToggle.checked;
    apply();
  });

  function markIdenticalRows() {
    var rows = table.querySelectorAll('tbody tr[data-compare="value"]');
    Array.prototype.forEach.call(rows, function (row) {
      var identical = false;
      if (state.fade && state.selected.length >= 2) {
        var values = state.selected.map(function (id) {
          var cell = row.querySelector('td[data-course="' + id + '"]');
          return cell ? cell.getAttribute("data-value") : null;
        });
        identical = values.every(function (value) {
          return value !== null && value === values[0];
        });
      }
      row.classList.toggle("is-identical", identical);
    });
  }

  function apply() {
    var cells = table.querySelectorAll("[data-course]");
    Array.prototype.forEach.call(cells, function (cell) {
      var shown = state.selected.indexOf(cell.getAttribute("data-course")) !== -1;
      cell.classList.toggle("col-hidden", !shown);
    });
    courses.forEach(function (course) {
      var pressed = state.selected.indexOf(course.id) !== -1;
      chipsById[course.id].setAttribute("aria-pressed", pressed ? "true" : "false");
    });
    fadeToggle.checked = state.fade;
    markIdenticalRows();
    countLine.textContent =
      state.selected.length < 2
        ? "Select at least two curricula to compare."
        : "Comparing " + state.selected.length + " of " + courses.length + " curricula.";
    saveState();
  }

  loadState();
  apply();
  controls.classList.add("is-ready");
})();
