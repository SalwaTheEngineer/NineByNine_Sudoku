/**
 * Small namespaced localStorage wrapper. Every game prefixes its keys with
 * "nxn:" so the platform can share one origin's storage without collisions,
 * and reads never throw (private browsing / quota errors just no-op).
 */
var NXNStorage = (function () {
    "use strict";
    var PREFIX = "nxn:";

    function get(key, fallback) {
        try {
            var raw = window.localStorage.getItem(PREFIX + key);
            if (raw == null) return fallback;
            return JSON.parse(raw);
        } catch (e) {
            return fallback;
        }
    }

    function set(key, value) {
        try {
            window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
            return true;
        } catch (e) {
            return false;
        }
    }

    function remove(key) {
        try {
            window.localStorage.removeItem(PREFIX + key);
        } catch (e) {
            /* ignore */
        }
    }

    return { get: get, set: set, remove: remove };
})();
