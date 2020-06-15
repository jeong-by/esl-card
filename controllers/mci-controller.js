/**
 * This controller tests MCI requests and responses
 *
 * Example request urls are as follows:
 * 
 * (1) http://localhost:7001/mci-test/patient-list?wardId=171130
 * 
 */

'use strict'

const util = require('../util/util');
const param = require('../util/param');
const logger = require('../util/logger');

const MciUtil = require('../util/mci_util');

const Database = require('../database/database_mysql');

const base64js = require('base64-js');

/**
 * @Controller(path="/mci-test")
 */
class MCITest {

    /**
     * 1. 입원환자리스트 테스트
     * 
     */

    /**
     * @RequestMapping(path="/patient-list")
     */
    async patientList(req, res) {
        logger.debug(`MCITest:patientList called for path /mci-test/patient-list`);
        let params;
        if(param.parse(req)) {
            params = param.parse(req);
        }
        else {
            params = req;
        }
        
        

        try {
            // JU START 2020-01-06    
            let input = {
                wardCd: params.wardId
            };

            // mapper object
            let mapper = {
                firstName: 'ptntNm',                // ptntNm(환자 이름) : 어한경
                // BY START 2020-02-27
                nameWarning:'ptntNmCatnYn',         // ptntNmCatnYn(환자명 주의 여부): Y
                // BY END 2020-02-27
                gender: 'gendCd',                   // gendCd(성별코드): M
                age: 'ageCtn',                      // ageCtn(나이) : 48 세
                birthDate: 'btdt',                  // "1959-07-10"   
                dept: 'mcdpNm',                     // mcdpNm(진료과명) : 외과
                doctorName1: 'gndrNm',              // chdrNm(지정의 이름) : 김기범
                doctorName2: 'chdrNm',              // gndrNm(주치의 이름) : 최규성
                caution3: 'fallCtn',                // fallCtn (낙상주의) : 
                caution4: 'bdsrEtcCtn',             // bdsrEtcCtn(욕창주의)) : 
                caution2B: 'ctctYn',                // ctctYn(접촉주의) : Y
                caution2A: 'cnsdCtctStcrVl',        // cnsdCtctStcrVl(강화된 접촉주의) : Y
                caution1A: 'airCatnYn',             // airCatnYn(공기주의) : 
                caution1B: 'drplYn',                // drplYn(비말주의) : Y
                caution5: 'blodCatnYn',             // blodCatnYn(혈액주의) : 
                caution6A: 'invrIsltYn',            // invrIsltYn(역격리) : Y
                caution6B: 'etcYn',                 // etcYn(보호적) : Y
                // BY START 2020-03-02
                npoYn: 'npoYn',                     // npoYn(금식여부) : Y
                npoCtn: 'npoCtn',                   // npoCtn(금식내용) : "조식 후"
                npoDscrMemoCtn: 'npoDscrMemoCtn',   // npoDscrMemoCtn(금식설명메모내용) : "물만 드세요"
                ptntInftCtn: 'ptntInftCtn',         // ptntInftCtn(환자안내내용): "(5)시까지 절대안정"
                // BY END 2020-03-02
                treatDate: 'admsDt',                // admsDt(입원일시) : "2019-04-05"
                leavingDate: 'dschPrrnYmd',         // dschPrrnYmd(퇴원예정일자) : "2019-04-05"
                roundingSun: 'dvsnNm1',             // dvsnNm1(일 회진 시간) : 금
                roundingMon: 'dvsnNm2',             // dvsnNm2(월 회진 시간) : "06:00~12:00 / 16:00~18:00"
                roundingTue: 'dvsnNm3',            // dvsnNm3(화 회진 시간) :
                roundingWed: 'dvsnNm4',             // dvsnNm4(수 회진 시간) :
                roundingThu: 'dvsnNm5',             // dvsnNm5(목 회진 시간) :
                roundingFri: 'dvsnNm6',             // dvsnNm6(금 회진 시간) :
                roundingSat: 'dvsnNm7',             // dvsnNm7(토 회진 시간) :
                ward: 'wardCdCtn',                  // wardCdCtn(병동코드내용) : 10W
                roomNo: 'carePtrmNo',               // carePtrmNo(간호병실번호) : 65
                bedNo: 'careSckbNo',                // careSckbNo(간호병상번호) : 02
                id: 'ptno',                         // ptno(환자번호) : 56354352
                wardName: 'wardNm',                 // wardNm(병동명) : 10서(GS5)
                wardId: 'wardCd'                    // wardCd(병동코드) : 171130
            };
    
            
            let values = {
                req: req,
                res: res,
                params: params,
                input: input,
                mapper: mapper,
                interfaceId: 'mno_elsdidt_l01',
                requestId: 'mns_elsdidt_002',
                inname: 'mnc_elsdidt_001', 
                outname: 'mns_elsdidt_001'
            }; 
            // JU END 2020-01-06
			//logger.debug(`input object for external request -> ${JSON.stringify(values.input)}`);

            const mciUtil = new MciUtil();
            console.log(values);
			const table = await mciUtil.send(values);
			//logger.debug(`MCI result success for ${values.interfaceId}`);
			//logger.debug(`MCI table -> ${JSON.stringify(table)}`);

            const output = {
                code:200,
                message:'OK',
                data:table
            }
            util.sendResponse(res, output);
            return output;
            
        } catch(err) {
            logger.error(`Error in MCITest:patientList -> ${err}`);

            util.sendErr(res, params.requestCode, 400, 'Error in MCITest:patientList', 'error', err);
            return err;
        }
         
    }

    

}


module.exports = MCITest;
