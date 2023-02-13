const AccesBD=require('./AccesDB.js');
const parole=require('./parole.js');

const {RolFactory}=require('./roluri.js');
const crypto=require("crypto");
const nodemailer=require("nodemailer");


class Utilizator{
    static tipConexiune="local";
    static tabel="utilizatori"
    static parolaCriptare="tehniciweb";
    static emailServer="farmaciastw@gmail.com";
    static lungimeCod=64;
    static numeDomeniu="localhost:8080";modi
    #eroare;

    constructor({id, username, nume, prenume, email, parola, rol, culoare_chat="black", poza, data_adaugare, data_nasterii, telefon, cod}={}) {
        this.id=id;

        //optional sa facem asta in constructor
        try{
            if(this.checkUsername(username))
                this.username = username;
        }
        catch(e){ this.#eroare=e.message}

        for(let prop in arguments[0]){
            this[prop]=arguments[0][prop]
        }
        if(this.rol)
            this.rol=this.rol.cod? RolFactory.creeazaRol(this.rol.cod):  RolFactory.creeazaRol(this.rol);
        console.log(this.rol);

        this.#eroare="";
    } 

    checkName(nume){
        return nume!="" && nume.match(new RegExp("^[A-Z][a-z]+$")) ;
    }

    set setareNume(nume){
        if (this.checkName(nume)) this.nume=nume
        else{
            throw new Error("Nume gresit")
        }
    }

    /*
    * folosit doar la inregistrare si modificare profil
    */
    set setareUsername(username){
        if (this.checkUsername(username)) this.username=username
        else{
            throw new Error("Username gresit")
        }
    }

    checkUsername(username){
        return username!="" && username.match(new RegExp("^[A-Za-z0-9#_./]+$")) ;
    }

    static criptareParola(parola){
        return crypto.scryptSync(parola,Utilizator.parolaCriptare,Utilizator.lungimeCod).toString("hex");
    }

    salvareUtilizator(){
        let parolaCriptata=Utilizator.criptareParola(this.parola);
        let utiliz=this;
        let token=parole.genereazaToken(50);
        let token2=Math.round(Date.now() / 1000);
        let cod = token + "-" + token2;
        AccesBD.getInstanta(Utilizator.tipConexiune).insert({tabel:Utilizator.tabel,campuri:["username","nume","prenume","parola","email","culoare_chat","cod","poza","telefon","data_nasterii"],valori:[`'${this.username}'`,`'${this.nume}'`,`'${this.prenume}'`,`'${parolaCriptata}'`,`'${this.email}'`,`'${this.culoare_chat}'`,`'${cod}'`,`'${this.poza}'`,`'${this.telefon}'`,`'${this.data_nasterii}'`]}, function(err, rez){
            if(err)
                console.log(err);
            
            utiliz.trimiteMail("Salut stimate " + utiliz.nume,"Username-ul tau este "+utiliz.username + " pe site-ul Farmacias",
            `Username-ul tau este ${utiliz.username} pe site-ul <b><i><u>Farmacias</u></i></b> <p><a href='http://${Utilizator.numeDomeniu}/cod_mail/${cod}/${utiliz.username}'>Click aici pentru confirmare</a></p>`,
            )
        });
    }


    async trimiteMail(subiect, mesajText, mesajHtml, atasamente=[]){
        var transp= nodemailer.createTransport({
            service: "gmail",
            secure: false,
            auth:{//date login 
                user:Utilizator.emailServer,
                pass:"bnxsgkalvwqvapub"
            },
            tls:{
                rejectUnauthorized:false
            }
        });
        //genereaza html
        await transp.sendMail({
            from:Utilizator.emailServer,
            to:this.email, //TO DO
            subject:subiect,//"Te-ai inregistrat cu succes",
            text:mesajText, //"Username-ul tau este "+username
            html: mesajHtml,// `<h1>Salut!</h1><p style='color:blue'>Username-ul tau este ${username}.</p> <p><a href='http://${numeDomeniu}/cod/${username}/${token}'>Click aici pentru confirmare</a></p>`,
            attachments: atasamente
        })
        console.log("trimis mail");
    }
   
    static async getUtilizDupaUsernameAsync(username){
        if (!username) return null;
        try{
            let rezSelect= await AccesBD.getInstanta(Utilizator.tipConexiune).selectAsync(
                {tabel:"utilizatori",
                campuri:['*'],
                conditiiAnd:[`username='${username}'`]
            });
            if(rezSelect.rowCount!=0){
                return new Utilizator(rezSelect.rows[0])
            }
            else {
                console.log("getUtilizDupaUsernameAsync: Nu am gasit utilizatorul");
                return null;
            }
        }
        catch (e){
            console.log(e);
            return null;
        }
        
    }
    static getUtilizDupaUsername (username,obparam, proceseazaUtiliz){
        if (!username) return null;
        let eroare=null;
        AccesBD.getInstanta(Utilizator.tipConexiune).select({tabel:"utilizatori",campuri:['*'],conditiiAnd:[`username=$1`]}, function (err, rezSelect){
            if(err){
                console.error("Utilizator:", err);
                console.log("Utilizator", rezSelect.rows.length);
                //throw new Error()
                eroare=-2;
            }
            else if(rezSelect.rowCount==0){
                eroare=-1;
            }
            //constructor({id, username, nume, prenume, email, rol, culoare_chat="black", poza}={})
            let u= new Utilizator(rezSelect.rows[0])
            proceseazaUtiliz(u, obparam, eroare);
        }, [username]);
    }

    areDreptul(drept){
        return this.rol.areDreptul(drept);
    }

    modifica({id, username, nume, prenume, email, parola, rol, culoare_chat="black", cod, poza, data_adaugare, data_nasterii, telefon}){
        campuri = ["id", "username","nume","prenume","ema   il","parola", "rol","culoare_chat","cod","poza","data_adaugare", "data_nasterii", "telefon"]
        valori = []
        for(let prop in arguments[0]){
            valori.push(arguments[0][prop])
        }
        AccesBD.getInstanta(Utilizator.tipConexiune).updateParametrizat({tabel:"utilizatori", campuri:campuri, valori:valori, conditiiAnd:[`id = ${this.id}`]}, (err, rez)=>{
            if(err){
                console.error(err);
            }
        }, []); 
    }

    sterge(){
        AccesBD.getInstanta(Utilizator.tipConexiune).delete({tabel:"utilizatori", conditiiAnd:[`id = ${this.id}`]}, (err, rez) => {
            if(err){
                console.error(err);
            }
        })
    }

    static cauta(obParam, callback) {
        conditii = []
        for(let prop in obParam){
            conditii.push(`${prop} = ${obParam[prop]}`)
        }
        let eroare = null;
        AccesBD.getInstanta(Utilizator.tipConexiune).select({tabel:"utilizatori",campuri:['*'],conditiiAnd:conditii}, (err, rez)=> {
            if(err){
                console.error("Utilizator:", err);
                console.log("Utilizator",rezSelect.rows.length);
                //throw new Error()
                eroare=-2;
            }
            else if(rezSelect.rowCount==0){
                eroare=-1;
            }
            utilizatori = []
            for(let row in rez.rows){
                utilizatori.push(new Utilizator(row))
            }
            callback(eroare, utilizatori)
        }, [])
    }

    static async cautaAsync(obParam, callback){
        conditii = []
        for(let prop in obParam){
            conditii.push(`${prop} = ${obParam[prop]}`)
        }
        try{
            let rezSelect= await AccesBD.getInstanta(Utilizator.tipConexiune).selectAsync(
                {tabel:"utilizatori",
                campuri:['*'],
                conditiiAnd:conditii
            });
            let utilizatori = []
            if(rezSelect.rowCount!=0){
                for(row in rez.rows){
                    utilizatori.push(new Utilizator(row))
                }
            }
            return utilizatori
        }
        catch (e){
            console.log(e);
            return null;
        }
    }
}
module.exports={Utilizator:Utilizator}