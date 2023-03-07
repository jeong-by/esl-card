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
                보안상 비공개             // afiPtntLctnNm(병실명) : 중앙-B-08
            };
    
            
            let values = {
                req: req,
                res: res,
                params: params,
                input: input,
                mapper: mapper,
                interfaceId: '보안상 비공개',
                requestId: '보안상 비공개',
                inname: '보안상 비공개', 
                outname: '보안상 비공개'
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
