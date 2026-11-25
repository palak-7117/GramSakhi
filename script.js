const $=s=>document.querySelector(s),app=$('#app');

const E=s=>String(s??'').replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');

const CATS=['अचार','पापड़','मसाले','कपड़े','हस्तशिल्प','अन्य'],
CE={'अचार':'🥭','पापड़':'🫓','मसाले':'🌶️','कपड़े':'🧵','हस्तशिल्प':'🧺','अन्य':'🎁'};

const ST={new:'🆕 नया',packed:'📦 पैक',shipped:'🚚 भेजा',done:'✅ पहुँचा'};

const rs=n=>'₹'+n;

const seed=()=>({
cust:{name:'',phone:'',address:''},
cart:[],
wish:[],
orders:[],
reviews:[],
sellers:[],
products:[],
sid:0
});

let S=seed();

try{
const L0=JSON.parse(localStorage.getItem('gs'));
if(L0)Object.assign(S,{
cust:L0.cust||S.cust,
cart:L0.cart||[],
wish:L0.wish||[]
})
}catch(e){}

const save=()=>{
try{
localStorage.setItem('gs',JSON.stringify({
cust:S.cust,
cart:S.cart,
wish:S.wish
}))
}catch(e){}
};

const sel=i=>S.sellers.find(s=>s.id==i);
const prod=i=>S.products.find(p=>p.id==i);
const me=()=>sel(S.sid);
const sn=s=>s.shg||s.name+' की दुकान';

const stars=i=>{
const r=S.reviews.filter(x=>x.pid==i);
return r.length?'⭐'+(r.reduce((a,x)=>a+x.r,0)/r.length).toFixed(1)+' ('+r.length+')':''
};

const api=async(a,d)=>{
let r;
try{
r=await fetch('api/index.php?a='+a,d===undefined?{}:{
method:'POST',
headers:{'Content-Type':'application/json'},
body:JSON.stringify(d)
})
}catch(e){
throw new Error('सर्वर से जुड़ नहीं पाए। XAMPP में Apache और MySQL चालू करें।')
}

let j={};
try{j=await r.json()}catch(e){}

if(!r.ok||j.error)
throw new Error(j.error||'सर्वर में गड़बड़ी हुई। फिर कोशिश करें।');

return j
};

const run=async f=>{
try{return await f()}catch(e){alert(e.message)}
};

async function boot(){
const j=await api('bootstrap');
Object.assign(S,j);
S.products.forEach(p=>p.cat=CATS.find(c=>c.normalize()==String(p.cat).normalize())||p.cat)
}

const fail=e=>{
app.innerHTML='<div class="card"></div>';
app.firstChild.textContent=e.message
};

function toast(t){
const d=$('#toast');
d.textContent=t;
d.hidden=false;
clearTimeout(toast.t);
toast.t=setTimeout(()=>d.hidden=true,1800)
}

const img=p=>p.image
?`<img src="${p.image}" alt="">`
:`<div class="ph">${CE[p.cat]||'🧺'}</div>`;

const pcard=p=>{
const s=sel(p.sid);
return `
<div class="card">
${img(p)}
<h3>${E(p.name)}</h3>
<b>${rs(p.price)}</b> ${stars(p.id)}
<br>
<small>👩 ${E(sn(s))}, ${E(s.village)}</small>

<div class="row">
<a class="btn" href="#p/${p.id}">देखें</a>
<button class="o" onclick="wish(${p.id})">${S.wish.includes(p.id)?'♥':'♡'}</button>
<button onclick="addCart(${p.id})">🛒</button>
</div>
</div>`
};

const grid=l=>
`<div class="grid">${l.map(pcard).join('')||'<p>अभी कोई सामान नहीं है।</p>'}</div>`;

const F=(id,lab,ph='',m,num)=>
`<label for="${id}">${lab}</label>
<div class="row">
<input id="${id}" placeholder="${ph}">
${m?`<button type="button" class="mic" onclick="mic('${id}',${!!num},this)">🎤</button>`:''}
</div>`;

function mic(id,num,b){
const R=window.SpeechRecognition||window.webkitSpeechRecognition;
if(!R)return alert('बोलकर भरने के लिए Google Chrome खोलें');

const r=new R(),el=$('#'+id);
r.lang=LG=='en'?'en-IN':'hi-IN';
b.classList.add('on');

r.onresult=e=>{
const t=e.results[0][0].transcript;
el.value=num?(t.match(/\d+/)||[''])[0]:(el.value+' '+t).trim()
};

r.onend=r.onerror=()=>b.classList.remove('on');
try{r.start()}catch(e){b.classList.remove('on')}
}

function mic3(button) {
  const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!Speech) {
    alert('Voice input needs Google Chrome or Microsoft Edge.');
    return;
  }

  const recognition = new Speech();
  recognition.lang = 'hi-IN';
  recognition.continuous = false;
  recognition.interimResults = false;

  button.classList.add('on');

  recognition.onresult = event => {
    const spoken = event.results[0][0].transcript.trim();
    const numbers = spoken.match(/\d+/g) || [];

    // Put the spoken product name in the product field.
    const productName = spoken
      .replace(/\d+/g, '')
      .replace(/रुपये|रुपया|रु\.?|कीमत|दाम/gi, '')
      .trim();

    document.querySelector('#pn').value = productName;

    // Speak the price, then quantity: "आम का अचार 150 रुपये 20"
    if (numbers[0]) document.querySelector('#pp').value = numbers[0];
    if (numbers[1]) document.querySelector('#pq').value = numbers[1];

    if (!numbers.length) {
      alert('Product name heard. Please enter the price and quantity.');
    }
  };

  recognition.onerror = event => {
    button.classList.remove('on');
    alert('Microphone error: ' + event.error +
      '. Check browser microphone permission and try again.');
  };

  recognition.onend = () => button.classList.remove('on');

  try {
    recognition.start();
  } catch (error) {
    button.classList.remove('on');
    alert('Could not start the microphone. Check browser permission and try again.');
  }
}

const base=()=>location.href.split('#')[0];

const qr=(id,t)=>{
try{
window.QRCode&&new QRCode($('#'+id),{
text:base()+t,width:130,height:130
})
}catch(e){}
};

/* NAVIGATION */

const nav=()=>{
const c=S.cart.reduce((a,x)=>a+x.q,0);

$('#nav').innerHTML=`
<a class="brand" href="#">
<span class="brand-mark">🌾</span>
<span>GramSakhi</span>
</a>

<a href="#">Home</a>
<a href="#shop">Shop</a>
<a href="#cats">Categories</a>
<a href="#stores">Our Sakhis</a>
<a href="#stories">Stories</a>
<a href="#about">About</a>
<a href="#contact">Contact</a>
<a href="#wishlist">♡ ${S.wish.length}</a>
<a href="#cart">🛒 ${c}</a>
<a href="#profile">Profile</a>
<a href="#orders">Orders</a>
<a href="#reviews">Reviews</a>

`+(S.sid
?'<a href="#dash">My Shop</a>'
:'<a href="#join">Become a Sakhi</a>'
)+LGSEL;

$('#lg').value=LG
};

