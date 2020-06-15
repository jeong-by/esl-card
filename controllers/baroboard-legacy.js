/** BY START 2019-11-18 
 * This controller registers REST API functions automatically using @Controller annotation on Bear.
 *
 * Example request urls are as follows:
 * 
 * (1) http://localhost:7001/baroboard/legacy/list
 * 
 */

'use strict'
const util = require('../util/util');
const param = require('../util/param');
const logger = require('../util/logger');
const Database = require('../database/database_mysql');

/**
 * @Controller(path="/baroboard/legacy", type="rest", table="baroboard.legacy")
 */
class BaroboardLegacy {

    
}


module.exports = BaroboardLegacy;

// BY END 2019-11-18