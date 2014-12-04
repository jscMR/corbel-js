var args = process.argv;

var jsoncovToLcov = require('json2lcov');
var fs = require('fs');

var inputSrc = args[2];
var outputSrc = args[3];

var json = require(inputSrc);

var lcov = jsoncovToLcov(json);

fs.writeFile(outputSrc, 'pepe');