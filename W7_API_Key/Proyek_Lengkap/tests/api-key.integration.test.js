// RAFAEL: integrasi HTTP dengan database test nyata, bukan mock pembayaran/kuota.
require('dotenv').config();
process.env.DB_NAME = process.env.TEST_DB_NAME || 'soa_bookdata_w8_test';
if (!/^[a-zA-Z0-9_]+_test$/.test(process.env.DB_NAME)) throw Error('Database harus berakhiran _test');
process.env.ACCESS_TOKEN_SECRET ||= 'a'.repeat(128);
process.env.REFRESH_TOKEN_SECRET ||= 'b'.repeat(128);
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const crypto = require('node:crypto');
const { sequelize, Pengguna, ApiLog, Payment, Subscription } = require('../src/models');
const { databaseNow } = require('../src/services/clock');
const { reserveUsage } = require('../src/services/apiUsage');
const { hashApiKey } = require('../src/utils/apiKey');
const app = require('../app');
const DAY = 86400000;
let server, base, adminToken, seq=0;
const suffix = crypto.randomBytes(4).toString('hex');
async function request(path,{method='GET',token,key,body,checkoutKey}={}) {
  const headers={};
  if(token)headers.Authorization=`Bearer ${token}`;
  if(key)headers['X-API-Key']=key;
  if(checkoutKey)headers['Idempotency-Key']=checkoutKey;
  if(body!==undefined)headers['Content-Type']='application/json';
  const r=await fetch(base+'/api/v1'+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
  return {status:r.status,body:await r.json(),headers:r.headers};
}
async function account(key=true) {
  const credentials={pengguna_nama:`t${suffix}${++seq}`,pengguna_password:'Tester123!'};
  const reg=await request('/auth/register',{method:'POST',body:credentials});assert.equal(reg.status,201);
  const login=await request('/auth/login',{method:'POST',body:credentials});assert.equal(login.status,200);
  const u={id:reg.body.id,token:login.body.accessToken,registered:reg.body};
  if(key){const r=await request('/api-key/generate',{method:'POST',token:u.token});assert.equal(r.status,201);u.key=r.body.api_key;}
  return u;
}
const partner=(u,feature='ringkasan')=>request('/partner/'+feature,{key:u.key});
const checkout=(u,checkoutKey=crypto.randomUUID())=>request('/subscriptions/checkout',{
  method:'POST',token:u.token,checkoutKey,body:{plan:'premium'}});
const confirm=id=>request(`/payments/${id}/confirm`,{method:'PATCH',token:adminToken,body:{simulation:true}});
async function premium(u){const bill=await checkout(u);assert.equal(bill.status,201);const paid=await confirm(bill.body.payment.id);assert.equal(paid.status,200);return paid.body;}
before(async()=>{
  await sequelize.authenticate();server=app.listen(0,'127.0.0.1');await once(server,'listening');
  base=`http://127.0.0.1:${server.address().port}`;
  const r=await request('/auth/login',{method:'POST',body:{pengguna_nama:'admin',pengguna_password:'Admin123!'}});
  assert.equal(r.status,200);adminToken=r.body.accessToken;
});
after(async()=>{if(server)await new Promise(resolve=>server.close(resolve));await sequelize.close();});
test('Subscription BookData: alur bisnis, keamanan, masa aktif dan request bersamaan',async t=>{
  const u=await account();let invoice,firstEnd;
  await t.test('registrasi Basic tidak membocorkan hash/key',()=>{
    assert.equal(u.registered.api_level,'basic');assert.equal(u.registered.api_key,undefined);assert.equal(u.registered.pengguna_password,undefined);
  });
  await t.test('katalog berisi harga, 30 hari dan fitur paket',async()=>{
    const r=await request('/plans');assert.equal(r.status,200);assert.equal(r.body.payment_mode,'simulation');
    const [b,p]=r.body.data;assert.equal(b.price,0);assert.equal(b.duration_days,null);assert.equal(p.price,99000);assert.equal(p.duration_days,30);assert.ok(p.features.includes('analitik'));
  });
  await t.test('key acak hanya tersimpan sebagai SHA-256',async()=>{
    assert.match(u.key,/^bd_live_[a-f0-9]{64}$/);assert.equal((await Pengguna.unscoped().findByPk(u.id)).api_key,hashApiKey(u.key));
  });
  await t.test('generate memerlukan JWT dan kedua kalinya ditolak',async()=>{
    assert.equal((await request('/api-key/generate',{method:'POST'})).status,401);
    assert.equal((await request('/api-key/generate',{method:'POST',token:u.token})).status,409);
  });
  await t.test('dua generate bersamaan menerbitkan satu key',async()=>{
    const a=await account(false);const rs=await Promise.all([1,2].map(()=>request('/api-key/generate',{method:'POST',token:a.token})));
    assert.deepEqual(rs.map(r=>r.status).sort(),[201,409]);
  });
  await t.test('key hilang/salah dan JWT saja ditolak partner',async()=>{
    for(const options of [{},{key:'bd_live_'+'0'.repeat(64)},{token:u.token}])assert.equal((await request('/partner/ringkasan',options)).status,401);
  });
  await t.test('Basic menerima agregasi seed dan sisa kuota 99',async()=>{
    const r=await partner(u);assert.equal(r.status,200);assert.deepEqual(r.body.data,{total_judul:5,total_stok:49,rata_rata_harga:98200});assert.equal(r.headers.get('x-daily-remaining'),'99');
  });
  await t.test('Basic ditolak analitik tanpa mengurangi kuota',async()=>{
    const n=await ApiLog.count({where:{pengguna_id:u.id}});assert.equal((await partner(u,'analitik')).status,403);assert.equal(await ApiLog.count({where:{pengguna_id:u.id}}),n);
  });
  await t.test('checkout wajib JWT',async()=>{
    assert.equal((await request('/subscriptions/checkout',{method:'POST',checkoutKey:crypto.randomUUID(),body:{plan:'premium'}})).status,401);
  });
  await t.test('pelanggan tidak dapat memalsukan harga/status/tier/field lain',async()=>{
    for(const body of [{plan:'premium',amount:1},{plan:'premium',status:'paid'},{plan:'gold'},{plan:'basic'},{plan:'premium',roles:'admin'},['premium']])assert.equal((await request('/subscriptions/checkout',{method:'POST',token:u.token,checkoutKey:crypto.randomUUID(),body})).status,400);
  });
  await t.test('checkout wajib header idempotensi',async()=>{
    assert.equal((await request('/subscriptions/checkout',{method:'POST',token:u.token,body:{plan:'premium'}})).status,400);
  });
  await t.test('checkout menghasilkan invoice pending 99000 untuk 30 hari',async()=>{
    const r=await checkout(u);assert.equal(r.status,201);invoice=r.body.payment;assert.equal(invoice.status,'pending');assert.equal(invoice.amount,99000);assert.equal(invoice.billing_days,30);
  });
  await t.test('pending belum memberi hak Premium',async()=>{
    assert.equal((await request('/subscriptions/me',{token:u.token})).body.api_level,'basic');assert.equal((await partner(u,'analitik')).status,403);
  });
  await t.test('checkout diulang mengembalikan invoice yang sama',async()=>{
    const key=crypto.randomUUID(),a=await checkout(u,key),b=await checkout(u,key);assert.equal(b.status,200);assert.equal(b.body.replayed,true);assert.equal(a.body.payment.id,b.body.payment.id);
  });
  await t.test('enam checkout paralel satu key hanya membuat satu invoice',async()=>{
    const a=await account(),key=crypto.randomUUID();const rs=await Promise.all(Array.from({length:6},()=>checkout(a,key)));
    assert.equal(rs.filter(r=>r.status===201).length,1);assert.equal(rs.filter(r=>r.status===200).length,5);assert.equal(new Set(rs.map(r=>String(r.body.payment.id))).size,1);assert.equal(await Payment.count({where:{pengguna_id:a.id}}),1);
  });
  await t.test('pelanggan tidak dapat mengonfirmasi pembayaran',async()=>{
    assert.equal((await request(`/payments/${invoice.id}/confirm`,{method:'PATCH',token:u.token,body:{simulation:true}})).status,403);
  });
  await t.test('invoice orang lain tidak dapat dilihat atau dibatalkan',async()=>{
    const a=await account();assert.equal((await request(`/payments/${invoice.id}`,{token:a.token})).status,404);assert.equal((await request(`/payments/${invoice.id}/cancel`,{method:'PATCH',token:a.token})).status,404);assert.equal((await request('/payments',{token:a.token})).body.total,0);
  });
  await t.test('daftar pending hanya admin dan pagination dibatasi',async()=>{
    assert.equal((await request('/payments/admin/pending',{token:u.token})).status,403);
    const r=await request('/payments/admin/pending',{token:adminToken});assert.equal(r.status,200);assert.ok(r.body.data.every(p=>p.status==='pending'));
    assert.equal((await request('/payments?limit=101',{token:u.token})).status,400);
  });
  await t.test('konfirmasi mewajibkan pengakuan simulasi',async()=>{
    assert.equal((await request(`/payments/${invoice.id}/confirm`,{method:'PATCH',token:adminToken,body:{}})).status,400);
  });
  await t.test('konfirmasi atomik mengaktifkan Premium tepat 30 hari',async()=>{
    const r=await confirm(invoice.id);assert.equal(r.status,200);assert.equal(r.body.api_level,'premium');assert.equal(r.body.payment.status,'paid');assert.ok(r.body.payment.confirmed_by);assert.equal(r.body.replayed,false);assert.equal(+new Date(r.body.subscription.ends_at)-+new Date(r.body.subscription.starts_at),30*DAY);firstEnd=r.body.subscription.ends_at;
  });
  await t.test('key yang sama mendapat analitik setelah pembayaran',async()=>{
    const r=await partner(u,'analitik');assert.equal(r.status,200);assert.equal(r.headers.get('x-api-level'),'premium');assert.equal(r.body.data.stok_rendah.length,2);
  });
  await t.test('konfirmasi ulang tidak memperpanjang periode',async()=>{
    const r=await confirm(invoice.id);assert.equal(r.body.replayed,true);assert.equal(r.body.subscription.ends_at,firstEnd);
  });
  await t.test('konfirmasi paralel satu invoice mengaktifkan sekali',async()=>{
    const a=await account(),bill=await checkout(a);const rs=await Promise.all(Array.from({length:6},()=>confirm(bill.body.payment.id)));
    assert.ok(rs.every(r=>r.status===200));assert.equal(rs.filter(r=>!r.body.replayed).length,1);const s=await Subscription.findOne({where:{pengguna_id:a.id}});assert.equal(+s.ends_at-+s.starts_at,30*DAY);
  });
  await t.test('dua invoice berbeda dikonfirmasi paralel memberi 60 hari',async()=>{
    const a=await account(),x=await checkout(a),y=await checkout(a);const rs=await Promise.all([confirm(x.body.payment.id),confirm(y.body.payment.id)]);assert.ok(rs.every(r=>r.status===200));const s=await Subscription.findOne({where:{pengguna_id:a.id}});assert.equal(+s.ends_at-+s.starts_at,60*DAY);
  });
  await t.test('renewal menambah 30 hari dari akhir periode aktif',async()=>{
    const bill=await checkout(u),r=await confirm(bill.body.payment.id);assert.equal(+new Date(r.body.subscription.ends_at)-+new Date(firstEnd),30*DAY);assert.equal(r.body.payment.period_start,firstEnd);
  });
  await t.test('api-key/me menampilkan subscription tanpa kebocoran kredensial',async()=>{
    const r=await request('/api-key/me',{token:u.token});assert.equal(r.body.api_level,'premium');assert.equal(r.body.subscription.status,'active');assert.equal(r.body.has_api_key,true);assert.ok(!JSON.stringify(r.body).includes(u.key));assert.ok(!JSON.stringify(r.body).includes(hashApiKey(u.key)));
  });
  await t.test('subscription expired otomatis menolak analitik dan kembali Basic',async()=>{
    const now=await databaseNow();await Subscription.update({ends_at:new Date(+now-1),status:'active'},{where:{pengguna_id:u.id}});assert.equal((await partner(u,'analitik')).status,403);
    const r=await request('/subscriptions/me',{token:u.token});assert.equal(r.body.api_level,'basic');assert.equal(r.body.subscription.status,'expired');assert.equal((await Pengguna.findByPk(u.id)).api_level,'basic');
  });
  await t.test('reservasi memeriksa ulang subscription setelah lock',async()=>{
    assert.equal((await reserveUsage(u.id,hashApiKey(u.key),'analitik','/fixture','GET')).error,403);
  });
  await t.test('cache api_level saja tidak memberikan Premium',async()=>{
    const a=await account();await Pengguna.update({api_level:'premium'},{where:{id:a.id}});assert.equal((await partner(a,'analitik')).status,403);assert.equal((await Pengguna.findByPk(a.id)).api_level,'basic');
  });
  await t.test('pembelian setelah expired memulai 30 hari dari sekarang',async()=>{
    const r=await premium(u);assert.equal(r.api_level,'premium');assert.equal(+new Date(r.subscription.ends_at)-+new Date(r.subscription.starts_at),30*DAY);
  });
  await t.test('cancel pending idempotent dan invoice tidak bisa dikonfirmasi',async()=>{
    const bill=await checkout(u),path=`/payments/${bill.body.payment.id}/cancel`;
    assert.equal((await request(path,{method:'PATCH',token:u.token})).body.payment.status,'cancelled');assert.equal((await request(path,{method:'PATCH',token:u.token})).body.replayed,true);assert.equal((await confirm(bill.body.payment.id)).status,409);
  });
  await t.test('paid tidak dapat dibatalkan',async()=>{
    assert.equal((await request(`/payments/${invoice.id}/cancel`,{method:'PATCH',token:u.token})).status,409);
  });
  await t.test('invoice expired tidak bisa diaktifkan',async()=>{
    const bill=await checkout(u),now=await databaseNow();await Payment.update({expires_at:new Date(+now-1)},{where:{id:bill.body.payment.id}});assert.equal((await confirm(bill.body.payment.id)).status,409);assert.equal((await request(`/payments/${bill.body.payment.id}`,{token:u.token})).body.payment.status,'expired');
  });
  await t.test('konfirmasi paid lama tidak mengaktifkan ulang setelah expired',async()=>{
    const a=await account(),r=await premium(a),now=await databaseNow();await Subscription.update({ends_at:new Date(+now-1)},{where:{pengguna_id:a.id}});const again=await confirm(r.payment.id);assert.equal(again.body.replayed,true);assert.equal(again.body.api_level,'basic');
  });
  await t.test('upgrade langsung ditutup bagi pelanggan dan admin',async()=>{
    assert.equal((await request(`/api-key/level/${u.id}`,{method:'PATCH',token:u.token,body:{api_level:'premium'}})).status,403);assert.equal((await request(`/api-key/level/${u.id}`,{method:'PATCH',token:adminToken,body:{api_level:'premium'}})).status,410);
  });
  await t.test('CRUD buku sumber memerlukan JWT admin',async()=>{
    assert.equal((await request('/buku')).status,401);assert.equal((await request('/buku',{key:u.key})).status,401);assert.equal((await request('/buku',{token:u.token})).status,403);assert.equal((await request('/buku',{token:adminToken})).status,200);
  });
  await t.test('regenerate mencabut key lama tanpa reset subscription/kuota',async()=>{
    const n=await ApiLog.count({where:{pengguna_id:u.id}}),r=await request('/api-key/regenerate',{method:'POST',token:u.token});assert.equal(r.status,200);assert.equal((await partner(u)).status,401);u.key=r.body.api_key;assert.equal((await partner(u,'analitik')).status,200);assert.equal(await ApiLog.count({where:{pengguna_id:u.id}}),n+1);
  });
  await t.test('Basic menerima tepat 10 dari 11 request paralel',async()=>{
    const a=await account(),now=await databaseNow(),remaining=60000-(+now%60000);if(remaining<2500)await new Promise(resolve=>setTimeout(resolve,remaining+20));const rs=await Promise.all(Array.from({length:11},()=>partner(a)));assert.equal(rs.filter(r=>r.status===200).length,10);assert.equal(rs.filter(r=>r.status===429).length,1);assert.equal(await ApiLog.count({where:{pengguna_id:a.id}}),10);
  });
  await t.test('kuota harian Basic maksimal 100 request',async()=>{
    const a=await account(),day=await databaseNow();day.setUTCHours(0,0,0,0);await ApiLog.bulkCreate(Array.from({length:100},()=>({pengguna_id:a.id,endpoint:'/fixture',http_method:'GET',createdAt:day})));const r=await partner(a);assert.equal(r.status,429);assert.equal(r.body.code,'DAILY_QUOTA_EXCEEDED');
  });
  await t.test('Premium hasil pembelian menerima lebih dari 10 request per menit',async()=>{
    const a=await account();await premium(a);const rs=await Promise.all(Array.from({length:12},()=>partner(a)));assert.ok(rs.every(r=>r.status===200));
  });
  await t.test('log merekam status respons tanpa menyimpan key',async()=>{
    let rows=[];for(let i=0;i<40;i++){rows=await ApiLog.findAll({where:{pengguna_id:u.id},raw:true});if(rows.every(r=>r.status_code!==null))break;await new Promise(resolve=>setTimeout(resolve,25));}assert.ok(rows.length>0);assert.ok(rows.every(r=>r.status_code===200));assert.ok(!JSON.stringify(rows).includes(u.key));
  });
  await t.test('UUID W7 yang di-hash tetap dapat dipakai',async()=>{
    const a=await account(false),raw=crypto.randomUUID();await Pengguna.update({api_key:hashApiKey(raw)},{where:{id:a.id}});assert.equal((await request('/partner/ringkasan',{key:raw})).status,200);
  });
});
