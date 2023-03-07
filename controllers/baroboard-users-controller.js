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
const crypto = require('crypto');
// BY START 2021-03-31
const by_AES = require('../public/js/by_AES');
const EnCryption = new by_AES ();
// BY END 2021-03-31


/**
 * @Controller(path="/baroboard/users", type="rest", table="baroboard.users")
 */
class BaroboardUsers {

    constructor() {
        this.database = new Database('database_mysql');
    }

    /**
     * @RequestMapping(path="/signup", method="post")
     */
    async signup(req,res) {
        logger.debug("BaroboardUsers: signup called for path /baroboard/users/signup");
        const params = param.parse(req);
        
        const newParams = {
            userId:params.userId,
            userPassword:params.userPassword,
            name: 'UNSNETWORKS테스트',
            details:'일반 사용자',
            level:'1',
            dept:'07W',
            create_author:'uni93'

        }
        try {
            const queryParams = {
                sqlName: 'baroboard_users_signup',
                params: newParams,
                paramType: {
                    userId: 'string',
                    userPassword: 'string',
                    name: 'string',
                    details:'string',
                    level:'string',
                    dept:'string',
                    create_author:'string'
                }
            }

            const rows1 = await this.database.execute(queryParams);
        }
        catch(err) {
            util.sendError(res, 400, 'Error in execute -> ' + err);
        }
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
                    
                }
            }

            const rows1 = await this.database.execute(queryParams1);
            //  패스워드 암호화 저장시 해독 후 비교하기위한 코드
            // const password = await EnCryption.decrypt(rows1[0].password);

            // 패스워드 평문 저장시 비교하기위한 코드
            const password = rows1[0].password;
            const decrypted = await EnCryption.decrypt(params.userPassword);

            if (password === decrypted) {
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
            }

            else {
                util.sendError(res, 403, 'Password 불일치 에러 발생');
            }
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
