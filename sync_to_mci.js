'use strict';

// TEST 환경을 위해 주석처리한 코드 확인 후 실제 서버 적용 필요.

// BY START 2020-01-14

const axios = require('axios');


const ajax = require('ajax-request');

const config = require('./config/config');

// // logger
const logger = require('./util/logger');


const base64js = require('base64-js');
const sysUtil = require('util');
// ESL controller
const sync_to_mci_controller = require('./controllers/sync_to_mci-controller');

const net = require('net');
const MCI = require('./external/mci');


let MCI_SERVER_URL;
let wardId;
let battery_interval = config.interval.battery;
let mci_interval = config.interval.mci; 
let rows; 

const mci= new MCI();
const SyncToMCI = new sync_to_mci_controller ();

const aims_info = config.external[2];
const DIDsocket_host = config.external[3].host;
const DIDsocket_port = config.external[3].port;
let aims_ip = 'http://'+aims_info.host + ':' +aims_info.port;

const Main = async () => {
    logger.info('Sync_to_MCI is started.');
    
    MCI_SERVER_URL = 'http://localhost:7001';

    // JU START 2020-02-19
	// 05E : 05동(TEST), 202365
	// 05IU : 음압격리병동 5층, 202366
	// 10W : 10서(GS5), 171130
    // wardId = ['202366', '202365'];
    wardId = ['171130']; //test 용 
	// JU END 2020-02-19
    
    logger.info('sync_to_mci Controller is imported.');

    // batteryInfoUpdate()
    mciPatientInfo();
    
}

// MCI 정보 받아오는 함수
const mciPatientInfo = async() => {
    // step 1. MCI의 응답데이터를 이용하여 ESL/DID 환자정보 조회 
    logger.info('MCIPatientInfo started')
    
    for (var i = 0; i < wardId.length; i++) {
        let patientInfoData = [];
        let wardInfo;
        let devices;
        
        
        console.info('mciPatientInfo', 'wardId : ' + wardId[i] + ' is start.');
        await axios({
            method: 'get',
            url: MCI_SERVER_URL + '/mci-test/patient-list?wardId=' + wardId[i],
                responseType: 'json'
            })
            .then(async function (response) {
                // step1. DB 디바이스 데이터 초기화
                console.log('STEP1. DB 디바이스 데이터 초기화');
                console.log('---------------------------------------------------------------');
                devices = await resetData(wardId[i]);

                
                // step2. MCI -> DB 디바이스 데이터 업데이트   hash map 사용하기
                patientInfoData = response.data.data.body;
                console.log('Begin to make [DID] Socket Data in the ['+wardId[i] +'] department');
                // did 정보 담기
                var hashMap = new HashMap();
                for (let j = 0; j <devices.length; j++) {
                    const locationArray = devices[j].name.split('-');
                    const location = 'DID'+locationArray[0]+locationArray[1];
                    hashMap.put(location,null);

                }

                let arr=[];
                let arr2=[];
                for(var j = 0 ; j < patientInfoData.length ; j ++){
                    arr.push(patientInfoData[j].roomNo);
                    arr2.push(patientInfoData[j].ward);
                }

                let roomArray = arr.filter((item,index)=>arr.indexOf(item) === index);
                let wardArray = arr2.filter((item,index)=>arr2.indexOf(item) === index);
                for (let k = 0 ; k < roomArray.length ; k ++){
                    let patients = [];
                    let elbdNo;
                    for(let j = 0 ; j < patientInfoData.length; j ++) {
                        
                        
                        if(patientInfoData[j].roomNo == roomArray[k]) {
                            const patient = await MappingMCIDataForDID(patientInfoData[j]);
                            patients.push(patient);
                        }
                    }  
                    elbdNo = 'DID' + wardArray[0] + roomArray[k];
                    hashMap.put(elbdNo,patients);
                    // 아래 for문 코드로 대체
                    // await StartDIDData(elbdNo,patients); 

                }
                ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                // 2020-05-20 테스트를 위해 막아둠
                // for(let j =0 ; j<hashMap.size(); j++) {
                //     await StartDIDData(hashMap.keys()[j],hashMap.values()[j]);
                // }
                /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////// 
                logger.info('Begin to make [ESL] Socket Data in the ['+wardId[i] +'] department')
            

                console.log("STEP2. DB에 디바이스 데이터(MCI 정보) 업데이트하기")
                console.log('---------------------------------------------------------------');
                for(var j = 0 ; j < patientInfoData.length ; j ++){
                    // esl 정보 담기
                    wardInfo = ('"' + patientInfoData[j].ward + '-' + patientInfoData[j].roomNo + '-' + patientInfoData[j].bedNo + '"');
                    const params = {
                        wardInfo: wardInfo
                    }
                    await GetWardLayoutData(params, patientInfoData[j]);  
                }
                logger.info('['+wardId[i]+'] '+' MCI information has been updated in the DB')
                
                // step3. ESL 라벨 이미지 적용
                
                console.log("STEP3. 각 디바이스의 DB정보로 ESL 라벨 이미지 적용하기")
                console.log('---------------------------------------------------------------');
                for(let j = 0 ; j <devices.length; j ++) {
                    await requestDeviceDataApply(devices[j].id);
                }
                logger.info('[ESL + DID] information in the  ['+wardId[i] +']  department has been updated.')
                
            })
            .catch(function (err) {
                logger.error(err);
                console.error('Error mciPatientInfo in  -> ' +     err);
            });
    }
    console.log('All Data Finished');
    Delay(1000*3);
    RequestESLDate();
}