/* HOMEPAGE */

const V={};

V.home=()=>{

const f=[
['📝','Start with a simple registration','Your phone number is all you need to begin.'],
['🏪','Your own digital storefront','Every woman and SHG gets a space of their own.'],
['🎤','Speak. Don’t type.','Add products using your voice in Hindi.'],
['💰','Every rupee belongs to her','No platform commission. Direct earnings.'],
['📱','Her story travels with her','A QR code connects customers to the maker.'],
['✨','She makes it. AI helps her sell it.','No fancy words? No problem. Sakhi AI turns her simple words or product photo into a beautiful product title, description and caption.']
];

app.innerHTML=`

<section class="hero">

<span class="hero-label">
✦ A marketplace with a mission
</span>

<h1>
Her hands create.<br>
Her dreams grow.
</h1>

<p>
Behind every handmade product is a woman with a skill,
a dream, and a story worth supporting.
GramSakhi brings her work to the world.
</p>

<div class="hero-actions">

<a class="btn" href="#shop">
Explore Her Creations →
</a>

<a class="btn o" href="#join">
Become a Sakhi
</a>

</div>

<div class="hero-note">
🌾 Built for women. Powered by opportunity.
</div>

</section>


<section class="mission-strip">

<div>
<span class="mission-symbol">✦</span>
<p>
<strong>Skill</strong>
<small>Her talent deserves recognition.</small>
</p>
</div>

<div>
<span class="mission-symbol">✦</span>
<p>
<strong>Opportunity</strong>
<small>Her work deserves a marketplace.</small>
</p>
</div>

<div>
<span class="mission-symbol">✦</span>
<p>
<strong>Independence</strong>
<small>Her income can shape her future.</small>
</p>
</div>

</section>


<section class="home-section">

<div class="section-heading">

<span class="eyebrow">
THE GRAMSAKHI DIFFERENCE
</span>

<h2>
Technology that works<br>
<span>for her, not the other way around.</span>
</h2>

<p>
We believe technology should make things easier,
not harder. That's why GramSakhi is designed
around the real needs of women entrepreneurs.
</p>

</div>

<div class="grid feature-grid">

${f.map((x,i)=>`

<div class="card feature-card ${i===5?'ai-feature':''}"
${i===5?'onclick="openAI()" role="button" tabindex="0" onkeydown="if(event.key===\'Enter\')openAI()"':''}>

<div class="feature-icon">
${x[0]}
</div>

<span class="feature-number">
0${i+1}
</span>

<h3>
${x[1]}
</h3>

<p>
${x[2]}
</p>

${i===5?`
<div class="ai-cta">
TRY SAKHI AI → 
</div>
`:''}

</div>

`).join('')}

</div>

</section>


<section class="home-section" id="home-categories">

<div class="section-heading">

<span class="eyebrow">
MADE WITH LOVE
</span>

<h2>
Discover her craft.
</h2>

<p>
From recipes passed down through generations
to beautiful creations made by hand.
</p>

</div>

<div class="grid category-grid">

${CATS.map(c=>`

<a href="#shop/${c}" class="card category-card">

<div class="category-icon">
${CE[c]}
</div>

<h3>${c}</h3>

<span>
Explore collection →
</span>

</a>

`).join('')}

</div>

</section>


<section class="home-section">

<div class="section-heading section-heading-row">

<div>

<span class="eyebrow">
STRAIGHT FROM HER HANDS
</span>

<h2>
Little treasures.<br>
Big stories.
</h2>

</div>

<a href="#shop" class="btn">
View everything →
</a>

</div>

${grid(S.products.filter(p=>p.stock>0).slice(-6).reverse())}

</section>


<section class="story-banner">

<div class="story-content">

<span class="eyebrow">
MORE THAN A MARKETPLACE
</span>

<h2>
When she earns,<br>
<span>the whole community rises.</span>
</h2>

<p>
Behind every product is a woman with a skill,
a dream and the courage to turn it into something
of her own. Your support helps her take the next step.
</p>

<a href="#stores" class="btn story-btn">
Meet our Sakhis →
</a>

</div>

<div class="story-decoration">
🌻
</div>

</section>


<section class="final-cta">

<span class="eyebrow">
HER JOURNEY STARTS HERE
</span>

<h2>
She already has the talent.<br>
Let’s give her the platform.
</h2>

<p>
Have something beautiful to make?
A skill worth sharing?
Your digital shop is just a few steps away.
</p>
<a href="#join" class="btn">
Start your journey →
</a>

</section>

`;
};

/* PRODUCT BROWSING */

const chips=c=>
`<p>${['',...CATS].map(x=>
`<a class="btn ${x==c?'':'o'}" href="#shop/${x}">${x||'सब'}</a>`
).join(' ')}</p>`;

V.shop=c=>{
app.innerHTML=`
<h2>🛍️ सारा सामान</h2>
${chips(c)}
<input id="sq" placeholder="🔍 नाम से खोजें" oninput="fl('${c}')">
<div id="gl"></div>`;
fl(c)
};

function fl(c){
const t=$('#sq').value.toLowerCase();
$('#gl').innerHTML=grid(
S.products.filter(p=>p.stock>0&&(!c||p.cat==c)&&(p.name+sn(sel(p.sid))).toLowerCase().includes(t))
)
}

V.cats=()=>{
app.innerHTML=`
<h2>🗂️ सामान की किस्में</h2>
<div class="grid">
${CATS.map(c=>`
<a href="#shop/${c}" style="text-decoration:none;color:inherit">
<div class="card tile">
<div>${CE[c]}</div>
${c}<br>
<small>${S.products.filter(p=>p.cat==c&&p.stock>0).length} सामान</small>
</div>
</a>
`).join('')}
</div>`
};

V.p=i=>{
const p=prod(i);
if(!p)return V.home();
const s=sel(p.sid),rv=S.reviews.filter(x=>x.pid==p.id);

app.innerHTML=`
<div class="card">
${img(p)}
<h1>${E(p.name)}</h1>
<h2>${rs(p.price)} ${stars(p.id)}</h2>

<p>📖 <b>कहानी:</b> ${E(p.story)||'—'}</p>

<p>👩 <a href="#store/${s.id}">${E(sn(s))}</a>,
${E(s.village)} · स्टॉक: ${p.stock}</p>

<p>💰 प्लेटफ़ॉर्म शुल्क ₹0 · पूरा पैसा विक्रेता को।</p>

<button onclick="addCart(${p.id})">🛒 कार्ट में डालें</button>
<button class="o" onclick="wish(${p.id})">♡ पसंद</button>
<button onclick="addCart(${p.id});location.hash='#cart'">⚡ अभी खरीदें</button>
</div>

<h3>⭐ समीक्षाएँ</h3>
`+
(rv.map(x=>`
<div class="card sp">
${'⭐'.repeat(x.r)} ${E(x.name)}<br>
${E(x.t)}
</div>
`).join('')||'<p>अभी कोई समीक्षा नहीं।</p>')
};

