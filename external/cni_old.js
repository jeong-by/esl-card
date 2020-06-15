/*
 * mci processing
 *
 * @author Mike
 */

let chis = {};

let logger = require('../util/logger');

let uuid = require('node-uuid');
let moment = require('moment');
let axios = require('axios');

let app;
let config;

let serverName;
let serverHost;
let serverPort;


// Initialization
chis.init = (inApp, inConfig, externalConfig, external) => {
    logger.debug('chis.init called.');
    
    app = inApp;
    config = inConfig;
    
    serverName = externalConfig.name;
    logger.debug('server name : ' + serverName);
    
    serverHost = externalConfig.host;
    serverPort = externalConfig.port;
    logger.debug('server host : ' + serverHost);
    logger.debug('server port : ' + serverPort);
    
}
 

// Request send
chis.send = (reqMethod, reqPath, params, callback) => {
	logger.debug('chis.send called.');

    let url = 'http://' + serverHost + ':' + serverPort + reqPath;
    
    let requestObj = {
        method: reqMethod,
        responseType: 'json',
        url: url
    };
     
    logger.debug('request -> ' + JSON.stringify(requestObj));
    
    
    
    // send request using axios
    try {
        axios.get(
            requestObj.url,
            {
                params: params,
                headers: {
                    
                         Authorization: 'Bearer ' + "f8ecf5e7-d9c8-3b93-9127-0a7ef7ca20f7" //the token is a variable which holds the token
                         }
            }
        ).then(function (response) {
            logger.debug('Response -> ' + JSON.stringify(response.data));

            callback(null, response.data);

        }).catch(function (error) {
            logger.debug('Error -> ' + JSON.stringify(error));

            callback(error, null);
        });
    } catch(err) {
        logger.debug('Error -> ' + err);
    }
    
     
};



module.exports = chis;
