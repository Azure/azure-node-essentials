var fs = require('fs');
var vscode = require('vscode');
var npmUserPackages = require('npm-user-packages');
var jsonEditor = require('../codegen/jsoneditor');
var utils = require('../utils');
var codegen = require('../codegen/codegen.browse-packages');

exports.createCommand = function createCommand() {
  vscode.commands.registerCommand('Azure-Node.browse-packages', function () {
    npmUserPackages('windowsazure').then(data => {
      var pkgs = [];
      data.forEach(function (item) {
        pkgs.push({ "label": item.name, "description": item.version, "detail": item.description });
      });

      vscode.window.showQuickPick(pkgs).then((selectedItem) => {
        updatePackageJson(selectedItem.label);
        
        if (!vscode.window.activeTextEditor) {
          return;
        }
        
        return generateCodeInEditor(selectedItem.label);
      });
    });
  });
};

function updatePackageJson(packageToAdd) {
  var filePath = utils.getPackageJsonPath();

  if (filePath && fs.existsSync(filePath)) {
    var packages = [packageToAdd];
    jsonEditor.addDependenciesIfRequired(filePath, packages);
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