function wish(i){
const k=S.wish.indexOf(i);
k<0?S.wish.push(i):S.wish.splice(k,1);
save();
toast(k<0?'♥ पसंद में जुड़ा':'पसंद से हटाया');
route(1)
}

function addCart(i){
const c=S.cart.find(x=>x.pid==i),p=prod(i);
if(c){
if(c.q<p.stock)c.q++
}else S.cart.push({pid:i,q:1});
save();
nav();
toast('🛒 कार्ट में जुड़ा')
}

V.wishlist=()=>{
app.innerHTML=`<h2>♥ मेरी पसंद</h2>`+grid(S.wish.map(prod).filter(Boolean))
};

V.stores=()=>{
app.innerHTML=`
<h2>👭 SHG और महिलाओं की दुकानें</h2>
<div class="grid">
${S.sellers.map(x=>`
<div class="card">
<h3>${x.kind=='group'?'👭':'👩'} ${E(sn(x))}</h3>
📍 ${E(x.village)}<br>
${S.products.filter(p=>p.sid==x.id).length} सामान<br>
<a class="btn" href="#store/${x.id}">दुकान देखें</a>
</div>
`).join('')}
</div>`
};

V.stories=()=>{
app.innerHTML=`
<h2>📖 विक्रेताओं की कहानियाँ</h2>
`+S.sellers.map(x=>`
<div class="card sp">
<h3>${E(sn(x))}, ${E(x.village)}</h3>
<p>${E(x.story)}</p>
<a href="#store/${x.id}">दुकान देखें</a>
</div>
`).join('')
};

V.store=i=>{
const s=sel(i);
if(!s)return V.stores();

app.innerHTML=`
<div class="card">
<h1>${E(sn(s))}</h1>
<p>📍 ${E(s.village)} · संचालिका: ${E(s.name)}</p>
<p>${E(s.story)}</p>
${s.members.length?`<p>👭 सदस्य: ${s.members.map(E).join(', ')}</p>`:''}
<div id="q0"></div>
<small>इस QR को स्कैन करने पर यही पन्ना खुलता है</small>
</div>

<h2>सामान</h2>
`+grid(S.products.filter(p=>p.sid==s.id&&p.stock>0));

qr('q0','#store/'+i)
};

V.about=()=>{
app.innerHTML=`
<div class="card">
<h2>ℹ️ हमारे बारे में</h2>
<p>
ग्रामसखी ग्रामीण महिलाओं और स्वयं सहायता समूहों के लिए बनी वेबसाइट है,
ताकि हर महिला तकनीक जाने बिना अपना सामान ऑनलाइन बेच सके।
</p>
</div>`
};

V.contact=()=>{
app.innerHTML=`
<div class="card">
<h2>📞 संपर्क करें</h2>
<p>फ़ोन: 1800-000-000<br>ईमेल: help@gramsakhi.in</p>
${F('kn','आपका नाम','',1)}
${F('km','आपका संदेश','',1)}
<button onclick="sendMsg()">भेजें</button>
</div>`
};

async function sendMsg(){
await run(async()=>{
await api('message_add',{name:$('#kn').value,message:$('#km').value});
toast('✅ संदेश भेज दिया');
V.contact()
})
};

V.profile=()=>{
const u=S.cust;

app.innerHTML=`
<div class="card">
<h2>🙍 मेरी प्रोफ़ाइल</h2>
${F('un','नाम','',1)}
${F('up','फ़ोन नंबर')}
${F('ua','पूरा पता','',1)}
<button onclick="S.cust={name:$('#un').value,phone:$('#up').value,address:$('#ua').value};save();toast('✅ सहेज लिया')">
सहेजें
</button>
</div>`;

$('#un').value=u.name;
$('#up').value=u.phone;
$('#ua').value=u.address
};

/* CART */

V.cart=()=>{
const L=S.cart.map(c=>({...c,p:prod(c.pid)})).filter(x=>x.p),
tot=L.reduce((a,x)=>a+x.p.price*x.q,0);

app.innerHTML=`
<h2>🛒 मेरी कार्ट</h2>
`+
(L.map(x=>`
<div class="card row sp">
<span style="flex:1">
${E(x.p.name)}<br>
${rs(x.p.price)} × ${x.q}
</span>
<button class="o" onclick="qty(${x.pid},-1)">➖</button>
<button class="o" onclick="qty(${x.pid},1)">➕</button>
</div>
`).join('')||'<p>कार्ट खाली है।</p>')+
(L.length?`
<div class="card sp">
<p>कुल: <b>${rs(tot)}</b> · प्लेटफ़ॉर्म शुल्क ₹0 · पूरा पैसा विक्रेता को</p>
${F('cn','आपका नाम','',1)}
${F('cp','फ़ोन नंबर')}
${F('ca','पूरा पता','',1)}
<label for="cy">भुगतान कैसे करेंगे?</label>
<select id="cy">
<option value="COD">सामान मिलने पर नकद</option>
<option value="UPI">UPI से सीधे विक्रेता को</option>
</select>
<button onclick="checkout()">✅ ऑर्डर पक्का करें</button>
</div>
`:'');
if(L.length){
$('#cn').value=S.cust.name;
$('#cp').value=S.cust.phone;
$('#ca').value=S.cust.address
}
};

function qty(i,d){
const c=S.cart.find(x=>x.pid==i),p=prod(i);
c.q=Math.min(p.stock,c.q+d);
if(c.q<=0)S.cart=S.cart.filter(x=>x!==c);
save();
nav();
route(1)
}

async function checkout(){
const g=i=>$('#'+i).value.trim(),pay=g('cy');
if(!(g('cn')&&g('cp')&&g('ca')))return alert('नाम, फ़ोन नंबर और पता भरें');

const up=[...new Set(S.cart.map(c=>prod(c.pid)).filter(Boolean).map(p=>sel(p.sid)).map(x=>sn(x)+': '+(x.upi||'फ़ोन पर पूछें')))];

await run(async()=>{
await api('order_create',{
items:S.cart.map(c=>({pid:c.pid,q:c.q})),
name:g('cn'),
phone:g('cp'),
addr:g('ca'),
pay
});

S.cust={name:g('cn'),phone:g('cp'),address:g('ca')};
S.cart=[];
save();
await boot();

alert('🎉 ऑर्डर पक्का हो गया!'+(pay=='UPI'?
'\nUPI से सीधे भेजें:\n'+up.join('\n'):
'\nसामान मिलने पर पैसे दें।'));

location.hash='#orders'
})
}

V.orders=async()=>{
try{
const o=(await api('my_orders')).orders.reverse();

app.innerHTML=`
<h2>📦 मेरे ऑर्डर</h2>
<p><small>इस ब्राउज़र से दिए गए ऑर्डर यहाँ दिखते हैं।</small></p>
`+
o.map(x=>`
<div class="card sp">
#${x.id} ${E(x.pname)} × ${x.q} = <b>${rs(x.total)}</b> (${x.pay})
<span class="st">${ST[x.status]}</span>
${x.status=='done'&&x.pid?`<br><button class="o" onclick="review(${x.pid})">⭐ समीक्षा लिखें</button>`:''}
</div>
`).join('')+
(o.length?'':'<p>अभी कोई ऑर्डर नहीं।</p>')
}catch(e){fail(e)}
};

