const {client, oneUser} = require("./databasepg.js")
const express = require("express")
const bodyParser = require('body-parser')
const session = require("express-session")
const bcrypt = require("bcrypt")
const cookieParser = require("cookie-parser")
const app = express();
require('dotenv').config();
app.use(bodyParser.json())
app.use(cookieParser());
app.use(session({
    resave:true,
    saveUninitialized: true,
    secret: process.env.secret
}))

app.listen(3000);

app.get("/userSession", (req,res)=>{
    res.send(req.session.user);
})
app.get("/logout", (req,res)=>{
    req.session.destroy();
    res.send("User logged out")
})
app.post("/login", login)
app.post("/register", register)

app.post("/createCar", checkSession, createCar)
app.get("/cars", allCars)
app.put('/updateCar/:id', updateCar)
app.delete('/deleteCar/:id', deleteCar)

app.get('/users', allUsers);
app.get('/user/:id', one);
app.post('/addUser', addUser)
app.put('/updateUser/:id', updateUser)
app.delete('/deleteUser/:id', deleteUser)

client.connect()

async function deleteCar(req,res){
    let user = await client.query(`delete from cars where id=${req.params.id}`)
    res.send({"mes":"deleted"})
}

async function updateCar(req,res){
    let id = req.params.id;
    let {make,model,year}=req.body;
    let updateQuery = `update cars set make = '${make}', model = '${model}', year = ${year} where id = ${id}`;
    client.query(updateQuery)
    res.send("updated")
}

async function allCars(req,res){
    res.send((await client.query(`Select * from cars`)).rows)
}

async function createCar(req,res){
    let {model,make,year} = req.body;
    await client.query(`INSERT INTO cars (user_id,model,make,year) values($1,$2,$3,$4)`, [req.session.user.id, model, make,year])
    let car = await client.query(`Select * from cars where user_id=$1`,[req.session.user.id]) 
    res.send(car.rows)
}

async function login(req,res){
    let {email, password} = req.body;
    let user = await client.query(`Select * from registered where email=$1`,[email]) 
    if(user.rows.length==0){return res.send("user not found")} 
    const pwMatch = await bcrypt.compare(password,user.rows[0].password)
    if(!pwMatch){return res.send("wrong password")}

    req.session.user = user.rows[0];
    req.session.save();
    res.send("user logged in");
}
async function register(req,res){
    let {username,email,password} = req.body;

    let user = await client.query(`Select * from registered where email=$1`,[email])
    if(user.rows.length!=0){return res.send({"msg":"email already in use"})}
    const hashedPassword = await bcrypt.hash(password,12)
    await client.query(`INSERT INTO registered (username,email,password) values($1,$2,$3)`, [username, email, hashedPassword])
    res.send("Registered")
}
function checkSession(req,res,next){
    if(req.session.user){
        next();
    }
    else{
        res.send("not logged in")
    }
}


function allUsers(req,res){
    
    client.query(`Select * from Users`, (err,result)=>{
        if(!err){
            res.send(result.rows);
        } else {
            console.log(err.message)
        }
        client.end;
    })
}

async function one(req,res){
    
    /* res.send(oneUser(req.params.id))
    client.end; */
    let user = await client.query(`Select * from Users where id=$1`,[req.params.id]) 
    res.send(user.rows);
}

function addUser(req,res){
    let user = req.body;
    client.query(`INSERT INTO Users (firstname,lastname,location) values($1,$2,$3)`, [user.firstname, user.lastname, user.location],(err,result)=>{
        if(!err){
            res.send("INSERTION WORKED");
        } else {
            res.send(err.message)
        }
        client.end;
    })
}
function updateUser(req,res){
    let id = req.params.id;
    let user = req.body;

    let updateQuery = `update users set firstname = '${user.firstname}', lastname = '${user.lastname}', location = '${user.location}' where id = ${id}`

    client.query(updateQuery,(err,result)=>{
        if(!err){
            res.send("UPDATE WORKED");
        } else {
            res.send(err.message)
        }
        client.end;
    })
}

function deleteUser(req,res){
    let id = req.params.id;

    client.query(`Delete from users where id=${id}`,(err,result)=>{
        if(!err){
            res.send("USER DELETED");
        } else {
            res.send(err.message)
        }
        client.end;
    })
}