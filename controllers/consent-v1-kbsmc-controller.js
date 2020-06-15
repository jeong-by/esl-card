/**
 * This controller handles requests for Consent App
 * KBSMC users
 * 
 * Example request urls are as follows:
 * 
 * (1) http://localhost:7001/consent/v1/patient/inpatient-list-01?wardCode=110111
 * 
 * 
 */

'use strict'

const util = require('../util/util');
const param = require('../util/param');
const logger = require('../util/logger');

const CniUtil = require('../util/cni_util');

/**
 * @Controller(path="/consent/v1")
 */
class Consent {

    /**
     * 1. 입원환자리스트
     * 
     */

    /**
     * @RequestMapping(path="/patient/inpatient-list-01")
     */
    async inpatientList01(req, res) {
        logger.debug(`Consent:inpatientList01 called for path /consent/v1/patient/inpatient-list-01`);

        const params = param.parse(req);
        

        try {
                
            // 요청 파라미터
            let input = {       
                'mcdpCd': params.departmentCode,        // 진료과코드 (optional)
                'cardWardCd': params.wardCode,          // 간호병동코드 (optional)
                'chdrId': params.doctorId1,             // 진료의사ID (optional)
                'gndrId': params.doctorId2              // 주치의사ID (optional)
            };
 
            // 칼럼 매핑 정보
            let mapper = {
                encounterNo: 'mdrpNo',                  // 진료접수번호
                id: 'ptno',                             // 환자번호
                name: 'ptntNm',                         // 환자명
                gender: 'gendCd',                       // 성별코드
                ageContents: 'ageCtn',                  // 연령내용
                birthDate: 'btdt',                      // 생년월일
                wardCode: 'careWardCd',                 // 간호병동코드
                roomNo: 'carePtrmNo',                   // 간호병실번호
                bedNo: 'careSckbNo',                    // 간호병상번호
                doctor1Id: 'mddrId',                    // 진료의사ID
                doctor1Name: 'mddrNm',                  // 진료의사명
                doctor2Id: 'gndrId',                    // 주치의사ID
                doctor2Name: 'gndrNm',                  // 주치의사명
                departmentCode: 'mcdpCd',               // 진료과코드
                departmentShortCode: 'abrvDprtCd',      // 약어부서코드
                departmentName: 'mcdpNm',               // 진료과명
                departmentShortCode1: 'abrvDprtCd1',    // 약어부서코드1 (? 위의 약어부서코드와 다른 점)
                treatmentDate: 'mdcrDt',                // 진료일시
                dischargeDay: 'dschPrrnYmd',            // 퇴원예정일자
                lastOperationDay: 'ltstOprtYmd',        // 최근수술일자
                operationSeqNo: 'oprtSno',              // 수술일련번호
                medicalCenterCode: 'mccnCd',            // 진료센터코드
                diagnosisName: 'scinClncDxNm',          // 상병임상진단명
                treatmentMemoContents: 'mdcrMemoCtn',   // 진료메모내용
                cautionFlagContents: 'catnFlagCtn',     // 주의플래그내용
                contactCautionName: 'ctctLrclCdNm'      // 접촉주의대분류코드명
            };
            

            let values = {
                req: req,
                res: res,
                input: input,
                mapper: mapper,
                params: params,
                method: 'get',
                url: '/common/v1/patient/inpatient-list-01'
            }; 
            
			logger.debug(`input object for external request -> ${JSON.stringify(values.input)}`);

			const cniUtil = new CniUtil();
			const result = await cniUtil.send(values);
			logger.debug(`CNI result -> ${JSON.stringify(result)}`);

            const output = {
                code:200,
                message:'OK',
                data:result
            }
            util.sendResponse(res, output);
            
        } catch(err) {
            logger.error(`Error in Consent:inpatientList01 -> ${err}`);

            util.sendErr(res, params.requestCode, 400, 'Error in Consent:inpatientList01', 'error', err);
        }

    }




    /**
     * 2. 동의서 저장
     * 
     */

    /**
     * @RequestMapping(path="/consent/consent-save-01")
     */
    async consentSave01(req, res) {
        logger.debug(`Consent:consentSave01 called for path /consent/v1/consent/consent-save-01`);

        const params = param.parse(req);
        

        try {
                
            // 요청 파라미터
            let input = {       
                'ptno': params.patientId,               // 환자번호 (optional)
                'rcrdNo': params.recordNo,              // 기록번호 (optional)
                'codvCd': params.encounterType          // 내원구분코드 (optional)
            };
  
            // 칼럼 매핑 정보
            let mapper = {
                recordNo: 'rcrdNo',                     // 기록번호
                recordRevisionNo: 'rcamNo'              // 기록개정번호
            };
             

            let values = {
                req: req,
                res: res,
                input: input,
                mapper: mapper,
                params: params,
                method: 'get',
                url: '/emr/v1/consent/consent-save-01'
            }; 
            
			logger.debug(`input object for external request -> ${JSON.stringify(values.input)}`);

			const cniUtil = new CniUtil();
			const result = await cniUtil.send(values);
			logger.debug(`CNI result -> ${JSON.stringify(result)}`);

            const output = {
                code:200,
                message:'OK',
                data:result
            }
            util.sendResponse(res, output);
            
        } catch(err) {
            logger.error(`Error in Consent:consentSave01 -> ${err}`);

            util.sendErr(res, params.requestCode, 400, 'Error in Consent:consentSave01', 'error', err);
        }

    }



}


module.exports = Consent;
