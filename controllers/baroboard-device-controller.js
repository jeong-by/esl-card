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

const util = require('../util/util');
const param = require('../util/param');
const logger = require('../util/logger');
const Database = require('../database/database_mysql');

const base64js = require('base64-js');
const sysUtil = require('util');
const config = require('../config/config');

// QRCode
const QRCode = require('qr-image');

const { Layer, Shape, RectShape, TextRectShape, RoundRectShape, TextRoundRectShape, ImageShape,SyncStatus } = require('../util/baroboard_canvas');
const fs = require('fs');
const axios = require('axios');


const aims_info = config.external[2];
let aims_ip = 'http://'+aims_info.host + ':' +aims_info.port;
const log = config.debug.log;
const SERVER_URL = config.esl_image_url;

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

const makeLayoutImage = async (rotation,resolution, data,url,params,code) => {
    if(log){console.log('makeLayoutImage called.');}

    // 해상도 정보를 이용해 가로/세로 크기 확인
    const dimens = resolution.split('X');
    const deviceWidth = Number(dimens[0]);
    const deviceHeight = Number(dimens[1]);
    console.log('device dimension : ' + deviceWidth + ', ' + deviceHeight);

    // 1. 레이어 생성
    const layer = new Layer(deviceWidth, deviceHeight);
    
    // 2. Shape 추가
 
    console.log('count of widgets : ' + data.length);
    for (let i = 0; i < data.length; i++) {
        console.log('processing widget #' + i);

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
            console.log(widget.widgetType + ' -> ' + widgetLeft + ', ' + widgetTop + ', ' + widgetWidth + ', ' + widgetHeight + ', ' + widgetText);

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
                // shape1.fontFamily = 'SLGM';
                console.log(shape1.text +":"+shape1.fontSize +"//"+shape1.fontFamily);

            }
        
            // text-align
            console.log('property text-align -> ' + props['text-align']);
            if (props['text-align'] && props['text-align'].length > 0) {
                shape1.textAlign = props['text-align'];
            }


            
            

            // BorderRadius
            let borderRadius = 0;
            if (props['border-top-left-radius'] && props['border-top-left-radius'].length > 0) {
                shape1.borderRadiusTopLeft = true;

                if (borderRadius == 0) {
                    borderRadius = Number(props['border-top-left-radius'].replace('px', ''));
                    console.log('new borderRadius -> ' + borderRadius);
                }
            }

            if (props['border-top-right-radius'] && props['border-top-right-radius'].length > 0) {
                shape1.borderRadiusTopRight = true;
                
                if (borderRadius == 0) {
                    borderRadius = Number(props['border-top-right-radius'].replace('px', ''));
                    console.log('new borderRadius -> ' + borderRadius);
                }
            }

            if (props['border-bottom-left-radius'] && props['border-bottom-left-radius'].length > 0) {
                shape1.borderRadiusBottomLeft = true;
                
                if (borderRadius == 0) {
                    borderRadius = Number(props['border-bottom-left-radius'].replace('px', ''));
                    console.log('new borderRadius -> ' + borderRadius);
                }
            }

            if (props['border-bottom-right-radius'] && props['border-bottom-right-radius'].length > 0) {
                shape1.borderRadiusBottomRight = true;
                
                if (borderRadius == 0) {
                    borderRadius = Number(props['border-bottom-right-radius'].replace('px', ''));
                    console.log('new borderRadius -> ' + borderRadius);
                }
            }

            // display (이름주의)
            console.log('property display -> ' + props['display']);
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
                // if( shape1.text.length>25) {
                //     shape1.text =' ·  '+shape1.text.substring(0,23);
                // }
                // else {
                //     shape1.text = ' ·  '+ shape1.text;
                // }
                // shape1.text = ' ·  '+ shape1.text;
                shape1['display'] = 'inline-block';
                shape1['overflow'] ='hidden';
                console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");
                console.log(shape1);
                
            }
            // 환자명 영문 &국문 구별
            else if (props['class'] == 'firstName') {
               
                shape1.overflow = 'hidden';
                
                if(check_kor.test(shape1.text)) {
                    
                    if(shape1.text.length>=7) {
                        shape1.text = shape1.text.substring(0,7);
                    }
                    console.log(shape1.text);
                }
                else{ 
                    if(shape1.text.length>=10) {
                        
                        shape1.text = shape1.text.substring(0,10);
                    }
                }
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
                widgetFilename = 'caution1.png'
            }
            // BY END 2019-12-11

            

            const shape1 = new ImageShape(widgetFilename, widgetLeft, widgetTop, widgetWidth, widgetHeight);
            console.log('ImageView -> ' + widgetFilename + ', ' + widgetLeft + ', ' + widgetTop + ', ' + widgetWidth + ', ' + widgetHeight);

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
                    console.log('new borderRadius -> ' + borderRadius);
                }
            }

            if (props['border-top-right-radius'] && props['border-top-right-radius'].length > 0) {
                shape1.borderRadiusTopRight = true;
                
                if (borderRadius == 0) {
                    borderRadius = Number(props['border-top-right-radius'].replace('px', ''));
                    console.log('new borderRadius -> ' + borderRadius);
                }
            }

            if (props['border-bottom-left-radius'] && props['border-bottom-left-radius'].length > 0) {
                shape1.borderRadiusBottomLeft = true;
                
                if (borderRadius == 0) {
                    borderRadius = Number(props['border-bottom-left-radius'].replace('px', ''));
                    console.log('new borderRadius -> ' + borderRadius);
                }
            }

            if (props['border-bottom-right-radius'] && props['border-bottom-right-radius'].length > 0) {
                shape1.borderRadiusBottomRight = true;
                
                if (borderRadius == 0) {
                    borderRadius = Number(props['border-bottom-right-radius'].replace('px', ''));
                    console.log('new borderRadius -> ' + borderRadius);
                }
            }
 
            shape1.borderRadius = borderRadius;
            console.log(shape1.text +":"+shape1.fontSize +"//"+shape1.fontFamily);
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
            if (url =='preview') {
                widgetFilename = 'qrcodePreview.png'
            }
            
            
            try {
                const qrContents = QRCode.imageSync(widgetDataCode, { type: 'png', margin: 1 })
                fs.writeFileSync(__dirname + '/../public/index_img/' + widgetFilename, qrContents);
            } catch (err) {
                console.error(err)
            }


            const shape1 = new ImageShape(widgetFilename, widgetLeft, widgetTop, widgetWidth, widgetHeight);
            console.log('QRView -> ' + widgetFilename + ', ' + widgetLeft + ', ' + widgetTop + ', ' + widgetWidth + ', ' + widgetHeight);

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
                    console.log('new borderRadius -> ' + borderRadius);
                }
            }

            if (props['border-top-right-radius'] && props['border-top-right-radius'].length > 0) {
                shape1.borderRadiusTopRight = true;
                
                if (borderRadius == 0) {
                    borderRadius = Number(props['border-top-right-radius'].replace('px', ''));
                    console.log('new borderRadius -> ' + borderRadius);
                }
            }

            if (props['border-bottom-left-radius'] && props['border-bottom-left-radius'].length > 0) {
                shape1.borderRadiusBottomLeft = true;
                
                if (borderRadius == 0) {
                    borderRadius = Number(props['border-bottom-left-radius'].replace('px', ''));
                    console.log('new borderRadius -> ' + borderRadius);
                }
            }

            if (props['border-bottom-right-radius'] && props['border-bottom-right-radius'].length > 0) {
                shape1.borderRadiusBottomRight = true;
                
                if (borderRadius == 0) {
                    borderRadius = Number(props['border-bottom-right-radius'].replace('px', ''));
                    console.log('new borderRadius -> ' + borderRadius);
                }
            }
 
            shape1.borderRadius = borderRadius;
            
            layer.addShape(shape1);

        } else {
            console.log('Unknown widgetType : ' + widget.widgetType);
        }
    }
  
    // JU START 2019-10-15
    // 이미지 회전

    // BY START 2019-12-12
    if( url !=='preview') {
        console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");
        console.log(layer);
        layer.rotation(parseInt(rotation));
    }
    // BY END 2019-12-12
    // JU END 2019-10-15

    // 2. 레이어 그리기
    const drawResult = await layer.draw();
    
    // 3. 이미지 파일로 저장

    let filename;
    // BY START 2019-12-10
    if(url =='preview') {
        filename = '../public/index_img/preview.png';
    }
    else {
        filename = '../public/esl/'+code+'.png';
    }

    
    // BY END 2019-12-10
    const saveResult = await layer.save(filename);
    if (saveResult) {
        console.log(filename + ' created.');
 
    }
    if (url !=='preview') {

    
        // JU START 2019-10-15
        // 3. 단말에 이미지 업로드 요청
        console.log('[STEP 3. 단말에 이미지 업로드 요청]--------------------------------------------------------------------');
        try {

            // 4. BASE64로 이미지 로딩
            console.log('[STEP 4. BASE64로 이미지 로딩]--------------------------------------------------------------------');
            const imageBase64 = await layer.loadAsBase64(filename);
            // console.log('BASE64 Image -> ' + imageBase64);
                    
            // 5. HTTP 전송
            console.log('[STEP 5. HTTP 전송]--------------------------------------------------------------------');
            // BY START 2019-11-25
            
            
            const response1 = await layer.send(filename,url,code);
            // BY END 2019-11-25
            
        
                
        } catch(err) {
            console.log('Error -> ' + err);
        }
        // JU END 2019-10-15
    }
        return filename;
}




