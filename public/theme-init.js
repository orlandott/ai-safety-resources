// Sets the color theme before first paint to avoid a flash of the wrong
// theme. Loaded synchronously in <head>; kept tiny on purpose.
(function () {
  var theme = "light";
  try {
    var stored = window.localStorage.getItem("rwwc-theme");
    if (stored === "light" || stored === "dark") {
      theme = stored;
    } else if (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      theme = "dark";
    }
  } catch (error) {
    theme = "light";
  }
  document.documentElement.setAttribute("data-theme", theme);
})();
