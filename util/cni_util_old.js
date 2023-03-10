'use strict';

/**
 * CNI utility (Utility for Samsung Channel Integrator)
 * 
 * @author Mike
 */ 
 
var thisModule = {};

var logger = require('../logger');

var HashMap = require('hashmap');
  
// Map : Socket ID to remaining buffer object
var remainingMap = new HashMap();



thisModule.processData = (res, conn, paramRequestCode, values, data, processCompleted, callback) => {
	// check app_package and length first
	logger.debug('typeof data : ' + typeof(data));
    
	var toClass = {}.toString;
	var data_type = toClass.call(data);
    
	logger.debug('[[Class]] property : ' + data_type);
	logger.debug('is Buffer? : ' + (data instanceof Buffer));

	// concat remaining buffer if exists
	if (remainingMap.has(conn.id)) {
		logger.debug('remaining buffer for socket [' + conn.id + '] exists.');
		
		var remainingBuffer = remainingMap.get(conn.id);
		var concatData = new Buffer(data.length + remainingBuffer.length);
		concatData.fill();
		remainingBuffer.copy(concatData, 0);
		data.copy(concatData, remainingBuffer.length);
		data = concatData;

		//logger.debug('DATA after concat : %s', concatData);

	} else {
		logger.debug('remaining buffer for socket [' + conn.id + '] not exists.');
	}
	
	
    
	// convert Buffer to String
	var data_str = data.toString('utf8');
	
	var length_str;
	var body_str = data_str;

	length_str = data_str.substr(0, 10);
	body_str = data_str.substr(10);
    logger.debug('length string : ' + length_str);
	//logger.debug('length string : ' + length_str + ', body string : ' + body_str);


	// convert length string to integer
	var body_length = parseInt(length_str);
	logger.debug('body length : ' + body_length);
	if (!body_length) {
		logger.debug('body length is not invalid.');
		return;
	}
	
	// compare length integer and data length
    //var body_buffer_length = body_str.length;
    var body_buffer = new Buffer(body_str, 'utf8');
    var body_buffer_length = body_buffer.length;
	logger.debug('compared length : ' + body_buffer_length + ', ' + body_length);
	
	if (body_buffer_length < body_length) {
		logger.debug('body buffer is not completed.');

		// put the remaining data to the remaining hash
        var remainingBuffer = new Buffer(data, 'utf8');
		remainingMap.set(conn.id, remainingBuffer);
		
	} else if (body_buffer_length == body_length) {
		logger.debug('body buffer is completed.');

		// parse TEST
		logger.debug('converting body data for TEST.');
		
		try {
			var bodyObj = JSON.parse(body_str);
			//console.dir(bodyObj);
		} catch(err) {
			logger.debug('Error occurred in parsing data.');
			console.dir(err);
			 
            return;
		}
		
    	// remove remaining data
    	remainingMap.remove(conn.id);
        
        // process completed
        
        // release connection to pool
        try {
            conn.release();
            console.log('connection released.');
        } catch(err) {
            console.log('error in releasing connection -> ' + JSON.stringify(err));
        }

    	processCompleted(res, conn, paramRequestCode, values, body_str, callback);
    	
    	
	} else {
		logger.debug('bytes remained after body buffer.');
		
		// split body string
		var curBodyStr = body_str.substr(0, body_length);
		var remainingStr = body_str.substr(body_length);
		
		// process completed
        
        // release connection to pool
        try {
            conn.release();
            console.log('connection released.');
        } catch(err) {
            console.log('error in releasing connection -> ' + JSON.stringify(err));
        }

        processCompleted(res, conn, paramRequestCode, values, curBodyStr, callback);
 

		// put the remaining data to the remaining hash
    	var remainingBuffer = new Buffer(remainingStr, 'utf8');
		remainingMap.set(conn.id, remainingBuffer);
		
		processData(res, conn, paramRequestCode, values, new Buffer(''), processCompleted, callback);
	}
	
};




