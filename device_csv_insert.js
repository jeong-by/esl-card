const fs = require('fs');
const csv = require('csv-parser');
const Database = require('./database/database_mysql');
const database = new Database('database_mysql');
const ward = require("./smc_wardInfo.js");
// DATA 하드코딩 부분
const inputFile = "./csv/esl_20221111.csv";
const type = "ESL";
const resolution = "960X640";
const size = "11";
const rotation = 270;
const layout_id = "L202112141015736001";
const layout_name = "ESL_Layout04_01";
const create_author = "UNSNETWORKS관리자"
// 고정값
var seqCode = 0;
var groupInfo = ward.ward;
const rs = fs.createReadStream(inputFile);
let count = 0;
let count2 = 0;
let device =[];



let getData = new Promise ((resolve,reject) => {
        rs.pipe(csv()).on('data',async function(data) {
            await device.push(data);
            
        
        }).on('end',function() {
            rs.unpipe(csv());
            rs.destroy();
            resolve(device);
        }).on("error", function (error) {
            console.log(error)
        })
    })

getData.then (async function (data) {
    for(let i = 0 ; i < data.length ; i ++) {
        const id = 'M' + generateRequestCode();
        const code = data[i].code;
        const location = data[i].location;
        const name = location;
        console.log(location);
        const groupName = location.split("-")[0]
        const groupId = data[i].wardId
        const status = "RESET";
        const statusMessage = "RESET";
        const battery = "GOOD";
        const admin ="admin";
        params = {
            id:id,
            code:code,
            name:name,
            group_id:groupId,
            group_name:groupName,
            type:type,
            size:size,
            resolution:resolution,
            location:location,
            rotation:rotation,
            status:status,
            status_message:statusMessage,
            battery:battery,
            admin:admin,
            code2:code,
            layout_id:layout_id,
            layout_name:layout_name,
            create_author:create_author
        }
        
        const response = await registDevice(params);
        count ++;
        if(count == data.length) {
            setTimeout(function () {
                console.log("CSV 데이터 단말기 : " +count);
                console.log("추가된 단말기 : " +count2);
                console.log("ALL DATA FINISHED")
            },2000)
        }
        if(response.affectedRows == 1) {
            console.info("["+code+"] is successfully inserted");
            count2 ++;
            
        }
        else {
            console.error("["+code+"] is duplicate ")
        }
    }
})

function  generateRequestCode () {
    var date = new Date();

    var seqCodeStr = getSeqCode();

    var components = [
        date.getFullYear(),
        ("0" + (date.getMonth() + 1)).slice(-2),
        ("0" + (date.getDate())).slice(-2),
        date.getHours(),
        date.getMinutes(),
        date.getSeconds(),
        date.getMilliseconds(),
        seqCodeStr
    ];

    var curCode = components.join("");
    console.log(curCode);
    return curCode;
}

//  Get sequence code (01 ~ 99)
function getSeqCode() {
    seqCode += 1;
    if (seqCode > 99) {
        seqCode = 0;
    }
    var seqCodeStr = String(seqCode);
    if (seqCodeStr.length == 1) {
        seqCodeStr = '0' + seqCodeStr;
    }

    return seqCodeStr;
}

async function registDevice(params) {
        const queryParams = {
            sqlName: 'baroboard_add_device',
            params: params,
            paramType: {
                id:"string",
                code:"string",
                name:"string",
                group_id:"string",
                group_name:"string",
                type:"string",
                size:"string",
                resolution:"string",
                location:"string",
                rotation:"string",
                status:"string",
                status_message:"string",
                battery:"string",
                admin:"string",
                code2:"string",
                layout_id:"string",
                layout_name:"string",
                create_author:"string"
            }
        }

        const rows = await database.execute(queryParams);
        return rows;
}


