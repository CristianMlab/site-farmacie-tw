const express = require("express");
const app = express();
const morgan = require('morgan');
const sharp = require("sharp");
const fs = require('fs');

app.use(morgan('dev'));
app.use(express.static(__dirname + '/resources'))
app.set("view engine", "ejs");

const globalObj = {
    errors : {

    },
    images: {

    },
    peSferturi: [[], [], [], []]
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
        res.status(identificator).render("pages/errors", {identifier: identificator, title:titlu, text:text, errorImg:imagine})
    }
    else{
        res.render("pages/errors", {identifier: identificator, title: titlu, text: text, errorImg: imagine});
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

app.get(['/', '/index', '/home'], (req, res, next) => {
    let sfert = Math.floor((new Date().getMinutes())/15);
    console.log(sfert)
    res.render('../views/pages/index', {ip: req.ip, imagesArray: globalObj.peSferturi[sfert], galleryPath: globalObj.images.path});
})

app.get('/sfaturi', (req, res, next) => {
    res.render('../views/pages/sfaturi')
})

app.get(['/oferte', '/servicii'], (req, res, next) => {
    renderError(res, 1)
})

app.get('/galerie', (reg, res, next) => {
    let sfert = Math.floor((new Date().getMinutes())/15);
    console.log(sfert)
    res.render('../views/pages/gallery', {imagesArray: globalObj.peSferturi[sfert], galleryPath: globalObj.images.path})
})

app.get('/*.ejs', (req, res, next) => {
    renderError(res, 403)
})

// presupun tot ce ajunge aici ca 404 (nimic altceva nu a raspuns)
app.use((req, res, next) => {
    res.status(404);

    if (req.accepts('html')) {
        renderError(res, 404);
        return;
    }

    res.type('txt').send('Not found')
})

const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log(`Server started on port ${port}`);
})