thisModule.query = (values, callback) => {
    try {
        // external ?????? ??????
        var external = values.req.app.get('external');

        // external??? mci ??????
        if (external.samsung_mci) {
            external.samsung_mci.send(
                values,
                function(conn, err, result) {
                    if (err) {
                        try {
                            conn.release();
                            console.log('connection released.');
                        } catch(err) {
                            console.log('error in releasing connection -> ' + JSON.stringify(err));
                        }

                        logger.warn('exception in sending -> ' + JSON.stringify(err));
                        logger.warn('this can be normal status because of socket disconnect.');
                        thisModule.sendError(values.res, values.params.requestCode, 'send ??????', err);
                    
                        return;
                    }
                    
                    console.log('send request done -> ' + result);
                },
                function(conn, event, received) {
                    console.log('received event : ' + event);
                    console.log('received data : ' + received);                    
                    
                    thisModule.processData(values.res, conn, values.params.requestCode, values, received, thisModule.processCompleted, callback);
                }
            );
            
        } else {
            logger.error('external.samsung_mci ????????? ????????????.');
            thisModule.sendErrorString(values.res, values.params.requestCode, 'send ??????', 'external.samsung_mci ????????? ????????????.');
        }
        
	} catch(err) {
        logger.error('exception in sending -> ' + JSON.stringify(err));
		thisModule.sendError(values.res, values.params.requestCode, 'send ??????', err);
	}	
		
};



thisModule.queryEAI = (values, callback) => {
    try {
        
        // external ?????? ??????
        var external = values.req.app.get('external');
        
        
        // external??? chis_eai ??????
        if (external.chis_eai) {
            external.chis_eai.send(
                values.method,
                values.url,
                values.input,
                function(err, result) {
                    if (err) {
                        logger.warn('exception in sending -> ' + err);

                        thisModule.sendError(values.res, values.params.requestCode, 'send ??????', err);
                    }
                        
                    let output = {};
                    let results = [];
                    
                    let rows;
                    
                    if (values.outname && result) {
                        if (result[values.outname]) {
                            rows = result[values.outname];
                        } else {
                            logger.debug('attribute [' + values.outname + '] not found.');
                            logger.debug('contents -> ' + result);
                        }
                    } else {
                        rows = result;
                    }
                    
                    if (values.mapper) {
                        logger.debug('mapper found with attributes ' + Object.keys(values.mapper).length);
                        //logger.debug('rows -> ' + JSON.stringify(rows));
                        
                        if (Array.isArray(rows)) {  // ????????? ????????? ??????
                            rows.forEach((item, index) => {
                                let outputItem = {};
                                Object.keys(values.mapper).forEach((key, position) => {
                                    try {
                                        if (index == 0) {
                                            logger.debug('mapping #' + position + ' [' + key + '] -> [' + values.mapper[key] + ']');
                                        }

                                        outputItem[key] = item[values.mapper[key]];
                                        if (!outputItem[key]) {
                                            outputItem[key] = item[values.mapper[key].toUpperCase()] || item[values.mapper[key].toLowerCase()];
                                        }
                                        
                                     
                                    } catch(err2) {
                                        logger.debug('mapping error : ' + JSON.stringify(err2));
                                    }
                                });

                                results.push(outputItem);
                            });
                            
                        } else {       // ?????? ????????? ??????
                            if (rows) {
                                let item = rows;
                                let outputItem = {};
                                Object.keys(values.mapper).forEach((key, position) => {
                                    try {
                                        logger.debug('mapping #' + position + ' [' + key + '] -> [' + values.mapper[key] + ']');

                                        outputItem[key] = item[values.mapper[key]];
                                        if (!outputItem[key]) {
                                            outputItem[key] = item[values.mapper[key].toUpperCase()] || item[values.mapper[key].toLowerCase()];
                                        }
                                    } catch(err2) {
                                        logger.debug('mapping error : ' + err2);
                                    }
                                });

                                results.push(outputItem);
                            } else {
                                logger.debug('rows is null.');
                            }
                        }
                        
                    } else {
                        logger.debug('mapper not found. query result will be set to output.');
                        output = rows;
                    }
                    output.results = results;
                   

                    
                    
                    if (callback) {
                        callback(output);

                    } else {
                        thisModule.sendSuccess(values.res, values.params.requestCode, values.outname + ' success', output);
                        
                    }
                    
                }
            );
            
        } else {
            logger.warn('chis_eai object not found.');
            
            thisModule.sendError(values.res, values.params.requestCode, 'chis_eai object not found.', {});
        }
        
        
	} catch(err) {
        logger.error('exception in sending -> ' + err);
        
		thisModule.sendError(values.res, values.params.requestCode, 'send ??????', err);
	}	
		
};




/*
 * 
 */
