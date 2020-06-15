/**
 * File module using POST method
 *
 * @author Mike
 */

var util = require('../util/util');
var logger = require('../logger');

var thisModule = {};

thisModule.uploadFile = (req, res) => {
    logger.debug('upload:uploadFile controller called.');

    var params = req.body;
    logger.debug('PARAMS -> ' + JSON.stringify(params));
    
    var files = req.files;
	console.log('FILE -> ' + JSON.stringify(req.files));
 
    
    // send simple response
    var filename = req.files[0].filename;
    var output = {
        code:200,
        message:'OK',
        filename:filename
    };
    var outputStr = JSON.stringify(output);

    res.writeHead(200, {'Content-Type':'application/json;charset=utf8'});
    res.write(outputStr);
    res.end();
};



module.exports = thisModule;