/**
 * @Controller(path="/baroboard/device", type="rest", table="baroboard.device")
 */
class BaroboardDevice {

    constructor() {
        this.database = new Database('database_mysql');
    }
  
    /**
     * @RequestMapping(path="/data/update", method="post")
     */
    async updateData(req, res) {
        logger.debug('BaroboardDevice:updateData called for path /baroboard/device/data/update');
  
        const params = param.parse(req);
          
        try {
            const queryParams = {
                sqlName: 'baroboard_device_data_update',
                params: params,
                paramType: {
                    id: 'string',
                    data: 'string'
                }
            }

            const rows2 = await this.database.execute(queryParams);
            util.sendRes(res, 200, 'OK', rows2);
        } catch(err) {
            util.sendError(res, 400, 'Error in execute -> ' + err);
        }
    }
  
    /**
     * @RequestMapping(path="/data/select", method="get")
     */
    async selectData(req, res) {
        logger.debug('BaroboardDevice:selectData called for path /baroboard/device/data/select');
  
        const params = param.parse(req);
          
        try {
            const queryParams = {
                sqlName: 'baroboard_device_data_select',
                params: params,
                paramType: {
                    id: 'string'
                }
            }

            const rows = await this.database.execute(queryParams);

            util.sendRes(res, 200, 'OK', rows);
        } catch(err) {
            util.sendError(res, 400, 'Error in execute -> ' + err);
        }
    }
  

