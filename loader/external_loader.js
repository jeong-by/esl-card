'use strict';

/**
 * External interface loader utility
 * 
 * @author Mike
 */ 


var external_loader = {};

const config = require('../config/config');
const external_config = require('../config/external_config');

// module for socket connection pool
const SocketPool = require('./pool/SocketPool');

 
external_loader.external = {};
external_loader.external.pools = {};
external_loader.external.listeners = {};

let external_folder = '../external';

const fs = require('fs');
const path = require("path");


external_loader.init = function(app, config, callback) {
	console.log('external_loader.init called.');
    
	console.log('Count of External in config : %d', config.external.length);
	
	for (let i = 0; i < config.external.length; i++) {
		let curItem = config.external[i];
		
        // 모든 external 요소들에 대해 listeners 배열 객체 초기화
        external_loader.external.listeners[String(i)] = [];
        
		if (curItem.protocol == 'socket') {  
            if (curItem.direction == 'inbound') {  // socket server
                console.log('#' + i + ' inbound socket initialization started.');
                
                
                external_loader.setSocketServer(curItem, i);
                
                
            } else if (curItem.direction == 'outbound') {  // socket client
                console.log('#' + i + ' outbound socket initialization started.');
                
                let pool = SocketPool.createPool(curItem);
                
                pool.host = curItem.host;
                pool.port = curItem.port;
                console.log('host:port -> ' + pool.host + ':' + pool.port);
                
                external_loader.external.pools[curItem.name] = pool;
                
                console.log('#' + i + ' outbound socket initialization completed.');
            }
            
        } else if (curItem.protocol == 'http') {  
            if (curItem.direction == 'outbound') {  // http client
                console.log('#' + i + ' outbound http initialization started.');
                
            }
            
        } else {
            logger.error('Unknown protocol : ' + curItem.protocol);
        }
	}
    
    // load modules
    load(app, config, callback);
    
};


/*
 * Load database table in config 
 */
const load = (app, config, callback) => {
	console.log('Count of external module : %d', external_config.length);
    
    let count = 0;
	for (let i = 0; i < external_config.length; i++) {
		let curItem = external_config[i];

        let filename = path.join(__dirname, external_folder, curItem.file);
        console.log('filename #' + i + ' : ' + filename);
     
        if (fs.existsSync(filename + '.js')) {
            const CurModule = require(filename);
            console.log('external module : ', curItem.name, curItem.file);
            
            // init called in case of active attribute is true 
            if (curItem.active) {
                if (typeof(config.external[curItem.external_config]) == 'undefined') {
                    console.error('Index for external_config ' + curItem.external_config + ' not found.');
                    continue;
                }

                if (!config.external[curItem.external_config].count) {
                    config.external[curItem.external_config].count = 0;
                }
                
                const curModule = new CurModule(app, config, config.external[curItem.external_config], external_loader.external, curItem.external_config, config.external[curItem.external_config].count);
                console.log('external_config -> ' + String(curItem.external_config));
                 
                external_loader.external[curItem.name] = curModule;

               
               if (!external_loader.external.listeners[String(curItem.external_config)].socketListener) {
                   external_loader.external.listeners[String(curItem.external_config)].socketListener = [];
                   console.log('socketListener is set to array.');
               } 
                external_loader.external.listeners[String(curItem.external_config)].socketListener.push(curModule);
                console.log('Listener object is added to socketListener.');
 
                
                config.external[curItem.external_config].count += 1;
            }

            // external added to app object
            app.set('external', external_loader.external);

            count += 1;
        } else {
            logger.warn('No file %s -> not loaded.', filename + '.js');
        }
	}
	
    console.log('Count of External module in external : %d', count);

    if (callback) {
        callback(null, count);
    }
}



//================= Inbound Socket Server START =================//


let net = require('net');
let uuid = require('node-uuid');
let network = require('network');
 
let HashMap = require('hashmap');
 
// Map : Socket ID to Socket object
let socketMap = new HashMap();

// Map : Socket ID to remaining buffer object
let remainingMap = new HashMap();
 
let app_package = '$com.smc.noti';





// array for client sockets connected
let sockets = [];
sockets.remove = (socket) => {
	var index = sockets.indexOf(socket);
    if (index != -1) {
    	sockets.splice(index, 1);
    	console.log(getCurTime() + 'Count of sockets : %d', sockets.length);
    }
}


external_loader.setSocketServer = (curItem, index) => {
    external_loader.checkNetworkInterface(curItem, index);
}

external_loader.checkNetworkInterface = (curItem, index) => {

    network.get_interfaces_list(function(err, list) {
        if (err) {
            console.log(getCurTime() + "Error in getting network interface list.");
            console.log(getCurTime() + err.code + ", " + err.message);

            return;
        }

        console.log(getCurTime() + "Count of network interfaces : " + list.length);
        list.forEach(function(item, index) {
            console.log(getCurTime() + "interface #" + index);
            console.dir(item);

            // set host for wired / 119.*
            if (item.type == 'Wired' && item.ip_address && (item.ip_address.indexOf('119') != -1)) {
                console.log(getCurTime() + "Found wireless IP address : " + item.ip_address);
                curItem.host = item.ip_address;
                console.log('host is changed.')
            }
            
        });

        console.log(getCurTime() + "IP address is set to " + curItem.host);
        console.log(getCurTime() + "Starting server.");
        
        external_loader.startServer(curItem, index);
    });


}