thisModule.processCompleted = (res, conn, paramRequestCode, values, received, callback) => {
    logger.debug('processCompleted called.');
    
    // convert Buffer to string
    var receivedStr = received.toString();
//    console.log('output -> ' + receivedStr);

    
    // process MCI response
    var output = thisModule.processResponse(values, receivedStr, callback);
    
    
    //thisModule.sendSuccess(res, paramRequestCode, 'send ??????', output);

}


thisModule.processResponse = (values, receivedStr, callback) => {
    logger.debug('processResponse called.');
    
    try {
        var mciObj = JSON.parse(receivedStr);
 
        var keys = Object.keys(mciObj);
        console.log('KEYS -> ' + JSON.stringify(keys));

        var table = {};
        table.header = {};
//        table.header = thisModule.parseHeader(mciObj);
//        console.log('HEADER -> ' + JSON.stringify(table.header));

        // JU START 2018-03-28
//        if(table.header.errMessage && table.header.errMessage.length > 0) {                   
//            thisModule.sendErrorString(values.res, values.params.requestCode, 'MCI ??????', table.header.errMessage);
         
//        } else {
            table.body = thisModule.parseBody(values, mciObj, table.header, callback);
            console.log('BODY -> ' + JSON.stringify(table.body));  
//        }
        // JU END 2018-03-28
 
    } catch(err) {
        logger.error('error in processResponse -> ' + JSON.stringify(err));
    }

}


// JU START 2018-03-28
//thisModule.parseHeader = (mciObj) => {
//    logger.debug('parseHeader called.');
//    
//    var header = {};
//
//    // system header
//    // service id -> tlgrRecvSrvcId
//    header.serviceId = mciObj.cfs_sheader_001.tlgrRecvSrvcId;
//
//    // user id -> tlgrRecvUserId
//    header.userId = mciObj.cfs_sheader_001.tlgrRecvUserId;
//
//    // business header
//    // code -> mesgCd
//    // message -> mesgCtn
//    header.code = mciObj.cfs_bheader_s00.mesgCd;
//    header.message = mciObj.cfs_bheader_s00.mesgCtn;
//
//    return header;
//}

