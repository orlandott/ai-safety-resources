// Google tag (gtag.js) bootstrap with Consent Mode v2. Kept in a separate
// self-hosted file rather than inline so the CSP script-src can stay free of
// 'unsafe-inline'.
//
// Analytics cookies are denied by default in the EEA, UK, and Switzerland and
// only set after the visitor accepts the consent banner below. Google applies
// the regional default from the request's origin, so an EU visitor the
// timezone heuristic misses still gets no cookies — the banner just never
// shows and analytics stays denied.
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

  // Timezone-based guess at whether the visitor is somewhere the banner is
  // required. Over-matching (Europe/* includes non-EEA cities) is harmless;
  // under-matching is covered by the regional consent default above.
  function consentBannerNeeded() {
    try {
      var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      return tz.indexOf("Europe/") === 0 ||
        ["Atlantic/Reykjavik", "Atlantic/Canary", "Atlantic/Madeira",
         "Atlantic/Azores", "Atlantic/Faroe"].indexOf(tz) !== -1;
    } catch (e) {
      return true;
    }
  }

  function setChoice(choice) {
    try { localStorage.setItem(STORAGE_KEY, choice); } catch (e) {}
    gtag("consent", "update", { analytics_storage: choice });
    var banner = document.getElementById("cookie-consent");
    if (banner) banner.remove();
  }

  function showBanner() {
    if (document.getElementById("cookie-consent")) return;
    var banner = document.createElement("div");
    banner.id = "cookie-consent";
    banner.className = "cookie-consent";
    banner.setAttribute("role", "region");
    banner.setAttribute("aria-label", "Cookie consent");
    banner.innerHTML =
      '<p class="cookie-consent-copy">We use Google Analytics cookies to understand overall site traffic. ' +
      'See our <a href="/privacy/">privacy policy</a>.</p>' +
      '<div class="cookie-consent-actions">' +
      '<button type="button" class="cookie-consent-button" data-consent="denied">Decline</button>' +
      '<button type="button" class="cookie-consent-button cookie-consent-accept" data-consent="granted">Accept</button>' +
      '</div>';
    banner.addEventListener("click", function (ev) {
      var choice = ev.target && ev.target.getAttribute("data-consent");
      if (choice) setChoice(choice);
    });
    document.body.appendChild(banner);
  }

  function init() {
    // "Cookie settings" link on the privacy page reopens the banner so a
    // visitor can change their choice at any time.
    var reopen = document.getElementById("cookie-settings");
    if (reopen) {
      reopen.addEventListener("click", function (ev) {
        ev.preventDefault();
        showBanner();
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
