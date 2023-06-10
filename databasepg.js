const {Client} = require("pg");
require('dotenv').config();
const client = new Client({
    host:'localhost',
    user:'postgres',
    port:5432,
    password:process.env.dbPassword,
    database:'postgres'
})

/* client.connect(); */

/* client.query(`Select * from test`, (err,res)=>{
    if(!err){
        console.log(res.rows);
    } else {
        console.log(err.message)
    }
    client.end;
})  */

function oneUser(id){
    
    client.query(`Select * from Users where id=${id}`, (err,result)=>{
        if(!err){
            return result.rows;
        } else {
            return err.message
        }
        
    })
    
}

module.exports = {client, oneUser};