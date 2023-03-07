/**
 * This controller just loads a view file as a index page and send it to the client 
 *
 * Example request urls are as follows:
 * 
 * (1) http://localhost:7001/sheep.do
 * 
 */

'use strict'
 
const util = require('../util/util');
const logger = require('../util/logger');
// BY START 2021-03-31
const by_AES = require('../public/js/by_AES');
const EnCryption = new by_AES ();
// BY END 2021-03-31
class Index {

 
    /**
     * @RequestMapping(path="/esl-index.do", method="get")
     */
    eslIndex(req, res) {
        logger.debug('eslIndex called for path /esl-index.do');
        const parseKey = EnCryption.requestParseKey();
        const iv = EnCryption.requestIv();
        util.render(req, res, 'esl_index',{parseKey:parseKey,iv:iv});
    }
        
}

module.exports = Index;
