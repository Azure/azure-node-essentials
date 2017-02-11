# Change Log for Azure Node Essentials

## 0.2.4 [2017-02-11]

1. re-organized source code folder structure and refactored source code
1. moved project to new home page at [Azure/Azure Node Essentials](https://github.com/Azure/azure-node-essentials)
1. improvements to codegeneration:
    * better formatting for generated code and target document.
    * smarter require statement code generation: we only import modules that are not already imported and insert require statements at the end of an existing group, if one exists.
    * code generator for package.json: we now update package.json with dependencies required by the generated code.

## 0.2.3 [2017-02-08]

1. Bug fixes for Mac
1. updates to readme
1. check for generator package's version and upgrade if not latest

## 0.2.0 - 0.2.2 [2017-02-07]

1. No product change, updates to readme and other metadata about the project.

## 0.1.0 [2017-02-07]

1. Project and file scaffolding
1. Snippets for some common operations such as authentication, creating a service principal.
1. Code generation
   * generate code for template deployment

