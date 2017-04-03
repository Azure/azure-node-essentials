var fs = require('fs');
var path = require('path');
var vscode = require('vscode');
var jsonEditor = require('../codegen/jsoneditor');
var utils = require('../utils');
var FileContentProvider = require("../providers/FileContentProvider");

exports.createCommand = function createCommand(state) {

    // The scheme to provide content for (i.e the 'file' part of 'file://<filepath>').
    const SCHEME = 'docpreview';
    // This will show up as the tab title.
    const PATH = 'Documentation.html';
    const PREVIEW_CMD = 'vscode.previewHtml';
    // TODO: expose this as a choice for end-user on how they prefer to dock preview pane.    
    const PREVIEW_PANE = vscode.ViewColumn.Two;
    // Since we want to reuse a single preview pane, we define one uri up front to reuse.
    const URI = new vscode.Uri().with({ scheme: SCHEME, path: PATH });
    const contentResolver = (symbol) => utils.getDocForSymbol(symbol, state.typeMap);
    const provider = new FileContentProvider(URI, contentResolver);
    vscode.workspace.registerTextDocumentContentProvider(SCHEME, provider);

    vscode.commands.registerTextEditorCommand('editor.gotoDoc', (editor) => {
        const position = editor.selection.active;
        const range = editor.document.getWordRangeAtPosition(position);
        const word = editor.document.getText(range);
        return vscode.workspace.openTextDocument(URI)
            .then((doc) => {
                // directly show the document preview without showing the document.
                // vscode.window.showTextDocument(doc); // this is purely for debugging.
                return vscode.commands.executeCommand(PREVIEW_CMD, URI, PREVIEW_PANE);
            }).then(() => provider.update(word));
    });
};