async function review(pid){
const r=+prompt('कितने सितारे? (1 से 5)','5');
if(!(r>=1&&r<=5))return;
const t=prompt('अपनी राय लिखें')||'';

await run(async()=>{
await api('review_add',{pid,r,t});
await boot();
toast('धन्यवाद! समीक्षा जुड़ गई')
})
};

V.reviews=async()=>{
try{
const l=(await api('my_reviews')).reviews;

app.innerHTML=`
<h2>⭐ मेरी समीक्षाएँ</h2>
`+
(l.map(x=>`
<div class="card sp">
<b>${E((prod(x.pid)||{}).name||'सामान')}</b>
${'⭐'.repeat(x.r)}<br>
${E(x.t)}
</div>
`).join('')||
'<p>अभी कोई समीक्षा नहीं। पहुँचे हुए ऑर्डर पर समीक्षा लिख सकते हैं।</p>')
}catch(e){fail(e)}
};
/* SELLER LOGIN & REGISTRATION */

V.join=()=>{
if(S.sid){
location.hash='#dash';
return
}

app.innerHTML=`
<div class="card">

<h2>🔑 लॉगिन</h2>

<p><small>डेमो: 9999999999 / पिन 1234</small></p>

${F('lp','फ़ोन नंबर')}

<label for="lpin">4 अंक का पिन</label>
<input id="lpin" type="password" maxlength="4" inputmode="numeric">

<button onclick="login()">लॉगिन करें</button>

</div>

<div class="card sp">

<h2>📝 नई दुकान खोलें</h2>

<label for="rk">आप कौन हैं?</label>

<select id="rk">
<option value="group">👭 SHG समूह</option>
<option value="individual">👩 अकेली महिला</option>
</select>

${F('rn','आपका नाम','',1)}
${F('rp','फ़ोन नंबर')}

<label for="rpin">4 अंक का पिन (याद रखें)</label>
<input id="rpin" type="password" maxlength="4" inputmode="numeric">

${F('rs','समूह / दुकान का नाम','',1)}
${F('rv','गाँव','',1)}
${F('rm','समूह की सदस्य (नाम, कॉमा से अलग)','',1)}
${F('ru','UPI ID (न हो तो छोड़ दें)')}
${F('rst','आपकी कहानी','हम क्या बनाते हैं?',1)}

<button onclick="reg()">✅ दुकान बनाएँ</button>

</div>
`
};

async function login(){
await run(async()=>{
await api('login',{
phone:$('#lp').value.trim(),
pin:$('#lpin').value
});
await boot();
location.hash='#dash'
})
}

async function reg(){
const g=i=>$('#'+i).value.trim();

if(!g('rn')||!g('rp')||g('rpin').length!=4)
return alert('नाम, फ़ोन नंबर और 4 अंक का पिन ज़रूरी है');

await run(async()=>{
await api('register',{
kind:g('rk'),
name:g('rn'),
phone:g('rp'),
pin:g('rpin'),
shg:g('rs'),
village:g('rv'),
story:g('rst'),
upi:g('ru'),
members:g('rm').split(/[,،]/).map(x=>x.trim()).filter(Boolean)
});

await boot();
location.hash='#dash'
})
}

async function out(){
await run(async()=>{
await api('logout',{});
await boot();
location.hash='#';
route()
})
}

const mine=()=>S.products.filter(p=>p.sid==S.sid);
const myo=()=>S.orders.filter(o=>o.sid==S.sid).reverse();

async function stk(i,d){
await run(async()=>{
await api('product_stock',{id:i,delta:d});
await boot();
route(1)
})
}

async function del(i){
if(confirm('सामान हटाएँ?'))
await run(async()=>{
await api('product_delete',{id:i});
S.cart=S.cart.filter(c=>c.pid!=i);
S.wish=S.wish.filter(w=>w!=i);
save();
await boot();
route(1)
})
}

async function setSt(i,k){
await run(async()=>{
await api('order_status',{id:i,status:k});
await boot();
route(1)
})
}

async function addm(){
const n=$('#mn').value.trim();
if(n)
await run(async()=>{
await api('member_add',{name:n});
await boot();
route(1)
})
}

/* SELLER DASHBOARD */

