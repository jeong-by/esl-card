/**
 * Canvas Drawing Text in Rectangle
 * 
 * @author Mike
 */


//import fs from 'fs';
//import path from 'path';
//import axios from 'axios';

//import { createCanvas, loadImage } from 'canvas';

'use strict'
 
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const config = require('../config/config');

const { createCanvas, loadImage } = require('canvas');



var SERVER_URL = '';

const log = config.debug.log;



// 모서리 둥근 사각형 그리기
const drawRoundRect = (ctx, x, y, width, height, radius, fill, stroke, radiusTopLeft, radiusTopRight, radiusBottomLeft, radiusBottomRight) => {
    if (typeof fill == "undefined" ) {
        fill = false;
    }
    
    if (typeof stroke == "undefined" ) {
        stroke = false;
    }

    if (typeof radius === "undefined") {
        radius = 5;
    }

    ctx.beginPath();

    if (radiusTopLeft) {
        ctx.moveTo(x + radius, y);  // 1
    } else {
        ctx.moveTo(x, y);  // 1
    }
     
    if (radiusTopRight) {
        ctx.lineTo(x + width - radius, y);  // 2
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius); // 3
    } else {
        ctx.lineTo(x + width, y);  // 2
    }
    
    if (radiusBottomRight) {
        ctx.lineTo(x + width, y + height - radius);  // 4
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height); // 5
    } else {
        ctx.lineTo(x + width, y + height);  // 4
    }

    if (radiusBottomLeft) {
        ctx.lineTo(x + radius, y + height);  // 6
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);  // 7
    } else {
        ctx.lineTo(x, y + height);  // 6
    }
    
    if (radiusTopLeft) {
        ctx.lineTo(x, y + radius);  // 8
        ctx.quadraticCurveTo(x, y, x + radius, y);  // 9
    } else {
        ctx.lineTo(x, y);  // 8
    }

    ctx.closePath();
    if (log ==true) {
        console.log('drawRoundRect radius, fill, stroke -> ' + radius + ', ' + fill + ', ' + stroke);
    }
    if (stroke) {
        ctx.stroke();
    }
    if (fill) {
        ctx.fill();
    }        
}

class Layer {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.canvas = createCanvas(this.width, this.height);
        this.context = this.canvas.getContext('2d');

        this.backgroundColor = '#DFDFDF';

        this.shapeArray = [];
    }

    addShape(shape) {
        this.shapeArray.push(shape);
    }

    // JU START 2019-10-15
    rotation(degrees) {
        
        const width = this.canvas.width; // 960
        const height = this.canvas.height; // 640

        if(degrees == 90 || degrees == 270) {
            this.canvas.width = height;
            this.canvas.height = width;

            this.context.translate(height/2, width/2); // translate to rectangle center 
            this.context.rotate(degrees*Math.PI/180); // rotate
            this.context.translate(-(width/2), -(height/2)); // translate back
  
        } else {
            this.context.translate(width/2, height/2); // translate to rectangle center 
            this.context.rotate(degrees*Math.PI/180); // rotate
            this.context.translate(-(width/2), -(height/2)); // translate back
        }

    }
    // JU END 2019-10-15

    draw() {
        return new Promise((resolve, reject) => {
            this.doDraw((err, result) => {
                if (err) {
                    reject(err);
                }

                resolve(result);
            })
        });
    }

    doDraw(callback) {
        

        this.context.fillStyle = this.backgroundColor;
        this.context.fillRect(0, 0, this.width, this.height);

        for (let i = 0; i < this.shapeArray.length; i++) {
            this.shapeArray[i].draw(this.context);
        }

        callback(null, true);
    }

    save(filename) {
        return new Promise((resolve, reject) => {
            this.doSave(filename, (err, result) => {
                if (err) {
                    reject(err);
                }

                resolve(result);
            })
        });
    }

    doSave(filename, callback) {
        console.log('Layer:save called.');

        const out = fs.createWriteStream(path.join(__dirname, filename));
        const stream = this.canvas.createPNGStream().pipe(out);
        out.on('finish', callback(null, true));
    }

    loadAsBase64(filename) {
        return new Promise((resolve, reject) => {
            this.doLoadAsBase64(filename, (err, result) => {
                if (err) {
                    reject(err);
                }

                resolve(result);
            })
        });
    }

    doLoadAsBase64(filename, callback) {
        if (log ==true) {
            console.log(path.join(__dirname, filename));
        }
        const imageBase64 = fs.readFile(path.join(__dirname, filename), 'base64', (err, result) => {
            if (err) {
                callback(err, null);
                return;
            }

            callback(null, result);
        });
    }

    async send(filename,url,code) {
        // BY START 2019-11-18
        SERVER_URL =url;
        
        // BY END 2019-11-18
        
        const requestUrl = SERVER_URL + '/labels/contents/image?stationCode=DEFAULT_STATION_CODE';

        
        
       

        // BY START 2019-12-12
        // code --> 단말기의 라벨 코드 값
        // BY END 2019-12-12
        

        // JU START 2019-10-15
        const curFilename = path.join(__dirname, filename);
        curFilename.replace("\\", "\\\\");
        
        // JU END 2019-10-15

        var postData = {
            labels: [
                {
                    contents:[
                        {
                            contentType:"IMAGE",
                            fileName:curFilename,
                            imgBase64:"",
                            imgUrl:"",
                            pageIndex:1
                        }
                    ],
                    frontPage:1,
                    // JU START 2019-10-15
                    labelCode:code
                    // JU END 2019-10-15
                }
            ]
        };



        let axiosConfig = {
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json;charset=UTF-8",
                "Access-Control-Allow-Origin": "*",
                
                
            }
        };
        return new Promise((resolve,reject) => {
            try {
                axios.post(requestUrl, postData, axiosConfig)
                    .then((res) => {
                        resolve(res.status); 
                    })
            }catch {
                reject(400);
            }
        })

	}
	
}

