const fs = require("fs");
const dbs = require("dbs");
const path = require("path");
const omuen = require("omuen");
let main = {};

main.database = path.join(__dirname, "./dbase/mail.db");

main.uuid = function(){
  var rowid = [];
  for (var i = 0; i < 40; i++) {
    rowid.push(Math.floor(Math.random() * 10));
  }
  return rowid.join("");
};

main.init = async function(){
  var ok = fs.existsSync(this.database);
  if(!ok){
    var db = dbs.open(this.database);
    await db.run('CREATE TABLE IF NOT EXISTS [meta] ([rowid] PRIMARY KEY, [name], [data]);');
    await db.run('CREATE TABLE IF NOT EXISTS [texts] ([rowid] PRIMARY KEY, [name], [email], [text], [created]);');
    await db.prepare('INSERT INTO [meta] ([rowid],[name],[data]) VALUES(?,?,?);', ['server-id', "SYSTEM-INFO", this.uuid()]);
    await db.prepare('INSERT INTO [meta] ([rowid],[name],[data]) VALUES(?,?,?);', ['server-created', "SYSTEM-INFO", omuen.now()]);
    db.close();
  }
};

main.read = function(fn){
  return new Promise(function (resolve, reject) {
    fs.readFile(fn, function(err, data){
      resolve(data||new Buffer());
    });
  });
};

main.mime = {
  ".htm":"text/html",
  ".html":"text/html",
  ".js":"text/javascript",
  ".css":"text/css",
  ".txt":"text/plain",
  ".jpg":"image/jpeg",
  ".jpeg":"image/jpeg",
  ".png":"image/png",
  ".svg":"image/svg+xml",
  ".gif":"image/gif",
  ".md":"text/plain",  
};


let app = omuen.handle(async function(request, response){
  response.writeHead(302, { 'Location' : 'index.html' });
  response.end();
});

app.get("index.html", async function(request, response){
  var buffer = await main.read(path.join(__dirname, "./home/index.html"));
  response.writeHead(200, {
    'Content-Type' : 'text/html; charset=UTF-8',
    'Content-Length': buffer.length
  });
  response.write(buffer, "binary");
  response.end();
});

app.get("favicon.ico", async function(request, response){  
  var buffer = await main.read(path.join(__dirname, "./home/favicon.ico"));
  response.writeHead(200, {
    'Content-Type' : 'image/x-icon',
    'Content-Length': buffer.length
  });
  response.write(buffer, "binary");
  response.end();
});  

app.get("js", async function(request, response){
  var fn = path.join(__dirname, './home/', request.url);
  if(fs.existsSync(fn)) {
    var buffer = await main.read(fn);
    response.writeHead(200, {
      'Content-Type' : main.mime[path.extname(fn)]||"application/octet-stream",
      'Content-Length': buffer.length
    });
    response.write(buffer, "binary");
    response.end();
  }
  else {
    response.writeHead(404, { });
    response.end();
  }
}); 

app.get("img", async function(request, response){
  var fn = path.join(__dirname, './home/', request.url);
  if(fs.existsSync(fn)) {
    var buffer = await main.read(fn);
    response.writeHead(200, {
      'Content-Type' : main.mime[path.extname(fn)]||"application/octet-stream",
      'Content-Length': buffer.length
    });
    response.write(buffer, "binary");
    response.end();
  }
  else {
    response.writeHead(404, { });
    response.end();
  }
}); 

app.post("add.do", async function(request, response){  
  var email = request.data.form["email"] || "";
  var name = request.data.form["name"] || "NOBODY";
  var text = request.data.form["text"] || "";
  
  if(name.length>64){
    response.end('{"ret": false, "rowid": ""}');
  }
  else if(email>128){
    response.end('{"ret": false, "rowid": ""}');
  }
  else if(text==""){
    response.end('{"ret": false, "rowid": ""}');  
  }
  else {
    var rowid = main.uuid();
    var db = dbs.open(main.database);
    await db.prepare('INSERT INTO [texts] ([rowid],[name],[email],[text],[created]) VALUES(?,?,?,?,?);', [rowid, name, email, text, omuen.now()]);
    db.close();
    response.end('{"ret": true, "rowid": "' + rowid + '"}');  
  }
});

app.get("list.do", async function(request, response){  
  var page = global.parseInt(request.data.querystring["page"]) || 1;
  var db = dbs.open(main.database);
  var rs = await db.query(`SELECT * FROM [texts] ORDER BY [created] DESC LIMIT 50 OFFSET (${page}-1)*50;`);
  db.close();
  response.end(JSON.stringify(rs.items));  
});

main.run = async function(){
  await this.init();
  app.listen(10722);
};

-async function(){
  return await main.run();
}();





