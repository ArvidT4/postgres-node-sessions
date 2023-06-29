app.post("/login", login)
app.get('/users', allUsers);
app.get('/user/:id', one);
app.post('/addUser', addUser)
app.put('/updateUser/:id', updateUser)
app.delete('/deleteUser/:id', deleteUser)

async function login(req,res){
    console.log(req.body)
    let {email, password} = req.body;
    console.log("KOLLA",password,email)
    let user = await client.query(`Select * from registered where email=$1`,[email]) 
    if(user.rows.length==0){return res.send({"mes":"user not found"})} 
    const pwMatch = await bcrypt.compare(password,user.rows[0].password)
    if(!pwMatch){return res.send({"mes":"wrong password"})}

    req.session.user = user.rows[0];
    req.session.save();
    res.send({"mes":"user logged in", "session":req.session});
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