const D={

// add:()=>`
// <h2>🎤 सामान जोड़ें</h2>

// <p>पीले 🎤 बटन को दबाकर हिंदी में बोलिए।</p>

// <button type="button" class="mic" style="font-size:20px" onclick="mic3(this)">
// 🎤 सब एक बार में बोलिए
// </button>

// <p><small>जैसे: "आम का अचार 150 रुपये 20"</small></p>

// ${F('pn','सामान का नाम','जैसे: आम का अचार',1)}
// ${F('pp','दाम (₹)','',1,1)}
// ${F('pq','कितना सामान है (संख्या)')}

// <label for="pc">किस्म</label>

// <select id="pc">
// ${CATS.map(c=>`<option value="${c}">${c}</option>`).join('')}
// </select>

// ${F('ps','इसकी कहानी','किसने, कैसे बनाया?',1)}

// <label for="pi">📷 फ़ोटो</label>
// <input id="pi" type="file" accept="image/*" capture="environment">

// <button onclick="addp()">✅ बेचने के लिए डालें</button>
// `,

//  add: () => `
//     <h2>🎤 सामान जोड़ें</h2>

//     <p>पीले 🎤 बटन को दबाकर हिंदी में बोलिए।</p>

//     <button type="button" class="mic" onclick="mic3(this)">
//       🎤 सब एक बार में बोलिए
//     </button>

//     <p><small>जैसे: "आम का अचार 150 रुपये 20"</small></p>

//     ${F('pn', 'सामान का नाम', 'जैसे: आम का अचार', 1)}
//     ${F('pp', 'दाम (₹)', '', 1, 1)}
//     ${F('pq', 'कितना सामान है (संख्या)')}

//     <label for="pc">किस्म</label>
//     <select id="pc">
//       ${CATS.map(c => `<option value="${c}">${c}</option>`).join('')}
//     </select>

//     ${F('ps', 'इसकी कहानी', 'किसने, कैसे बनाया?', 1)}

//     <label for="pi">📷 फ़ोटो</label>
//     <input id="pi" type="file" accept="image/*" capture="environment">

//     <button onclick="addp()">✅ बेचने के लिए डालें</button>
//   `,

add: () => `
<h2>🎤 सामान जोड़ें</h2>

<p>पीले 🎤 बटन को दबाकर हिंदी में बोलिए।</p>

<button type="button" class="mic" style="font-size:20px" onclick="mic3(this)">
🎤 सब एक बार में बोलिए
</button>

<p><small>जैसे: "आम का अचार 150 रुपये 20"</small></p>

${F('pn','सामान का नाम','जैसे: आम का अचार',1)}
${F('pp','दाम (₹)','',1,1)}
${F('pq','कितना सामान है (संख्या)')}

<label for="pc">किस्म</label>
<select id="pc">
${CATS.map(c => `<option value="${c}">${c}</option>`).join('')}
</select>

${F('ps','इसकी कहानी','किसने, कैसे बनाया?',1)}

<label for="pi">📷 फ़ोटो</label>
<input id="pi" type="file" accept="image/*" capture="environment">

<button onclick="addp()">✅ बेचने के लिए डालें</button>
`,

stock:()=>`
<h2>📦 सामान का स्टॉक</h2>
`+
(mine().map(x=>`
<div class="card row sp">

<span style="flex:1">
${E(x.name)} ${rs(x.price)}<br>
स्टॉक: <b>${x.stock}</b>
</span>

<button class="o" onclick="stk(${x.id},-1)">➖</button>
<button class="o" onclick="stk(${x.id},1)">➕</button>
<button class="o" onclick="del(${x.id})">🗑️</button>

</div>
`).join('')||'<p>अभी कोई सामान नहीं। "सामान जोड़ें" दबाइए।</p>'),

orders:()=>`
<h2>🧾 ऑर्डर</h2>
`+
(myo().map(x=>`
<div class="card sp">

<b>#${x.id} ${E(x.pname)} × ${x.q} = ${rs(x.total)}</b>
(${x.pay})<br>

👤 ${E(x.cname)} · 📞 ${E(x.phone)}<br>
📍 ${E(x.addr)}<br>

<span class="st">${ST[x.status]}</span><br>

${Object.keys(ST).map(k=>
`<button class="o" onclick="setSt(${x.id},'${k}')">${ST[k]}</button>`
).join(' ')}

</div>
`).join('')||'<p>अभी कोई ऑर्डर नहीं आया।</p>'),

money:()=>{
const o=myo(),
done=o.filter(x=>x.status=='done').reduce((a,x)=>a+x.total,0),
wait=o.filter(x=>x.status!='done').reduce((a,x)=>a+x.total,0),
m=me().members,
n=m.length||1;

return `
<h2>💰 बिक्री और कमाई</h2>

<div class="card">

<p>✅ मिल चुका (पहुँचे ऑर्डर): <b>${rs(done)}</b></p>
<p>⏳ आने वाला: <b>${rs(wait)}</b></p>
<p>प्लेटफ़ॉर्म शुल्क: <b>₹0</b></p>

${m.length?`
<h3>👭 बराबर बँटवारा (${n} सदस्य)</h3>
${m.map(x=>`<p>${E(x)}: ${rs((done/n).toFixed(0))}</p>`).join('')}
`:''}

</div>
`
},

members:()=>`
<h2>👭 समूह के सदस्य</h2>

${me().members.map(x=>`<p>👩 ${E(x)}</p>`).join('')||'<p>अभी कोई सदस्य नहीं।</p>'}

${F('mn','नया सदस्य','',1)}

<button onclick="addm()">➕ सदस्य जोड़ें</button>
`,

qr:()=>{
setTimeout(()=>{
qr('q0','#store/'+S.sid);
mine().forEach(x=>qr('q'+x.id,'#p/'+x.id))
});

return `
<h2>📱 QR कोड</h2>

<p>
प्रिंट करके दुकान या डिब्बे पर चिपकाइए।
स्कैन करने पर ग्राहक आपकी कहानी देखेगा।
</p>

<button class="np" onclick="print()">🖨️ प्रिंट करें</button>

<div class="card sp">
<h3>मेरी दुकान</h3>
<div id="q0"></div>
</div>
`+
mine().map(x=>`
<div class="card sp">
<h3>${E(x.name)}</h3>
<div id="q${x.id}" class="qr-code"></div>
</div>
`).join('')
}

};

V.dash=a=>{
if(!S.sid){
location.hash='#join';
return
}

const T=[
['store','🏪','मेरी डिजिटल दुकान'],
['add','🎤','सामान जोड़ें'],
['stock','📦','स्टॉक सँभालें'],
['orders','🧾','ऑर्डर सँभालें'],
['money','💰','बिक्री और कमाई'],
['members','👭','समूह के सदस्य'],
['qr','📱','QR कोड']
];

const o=myo();

const sum=a?'':`
<div class="grid sp">

<div class="card tile">
🆕<br>
${o.filter(x=>x.status=='new').length} नए ऑर्डर
</div>

<div class="card tile">
📦<br>
${mine().length} सामान
</div>

<div class="card tile">
💰<br>
${rs(o.reduce((s,x)=>s+x.total,0))} कुल बिक्री
</div>

</div>
`;

app.innerHTML=`
<h2>🏠 विक्रेता डैशबोर्ड: ${E(me().name)} 🙏</h2>

<div class="grid">

${T.map(t=>`
<a href="${t[0]=='store'?'#store/'+S.sid:'#dash/'+t[0]}"
style="text-decoration:none;color:inherit">

<div class="card tile">
<div>${t[1]}</div>
${t[2]}
</div>

</a>
`).join('')}

</div>

${sum}

<p>
<button class="o" onclick="out()">🚪 बाहर निकलें</button>
</p>

<hr>
` + (typeof D[a] === 'function' ? D[a]() : '')
};

/* ADD PRODUCT */

async function addp(){
const f=$('#pi').files[0],
g=i=>$('#'+i).value.trim();
let image='';

if(!g('pn'))
return alert('सामान का नाम बताइए');

if(!( +g('pp')>0 ))
return alert('दाम सिर्फ़ अंकों में बताइए');

if(f)
image=await new Promise(r=>{
const i=new Image();

i.onload=()=>{
const c=document.createElement('canvas'),
k=Math.min(1,400/i.width);

c.width=i.width*k;
c.height=i.height*k;
c.getContext('2d').drawImage(i,0,0,c.width,c.height);

r(c.toDataURL('image/jpeg',.7))
};

i.onerror=()=>r('');
i.src=URL.createObjectURL(f)
});

await run(async()=>{
await api('product_add',{
name:g('pn'),
price:+g('pp'),
stock:+g('pq')||1,
cat:g('pc'),
story:g('ps'),
image
});

await boot();
toast('✅ सामान जुड़ गया!');
location.hash='#dash/stock'
})
}
/* SAKHI AI */

function openAI(){
$('#aiBackdrop').classList.add('show');
$('#aiResult').classList.remove('show');
$('#aiLoading').classList.remove('show');
document.body.style.overflow='hidden'
}

function closeAI(){
$('#aiBackdrop').classList.remove('show');
document.body.style.overflow='';
}

function previewAIPhoto(input){
const f=input.files[0];
if(!f)return;

const img=$('#aiPreview');
img.src=URL.createObjectURL(f);
img.style.display='block'
}

function aiMic(b){
const R=window.SpeechRecognition||window.webkitSpeechRecognition;

if(!R)
return alert('Voice input works best in Google Chrome.');

const r=new R();
r.lang=LG=='en'?'en-IN':'hi-IN';
r.continuous=false;
r.interimResults=false;

b.classList.add('on');

r.onresult=e=>{
$('#aiText').value+=
($('#aiText').value?' ':'')+
e.results[0][0].transcript
};

r.onend=r.onerror=()=>b.classList.remove('on');

try{r.start()}catch(e){b.classList.remove('on')}
}

