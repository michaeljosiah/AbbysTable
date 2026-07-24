/** Creates the `menu` collection: the 10 dishes, in fixture order. Extras and the bundle stay out. */
const API='http://localhost:5050', T=process.env.TENANT_ID, TOK=process.env.ADMIN_TOKEN;
const h={'Content-Type':'application/json','X-Tenant-Id':T,Authorization:`Bearer ${TOK}`};
import {readFileSync} from 'node:fs';
const seed=JSON.parse(readFileSync(process.argv[2],'utf8'));

const all=await (await fetch(`${API}/commerce/admin/products?pageSize=100`,{headers:h})).json();
const bySlug=new Map(all.items.map(p=>[p.slug,p.id]));

const existing=await (await fetch(`${API}/commerce/admin/collections`,{headers:h})).json();
let col=existing.find(c=>c.slug==='menu');
if(!col){
  const r=await fetch(`${API}/commerce/admin/collections`,{method:'POST',headers:h,
    body:JSON.stringify({slug:'menu',title:'Menu',subtitle:'The full table',kind:'Curated',sortOrder:2})});
  if(!r.ok){console.log('  create FAILED',r.status,(await r.text()).slice(0,200));process.exit(1);}
  col=await r.json();
  console.log('  created collection menu');
} else console.log('  collection menu already exists');

const items=seed.dishes.map((d,i)=>({productId:bySlug.get(d.slug),rank:i+1})).filter(x=>x.productId);
const r=await fetch(`${API}/commerce/admin/collections/${col.id}/items`,{method:'PUT',headers:h,body:JSON.stringify({items})});
console.log(r.ok?`  menu: ${items.length} dishes`:`  items FAILED ${r.status} ${(await r.text()).slice(0,200)}`);
