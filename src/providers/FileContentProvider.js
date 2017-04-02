'use strict';
const vscode = require("vscode");
const utils = require('../utils');

class FileContentProvider {
    constructor(uri, pathProvider) {
        this._onDidChange = new vscode.EventEmitter();
        this.uri = uri;
        this.cache = {};
        this.pathProvider = pathProvider;
    }
    get onDidChange() {
        return this._onDidChange.event;
    }

    /**
     * This is called any time `vscode.workspace.openTextDocument` or `vscode.previewHtml`
     * are called with a uri that matches the scheme this provider is registered for.
     * It is also called any time the onDidChange event is fired with a matching uri scheme.
     */
    provideTextDocumentContent(uri) {
        if (!this.filename) {
            return '';
        }

        // cache hit.
        if (this.cache[this.filename]) {
            return this.cache[this.filename];
        }

        // cache miss. fetch readme from npm, cache it and return content.
        // capture context.
        var self = this;
        return utils.getPackageReadMe(this.filename)
            .then((text) => {
                self.cache[self.filename] = text;
                return text;
            });
    }

    /**
     * Given a filename, triggers an update of the contents
     * of files provided by this content provider.
     */
    update(filename) {
        this.filename = filename;
        this._onDidChange.fire(this.uri);
    }
}

module.exports = FileContentProvider;