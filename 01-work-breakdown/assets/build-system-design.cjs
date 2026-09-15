const fs = require('fs');
const path = require('path');
const sharp = require('C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const W=1820,H=1260,nodes=[],edges=[];
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const C={ink:'#263445',purple:'#8953d5',green:'#669c35',orange:'#ed7100',blue:'#167ca6',teal:'#009999',gray:'#708090',pink:'#e7157b'};
function box(id,x,y,w,h,text='',o={}){nodes.push({id,x,y,w,h,text,fill:'#fff',stroke:C.ink,size:16,...o});}
function label(id,x,y,w,h,text,o={}){box(id,x,y,w,h,text,{stroke:'none',fill:'none',...o});}
function frame(id,x,y,w,h,title,o={}){box(id,x,y,w,h,'',o);label(id+'-title',x+16,y+8,w-32,28,title,{parent:id,align:'left',bold:true,size:18,color:o.stroke||C.ink});}
function edge(id,source,target,pts,color=C.ink,dashed=false){edges.push({id,source,target,pts,color,dashed});}
function chip(id,x,y,parent){box(id,x,y,34,32,'EC2',{parent,fill:C.orange,stroke:C.orange,color:'#fff',bold:true,size:9});}

label('title',35,20,1745,42,'PBL4  /  WEBSITE PHP + GIÁM SÁT ELK & GEOIP',{align:'left',size:28,bold:true});
label('subtitle',35,66,1745,25,'Kiến trúc lab cập nhật • 14/09/2026 • Public/Private subnet + NAT Gateway',{align:'left',size:15,color:'#667589'});
box('inventory',35,108,1745,48,'2 EC2  |  1 VPC  |  1 AZ  |  1 public subnet  |  1 private subnet  |  1 Internet Gateway  |  1 NAT Gateway',{fill:'#eff4fa',stroke:'#d5dfeb',bold:true,size:17});
frame('aws',280,178,1500,835,'AWS Cloud  •  Region: ap-southeast-1 / Singapore',{stroke:'#37475a'});
frame('vpc',455,230,1295,735,'VPC pbl4-vpc  •  10.0.0.0/16',{parent:'aws',stroke:C.purple});
frame('az',480,285,1245,635,'Availability Zone  •  ap-southeast-1a',{parent:'vpc',stroke:'#8a96a3',dashed:true});
frame('public-subnet',510,340,560,530,'Public subnet  •  10.0.1.0/24',{parent:'az',stroke:C.green,fill:'#f4f8ee'});
frame('private-subnet',1095,340,600,530,'Private subnet  •  10.0.2.0/24',{parent:'az',stroke:C.teal,fill:'#edf8fa'});
frame('sg-web',535,395,510,315,'Security Group  •  pbl4-web-sg',{parent:'public-subnet',stroke:C.orange,dashed:true,fill:'#fff8ef'});
box('web-host',550,438,480,255,'',{parent:'sg-web',stroke:C.orange});
chip('web-icon',565,450,'web-host');
label('web-name',610,447,400,34,'EC2-WEB  •  10.0.1.10',{parent:'web-host',align:'left',bold:true,size:18});
label('web-spec',565,484,445,22,'2 vCPU / 2 GiB • public IPv4 • Ubuntu',{parent:'web-host',size:13,color:'#647082'});
box('nginx',570,525,135,54,'Nginx\nHTTP / HTTPS',{parent:'web-host',stroke:C.orange,fill:'#fff4e5'});
box('php',725,525,135,54,'PHP-FPM\nLogin / Shop',{parent:'web-host',stroke:C.orange,fill:'#fff4e5'});
box('db',880,525,130,54,'MariaDB\nlocal',{parent:'web-host',stroke:'#bdc7d1'});
box('logs',570,610,190,42,'Access / error / auth',{parent:'web-host',stroke:'#bdc7d1',size:14});
box('filebeat',795,610,145,42,'Filebeat',{parent:'web-host',stroke:C.blue,fill:'#eaf5fc',bold:true,size:14});
box('nat',625,750,305,75,'NAT Gateway  •  Elastic IP\nOutbound cho private subnet',{parent:'public-subnet',fill:'#fff0f7',stroke:C.pink,bold:true,size:14});
frame('sg-elk',1120,395,550,395,'Security Group  •  pbl4-elk-sg',{parent:'private-subnet',stroke:C.blue,dashed:true,fill:'#eef8fc'});
box('elk-host',1135,438,520,335,'',{parent:'sg-elk',stroke:C.orange});
chip('elk-icon',1150,450,'elk-host');
label('elk-name',1195,447,440,34,'EC2-ELK  •  10.0.2.20',{parent:'elk-host',align:'left',bold:true,size:18});
label('elk-spec',1150,484,485,22,'2 vCPU / 8 GiB đề xuất • không public IPv4',{parent:'elk-host',size:13,color:'#647082'});
box('logstash',1155,525,155,60,'Logstash\nParse / ECS / GeoIP',{parent:'elk-host',stroke:C.blue,fill:'#eaf5fc'});
box('es',1440,525,190,60,'Elasticsearch\nLưu log / truy vấn',{parent:'elk-host',stroke:C.blue,fill:'#eaf5fc'});
box('geo',1155,625,155,48,'GeoLite2 .mmdb\nTra cứu tại máy',{parent:'elk-host',stroke:'#a7bac7',size:13});
box('kibana',1440,620,190,76,'Kibana\nDashboard / Maps\nRules / Cảnh báo',{parent:'elk-host',stroke:C.blue,fill:'#eaf5fc'});
label('private-note',1135,715,520,38,'Không nhận kết nối trực tiếp từ Internet',{parent:'sg-elk',size:14,color:C.teal,bold:true});
box('users',35,300,205,75,'NGƯỜI DÙNG\nTrình duyệt web',{fill:'#f6f8fb',stroke:'#9aa8b7',bold:true,size:18});
box('tester',35,470,205,90,'MÁY KIỂM THỬ\nLaptop / VM của nhóm\nk6 • curl • script',{fill:'#f6f8fb',stroke:'#9aa8b7',size:16});
box('admin',35,720,205,95,'NHÓM / GIẢNG VIÊN\nSSH key + IP /32\nProxyJump + tunnel',{fill:'#f6f8fb',stroke:'#9aa8b7',size:15});
box('igw',310,340,110,80,'Internet\nGateway',{parent:'aws',fill:'#f3ecfc',stroke:C.purple,color:'#7041b5',bold:true,size:17});
label('tester-note',28,575,220,75,'Tester nằm ngoài AWS và gọi\npublic URL của EC2-WEB.',{size:14,color:'#667589'});
edge('user-in','users','igw',[[240,337],[280,337],[280,365],[310,365]]);
edge('test-in','tester','igw',[[240,515],[265,515],[265,395],[310,395]]);
edge('web-in','igw','web-host',[[420,380],[455,380],[455,565],[550,565]]);
edge('fastcgi','nginx','php',[[705,552],[725,552]],C.orange);
edge('php-db','php','db',[[860,552],[880,552]],C.orange);
edge('nginx-log','nginx','logs',[[638,579],[638,610]],C.gray);
edge('php-log','php','logs',[[792,579],[792,595],[720,595],[720,610]],C.gray);
edge('logs-beat','logs','filebeat',[[760,631],[795,631]],C.blue);
edge('ship','filebeat','logstash',[[940,631],[1080,631],[1080,555],[1155,555]],C.blue);
edge('index','logstash','es',[[1310,555],[1440,555]],C.blue);
edge('lookup','geo','logstash',[[1232,625],[1232,585]],'#728b51',true);
edge('query','kibana','es',[[1535,620],[1535,585]],C.blue);
edge('nat-out','elk-host','nat',[[1135,690],[1080,690],[1080,842],[930,842],[930,787]],C.pink,true);
edge('nat-igw','nat','igw',[[625,787],[470,787],[470,420],[365,420]],C.pink,true);
edge('admin-web','admin','web-host',[[240,767],[270,767],[270,900],[580,900],[580,693]],C.purple,true);
edge('jump-elk','web-host','elk-host',[[1030,675],[1080,675],[1080,735],[1135,735]],C.purple,true);
label('http-label',300,465,150,55,'HTTPS 443\nHTTP 80 → HTTPS',{size:14});
label('ship-label',945,565,130,58,'Private IP\nTCP 5044 + TLS',{size:14,color:C.blue});
label('index-label',1315,520,115,25,'HTTPS 9200',{size:13,color:C.blue});
label('nat-label',1170,818,450,32,'ELK outbound → NAT → IGW',{size:14,color:C.pink});
label('admin-label',300,870,760,28,'SSH 22 tới WEB → ProxyJump tới ELK → tunnel Kibana 127.0.0.1:5601',{size:14,color:C.purple});
box('public-route',280,1035,475,170,'PUBLIC ROUTE TABLE\n10.0.0.0/16 → local\n0.0.0.0/0 → Internet Gateway\nEC2-WEB + NAT Gateway',{fill:'#f4f8ee',stroke:'#b8d39e',size:15});
box('private-route',775,1035,475,170,'PRIVATE ROUTE TABLE\n10.0.0.0/16 → local\n0.0.0.0/0 → NAT Gateway\nEC2-ELK không có public IPv4',{fill:'#edf8fa',stroke:'#acd5d5',size:15});
box('ports-note',1270,1035,510,170,'SECURITY GROUPS\nWEB: 80/443 từ Internet; 22 từ IP nhóm /32\nELK: 5044 và 22 chỉ từ pbl4-web-sg\n3306 / 5601 / 9200 không mở Internet\nNAT không nhận kết nối inbound',{fill:'#eef7fb',stroke:'#bdd8e6',size:14});

const byId=Object.fromEntries(nodes.map(n=>[n.id,n]));
function nodeXML(n){const p=byId[n.parent],x=n.x-(p?p.x:0),y=n.y-(p?p.y:0);const style=`rounded=0;whiteSpace=wrap;html=0;fillColor=${n.fill};strokeColor=${n.stroke};strokeWidth=${n.dashed?1.5:1.3};fontFamily=Segoe UI;fontSize=${n.size};fontColor=${n.color||C.ink};fontStyle=${n.bold?1:0};align=${n.align||'center'};verticalAlign=middle;spacing=4;${n.dashed?'dashed=1;dashPattern=6 4;':''}`;return `<mxCell id="${n.id}" value="${esc(n.text).replace(/\n/g,'&#xa;')}" style="${style}" vertex="1" parent="${n.parent||'1'}"><mxGeometry x="${x}" y="${y}" width="${n.w}" height="${n.h}" as="geometry"/></mxCell>`;}
function edgeXML(e){const a=byId[e.source],b=byId[e.target],s=e.pts[0],t=e.pts.at(-1);const style=`edgeStyle=none;rounded=0;html=0;strokeColor=${e.color};strokeWidth=2;endArrow=block;endFill=1;exitX=${(s[0]-a.x)/a.w};exitY=${(s[1]-a.y)/a.h};exitDx=0;exitDy=0;entryX=${(t[0]-b.x)/b.w};entryY=${(t[1]-b.y)/b.h};entryDx=0;entryDy=0;${e.dashed?'dashed=1;dashPattern=6 4;':''}`;return `<mxCell id="${e.id}" edge="1" parent="1" source="${e.source}" target="${e.target}" style="${style}"><mxGeometry relative="1" as="geometry"><Array as="points">${e.pts.slice(1,-1).map(p=>`<mxPoint x="${p[0]}" y="${p[1]}"/>`).join('')}</Array></mxGeometry></mxCell>`;}
const drawio=`<mxfile host="app.diagrams.net" agent="Codex"><diagram id="pbl4-public-private" name="01 - Public Private NAT"><mxGraphModel grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" page="1" pageScale="1" pageWidth="${W}" pageHeight="${H}" background="#ffffff"><root><mxCell id="0"/><mxCell id="1" parent="0"/>${nodes.map(nodeXML).join('\n')}${edges.map(edgeXML).join('\n')}</root></mxGraphModel></diagram></mxfile>`;
const defs=`<defs>${[...new Set(edges.map(e=>e.color))].map(c=>`<marker id="arrow${c.slice(1)}" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L8,4 L0,8 Z" fill="${c}"/></marker>`).join('')}</defs>`;
function textSVG(n){const lines=n.text.split('\n'),lh=n.size*1.35,y0=n.y+n.h/2-(lines.length-1)*lh/2+n.size*.34;return `<text font-family="Segoe UI, Arial, sans-serif" font-size="${n.size}" font-weight="${n.bold?650:400}" fill="${n.color||C.ink}" text-anchor="${n.align==='left'?'start':'middle'}">${lines.map((s,i)=>`<tspan x="${n.align==='left'?n.x+4:n.x+n.w/2}" y="${y0+i*lh}">${esc(s)}</tspan>`).join('')}</text>`;}
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${defs}<rect width="100%" height="100%" fill="white"/>${nodes.map(n=>`<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" fill="${n.fill}" stroke="${n.stroke}" stroke-width="1.3" ${n.dashed?'stroke-dasharray="6 4"':''}/>`).join('')}${edges.map(e=>`<polyline points="${e.pts.map(p=>p.join(',')).join(' ')}" fill="none" stroke="${e.color}" stroke-width="2" ${e.dashed?'stroke-dasharray="6 4"':''} marker-end="url(#arrow${e.color.slice(1)})"/>`).join('')}${nodes.filter(n=>n.text).map(textSVG).join('')}</svg>`;
const out=__dirname;
fs.writeFileSync(path.join(out,'pbl4-system-design.drawio'),drawio);
fs.writeFileSync(path.join(out,'pbl4-system-design.svg'),svg);
sharp(Buffer.from(svg)).png().toFile(path.join(out,'pbl4-system-design.png')).then(()=>console.log('Generated public/private/NAT draw.io, SVG and PNG.'));