class Shape {
    constructor() {

    }

    draw(context) {
        if(log ==true) {
            console.log('Shape:draw called.');
    
        }
    }
}

class RectShape extends Shape {
    constructor(left, top, width, height) {
        super();
        
        this.stroke = true;
        this.fill = false;

        this.strokeStyle = 'black';
        this.fillStyle = 'white';
        this.lineWidth = 2;

        this.left = left;
        this.top = top;
        this.width = width;
        this.height = height;
    }
    
    draw(context) {
        if (log ==true) {
            console.log('RectShape:draw called.');
        }
        super.draw(context);

        // stroke rectangle
        if (this.stroke) {
            if (this.strokeStyle) {
                context.strokeStyle = this.strokeStyle;
            }

            if (this.lineWidth) {
                context.lineWidth = this.lineWidth;
            }

            if (this.fillStyle) {
                context.fillStyle = this.fillStyle;
            }

            context.strokeRect(this.left, this.top, this.width, this.height);
        }

        // fill rectangle
        if (this.fill) {
            context.fillStyle = this.fillColor;
            context.fillRect(this.left, this.top, this.width, this.height);
        }
    }
}

class TextRectShape extends RectShape {
    constructor(left, top, width, height, text) {
        super(left, top, width, height);

        this.text = text;

        this.fontFamily = 'NanumGothic';
        this.fontSize = '18px';
        this.fontWeight = '';
        this.textColor = 'black';
        this.textAlign = "center";
        this.textBaseline = "middle";
    }

    draw(context) {
        if (log ==true) {
            console.log('TextRectShape:draw called.');
        }
        super.draw(context);

        // draw text
        context.fillStyle = this.textColor;
        if (log ==true) {
            console.log('textColor -> ' + this.textColor);
        }
        context.font = this.fontWeight + ' ' + this.fontSize + ' ' + this.fontFamily;
        //context.font = this.fontSize + ' ' + this.fontFamily;
        if (log ==true) {
            console.log('font -> ' + this.fontWeight + ' ' + this.fontSize + ' ' + this.fontFamily);
        }
        //context.textAlign = this.textAlign;
        //context.textBaseline = this.textBaseline;


        let textX;
        let textY;

        if (this.textAlign == 'center') {
            textX = this.left + this.width/2;
            textY = this.top + this.height/2 + this.fontSize/2;
        } else if (this.textAlign == 'left') {
            textX = this.left;
            textY = this.top + this.height/2 + this.fontSize/2;
        } else if (this.textAlign == 'right') {
            textX = this.left + this.width;
            textY = this.top + this.height/2 + this.fontSize/2;
        }

        context.fillText(this.text, textX, textY);


        //const centerWidth = this.left + this.width/2;
        //const centerHeight = this.top + this.height/2;
        //console.log('textColor top, left -> ' + centerWidth + ', ' + centerHeight);
        //context.fillText(this.text, centerWidth, centerHeight);
    }
}
  

class RoundRectShape extends Shape {
    constructor(left, top, width, height) {
        super();
        
        this.stroke = false;
        this.fill = false;

        this.strokeStyle = 'black';
        this.fillStyle = 'white';
        this.lineWidth = 2;

        this.left = left;
        this.top = top;
        this.width = width;
        this.height = height;

        this.borderRadius = 10;
        this.borderRadiusTopLeft = false;
        this.borderRadiusTopRight = false;
        this.borderRadiusBottomLeft = false;
        this.borderRadiusBottomRight = false;
    }
    
    draw(context) {
        if (log ==true) {
            console.log('RoundRectShape:draw called.');
        }
        super.draw(context);

        // stroke rectangle
        if (this.stroke) {
            if (this.strokeStyle) {
                context.strokeStyle = this.strokeStyle;
            }

            if (this.lineWidth) {
                context.lineWidth = this.lineWidth;
            }

            if (this.fillStyle) {
                context.fillStyle = this.fillStyle;
            }
        }

        // fill rectangle
        if (this.fill) {
            context.fillStyle = this.fillColor;
        }

        drawRoundRect(context, this.left, this.top, this.width, this.height, 
            this.borderRadius, this.fill, this.stroke, 
            this.borderRadiusTopLeft, this.borderRadiusTopRight,
            this.borderRadiusBottomLeft, this.borderRadiusBottomRight);
        
    }
}

