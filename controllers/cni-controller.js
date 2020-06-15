/**
 * This controller tests CNI requests and responses
 *
 * Example request urls are as follows:
 * 
 * (1) http://localhost:7001/cni-test/patient-list?wardCode=110111
 * 
 */

'use strict'

const util = require('../util/util');
const param = require('../util/param');
const logger = require('../util/logger');

const CniUtil = require('../util/cni_util');

/**
 * @Controller(path="/cni-test")
 */
class CNITest {

    /**
     * 1. 입원환자리스트 테스트
     * 
     */

    /**
     * @RequestMapping(path="/patient-list")
     */
    async patientList(req, res) {
        logger.debug(`CNITest:patientList called for path /cni-test/patient-list`);

        const params = param.parse(req);
        

        try {
                
            // 요청 파라미터
            let input = {       
                'mcdp-cd': params.departmentCode,   // 진료과코드 (optional)
                'mddr-id': params.doctorId1,        // 진료의사ID (optional)
                'gndr-id': params.doctorId2,        // 주치의사ID (optional)
                'care-ward-cd': params.wardCode,    // 간호병동코드 (optional)
                'care-ptrm-no': '',                 // 간호병실번호 (optional)
                'care-sckb-bo': ''                  // 간호병상번호 (optional)
            };

            // 칼럼 매핑 정보
            let mapper = {
                treatReceiptNo: 'mdrpNo',           // 진료접수번호
                id: 'ptno',                         // 환자번호
                name: 'ptntNm',                     // 환자명
                gender: 'gendCd',                   // 성별코드
                age: 'ageVl',                       // 연령값
                wardShortCode: 'abrvCareWardCd',    // 약어간호병동코드 칼럼명 변경
                roomNo: 'carePtrmNo',               // 간호병실번호
                bedNo: 'careSckbNo',                // 간호병상번호
                doctorId1: 'mddrId',                // 진료의사ID
                doctorName1: 'mddrNm',              // 진료의사명
                doctorId2: 'gndrId',                // 주치의사ID
                doctorName2: 'gndrNm',              // 주치의사명
                treatDate: 'mdcrDt',                // 진료일시
                leavingDate: 'dschPrrnDt',         // 퇴원예정일자
                operationDate: 'oprtYmd',           // 수술일자
                lastOperationDate: 'ltstOprtYmd',   // 최근수술일자
                infection: 'catnColoNm',            // AFI주의색명      칼럼명 변경
                disease: 'clncDxNm',                // 임상진단명
                diseaseMemo: 'clncDxMemoCtn'        // 임상진단메모내용
            };
            
            let values = {
                req: req,
                res: res,
                input: input,
                mapper: mapper,
                params: params,
                method: 'get',
                url: '/api/v1/med/patients/in-patient-list',
                outname: 'medAmptOutDVOList'
            }; 
            
			logger.debug(`input object for external request -> ${JSON.stringify(values.input)}`);

			const cniUtil = new CniUtil();
			const table = await cniUtil.send(values);
			logger.debug(`CNI table -> ${JSON.stringify(table)}`);

            const output = {
                code:200,
                message:'OK',
                data:table
            }
            util.sendResponse(res, output);
            
        } catch(err) {
            logger.error(`Error in CNITest:patientList -> ${err}`);

            util.sendErr(res, params.requestCode, 400, 'Error in CNITest:patientList', 'error', err);
        }

    }

}


module.exports = CNITest;
