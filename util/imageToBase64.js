const fs = require('fs');
const path = require('path');

// 'D:\\ubiaccess-server_esl\\output\\03D62FB1BA97.png'
var filename = '../output/03D62FB1BA97.png';
var filepath = path.join(__dirname, filename);
console.log('filepath -> ' + filepath);

//var base64str = imageToBase64(filepath);
var base64str = fs.readFileSync(filepath, 'base64');
console.log("base64str -> " + base64str.substring(0, 20) + '...' + base64str.substring(base64str.length - 20, base64str.length));
	
function imageToBase64(file) {
	return fs.readFileSync(file, 'base64');
}