// 사진 적용간 과부하 막기 위해 delay적용 함수
function Delay(time,name) { 
    return new Promise(resolve => setTimeout(() => { 
        if(name) {
            console.log(name+'`s MCIInfo image update success and wait a few minute.')
        }
        resolve();
    }, time) ); 
}

async function resetData(wardId) {
    
    let devices = await SyncToMCI.GetDeviceInThisWard(wardId);
    if(devices.length > 0) {
        const layoutMappingText = Base64Decode(devices[0].mapping);
        const layoutMapping = JSON.parse(layoutMappingText);
        const mappingKeys = Object.keys(layoutMapping);
        const sources = [];
        let outObj = {};
        for (let i = 0; i < mappingKeys.length; i++) {
            const curKey = mappingKeys[i];
            const curObj = layoutMapping[curKey];

            if(curObj == 'nameWarning') {
                
            }
            //source가 중복된 경우에는 skip
            if (sources.indexOf(curObj['source']) > -1) {
            } else {
                sources.push(curObj['source']);
            }
            
            // 데이터가 사진인지(array인지 1개만인지), text인지 구분
            let curInputValue;
            var imagName;
            // BY START 2019-11-21
            if(curObj.target=='src') {
                
                
                
                let imageName = ' '

                // 사진이 array일 때
                
                curInputValue = imageName;
                
            }
            else if (curObj.target =='text') {
                if(curKey == 'nameWarning') {
                    curInputValue = 'N'
                }
                else {
                    curInputValue = ' '
                }
                
            }
            // BY START 2019-12-11
            else if ( curObj.target =='data-code') {
                curInputValue = ' ';
                
            }
            // BY END 2019-12-11

            // BY END 2019-11-21
            // get source
            const curSource = curObj.source;
            const sourceArray = curSource.split('.');
            // BY START 2019-11-21
            let outObjRef = outObj;
            
            // BY END 2019-2019-11-21
            for (let j = 0; j < sourceArray.length; j++) {
                
                if (j == (sourceArray.length - 1)) { // last element
                    // BY START 2019-11-21
                    if(outObjRef[sourceArray[j]]) {
                        outObjRef[sourceArray[j]] += ','+curInputValue;
                    }
                    // BY END 2019-11-21
                    else {
                        outObjRef[sourceArray[j]] = curInputValue;
                    }
                                            
                } else {
                    if (outObjRef[sourceArray[j]]) {

                    } else {
                        outObjRef[sourceArray[j]] = {};
                    }
                    outObjRef = outObjRef[sourceArray[j]];
                }
            }  
        }

        const contents = JSON.stringify(outObj);
        
        
        const data = Base64Encode(contents);
        await SyncToMCI.resetData(wardId,data);
        return devices ;
    }
    else {
        return [];
    }
    
}


// Base64인코딩
function Base64Encode(str, encoding = 'utf-8') {
    var bytes = new (sysUtil.TextEncoder || sysUtil.TextEncoderLite)(encoding).encode(str);        
    return base64js.fromByteArray(bytes);
}

// Base64디코딩
function Base64Decode(str, encoding = 'utf-8') {
    var bytes = base64js.toByteArray(str);
    return new (sysUtil.TextDecoder || sysUtil.TextDecoderLite)(encoding).decode(bytes);
}


