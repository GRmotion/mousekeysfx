// Minimal CSInterface: only what the panel needs.
var CS = (function () {
    var cep = window.__adobe_cep__;
    return {
        available: !!cep,
        evalScript: function (script, cb) {
            if (!cep) { setTimeout(function () { cb && cb("err|Not running inside After Effects."); }, 0); return; }
            cep.evalScript(script, cb || function () {});
        },
        hostEnv: function () {
            try { return JSON.parse(cep.getHostEnvironment()); } catch (e) { return null; }
        },
        onThemeChange: function (fn) {
            if (cep) cep.addEventListener("com.adobe.csxs.events.ThemeColorChanged", fn);
        }
    };
})();
