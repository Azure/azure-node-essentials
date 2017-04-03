var fs = require('fs');
var path = require('path');
var vscode = require('vscode');
var jsonEditor = require('../codegen/jsoneditor');
var utils = require('../utils');
var codegen = require('../codegen/codegen.browse-packages');
var FileContentProvider = require("../providers/FileContentProvider");

exports.createCommand = function createCommand(state) {

  // The scheme to provide content for (i.e the 'file' part of 'file://<filepath>').
  const SCHEME = 'readmepreview';
  // This will show up as the tab title.
  const PATH = 'readme.md';
  // TODO: expose this as a choice for end-user on how they prefer to dock preview pane.
  const SHOW_MD_PREVIEW_CMDS = ['markdown.showPreview', 'markdown.showPreviewToSide'];
  const SHOW_MD_PREVIEW = SHOW_MD_PREVIEW_CMDS[0];
  // Since we want to reuse a single preview pane, we define one uri up front to reuse.
  const URI = new vscode.Uri().with({ scheme: SCHEME, path: PATH });
  const contentResolver = (filename) => utils.getPackageReadMe(filename);
  const provider = new FileContentProvider(URI, contentResolver);
  vscode.workspace.registerTextDocumentContentProvider(SCHEME, provider);

  vscode.commands.registerCommand('Azure-Node.browse-packages', function () {

    // Open a document with the predefined URI but do not show it in the editor.
    vscode.workspace.openTextDocument(URI)
      .then(() => {
        // directly show the document preview without showing the document.
        return vscode.commands.executeCommand(SHOW_MD_PREVIEW, URI);
      }).then(() => {

        // prepare packages to present in quick pick.
        var data = state.packages;
        var pkgs = [];
        data.forEach(function (item) {
          pkgs.push({ "label": item.name, "description": item.version, "detail": item.description });
        });

        vscode.window.showQuickPick(pkgs, { onDidSelectItem: (pkg) => provider.update(pkg.label) })
          .then((selectedItem) => {
            if (!selectedItem) {
              return;
            }

            // when a package is selected, install it and import it in active document.
            updatePackageJsonAndNpmInstall(selectedItem.label);

            if (!vscode.window.activeTextEditor) {
              return;
            }

            return generateCodeInEditor(selectedItem.label);
          });
      });
  });
};

function updatePackageJsonAndNpmInstall(packageToAdd) {
  var filePath = utils.getPackageJsonPath();

  if (filePath && fs.existsSync(filePath)) {
    var packages = [packageToAdd];
    jsonEditor.addDependenciesIfRequired(filePath, packages);

    // TODO: run npm-install only if package.json was touched
    var npmOptions = {
      prefix: filePath.slice(0, filePath.lastIndexOf(path.sep))
    };

    var installTask = utils.npmInstall(packages, npmOptions);
    return installTask.then(
      function onFulfilled() {
        vscode.window.setStatusBarMessage(`npm install succeeded for ${packageToAdd}.`);
      },
      function onRejected() {
        vscode.window.setStatusBarMessage(`npm install failed for ${packageToAdd}.`);
      }
    );
  }
};

function generateCodeInEditor(moduleName) {
  // generate code to be inserted.
  const document = vscode.window.activeTextEditor.document;
  var importsAndLineNumber = codegen.generateRequireStatements(document, [moduleName]);

  vscode.window.activeTextEditor.edit((builder) => {
    // insert import statements.
    // Insertion point is the line where import group ends.
    if (importsAndLineNumber) {
      var importPos = new vscode.Position(importsAndLineNumber.line, 0);
      var imports = importsAndLineNumber.code;
      for (var importStatement of imports) {
        builder.insert(importPos, importStatement);
      }
    }
  });

  // format the entire document.
  // the code we inserted was generated as well-formatted but indenting is relative to the existing text
  // in the document. Since we didn't examine existing text and are unaware of the indent depth where 
  // generated code will be inserted, we have to reformat the whole document. If this leads to performance issues, we'll revisit this logic.
  return vscode.commands.executeCommand("editor.action.formatDocument");
};
