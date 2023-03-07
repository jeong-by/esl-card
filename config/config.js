/**
 * Configuration sample for more complex one
 * 
 * @author Mike
 */

 module.exports = {
    server: {
        port: 7001,
        backlog: 50000,
        https: false
    },
    debug: {
        log:false,
    },
    
    database: {  
        database_mysql: { 
            type: 'mysql',
            failover: 'true',
            retryStrategy: {
                interval: 2000,
                limit: 3,
                failoverLimit: 3
            },
            master: {
                host:'localhost',
                // BY START 2019-12-12
                port:3306,
                // BY END 2019-12-12
                user:'root',
                // BY START 2020-04-06
                // 수정제출 필요
                password:'admin',
                database:'baroboard',
                //password:'SMC1q2w3e4r5t!',
                //database:'test',
                // BY END 2020-04-06
                connectionLimit:10,
                debug:false
            },
            slave: {
                host:'localhost',
                // JU START 2019-10-15
                port:3306,
                user:'root',
                // BY START 2020-04-06
                // 수정제출 필요
                password:'admin',
                database:'baroboard',
                //password:'SMC1q2w3e4r5t!',
                // database:'test',
                // BY END 2020-04-06
				// JU END 2019-10-15
                connectionLimit:10,
                debug:false
            }
        },
        database_sqlite: { 
            type: 'sqlite',
            replication: 'true',
            failover: 'true',
            retryStrategy: {
                interval: 2000,
                limit: 3,
                failoverLimit: 3
            },
            master: {
                host:'localhost',
                port:7001,
                file: './database/customer.db'
            },
            slave: {
                host:'localhost',
                port:7002,
                file: './database/customer2.db'
            }
        }
    },
    external: [                             // external interface array
        {                                   // #0 test interface for socket outbound
            name: 'external01',
            protocol: 'socket', 
            direction: 'outbound',
            // JU START 2020-01-06
            host: 'localhost',
            port: 7101,
            // JU END 2020-01-06
            connectionLimit: 10,
            acquireTimeout: 10000,
            connectTimeout: 10000
        },
        {                                   // #1 test interface for http outbound
            name: 'external02',
            protocol: 'http', 
            direction: 'outbound',
            host: 'localhost',
            port: 7102
        },
        {                                   // #2 AIMS for http outbound
            name: 'external03',
            protocol:'http',
            direction: 'outbound',

            
            // BY START 2020-04-06
            // 수정제출 필요
            //host: '119.6.3.104',
            // port: 9001
            // BY END 2020-04-06
                    
        },
        {                                   // #3 전광판 데이터 수신 서버 for socket outbound
            name: 'external04',
            protocol: 'socket',
            direction: 'outbound',
            // BY START 2020-01-16
            // host: '119.6.3.104',         // Active : 119.6.3.104, Standby : 119.6.3.103
            host:'127.0.0.1',            
            // BY END 2020-01-16
            port:40009                      // 운영 : 40010, 테스트 : 40009
        }
    ],

    redis: {
        sentinels: [
            { host:'127.0.0.1', port: 11425 },
            { host:'127.0.0.1', port: 11426 },
            { host:'127.0.0.1', port: 11427 }
        ],
        name: 'mymaster'
    },
    socketio: {
        active: true
    },
    interval: {
        battery: 1000*60*60*12, // 기본 12시간
        mci : 1000*60*5,			// 기본 5분
        mci_er: 1000*10         //응급실 기본 1분
    },
    esl_image_url: {
        url:"http://localhost:7001/esl/"
    }
    
}