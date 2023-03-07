
const param = require('../util/param');
const logger = require('../util/logger');
const Database = require('../database/database_mysql');

const base64js = require('base64-js');
const sysUtil = require('util');
const config = require('../config/config');
// QRCode
const QRCode = require('qr-image');
const aims_info = config.external[2];
let aims_ip = 'http://'+aims_info.host + ':' +aims_info.port; 
const sync_to_esl = require('./sync_to_esl-controller');
const BaroboardESL = new sync_to_esl();
const sync_module = require('../baroboard_sync_module');
const baroboardSyncModule = new sync_module();


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


    
    
/**
 * @Controller(path="/baroboard/darwin", type="rest", table="baroboard.device")
 */
class BaroboardSyncDarwin {

    // MCI 데이터 맵핑처리
    

    constructor() {
        this.database = new Database('database_mysql');
    }


    /**
     * @RequestMapping(path="/request_esl_sync", method="post")
     */
     async updateData(req, res) {
        const params = param.parse(req);

        let mapper  = {
            firstName: params.ptntNm,                // ptntNm(환자 이름) : 어한경
            // BY START 2020-02-27
            nameWarning:params.ptntNmCatnYn,         // ptntNmCatnYn(환자명 주의 여부): Y
            // BY END 2020-02-27
            gender: params.gendCd,                   // gendCd(성별코드): M
            age: params.ageCtn,                      // ageCtn(나이) : 48 세
            birthDate: params.btdt,                  // "1959-07-10"   
            dept: params.mcdpNm,                     // mcdpNm(진료과명) : 외과
            doctorName1: params.gndrNm,              // chdrNm(지정의 이름) : 김기범
            doctorName2: params.chdrNm,              // gndrNm(주치의 이름) : 최규성
            caution3: params.fallCtn,                // fallCtn (낙상주의) : 
            caution4: params.bdsrEtcCtn,             // bdsrEtcCtn(욕창주의)) : 
            caution2B: params.ctctYn,                // ctctYn(접촉주의) : Y
            caution2A: params.cnsdCtctStcrVl,        // cnsdCtctStcrVl(강화된 접촉주의) : Y
            caution1A: params.airCatnYn,             // airCatnYn(공기주의) : 
            caution1B: params.drplYn,                // drplYn(비말주의) : Y
            caution5: params.blodCatnYn,             // blodCatnYn(혈액주의) : 
            caution6A: params.invrIsltYn,            // invrIsltYn(역격리) : Y
            caution6B: params.etcYn,                 // etcYn(보호적) : Y
            // BY START 2020-08-12
            npoYn: params.npoYn,                     // npoYn(금식여부) : Y
            npoCtn: params.npoCtn,                   // npoCtn(금식내용) : "아침식사 후 금식"
            npoDscrMemoCtn: params.npoDscrMemoCtn,   // npoDscrMemoCtn(금식설명메모내용) : "물만 드세요"
            ptntInftCtn: params.ptntInftCtn,         // ptntInftCtn(환자안내내용): "왼팔 채혈금지/오른팔 채혈금지/(5)시까지 절대안정"
            // BY END 2020-08-12
            treatDate: params.admsDt,                // admsDt(입원일시) : "2019-04-05"
            leavingDate: params.dschPrrnYmd,         // dschPrrnYmd(퇴원예정일자) : "2019-04-05"
            roundingSun: params.dvsnNm1,             // dvsnNm1(일 회진 시간) : 금
            roundingMon: params.dvsnNm2,             // dvsnNm2(월 회진 시간) : "06:00~12:00 / 16:00~18:00"
            roundingTue: params.dvsnNm3,            // dvsnNm3(화 회진 시간) :
            roundingWed: params.dvsnNm4,             // dvsnNm4(수 회진 시간) :
            roundingThu: params.dvsnNm5,             // dvsnNm5(목 회진 시간) :
            roundingFri: params.dvsnNm6,             // dvsnNm6(금 회진 시간) :
            roundingSat: params.dvsnNm7,             // dvsnNm7(토 회진 시간) :
            ward: params.wardCdCtn,                  // wardCdCtn(병동코드내용) : 10W
            roomNo: params.carePtrmNo,               // carePtrmNo(간호병실번호) : 65
            bedNo: params.careSckbNo,                // careSckbNo(간호병상번호) : 02
            id: params.ptno,                         // ptno(환자번호) : 56354352
            wardName: params.wardNm,                 // wardNm(병동명) : 10서(GS5)
            wardId: params.wardCd,                   // wardCd(병동코드) : 171130
            codvCd: params.codvCd,                   // codvCd() : E (응급실)
            afiErrmLctnNm:params.afiErrmLctnNm,      // afiErrmLctnNm () : 진료2 (응급실 위치)
            afiPtntLctnNm:params.afiPtntLctnNm       // afiPtntLctnNm (병상정보) : 진료2-A-10 
        };
        const name = mapper.ward + "-"+mapper.roomNo + "-" + mapper.bedNo;
        logger.info("[" +name+"] Request from Darwin");

        await baroboardSyncModule.resetData(name);
        const wardInfo = {
            wardInfo: name
        }
        await baroboardSyncModule.GetWardLayoutData(wardInfo,mapper);
        await baroboardSyncModule.requestDeviceDataApply(name);


    }
}

module.exports = BaroboardSyncDarwin;