//  ESL 관라자 서버를 통해 DB에있는 Layout,data,mapping 정보를 갖고오는 함수
async function GetWardLayoutData(params, patientInfoData) {
    let wardInfoData = await SyncToMCI.layoutMappingDataList(params);
    wardInfoData = wardInfoData.body;
    if(wardInfoData[0] !==undefined) {
        const data = JSON.parse(JSON.stringify(wardInfoData[0]));
        
        const wardLayoutData = JSON.parse(Base64Decode(data.data));
        await MappingMCIData(wardLayoutData.data, patientInfoData,wardInfoData[0].id);
    }
}

// Layout에 MCI 데이터를 Mapping 하는 함수
async function MappingMCIData(wardLayoutData, patientInfoData,deviceId) {

    const firstName = patientInfoData.firstName;  
    let gender;
    if (patientInfoData.gender == 'M') {
        gender = '남'
    } else {
        gender = '여'
    }
    let nameWarning = 'N';
    if (patientInfoData.nameWarning) {
        nameWarning = patientInfoData.nameWarning;
    } 
    let age = patientInfoData.age
    let genderAge = gender + ' / ' + age ;
    const birthDate = patientInfoData.birthDate;
    const dept = patientInfoData.dept;
    const doctorName1 = patientInfoData.doctorName1;
    const doctorName2 = patientInfoData.doctorName2;
    // memo와 roundingdata는 수정 필요
    
    const treatDate = patientInfoData.treatDate;
    const leavingDate = patientInfoData.leavingDate;
    const information = 'information.png';
    const roundingSun = patientInfoData.roundingSun; 
    const roundingMon = patientInfoData.roundingMon; 
    const roundingTue = patientInfoData.roundingTue;
    const roundingWed = patientInfoData.roundingWed; 
    const roundingThu = patientInfoData.roundingThu; 
    const roundingFri = patientInfoData.roundingFri;
    const roundingSat = patientInfoData.roundingSat;
    let monRoundingTime1; let monRoundingTime2; let tueRoundingTime1; let tueRoundingTime2; let wedRoundingTime1; let wedRoundingTime2; let thuRoundingTime1; let thuRoundingTime2; let friRoundingTime1; let friRoundingTime2;
    let cautionMemo = '';
    let cautionMemo1; 
    let cautionMemo2;

    if( patientInfoData.npoYn == "Y") { // 금식여부 체크 Y인 경우
        if(patientInfoData.npoCtn) { // 금식시기 콤보박스 값이 있을 경우
            if(patientInfoData.npoDscrMemoCtn) { // 식사안내 콤보박스 값이 있을 경우
                cautionMemo1 = patientInfoData.npoCtn + " 금식, " + patientInfoData.npoDscrMemoCtn;
            }
            else { //식사안내 콤보박스 값이 없을 경우
                cautionMemo1 = patientInfoData.npoCtn + " 금식";
            }
            
        }else { // 금식여부는 체크 되어있으나, 금삭사가 콤보박스 값이 없을 경우
            if(patientInfoData.npoDscrMemoCtn) { // 식사안내 콤보박스 값이 있을 경우
                cautionMemo1 = "금식, " + patientInfoData.npoDscrMemoCtn;
            }
            else { //식사안내 콤보박스 값이 없을 경우
                cautionMemo1 = "금식";
            }
        }
    }
    else { //금식 여부 체크 N인 경우
        if(patientInfoData.npoDscrMemoCtn) { //식사안내 콤보박스 값이 있을 경우 
            cautionMemo1 = patientInfoData.npoDscrMemoCtn;
        }
        else {
            cautionMemo1 = " ";
        }
    }



    if( patientInfoData.ptntInftCtn) {
        cautionMemo2 = patientInfoData.ptntInftCtn;
    }
    else {
        cautionMemo2 = ' ';
    }


    if(roundingMon) {
        let roundingTimeStr = roundingMon.split('/');
        monRoundingTime1 =' ' + roundingTimeStr[0];
        if(roundingTimeStr[1]) {
            monRoundingTime2 = roundingTimeStr[1];
        }
    }
    if(roundingTue) {
        let roundingTimeStr = roundingTue.split('/');
        tueRoundingTime1 =' ' +  roundingTimeStr[0];
        if(roundingTimeStr[1]) {
            tueRoundingTime2 = roundingTimeStr[1];
        }
    }
    if(roundingWed) {
        let roundingTimeStr = roundingWed.split('/');
        wedRoundingTime1 =' ' +  roundingTimeStr[0];
        if(roundingTimeStr[1]) {
            wedRoundingTime2 = roundingTimeStr[1];
        }
    }
    if(roundingThu) {
        let roundingTimeStr = roundingThu.split('/');
        thuRoundingTime1 =' ' +  roundingTimeStr[0];
        if(roundingTimeStr[1]) {
            thuRoundingTime2 = roundingTimeStr[1];
        }
    }
    if(roundingFri) {
        let roundingTimeStr = roundingFri.split('/');
        friRoundingTime1 =' ' +  roundingTimeStr[0];
        if(roundingTimeStr[1]) {
            friRoundingTime2 = roundingTimeStr[1];
        }
    }

    const ward = patientInfoData.ward;
    const roomNo = patientInfoData.roomNo;
    const bedNo = patientInfoData.bedNo;
    const ward2 = ward + "-" + roomNo + "-"+ bedNo;
    const id = patientInfoData.id;
    const wardName = patientInfoData.wardName;
    const wardId = patientInfoData.wardId;
    const qr1 = 'I-' + wardId + '-' + roomNo + '-' + bedNo;
    let caution1;
    let caution2;
    let caution3;
    let caution4;
    let caution5;
    let caution6;
    let cautions;
    if (patientInfoData.caution1A == 'Y') {
        caution1 = 'caution1A.png';
        cautions = 'caution1A.png';
    } else if (patientInfoData.caution1B == 'Y') {
        caution1 = 'caution1B.png';
        cautions = 'caution1B.png';
    } else {
        caution1 = 'undefined';
        cautions = 'undefined';
    }

    if (patientInfoData.caution2A == 'Y') {
        caution2 = 'caution2A.png';
        cautions += ',caution2A.png';
    } else if (patientInfoData.caution2B == 'Y') {
        caution2 = 'caution2B.png';
        cautions += ',caution2B.png';
    } else {
        caution2 = 'undefined';
        cautions += ',undefined';
    }

    if (patientInfoData.caution3 == 'Y') {
        caution3 = 'caution3A.png';
        cautions += ',caution3.png';
    } else {
        caution3 = 'undefined';
        cautions += ',undefined';
    }

    if (patientInfoData.caution4 == 'Y') {
        caution4 = 'caution4.png';
        cautions += ',caution4.png';
    } else {
        caution4 = 'undefined';
        cautions += ',undefined';
    }

    if (patientInfoData.caution5 == 'Y') {
        caution5 = 'caution5.png';
        cautions += ',caution5.png';
    } else {
        caution5 = 'undefined';
        cautions += ',undefined';
    }

    if (patientInfoData.caution6A == 'Y') {
        caution6 = 'caution6A.png';
        cautions += ',caution6A.png';
    } else if (patientInfoData.caution6B == 'Y') {
        caution6 = 'caution6B.png';
        cautions += ',caution6B.png';
    } else {
        caution6 = 'undefined';
        cautions += ',undefined';
    }

    let layoutDataKey = Object.keys(wardLayoutData);
    let MCIPatientInfoData = {};

    for (let i = 0; i < layoutDataKey.length; i++) {
        if (eval(layoutDataKey[i])) {
            MCIPatientInfoData[layoutDataKey[i]] = eval(layoutDataKey[i]);
        } else {
            MCIPatientInfoData[layoutDataKey[i]] = '';
        }

    }

    
    await UpdateMCIInfo(MCIPatientInfoData,deviceId);
}