/*
DEMO GENERATOR

This is currently a front-end demonstration.
It does NOT call an actual AI API yet.

The output is generated from the text supplied by the user.
*/

function generateAI(){

const text=$('#aiText').value.trim();
const photo=$('#aiPhoto').files[0];

if(!text&&!photo){
return alert('Please tell us about your product or upload a photo.')
}

$('#aiResult').classList.remove('show');
$('#aiLoading').classList.add('show');

setTimeout(()=>{

let source=text||'Handmade product created with love and care';

let name='Handmade Creation';
let description='';
let highlights='';
let caption='';

const lower=source.toLowerCase();

/* SIMPLE DEMO PRODUCT RECOGNITION */

if(lower.includes('achar')||lower.includes('pickle')||lower.includes('अचार')){

name='Traditional Homemade Pickle';
description=
'Bring the authentic taste of home to your table. '+
source+
' Carefully prepared using traditional methods, '+
'this homemade pickle carries the warmth of family recipes '+
'and the goodness of handcrafted food.';

highlights=
'🌿 Homemade with care\n'+
'🥭 Traditional recipe\n'+
'❤️ Made with love';

caption=
'A taste of tradition in every bite! 🌶️ '+
'Our homemade pickle brings authentic flavours '+
'and generations of love to your table. '+
'Support handmade. Support local women. ❤️';

}

else if(lower.includes('papad')||lower.includes('पापड़')){

name='Homemade Traditional Papad';

description=
'Crunchy, delicious and made with care! '+
source+
' Prepared using traditional techniques, '+
'these handmade papads bring the authentic taste '+
'of homemade goodness to every meal.';

highlights=
'🌾 Handmade with care\n'+
'🍽️ Perfect with every meal\n'+
'❤️ Traditional homemade goodness';

caption=
'Something crunchy, something homemade! ✨ '+
'Our traditional papads are made with love '+
'and bring a little taste of home to your plate.';

}

else if(lower.includes('masala')||lower.includes('spice')||lower.includes('मसाला')){

name='Homemade Traditional Spice Mix';

description=
'Bring the aroma of traditional Indian kitchens to your home. '+
source+
' Made with carefully selected ingredients '+
'and prepared with love, this spice mix adds '+
'authentic flavour to every dish.';

highlights=
'🌶️ Traditional flavours\n'+
'🌿 Carefully prepared\n'+
'❤️ Made with love';

caption=
'Every kitchen has a secret ingredient. ✨ '+
'Our homemade spices bring tradition, flavour '+
'and a little extra love to your cooking!';

}

else if(lower.includes('cloth')||lower.includes('embroid')||lower.includes('कढ़ाई')||lower.includes(' कपड़ा')){

name='Handcrafted Traditional Textile';

description=
'A beautiful creation made by skilled hands. '+
source+
' Each piece reflects the dedication, creativity '+
'and craftsmanship of the women who made it. '+
'Every detail carries a story of its own.';

highlights=
'🧵 Handmade craftsmanship\n'+
'✨ Unique and thoughtfully created\n'+
'❤️ Made by skilled artisans';

caption=
'Not just a product, but a piece of creativity. 💛 '+
'Made by hand, made with love, made to be cherished.';

}

else if (
  lower.includes('handloom') ||
  lower.includes('hand loom') ||
  lower.includes('weaving') ||
  lower.includes('woven') ||
  lower.includes('हथकरघा') ||
  lower.includes('बुनाई') ||
  lower.includes('करघा')
) {
  name = 'Handwoven Handloom Creations';

  description =
    'Our handmade handloom products are woven with care, skill, and a deep respect for traditional craftsmanship. ' +
    'Each piece is thoughtfully made, giving you a unique textile with warmth and character.';

  highlights =
    '🧵 Woven by hand\n' +
    '🌿 Made with care\n' +
    '✨ Each piece is unique';

  caption =
    'Tradition woven into every thread. 🧵 Discover our handmade handloom creations, made with care and skill.';
}

else if (
  (lower.includes('bamboo') || lower.includes('बांस') || lower.includes('बाँस')) &&
  (lower.includes('chair') || lower.includes('कुर्सी'))
) {
  name = 'Handcrafted Bamboo Chair';

  description =
    'Add a natural touch to your home with this handcrafted bamboo chair. ' +
    'Its hand-finished design brings the beauty of traditional craftsmanship ' +
    'to your seating space.';

  highlights =
    '🎋 Made with bamboo\n' +
    '🪑 Handcrafted design\n' +
    '✨ A natural addition to your home';

  caption =
    'Bring the warmth of handcrafted bamboo into your home. 🎋';
}

else{

name='Handcrafted with Love';

description=
'Every handmade creation tells a story. '+
source+
' Thoughtfully crafted with dedication and care, '+
'this product brings together skill, creativity '+
'and the warmth of handmade goodness.';

highlights=
'✨ Thoughtfully handcrafted\n'+
'🌿 Made with care\n'+
'❤️ Every piece tells a story';

caption=
'Made by hand. Made with heart. ❤️ '+
'Discover the beauty of handmade creations '+
'and support the women behind every product.';

}

/* SHOW RESULTS */

$('#aiTitle').textContent=name;

$('#aiDescription').textContent=description;

$('#aiHighlights').textContent=highlights;

$('#aiCaption').textContent=caption;

$('#aiLoading').classList.remove('show');

$('#aiResult').classList.add('show');

},1000)
}

function copyAI(id){
const t=$('#'+id).innerText;

if(navigator.clipboard){
navigator.clipboard.writeText(t)
.then(()=>toast('📋 Copied!'))
.catch(()=>copyFallback(t))
}else{
copyFallback(t)
}
}

function copyFallback(t){
const a=document.createElement('textarea');
a.value=t;
document.body.appendChild(a);
a.select();
document.execCommand('copy');
a.remove();
toast('📋 Copied!')
}

/* LANGUAGE */

let LG='hi';

try{
LG=localStorage.getItem('gl')||'hi'
}catch(e){}

document.documentElement.lang=LG;

const LGSEL=`
<select id="lg" aria-label="Language" onchange="setLg(this.value)">
<option value="hi">🌐 हिन्दी</option>
<option value="en">🌐 English</option>
</select>
`;

