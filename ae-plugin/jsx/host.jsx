// MouseKeysFX host script (ExtendScript, ES3). Called from the panel through CSInterface.evalScript.
// Every function returns a string: "ok|..." or "err|message".
var MKFX = {};

MKFX.pad = function (n) { return (n < 10 ? "00" : n < 100 ? "0" : "") + n; };

MKFX.activeComp = function () {
    var c = app.project ? app.project.activeItem : null;
    return (c && c instanceof CompItem) ? c : null;
};

// Checks the scene and prepares <project folder>/sfx. Returns ok|folder|file name.
MKFX.prepare = function (kind) {
    try {
        if (!app.project.file) return "err|Save the project first. Sounds are stored in an sfx folder next to it.";
        if (!MKFX.activeComp()) return "err|Open a composition first.";
        var dir = new Folder(app.project.file.parent.fsName + "/sfx");
        if (!dir.exists && !dir.create()) return "err|Could not create the sfx folder.";
        var n = 1, name;
        do { name = kind + "_" + MKFX.pad(n) + ".wav"; n++; } while (new File(dir.fsName + "/" + name).exists);
        return "ok|" + dir.fsName + "|" + name;
    } catch (e) { return "err|" + e.toString(); }
};

// data (JSON text built by the panel): {path, layerName, first, markers:[{t,label}]}
// t values are seconds from the start of the file; `first` is the time of the first event.
MKFX.add = function (json) {
    var undo = false;
    try {
        var data = eval("(" + json + ")");
        var comp = MKFX.activeComp();
        if (!comp) return "err|Open a composition first.";
        var file = new File(data.path);
        if (!file.exists) return "err|The sound file was not written: " + data.path;

        app.beginUndoGroup("MouseKeysFX: Add sound");
        undo = true;

        var item = app.project.importFile(new ImportOptions(file));
        var folder = null, i;
        for (i = 1; i <= app.project.numItems; i++) {
            var it = app.project.item(i);
            if (it instanceof FolderItem && it.name === "sfx" && it.parentFolder === app.project.rootFolder) { folder = it; break; }
        }
        if (!folder) folder = app.project.items.addFolder("sfx");
        item.parentFolder = folder;

        // topmost selected layer, if any: the new layer goes right above it
        var ref = null, sel = comp.selectedLayers;
        for (i = 0; i < sel.length; i++) if (!ref || sel[i].index < ref.index) ref = sel[i];

        var layer = comp.layers.add(item);
        layer.startTime = comp.time - data.first;
        if (ref) layer.moveBefore(ref);
        layer.name = data.layerName;

        var prop = layer.property("Marker");
        for (i = 0; i < data.markers.length; i++) {
            var mv = new MarkerValue(data.markers[i].label);
            prop.setValueAtTime(layer.startTime + data.markers[i].t, mv);
        }

        for (i = 0; i < sel.length; i++) sel[i].selected = false;
        layer.selected = true;

        app.endUndoGroup();
        undo = false;
        return "ok|" + file.name + (ref ? " above \"" + ref.name + "\"" : "");
    } catch (e) {
        if (undo) app.endUndoGroup();
        return "err|" + e.toString();
    }
};
