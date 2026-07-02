// Minimal theme toggle for the server-rendered pages (category, topic, path,
// and error pages). The homepage wires its own toggle inside script.js; this
// mirrors that behavior — same storage key, same meta theme-color values —
// without pulling in the full app.
(function () {
  var STORAGE_KEY = "rwwc-theme";
  var THEME_COLORS = { light: "#f4f1ea", dark: "#15110d" };

  var button = document.getElementById("theme-toggle");
  if (!button) {
    return;
  }
  var meta = document.querySelector('meta[name="theme-color"]');

  var currentTheme = function () {
    return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  };

  var applyTheme = function (theme) {
    var next = theme === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    if (meta) {
      meta.setAttribute("content", THEME_COLORS[next]);
    }
    button.setAttribute(
      "aria-label",
      next === "dark" ? "Switch to light theme" : "Switch to dark theme"
    );
  };

  applyTheme(currentTheme());

  button.addEventListener("click", function () {
    var next = currentTheme() === "dark" ? "light" : "dark";
    applyTheme(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch (error) {
      /* private mode — theme just won't persist */
    }
  });
})();