thisModule.parseHeader = (mciObj) => {
    logger.debug('parseHeader called.');
    
    var header = {};

    // system header
    // service id -> tlgrRecvSrvcId
    header.serviceId = mciObj.cfs_sheader_001.tlgrRecvSrvcId;

    // user id -> tlgrRecvUserId
    header.userId = mciObj.cfs_sheader_001.tlgrRecvUserId;
    
    // error message
    header.errMessage = '';
    
    // ????????????????????????
    var prsgRsltDvsnCd = mciObj.cfs_sheader_001.prsgRsltDvsnCd;
    if(!prsgRsltDvsnCd) {
       prsgRsltDvsnCd = '';
    }
    
    // ???????????????????????????
    var inrfSttsCd = mciObj.cfs_sheader_001.inrfSttsCd;
    if(!inrfSttsCd) {
       inrfSttsCd = '';
    }

    if( !(prsgRsltDvsnCd == '1' || prsgRsltDvsnCd == '9') ) {
        var message1 = '';
        var message2 = '';
        var message3 = '';
       
        if(prsgRsltDvsnCd == '2') {
            message1 = 'Business Error';
            message2 = '';
            message3 = 'AP ???????????? UI ?????? ????????? ?????? ???????????? ?????? ??????. ?????? ??? AP server userlog ??????';
        
        } else if(prsgRsltDvsnCd == '5') {
           message1 = 'F/W ??????';
           message2 = 'F/W ??????';
           message3 = '????????? ?????? ?????? ??? F/W ????????? ??????';
        
        } else if(prsgRsltDvsnCd == '6') {
           message1 = 'TP ??????';
     
           if(inrfSttsCd == '001') {
               message2 = 'TIMEOUT';
               message3 = 'TP ?????? ?????? ??????';
               
           } else if(inrfSttsCd == '006') {
               message2 = 'NOENTRY';
               message3 = 'TP ?????? ?????? ?????? ??????';
               
           } else if(inrfSttsCd == '010') {
               message2 = 'SVRERR';
               message3 = 'TP ?????? ?????? ??????';
               
           } else if(inrfSttsCd == '013') {
               message2 = 'TIMEOUT';
               message3 = 'TP ?????? ?????? ??????';
               
           } else if(inrfSttsCd == '100') {
               message2 = 'TIMEOUT';
               message3 = 'TP ?????? ?????? ??????';
           }
            
        } else if(prsgRsltDvsnCd == '7') {
           message1 = 'I/F ?????? ??????';
     
           if(inrfSttsCd == '403') {
               message2 = 'FORBIDDEN';
               message3 = 'NO PERMISSION Client IP';
               
           } else if(inrfSttsCd == '601') {
               message2 = '?????? ??????';
               message3 = '?????? ?????? ?????? ??????';
               
           } else if(inrfSttsCd == '602') {
               message2 = '?????? ????????? ??????';
               message3 = '?????? ?????? ??????';
               
           } else if(inrfSttsCd == '603') {
               message2 = '?????? ?????? ??????';
               message3 = '?????? ?????? ?????? ??????';
               
           } else if(inrfSttsCd == '901') {
               message2 = '????????????';
               message3 = '';
               
           } else if(inrfSttsCd == '902') {
               message2 = '?????? ????????? ??????';
               message3 = '?????? ?????? ??????';
            
           } else if(inrfSttsCd == '903') {
               message2 = '???????????? ??????';
               message3 = '???????????? ??????';
            
           } else if(inrfSttsCd == '920') {
               message2 = '?????? ?????? ??????';
               message3 = 'MCI ????????? ??????';
            
           } else if(inrfSttsCd == '930') {
               message2 = '?????? ?????? ??????';
               message3 = '?????????????????? TP ????????? ?????????';
            
           } else if(inrfSttsCd == '931') {
               message2 = '?????? ?????? ??????';
               message3 = '?????? ?????? ??????';
            
           } else if(inrfSttsCd == '932') {
               message2 = '?????? ?????? ??????';
               message3 = '?????? ?????? ??????';
            
           } else if(inrfSttsCd == '933') {
               message2 = '?????? ?????? ??????';
               message3 = '?????? ?????? ??????';
           } 
            
        } else if(prsgRsltDvsnCd == '8') {
           message1 = '?????? ??????';
     
           if(inrfSttsCd == '961') {
               message2 = '???????????? ??????';
               message3 = '????????????';
               
           } else if(inrfSttsCd == '962') {
               message2 = '???????????? ??????';
               message3 = '????????????';   
           }
        }
        
        header.errMessage = '?????????ID : ' + header.serviceId + '\n???????????????????????? : [' + prsgRsltDvsnCd + '] ' + message1 + '\n??????????????????????????? : [' + inrfSttsCd + '] ' + message2 + '???????????? : ' + message3;
        
        logger.error('MCI ??????\n' + header.errMessage);
    }

    // business header
    // code -> mesgCd
    // message -> mesgCtn
    header.code = mciObj.cfs_bheader_s00.mesgCd;
    header.message = mciObj.cfs_bheader_s00.mesgCtn;
    
    // ???????????????
    var mesgCd = mciObj.cfs_bheader_s00.mesgCd;
    // ???????????????
    var mesgCtn = mciObj.cfs_bheader_s00.mesgCtn;
    // ?????????????????????
    var errPrgmNm = mciObj.cfs_bheader_s00.errPrgmNm;
    // ???????????????
    var errFuncNm = mciObj.cfs_bheader_s00.errFuncNm;
    // ??????????????????
    var errLineNo = mciObj.cfs_bheader_s00.errLineNo;
    // ??????SQL??????
    var errSqlNo = mciObj.cfs_bheader_s00.errSqlNo;
    // ??????TP??????
    var errTpNo = mciObj.cfs_bheader_s00.errTpNo;
    // ?????????????????????????????????
    var errMesgPrsgDvsnCd = mciObj.cfs_bheader_s00.errMesgPrsgDvsnCd;

    // ?????? ????????? ??????????????? ??????????????? ?????? ?????? ?????? ?????? ?????????????????? ?????????????????? ???????????? ??????
    if( (mesgCd && mesgCd.trim().length >= 2 && (mesgCd.substring(0, 2) == 'IB' || mesgCtn == '?????? ????????? ????????????.'))
       || (mesgCd.trim().length == 0 && mesgCtn.trim().length == 0 && errPrgmNm.trim().length == 0 && errFuncNm.trim().length == 0 
        && errLineNo.trim().length == 0 && errSqlNo.trim().length == 0 && errTpNo.trim().length == 0 && errMesgPrsgDvsnCd.trim().length == 0) ) {

    // ????????? ????????? ?????? 
    } else {
        // EF00001, ??????????????? ?????? ???????????????.
        // EB00004, DB ????????? ????????? ?????????????????????.
        
        header.errMessage = '?????????ID : ' + header.serviceId + '\n??????????????? : ' + mesgCd + '\n??????????????? : ' + mesgCtn + '\n????????????????????? : ' + errPrgmNm + '\n??????????????? : ' + errFuncNm + '\n?????????????????? : ' + errLineNo + '\n??????SQL?????? : ' + errSqlNo + '\n??????TP?????? : ' + errTpNo + '\n????????????????????????????????? : ' + errMesgPrsgDvsnCd;
            
        logger.error('MCI ??????\n' + header.errMessage);
    } 

    return header;
}
// JU END 2018-03-28


