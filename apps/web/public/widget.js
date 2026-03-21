/**
 * MyBizOS Chat Widget — Embeddable Script
 *
 * Usage:
 *   <script src="https://app.mybizos.com/widget.js" data-org="jims-plumbing"></script>
 *
 * Options (data attributes on the script tag):
 *   data-org       — (required) the org slug, e.g. "jims-plumbing"
 *   data-color     — (optional) hex accent color, default "#2563eb"
 *   data-position  — (optional) "bottom-right" (default) or "bottom-left"
 */
(function () {
  "use strict";

  // Prevent double-init
  if (window.__mybizos_widget_loaded) return;
  window.__mybizos_widget_loaded = true;

  // Read config from the script tag
  var script =
    document.currentScript ||
    document.querySelector('script[data-org][src*="widget.js"]');

  if (!script) {
    console.warn("[MyBizOS] Widget script tag not found.");
    return;
  }

  var orgSlug = script.getAttribute("data-org");
  if (!orgSlug) {
    console.warn("[MyBizOS] Missing data-org attribute on widget script tag.");
    return;
  }

  var accentColor = script.getAttribute("data-color") || "#2563eb";
  var position = script.getAttribute("data-position") || "bottom-right";
  var baseUrl = script.src
    ? script.src.replace(/\/widget\.js.*$/, "")
    : "https://app.mybizos.com";

  // Create container
  var container = document.createElement("div");
  container.id = "mybizos-chat-widget";
  container.style.cssText =
    "position:fixed;bottom:20px;z-index:2147483647;" +
    (position === "bottom-left" ? "left:20px;" : "right:20px;");

  // Create the floating button
  var btn = document.createElement("button");
  btn.setAttribute("aria-label", "Open chat");
  btn.style.cssText =
    "width:60px;height:60px;border-radius:50%;border:none;cursor:pointer;" +
    "background:" + accentColor + ";color:#fff;display:flex;align-items:center;" +
    "justify-content:center;box-shadow:0 4px 14px rgba(0,0,0,0.25);" +
    "transition:transform 0.15s ease;";
  btn.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>';

  btn.addEventListener("mouseenter", function () {
    btn.style.transform = "scale(1.08)";
  });
  btn.addEventListener("mouseleave", function () {
    btn.style.transform = "scale(1)";
  });

  // Create iframe (hidden initially)
  var iframe = document.createElement("iframe");
  iframe.src =
    baseUrl +
    "/chat-embed?org=" +
    encodeURIComponent(orgSlug) +
    "&color=" +
    encodeURIComponent(accentColor);
  iframe.style.cssText =
    "display:none;width:350px;height:500px;border:none;border-radius:16px;" +
    "box-shadow:0 8px 30px rgba(0,0,0,0.15);margin-bottom:12px;" +
    "background:#fff;";
  iframe.setAttribute("title", "MyBizOS Chat");
  iframe.setAttribute("allow", "microphone");

  var isOpen = false;

  btn.addEventListener("click", function () {
    isOpen = !isOpen;
    iframe.style.display = isOpen ? "block" : "none";
    btn.innerHTML = isOpen
      ? '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>'
      : '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>';
    btn.setAttribute("aria-label", isOpen ? "Close chat" : "Open chat");
  });

  container.appendChild(iframe);
  container.appendChild(btn);

  // Inject when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      document.body.appendChild(container);
    });
  } else {
    document.body.appendChild(container);
  }
})();
