import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
const files={'/':'index.html','/index.html':'index.html','/styles.css':'styles.css','/turns.css':'turns.css','/app.js':'app.js','/simulation.js':'simulation.js','/storage.js':'storage.js','/scene.js':'scene.js','/sw.js':'sw.js','/manifest.webmanifest':'manifest.webmanifest','/icon.svg':'icon.svg','/icon-180.png':'icon-180.png','/icon-192.png':'icon-192.png','/icon-512.png':'icon-512.png'};
const mime={html:'text/html; charset=utf-8',css:'text/css; charset=utf-8',js:'text/javascript; charset=utf-8',webmanifest:'application/manifest+json',svg:'image/svg+xml',png:'image/png'};
const port=Number(process.argv[2]||8787);
createServer(async(req,res)=>{
  const file=files[new URL(req.url,'http://localhost').pathname];
  if(!file){res.writeHead(404);res.end('Not found');return}
  try{const b=await readFile(new URL('./docs/'+file,import.meta.url));res.writeHead(200,{'content-type':mime[file.split('.').at(-1)],'cache-control':'no-cache'});res.end(b)}catch{res.writeHead(404);res.end('Not found')}
}).listen(port,'127.0.0.1',()=>console.log('The Long Winter: http://127.0.0.1:'+port));
