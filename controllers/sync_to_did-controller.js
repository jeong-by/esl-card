

'use strict'

const Database = require('../database/database_mysql');





class BaroboardDID {

    constructor() {
        this.database = new Database('database_mysql');
    }


    async searchDIDWard () {
        const params = {};
        try {
            const queryParams = {
                sqlName:'baroboard_device_group_didyn',
                params:params            
            }
            const rows = await this.database.execute(queryParams);
            return rows
        } catch(err) {
            return err

        }
    }

    async searchWardRoom(wardId) {
        const params = {
            wardId : wardId 
        };
        try {
            const queryParams = {
                sqlName : 'baroboard_did_roomInfo',
                params : params,
                paramType: {
                    wardId: 'string',
                }
            }
            const rows = await this.database.execute(queryParams);
            return rows;
        } catch(err) {
            return err;
        }

    }

}
module.exports = BaroboardDID;