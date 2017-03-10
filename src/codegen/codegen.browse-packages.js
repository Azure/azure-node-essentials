var codegenerator = require('./codegen');

exports.generateRequireStatements = function generateRequireStatements(document, modules) {
  return codegenerator.generateRequireStatements(document, modules);
};