    /**
     * 대시보드의 리스트 조회
     */

    /**
     * @RequestMapping(path="/dashboard/list", method="get")
     */
    async dashboardList(req, res) {
        logger.debug('BaroboardDevice:dashboardList called for path /baroboard/device/dashboard/list');
  
        const params = param.parse(req);
          
        try {
            const queryParams = {
                sqlName: 'baroboard_dashboard_list',
                params: params
            }

            const rows = await this.database.execute(queryParams);

            const result = {
                header:{},
                body: rows
            }
            util.sendRes(res, 200, 'OK', result);
        } catch(err) {
            util.sendError(res, 400, 'Error in execute -> ' + err);
        }
    }
  

    /**
     * 대시보드의 한 그룹 선택 시 서브리스트 조회
     */

    /**
     * @RequestMapping(path="/dashboard/sublist", method="get")
     */
    async dashboardSubList(req, res) {
        logger.debug('BaroboardDevice:dashboardSubList called for path /baroboard/device/dashboard/sublist');
  
        const params = param.parse(req);
          
        try {
            const queryParams = {
                sqlName: 'baroboard_dashboard_sublist',
                params: params,
                paramType: {
                    groupId: 'string'
                }
            }

            const rows = await this.database.execute(queryParams);

            const result = {
                header:{},
                body: rows
            }
            util.sendRes(res, 200, 'OK', result);
        } catch(err) {
            util.sendError(res, 400, 'Error in execute -> ' + err);
        }
    }

    

