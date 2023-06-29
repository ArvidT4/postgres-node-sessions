const {client, oneUser} = require("./databasepg.js")
const express = require("express")
const bodyParser = require('body-parser')
const session = require("express-session")
const bcrypt = require("bcrypt")
const fu = require("express-fileupload");
const cookieParser = require("cookie-parser")
const cors = require('cors')
const uuidv4 = require('uuid').v4
const app = express();

require('dotenv').config();
app.use(cors())
app.use("/pictures",express.static("pictures"));
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json())
app.use(express.json());
app.use(cookieParser());
app.use(fu())
const IP = require('ip');
app.use(session({
    
    /* expires: new Date(Date.now()+(60*60*24)),
    cookie: {maxAge:30000}, */
    resave:true,
    saveUninitialized: true,
    secret: process.env.secret,
    cookie: {secure:true, httpOnly:true, sameSite:"lax"}
}))

app.listen(3000);

app.post("/files", (req,res)=>{
    console.log("Files",req.files)
    console.log("body",req.body)
    res.json("worked")
})


app.get("/userSession", (req,res)=>{
    res.send("fetch test");
})
app.post("/logout", async (req,res)=>{
    let sessionId = req.headers.id
    /* let session = await client.query("SELECT *FROM sessions where session_id=$1 and ip_address=$2",[sessionId,session.rows[0].ip_address]) */
    await client.query("DELETE FROM sessions where session_id=$1",[sessionId])
    res.set('Set-Cookie', `session=null`)
    res.send({"mes":"User logged out"})
})

app.post("/loginTest",loginTest)
app.post("/register", register)

app.post("/createCar", checkSession, createCar)
app.get("/cars",checkSession, allCars)
app.put('/updateCar/:id',checkSession, updateCar)
app.delete('/deleteCar/:id',checkSession, deleteCar)




client.connect()




async function deleteCar(req,res){
    let user = await client.query(`delete from cars where id=${req.params.id}`)
    res.send({"mes":"deleted"})
}

async function updateCar(req,res){
    let id = req.params.id;
    console.log(req.body)
    let {make,model,year}=req.body;
    let updateQuery = `update cars set make = '${make}', model = '${model}', year = ${year} where id = ${id}`;
    client.query(updateQuery)
    res.send((await client.query(`Select * from cars`)).rows)
}

async function getUser(sessionID){
    let session = await client.query(`SELECT * FROM sessions where session_id=$1`,[sessionID])
    //console.log(session.rows[0])
    let user = await client.query(`SELECT * FROM registered where email=$1`,[session.rows[0].email])
    return user.rows[0]
}

async function allCars(req,res){
    try{
        let user = await getUser(req.headers.id)
        //console.log(user.rows[0])
        let cars = await client.query(`Select * from cars where user_id=$1`,[user.id])
        res.send(cars.rows)
    }
    catch(err){res.send(err)}
    
}

async function createCar(req,res){
    let {img} = req.files;
    console.log(img) 
    let {model,make,year} = req.body;
    console.log(req.body)
    let user = await getUser(req.headers.id)
    let imageName = img.name.split(".")
    let imgFile = "pictures/"+user.email+"_"+Date.now()+"."+imageName[1]
    req.files.img.mv(imgFile);
    
    
    await client.query(`INSERT INTO cars (user_id,model,make,year,image) values($1,$2,$3,$4,$5)`, [user.id, model, make,JSON.parse(year),imgFile])
    let car = await client.query(`Select * from cars where user_id=$1`,[user.id]) 
    res.send(car.rows)
}

async function loginTest(req,res){
    let {email, password} = req.body;
    
    let user = await client.query(`Select * from registered where email=$1`,[email]) 
    if(user.rows.length==0){return res.send({"mes":"user not found"})} 
    const pwMatch = await bcrypt.compare(password,user.rows[0].password)
    if(!pwMatch){return res.send({"mes":"wrong password"})}

    const ipAddress = IP.address();
    const hashedIpAddress = await bcrypt.hash(ipAddress,12)
    let date = new Date()
    date.setDate(date.getDate() + 1);
    const sessionId = uuidv4();
    let session = await client.query("SELECT *FROM sessions")

    
    session.rows.forEach(element => {
        let ip = bcrypt.compare(ipAddress,element.ip_address)
        if(ip){
            client.query("DELETE FROM sessions where id=$1",[element.id])
        }
        
    });
    


    await client.query(`INSERT INTO Sessions (expire,ip_address, session_id,email) values($1,$2,$3,$4)`, [date, hashedIpAddress, sessionId, user.rows[0].email])
/*     res.setHeader('Set-Cookie', `session=${sessionId}`)
    res.cookie('name', 'gronken') */
    res.send({"mes":"SUCCESS", "cookie":sessionId})

}

async function register(req,res){
    let {username,email,password} = req.body;

    let user = await client.query(`Select * from registered where email=$1`,[email])
    if(user.rows.length!=0){return res.send({"msg":"email already in use"})}
    const hashedPassword = await bcrypt.hash(password,12)
    await client.query(`INSERT INTO registered (username,email,password) values($1,$2,$3)`, [username, email, hashedPassword])
    res.send({"mes":"Registered"})
}
async function checkSession(req,res,next){
    let sessionId = req.headers.id
    let session = await client.query("SELECT *FROM sessions where session_id=$1",[sessionId])
    
    const ipAddress = IP.address();
    if(session.rows.length){
        if(await bcrypt.compare(ipAddress,session.rows[0].ip_address)){
            next();
        }
    }
    else{
        res.send({"mes":"not logged in"})
    }
}


