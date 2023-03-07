'use strict'

const ajax = require('ajax-request');
const config = require('./config/config');
const base64js = require('base64-js');
const sysUtil = require('util');
const sync_to_esl = require('./controllers/sync_to_esl-controller');
const logger = require('./util/logger');
const baroboardESL = new sync_to_esl();

const aims_info = config.external[2];
let aims_ip = 'http://'+aims_info.host + ':' +aims_info.port;

var check_eng = /[a-zA-Z]/; 
var check_spc = /[~!@#$%^&*()_+|<>?:{}]/; 
var check_kor = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/;

// Base64인코딩
function Base64Encode(str, encoding = 'utf-8') {
    var bytes = new (sysUtil.TextEncoder || sysUtil.TextEncoderLite)(encoding).encode(str);        
    return base64js.fromByteArray(bytes);
}

// Base64디코딩
function Base64Decode(str, encoding = 'utf-8') {
    if(str !==null) {
        var bytes = base64js.toByteArray(str);
        return new (sysUtil.TextDecoder || sysUtil.TextDecoderLite)(encoding).decode(bytes);
    }
}
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


// Layout에 MCI 데이터를 Mapping 하는 함수 Name:ESL_LAYOUT01 2020-03-03 Version
async function V3_MappingMCIData(wardLayoutData, patientInfoData,deviceId,layout_id) {
    let leftdot1= "N"; let leftdot2= "N"; let leftdot3= "N"; let rightdot1= "Y"; let rightdot2= "Y";
    const firstName = patientInfoData.firstName;  
    let gender;
    if (patientInfoData.gender == 'M') {
        gender = '남'
    } else if (patientInfoData.gender == 'F') {
        gender = '여'
    }
    else {
        gender = ''
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
    let cautions=[];
    let information;
    

    // information image 조정
    information = ['v3_information.png'];
    if (patientInfoData.caution1A == 'Y') {
        cautions.push('v3_caution1A.png');
    } else if (patientInfoData.caution1B == 'Y') {
        cautions.push('v3_caution1B.png');
    } 

    if (patientInfoData.caution2A == 'Y') {
        cautions.push('v3_caution2A.png');
    } else if (patientInfoData.caution2B == 'Y') {
        cautions.push('v3_caution2B.png');
    } 

    if (patientInfoData.caution3 == 'Y') {
        cautions.push('v3_caution3.png');
    } 

    if (patientInfoData.caution4 == 'Y') {
        cautions.push('v3_caution4.png');
    } 

    if (patientInfoData.caution5 == 'Y') {
        cautions.push('v3_caution5.png');
    } 

    if (patientInfoData.caution6A == 'Y') {
        cautions.push('v3_caution6A.png');
    } else if (patientInfoData.caution6B == 'Y') {
        cautions.push('v3_caution6B.png');
    } 
    
    if(cautions[0]) {
        caution1 = cautions[0]
    }
    else {
        caution1 = 'undefined';
    }
    if(cautions[1]) {
        caution2 = cautions[1]
    }
    else {
        caution2 = 'undefined';
    }
    if(cautions[2]) {
        caution3 = cautions[2]
    }
    else {
        caution3 = 'undefined';
    }
    if(cautions[3]) {
        caution4 = cautions[3]
    }
    else {
        caution4 = 'undefined';
    }
    if(cautions[4]) {
        caution5 = cautions[4]
    }
    else {
        caution5 = 'undefined';
    }
    if(cautions[5]) {
        caution6 = cautions[5]
    }
    else {
        caution6 = 'undefined';
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

    
    await SyncEslModule.UpdateMCIInfo(MCIPatientInfoData,deviceId);
}

// Layout에 MCI 데이터를 Mapping 하는 함수 Name:ESL_LAYOUT02 2020-10-26 Version
async function V4_MappingMCIData(wardLayoutData, patientInfoData,deviceId,layout_id) {
    let leftdot1= "N"; let leftdot2= "N"; let leftdot3= "N"; let rightdot1= "Y"; let rightdot2= "Y";
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

    let leavingDate; 
    if (!patientInfoData.leavingDate && patientInfoData.treatDate) {
        leavingDate = "       미정"
    }
    else {
        leavingDate = patientInfoData.leavingDate;
        
    }
 
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
            monRoundingTime2 =  convertTime(roundingTimeStr[1]);
        }
    }
    if(roundingTue) {
        let roundingTimeStr = roundingTue.split('/');
        tueRoundingTime1 =' ' +  roundingTimeStr[0];
        if(roundingTimeStr[1]) {
            tueRoundingTime2 = convertTime(roundingTimeStr[1]);
        }
    }
    if(roundingWed) {
        let roundingTimeStr = roundingWed.split('/');
        wedRoundingTime1 =' ' +  roundingTimeStr[0];
        if(roundingTimeStr[1]) {
            wedRoundingTime2 = convertTime(roundingTimeStr[1]);
        }
    }
    if(roundingThu) {
        let roundingTimeStr = roundingThu.split('/');
        thuRoundingTime1 =' ' +  roundingTimeStr[0];
        if(roundingTimeStr[1]) {
            thuRoundingTime2 = convertTime(roundingTimeStr[1]);
        }
    }
    if(roundingFri) {
        let roundingTimeStr = roundingFri.split('/');
        friRoundingTime1 =' ' +  roundingTimeStr[0];
        if(roundingTimeStr[1]) {
            friRoundingTime2 = convertTime(roundingTimeStr[1]);
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
    let cautions =[];
    let information; 

    // information image 조정
    information = ['v4_information.png'];
    if (patientInfoData.caution1A == 'Y') {
        cautions.push('v4_caution1A.png');
    } else if (patientInfoData.caution1B == 'Y') {
        cautions.push('v4_caution1B.png');
    } 

    if (patientInfoData.caution2A == 'Y') {
        cautions.push('v4_caution2A.png');
    } else if (patientInfoData.caution2B == 'Y') {
        cautions.push('v4_caution2B.png');
    } 

    if (patientInfoData.caution3 == 'Y') {
        cautions.push('v4_caution3.png');
    } 

    if (patientInfoData.caution4 == 'Y') {
        cautions.push('v4_caution4.png');
    } 

    if (patientInfoData.caution5 == 'Y') {
        cautions.push('v4_caution5.png');
    } 

    if (patientInfoData.caution6A == 'Y') {
        cautions.push('v4_caution6A.png');
    } else if (patientInfoData.caution6B == 'Y') {
        cautions.push('v4_caution6B.png');
    } 
    
    if(cautions[0]) {
        caution1 = cautions[0]
    }
    else {
        caution1 = 'undefined';
    }
    if(cautions[1]) {
        caution2 = cautions[1]
    }
    else {
        caution2 = 'undefined';
    }
    if(cautions[2]) {
        caution3 = cautions[2]
    }
    else {
        caution3 = 'undefined';
    }
    if(cautions[3]) {
        caution4 = cautions[3]
    }
    else {
        caution4 = 'undefined';
    }
    if(cautions[4]) {
        caution5 = cautions[4]
    }
    else {
        caution5 = 'undefined';
    }
    if(cautions[5]) {
        caution6 = cautions[5]
    }
    else {
        caution6 = 'undefined';
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
    await SyncEslModule.UpdateMCIInfo(MCIPatientInfoData,deviceId);
    
}

// Layout에 MCI 데이터를 Mapping 하는 함수 Name:ESL_LAYOUT03 2021-05-07 Version
// Layout에 MCI 데이터를 Mapping 하는 함수 Name:ESL_LAYOUT04 2022-02-07 Version
async function V5_MappingMCIData(wardLayoutData, patientInfoData,deviceId,layout_id) {
    
    const firstName = patientInfoData.firstName;  
    let gender;
    if (patientInfoData.gender == 'M') {
        gender = '남'
    } else if (patientInfoData.gender == 'F') {
        gender = '여'
    }
    else {
        gender = ' ';
    }
    let nameWarning = 'N';
    if (patientInfoData.nameWarning) {
        nameWarning = patientInfoData.nameWarning;
    } 
    let age = patientInfoData.age
    let genderAge = gender + '/' + age ;
    const birthDate = patientInfoData.birthDate;
    const dept = patientInfoData.dept;
    const doctorName1 = patientInfoData.doctorName1;
    const doctorName2 = patientInfoData.doctorName2;
    // memo와 roundingdata는 수정 필요
    
    const treatDate = patientInfoData.treatDate;

    let leavingDate; 
    if (!patientInfoData.leavingDate && patientInfoData.treatDate) {
        leavingDate = "       미정"
    }
    else {
        leavingDate = patientInfoData.leavingDate;
        
    }

    
    let roundingTime1; let roundingTime2; 
    let cautionMemo1; 
    let cautionMemo2;
    let cautionMemo3;
    let cautionMemos = [];
    let leftdot1= "N"; let leftdot2= "N"; let leftdot3= "N"; let rightdot1= "Y"; let rightdot2= "Y";   



    //  V5 형 회진시간 안내
    //  요일별일 아닌 당일 회진시간만 표시
    // BY START 2021.08.12
    let roundingTime;
    const curr = new Date();  
    const utc = 
      curr.getTime() + 
      (curr.getTimezoneOffset() * 60 * 1000);

    // 3. UTC to KST (UTC + 9시간)
    const KR_TIME_DIFF = 9 * 60 * 60 * 1000;
    const kr_curr = new Date(utc + (KR_TIME_DIFF)); // 한국 표준시간 구하기
    const todayNum = kr_curr.getDay();
    
    if (todayNum == 0) {
        roundingTime = patientInfoData.roundingSun; 
    }
    else if (todayNum == 1) {
        roundingTime = patientInfoData.roundingMon;
    }
    else if (todayNum == 2) {
        roundingTime = patientInfoData.roundingTue;
    }
    else if (todayNum == 3) {
        roundingTime = patientInfoData.roundingWed;
    }
    else if (todayNum == 4) {
        roundingTime = patientInfoData.roundingThu;
    }
    else if (todayNum == 5) {
        roundingTime = patientInfoData.roundingFri;
    }
    else if (todayNum == 6) {
        roundingTime = patientInfoData.roundingSat;
    }
    
    if(roundingTime) {
        let roundingTimeStr = roundingTime.split('/');
        // 첫번째 회진 시간 포멧 맞추기
        roundingTime1 =roundingTimeStr[0];
        let roundingTime1Str = roundingTime1.split('~');
        if(roundingTime1Str[0]) {
            if(roundingTime1Str[0].charAt(0) == '0') {
                roundingTime1Str[0] = roundingTime1Str[0].substring(1);
            }
        }
        if (roundingTime1Str[1]) {
            if(roundingTime1Str[1].charAt(0) == '0') {
                roundingTime1Str[1] = roundingTime1Str[1].substring(1);
            }
            roundingTime1 = roundingTime1Str[0] + " - " + roundingTime1Str[1];
        }
        




        // 두번째 회진 시간 포멧 맞추기
        if(roundingTimeStr.length > 1) {
            roundingTime2 = roundingTimeStr[1].substring(1);
            let roundingTime2Str = roundingTime2.split('~');
            if(roundingTime2Str[0].charAt(0) == '0') {
                roundingTime2Str[0] = roundingTime2Str[0].substring(1);
            }
            if(roundingTime2Str[1].charAt(0) == '0') {
                roundingTime2Str[1] = roundingTime2Str[1].substring(1);
            }
            roundingTime2 = roundingTime2Str[0] + " - " + roundingTime2Str[1];
            
        }
        else {
            rightdot2 = "N";
        }

        // 시간 표시 옆 DOT 표시 여부 체크
        if (roundingTime1.length < 3) {
            roundingTime1 = roundingTime2;
            rightdot2 = "N";
            roundingTime2= " ";
            if(roundingTime1.length <3) {
                rightdot1 = "N"
            }
        }

    }
    else {
        rightdot1 = "N";
        rightdot2 = "N";
    }
    // BY END 2021.08.12
    
    if( patientInfoData.npoYn == "Y") { // 금식여부 체크 Y인 경우
        cautionMemo1 = patientInfoData.npoCtn;
    }
    else { //금식 여부 체크 N인 경우
        cautionMemo1 =null;
    }
    
    if (patientInfoData.ptntInftCtn) {
        var memo2 = patientInfoData.ptntInftCtn.split("/");
        if (memo2[2]) {
            cautionMemo2 = "양팔 채혈금지";
            cautionMemo3 = memo2[2];
        }
        else if (!memo2[2] && memo2[1]) {
            cautionMemo2 = memo2[0];
            cautionMemo3 = memo2[1];
        }
        else if (!memo2[2] && !memo2[1]&&memo2[0]) {
            cautionMemo2 = memo2[0];
            cautionMemo3 = null;
        }
        else {
            cautionMemo2 = null;
            cautionMemo3 = null;
        }

    }    
    //  V5식 Memo 변환 
    // BY START 2021.08.12
    if(cautionMemo1) {
        cautionMemos.push(cautionMemo1);
    }
    if(cautionMemo2) {
        cautionMemos.push(cautionMemo2);
    }
    if(cautionMemo3) {
        cautionMemos.push(cautionMemo3);
    }

    if(cautionMemos[0]) {
        cautionMemo1 = cautionMemos[0];
        leftdot1 = "Y";
    }
    if(cautionMemos[1]) {
        cautionMemo2 = cautionMemos[1];
        leftdot2 ="Y";
    }
    else {
        cautionMemo2 = null;
        
    }

    if(cautionMemos[2] != undefined) {
        cautionMemo3 = cautionMemos[2];
        leftdot3 ="Y";
    }
    else {
        cautionMemo3 = null;
    }
    // BY END 2021.08.12

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
    let cautions = [];
    if (patientInfoData.caution1A == 'Y') {
        caution1 = 'v5_caution1A.png';
        cautions[0] = 'v5_caution1A.png';
    } else if (patientInfoData.caution1B == 'Y') {
        caution1 = 'v5_caution1B.png';
        cautions[0] = 'v5_caution1B.png';
    } else {
        caution1 = 'v5_undefined.png';
        cautions[0] = 'v5_undefined.png';
    }

    if (patientInfoData.caution2A == 'Y') {
        caution2 = 'v5_caution2A.png';
        cautions[1] = 'v5_caution2A.png';
    } else if (patientInfoData.caution2B == 'Y') {
        caution2 = 'v5_caution2B.png';
        cautions[1] = 'v5_caution2B.png';
    } else {
        caution2 = 'v5_undefined.png';
        cautions[1] = 'v5_undefined.png';
    }

    if (patientInfoData.caution3 == 'Y') {
        caution3 = 'v5_caution3A.png';
        cautions[2] = 'v5_caution3.png';
    } else {
        caution3 = 'v5_undefined.png';
        cautions[2] = 'v5_undefined.png';
    }

    if (patientInfoData.caution4 == 'Y') {
        caution4 = 'v5_caution4.png';
        cautions[3] = 'v5_caution4.png';
    } else {
        caution4 = 'v5_undefined.png';
        cautions[3] = 'v5_undefined.png';
    }

    if (patientInfoData.caution5 == 'Y') {
        caution5 = 'v5_caution5.png';
        cautions[4] = 'v5_caution5.png';
    } else {
        caution5 = 'v5_undefined.png';
        cautions[4] = 'v5_undefined.png';
    }

    if (patientInfoData.caution6A == 'Y') {
        caution6 = 'v5_caution6A.png';
        cautions[5] = 'v5_caution6A.png';
    } else if (patientInfoData.caution6B == 'Y') {
        caution6 = 'v5_caution6B.png';
        cautions[5] = 'v5_caution6B.png';
    } else {
        caution6 = 'v5_undefined.png';
        cautions[5] = 'v5_undefined.png';
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
    MCIPatientInfoData["leftdot1"]=leftdot1;
    MCIPatientInfoData["leftdot2"]=leftdot2;
    MCIPatientInfoData["leftdot3"]=leftdot3;
    MCIPatientInfoData["rightdot1"]=rightdot1;
    MCIPatientInfoData["rightdot2"]=rightdot2;
    await UpdateMCIInfo(MCIPatientInfoData,deviceId);
    
}

async function V6_MappingMCIData(wardLayoutData, patientInfoData,deviceId,layout_id,made_time) {
    
    let firstName = patientInfoData.firstName;
    if(check_kor.test(firstName)) {
        if(firstName.length>7) {
            firstName = firstName.substring(0,7);
        }
    }
    else{ 
        if(firstName.length>10) {
            firstName = firstName.substring(0,10);
        }
    }  
    let gender;
    if (patientInfoData.gender == 'M') {
        gender = '남'
    } else if (patientInfoData.gender == 'F') {
        gender = '여'
    }
    else {
        gender = ' ';
    }
    let nameWarning = 'N';
    if (patientInfoData.nameWarning) {
        nameWarning = patientInfoData.nameWarning;
    } 
    let age = patientInfoData.age
    let genderAge = gender + '/' + age ;
    const birthDate = patientInfoData.birthDate;
    const dept = patientInfoData.dept;
    const doctorName1 = patientInfoData.doctorName1;
    const doctorName2 = patientInfoData.doctorName2;
    // memo와 roundingdata는 수정 필요
    
    const treatDate = patientInfoData.treatDate;

    let leavingDate; 
    if (!patientInfoData.leavingDate && patientInfoData.treatDate) {
        leavingDate = "       미정"
    }
    else {
        leavingDate = patientInfoData.leavingDate;
        
    }

    
    let roundingTime1; let roundingTime2; 
    let cautionMemo1; 
    let cautionMemo2;
    let cautionMemo3;
    let cautionMemos = [];
    let leftdot1= "N"; let leftdot2= "N"; let leftdot3= "N"; let rightdot1= "Y"; let rightdot2= "Y";   



    //  V5 형 회진시간 안내
    //  요일별일 아닌 당일 회진시간만 표시
    // BY START 2021.08.12
    let roundingTime;
    const curr = new Date();  
    const utc = 
      curr.getTime() + 
      (curr.getTimezoneOffset() * 60 * 1000);

    // 3. UTC to KST (UTC + 9시간)
    const KR_TIME_DIFF = 9 * 60 * 60 * 1000;
    const kr_curr = new Date(utc + (KR_TIME_DIFF)); // 한국 표준시간 구하기
    const todayNum = kr_curr.getDay();
    
    if (todayNum == 0) {
        roundingTime = patientInfoData.roundingSun; 
    }
    else if (todayNum == 1) {
        roundingTime = patientInfoData.roundingMon;
    }
    else if (todayNum == 2) {
        roundingTime = patientInfoData.roundingTue;
    }
    else if (todayNum == 3) {
        roundingTime = patientInfoData.roundingWed;
    }
    else if (todayNum == 4) {
        roundingTime = patientInfoData.roundingThu;
    }
    else if (todayNum == 5) {
        roundingTime = patientInfoData.roundingFri;
    }
    else if (todayNum == 6) {
        roundingTime = patientInfoData.roundingSat;
    }
    
    if(roundingTime) {
        let roundingTimeStr = roundingTime.split('/');
        // 첫번째 회진 시간 포멧 맞추기
        roundingTime1 =roundingTimeStr[0];
        let roundingTime1Str = roundingTime1.split('~');
        if(roundingTime1Str[0]) {
            if(roundingTime1Str[0].charAt(0) == '0') {
                roundingTime1Str[0] = roundingTime1Str[0].substring(1);
            }
        }
        if (roundingTime1Str[1]) {
            if(roundingTime1Str[1].charAt(0) == '0') {
                roundingTime1Str[1] = roundingTime1Str[1].substring(1);
            }
            roundingTime1 = roundingTime1Str[0] + " - " + roundingTime1Str[1];
        }
        




        // 두번째 회진 시간 포멧 맞추기
        if(roundingTimeStr.length > 1) {
            roundingTime2 = roundingTimeStr[1].substring(1);
            let roundingTime2Str = roundingTime2.split('~');
            if(roundingTime2Str[0].charAt(0) == '0') {
                roundingTime2Str[0] = roundingTime2Str[0].substring(1);
            }
            if(roundingTime2Str[1].charAt(0) == '0') {
                roundingTime2Str[1] = roundingTime2Str[1].substring(1);
            }
            roundingTime2 = roundingTime2Str[0] + " - " + roundingTime2Str[1];
            
        }
        else {
            rightdot2 = "N";
        }

        // 시간 표시 옆 DOT 표시 여부 체크
        if (roundingTime1.length < 3) {
            roundingTime1 = roundingTime2;
            rightdot2 = "N";
            roundingTime2= " ";
            if(roundingTime1.length <3) {
                rightdot1 = "N"
            }
        }

    }
    else {
        rightdot1 = "N";
        rightdot2 = "N";
    }
    // BY END 2021.08.12
    
    if( patientInfoData.npoYn == "Y") { // 금식여부 체크 Y인 경우
        cautionMemo1 = patientInfoData.npoCtn;
    }
    else { //금식 여부 체크 N인 경우
        cautionMemo1 =null;
    }
    
    if (patientInfoData.ptntInftCtn) {
        var memo2 = patientInfoData.ptntInftCtn.split("/");
        if (memo2[2]) {
            cautionMemo2 = "양팔 채혈금지";
            cautionMemo3 = memo2[2];
        }
        else if (!memo2[2] && memo2[1]) {
            cautionMemo2 = memo2[0];
            cautionMemo3 = memo2[1];
        }
        else if (!memo2[2] && !memo2[1]&&memo2[0]) {
            cautionMemo2 = memo2[0];
            cautionMemo3 = null;
        }
        else {
            cautionMemo2 = null;
            cautionMemo3 = null;
        }

    }    
    //  V5식 Memo 변환 
    // BY START 2021.08.12
    if(cautionMemo1) {
        cautionMemos.push(cautionMemo1);
    }
    if(cautionMemo2) {
        cautionMemos.push(cautionMemo2);
    }
    if(cautionMemo3) {
        cautionMemos.push(cautionMemo3);
    }

    if(cautionMemos[0]) {
        cautionMemo1 = cautionMemos[0];
        leftdot1 = "Y";
    }
    if(cautionMemos[1]) {
        cautionMemo2 = cautionMemos[1];
        leftdot2 ="Y";
    }
    else {
        cautionMemo2 = null;
        
    }

    if(cautionMemos[2] != undefined) {
        cautionMemo3 = cautionMemos[2];
        leftdot3 ="Y";
    }
    else {
        cautionMemo3 = null;
    }
    // BY END 2021.08.12

    const ward = patientInfoData.ward;
    const roomNo = patientInfoData.roomNo;
    const bedNo = patientInfoData.bedNo;
    const ward2 = ward + "-" + roomNo + "-"+ bedNo;
    const id = patientInfoData.id;
    const wardName = patientInfoData.wardName;
    const wardId = patientInfoData.wardId;
    const qr1 = 'I-' + wardId + '-' + roomNo + '-' + bedNo;
    let time = made_time;

    let location = ward2;
    let caution1;
    let caution2;
    let caution3;
    let caution4;
    let caution5;
    let caution6;
    let cautions = [];
    if (patientInfoData.caution1A == 'Y') {
        caution1 = 'v5_caution1A.png';
        cautions[0] = 'v5_caution1A.png';
    } else if (patientInfoData.caution1B == 'Y') {
        caution1 = 'v5_caution1B.png';
        cautions[0] = 'v5_caution1B.png';
    } else {
        caution1 = 'v5_undefined.png';
        cautions[0] = 'v5_undefined.png';
    }

    if (patientInfoData.caution2A == 'Y') {
        caution2 = 'v5_caution2A.png';
        cautions[1] = 'v5_caution2A.png';
    } else if (patientInfoData.caution2B == 'Y') {
        caution2 = 'v5_caution2B.png';
        cautions[1] = 'v5_caution2B.png';
    } else {
        caution2 = 'v5_undefined.png';
        cautions[1] = 'v5_undefined.png';
    }

    if (patientInfoData.caution3 == 'Y') {
        caution3 = 'v5_caution3A.png';
        cautions[2] = 'v5_caution3.png';
    } else {
        caution3 = 'v5_undefined.png';
        cautions[2] = 'v5_undefined.png';
    }

    if (patientInfoData.caution4 == 'Y') {
        caution4 = 'v5_caution4.png';
        cautions[3] = 'v5_caution4.png';
    } else {
        caution4 = 'v5_undefined.png';
        cautions[3] = 'v5_undefined.png';
    }

    if (patientInfoData.caution5 == 'Y') {
        caution5 = 'v5_caution5.png';
        cautions[4] = 'v5_caution5.png';
    } else {
        caution5 = 'v5_undefined.png';
        cautions[4] = 'v5_undefined.png';
    }

    if (patientInfoData.caution6A == 'Y') {
        caution6 = 'v5_caution6A.png';
        cautions[5] = 'v5_caution6A.png';
    } else if (patientInfoData.caution6B == 'Y') {
        caution6 = 'v5_caution6B.png';
        cautions[5] = 'v5_caution6B.png';
    } else {
        caution6 = 'v5_undefined.png';
        cautions[5] = 'v5_undefined.png';
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
    MCIPatientInfoData["leftdot1"]=leftdot1;
    MCIPatientInfoData["leftdot2"]=leftdot2;
    MCIPatientInfoData["leftdot3"]=leftdot3;
    MCIPatientInfoData["rightdot1"]=rightdot1;
    MCIPatientInfoData["rightdot2"]=rightdot2;
    await UpdateMCIInfo(MCIPatientInfoData,deviceId);
    
}

// Layout에 MCI 데이터를 Mapping 하는 함수 Name:ESL_LAYOUT_ERversion 
// Layout에 MCI 데이터를 Mapping 하는 함수 Name:ESL_LAYOUT_ERversion 
async function V7_MappingMCIData(wardLayoutData, patientInfoData,deviceId,layout_id,made_time) {
    let firstName = patientInfoData.firstName;
    if(check_kor.test(firstName)) {
        
        if(firstName.length>5) {
            firstName = firstName.substring(0,5);
        }
    }
    else{ 
        if(firstName.length>5) {
            firstName = firstName.substring(0,5);
        }
    }  
    let gender;
    if (patientInfoData.gender == 'M') {
        gender = '남'
    } else if (patientInfoData.gender == 'F') {
        gender = '여'
    }
    else {
        gender = ''
    }
    let nameWarning = 'N';
    if (patientInfoData.nameWarning) {
        nameWarning = patientInfoData.nameWarning;
    } 
    let age = patientInfoData.age
    let genderAge = gender + '/' + age ;
    const birthDate = patientInfoData.birthDate;
    const dept = patientInfoData.dept;
    const doctorName1 = patientInfoData.doctorName1;
    const doctorName2 = patientInfoData.doctorName2;


    let cautionMemo1; 
    let cautionMemo2;
    let cautionMemo3;
    let cautionMemos = [];
    let leftdot1= "N"; let leftdot2= "N"; let leftdot3= "N";
    let rightdot1= 'N'; let rightdot2 = "N";
    
    if( patientInfoData.npoYn == "Y") { // 금식여부 체크 Y인 경우
        cautionMemo1 = patientInfoData.npoCtn;
    }
    else { //금식 여부 체크 N인 경우
        cautionMemo1 =null;
    }
    
    if (patientInfoData.ptntInftCtn) {
        var memo2 = patientInfoData.ptntInftCtn.split("/");
        if (memo2[2]) {
            cautionMemo2 = "양팔 채혈금지";
            cautionMemo3 = memo2[2];
        }
        else if (!memo2[2] && memo2[1]) {
            cautionMemo2 = memo2[0];
            cautionMemo3 = memo2[1];
        }
        else if (!memo2[2] && !memo2[1]&&memo2[0]) {
            cautionMemo2 = memo2[0];
            cautionMemo3 = null;
        }
        else {
            cautionMemo2 = null;
            cautionMemo3 = null;
        }

    }    
    //  V5식 Memo 변환 
    // BY START 2021.08.12
    if(cautionMemo1) {
        cautionMemos.push(cautionMemo1);
    }
    if(cautionMemo2) {
        cautionMemos.push(cautionMemo2);
    }
    if(cautionMemo3) {
        cautionMemos.push(cautionMemo3);
    }

    if(cautionMemos[0]) {
        cautionMemo1 = cautionMemos[0];
        leftdot1 = "Y";
    }
    if(cautionMemos[1]) {
        cautionMemo2 = cautionMemos[1];
        leftdot2 ="Y";
    }
    else {
        cautionMemo2 = null;
        
    }

    if(cautionMemos[2] != undefined) {
        cautionMemo3 = cautionMemos[2];
        leftdot3 ="Y";
    }
    else {
        cautionMemo3 = null;
    }
    // BY END 2021.08.12

    
    const ward = patientInfoData.ward;
    const roomNo = patientInfoData.roomNo;
    const bedNo = patientInfoData.bedNo;
    const ward2 = ward + "-" + roomNo + "-"+ bedNo;
    const id = patientInfoData.id;
    const wardName = patientInfoData.wardName;
    const wardId = patientInfoData.wardId;
    const qr1 = 'I-' + wardId + '-' + roomNo + '-' + bedNo;
    // V6 시간 , 위치 정보 표시
    // BY START 2022-11-09
    
    let time = made_time;
    let location = ward2;
    let caution1;
    let caution2;
    let caution3;
    let caution4;
    let caution5;
    let caution6;
    let cautions = [];
    if (patientInfoData.caution1A == 'Y') {
        caution1 = 'v5_caution1A.png';
        cautions[0] = 'v5_caution1A.png';
    } else if (patientInfoData.caution1B == 'Y') {
        caution1 = 'v5_caution1B.png';
        cautions[0] = 'v5_caution1B.png';
    } else {
        caution1 = 'v5_undefined.png';
        cautions[0] = 'v5_undefined.png';
    }

    if (patientInfoData.caution2A == 'Y') {
        caution2 = 'v5_caution2A.png';
        cautions[1] = 'v5_caution2A.png';
    } else if (patientInfoData.caution2B == 'Y') {
        caution2 = 'v5_caution2B.png';
        cautions[1] = 'v5_caution2B.png';
    } else {
        caution2 = 'v5_undefined.png';
        cautions[1] = 'v5_undefined.png';
    }

    if (patientInfoData.caution3 == 'Y') {
        caution3 = 'v5_caution3A.png';
        cautions[2] = 'v5_caution3.png';
    } else {
        caution3 = 'v5_undefined.png';
        cautions[2] = 'v5_undefined.png';
    }

    if (patientInfoData.caution4 == 'Y') {
        caution4 = 'v5_caution4.png';
        cautions[3] = 'v5_caution4.png';
    } else {
        caution4 = 'v5_undefined.png';
        cautions[3] = 'v5_undefined.png';
    }

    if (patientInfoData.caution5 == 'Y') {
        caution5 = 'v5_caution5.png';
        cautions[4] = 'v5_caution5.png';
    } else {
        caution5 = 'v5_undefined.png';
        cautions[4] = 'v5_undefined.png';
    }

    if (patientInfoData.caution6A == 'Y') {
        caution6 = 'v5_caution6A.png';
        cautions[5] = 'v5_caution6A.png';
    } else if (patientInfoData.caution6B == 'Y') {
        caution6 = 'v5_caution6B.png';
        cautions[5] = 'v5_caution6B.png';
    } else {
        caution6 = 'v5_undefined.png';
        cautions[5] = 'v5_undefined.png';
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
    MCIPatientInfoData["leftdot1"]=leftdot1;
    MCIPatientInfoData["leftdot2"]=leftdot2;
    MCIPatientInfoData["leftdot3"]=leftdot3;
    MCIPatientInfoData["rightdot1"]=rightdot1;
    MCIPatientInfoData["rightdot2"]=rightdot2;
    await UpdateMCIInfo(MCIPatientInfoData,deviceId);
    
}
// BY END 2022-03-02


//  Mapping 이 완료된 Data를 다시 DB에 저장하는 함수
const UpdateMCIInfo = async (MCIPatientInfoData,id) => {
    
    const contents = JSON.stringify({data:MCIPatientInfoData});
    
    // Debug
    const data = Base64Encode(contents);
    const params = {
        id:id,
        data: data
    };
    await baroboardESL.updateData(params);
    
    
}

// 24시간 형식을 12시간으로 변환
function convertTime(time) {
    // ex)time = 15:30~17:00
    try {
        let timeStr = time.split('~');
        let convertedTime = [];
        for(var i = 0 ; i <2 ;i++) {
            let shortTime = timeStr[i].split(':');
            let hour = shortTime[0];
            let minute = shortTime[1];
            if(hour > 12) {
                
                convertedTime[i] = (hour%12+":"+minute);
            }
            else {
                convertedTime[i] = timeStr[i]
            }
        }
        convertedTime = convertedTime[0]+"~"+convertedTime[1];
        
        return convertedTime;
    }
    catch {
        console.log("err");
    }
    
}


class SyncEslModule {

    // 해당 Device를 UNS DB 에서 초기화
    // name => 병상 이름 ex) '07W-01-01'
    resetData = async (name)=> {
        let device = await baroboardESL.getDeviceWithDifData(name);
        let sources = [];
        let outObj = {};
        if (device.length > 0 ) {
            const layoutMappingText = Base64Decode(device[0].mapping);
            const layoutMapping = JSON.parse(layoutMappingText);
            const mappingKeys = Object.keys(layoutMapping);
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
            await baroboardESL.resetData(device.id,data);
            return 'y';
        }
        else {
            return 'n';
        }
            
    
    }
    

    //  ESL 관라자 서버를 통해 DB에있는 Layout,data,mapping 정보를 갖고오는 함수

    //  params => {wardId:name} name => 병상 이름 ex) '07W-01-01'
    // patientInfoData => 환자 MCI 정보 (darwin에서 받아와서 맵핑처리된 것)
    GetWardLayoutData = async (params,patientInfoData,time) => {
        let wardInfoData = await baroboardESL.layoutMappingDataList(params);
        wardInfoData = wardInfoData.body;
        if(wardInfoData[0] !==undefined) {
            const data = JSON.parse(JSON.stringify(wardInfoData[0]));
            const wardLayoutData = JSON.parse(Base64Decode(data.data));
            if (wardInfoData[0].layout_id == "L20200108813485601") {  //Name:ESL_LAYOUT01 2020-03-03 Version
                await V3_MappingMCIData(wardLayoutData.data, patientInfoData,wardInfoData[0].id,wardInfoData[0].layout_id);
            }
            else if (wardInfoData[0].layout_id == "L202010261493377801") { //Name:ESL_LAYOUT02 2020-10-26 Version
                await V4_MappingMCIData(wardLayoutData.data, patientInfoData,wardInfoData[0].id,wardInfoData[0].layout_id);
            }
            else if (wardInfoData[0].layout_id == "L202105038113439501") { //Name:ESL_LAYOUT03 2021-05-07 Version
                await V5_MappingMCIData(wardLayoutData.data, patientInfoData,wardInfoData[0].id,wardInfoData[0].layout_id);
            }
            else if (wardInfoData[0].layout_id == "L202112141015736001") { //Name:ESL_LAYOUT4 2022-01-06 Version  *(V5맵핑 혼용사용)
                await V5_MappingMCIData(wardLayoutData.data, patientInfoData,wardInfoData[0].id,wardInfoData[0].layout_id);
            }
            else if (wardInfoData[0].layout_id == "L202212121516266101") { //Name: ESL_LAYOUT5 2022-12-12 Version
                await V6_MappingMCIData(wardLayoutData.data, patientInfoData,wardInfoData[0].id,wardInfoData[0].layout_id,time);
            }
            else if (wardInfoData[0].layout_id == "L202206298135321101") { //Name:ESL_LAYOUT_ERVersion 
                await V7_MappingMCIData(wardLayoutData.data, patientInfoData,wardInfoData[0].id,wardInfoData[0].layout_id,time);
            }
            else if (wardInfoData[0].layout_id == "L202211089215157203") { //Name:ESL_LAYOUT_ERVersion_7.5inch
                await V7_MappingMCIData(wardLayoutData.data, patientInfoData,wardInfoData[0].id,wardInfoData[0].layout_id,time);
            }
            
        }
    }

    

    //  DB에 저장되어있는 Layout과 Data정보를 통해 이미지 만들어 적용하는 함수
      // name => 병상 이름 ex) '07W-01-01'
    requestDeviceDataApply = async (name) => {
        
        const params = {
            name: name
        }
        let result = await baroboardESL.applyData(params);
        // let status_code = result.status_code;
        result = result.returnBody;
        console.log("["+ name+']`s MCIInfo image update success and wait a few minute.')
        // JU END 2021-10-29
        return result.returnBody;
    }


    // ESL 서버에서 success 한 단말들의 시간 및 status DB 저장
    RequestESLDate = () => {
        //logger.debug('RequestESLDate 들어옴');
        ajax({
            url:aims_ip+'/labels?stationCode=DEFAULT_STATION_CODE',
            crossDomain:true,
            headers:{
                "Accept": "application/json",
            }
        },async function(err,res,body,destpath) {
    
            if(body) {
                const data = JSON.parse(body);
                for(let i = 0 ; i < data.length ; i ++ ) {
                    let lastDate ;
                    
                    if(data[i].statusUpdateTime !== null) {
                        lastDate = data[i].statusUpdateTime.split('T')[0]+' '+data[i].statusUpdateTime.split('T')[1].split('.')[0]
                    }
                    else {
                        lastDate = null;
                    }
                    let params = {
                        labelcode:data[i].labelCode,
                        date:lastDate,
                        status:data[i].status,
                        battery:'GOOD'
    
                    }
                    let result =await baroboardESL.updateESLDate(params);
                }
            }
            
        })
    }




}

module.exports = SyncEslModule;