    // /**
    //  * Legacy 정보 갖고 오기
    //  */

    // /**
    //  * @RequestMapping(path="/dashboard/legacy", method="post")
    //  */
    // legacyInfo (req,res) {
    //     logger.debug('BaroboardDevice:selectLegacy called for path /baroboard/device/ashboard/legacy');
    //     try {
    //         const queryParams2 = {
    //             sqlName:'baroboard_legacy',
    //         }

    //         const rows = this.database.execute(queryParams2);
    //         const result = {
    //             header:{},
    //             body: rows
    //         }
    //         util.sendRes(res, 200, 'OK', result);
    //     } catch(err) {
    //         util.sendError(res, 400, 'Error in execute -> ' + err);
    //     }
        
        
        
    // }
  

    /**
     * 현장운영자 데이터입력 메뉴 클릭 시 해당 부서의 대시보드 표시
     */

    /**
     * @RequestMapping(path="/dashboard/fieldlist", method="get")
     */
    async dashboardFieldList(req, res) {
        logger.debug('BaroboardDevice:dashboardFieldList called for path /baroboard/device/dashboard/fieldlist');
  
        const params = param.parse(req);
          
        try {
            const queryParams = {
                sqlName: 'baroboard_dashboard_fieldlist',
                params: params,
                paramType: {
                    groupName: 'string'
                }
            }

            const rows = await this.database.execute(queryParams);

            const result = {
                header:{},
                body: rows
            }
            util.sendRes(res, 200, 'OK', result);
        } catch(err) {
            util.sendError(res, 400, 'Error in execute -> ' + err);
        }
    }

     /**
     * @RequestMapping(path="/data/preview2", method="post")
     */
    async preview2(req, res) {
        logger.debug('BaroboardDevice:deletePreview called ');
        const params = param.parse(req);
        try {
            const queryParams = {
                sqlName: 'baroboard_dashboard_deletepreview',

            }
            const rows = await this.database.execute(queryParams);
            util.sendRes(res, 200, 'OK',null);
        } catch(err) {
            util.sendError(res, 400, 'Error in execute -> ' + err);
        }
    }

    

