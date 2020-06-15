/** BY START 2019-11-18 
 * This controller registers REST API functions automatically using @Controller annotation on Bear.
 *
 * Example request urls are as follows:
 * 
 * (1) http://localhost:7001/baroboard/image/upload
 * 
 */

'use strict'
const util = require('../util/util');
const param = require('../util/param');
const logger = require('../util/logger');
const Database = require('../database/database_mysql');



/**
 * @Controller(path="/baroboard/image", type="rest", table="baroboard.image")
 */
class BaroboardImage {
    constructor() {
        this.database = new Database('database_mysql');
    }
    
    /**
     * @RequestMapping(path="/list", method="post" )
     */
    async requestList(req,res) {
        logger.debug('BaroboardImage:requestList called for path /baroboard/image/list');
        try {
            const queryParams = {
                sqlName: 'baroboard_image_list',

            }

            const rows = await this.database.execute(queryParams);
            
            util.sendRes(res, 200, 'OK', rows);
        } catch(err) {
            util.sendError(res, 400, 'Error in execute -> ' + err);
        }
    }

    /**
     * @RequestMapping(path="/category/list", method="post" )
     */
    async requestcategoryList(req,res) {
        logger.debug('BaroboardImage:requestcategoryList called for path /baroboard/image/category/list');
        try {
            const queryParams = {
                sqlName: 'baroboard_image_category_list',

            }
            
            const rows = await this.database.execute(queryParams);

            util.sendRes(res, 200, 'OK', rows);
        } catch(err) {
            util.sendError(res, 400, 'Error in execute -> ' + err);
        }
    }

    

    /**
     * @RequestMapping(path="/category/delete_item", method="post" )
     */
    async requestDeleteImage2(req,res) {
        logger.debug('BaroboardImage:requestDeleteImage2 called for path /baroboard/image/category/item_delete');
        const params = param.parse(req);

        try {
            const queryParams = {
                sqlName: 'baroboard_image_category_item_delete',
                params: params,
                paramType: {
                    name: 'string',
                    image: 'string'
                }
            }

            const rows = await this.database.execute(queryParams);
            util.sendRes(res, 200, 'OK', rows);
            console.log(rows);
        } catch(err) {
            util.sendError(res, 400, 'Error in execute -> ' + err);
        }
    }

    /**
     * @RequestMapping(path="/category/title_delete", method="post" )
     */
    async requestDeleteCategory(req,res) {
        logger.debug('BaroboardImage:deleteCategory called for path /baroboard/image/category/title_delete');
        const params = param.parse(req);
        try {
            const queryParams = {
                sqlName: 'baroboard_image_category_delete',
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
     * @RequestMapping(path="/category/add", method="post" )
     */
    async requestAddCategoryItem(req,res) {
        logger.debug('BaroboardImage:addCategoryItem called for path /baroboard/image/category/add');
        const params = param.parse(req);

        try {
            const queryParams = {
                sqlName: 'baroboard_image_category_add',
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
     * @RequestMapping(path="/category/image")
     */
    async requestAddImageItemInCategory(req, res) {
        logger.debug('BaroboardImage:addImageItemInCategory called for path /baroboard/image/category/add/item');
        const params = param.parse(req);
        try {
            const queryParams = {
                sqlName: 'baroboard_image_category_item_update',
                params: params,
                paramType: {
                    name : 'string',
                    image: 'string'
                }
            }

            const rows2 = await this.database.execute(queryParams);
            util.sendRes(res, 200, 'OK', rows2);
        } catch(err) {
            util.sendError(res, 400, 'Error in execute -> ' + err);
        }
    }

    


    
}


module.exports = BaroboardImage;

// BY END 2019-11-18