//  Mapping 이 완료된 Data를 다시 DB에 저장하는 함수
async function UpdateMCIInfo(MCIPatientInfoData,id) {
    const contents = JSON.stringify({data:MCIPatientInfoData});
    const data = Base64Encode(contents);

    const params = {
        id:id,
        data: data,
    };

    let result = await SyncToMCI.updateData(params);   
     

    
}


//  DB에 저장되어있는 Layout과 Data정보를 통해 이미지 만들어 적용하는 함수
async function requestDeviceDataApply(id) {
    
    const params = {
        id: id
    }
    
    let result = await SyncToMCI.applyData(params); 
    result = JSON.parse(JSON.stringify(result.body[0]));
    // 10초마다 ( AIMS 서버에서 이미지 받을 때 과부하 막기위함)
    await Delay(1000*10,result.name);
    
    
}

// DID에 MCI 정보 넘겨주는 전체 함수
async function StartDIDData (elbdNo,patients) {
    const did_values = DIDInputData(elbdNo,patients);

    const sendData = mci.createJsonData(did_values);
    var socket = new net.Socket();
    socket.connect({host:DIDsocket_host, port:DIDsocket_port}, async function() {
        //console.log('Client connected - %s : %d', socket.remoteAddress, socket.remotePort);
        
        if (sendData != null) {
            await sendRequest(socket, sendData);
    
        } else {
            socket.end();
            socket.destroy();
            //console.log("socket closed");
        }
        
    });
    
    socket.on('data', function(data) {
        //console.log('Received data size : %d', socket.bytesRead);
        console.log('DATA : %s', data);
    
    });
    
    socket.on('close', function() {
        //console.log('Client closed.');
    });
}