    /**
     * @RequestMapping(path="/data/apply", method="post")
     */
    async applyData(req, res) {
        logger.debug('BaroboardDevice:applyData called for path /baroboard/device/data/apply');
  
        const params = param.parse(req);
        
        try {
            // 1. id를 이용해 단말 및 레이아웃 데이터 조회
            console.log('[STEP 1. id를 이용해 단말 및 레이아웃 데이터 조회]--------------------------------------------------------------------');
            const queryParams1 = {
                sqlName: 'baroboard_device_data_select',
                params: params,
                paramType: {
                    id: 'string'
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
            console.log('[STEP 2. layout_data, layout_mapping, device_data 를 이용해 이미지 생성]--------------------------------------------------------------------');
            if (rows1.length > 0) {
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
                
                // mapping 정보와 data 정보를 이용해 layoutData에 실제 데이터 적용

                // mapping example -> layout_mapping
                // {
                //    "item0": {
                //        "title": "환자명"
                //        "target": "text",
                //        "source": "data.patientName"
                //    }
                // }
                //
                
                // data example -> device_data
                // {
                //    "data": {
                //      "patientName": "홍길동"
                //    }
                // }

                const layoutMappingText = Base64Decode(rows1[0].layout_mapping);
                console.log('Layout Mapping -> ' + layoutMappingText);

                const layoutMapping = JSON.parse(layoutMappingText);

                const deviceDataText = Base64Decode(rows1[0].device_data);
                console.log('Device Data -> ' + deviceDataText);

                const deviceData = JSON.parse(deviceDataText);
                console.log(deviceData);
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
                    //console.log('processing mapping #' + i);

                    const curItem = layoutData[i];
                    const curId = curItem.props['id'];

                    if (layoutMapping[curId]) {
                       //console.log('layout mapping for ' + curId + ' found.');

                        // source 속성 확인 (deviceData의 어떤 값을 사용할 것인지 지정하는 속성)
                        // ex) data.patientId
                        if (layoutMapping[curId]['source']) {
                            //console.log('source attribute for data found : ' + layoutMapping[curId]['source']);

                            // . 으로 구분된 source 값을 이용해 deviceData에서 해당 값을 찾아냄
                            const dataAttr = layoutMapping[curId]['source'];
                            const curAttrs = dataAttr.split('.');
                            let curValue = deviceData;
                            for (let j = 0; j < curAttrs.length; j++) {
                                curValue = curValue[curAttrs[j]];
                            }
                            //console.log('curValue : ' + JSON.stringify(curValue));

                            // operator가 있는 경우 operator 적용
                            if (layoutMapping[curId]['operator']) {
                                console.log('operator found.');
                                const operatorObj = layoutMapping[curId]['operator'];

                                // operator name에 따라 분기
                                if (operatorObj.name == 'switch') {
                                    console.log('switch found');

                                    // deviceData의 값은 ,로 구분된 값이며,
                                    // 이 값 중 지정한 순서에 맞는 값을 선택
                                    if (operatorObj.condition1 == 'array') {
                                        console.log('array found');
                                    
                                        // curValue의 값을 , 로 구분한 후 순서 확인
                                        console.log(curValue);
                                        let curValues;
                                        try  {
                                            curValues = curValue.split(',');
                                        }catch (err) {
                                            curValues = curValue;
                                        }
                                        
                                        const indexStr = operatorObj.condition2;
                                        const indexInt = Number(indexStr);
                                        console.log('index no : ' + indexInt);

                                        if (curValues.length > indexInt) {
                                            curValue = curValues[indexInt].trim();
                                            console.log('new current value -> ' + curValue);
                                        } else {
                                            console.log('index no is not valid.');
                                            curValue = '';
                                        }


                                    // deviceData의 값에 따라 value 속성의 값 중 
                                    // 하나를 선택    
                                    } else if (operatorObj.condition1 == 'equal') {
                                        console.log('equal found');
                                        
                                        if (operatorObj.value[String(curValue)]) {
                                            curValue = operatorObj.value[String(curValue)];
                                        } else {
                                            console.log('value for ' + String(curValue) + 'is not found.');
                                            curValue = '';
                                        }
                                        
                                    }
                                }

                                console.log('new current value -> ' + curValue);
                            }
                            
                            // 찾아낸 값을 현재 아이템의 속성을 적용
                            // 적용할 속성은 레이아웃 매핑의 target에 있음
                            // ex) TextView의 경우, "target":"text"
                            curItem.props[layoutMapping[curId]['target']] = curValue;
                            
                        } else {
                            console.log('source attribute for data not found');
                        }
                    } else {
                        console.log('layout mapping for ' + curId + ' not found.');
                    }
                }


                // 이미지 생성 및 파일 저장 메소드 호출

                const filename = makeLayoutImage(layout_rotation,layoutResolution, layoutData,aims_ip,params,rows1[0].code);
            
                /*
                // JU START 2019-10-15
                // 3. 단말에 이미지 업로드 요청
                console.log('[STEP 3. 단말에 이미지 업로드 요청]--------------------------------------------------------------------');
                try {
                    
                    // // 해상도 정보를 이용해 가로/세로 크기 확인
                    // const dimens = layoutResolution.split('X');
                    // const deviceWidth = Number(dimens[0]);
                    // const deviceHeight = Number(dimens[1]);

                    // // 레이어 생성
                    // const layer = new Layer(deviceWidth, deviceHeight);

                    // 4. BASE64로 이미지 로딩
                    //console.log('[STEP 4. BASE64로 이미지 로딩]--------------------------------------------------------------------');
                    //const imageBase64 = await layer.loadAsBase64(filename);
                    //console.log('BASE64 Image -> ' + imageBase64);
                
                    // 5. HTTP 전송
                    console.log('[STEP 5. HTTP 전송]--------------------------------------------------------------------');
                    const response1 = await layer.send(filename);
                    if (response1) {
                        console.log(`response1 status -> ${response1.status}, ${response1.statusText}`);
                        if (response1.status == 200) {
                            console.log(`send completed -> ${response1.data.filename}`);
                        } else {
                            console.log(`send failed`);
                        }
                    } else {
                        console.log('Error in sending.');
                    }
            
                } catch(err) {
                    console.log('Error -> ' + err);
                }
                // JU END 2019-10-15
                */
            }
            console.log('start to Update esl_date');
            var params2 = {
                labelcode:rows1[0].code
            }
            const queryParams = {
                sqlName: 'baroboard_device_update_esldate2',
                params: params2,
                paramType: {
                    labelcode:'string'
                }
            }

            const rows = await this.database.execute(queryParams);
            console.log(rows);
            


            const result = {
                header:{},
                body: rows1
            }
            util.sendRes(res, 200, 'OK', result);
        } catch(err) {
            console.log(err);
            util.sendError(res, 400, 'Error in execute -> ' + err);
        }
    }

    /**
     * @RequestMapping(path="/data/preview", method="post")
     */
    async applyData2(req, res) {
        logger.debug('BaroboardDevice:applyData called for path /baroboard/device/data/preview');
  
        const params = param.parse(req);
        
        
        try {
            // 1. id를 이용해 단말 및 레이아웃 데이터 조회
            console.log('[STEP 1. id를 이용해 단말 및 레이아웃 데이터 조회]--------------------------------------------------------------------');
            let queryParams1;
            if(params.id !== 'preview') {
                queryParams1 = {
                    sqlName: 'baroboard_device_data_select',
                    params: params,
                    paramType: {
                        id: 'string'
                    }
                }
            }else {
                queryParams1 = {
                    sqlName: 'baroboard_preview_data',
                    params: params,
                    paramType: {
                        id: 'string'
                    }
                }
            }
            

            const rows1 = await this.database.execute(queryParams1);
            
            

            // 2. layout_data, layout_mapping, device_data 를 이용해 이미지 생성
            console.log('[STEP 2. layout_data, layout_mapping, device_data 를 이용해 이미지 생성]--------------------------------------------------------------------');
            if (rows1.length > 0) {
                // BY START 2019-12-12
                const layout_data = rows1[0].layout_data;
                
                
                // BY END 2019-12-12
                // Base64 decode
                const layoutDataText = Base64Decode(layout_data);

                const layoutResolution = rows1[0].resolution;
                
                const layoutDataObj = JSON.parse(layoutDataText);
                const layoutDataObj2 = changeProperty(layoutDataObj);
                
                // z-index 값을 이용해 정렬
                const layoutData = layoutDataObj2.sort((a, b) => {
                    
                    return a.props['z-index'] < b.props['z-index'] ? -1 : a.props['z-index'] > b.props['z-index'] ? 1 : 0;
                });
                
                
                if(params.id !=='preview') {
                    const layoutMappingText = Base64Decode(rows1[0].layout_mapping);
                    

                    const layoutMapping = JSON.parse(layoutMappingText);

                    const deviceDataText = Base64Decode(rows1[0].device_data);
                    

                    const deviceData = JSON.parse(deviceDataText);

                

                
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
                                            const curValues = curValue.split(',');
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
                            console.log('layout mapping for ' + curId + ' not found.');
                        }
                    }
                }


                // 이미지 생성 및 파일 저장 메소드 호출

                const filename = makeLayoutImage(null,layoutResolution, layoutData,'preview',params);
            }


            const result = {
                header:{},
                body: rows1
            }
            util.sendRes(res, 200, 'OK', result);
        } catch(err) {
            console.log('=======================에러 발생==========================')
            console.log(err);
            util.sendError(res, 400, 'Error in execute -> ' + err);
        }
    }

    

    /**
     * @RequestMapping(path="/goodbattery", method="post")
     */
    async batteryUpdate(req, res) {
        logger.debug('BaroboardDevice:goodBatteryUpdate called ');
        
        const params = param.parse(req);
        console.log('GOOD Battery params!')
        console.log(params);
        
        try {
            const queryParams = {
                sqlName: 'baroboard_goodbattery_update',
                params: params,
                paramType: {
                    device:'string'
                }
            }

            const rows = await this.database.execute(queryParams);
            console.log(rows);
            const result = {
                header:{},
                body: rows
            }
            util.sendRes(res, 200, 'OK', result);
        } catch(err) {
            util.sendError(res, 400, 'Error in execute -> ' + err);
        }
    }

    
    /**
     * @RequestMapping(path="/badbattery", method="post")
     */
    async batteryUpdate2(req, res) {
        logger.debug('BaroboardDevice:badBatteryUpdate called ');
        
        const params = param.parse(req);
          
        try {
            const queryParams = {
                sqlName: 'baroboard_badbattery_update',
                params: params,
                paramType: {
                    device: 'string'
                }
            }

            const rows = await this.database.execute(queryParams);

            const result = {
                header:{},
                body: rows
            }
            util.sendRes(res, 200, 'OK', result);
        } catch(err) {
            util.sendError(res, 400, 'Error in execute -> ' + err);
        }
    }

    /**
     * @RequestMapping(path="/check/usinglayout", method="post")
     */
    async checkUsingLayout(req, res) {
        logger.debug(`check/usinglayout: Data called for path check/usinglayout`);       
        const params = param.parse(req);
        
        try {
            const queryParams = {
                sqlName: 'baroboard_device_check_usinglayout',
                params: params,
                paramType: {
                    id:'string'
                }
            }
            const rows = await this.database.execute(queryParams);
            const result = {
                header:{},
                body: rows
            }
            util.sendRes(res, 200, 'OK', result);
        } catch(err) {
            util.sendError(res, 400, 'Error in execute -> ' + err);
        }
         
    }
    
    /**
     * @RequestMapping(path="/status", method="post")
     */
    async statusUpdate (req,res) {

        const params = param.parse(req);
        console.log('statusUpdate 들어옴');
        
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
        } catch(err) {
            console.log(err);
        }
        
    }
    // BY START 2022-03-02
    

    /**
     * @RequestMapping(path="/statussync", method="post")
     */
     async statusSync(req, res) {
        logger.debug(`sync device Status: Data called for path /baroboard/statussync`);
        const synctostatus = new SyncStatus();       
        const returnBody = await synctostatus.getStatus();
        for(let i = 0 ; i < returnBody.length; i++ ) {
            const queryParams = {
                sqlName: 'baroboard_device_status_update2',
                params: {
                    code:returnBody[i].labelCode,
                    status:returnBody[i].status,
                    status_message:returnBody[i].status
                },
                paramType:{
                    code:'string',
                    status:'string',
                    status_message:'string'
                }
            }
            
            const row = await this.database.execute(queryParams);
        }
        util.sendRes(res, 200, 'OK', returnBody); 
    }

    // BY END 2022-03-02


    /**
     * @RequestMapping(path="/data/mappinglist", method="post")
     */
    async layoutMappingDataList(req, res) {
        logger.debug(`MCITest:layoutMappingData called for path /data/mappinglist`);
        
        const params = param.parse(req);
        
        console.log(params.wardInfo);
        try {
            const queryParams = {
                sqlName: 'baroboard_device_layout_mapper',
                params: params,
                paramType: {
                    wardInfo: 'varchar'
                }
            }
            const rows = await this.database.execute(queryParams);
            const result = {
                header:{},
                body: rows
            }
            util.sendRes(res, 200, 'OK', result);
        } catch(err) {
            util.sendError(res, 400, 'Error in execute -> ' + err);
        }
         
    }
    
    /**
     * @RequestMapping(path="/modify/layout", method="post")
     */
    async modifyLayoutinfo(req, res) {
        logger.debug(`modify layoutinfo: Data called for path /modify/layout`);       
        const params = param.parse(req);
        try {
            const queryParams = {
                sqlName: 'baroboard_device_modify_layout',
                params: params,
                paramType: {
                    id:'string',
                    name:'string',
                    newname:'string'
                }
            }
            const rows = await this.database.execute(queryParams);
            const result = {
                header:{},
                body: rows
            }
            util.sendRes(res, 200, 'OK', result);
        } catch(err) {
            util.sendError(res, 400, 'Error in execute -> ' + err);
        }
         
    }
    /**
     * @RequestMapping(path="/data/esl_request", method="post")
     */
     async darwinPushESLData(req, res) {
        console.log("hohohohoho");
        let params;
        if (res) {
            params = param.parse(req); 
        }
        else {
            params = req;
        }
        darwinPushESLData2(params);
        
    }

}



module.exports = BaroboardDevice;