const EN=`ग्रामसखी|GramSakhi
हर महिला की अपनी ऑनलाइन दुकान।|Every woman's own online shop.
बोलिए, सामान डालिए, बेचिए।|Speak, add your items, sell.
दुकान शुरू करें|Start your shop
खरीदारी करें|Shop now
हमारी 5 ख़ास बातें|Our 6 special features
आसान SHG रजिस्ट्रेशन|Easy SHG registration
फ़ोन नंबर और 4 अंक का पिन|Phone number and a 4-digit PIN
अपनी या समूह की दुकान|Your own or group shop
हर महिला/समूह की डिजिटल दुकान|A digital shop for every woman/group
हिंदी में बोलकर सामान डालें|Add items by speaking in Hindi
टाइप करने की ज़रूरत नहीं|No typing needed
सीधा ऑर्डर, साफ़ भुगतान|Direct orders, clear payments
कोई कमीशन नहीं, पूरा पैसा दीदी को|No commission, all the money goes to Didi
QR पहचान और कहानी|QR identity and story
स्कैन करें, बनाने वाली को जानें|Scan and meet the maker
नया सामान|New products
होम|Home
सारा सामान|All products
सामान की किस्में|Product categories
किस्में|Categories
SHG दुकानें|SHG shops
कहानियाँ|Stories
हमारे बारे में|About us
संपर्क करें|Contact us
संपर्क|Contact
मेरी प्रोफ़ाइल|My profile
प्रोफ़ाइल|Profile
मेरी पसंद|My wishlist
पसंद में जुड़ा|Added to wishlist
पसंद से हटाया|Removed from wishlist
पसंद में जोड़ें|Add to wishlist
पसंद|Wishlist
मेरी कार्ट|My cart
कार्ट खाली है।|Your cart is empty.
कार्ट में डालें|Add to cart
कार्ट में जुड़ा|Added to cart
कार्ट|Cart
मेरे ऑर्डर|My orders
मेरी समीक्षाएँ|My reviews
मेरी दुकान का खाता|My shop account
मेरी डिजिटल दुकान|My digital store
मेरी दुकान|My shop
नाम से खोजें|Search by name
SHG और महिलाओं की दुकानें|SHG and women's shops
दुकान देखें|View shop
की दुकान|'s shop
विक्रेताओं की कहानियाँ|Seller stories
संचालिका:|Run by:
सदस्य:|Members:
इस QR को स्कैन करने पर यही पन्ना खुलता है|Scanning this QR opens this page
ग्रामसखी ग्रामीण महिलाओं और स्वयं सहायता समूहों के लिए बनी वेबसाइट है, ताकि हर महिला तकनीक जाने बिना अपना सामान ऑनलाइन बेच सके।|GramSakhi is a website for rural women and self-help groups, so that every woman can sell her products online without needing to understand technology.
फ़ोन:|Phone:
ईमेल:|Email:
आपका नाम|Your name
आपका संदेश|Your message
भेजें|Send
संदेश भेज दिया|Message sent
पूरा पता|Full address
सहेज लिया|Saved
सहेजें|Save
कुल बिक्री|Total sales
कुल:|Total:
प्लेटफ़ॉर्म शुल्क|Platform fee
पूरा पैसा विक्रेता को|All the money goes to the seller
भुगतान कैसे करेंगे?|How will you pay?
सामान मिलने पर नकद|Cash on delivery
UPI से सीधे विक्रेता को|UPI directly to the seller
ऑर्डर पक्का करें|Confirm order
ऑर्डर पक्का हो गया!|Order confirmed!
UPI से सीधे भेजें:|Pay directly by UPI:
सामान मिलने पर पैसे दें।|Pay when you receive the items.
फ़ोन पर पूछें|Ask on phone
नाम, फ़ोन नंबर और पता भरें|Fill in name, phone number and address
कम करें|Decrease
बढ़ाएँ|Increase
हटाएँ|Remove
अपना फ़ोन नंबर|Your phone number
ऑर्डर देखें|View orders
इस नंबर पर कोई ऑर्डर नहीं।|No orders on this number.
समीक्षा लिखें|Write a review
कितने सितारे? (1 से 5)|How many stars? (1 to 5)
अपनी राय लिखें|Write your opinion
धन्यवाद! समीक्षा जुड़ गई|Thank you! Review added
अभी कोई समीक्षा नहीं। पहुँचे हुए ऑर्डर पर समीक्षा लिख सकते हैं।|No reviews yet. You can review delivered orders.
अभी कोई समीक्षा नहीं।|No reviews yet.
कहानी:|Story:
स्टॉक:|Stock:
अभी खरीदें|Buy now
अभी कोई सामान नहीं है।|No items yet.
अभी कोई सामान नहीं।|No items yet.
दबाइए।|(press it).
लॉगिन करें|Log in
लॉगिन|Login
डेमो:|Demo:
4 अंक का पिन (याद रखें)|4-digit PIN (remember it)
4 अंक का पिन|4-digit PIN
नई दुकान खोलें|Open a new shop
आप कौन हैं?|Who are you?
SHG समूह|SHG group
अकेली महिला|Individual woman
समूह / दुकान का नाम|Group / shop name
समूह की सदस्य (नाम, कॉमा से अलग)|Group members (names, comma-separated)
UPI ID (न हो तो छोड़ दें)|UPI ID (leave blank if none)
आपकी कहानी|Your story
हम क्या बनाते हैं?|What do we make?
दुकान बनाएँ|Create shop
फ़ोन नंबर या पिन ग़लत है|Phone number or PIN is wrong
नाम, फ़ोन नंबर और 4 अंक का पिन ज़रूरी है|Name, phone number and 4-digit PIN are required
यह फ़ोन नंबर पहले से जुड़ा है|This phone number is already registered
विक्रेता डैशबोर्ड:|Seller dashboard:
सामान जोड़ें|Add products
स्टॉक सँभालें|Manage inventory
ऑर्डर सँभालें|Manage orders
बिक्री और कमाई|Sales and earnings
समूह के सदस्य|Group members
QR कोड|QR code
नए ऑर्डर|New orders
बाहर निकलें|Log out
पीले 🎤 बटन को दबाकर हिंदी में बोलिए।|Press the yellow 🎤 button and speak in Hindi.
सब एक बार में बोलिए|Speak everything at once
सामान का स्टॉक|Product stock
सामान का नाम|Product name
सामान हटाएँ?|Remove this item?
सामान का नाम बताइए|Please tell the product name
दाम सिर्फ़ अंकों में बताइए|Enter the price in digits only
सामान जुड़ गया!|Product added!
दाम (₹)|Price (₹)
कितना सामान है (संख्या)|Quantity available (number)
इसकी कहानी|Its story
किसने, कैसे बनाया?|Who made it, and how?
बेचने के लिए डालें|List for sale
बोलकर भरें|Fill by speaking
बोलकर भरने के लिए Google Chrome खोलें|To fill by voice, open Google Chrome
अभी कोई ऑर्डर नहीं आया।|No orders yet.
मिल चुका (पहुँचे ऑर्डर):|Received (delivered orders):
आने वाला:|Upcoming:
बराबर बँटवारा|Equal split
नया सदस्य|New member
सदस्य जोड़ें|Add member
अभी कोई सदस्य नहीं।|No members yet.
प्रिंट करके दुकान या डिब्बे पर चिपकाइए। स्कैन करने पर ग्राहक आपकी कहानी देखेगा।|Print it and stick it on your shop or boxes. Customers who scan it will see your story.
प्रिंट करें|Print
आम का अचार|Mango pickle
मूंग पापड़|Moong papad
बाँस की टोकरी|Bamboo basket
कढ़ाई वाला रुमाल|Embroidered handkerchief
घर का गरम मसाला|Homemade garam masala
सखी स्वयं सहायता समूह|Sakhi Self-Help Group
सीता देवी|Sita Devi
राधा बेन|Radha Ben
रानपुर|Ranpur
सूरजपुर|Surajpur
सीता|Sita
गीता|Gita
रीता|Rita
दादी की रेसिपी से, सरसों के तेल में, धूप में पका हुआ।|From grandma's recipe, in mustard oil, ripened in the sun.
हाथ से बेले गए, बिना मिलावट के।|Hand-rolled, with no adulteration.
गाँव की कारीगर महिलाओं ने हाथ से बुनी।|Hand-woven by village artisan women.
एक रुमाल बनाने में दो दिन लगते हैं।|One handkerchief takes two days to make.
सिल-बट्टे पर पिसा, ताज़ा मसाला।|Fresh spice ground on a stone grinder.
हम 10 महिलाएँ मिलकर घर का बना अचार और पापड़ बनाती हैं।|We are 10 women who make homemade pickle and papad together.
मैं घर पर कढ़ाई और मसाले तैयार करती हूँ।|I make embroidery and spices at home.
अचार|Pickles
पापड़|Papad
मसाले|Spices
कपड़े|Clothes
हस्तशिल्प|Handicrafts
अन्य|Other
नया|New
पैक|Packed
भेजा|Shipped
पहुँचा|Delivered
सारा|All
जैसे|e.g.
रुपये|rupees
समीक्षाएँ|Reviews
समीक्षा|Review
ऑर्डर|Orders
फ़ोन नंबर|Phone number
फ़ोटो|Photo
किस्म|Category
गाँव|Village
पिन|PIN
नाम|Name
ग्राहक|Customer
स्टॉक|Stock
सामान|Items
सब|All
।|.
अमान्य अनुरोध|Invalid request
पहले लॉगिन करें|Please log in first
बहुत ज़्यादा कोशिशें। कुछ देर बाद फिर कोशिश करें।|Too many attempts. Please try again later.
सामान नहीं मिला|Item not found
सर्वर में गड़बड़ी हुई। फिर कोशिश करें।|Server error. Please try again.
सर्वर से जुड़ नहीं पाए। XAMPP में Apache और MySQL चालू करें।|Could not reach the server. Start Apache and MySQL in XAMPP.
डेटाबेस नहीं मिला। MySQL चालू करें और database.sql इम्पोर्ट करें।|Database not found. Start MySQL and import database.sql.
पहुँचे हुए ऑर्डर पर ही समीक्षा लिखी जा सकती है|Reviews can only be written for delivered orders
नाम और संदेश भरें|Fill in name and message
इस ब्राउज़र से दिए गए ऑर्डर यहाँ दिखते हैं।|Orders placed from this browser appear here.
अभी कोई ऑर्डर नहीं।|No orders yet.
Sakhi AI|Sakhi AI
आपकी कहानी, सुंदर शब्दों में।|Your story, beautifully told.
आपको बड़े शब्दों की ज़रूरत नहीं।|You don't need fancy words.
अपने उत्पाद के बारे में बताइए|Tell us about your product
बस अपने शब्दों में बताइए।|Just tell us in your own words.
फ़ोटो अपलोड करें|Upload a photo
बोलकर बताइए|Speak
उत्पाद का शीर्षक|Product title
उत्पाद का विवरण|Product description
उत्पाद की विशेषताएँ|Product highlights
सोशल मीडिया कैप्शन|Social media caption
कॉपी करें|Copy
कहानी बनाएँ|Create my story
Sakhi AI आपकी कहानी सुंदर बना रही है...|Sakhi AI is making your story beautiful...
इसे कॉपी करें|Copy this
हाथ से बनाया|Handmade
बनाने वाली|Maker
बिना मिलावट|No adulteration
पारंपरिक|Traditional
AI|AI
`;

