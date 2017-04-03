var fs = require('fs');
var path = require('path');
var vscode = require('vscode');
let exec = require('child_process').exec;
var npm = require('npm');
var get = require('simple-get');

// checks if there exists a valid installation of NodeJs on this machine
exports.isNodeInstalled = function isNodeInstalled() {
    var cmdString = "node -v";
    return new Promise(function (resolve, reject) {
        exec(cmdString, (error, stdout) => {
            if (error) {
                return reject(error);
            }
            if (stdout.startsWith('v')) {
                return resolve(true);
            }
            return resolve(false);
        });
    });
};

// lists all globally installed npm packages.
exports.npmList = function npmList(path) {
    var global = false;
    if (!path) global = true;
    var cmdString = "npm ls --depth=0 " + (global ? "-g " : " ");
    return new Promise(function (resolve, reject) {
        exec(cmdString, { cwd: path ? path : "/" }, (error, stdout) => {
            if (error && !stdout) {
                return reject(error);
            }

            var packages = [];
            packages = stdout.split('\n');

            packages = packages.filter(function (item) {
                if (item.match(/^\+--.+/g) != null || item.match(/^├──.+/g) != null) {
                    return true;
                }
                if (item.match(/^`--.+/g) != null || item.match(/^└──.+/g) != null) {
                    return true;
                }
                return undefined;
            });

            packages = packages.map(function (item) {
                // windows
                if (item.match(/^\+--.+/g) != null) {
                    return item.replace(/^\+--\s/g, "");
                }
                if (item.match(/^`--.+/g) != null) {
                    return item.replace(/^`--\s/g, "");
                }
                // mac
                if (item.match(/^├──.+/g) != null) {
                    return item.replace(/^├──\s/g, "");
                }
                if (item.match(/^└──.+/g) != null) {
                    return item.replace(/^└──\s/g, "");
                }
            })
            resolve(packages);

        });
    });
};

// install given list of npm packages to the global location.
exports.npmInstall = function npmInstall(packages, opts) {
    if (packages.length == 0 || !packages || !packages.length) { Promise.reject("No packages found"); }
    if (typeof packages == "string") packages = [packages];
    if (!opts) opts = {};
    var cmdString = "npm install " + packages.join(" ") + " "
        + (opts.global ? " -g" : "")
        + (opts.save ? " --save" : "")
        + (opts.saveDev ? " --saveDev" : "")
        + (opts.prefix ? " --prefix " + opts.prefix : "");

    return new Promise(function (resolve, reject) {
        exec(cmdString, { cwd: opts.cwd ? opts.cwd : "/" }, (error) => {
            if (error) {
                reject(error);
            } else {
                resolve(true); // return success.
            }
        });
    });
};

exports.getPackageJsonPath = function getPackageJsonPath() {
    var dirAboveRoot = path.join(vscode.workspace.rootPath, '..');
    var srcPath = getSourceLocation();
    if (!srcPath) {
        return;
    }

    var packageJsonPath;
    while (srcPath !== dirAboveRoot) {
        packageJsonPath = path.join(srcPath, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
            return packageJsonPath;
        }
        else {
            srcPath = path.join(srcPath, '..');
        }
    }
};

function getSourceLocation() {
    var files = vscode.workspace.textDocuments.filter(item => item.isUntitled === false);
    if (files) {
        var sourceFile = files[0].fileName;
        return sourceFile.slice(0, sourceFile.lastIndexOf(path.sep) + 1);
    }
}

exports.install = function install(pkgName, options) {
    var promise = new Promise(function (resolve, reject) {
        if (!options) {
            reject("options.prefix is required.");
        }

        npm.load(options, function (err) {
            if (err) {
                return reject(err);
            }
            npm.commands.install([pkgName + '@latest'], function (err, info) {
                if (err) {
                    reject(err);
                }
                resolve(info);
            });
        });
    });

    return promise;
};

exports.getPackageReadMe = function getPackageReadMe(pkgName) {
    var promise = new Promise(function (resolve, reject) {
        var npmUrl = `https://registry.npmjs.org/${pkgName}`;
        get.concat(npmUrl, function (err, res, data) {
            if (err) {
                reject(`Error occured fetching readme for this package`);
            }
            try {
                data = JSON.parse(data.toString());
                if (!data.readme) {
                    reject(`No README.md found for ${pkgName}`);
                }

                resolve(data.readme);
            } catch (err) {
                reject(`Error occurred parsing registry data for ${pkgName}: ${err.message}`);
            }
        });
    });

    return promise;
};

exports.getDocForSymbol = function getDocForSymbol(symbol, typeToPackageMap) {
    return new Promise(function (resolve, reject) {
        const packageName = typeToPackageMap.get(symbol);
        if (!packageName) {
            return reject(`could not resolve symbol ${symbol}`);
        }
        const docUrl = `http://azure.github.io/azure-sdk-for-node/${packageName}/latest/${symbol}.html`;
        get.concat(docUrl, function (err, res, data) {
            if (err) {
                return reject(`Error occured fetching doc for ${symbol}`);
            }
            const text = data.toString();
            const doc = prettifyDoc(text);
            resolve(doc);
        });
    });
};

function prettifyDoc(text) {
    const beginTag = `<nav>`;
    const endTag = `</nav>`;
    const prefix = text.indexOf(beginTag);
    const suffix = text.indexOf(endTag) + endTag.length;
    const removeNav = (text) => text.slice(0, prefix).concat(text.slice(suffix));
    const inlineScriptsAndStyles = function (text) {
        // const prettifyScriptImport = `&lt;script src="../../scripts/prettify/prettify.js"&gt;`;
        // const prettifyFunc = `<script>${fs.readFileSync(require.resolve('./styles/prettify')).toString()}`;
        // const langCssScriptImport = `&lt;script src="../../scripts/prettify/lang-css.js"&gt;`;
        // const langCssFunc = `<script>${fs.readFileSync(require.resolve('./styles/lang-css.js')).toString()}`;
        const prettifyCssImport = `<link type="text/css" rel="stylesheet" href="../../styles/prettify-tomorrow.css">`;
        const prettifyCss = `<style>${fs.readFileSync(require.resolve('./styles/prettify-tomorrow.css')).toString()}` + `</style>`;
        const jsDocCssImport = `<link type="text/css" rel="stylesheet" href="../../styles/jsdoc-default.css">`;
        const jsDocCss = `<style>${fs.readFileSync(require.resolve('./styles/jsdoc-default.css')).toString()}` + `</style>`;
        // text = text.replace(prettifyScriptImport, prettifyFunc)
        //     .replace(langCssScriptImport, langCssFunc)
        
        text = text.replace(prettifyCssImport, prettifyCss)
                   .replace(jsDocCssImport, jsDocCss);

        return text;
    }

    //let doc = removeNav(text); doc = inlineScriptsAndStyles(doc);
    let doc = inlineScriptsAndStyles(text);
    return doc;
}
