let thisModule = [
    {id:1, type:'rest', base:'', unit:'person'},
    {id:2, type:'path', path:'/profile/list', method:['get','post'], file:'profile-controller', func:'list'},
    {id:3, type:'path', path:'/profile/get', method:['get','post'], file:'profile-controller', func:'get'},
    {id:4, type:'path', path:'/profile/add', method:['get'], file:'profile-controller', func:'add'},
    {id:5, type:'path', path:'/profile/upload', method:['post'], file:'profile-controller', func:'upload', upload:true},
    {id:6, type:'path', path:'/test/set_cookie', method:['get'], file:'test-controller', func:'set_cookie'},
    {id:7, type:'path', path:'/test/show_cookie', method:['get'], file:'test-controller', func:'show_cookie'},
    // {id:12,type:'post',  path:'/baroboard/image/upload', method:['post'],file:'file',  upload:'imageFile'},
]

thisModule.baseDir = 'controller';

module.exports = thisModule;