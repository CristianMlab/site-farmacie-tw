const express= require("express");
const fs=require("fs");


const sharp=require("sharp");
const {Client}=require("pg");
const ejs= require("ejs");
const sass=require("sass");
const path= require('path');
const formidable=require("formidable");
const morgan = require("morgan");

const request=require("request");
const {Utilizator}=require("./module/utilizator.js")

const AccesBD=require("./module/AccesDB.js")
const session=require('express-session');
const Drepturi = require("./module/drepturi.js");

const QRCode= require('qrcode');
//const puppeteer=require('puppeteer');
const mongodb=require('mongodb');

const helmet=require('helmet');
const xmljs=require('xml-js');

app = express();

app.use(morgan('dev'));
app.use(express.static(__dirname + '/resources'))
app.set("view engine", "ejs");

let client = new Client({
    database:"Farmacias",
    user:"cristianmatei",
    password:"parola",
    port:5432
})
client.connect();

const globalObj = {
    errors : {

    },
    images: {

    },
    peSferturi: [[], [], [], []],
    categorii: [],
    administrare: []
}

const loadErrors = () => {
    const continutFisier=fs.readFileSync(__dirname+"/resources/json/errors.json").toString("utf8");
    globalObj.erori=JSON.parse(continutFisier);
}
loadErrors();

const renderError = (res, identificator, titlu, text, imagine) => {
    const eroare = globalObj.erori.info_erori.find(function(elem){
        return elem.identificator==identificator;
    })
    titlu= titlu || (eroare && eroare.titlu) || globalObj.erori.eroare_default.titlu;
    text= text || (eroare && eroare.text) || globalObj.erori.eroare_default.text;
    imagine= imagine || (eroare && globalObj.erori.cale_baza+"/"+eroare.imagine) || globalObj.erori.cale_baza+"/"+globalObj.erori.eroare_default.imagine;
    if(eroare && eroare.status){
        res.status(identificator).render("pages/errors", {identifier: identificator, title:titlu, text:text, errorImg:imagine, categorii: globalObj.categorii})
    }
    else{
        res.render("pages/errors", {identifier: identificator, title: titlu, text: text, errorImg: imagine, categorii: globalObj.categorii});
    }
}

const loadImages = () => {
    const continutFisier=fs.readFileSync(__dirname+"/resources/json/images.json").toString("utf8");
    globalObj.images=JSON.parse(continutFisier);
}
loadImages();

const processImages = async() => {
    await globalObj.images.images.forEach((img) => {
        globalObj.peSferturi[parseInt(img.sfert_ora) - 1].push(img);
        try {
            sharp(__dirname + '/resources/' + globalObj.images.path + img.cale_imagine)
              .resize({
                width: 225,
                height: 225
              })
              .toFile(__dirname + '/resources/' + globalObj.images.path + '/resized/' + img.cale_imagine.split('.')[0] + '-225.png');
            sharp(__dirname + '/resources/' + globalObj.images.path + img.cale_imagine)
              .resize({
                width: 150,
                height: 150
              })
              .toFile(__dirname + '/resources/' + globalObj.images.path + '/resized/' + img.cale_imagine.split('.')[0] + '-150.png');
          } catch (error) {
            console.log(error);
          }
    })

}
processImages();

const loadCategorii = () => {
    client.query('select * from unnest(enum_range(null::legislativ))', (err, rez) => {
        if(err){
            console.log(err);
            renderError(res, 2);
        } else {
            for(row of rez.rows){
                globalObj.categorii.push(row.unnest)
            }
            console.log(globalObj.categorii)
        }
    })
}
loadCategorii();

const loadAdministrare = () => {
    client.query('select * from unnest(enum_range(null::cale_administrare))', (err, rez) => {
        if(err){
            console.log(err);
            renderError(res, 2);
        } else {
            for(row of rez.rows){
                globalObj.administrare.push(row.unnest)
            }
            console.log(globalObj.administrare)
        }
    })
}
loadAdministrare();



app.get(['/', '/index', '/home'], (req, res, next) => {
    let sfert = Math.floor((new Date().getMinutes())/15);
    console.log(sfert)
    res.render('../views/pages/index', {ip: req.ip, imagesArray: globalObj.peSferturi[sfert], galleryPath: globalObj.images.path, categorii: globalObj.categorii})
})

app.get('/sfaturi', (req, res, next) => {
    res.render('../views/pages/sfaturi', {categorii: globalObj.categorii})
})

app.get(['/oferte', '/servicii'], (req, res, next) => {
    renderError(res, 1)
})