external_loader.startServer = (curItem, listenerIndex) => {
    console.log('startServer called : ' + listenerIndex);
    
    let socketListener = external_loader.external.listeners[String(listenerIndex)].socketListener;
    console.log('socketListener -> ' + JSON.stringify(socketListener));

    var server = net.createServer((socket) => {
        console.log(getCurTime() + 'Client socket connected - %s : %d', socket.remoteAddress, socket.remotePort); 

        // create a unique time-based id
        var curId = uuid.v1();
        socket.id = curId;
        console.log(getCurTime() + 'Client socket ID : ' + socket.id);


        // set to the socketMap
        socketMap.set(socket.id, socket);
        var curSocket = socketMap.get(socket.id);
        console.log(getCurTime() + 'Socket type : ' + (curSocket instanceof net.Socket));

        // subscribe using the socket id
        //subscriber.subscribe(socket.id);


        sockets.push(socket);
        console.log(getCurTime() + 'Count of sockets : %d', sockets.length);

        // data event
        socket.on('data', (data) => { // data received
            console.log(getCurTime() + 'Received data size : %d', data.length);
            //console.log(getCurTime() + 'DATA : %s', data);

            // 등록된 SocketListener 객체가 있는 경우 onData 메소드 호출
            if (socketListener && socketListener.length > 0) {
                console.log('Count of socketListener : ' + socketListener.length);

                socketListener.forEach((item, index) => {
                    if (socketListener[index].onData) {
                        socketListener[index].onData(socket, data);
                    }
                });
            }


            external_loader.processData(socket, data, socketListener);
        });

        // end event
        socket.on('end', () => { // client disconnected
            console.log(getCurTime() + 'Client socket disconnected : %s', socket.id);

            
            // 등록된 SocketListener 객체가 있는 경우 onEnd 메소드 호출
            if (socketListener && socketListener.length > 0) {
                console.log('Count of socketListener : ' + socketListener.length);

                socketListener.forEach((item, index) => {
                    if (socketListener[index].onEnd) {
                        socketListener[index].onEnd(socket);
                    }
                });
            }


            sockets.remove(socket);
        });

        // timeout event
        socket.on('timeout', () => { // client connection timeout occurred
            console.log(getCurTime() + 'Client socket disconnected: ' + data + data.remoteAddress + ':' + data.remotePort + '\n');


            
            // 등록된 SocketListener 객체가 있는 경우 onTimeout 메소드 호출
            if (socketListener && socketListener.length > 0) {
                console.log('Count of socketListener : ' + socketListener.length);

                socketListener.forEach((item, index) => {
                    if (socketListener[index].onTimeout) {
                        socketListener[index].onTimeout(socket);
                    }
                });
            }



        });

        // error event
        socket.on('error', (error) => { // error occurred
            console.log(getCurTime() + 'Error occurred in socket : %s', socket.id);
            console.dir(error);

            if (error.code == 'ECONNRESET') {
                console.log(getCurTime() + 'Client connection reset.');

                sockets.remove(socket);

                socket.destroy();

                
                // 등록된 SocketListener 객체가 있는 경우 onConnectionReset 메소드 호출
                if (socketListener && socketListener.length > 0) {
                    console.log('Count of socketListener : ' + socketListener.length);

                    socketListener.forEach((item, index) => {
                        if (socketListener[index].onConnectionReset) {
                            socketListener[index].onConnectionReset(socket);
                        }
                    });
                }



            } else {

                
                // 등록된 SocketListener 객체가 있는 경우 onError 메소드 호출
                if (socketListener && socketListener.length > 0) {
                    console.log('Count of socketListener : ' + socketListener.length);

                    socketListener.forEach((item, index) => {
                        if (socketListener[index].onError) {
                            socketListener[index].onError(socket);
                        }
                    });
                }


            }

        });
    });


    
    
	server.listen({host: curItem.host, port: curItem.port, backlog: curItem.backlog}, () => {
		var server_address = server.address();
		var server_ip = server_address.address;
		var server_port = server_address.port;
		
		console.log(getCurTime() + 'Socket server started - %s : %d', server_ip, server_port);
	});
}


function getCurTime() {
	var now = new Date();
	return now.toLocaleTimeString() + " ";
};



