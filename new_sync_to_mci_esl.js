'use strict';


const axios = require('axios');

const config = require('./config/config');

// // logger
const logger = require('./util/logger');


const base64js = require('base64-js');
const sysUtil = require('util');
// ESL controller
const sync_to_mci_controller = require('./controllers/sync_to_esl-controller');

const net = require('net');

let MCI_SERVER_URL = 'http://localhost:7001';
let wardId;
let battery_interval = config.interval.battery;
let mci_interval = config.interval.mci;
//let mci_interval = 100000; 

const baroboardESL = new sync_to_mci_controller ();
const sync_module = require('./baroboard_sync_module');
const BaroboardSyncModule = new sync_module();

let patientHashMapList;
let wardPatientHashMap;
let sync_time;

const main = async () => {
   
    patientHashMapList = [];
    
    // 처음돌릴떄만 적용
    sync_time = 0;
    while(sync_time != 2) {
        await startESLSync();
        await wait(mci_interval);
    }
}


const startESLSync = async() => {
    // STEP 1. ESL 적용 중인 병동 데이터 갖고오기 ()
    // wardList <-- ESL 적용 병동 리스트.
    // wardPatientInfo_mci <--  MCI에서 받아 온 해당 병동의 환자 리스트.
    
    const wardList = await baroboardESL.searchESLWard();
    let wardPatientInfo_mci;
    if( sync_time == 0) {
        for(let i in wardList) {
            patientHashMapList[wardList[i].name] = {};
        }
        
    }
    // STEP 2. 해당 병동 FOR문으로 환자데이터 갖고오기
    for (let i = 0 ; i <wardList.length ; i ++) {
		let bedInfo =[];
        logger.info("["+wardList[i].id+"//"+wardList[i].name+"] start.");
		try {
			wardPatientInfo_mci = await axios({
				method: 'get',
				url: MCI_SERVER_URL + '/mci-test/patient-list?wardId=' + wardList[i].id,
				responseType: 'json'
			}).then (function (response) {
				return response.data.data.body;
			}).catch(error => {
				console.log(error.response)
			});
			// keys <-- 해당 병동의 병상 name ex)['05W-54-01','05W-54-02','05W-54-03','05W-54-01']
			
			// STEP 2-1. 해당 병동 Device 목록 갖고오기
			wardPatientHashMap = new HashMap();
			if (sync_time == 0) {
				const deviceList = await baroboardESL.getDeviceInThisWard(wardList[i].id);
				for (let k in deviceList) {
					bedInfo.push(deviceList[k].name);
					wardPatientHashMap.put(deviceList[k].name,noDataPatient(deviceList[k].name,0));
				}
			}
			else {
				wardPatientHashMap = patientHashMapList[wardList[i].name];
			}
			

			

			// STEP 3. 환자데이터 HASHMAP에 보관
			// mciInfo <-- key값 병상위치 / value값 mci 데이터
			let mciInfo = new HashMap();
			let keys = new Array();
			for(let j = 0; j <wardPatientInfo_mci.length; j ++ ) {
				const key = wardPatientInfo_mci[j].ward+"-"+wardPatientInfo_mci[j].roomNo+"-"+wardPatientInfo_mci[j].bedNo;
				keys.push(key);

				// BY START 2022-09-19
				// 해당요일과 현재 그려진 이미지의 회진시간이 다를 경우 (MCI에서 요일별 회진시간을 통으로 받기때문) 회진시간 변경을 위해서
				const roundingToday = roundingCheck(wardPatientInfo_mci[j]);
				wardPatientInfo_mci[j]['roundingToday'] = roundingToday;
				// BY END 2022-09-19
				mciInfo.put(key,wardPatientInfo_mci[j]);
			}

			//  환자가 나가서 데이터가 안오는 병상 확인하기
			for (let k in wardPatientHashMap.keys()) {
				if (!mciInfo.containsKey(wardPatientHashMap.keys()[k])) {
					mciInfo.put(wardPatientHashMap.keys()[k],noDataPatient(wardPatientHashMap.keys()[k]),1);
					keys.push(wardPatientHashMap.keys()[k]);
				}
			}
			// STEP 4. 해당 병동 wardPatientHashMap(계속 갖고있는 해쉬맵) 와 mciInfo(매번 받어오는 해쉬맵) 데이터 비교
			for(let k in keys) {
				if (wardPatientHashMap.get(keys[k])){
					try
					{
						if(Object.entries(wardPatientHashMap.get(keys[k])).toString() === Object.entries(mciInfo.get(keys[k])).toString()) {
						mciInfo.remove(keys[k]);
					}
					}
					catch (err)
					{

					}
					
				}
				

			}
			logger.info("[ Location: "+wardList[i].name +" || total Device : " +wardPatientHashMap.size() +" || diffrent DATA count : "+ mciInfo.size() + " ]" )   

			//  STEP 5-1. DB  디바이스 데이터 초기화
			const difBed = mciInfo.keys();
			// STEP 5-2 신규 데이터(MCI정보) ESL 데이터로 가공하기 
			for (let k in difBed) {
				
				// 달라진 MCI는 유지중인 hashmap에 넣기
				wardPatientHashMap.put(difBed[k],mciInfo.get(difBed[k]));
				// data_yn <-- 환자와 베드 번호가 매칭이안되는경우 그 환자는 드랍 (오류 발생떄문)
				
				const data_yn = await BaroboardSyncModule.resetData(difBed[k]);
				if (data_yn == 'y') {
					const params = {
						wardInfo: difBed[k]
					}
                    let code;
					await BaroboardSyncModule.GetWardLayoutData(params,mciInfo.get(difBed[k]));
					// STEP 6. 해당 단말기에 이미지 전송
					try{
						let result = await BaroboardSyncModule.requestDeviceDataApply(difBed[k]);
                        result = JSON.parse(result);
                        code = result.returnCode.split(' ')[0];
						if(result.returnCode.includes('200')) {
							logger.info("["+difBed[k]+"] requestSuccess");
						}
						else {
							logger.error("에러 발생");
                            sendErrTalk(difBed[k],result);
							wardPatientHashMap.put(difBed[k],noDataPatient(difBed[k]),1);
                            logger.error(wardPatientHashMap.get(difBed[k]));
						}
					}
					catch (err){
						logger.error(err);
						wardPatientHashMap.put(difBed[k],noDataPatient(difBed[k]),1);
					}
					

					if (sync_time != 0) {
						const response = await baroboardESL.saveStats(difBed[k],code);
						if (response.affectedRows == 1) {
							logger.info("["+difBed[k]+"] save stats");
						}
					}
					
				}   
				else {
					logger.debug("["+ difBed[k] +"] 와 name이 맞는 ESL 단말기가 없음");
				}
			}
			if (difBed.length <= 0) {
				console.log("=============== ["+ wardList[i].name +"] 변경사항 없음");
				console.log("==============================================================================")
			}
			patientHashMapList[wardList[i].name] = wardPatientHashMap;
			// STEP 7. HASHMAP 비우기
			mciInfo.clear();
		}
		catch (err) {
			logger.debug(err)
		}
	}
    // STEP 8. ESL UPDATE 정보 DB에 저장
    await BaroboardSyncModule.RequestESLDate();
    sync_time = 1;
	
    
}