// MCI정보 DID에 맞게 Mapping 하는 함수
async function MappingMCIDataForDID(patientInfoData) {
    const patient = {
    	ptntNm: patientInfoData.firstName,	   // 환자 이름
		btdt: "",
		awtrDvsnCd: "",
		coloCd: "",
		ptntExmnNornSno: 0,
		doctorNm1: patientInfoData.doctorName1, // 지정의 이름
		doctorNm2: patientInfoData.doctorName2, // 주치의 이름
		ptntId: patientInfoData.id	// 환자번호
    }
    return patient;
}

//  Mapping된 정보를 DIDInputDATA로 바꾸는 함수
function DIDInputData(elbdNo,patients) {
	// JU START 2020-02-20
	let input;
	if(patients != null) {
		input = {
			evntTypCd: 'L',
			elbdNo: elbdNo,
			exrmNo: '',
			exrmNm: '',
			elbdMesgCtn: '',
			waitYn: '',
			apntCnt: 0,
			mddrNm: '',
			waitRsrvMi: 0,
			elbdDereCtn: '',
			clotResnCd: '',
			asnuIdNm: '',
			asgnNm: '',
			afiReptNtm: patients.length,
			mns_dispush_000: patients,
			afiReptNtm01: 0,
			mns_dispush_001: []
		};
	} else {
		input = {
			evntTypCd: 'L',
			elbdNo: elbdNo,
			exrmNo: '',
			exrmNm: '',
			elbdMesgCtn: '',
			waitYn: '',
			apntCnt: 0,
			mddrNm: '',
			waitRsrvMi: 0,
			elbdDereCtn: '',
			clotResnCd: '',
			asnuIdNm: '',
			asgnNm: '',
			afiReptNtm: 0,
			mns_dispush_000: [],
			afiReptNtm01: 0,
			mns_dispush_001: []
		};
	}
	/*
    let input = {
        evntTypCd: 'L',
        elbdNo: elbdNo,
        exrmNo: '',
        exrmNm: '',
        elbdMesgCtn: '',
        waitYn: '',
        apntCnt: 0,
        mddrNm: '',
        waitRsrvMi: 0,
        elbdDereCtn: '',
        clotResnCd: '',
        asnuIdNm: '',
        asgnNm: '',
        afiReptNtm: patients.length,
        mns_dispush_000: patients,
        afiReptNtm01: 0,
        mns_dispush_001: []
    };
	*/
	// JU END 2020-02-20
    
    let values = {
        input: input,
        interfaceId: 'uns_didpush_m01',
        requestId: 'mnc_dispush_000'
    };
    
    return values;
}
// DID에 정보 Send하는 함수
const sendRequest = async function(socket, data) {
    
	socket.write(data, 'utf8', async function() {
		console.log('Sent data size : %d', data.length);
        
        await socket.end();
        await socket.destroy();
        console.log("socket closed");
	});
	
};




// 배터리 상태 BAD인 ESL 정보 갖고오는 함수

async function getBadBatteryInfo(ip) {
    logger.debug('getBadBatteryInfo 들어옴');
    ajax({
        url:ip+'/labels/battery?stationCode=DEFAULT_STATION_CODE&status=BAD',
        crossDomain:true,
        dataType:"jsonp",
        headers:{
            "Accept": "application/json",
            "Content-Type": "application/json;charset=UTF-8",
            "Access-Control-Allow-Origin": "*",
        }
    },async function(err,res,body,destpath) {
        if(body) {
            const data = JSON.parse(body);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      
            for(let i = 0 ; i <data.length ; i ++) {
                await updateBadBattery(data[i].labelCode);
                console.log(data[i].labelCode +"`s battery is [BAD]");
            }
        }
    })
    return new Promise (resolve => {
        resolve();
    })


}

