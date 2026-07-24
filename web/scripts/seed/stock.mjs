/** Stocks every variant so box adds pass Aonik's R5 availability rule. */
const API='http://localhost:5050', T=process.env.TENANT_ID, TOK=process.env.ADMIN_TOKEN;
const h={'Content-Type':'application/json','X-Tenant-Id':T,Authorization:`Bearer ${TOK}`};
const list=await (await fetch(`${API}/commerce/admin/products?pageSize=100`,{headers:h})).json();
let ok=0, fail=0;
for (const p of list.items) {
  const detail=await (await fetch(`${API}/commerce/admin/products/${p.id}`,{headers:h})).json();
  for (const v of detail.variants ?? []) {
    const r=await fetch(`${API}/commerce/admin/variants/${v.id}/inventory`,{method:'POST',headers:h,body:JSON.stringify({onHand:500})});
    if (r.ok) ok++; else { fail++; console.log('  FAIL', p.slug, v.sku, r.status, (await r.text()).slice(0,120)); }
  }
}
console.log(`  stocked ${ok} variant(s)${fail?`, ${fail} failed`:''}`);