// setTimeout 함수는 Promise를 반환하지 않아 Promise를 반환하게 직접 입력
const wait = (timeToDelay) => new Promise((resolve) => setTimeout(resolve, timeToDelay))


async function timeSet ()  {
    const now = new Date(); // 현재 시간
    const utcNow = now.getTime() + (now.getTimezoneOffset() * 60 * 1000); // 현재 시간을 utc로 변환한 밀리세컨드값
    const koreaTimeDiff = 9 * 60 * 60 * 1000; // 한국 시간은 UTC보다 9시간 빠름(9시간의 밀리세컨드 표현)
    let koreaNow = new Date(utcNow + koreaTimeDiff);
    let year = koreaNow.getFullYear();
    let month = koreaNow.getMonth()+1;
    let day = koreaNow.getDate();
    if (day < 10 ) {
        day = "0"+day;
    }
    let hour = koreaNow.getHours();
    if(hour < 10) {
        hour = "0"+hour;
    }
    let minutes = koreaNow.getMinutes();
    if (minutes < 10) {
        minutes = "0" +minutes;
    }
    let seconds = koreaNow.getSeconds();
    if (seconds < 10) {
        seconds = "0" +seconds;
    }
    const date = year+""+month+""+day+""+hour+""+minutes+""+seconds;
    return date;
} 

function noDataPatient (wardName,k) {
    const noData = {
            firstName: '',
            nameWarning:'',
            gender: '',
            age: '',
            birthDate: '',  
            dept: '',
            doctorName1: '',
            doctorName2: '',
            caution3: '',
            caution4: '',
            caution2B: '',
            caution2A: '',
            caution1A: '',
            caution1B: '',
            caution5: '', 
            caution6A: '',
            caution6B: '',
            npoYn: '',
            npoCtn: '',
            npoDscrMemoCtn: '',
            ptntInftCtn: '',
            treatDate: '',
            leavingDate: '',
            roundingSun: '',
            roundingMon: '',
            roundingTue: '',
            roundingWed: '',
            roundingThu: '',
            roundingFri:'',
            roundingSat:'',
            ward: wardName.split('-')[0],
            roomNo:wardName.split('-')[1],
            bedNo: wardName.split('-')[2],
            id: '',
            wardName:wardName,
            wardId:''
    }
    if (k == 0) {
        noData.firstName = '0';
        // 처음에 빈값 받는 디바이스도 한번 이미지 생성을 하게 해주기 위함
    }

    return noData
}

function roundingCheck(data) {
	const today = new Date().toString().slice(0,3);
	const roundingToday = 'rounding'+today;
	return data[roundingToday]
}

async function sendErrTalk(ward,result) {
    const params = {
        msg: "["+ ward +"]"+ result.returnMsg,
        service: "ESL_UNS"
    }
    await axios({
        method: 'post',
        url: 'http://119.6.3.91:40019/smsmms/alert_sender',
        responseType: 'json'
    }).then (function (response) {
        return response.data.data.body;
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


main();
