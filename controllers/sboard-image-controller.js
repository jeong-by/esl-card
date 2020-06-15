/**
 * This controller handles image upload and transfer messages 
 * 
 * (1) http://localhost:7001/sboard/image/upload
 * (2) http://localhost:7001/sboard/image/send
 * (3) http://localhost:7001/sboard/image/send_group
 * 
 */

'use strict'

const util = require('../util/util');
const param = require('../util/param');
const logger = require('../util/logger');
const Database = require('../database/database_mysql');

const fs = require('fs');

const ioUtil = require('../util/socketio_util');

/**
 * @Controller(path="/sboard_image")
 */
class SBoardImage {

    constructor() {
      this.database = new Database('database_mysql');
    }

    /**
     * @RequestMapping(path="/upload", method="post", upload="true")
     */
    async upload(req, res) {
      logger.debug('SBoardImage:upload called for path /sboard_image/upload');

      const params = param.parse(req);

      const filename = params.filename;

      // 업로드된 파일 정보가 없는 경우
      if (typeof(req.files) == 'undefined') {
        logger.error('No file uploaded.');
        util.sendError(res, 400, 'No file uploaded.');
        return;
      }

      logger.debug('FILES -> ' + JSON.stringify(req.files));
       
      // move uploaded files from uploads folder to public/images folder
      if (req.files.length > 0) {
        let targetFilename;
        if (typeof(filename) == 'undefined') {
          targetFilename = req.files[0].filename;
        } else {
          targetFilename = filename;
        }

        const oldFile = __dirname + '/../uploads/' + req.files[0].filename;
        const newFile = __dirname + '/../public/sboard/' + targetFilename;
    
        fs.rename(oldFile, newFile, (err) => {
          if (err) {
            logger.error('Error in moving file : ' + err);
            util.sendError(res, 400, 'Error in moving file : ' + err);
            return;
          }
    
          logger.debug('File copied to ' + newFile);
    
          // include uploaded file path
          const output = {
            filename:'/images/' + targetFilename
          }
    
          util.sendRes(res, 200, 'OK', output);
        })
      }	
    }
 
    /**
     * Example parameter for send
     * 
     * GET http://localhost:7001/sboard_image/send
     * 
     * requestCode 20191012142021100013
     * userId sboard_sender
     * sender sboard_sender
     * receiver 01010001000
     * command sboard
     * type text
     * data SB1002-01
     * 
     */

    /**
     * @RequestMapping(path="/send", method="post")
     */
    async send(req, res) {
      logger.debug('SBoardImage:send called for path /sboard_image/send');

      const params = param.parse(req);
      
      try {
        ioUtil.send(req.app.io, params);

        util.sendRes(res, 200, 'OK', 'message event requested.');
      } catch(err) {
        util.sendError(res, 400, 'Error in message request -> ' + err);
      }

    }
 
    /**
     * @RequestMapping(path="/send_group", method="post")
     */
    async sendGroup(req, res) {
      logger.debug('SBoardImage:sendGroup called for path /sboard_image/send_group');

      const params = param.parse(req);
      
      try {
        ioUtil.sendGroup(req.app.io, params);

        util.sendRes(res, 200, 'OK', 'message_group event requested.');
      } catch(err) {
        util.sendError(res, 400, 'Error in message_group request -> ' + err);
      }

    }
 

}


module.exports = SBoardImage;
