/**
 * Shared site navigation header, injected on every page.
 * One source of truth for the header markup so the four route pages
 * (home, sudoku, n-queens, nonograms) never drift out of sync.
 */
(function () {
    "use strict";

    var ROUTE_FOLDERS = ["sudoku", "n-queens", "nonograms"];

    function computeBase() {
        var path = window.location.pathname;
        for (var i = 0; i < ROUTE_FOLDERS.length; i++) {
            if (path.indexOf("/" + ROUTE_FOLDERS[i] + "/") !== -1) return "../";
        }
        return "";
    }

    function currentRoute() {
        var path = window.location.pathname;
        for (var i = 0; i < ROUTE_FOLDERS.length; i++) {
            if (path.indexOf("/" + ROUTE_FOLDERS[i] + "/") !== -1) return ROUTE_FOLDERS[i];
        }
        return "home";
    }

    function buildNav() {
        if (document.querySelector(".site-nav")) return;
        var base = computeBase();
        var route = currentRoute();
        var links = [
            { key: "home", label: "Home", href: base + "index.html" },
            { key: "sudoku", label: "Sudoku", href: base + "sudoku/" },
            { key: "n-queens", label: "N Queens", href: base + "n-queens/" },
            { key: "nonograms", label: "Nonograms", href: base + "nonograms/" },
        ];

        var header = document.createElement("header");
        header.className = "site-nav";

        var inner = document.createElement("div");
        inner.className = "site-nav-inner";

        var brand = document.createElement("a");
        brand.className = "site-nav-brand";
        brand.href = base + "index.html";
        brand.textContent = "NineByNine";
        inner.appendChild(brand);

        var nav = document.createElement("nav");
        nav.setAttribute("aria-label", "Primary");
        nav.className = "site-nav-links";

        links.forEach(function (link) {
            var a = document.createElement("a");
            a.href = link.href;
            a.textContent = link.label;
            a.className = "site-nav-link" + (link.key === route ? " active" : "");
            if (link.key === route) a.setAttribute("aria-current", "page");
            nav.appendChild(a);
        });

        inner.appendChild(nav);
        header.appendChild(inner);
        document.body.insertBefore(header, document.body.firstChild);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", buildNav);
    } else {
        buildNav();
    }
})();
