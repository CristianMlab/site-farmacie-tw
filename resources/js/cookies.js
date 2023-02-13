function setCookie(nume, val, timpExpirare){
    d=new Date();
    d.setTime(d.getTime()+timpExpirare)
    document.cookie=`${nume}=${val}; expires=${d.toUTCString()}`;
}

function getCookie(nume){
    vectorParametri=document.cookie.split(";") // ["a=10","b=ceva"]
    for(let param of vectorParametri){
        if (param.trim().startsWith(nume+"="))
            return param.split("=")[1]
    }
    return null;
}

function deleteCookie(nume){
    console.log(`${nume}; expires=${(new Date()).toUTCString()}`)
    document.cookie=`${nume}=0; expires=${(new Date()).toUTCString()}`;
}


function accesare(id){
    setCookie("ultimul_produs", id, 600000);
}

window.addEventListener("load", function(){
    if (getCookie("acceptat_banner")){
        document.getElementById("bannertwo").style.display="none";
    }

    if (getCookie("ultimul_produs")){
        document.getElementById("despre7").firstElementChild.innerHTML = "Ultimul Produs Accesat = " + getCookie("ultimul_produs");
    }

    this.document.getElementById("ok_cookies").onclick=function(){
        console.log(document.getElementById("bannertwo"));
        document.getElementById("bannertwo").style.display="none";
        setCookie("acceptat_banner",true,6000000);
    }
})
