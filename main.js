const fs = require("fs");
const dbs = require("dbs");
const path = require("path");
const omuen = require("omuen");

const DB_NAME = path.join(__dirname, "./dbase/mail.db");

let DB_CONN = null;

let app = omuen.handle({
  doGet: async(request, response)=>{
    response.writeHead(302, { 'Location' : 'index.html' });
    response.end();
  },
  doCreate(){
    DB_CONN = dbs.open(DB_NAME); 
    console.log("DB_CONN = dbs.open(DB_NAME)");
  },
  doDestroy(){
    console.log("DB_CONN.close()");
  }
});

app.get("index.html", async(request, response)=>{
  let buffer = await main.read(path.join(__dirname, "./home/index.html"));
  response.writeHead(200, {
    'Content-Type' : 'text/html; charset=UTF-8',
    'Content-Length': buffer.length
  });
  response.write(buffer, "binary");
  response.end();
});

app.get("favicon.ico", async(request, response)=>{  
  let buffer = await main.read(path.join(__dirname, "./home/favicon.ico"));
  response.writeHead(200, {
    'Content-Type' : 'image/x-icon',
    'Content-Length': buffer.length
  });
  response.write(buffer, "binary");
  response.end();
});  

app.get("hw.woff2", async(request, response)=>{
  let buffer = await main.read(path.join(__dirname, "./home/hw.woff2"));
  response.writeHead(200, {
    'Content-Type' : 'font/x-font-woff',
    'Content-Length': buffer.length
  });
  response.write(buffer, "binary");
  response.end();
});

app.get("cdn", async(request, response)=>{
  let dbname = path.join(__dirname, './home/', request.url);
  if(fs.existsSync(dbname)) {
    let buffer = await main.read(dbname);
    response.writeHead(200, {
      'Content-Type' : main.mime[path.extname(dbname)]||"application/octet-stream",
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

app.get("img", async(request, response)=>{
  let dbname = path.join(__dirname, './home/', request.url);
  if(fs.existsSync(dbname)) {
    let buffer = await main.read(dbname);
    response.writeHead(200, {
      'Content-Type' : main.mime[path.extname(dbname)]||"application/octet-stream",
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

app.post("add.do", async(request, response)=>{  
  let email = request.data.form["email"] || "";
  let name = request.data.form["name"] || "NOBODY";
  let text = request.data.form["text"] || "";
  
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
    let rowid = main.uuid();
    let db = dbs.open(main.database);
    await db.prepare('INSERT INTO [texts] ([rowid],[name],[email],[text],[created]) VALUES(?,?,?,?,?);', [rowid, name, email, text, omuen.now()]);
    db.close();
    response.end('{"ret": true, "rowid": "' + rowid + '"}');  
  }
});

app.get("list.do", async function(request, response){  
  let page = global.parseInt(request.data.querystring["page"]) || 1;
  let rs = await DB_CONN.query('SELECT * FROM [texts] ORDER BY [created] DESC LIMIT 50 OFFSET ?;', [(page-1)*50]);
  response.end(JSON.stringify(rs.items));  
});

let main = {
  database: DB_NAME,
  mime: {
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
  },
  uuid(){
    let rowid = [];
    for (let i = 0; i < 40; i++) {
      rowid.push(Math.floor(Math.random() * 10));
    }
    return rowid.join("");
  },
  async init(){
    let ok = fs.existsSync(this.database);
    if(!ok){
      let db = dbs.open(this.database);
      await db.run('CREATE TABLE IF NOT EXISTS [meta] ([rowid] PRIMARY KEY, [name], [data]);');
      await db.run('CREATE TABLE IF NOT EXISTS [texts] ([rowid] PRIMARY KEY, [name], [email], [text], [created]);');
      await db.prepare('INSERT INTO [meta] ([rowid],[name],[data]) VALUES(?,?,?);', ['server-id', "SYSTEM-INFO", this.uuid()]);
      await db.prepare('INSERT INTO [meta] ([rowid],[name],[data]) VALUES(?,?,?);', ['server-created', "SYSTEM-INFO", omuen.now()]);
      db.close();
    }
  },
  read(name){
    return new Promise(function (resolve, reject) {
      fs.readFile(name, function(err, data){
        resolve(data||new Buffer());
      });
    });
  },
  async run(){
    await this.init();
    app.listen(10722);
  }
};

main.run();





