export function AppStyles() {
  return (
    <style>{`

         html, body, button, input, textarea, select {
         font-family: "Inter Variable", Inter, -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
         font-feature-settings: "cv11", "ss01";
     }

     /* Segmented tabs: 13px / 450 */
body .seg-tab.seg-tab.seg-tab {
  font-size: 13px !important;
  font-weight: 450 !important;
  letter-spacing: normal !important;
}

/* Section headers: 13px / 450 / 0.005em (extra specificity so it wins over the rule above) */
body .section-title.section-title.section-title {
  font-size: 13px !important;
  font-weight: 450 !important;
  letter-spacing: 0.003em !important;
}

/* Anything nested inside a section title inherits its size, weight and spacing */
body .section-title.section-title.section-title * {
  font-size: inherit !important;
  font-weight: inherit !important;
  letter-spacing: inherit !important;
}
  /* Everything: 12px / 450 / -0.003em, except social UI, .keep-size, and anything with its own inline font-size */
body *:where(:not(.social-ui, .social-ui *, .keep-size, .keep-size *, [style*="font-size"])) {
  font-size: 12px !important;
  font-weight: 450 !important;
  letter-spacing: -0.003em !important;
}
  /* Template card titles: 10px / 450 / -0.003em */
body .tpl-title.tpl-title.tpl-title {
  font-size: 10px !important;
  font-weight: 450 !important;
  letter-spacing: -0.003em !important;
}

/* Devices panel category titles: 10px / 600 / 0.02em */
body .device-title.device-title.device-title {
  font-size: 10px !important;
  font-weight: 600 !important;
  letter-spacing: 0.02em !important;
}

/* Shortcut modal key caps: weight 500 */
body .shortcut-keys.shortcut-keys.shortcut-keys,
body .shortcut-keys.shortcut-keys.shortcut-keys * {
  font-weight: 500 !important;
}

/* Custom scrollbar: #E3E3E3 in light mode, #333333 in dark mode */
.custom-scroll {
  scrollbar-color: #E3E3E3 transparent;
}
.dark .custom-scroll {
  scrollbar-color: #333333 transparent;
}
.custom-scroll::-webkit-scrollbar-thumb {
  background-color: #E3E3E3 !important;
}
.dark .custom-scroll::-webkit-scrollbar-thumb {
  background-color: #333333 !important;
}

        :where(*:focus-visible) { outline-color: #FF47BC; }

        /* One-time entrance for the empty Projects state. No loop — there's
           no status/progress to communicate, just first-paint life. */
        @keyframes folder-enter {
          from { opacity: 0; transform: translateY(6px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .folder-enter {
          animation: folder-enter 220ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .folder-enter { animation: none; }
        }

        /* Small stagger for the Templates grid — transform + opacity only,
           same easing as the rest of the app, capped so it never feels slow. */
        @keyframes template-enter {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .template-enter {
          animation: template-enter 180ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .template-enter { animation: none; }
        }
        /* Popup entrance — opacity + 4px translate, same easing as the rest
           of the app. Drop-down menus rise from above, drop-up from below. */
        @keyframes pop-enter {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pop-enter-up {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .pop-enter { animation: pop-enter 140ms cubic-bezier(0.22, 1, 0.36, 1) both; }
        .pop-enter-up { animation: pop-enter-up 140ms cubic-bezier(0.22, 1, 0.36, 1) both; }

        /* One reduced-motion fallback for every animation and transition. */
        /* Sidebar drawer: slower, softer curve than the rest of the UI so the
           canvas expansion reads as one continuous movement. Its own class
           (higher specificity than the global * rule) so it can keep this
           curve. */
        .sidebar-shell {
          transition: width 360ms cubic-bezier(0.32, 0.72, 0, 1) !important;
        }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
          .sidebar-shell { transition-duration: 0.01ms !important; }
        }
                /* One easing curve everywhere. Tailwind's default transition classes
           use their own curve; this makes them all match. */
        *, *::before, *::after {
          transition-timing-function: cubic-bezier(0.22, 1, 0.36, 1) !important;
        }

        @keyframes sidebar-enter {
          from { opacity: 0; transform: translateX(-8px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .sidebar-enter { animation: sidebar-enter 200ms cubic-bezier(0.22, 1, 0.36, 1) both; }

                /* Appearance rows (stroke / effects) — opacity + 4px translate, same easing as the rest. */
        @keyframes fx-enter {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fx-enter { animation: fx-enter 180ms cubic-bezier(0.22, 1, 0.36, 1) both; }

        /* Plus <-> minus swap on the Stroke header */
@keyframes icon-swap {
  from { opacity: 0; transform: scale(0.6) rotate(-45deg); }
  to { opacity: 1; transform: scale(1) rotate(0deg); }
}
.icon-swap { animation: icon-swap 140ms cubic-bezier(0.22, 1, 0.36, 1) both; }

        @keyframes fade-enter { from { opacity: 0; } to { opacity: 1; } }
        .fade-enter { animation: fade-enter 180ms cubic-bezier(0.22, 1, 0.36, 1) both; }

                @keyframes key-pending {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.25; }
        }
        .key-pending { animation: key-pending 900ms ease-in-out infinite; }

        /* Picker popups sit left of the toolbar, so they slide in from the right. */
        @keyframes panel-enter {
          from { opacity: 0; transform: translateX(8px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .panel-enter { animation: panel-enter 180ms cubic-bezier(0.22, 1, 0.36, 1) both; }

        /* Side popups (Help menu + Theme submenu) open to the right of their trigger. */
        @keyframes side-enter {
          from { opacity: 0; transform: translateX(-6px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .side-enter { animation: side-enter 160ms cubic-bezier(0.22, 1, 0.36, 1) both; }

        /* Crop modal */
        @keyframes modal-enter {
          from { opacity: 0; transform: translateY(8px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .backdrop-enter { animation: fade-enter 160ms cubic-bezier(0.22, 1, 0.36, 1) both; }
        .modal-enter { animation: modal-enter 200ms cubic-bezier(0.22, 1, 0.36, 1) both; }

        .tooltip-enter { animation: fade-enter 140ms cubic-bezier(0.22, 1, 0.36, 1) both; }

        /* Skeleton placeholder: base fill + one shimmer sweep. Reduced motion freezes the sweep. */
        .skeleton { position: relative; overflow: hidden; background: #EDEDED; }
        .dark .skeleton { background: #292929; }
        .skeleton::after {
          content: "";
          position: absolute;
          inset: 0;
          transform: translateX(-100%);
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent);
          animation: skeleton-shimmer 1.4s linear infinite;
        }
        .dark .skeleton::after {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent);
        }
        @keyframes skeleton-shimmer { to { transform: translateX(100%); } }

        /* New gradient stop handle pops in from its base. */
        @keyframes stop-enter {
          from { opacity: 0; transform: scale(0.6); }
          to { opacity: 1; transform: scale(1); }
        }
        .stop-enter { animation: stop-enter 140ms cubic-bezier(0.22, 1, 0.36, 1) both; transform-origin: 50% 100%; }
    `}</style>
  );
}