thisModule.parseBody = (values, mciObj, header, callback) => {
    logger.debug('parseBody called.');
    
    var body;
    
    console.log('outname type : ' + typeof(values.outname));      
    if(typeof(values.outname) == "string") {        
        header.repeat = mciObj[values.outname].length;
        console.log('repeat count : ' + header.repeat);        

        body = thisModule.parseData(values, header, mciObj[values.outname], callback);

    } else if(typeof(values.outname) == "object" && values.outname.constructor == Array) {
        var arrayDataCnt = values.outname.length;            
        console.log('array data count : ' + arrayDataCnt);

        body = thisModule.parseArrayData(values, header, mciObj, values.inname, values.outname, callback); 
    }
     
    return body;
}


thisModule.parseData = (values, header, rows, callback) => {
    logger.debug('parseData called.');
        
//    var output = [];
     let output = {};
     let results = [];
    
    
//    logger.debug('values.params -> ' + JSON.stringify(values.params));
//    logger.debug('values.input -> ' + JSON.stringify(values.input));
//    logger.debug('values.mapper -> ' + JSON.stringify(values.mapper));
//    logger.debug('values.interfaceId -> ' + JSON.stringify(values.interfaceId));
//    logger.debug('values.requestId -> ' + JSON.stringify(values.requestId));
//    logger.debug('values.inname -> ' + JSON.stringify(values.inname));
//    logger.debug('values.outname -> ' + JSON.stringify(values.outname));
//    logger.debug('values.type -> ' + JSON.stringify(values.type));
    
    try {
        if (values.mapper) {
                     
            logger.debug('mapper found with attributes ' + Object.keys(values.mapper).length);
            rows.forEach((item, index) => {
                var outputItem = {};
                Object.keys(values.mapper).forEach((key, position) => {
                    try {
                        if (index == 0) {
                            logger.debug('mapping #' + position + ' [' + key + '] -> [' + values.mapper[key] + ']');
                        }
                        
                        outputItem[key] = item[values.mapper[key]];
                        if (!outputItem[key]) {
                            outputItem[key] = item[values.mapper[key].toUpperCase()] || item[values.mapper[key].toLowerCase()];
                        }
                    } catch(err2) {
                        logger.debug('mapping error : ' + JSON.stringify(err2));
                    }
                });

                results.push(outputItem);
            });
        } else {
            logger.debug('mapper not found. query result will be set to output.');
            output = rows;
        }
         output.results = results;
    
        if (callback) {
            callback(output);
            
        } else {
            thisModule.sendSuccess(values.res, values.params.requestCode, values.inname + ':' + values.outname + ' success', output);
        }
    
    } catch(err) {
        logger.error('error in processResponse -> ' + JSON.stringify(err));
    }
    
    return output;
      
}


