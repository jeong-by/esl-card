/**
 * This controller registers REST API functions automatically using @Controller annotation on Bear.
 *
 * Example request urls are as follows:
 * 
 * (1) http://localhost:7001/baroboard/device/list
 * (2) http://localhost:7001/baroboard/device/create
 * (3) http://localhost:7001/baroboard/device/read/1
 * (4) http://localhost:7001/baroboard/device/update/1
 * (5) http://localhost:7001/baroboard/device/delete/1
 * 
 */

'use strict'

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

const { Layer, Shape, RectShape, TextRectShape, RoundRectShape, TextRoundRectShape, ImageShape } = require('../util/sync_to_mci_canvas');
const fs = require('fs');
const log = config.debug.log;

var check_eng = /[a-zA-Z]/; 
var check_spc = /[~!@#$%^&*()_+|<>?:{}]/; 
var check_kor = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/;



function Base64Encode(str, encoding = 'utf-8') {
    var bytes = new (sysUtil.TextEncoder || sysUtil.TextEncoderLite)(encoding).encode(str);        
    return base64js.fromByteArray(bytes);
}

function Base64Decode(str, encoding = 'utf-8') {
    var bytes = base64js.toByteArray(str);
    return new (sysUtil.TextDecoder || sysUtil.TextDecoderLite)(encoding).decode(bytes);
}

// 위젯의 properties 값들을 추출하여 반환 객체의 속성으로 추가
const makeProperty = (widget) => {
    const props = {};
    for (let i = 0; i < widget.properties.length; i++) {
        props[widget.properties[i].name] = widget.properties[i].value;
    }

    return props;
}

// 위젯의 properties 값들을 이용해 객체를 만든 후 추가
const changeProperty = (data) => {
    for (let i = 0; i < data.length; i++) {
        const widget = data[i];
        const props = makeProperty(widget);
        data[i].props = props;
    }

    return data;
}

const makeLayoutImage = async (rotation,resolution, data,url,params,code,layout_id) => {
    if(log){console.log('makeLayoutImage called.');}
    // 해상도 정보를 이용해 가로/세로 크기 확인
    const dimens = resolution.split('X');
    const deviceWidth = Number(dimens[0]);
    const deviceHeight = Number(dimens[1]);
    // console.log('device dimension : ' + deviceWidth + ', ' + deviceHeight);

    // 1. 레이어 생성
    const layer = new Layer(deviceWidth, deviceHeight);

    // 2. Shape 추가

    // console.log('count of widgets : ' + data.length);
    for (let i = 0; i < data.length; i++) {
        // console.log('processing widget #' + i);

        const widget = data[i];
        if (widget.widgetType == 'TextView' || widget.widgetType == 'CircleView' || widget.widgetType == 'DesignView' ) {
            const props = widget.props;

            // 좌표 계산
            const curTop = props.top.replace('px', '');
            const curDataY = props['data-y'];
            const curLeft = props.left.replace('px', '');
            const curDataX = props['data-x'];

            const widgetTop = curDataY;
            const widgetLeft = Number(curLeft) + curDataX;
            const widgetWidth = Number(props.width.replace('px', ''));
            const widgetHeight = Number(props.height.replace('px', ''));
            const widgetText = props.text;

            const shape1 = new TextRoundRectShape(widgetLeft, widgetTop, widgetWidth, widgetHeight, widgetText);
            // console.log(widget.widgetType + ' -> ' + widgetLeft + ', ' + widgetTop + ', ' + widgetWidth + ', ' + widgetHeight + ', ' + widgetText);

            if (props['border-width'] && !(props['border-width'] == '0' || props['border-width'] == '0px')) {
                shape1.stroke = true;
            }

            if (props['background-color'] && props['background-color'].length > 0) {
                shape1.fill = true;
                shape1.fillColor = props['background-color'];
            }
            
            shape1.strokeStyle = props['border-color'];
            shape1.lineWidth = Number(props['border-width'].replace('px', '')) * 2;
            
            shape1.textColor = props['color'];

            if (props['font-size'] && props['font-size'].length > 0) {
                shape1.fontSize = props['font-size'];
            }

            if (props['font-weight'] && props['font-weight'].length > 0) {
                
                shape1.fontWeight = props['font-weight'];
            }
        
            if (props['font-family'] && props['font-family'].length > 0) {
                
                shape1.fontFamily = props['font-family'];
            }
        
            // text-align
            // console.log('property text-align -> ' + props['text-align']);
            if (props['text-align'] && props['text-align'].length > 0) {
                shape1.textAlign = props['text-align'];
            }


            
            

            // BorderRadius
            let borderRadius = 0;
            if (props['border-top-left-radius'] && props['border-top-left-radius'].length > 0) {
                shape1.borderRadiusTopLeft = true;

                if (borderRadius == 0) {
                    borderRadius = Number(props['border-top-left-radius'].replace('px', ''));
                    // console.log('new borderRadius -> ' + borderRadius);
                }
            }

            if (props['border-top-right-radius'] && props['border-top-right-radius'].length > 0) {
                shape1.borderRadiusTopRight = true;
                
                if (borderRadius == 0) {
                    borderRadius = Number(props['border-top-right-radius'].replace('px', ''));
                    // console.log('new borderRadius -> ' + borderRadius);
                }
            }

            if (props['border-bottom-left-radius'] && props['border-bottom-left-radius'].length > 0) {
                shape1.borderRadiusBottomLeft = true;
                
                if (borderRadius == 0) {
                    borderRadius = Number(props['border-bottom-left-radius'].replace('px', ''));
                    // console.log('new borderRadius -> ' + borderRadius);
                }
            }

            if (props['border-bottom-right-radius'] && props['border-bottom-right-radius'].length > 0) {
                shape1.borderRadiusBottomRight = true;
                
                if (borderRadius == 0) {
                    borderRadius = Number(props['border-bottom-right-radius'].replace('px', ''));
                    // console.log('new borderRadius -> ' + borderRadius);
                }
            }

            // display (이름주의)
            // console.log('property display -> ' + props['display']);
            if (props['display'] == 'none') {
                shape1.display = props['display'];
                shape1.fillColor = 'rgb(255,255,255)';
                shape1.textColor = 'rgb(255,255,255)';
                
            }
            else if (props['display'] == 'block') {
                shape1.textColor = 'rgb(255,255,255)';
                
            }
            // class (cautionMemo 정보)
            if (props['class'] == 'cautionMemo1' || props['class'] == 'cautionMemo2') {
                // BY START 2021-03-03
                // if( shape1.text.length>25) {
                //     shape1.text =' ·  ' + shape1.text.substring(0,23);
                // }
                // else {
                //     shape1.text = ' ·  '+ shape1.text;
                // }
                shape1['text-overflow'] ='hidden';
                if(layout_id !== 'L202105038113439501') {
                    // shape1.text = ' ·  '+ shape1.text;
                }
                
                // BY END 2021-03-03
                
                shape1.whiteSpace = 'nowrap';
            }
            
            else if (props['class'] == 'department') {
                if( !check_kor.test(shape1.text) && check_eng.test(shape1.text)) { 
                    if(shape1.text.length>11) {
                        shape1.text = shape1.text.substring(0,10);
                    }
                    
                }
                else{ 
                    if(shape1.text.length>8) {
                        shape1.text = shape1.text.substring(0,7);
                        
                    }
                }
            }
            else if (props['class'] == 'doctorName') {
                if( !check_kor.test(shape1.text) && check_eng.test(shape1.text)) { 
                    if(shape1.text.length>7) {
                        shape1.text = shape1.text.substring(0,6);
                    }
                    
                }
                else{ 
                    if(shape1.text.length>5) {
                        shape1.text = shape1.text.substring(0,4);
                    }
                }
                
            }
            else if (props['id'] == 'time') {
                
            }

            shape1.borderRadius = borderRadius;

            layer.addShape(shape1);

        } else if (widget.widgetType == 'ImageView') {
            
            const props = widget.props;

            // 좌표 계산
            const curTop = props.top.replace('px', '');
            const curDataY = props['data-y'];
            const curLeft = props.left.replace('px', '');
            const curDataX = props['data-x'];

            const widgetTop = Number(curTop) + curDataY - 90;
            const widgetLeft = Number(curLeft) + curDataX;
            const widgetWidth = Number(props.width.replace('px', ''));
            const widgetHeight = Number(props.height.replace('px', ''));
            let widgetFilename;
            // BY START 2019-12-11
            if (url !=='preview') {
                widgetFilename = props.src;
            }
            else {
                widgetFilename = 'person.png'
            }
            // BY END 2019-12-11

            

            const shape1 = new ImageShape(widgetFilename, widgetLeft, widgetTop, widgetWidth, widgetHeight);
            // console.log('ImageView -> ' + widgetFilename + ', ' + widgetLeft + ', ' + widgetTop + ', ' + widgetWidth + ', ' + widgetHeight);

            if (props['border-width'] && !(props['border-width'] == '0' || props['border-width'] == '0px')) {
                shape1.stroke = true;
            }

            if (props['background-color'] && props['background-color'].length > 0) {
                shape1.fill = true;
                shape1.fillColor = props['background-color'];
            }
            
            shape1.strokeStyle = props['border-color'];
            shape1.lineWidth = Number(props['border-width'].replace('px', '')) * 2;
            
            // BorderRadius
            let borderRadius = 0;
            if (props['border-top-left-radius'] && props['border-top-left-radius'].length > 0) {
                shape1.borderRadiusTopLeft = true;

                if (borderRadius == 0) {
                    borderRadius = Number(props['border-top-left-radius'].replace('px', ''));
                    // console.log('new borderRadius -> ' + borderRadius);
                }
            }

            if (props['border-top-right-radius'] && props['border-top-right-radius'].length > 0) {
                shape1.borderRadiusTopRight = true;
                
                if (borderRadius == 0) {
                    borderRadius = Number(props['border-top-right-radius'].replace('px', ''));
                    // console.log('new borderRadius -> ' + borderRadius);
                }
            }

            if (props['border-bottom-left-radius'] && props['border-bottom-left-radius'].length > 0) {
                shape1.borderRadiusBottomLeft = true;
                
                if (borderRadius == 0) {
                    borderRadius = Number(props['border-bottom-left-radius'].replace('px', ''));
                    // console.log('new borderRadius -> ' + borderRadius);
                }
            }

            if (props['border-bottom-right-radius'] && props['border-bottom-right-radius'].length > 0) {
                shape1.borderRadiusBottomRight = true;
                
                if (borderRadius == 0) {
                    borderRadius = Number(props['border-bottom-right-radius'].replace('px', ''));
                    // console.log('new borderRadius -> ' + borderRadius);
                }
            }

            shape1.borderRadius = borderRadius;

            layer.addShape(shape1);

        } else if (widget.widgetType == 'QRView') {
            const props = widget.props;

            // 좌표 계산
            const curTop = props.top.replace('px', '');
            const curDataY = props['data-y'];
            const curLeft = props.left.replace('px', '');
            const curDataX = props['data-x'];

            const widgetTop = Number(curTop) + curDataY - 90;
            const widgetLeft = Number(curLeft) + curDataX;
            const widgetWidth = Number(props.width.replace('px', ''));
            const widgetHeight = Number(props.height.replace('px', ''));
            const widgetDataCode = props['data-code'];


            let widgetFilename = 'qrcode1.png';
            // make QRCode

            
            
            try {
                const qrContents = QRCode.imageSync(widgetDataCode, { type: 'png', margin: 1 })
                fs.writeFileSync(__dirname + '/../uploads/' + widgetFilename, qrContents);
            } catch (err) {
                console.error(err)
            }


            const shape1 = new ImageShape(widgetFilename, widgetLeft, widgetTop, widgetWidth, widgetHeight);
            // console.log('QRView -> ' + widgetFilename + ', ' + widgetLeft + ', ' + widgetTop + ', ' + widgetWidth + ', ' + widgetHeight);

            if (props['border-width'] && !(props['border-width'] == '0' || props['border-width'] == '0px')) {
                shape1.stroke = true;
            }

            if (props['background-color'] && props['background-color'].length > 0) {
                shape1.fill = true;
                shape1.fillColor = props['background-color'];
            }
            
            shape1.strokeStyle = props['border-color'];
            shape1.lineWidth = Number(props['border-width'].replace('px', '')) * 2;
            
            // BorderRadius
            let borderRadius = 0;
            if (props['border-top-left-radius'] && props['border-top-left-radius'].length > 0) {
                shape1.borderRadiusTopLeft = true;

                if (borderRadius == 0) {
                    borderRadius = Number(props['border-top-left-radius'].replace('px', ''));
                    // console.log('new borderRadius -> ' + borderRadius);
                }
            }

            if (props['border-top-right-radius'] && props['border-top-right-radius'].length > 0) {
                shape1.borderRadiusTopRight = true;
                
                if (borderRadius == 0) {
                    borderRadius = Number(props['border-top-right-radius'].replace('px', ''));
                    // console.log('new borderRadius -> ' + borderRadius);
                }
            }

            if (props['border-bottom-left-radius'] && props['border-bottom-left-radius'].length > 0) {
                shape1.borderRadiusBottomLeft = true;
                
                if (borderRadius == 0) {
                    borderRadius = Number(props['border-bottom-left-radius'].replace('px', ''));
                    // console.log('new borderRadius -> ' + borderRadius);
                }
            }

            if (props['border-bottom-right-radius'] && props['border-bottom-right-radius'].length > 0) {
                shape1.borderRadiusBottomRight = true;
                
                if (borderRadius == 0) {
                    borderRadius = Number(props['border-bottom-right-radius'].replace('px', ''));
                    // console.log('new borderRadius -> ' + borderRadius);
                }
            }

            shape1.borderRadius = borderRadius;
            layer.addShape(shape1);

        } else {
            // console.log('Unknown widgetType : ' + widget.widgetType);
        }
    }

    // JU START 2019-10-15
    // 이미지 회전

    // BY START 2019-12-12
    if( url !=='preview') {
        
        layer.rotation(parseInt(rotation));
    }
    // BY END 2019-12-12
    // JU END 2019-10-15

    // 2. 레이어 그리기
    const drawResult = await layer.draw();

    // 3. 이미지 파일로 저장

    let filename;
    // BY START 2019-12-10
    // JU START 2021-10-29
    //filename = '../output/'+params.id+'.png';
    filename = '../public/esl/'+code+'.png';
    // JU END 2021-10-29
    // BY END 2019-12-10
    const saveResult = await layer.save(filename);
    if (saveResult) {
        if(log){console.log(filename + ' created.');}

    }
    
    
    // JU START 2019-10-15
    // 3. 단말에 이미지 업로드 요청
    let returnBody;
    try {

        // JU START 2022-02-15
        // 4. BASE64로 이미지 로딩(BASE64 변환은 send함수에서 처리하도록 코드 수정)
        // const imageBase64 = await layer.loadAsBase64(filename);
        // JU END 2022-02-15
                
        // 5. HTTP 전송
        // BY START 2019-11-25
        returnBody = await layer.send(filename,url,code);
        // BY END 2019-11-2
        
        return filename,returnBody;
    } catch(err) {
        console.log('Error -> ' + err);
        return filename,400;
    }
    // JU END 2019-10-15
    

    
}





class BaroboardDevice {
    
    constructor() {
        this.database = new Database('database_mysql');
    }

    
    async updateData(req) {
        if(log){logger.debug('BaroboardDevice:updateData called for path /baroboard/device/data/update');}
        const params = req;
        
        try {
            const queryParams = {
            sqlName: 'baroboard_device_data_update_sync2',
            params: params,
            paramType: {
                id: 'string',
                data: 'string'
                }
            }

            const rows2 = await this.database.execute(queryParams);
            return rows2
        } catch(err) {
            return err
        }
    }
//   BYBYBYBYBYBY 
    // 병동에 해당되는 디바이스 데이터 리셋하기 
    async resetData(deviceId,data) {
        
        if(log){logger.debug('BaroboardDevice:resetData called for path resetData');}

        const params = {
            deviceId:deviceId,
            data:data,
            status:"RESET",
            status_message:"RESET"
        }
        
    try {
        const queryParams = {
            sqlName: 'baroboard_device_data_resetData',
            params: params,
            paramType: {
                deviceId: 'string',
                data:'string',
                status:'string',
                status_message:'string'
            }
        }
        const rows = await this.database.execute(queryParams);

        return rows
    }catch(err) {
        return err
    }
    }


    // 병동에 해당되는 디바이스 갖고오기
    async getDeviceInThisWard(wardId) {
        if(log){logger.debug('BaroboardDevice:getDeviceInThisWard called for path getDeviceInThisWard');}

        const params = {
            wardId:wardId
        }
        
        try {
            const queryParams = {
                sqlName: 'baroboard_device_data_getDevice',
                params: params,
                paramType: {
                    wardId: 'string',
                }
            }
            
            const rows2 = await this.database.execute(queryParams);
            return rows2
        } catch(err) {
            return err
        }
    }

    // 병동 정보 가져오기 (ROOM,Bed)
    async getWardInfo(wardId) {
        if(log){logger.debug('BaroboardDevice:getwardInfo called for path getwardInfo');}

        const params = {
            wardId:wardId
        }
        
        try {
            const queryParams = {
                sqlName: 'baroboard_did_get_wardData',
                params: params,
                paramType: {
                    wardId: 'string',
                }
            }

            const rows1 = await this.database.execute(queryParams);
            let rows2 = [];
            for(let i =0; i<rows1.length;i++) {
                rows2.push(rows1[i].name.split('-')[1]);
            }
            const ward = (rows1[0].name.split('-')[0]);
            const rows = {response:rows2,wardName:ward};
            return rows
        } catch(err) {
            return err
        }
    }
// BY START 2022-08-18  
// 데이터가 달라진 디바이스 갖고오기 
async getDeviceWithDifData (name) {
    logger.info("["+name+"] 데이터 변경 감지")
    const params = {
        name:name
    }
    try {
        const queryParams = {
            sqlName: 'baroboard_esl_get_device',
            params:params,
            paramType: {
                name: 'string',
            }
        }
        const rows = await this.database.execute(queryParams);
        return rows
    }catch (err) {
        return err;
    }
}
// BY END 2022-08-18

    /**
     * @RequestMapping(path="/data/apply", method="post")
     */
    async applyData(req, res) {
        let fileName;
        let returnBody;
        let params;
        if (res) {
            params = param.parse(req);
        }
        else {
            params = req;
        }
        
        try {
            // 1. id를 이용해 단말 및 레이아웃 데이터 조회
            // console.log('[STEP 1. id를 이용해 단말 및 레이아웃 데이터 조회]--------------------------------------------------------------------');
            const queryParams1 = {
                sqlName: 'baroboard_device_data_select2',
                params: params,
                paramType: {
                    name: 'string'
                }
            }

            const rows1 = await this.database.execute(queryParams1);
            
            // const queryParams2 = {
            //     sqlName:'baroboard_legacy',
            // }
            // // BY START 2019-11-25 esl서버 ip 받아오기
            // const rows3 = await this.database.execute(queryParams2);
            // // BY END 2019-11-25

            // 2. layout_data, layout_mapping, device_data 를 이용해 이미지 생성
            // console.log('[STEP 2. layout_data, layout_mapping, device_data 를 이용해 이미지 생성]--------------------------------------------------------------------');
            if (rows1.length > 0) {
                const layout_id = rows1[0].layout_id;
                const layout_data = rows1[0].layout_data;
                const layout_rotation = rows1[0].rotation;
                // Base64 decode
                const layoutDataText = Base64Decode(layout_data);
                //console.log('Layout Data -> ' + layoutDataText);
                // console.log(layout_data); 
                const layoutResolution = rows1[0].resolution;
                
                const layoutDataObj = JSON.parse(layoutDataText);
                
                
                const layoutDataObj2 = changeProperty(layoutDataObj);
                

                
                // z-index 값을 이용해 정렬
                const layoutData = layoutDataObj2.sort((a, b) => {
                    //console.log('DEBUG : ' + a.props['z-index'] + ', ' + b.props['z-index']);
                    return a.props['z-index'] < b.props['z-index'] ? -1 : a.props['z-index'] > b.props['z-index'] ? 1 : 0;
                });
                
                

                const layoutMappingText = Base64Decode(rows1[0].layout_mapping);
                

                const layoutMapping = JSON.parse(layoutMappingText);
                
                if(rows1[0].device_data != null) {
                    let deviceDataText = Base64Decode(rows1[0].device_data);
                    
                    const deviceData = JSON.parse(deviceDataText);
                    
                    if( deviceData.data.nameWarning =='N') {
                        for(let i =0 ; i < layoutData.length; i ++) {
                            if (layoutData[i].props.id =='nameWarning') {
                                layoutData[i].props.display = 'none';
                                layoutData[i].props.text = '';

                                
                            }
                            else if (layoutData[i].props.id =='namewarningText1' || layoutData[i].props.id =='namewarningText2'  ) {
                                layoutData[i].props.display = 'none';

                            }
                            
                        }
                        
                    }
                    else if ( deviceData.data.nameWarning =='Y') {
                        for(let i =0 ; i < layoutData.length; i ++) {
                            if (layoutData[i].props.id =='nameWarning') {
                                layoutData[i].props.display = 'block';
                                layoutData[i].props.text = '';  
                            }
                            else if (layoutData[i].props.id =='namewarningText1' || layoutData[i].props.id =='namewarningText2') {
                                layoutData[i].props.display = 'block';
                            }
                            
                        }
                    }
                    if (deviceData.data.leftdot1 =="N") {
                        for(let i = 0 ; i < layoutData.length; i ++) {
                            if (layoutData[i].props.id == "leftdot1" ||layoutData[i].props.id == "leftdot2" || layoutData[i].props.id == "leftdot3"  ) {
                                layoutData[i].props.display = 'none';
                            }
                            
                            
                        }
                    }
                    if (deviceData.data.leftdot2 =="N") {
                        for(let i = 0 ; i < layoutData.length; i ++) {
                            if (layoutData[i].props.id == "leftdot2" || layoutData[i].props.id == "leftdot3"  ) {
                                layoutData[i].props.display = 'none';
                            }
                        }
                    }
                    if (deviceData.data.leftdot3 =="N") {
                        for(let i = 0 ; i < layoutData.length; i ++) {
                            if (layoutData[i].props.id == "leftdot3"  ) {
                                layoutData[i].props.display = 'none';
                            }
                        }
                    }
                    
                    if (deviceData.data.rightdot1 =="N") {
                        for(let i = 0 ; i < layoutData.length; i ++) {
                            if (layoutData[i].props.id == "rightdot1" ||layoutData[i].props.id == "rightdot2") {
                                layoutData[i].props.display = 'none';
                            }
                        }
                    }
                    if (deviceData.data.rightdot2 =="N") {
                        for(let i = 0 ; i < layoutData.length; i ++) {
                            if (layoutData[i].props.id == "rightdot2") {
                                layoutData[i].props.display = 'none';
                            }
                        }
                    }

                    if (deviceData.data.cautionMemo1) {
                    
                        for(let i =0 ; i < layoutData.length; i ++) {
                            if (layoutData[i].props.id == 'cautionMemo1') {
                                layoutData[i].props['class']= "cautionMemo1";
                            } 
                        } 
                    }
                    if (deviceData.data.cautionMemo2) {
                    
                        for(let i =0 ; i < layoutData.length; i ++) {
                            if (layoutData[i].props.id == 'cautionMemo2') {
                                layoutData[i].props['class']= "cautionMemo2";
                            } 
                        } 
                    }

                    if(deviceData.data.firstName) {
                        for(let i =0 ; i < layoutData.length; i ++) {
                            if (layoutData[i].props.id == 'firstName') {
                                layoutData[i].props['class']= "firstName";
                            } 
                        } 
                    }
    
                    if(deviceData.data.dept) {
                        for(let i =0 ; i < layoutData.length; i ++) {
                            if (layoutData[i].props.id == 'department') {
                                layoutData[i].props['class']= "department";
                            } 
                        } 
                    }
    
                    if(deviceData.data.doctorName1) {
                        for(let i =0 ; i < layoutData.length; i ++) {
                            if (layoutData[i].props.id == 'doctorName1') {
                                layoutData[i].props['class']= "doctorName";
                            } 
                        } 
                    }
    
                    if(deviceData.data.doctorName2) {
                        for(let i =0 ; i < layoutData.length; i ++) {
                            if (layoutData[i].props.id == 'doctorName2') {
                                layoutData[i].props['class']= "doctorName";
                            } 
                        } 
                    }

                    // 레이아웃 매핑 정보를 이용해 deviceData의 데이터 적용
                    for (let i = 0; i < layoutData.length; i++) {
                        

                        const curItem = layoutData[i];
                        const curId = curItem.props['id'];

                        if (layoutMapping[curId]) {
                            

                            // source 속성 확인 (deviceData의 어떤 값을 사용할 것인지 지정하는 속성)
                            // ex) data.patientId
                            if (layoutMapping[curId]['source']) {
                                
                                // . 으로 구분된 source 값을 이용해 deviceData에서 해당 값을 찾아냄
                                const dataAttr = layoutMapping[curId]['source'];
                                const curAttrs = dataAttr.split('.');
                                let curValue = deviceData;
                                for (let j = 0; j < curAttrs.length; j++) {
                                    curValue = curValue[curAttrs[j]];
                                }
                                

                                // operator가 있는 경우 operator 적용
                                if (layoutMapping[curId]['operator']) {
                                    
                                    const operatorObj = layoutMapping[curId]['operator'];

                                    // operator name에 따라 분기
                                    if (operatorObj.name == 'switch') {
                                        

                                        // deviceData의 값은 ,로 구분된 값이며,
                                        // 이 값 중 지정한 순서에 맞는 값을 선택
                                        if (operatorObj.condition1 == 'array') {
                                            
                                            // curValue의 값을 , 로 구분한 후 순서 확인
                                            // const curValues = curValue.split(',');
                                            const curValues = curValue;
                                            const indexStr = operatorObj.condition2;
                                            const indexInt = Number(indexStr);
                                            

                                            if (curValues.length > indexInt) {
                                                curValue = curValues[indexInt].trim();
                                                
                                            } else {
                                                
                                                curValue = '';
                                            }


                                        // deviceData의 값에 따라 value 속성의 값 중 
                                        // 하나를 선택    
                                        } else if (operatorObj.condition1 == 'equal') {
                                            
                                            
                                            if (operatorObj.value[String(curValue)]) {
                                                curValue = operatorObj.value[String(curValue)];
                                            } else {
                                                
                                                curValue = '';
                                            }
                                            
                                        }
                                    }

                                    
                                }
                                
                                // 찾아낸 값을 현재 아이템의 속성을 적용
                                // 적용할 속성은 레이아웃 매핑의 target에 있음
                                // ex) TextView의 경우, "target":"text"
                                curItem.props[layoutMapping[curId]['target']] = curValue;
                            } else {
                                console.log('source attribute for data not found');
                            }
                        } else {
                            // console.log('layout mapping for ' + curId + ' not found.');
                        }
                    }
                }

                // 이미지 생성 및 파일 저장 메소드 호출
                

                fileName,returnBody = await makeLayoutImage(layout_rotation,layoutResolution, layoutData,aims_ip,params,rows1[0].code,layout_id);
            }
            let code = 400;
            if(typeof(returnBody.returnCode) != 'undefined') {
                code = returnBody.returnCode
            }
            
            const result = {
                header:{},
                body: rows1,
                status_code:code,
                returnBody:returnBody
            }
            return (result);
        }catch(err) {
            console.log(err);
            return (err);
        }
    }


    /**
     * Battery 정보 업데이트
     */
    async batteryUpdate(req, res) {
        if(log){logger.debug('BaroboardDevice:goodBatteryUpdate called ');}
        
        const params=req;

        try {
            const queryParams = {
                sqlName: 'baroboard_goodbattery_update',
                params: params,
                paramType: {
                    labelcode:'string'
                }
            }

            const rows = await this.database.execute(queryParams);

            const result = {
                header:{},
                body: rows
            }
            return result;
        } catch(err) {
            return err
        }
    }

    
    /**
     * 베터리 부족 데이터 업데이트
     */
    async batteryUpdate2(req, res) {
        if(log){logger.debug('BaroboardDevice:badBatteryUpdate called ');}
        
        const params = param.parse(req);
        
        try {
            const queryParams = {
                sqlName: 'baroboard_badbattery_update',
                params: params,
                paramType: {
                    labelcode:'string'
                }
            }

            const rows = await this.database.execute(queryParams);

            const result = {
                header:{},
                body: rows
            }
            return result;
        } catch(err) {
            return err
        }
    }
    
    /**
     * 상태정보 업데이트
     */
    async statusUpdate (req,res) {

        const params = param.parse(req);

        try {
            const queryParams = {
                sqlName: 'baroboard_device_status_update',
                params: params,
                paramType: {
                    id: 'string',
                    status: 'string',
                    status_message: 'string'
                }
            }
            const rows2 = await this.database.execute(queryParams);
            return rows2;
        } catch(err) {
            console.log(err);
        }
        
    }


    
    async layoutMappingDataList(req, res) {
        let params;
        if (res) {
            params = param.parse(req); 
        }
        else {
            params = req;
        }
        
        try {
            const queryParams = {
                sqlName: 'baroboard_device_layout_mapper',
                params: params,
                paramType: {
                    wardInfo: 'string'
                }
            }
            const rows = await this.database.execute(queryParams);
            const result = {
                header:{},
                body: rows
            }
            return (result);
        } catch(err) {
            return err
        }
        
    }

    // BY START 2022-03-02
    async updateESLDate(req,res) {
        var params = req;
        params.status_message = params.status;
        return new Promise (async (resolve,reject) => {
            try {
                const queryParams = {
                    sqlName: 'baroboard_device_update_esldate',
                    params: params,
                    paramType: {
                        labelcode:'string',
                        date:'string',
                        status:'string',
                        status_message:'string',
                        battery:'string'
                    }
                }
                const rows = await this.database.execute(queryParams);
                const result = {
                    header:{},
                    body: rows
                }
                resolve(result);
                
            } catch(err) {
                reject(err);

            }
        })
    }
    // BY END 2022-03-02

    // BY START 2022-08-17
    async searchESLWard () {
        const params = [];
        try {
            const queryParams = {
                sqlName:'baroboard_device_group_eslyn',
                params:params
            }
            const rows = await this.database.execute(queryParams);
            return rows
        } catch (err) {
            return err
        }

    }

    async requestDBData(wardId) {
        const params = {
            wardId:wardId
        }
        try {
            const queryParams = {
                sqlName: 'baroboard_esl_get_wardData',
                params: params,
                paramType: {
                    wardId: 'string',
                }
            }
    
            const rows2 = await this.database.execute(queryParams);
            return rows2
        } catch(err) {
            return err
        }
    }

    async saveStats (wardName) {

        const groupName = wardName.split("-")[0];
        const params = {
            groupName : groupName,
            wardName : wardName
        }
        try {
            const queryParams = {
                sqlName : 'baroboard_esl_save_stats',
                params: params,
                paramType : {
                    groupName : 'string',
                    wardName : 'string'
                }
            }
            const rows2 = await this.database.execute(queryParams);
            return rows2
        } catch(err) {
            return err
        }
    }


   
}



module.exports = BaroboardDevice;