app.get('/galerie', (req, res, next) => {
    let sfert = Math.floor((new Date().getMinutes())/15);
    console.log(sfert)
    res.render('../views/pages/gallery', {imagesArray: globalObj.peSferturi[sfert], galleryPath: globalObj.images.path, categorii: globalObj.categorii})
})

app.get('/produse', (req, res, next) => {
    let optiuni = [];
    client.query('select * from unnest(enum_range(null::cale_administrare))', (err, rez) => {
        if(err){
            console.log(err);
            renderError(res, 2);
        } else {
            optiuni = rez.rows;
        }
    })
    let stmt = 'select * from "Medicamente"'
    if(req.query.cat){
        stmt += ` where eliberare='${req.query.cat}'`;
    }
    console.log(stmt)
    client.query(stmt, (err, rez) => {
        if(err){
            console.log(err);
            renderError(res, 2);
        } else {
            res.render("../views/pages/produse", {produse: rez.rows, optiuni:optiuni, categorii: globalObj.categorii, administrare: globalObj.administrare});
        }
    })
})

app.get('/produs/:id', (req, res, next) => {
    const stmt = `select * from "Medicamente" where id=${req.params.id}`;
    console.log(stmt);
    client.query(stmt, (err, rez) => {
        if(err){
            console.log(err);
            renderError(res, 2);
        } else {
            res.render("../views/pages/produs", {prod:rez.rows[0], categorii: globalObj.categorii})
        }
    })
})

app.post("/inregistrare",function(req, res){
    var username;
    console.log("ceva");
    var formular= new formidable.IncomingForm()
    formular.parse(req, function(err, campuriText, campuriFisier ){//4
        console.log("Inregistrare:",campuriText);

        console.log(campuriFisier);
        var eroare="";

        var utilizNou=new Utilizator();
        try{
            utilizNou.setareNume=campuriText.nume;
            utilizNou.setareUsername=campuriText.username;
            utilizNou.email=campuriText.email
            utilizNou.prenume=campuriText.prenume
            
            utilizNou.parola=campuriText.parola;
            utilizNou.culoare_chat=campuriText.culoare_chat;
            utilizNou.telefon = campuriText.telefon;
            utilizNou.data_nasterii = campuriText.datanasterii;
            Utilizator.getUtilizDupaUsername(campuriText.username, {}, function(u, parametru ,eroareUser ){
                if (eroareUser==-1){//nu exista username-ul in BD
                    utilizNou.salvareUtilizator();
                }
                else{
                    eroare+="Mai exista username-ul";
                }

                if(!eroare){
                    res.render("../views/pages/inregistrare", {categorii: globalObj.categorii, raspuns:"Inregistrare cu succes!"})
                    
                }
                else
                    res.render("../views/pages/inregistrare", {categorii: globalObj.categorii, err: "Eroare: "+eroare});
            })
            

            }
            catch(e){ 
                console.log(e.message);
                eroare+= "Eroare site; reveniti mai tarziu";
                console.log(eroare);
                res.render("../views/pages/inregistrare", {categorii: globalObj.categorii, err: "Eroare: "+eroare})
            }
    });

    formular.on("field", function(nume,val){  // 1 
	
        console.log(`--- ${nume}=${val}`);
		
        if(nume=="username")
            username=val;
    }) 
    formular.on("fileBegin", function(nume,fisier){ //2
        console.log("fileBegin");
		
        console.log(nume,fisier);
		//TO DO in folderul poze_uploadate facem folder cu numele utilizatorului    
        let folderUser=path.join(__dirname, "poze_uploadate",username);
        //folderUser=__dirname+"/poze_uploadate/"+username
        console.log(folderUser);
        if (!fs.existsSync(folderUser))
            fs.mkdirSync(folderUser);
        fisier.filepath=path.join(folderUser, fisier.originalFilename)
        //fisier.filepath=folderUser+"/"+fisier.originalFilename

    })    
    formular.on("file", function(nume,fisier){//3
        console.log("file");
        console.log(nume,fisier);
    }); 
});

app.get('/inregistrare', (req, res, next) => {
    res.render("pages/inregistrare", {categorii: globalObj.categorii});
})

app.get('/*.ejs', (req, res, next) => {
    renderError(res, 403)
})

// presupun tot ce ajunge aici ca 404 (nimic altceva nu a raspuns)
app.use((req, res, next) => {
    res.status(404);
    renderError(res, 404);
    return;
})

const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log(`Server started on port ${port}`);
})