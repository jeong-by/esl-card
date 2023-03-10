'use strict';

const http = require('http');
const https = require('https');
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const fs = require('fs');

const cors = require('cors');
const multer = require('multer');

const cookieParser = require('cookie-parser');
const expressSession = require('express-session');
const bcrypt = require('bcrypt-nodejs');

const passport = require('passport');
const flash = require('connect-flash');

const config = require('./config/config');

const serviceLoader = require('./loader/service_loader');
const controllerLoader = require('./loader/controller_loader');

const local_login = require('./passport/local_login');


// logger
const logger = require('./util/logger');

//===== Socket.IO =====//
const socketio = require('socket.io');


//=====================//

// BY START 2021-03-29
// express Session 사용
const sessionMiddleware = expressSession({
    secret: 'unsnetworks', // 쿠키에 저장되는 식별자 데이터를 암호화하기위해
    resave: false, // resave 요청이 왔을때 세션을 수정하지 않아도 다시 저장하게끔 (병목현상 일어날 수 있으니 false)
    saveUninitialized: true // // 초기화 되지 않은 세션을 강제로 저장 --> 모든 방문자에게 고유한 식별 값 제공
});

// BY END 2021-03-29


// load external_loader
const external_loader = require('./loader/external_loader');



// Declaration of createApp function
const createApp = () => {
    const app = express();

    // View 설정
    app.set('views', path.join(__dirname, 'views'));
    app.set('view engine', 'ejs');
    console.log('View engine is set to ejs.');    

    app.use(cors());
    app.use('/', express.static(path.join(__dirname, 'public')));
    
    //app.use(bodyParser.urlencoded({extended:false}));
    app.use(bodyParser.urlencoded({
        parameterLimit: 50000000,
        limit: '50mb',
        extended:true
    }));
    app.use(bodyParser.json({
        parameterLimit: 50000000,
        limit: '50mb',
        extended:true
    }));
    
    
    const upload = initUpload();

    app.use(cookieParser());
    app.use(sessionMiddleware);
    
    app.use(passport.initialize());
    app.use(passport.session());
    app.use(flash());
    
    passport.use('local-login', local_login);
        

    const router = express.Router();
    app.use('/', router);

    app.post('/baroboard/upload', upload.array('imageFile'), function (req, res) {
        var filesLength = req.files.length;
        var uploadCnt = 0;
     
        if (filesLength <= 0) {
            res.status(500).end();
        } else {
            for (var i = 0; i < filesLength; i++) {
                imageUpload(req.files[i]);
                uploadCnt += 1;
     
                if (uploadCnt == filesLength) {
                    res.status(200).end();
                }
            }
        }
    });


    // load registered services
    serviceLoader.load();
    logger.info('service loader called.');

    // load registered controllers
    controllerLoader.load(router, upload);
    logger.info('controller loader called.');

    // load external interface 
    external_loader.init(app, config);
    

    initSwagger(app);

    return app;    
};

/*이미지 업로드 함수*/
function imageUpload(files) {
    fs.readFile(files.path, function (err, data) {
        var filePath = __dirname + '/public/images/' + files.originalname;
        fs.writeFile(filePath, data, function (error) {
            if (error) {
                throw error;
            } else {
                fs.unlink(files.path, function (removeFileErr) {
                    if (removeFileErr) {
                        throw removeFileErr;
                    }
                });
            }
        });
    });
}

// Declaration of initUpload function
const initUpload = () => {
 
    const storage = multer.diskStorage({
        destination: function(req, file, callback) {
            logger.debug('IN initUpload ',file);
            callback(null, './public/images/');
        },
        filename: function(req, file, callback) {
            const extension = path.extname(file.originalname);
            const basename = path.basename(file.originalname, extension);
    
            callback(null, basename);
        }
    });
    
    const upload = multer({
        storage: storage,
        limits: {
            files: 10,
            fileSize: 1024 * 1024 * 1024
        }
    });
     
    return upload;
};

const initSwagger = (app) => {
    const expressSwagger = require('express-swagger-generator')(app);

    let options = {
        swaggerDefinition: {
            info: {
                description: 'This is a boilerplate server',
                title: 'UbiAccess',
                version: '1.0.0',
            },
            host: 'localhost:7001',
            basePath: '/',
            produces: [
                "application/json",
                "application/xml"
            ],
            schemes: ['http', 'https'],
            securityDefinitions: {
                JWT: {
                    type: 'apiKey',
                    in: 'header',
                    name: 'Authorization',
                    description: "",
                }
            }
        },
        basedir: __dirname, //app absolute path
        files: ['./controllers/**/*.js'] //Path to the API handle folder
    };

    expressSwagger(options);

}


var options = {  
    key: fs.readFileSync('./openssl/private.key'),
    cert: fs.readFileSync('./openssl/public.key'),
    //passphrase: 'unsnetworks'
};

let namespace;

// Declaration of main function
const main = () => {

    const app = createApp();

    let server;
    if (config.server.https) {
        server = https.createServer(options, app);
        console.log(server);
    } else {
        server = http.createServer(app);
    }
    
    const serverCallback = () => {
        let baseUrl;
        if (config.server.https) {
            logger.info('Https Server started.');

            if (config.server.host) {
                baseUrl = 'https://' + config.server.host + ':' + config.server.port;
            } else {
                baseUrl = 'https://localhost:' + config.server.port;
            }
            
        } else {
            logger.info('Http Server started.');
            
            if (config.server.host) {
                baseUrl = 'http://' + config.server.host + ':' + config.server.port;
            } else {
                baseUrl = 'http://localhost:' + config.server.port;
            }
            
        }
    
        logger.info('Base URL -> ' + baseUrl);

        const serverHost = server.address().address;
        const serverPort = server.address().port;
        namespace = serverHost + '_' + serverPort + '_' + process.pid;
        logger.info('Namespace -> ' + namespace);
        
        // load registered socket.io handlers
        if (config.socketio && config.socketio.active) {
            // socketio_loader for socket.io
            const socketioLoader = require('./loader/socketio_loader');

            socketioLoader.load(server, app, sessionMiddleware, socketio, namespace);
            logger.info('socket.io loader called.');
        }

    };

    if (config.server.host) {
        server.listen(config.server.port, config.server.host, config.server.backlog, serverCallback);
    } else {
        server.listen(config.server.port, serverCallback);
    }

    return server;
};




// Call main function
const webServer = main();






