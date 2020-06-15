/**
 * This controller registers REST API functions automatically using @Controller annotation on Bear.
 *
 * Example request urls are as follows:
 * 
 * (1) http://localhost:7001/baroboard/users/list
 * (2) http://localhost:7001/baroboard/users/create
 * (3) http://localhost:7001/baroboard/users/read/1
 * (4) http://localhost:7001/baroboard/users/update/1
 * (5) http://localhost:7001/baroboard/users/delete/1
 * 
 */


const util = require('../util/util');
const param = require('../util/param');
const logger = require('../util/logger');
const Database = require('../database/database_mysql');
/**
 * @Controller(path="/baroboard/users", type="rest", table="baroboard.users")
 */
class BaroboardUsers {

    constructor() {
        this.database = new Database('database_mysql');
    }
  
    /**
     * @RequestMapping(path="/login", method="post")
     */
    async login(req, res) {
        logger.debug('BaroboardUsers:login called for path /baroboard/users/login');
  
        const params = param.parse(req);
          
        try {
            const queryParams1 = {
                sqlName: 'baroboard_users_login',
                params: params,
                paramType: {
                    userId: 'string',
                    userPassword: 'string'
                }
            }

            const rows1 = await this.database.execute(queryParams1);

            const queryParams2 = {
                sqlName: 'baroboard_users_login_date',
                params: params,
                paramType: {
                    userId: 'string'
                }
            }

            const rows2 = await this.database.execute(queryParams2);

            const result = {
                header:{},
                body: rows1
            }

            util.sendRes(res, 200, 'OK', result);
        } catch(err) {
            util.sendError(res, 400, 'Error in execute -> ' + err);
        }
    }
  
    /**
     * @RequestMapping(path="/logout", method="post")
     */
    async logout(req, res) {
        logger.debug('BaroboardUsers:logout called for path /baroboard/users/logout');
  
        const params = param.parse(req);
          
        try {
            const queryParams = {
                sqlName: 'baroboard_users_logout_date',
                params: params,
                paramType: {
                    userId: 'string'
                }
            }

            const rows = await this.database.execute(queryParams);

            const result = {
                header:{},
                body: rows
            }

            util.sendRes(res, 200, 'OK', result);
        } catch(err) {
            util.sendError(res, 400, 'Error in execute -> ' + err);
        }
    }

    
  
}

module.exports =  BaroboardUsers;