let TB;

const tr=s=>{
s=String(s);

if(LG!='en'||!/[\u0900-\u097F]/.test(s))return s;

TB=TB||EN.trim().split('\n')
.filter(l=>l.includes('|'))
.map(l=>l.split('|').map(x=>x.normalize()))
.sort((a,b)=>b[0].length-a[0].length);

s=s.normalize();

for(const[h,e]of TB)
s=s.split(h).join(e);

return s
};

const mo=new MutationObserver(()=>tx());

function tx(){
if(LG!='en')return;

mo.disconnect();

const w=document.createTreeWalker(document.body,4);
let n,v;

while(n=w.nextNode()){
if(n.parentNode.nodeName=='SCRIPT')continue;
v=tr(n.nodeValue);
if(v!==n.nodeValue)n.nodeValue=v
}

document.querySelectorAll('[placeholder],[aria-label]')
.forEach(e=>['placeholder','aria-label'].forEach(a=>{
const o=e.getAttribute(a);
if(o)e.setAttribute(a,tr(o))
}));

mo.observe(document.body,{childList:true,subtree:true})
}

function setLg(v){
LG=v;
try{localStorage.setItem('gl',v)}catch(e){}
document.documentElement.lang=v;
route(1);
tx()
}

/* ROUTING */

function route(k){
nav();

const[v,a]=(location.hash.slice(1)||'home').split('/');

(V[v]||V.home)(decodeURIComponent(a||''));

if(!k)scrollTo(0,0)
}

addEventListener('hashchange',()=>{
boot().then(()=>route()).catch(fail)
});

boot().then(()=>{
route();
tx()
}).catch(fail);

const chatPanel = document.querySelector('#chat-panel');
const chatMessages = document.querySelector('#chat-messages');

document.querySelector('#chat-toggle').addEventListener('click', () => {
  chatPanel.hidden = false;
  document.querySelector('#chat-input').focus();
});

document.querySelector('#chat-close').addEventListener('click', () => {
  chatPanel.hidden = true;
});

document.querySelector('#chat-form').addEventListener('submit', event => {
  event.preventDefault();

  const input = document.querySelector('#chat-input');
  const message = input.value.trim();
  if (!message) return;

  addChatMessage(message, 'user-message');
  input.value = '';

  setTimeout(() => {
    addChatMessage(getChatReply(message), 'bot-message');
  }, 300);
});

function addChatMessage(text, className) {
  const message = document.createElement('p');
  message.className = className;
  message.textContent = text;
  chatMessages.appendChild(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function getChatReply(message) {
  const text = message.toLowerCase();

  if (text.includes('price') || text.includes('दाम') || text.includes('कीमत')) {
    return 'Product prices are shown on each product card. Open a product to see more details.';
  }

  if (text.includes('order') || text.includes('ऑर्डर')) {
    return 'You can view your orders from the Orders section in the menu.';
  }

  if (text.includes('delivery') || text.includes('shipping') || text.includes('डिलीवरी')) {
    return 'Delivery details depend on the seller. Please contact the seller from their shop page.';
  }

  if (text.includes('product') || text.includes('सामान')) {
    return 'Browse the Shop or Categories section to find products made by our Sakhis.';
  }

  if (text.includes('hello') || text.includes('hi') || text.includes('नमस्ते')) {
    return 'Namaste! Ask me about products, prices, delivery, or orders.';
  }

  return 'I can help with products, prices, delivery, and orders. Try asking about one of those.';
}