//  배터리 상태 GOOD인 ESL 정보 갖고오는 함수
async function getGoodBatteryInfo(ip) {
    logger.debug('getGoodBatteryInfo 들어옴');
    ajax({
        url:ip+'/labels/battery?stationCode=DEFAULT_STATION_CODE&status=GOOD',
        crossDomain:true,
        dataType:"jsonp",
        headers:{
            "Accept": "application/json",
            "Content-Type": "application/json;charset=UTF-8",
            "Access-Control-Allow-Origin": "*",
        }
    },async function(err,res,body,destpath) {
        const data = JSON.parse(body);
        if(data) {
            return new Promise(async resolve => { 
                let results;
                for(let i = 0 ; i <data.length ; i ++) {
                    results +=await updateGoodBattery(data[i].labelCode);
                    console.log(data[i].labelCode +"`s battery is [GOOD]");
                };
                resolve(results);
            })
        }
    })
    return new Promise (resolve => {
        resolve();
    })
}

//  배터리 상태 GOOD인 ESL DB 정보 업데이트
async function updateGoodBattery(code) {
    return new Promise(async resolve => {
        const params = {
            labelcode:code
        };
        
        const result = await SyncToMCI.batteryUpdate(params);
        
        resolve(result);
    })
}

//  배터리 상태 BAD인 ESL  DB 정보 업데이트
async function updateBadBattery(code) {
    const params = {
        labelcode:code
    };

    const result = await SyncToMCI.batteryUpdate2(params);
    if(result) {
        logger.log(code + '`s battery is BAD');
    }
    new Promise (resolve => {
        resolve();
    })
}

// 배터리 함수들 순차적으로 실행하는 함수
const batteryInfoUpdate = async() => {
    return new Promise(async resolve => {
        await getBadBatteryInfo(aims_ip) //  Good battery 정보 받아서 update
        .then(await getGoodBatteryInfo(aims_ip))
    })
}

// ESL 서버에서 success 한 단말들의 시간 조회
const RequestESLDate = () => {
    //logger.debug('RequestESLDate 들어옴');
    ajax({
        url:aims_ip+'/labels?stationCode=DEFAULT_STATION_CODE&status=SUCCESS',
        crossDomain:true,
        headers:{
            "Accept": "application/json",
        }
    },async function(err,res,body,destpath) {

        if(body) {
            const data = JSON.parse(body);
            
            for(let i = 0 ; i < data.length ; i ++ ) {
                let params = {
                    labelcode:data[i].labelCode,
                    date:data[i].lastModifiedDate.split('T')[0]+' '+data[i].lastModifiedDate.split('T')[1].split('.')[0]
                }
                let result =await SyncToMCI.UpdateESLDate(params);
                if(result.body.affectedRows > 0) {
                    console.log('NEW ESL-Image is updated on ['+data[i].labelCode+']')
                } 
            }
        }
        
    })
}

/* HashMap 객체 생성 */
var HashMap = function(){
    this.map = new Object();
}
 
HashMap.prototype = {
    /* key, value 값으로 구성된 데이터를 추가 */
    put: function (key, value) {
        this.map[key] = value;
    },
    /* 지정한 key값의 value값 반환 */
    get: function (key) {
        return this.map[key];
    },
    /* 구성된 key 값 존재여부 반환 */
    containsKey: function (key) {
        return key in this.map;
    },
    /* 구성된 value 값 존재여부 반환 */
    containsValue: function (value) {
        for (var prop in this.map) {
            if (this.map[prop] == value) {
                return true;
            }
        }
        return false;
    },
    /* 구성된 데이터 초기화 */
    clear: function () {
        for (var prop in this.map) {
            delete this.map[prop];
        }
    },
    /*  key에 해당하는 데이터 삭제 */
    remove: function (key) {
        delete this.map[key];
    },
    /* 배열로 key 반환 */
    keys: function () {
        var arKey = new Array();
        for (var prop in this.map) {
            arKey.push(prop);
        }
        return arKey;
    },
    /* 배열로 value 반환 */
    values: function () {
        var arVal = new Array();
        for (var prop in this.map) {
            arVal.push(this.map[prop]);
        }
        return arVal;
    },
    /* Map에 구성된 개수 반환 */
    size: function () {
        var count = 0;
        for (var prop in this.map) {
            count++;
        }
        return count;
    }
}



// ======================================================================================================================================================

// 메인함수 시작
Main();

// 베터리 정보 갖고와서 업데이트 해주는 주기 함수
setInterval(batteryInfoUpdate,battery_interval);

// MCI 정보 갖고와서 업데이트 해주는 주기 함수 
setInterval(mciPatientInfo,mci_interval);  



// BY END 2020-01-14
