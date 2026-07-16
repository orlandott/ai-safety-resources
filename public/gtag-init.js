// Google tag (gtag.js) bootstrap with Consent Mode v2. Kept in a separate
// self-hosted file rather than inline so the CSP script-src can stay free of
// 'unsafe-inline'.
//
// Analytics cookies are denied by default in the EEA, UK, and Switzerland and
// only set after the visitor opts in via the consent banner below. Google
// applies the regional default from the request's origin, so an EU visitor
// the timezone heuristic misses still gets no cookies — the banner just never
// shows and analytics stays denied.
//
// Banner layout: first screen offers Accept and Configure; Configure opens a
// second screen where Essential is always on and Analytics is an opt-in
// checkbox. France and Germany (CNIL / DSK guidance) additionally get an
// immediate Decline button on the first screen.
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}

(function () {
  var STORAGE_KEY = "analytics-consent";
  // EU member states plus the rest of the EEA (IS, LI, NO), the UK, and
  // Switzerland — everywhere an ePrivacy-style opt-in applies.
  var CONSENT_REGIONS = [
    "AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE",
    "IT","LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE",
    "IS","LI","NO","GB","CH"
  ];

  // This site runs no advertising: every ad signal stays permanently denied.
  gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "granted"
  });
  gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
    region: CONSENT_REGIONS
  });

  var stored = null;
  try { stored = localStorage.getItem(STORAGE_KEY); } catch (e) {}
  if (stored === "granted" || stored === "denied") {
    gtag("consent", "update", { analytics_storage: stored });
  }

  gtag("js", new Date());
  gtag("config", "G-MCRWR4G369");

  function timeZone() {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    } catch (e) {
      return null; // unknown — fall back to the strictest behavior
    }
  }

  // Timezone-based guess at whether the visitor is somewhere the banner is
  // required. Over-matching (Europe/* includes non-EEA cities) is harmless;
  // under-matching is covered by the regional consent default above.
  function consentBannerNeeded() {
    var tz = timeZone();
    if (tz === null) return true;
    return tz.indexOf("Europe/") === 0 ||
      ["Atlantic/Reykjavik", "Atlantic/Canary", "Atlantic/Madeira",
       "Atlantic/Azores", "Atlantic/Faroe"].indexOf(tz) !== -1;
  }

  // France and Germany require a first-layer decline button.
  function immediateDeclineRequired() {
    var tz = timeZone();
    if (tz === null) return true;
    return ["Europe/Paris", "Europe/Berlin", "Europe/Busingen"].indexOf(tz) !== -1;
  }

  function setChoice(choice) {
    try { localStorage.setItem(STORAGE_KEY, choice); } catch (e) {}
    stored = choice;
    gtag("consent", "update", { analytics_storage: choice });
    var banner = document.getElementById("cookie-consent");
    if (banner) banner.remove();
  }

  function firstScreenMarkup() {
    var decline = immediateDeclineRequired()
      ? '<button type="button" class="cookie-consent-button" data-consent="denied">Decline</button>'
      : "";
    return (
      '<p class="cookie-consent-copy">We use Google Analytics cookies to understand overall site traffic. ' +
      'See our <a href="/privacy/">privacy policy</a>.</p>' +
      '<div class="cookie-consent-actions">' +
      '<button type="button" class="cookie-consent-button" data-action="configure">Configure</button>' +
      decline +
      '<button type="button" class="cookie-consent-button cookie-consent-accept" data-consent="granted">Accept</button>' +
      "</div>"
    );
  }

  function configScreenMarkup() {
    var analyticsOn = stored === "granted" ? " checked" : "";
    return (
      '<p class="cookie-consent-copy">Choose which cookies this site may use.</p>' +
      '<div class="cookie-consent-options">' +
      '<label class="cookie-consent-option">' +
      '<input type="checkbox" checked disabled />' +
      "<span><strong>Essential</strong> — keeps the site working: your theme and reading list, stored only on this device. Always on.</span>" +
      "</label>" +
      '<label class="cookie-consent-option">' +
      '<input type="checkbox" id="cookie-consent-analytics"' + analyticsOn + " />" +
      "<span><strong>Analytics</strong> — Google Analytics cookies that help us measure overall traffic.</span>" +
      "</label>" +
      "</div>" +
      '<div class="cookie-consent-actions">' +
      '<button type="button" class="cookie-consent-button cookie-consent-accept" data-action="save">Save choices</button>' +
      "</div>"
    );
  }

  function showBanner(screen) {
    var banner = document.getElementById("cookie-consent");
    if (!banner) {
      banner = document.createElement("div");
      banner.id = "cookie-consent";
      banner.className = "cookie-consent";
      banner.setAttribute("role", "region");
      banner.setAttribute("aria-label", "Cookie consent");
      banner.addEventListener("click", function (ev) {
        var el = ev.target;
        if (!el || !el.getAttribute) return;
        var choice = el.getAttribute("data-consent");
        if (choice) return setChoice(choice);
        var action = el.getAttribute("data-action");
        if (action === "configure") {
          banner.innerHTML = configScreenMarkup();
        } else if (action === "save") {
          var box = document.getElementById("cookie-consent-analytics");
          setChoice(box && box.checked ? "granted" : "denied");
        }
      });
      document.body.appendChild(banner);
    }
    banner.innerHTML = screen === "config" ? configScreenMarkup() : firstScreenMarkup();
  }

  function init() {
    // The "cookie settings" link on the privacy page jumps straight to the
    // configure screen so a visitor can change their choice at any time.
    var reopen = document.getElementById("cookie-settings");
    if (reopen) {
      reopen.addEventListener("click", function (ev) {
        ev.preventDefault();
        showBanner("config");
      });
    }
    if (stored !== "granted" && stored !== "denied" && consentBannerNeeded()) {
      showBanner();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
