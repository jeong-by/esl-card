/**
 * This controller registers REST API functions automatically using @Controller annotation on Bear.
 *
 * Example request urls are as follows:
 * 
 * (1) http://localhost:7001/baroboard/layout/list
 * (2) http://localhost:7001/baroboard/layout/create
 * (3) http://localhost:7001/baroboard/layout/read/1
 * (4) http://localhost:7001/baroboard/layout/update/1
 * (5) http://localhost:7001/baroboard/layout/delete/1
 * 
 */

'use strict'

const util = require('../util/util');
const param = require('../util/param');
const logger = require('../util/logger');
const Database = require('../database/database_mysql');

/**
 * @Controller(path="/baroboard/layout", type="rest", table="baroboard.layout")
 */
class BaroboardLayout {

    constructor() {
        this.database = new Database('database_mysql');
    }

    /**
     * @RequestMapping(path="/image/del")
     */
    async requestImageDelete(req, res) {
        logger.debug('Baroboard:requestImageDelete called for path /baroboard/layout/image/del');
        
        const params = param.parse(req);
        
        try {
            const queryParams = {
                sqlName: 'baroboard_image_delete',
                params: params,
                paramType: {
                    name: 'string'
                }
            }

            const rows = await this.database.execute(queryParams);
            util.sendRes(res, 200, 'OK', rows);
        } catch(err) {
            util.sendError(res, 400, 'Error in execute -> ' + err);
        }
    }
    /**
     * @RequestMapping(path="/image/update", method="post" )
     */
    async requestUpdateImage(req,res) {
        logger.debug('BaroboardImage:updateImage called for path /baroboard/layout/image/update');
        const params = param.parse(req);

        try {
            const queryParams = {
                sqlName: 'baroboard_image_add',
                params: params,
                paramType: {
                    name: 'string'
                }
            }
            const rows2 = await this.database.execute(queryParams);
            util.sendRes(res, 200, 'OK', rows2);
        } catch(err) {
            util.sendError(res, 400, 'Error in execute -> ' + err);
        }
    }

  
    /**
     * @RequestMapping(path="/mapping/update",method="post")
     *  
     */
    async updateMapping(req, res) {
        logger.debug('BaroboardLayout:updateMapping called for path /baroboard/layout/mapping/update');
        const params = param.parse(req);
  
        try {
            const queryParams = {
                sqlName: 'baroboard_layout_mapping_update',
                params: params,
                paramType: {
                    id: 'string',
                    mapping: 'string'
                }
            }

            const rows2 = await this.database.execute(queryParams);
            
            util.sendRes(res, 200, 'OK', rows2);
        } catch(err) {
            util.sendError(res, 400, 'Error in execute -> ' + err);
        }
    }
    
  
}

module.exports = BaroboardLayout;