// JU START 2018-03-16
thisModule.parseItem = (values, header, item, callback) => {
    logger.debug('parseItem called.');
    
    var output = [];
    
    try {
        if (values.mapper) {
            logger.debug('mapper found with attributes ' + Object.keys(values.mapper).length);
            var outputItem = {};
            Object.keys(values.mapper).forEach((key, position) => {
                try {
                    if (position == 0) {
                        logger.debug('mapping #' + position + ' [' + key + '] -> [' + values.mapper[key] + ']');
                    }
                        
                    outputItem[key] = item[values.mapper[key]];
                    if (!outputItem[key]) {
                        outputItem[key] = item[values.mapper[key].toUpperCase()] || item[values.mapper[key].toLowerCase()];
                    }
                } catch(err2) {
                    logger.debug('mapping error : ' + JSON.stringify(err2));
                }
            });

            output.push(outputItem);
        } else {
            logger.debug('mapper not found. query result will be set to output.');
            output = rows;
        }
        
        logger.debug('OUTPUT -> ' + JSON.stringify(output));

        if (callback) {
            callback(output);
        } else {
            thisModule.sendSuccess(values.res, values.params.requestCode, values.inname + ':' + values.outname + ' success', output);
        }
    
    } catch(err) {
        logger.error('error in processResponse -> ' + JSON.stringify(err));
    }
      
}
// JU END 2018-03-16

// JU START 2018-03-23
thisModule.parseArrayData = (values, header, mciObj, inname, outname, callback) => {
    logger.debug('parseArrayData called.');
    
    var output = [];

    try {
        if (values.mapper) {
            outname.forEach((oname, oindex) => {
                console.log('array data #' + oindex + ' [' + oname + ']');
                header.repeat = mciObj[values.inname][oname].length;
                console.log('repeat count : ' + header.repeat);

                var itemput = [];
                
                logger.debug('mapper found with attributes ' + Object.keys(values.mapper[oindex]).length);
                mciObj[values.inname][oname].forEach((item, index) => {
                    var outputItem = {};
                    Object.keys(values.mapper[oindex]).forEach((key, position) => {
                        try {
                            if (index == 0) {
                                logger.debug('mapping #' + position + ' [' + key + '] -> [' + values.mapper[oindex][key] + ']');
                            }

                            outputItem[key] = item[values.mapper[oindex][key]];
                            if (!outputItem[key]) {
                                outputItem[key] = item[values.mapper[oindex][key].toUpperCase()] || item[values.mapper[oindex][key].toLowerCase()];
                            }
                        } catch(err2) {
                            logger.debug('mapping error : ' + JSON.stringify(err2));
                        }
                    });

                    itemput.push(outputItem);
                });
                
                output.push(itemput);
            });
            

        } else {
            logger.debug('mapper not found. query result will be set to output.');
            
            outname.forEach((oname, oindex) => {
                console.log('array data #' + oindex + ' [' + oname + ']');
                header.repeat = mciObj[values.inname][oname].length;
                console.log('repeat count : ' + header.repeat);

                output.push(mciObj[values.inname][oname]);
            });
        }
        
        logger.debug('OUTPUT -> ' + JSON.stringify(output));

        if (callback) {
            callback(output);
        } else {
            thisModule.sendSuccess(values.res, values.params.requestCode, values.inname + ':' + values.outname + ' success', output);
        }
    
    } catch(err) {
        logger.error('error in processResponse -> ' + JSON.stringify(err));
    }
      
}
// JU END 2018-03-23

thisModule.sendSuccess = (res, paramRequestCode, message, result) => {
    logger.debug('sendSuccess called.');
    
    thisModule.sendResponse(res, paramRequestCode, 200, message, 'string', 'application/json', 'mci', '1.0', result);
}

thisModule.sendError = (res, paramRequestCode, message, err) => {
    logger.debug('sendError called.');
    
    thisModule.sendResponse(res, paramRequestCode, 400, message, 'error', 'application/json', 'error', '1.0', err);
}

thisModule.sendErrorString = (res, paramRequestCode, message, result) => {
    logger.debug('sendErrorString called.');
    
    thisModule.sendResponse(res, paramRequestCode, 400, message, 'string', 'plain/text', 'none', '1.0', result);
}

thisModule.sendResponse = (res, requestCode, code, message, resultType, resultFormat, resultProtocol, resultVersion, result) => {
    logger.debug('sendResponse called : ' + code);
    
    if (typeof(result) == 'object') {
        logger.debug(message);
//        logger.debug(JSON.stringify(result));
    }
    
    var response = {
        requestCode:requestCode,
        code:code,
        message:message,
        resultType:resultType,
        resultFormat:resultFormat,
        resultProtocol:resultProtocol,
        resultVersion:resultVersion,
        result:result
    }
    
    var responseStr = JSON.stringify(response);
    
    try {
        res.status(code).send(responseStr);
    } catch(err) {
        logger.error('error in sendResponse -> ' + JSON.stringify(err));
    }
}




module.exports = thisModule;