external_loader.processData = (socket, data, socketListener) => {

	// check app_package and length first
	console.log(getCurTime() + 'typeof data : ' + typeof(data));
	let toClass = {}.toString;
	let dataType = toClass.call(data);
	console.log(getCurTime() + '[[Class]] property : ' + dataType);
	console.log(getCurTime() + 'is Buffer? : ' + (data instanceof Buffer));

	// concat remaining buffer if exists
	if (remainingMap.has(socket.id)) {
		console.log(getCurTime() + 'remaining buffer for socket [' + socket.id + '] exists.');
		
		let remainingBuffer = remainingMap.get(socket.id);
		let concatBuffer = new Buffer(data.length + remainingBuffer.length);
		concatBuffer.fill();
		remainingBuffer.copy(concatBuffer, 0);
		data.copy(concatBuffer, remainingBuffer.length);
		data = concatBuffer;

        console.log(getCurTime() + 'DATA length after concat : ' + concatBuffer.length);
		//console.log(getCurTime() + 'DATA after concat : %s', concatBuffer.toString('utf8'));

	} else {
		console.log(getCurTime() + 'remaining buffer for socket [' + socket.id + '] not exists.');
        
	}
	
	
    // 전문 길이값 확인 (10자리)
    let dataLenBuffer = new Buffer(10);
    data.copy(dataLenBuffer, 0, 0, 10);
    
	// 전문 길이값을 문자열로 변환
	let dataLenStr = dataLenBuffer.toString('utf8');
	console.log(getCurTime() + 'digit length string : ' + dataLenStr);


	// 전문 길이값을 숫자로 변환
	let dataLen = parseInt(dataLenStr);
	console.log(getCurTime() + 'digit length : ' + dataLen);
	if (!dataLen) {
		console.log(getCurTime() + 'digit length is invalid.');
		return;
	}
	
	// compare length integer and data length
	let bodyLen = data.length - 10;
	console.log(getCurTime() + 'digit vs. real -> ' + dataLen + ':' + bodyLen);
	
	if (bodyLen < dataLen) {
		console.log(getCurTime() + 'body buffer is not completed.');

		// put the remaining data to the remaining hash
		remainingMap.set(socket.id, data);
		
	} else if (bodyLen == dataLen) {
		console.log(getCurTime() + 'body buffer is completed.');

		// parse TEST
		//console.log(getCurTime() + 'converting body data for TEST.');
		
		try {
            let bodyStr = data.toString('utf8', 10, data.length);
            console.log('BODY -> ' + bodyStr);
            //let bodyObj = JSON.parse(bodyStr);
            
            processCompleted(socket.id, bodyStr, socketListener);
            
            // remove remaining data
    	   remainingMap.remove(socket.id);
		} catch(e) {
			console.log(getCurTime() + 'Error occurred in parsing data : ' + e);

			sendResponse(socket, '400', "Error occurred in parsing data : " + e.message, "");
		}

	} else {
		console.log(getCurTime() + 'bytes remained after body buffer.');
		
		// split body string
		//var curBodyStr = body_str.substr(0, body_length);
        let curBodyStr = data.slice(10, dataLen+10).toString('utf8');
        console.log('BODY -> ' + curBodyStr);
        
        processCompleted(socket.id, curBodyStr, socketListener);
 
        // 남은 바이트를 HashMap에 저장
        let remainingBuffer = data.slice(dataLen+10);
        console.log('REMAINING size -> ' + remainingBuffer.length);
        //console.log('REMAINING -> ' + remainingBuffer.toString('utf8'));

		remainingMap.set(socket.id, remainingBuffer);
		
		external_loader.processData(socket, new Buffer(0), socketListener);
	}
	
};


function processCompleted(socket_id, message, socketListener) {
    console.log('processCompleted called in external_loader.');
	//console.log(getCurTime() + 'MESSAGE : %s', message);
	 
	// channel is socket.id -> get socket object using socket.id
	let socket = socketMap.get(socket_id);
	
	// process JSON formatted input
	try {
		let input = JSON.parse(message);
		//console.dir(input);
        
        console.log('socket listener : ' + JSON.stringify(socketListener));
        
        
        // 등록된 SocketListener 객체가 있는 경우 onTimeout 메소드 호출
        if (socketListener.length > 0) {
            console.log('Count of socketListener : ' + socketListener.length);

            socketListener.forEach((item, index) => {
                if (socketListener[index].onDataCompleted) {
                    socketListener[index].onDataCompleted(socket, input);
                }
            });
        } else {
            console.log('no socket listener found.');
        }

        
	} catch(e) {
		console.log(getCurTime() + 'Error occurred in parsing data.');
		console.dir(e);
		
		sendResponse(socket, '400', "Error occurred in parsing data : " + e.message, "");
	}
	 
}


function sendResponse(socket, code, message, data) {

	// process JSON formatted output
	var request = {'command':'response', 'code':code, 'message':message, 'data':data};
	var requestStr = JSON.stringify(request);
	
	var dataLen = requestStr.length;
	var dataLenStr = dataLen.toString();
	for (var i = 0; i < 10; i++) {
		if (dataLenStr.length < 10) {
			dataLenStr = '0' + dataLenStr;
		} else {
			break;
		}	
	}
	var prefix = '$com.smc.noti' + '[' + dataLenStr + ']\r\n';
	var output = prefix + requestStr;
	
	socket.write(output, 'utf8', function() {
		console.log(getCurTime() + 'Sent data size : %d', output.length);
	});
	
};



//================= Inbound Socket Server END =================//




module.exports = external_loader;

