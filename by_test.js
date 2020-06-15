function getData (a,b) {
    return new Promise (function (resolve,reject) {
        console.log("setTime 함수 시작");
        setTimeout(() => {
            resolve(1);
        }, 2000);
    })
}

function calculator (a,b) {
    return a*b;
}


getData(20,10).then (function (data) {
    console.log("then 함수 입니다.")
    console.log(data);
}).catch(function (err) {
    console.log("catch함수 입니다.");
    console.log(err);
}) 