class TextRoundRectShape extends RoundRectShape {
    constructor(left, top, width, height, text) {
        super(left, top, width, height);

        this.text = text;

        this.fontFamily = 'NanumGothicBold';
        this.fontSize = '18px';
        this.fontWeight = '';
        this.textColor = 'black';
        this.textAlign = "center";
        this.textBaseline = "middle";
    }

    draw(context) {
        if (log ==true) {
            console.log('TextRoundRectShape:draw called.');
        }
        super.draw(context);

        // draw text
        context.fillStyle = this.textColor;
        if (log ==true) {
            console.log('textColor -> ' + this.textColor);
        }
        context.font = this.fontWeight + ' ' + this.fontSize + ' ' + this.fontFamily;
        //context.font = this.fontSize + ' ' + this.fontFamily;
        

        //context.textAlign = this.textAlign;
        //context.textBaseline = this.textBaseline;

        let textX;
        let textY;

        const textWidth = context.measureText(this.text).width;
        const textHeight = Number(this.fontSize.replace('px', ''));
        if (log ==true) {
            console.log('text measured -> ' + textWidth + ', ' + textHeight);
        }
        if (this.textAlign == 'center') {
            textX = this.left + this.width/2 - textWidth/2;
            textY = this.top + this.height/2 + textHeight/3;
        } else if (this.textAlign == 'left') {
            textX = this.left;
            textY = this.top + this.height/2 + textHeight/3;
        } else if (this.textAlign == 'right') {
            textX = this.left + this.width - textWidth;
            textY = this.top + this.height/2 + textHeight/3;
        }
        if (log ==true) {
            console.log('fillText -> ' + this.text + ' ' + textX + ' ' + textY);
        }
        context.fillText(this.text, textX, textY);

        //const centerWidth = this.left + this.width/2;
        //const centerHeight = this.top + this.height/2;
        //console.log('textColor top, left -> ' + centerWidth + ', ' + centerHeight);
        //context.fillText(this.text, centerWidth, centerHeight);

    }
}
  

class ImageShape extends Shape {
    constructor(filename, left, top, width, height) {
        super();

        this.filename = filename;
        this.left = left;
        this.top = top;
        this.width = width;
        this.height = height;
    }
    
    async draw(context) {
        if (log ==true) {
            console.log('ImageShape:draw called.');
        }
        super.draw(context);

        // draw image
        try {
            if (this.filename) {
                const curPath = path.join(__dirname + '/../uploads', this.filename);
                if (log ==true) {
                    console.log('curPath -> ' + curPath);
                }
                const image = await loadImage(curPath);
                context.drawImage(image, this.left, this.top, this.width, this.height);
                if (log ==true) {
                    console.log('drawImage completed.');
                }
            } else {
                console.log('image filename is null.');
            }
        } catch(err) {
            //console.log('Error in drawImage -> ' + err);
        }
    }
}




// load custom font
var Canvas = require('canvas')

function fontFile (name) {
    return path.join(__dirname, '../public/fonts/', name)
}

Canvas.registerFont(fontFile('NanumGothicR.ttf'), { family: 'NanumGothic' });
Canvas.registerFont(fontFile('NanumGothicB.ttf'), { family: 'NanumGothicBold' });
Canvas.registerFont(fontFile('NanumGothicEB.ttf'), { family: 'NanumGothicExtraBold' });
Canvas.registerFont(fontFile('NanumGothicL.ttf'), { family: 'NanumGothicLight' });

Canvas.registerFont(fontFile('NanumBarunGothicR.ttf'), { family: 'NanumBarunGothic' });
Canvas.registerFont(fontFile('NanumBarunGothicB.ttf'), { family: 'NanumBarunGothicBold' });
Canvas.registerFont(fontFile('NanumBarunGothicL.ttf'), { family: 'NanumBarunGothicLight' });
Canvas.registerFont(fontFile('NanumBarunGothicUL.ttf'), { family: 'NanumBarunGothicUltraLight' });

Canvas.registerFont(fontFile('NanumSquareR.ttf'), { family: 'NanumSquare' });
Canvas.registerFont(fontFile('NanumSquareB.ttf'), { family: 'NanumSquareBold' });
Canvas.registerFont(fontFile('NanumSquareEB.ttf'), { family: 'NanumSquareExtraBold' });
Canvas.registerFont(fontFile('NanumSquareL.ttf'), { family: 'NanumSquareLight' });

// BY START 2019-12-26 
Canvas.registerFont(fontFile('SLGM.ttf'), { family: 'SLGM' });
// BY END 2019-12-26

//Canvas.registerFont(fontFile('SECPTL.TTF'), { family: 'SecPtL' })


module.exports = { Layer, Shape, RectShape, TextRectShape, RoundRectShape, TextRoundRectShape, ImageShape };
