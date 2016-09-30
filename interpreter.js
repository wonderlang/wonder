fs=require('fs')
peg=require('pegjs')
_=require('lodash')
d=require('decimal.js')
tr=require('traverse')
P=require('path')
d.config({
  toExpNeg:-9e15,
  toExpPos:9e15
})
lex=fs.readFileSync(P.join(__dirname,'dash.pegjs'))+''
code=fs.readFileSync(process.argv[2])+''
ps=peg.generate(lex).parse(code)
mon=x=>x.type||x.length<2
tc=(x,y='Unknown error')=>{
  f=0
  try{f=x(),isNaN(f)&&eval('.')}catch(e){error(y)}
  return f
}
get=(x,y)=>x[d.mod(d(y).cmp(-1)?y:d.add(x.length,y),x.length)]
form=x=>
  x.type=='num'||x.type=='fn'||x.type=='str'?
    x.body
  :x.type=='bool'?
    x.body?'T':'F'
  :x.type=='ls'?
    `[${x.body.map(a=>form(a)).join` `}]`
  :x.type=='def'?
    `@`+form(x.body)
  :x.map?
    `(${x.map(a=>form(a)).join` `})`
  :x.type=='pt'?
    form(x.body)+form(x.f)
  :error('failed to format')

cm={
  out:x=>(console.log(form(x)),x),
  E:x=>(d.config({precision:+x.body}),x),
  abs:x=>({type:'num',body:''+d.abs(x.body)}),
  acos:x=>({type:'num',body:''+d.acos(x.body)}),
  acosh:x=>({type:'num',body:''+d.acosh(x.body)}),
  add:(x,y)=>({type:'num',body:''+d.add(x.body,y.body)}),
  asin:x=>({type:'num',body:''+d.asin(x.body)}),
  asinh:x=>({type:'num',body:''+d.asinh(x.body)}),
  atan:x=>({type:'num',body:''+d.atan(x.body)}),
  atanh:x=>({type:'num',body:''+d.atanh(x.body)}),
  atant:(x,y)=>({type:'num',body:''+d.atan2(x.body,y.body)}),
  ceil:x=>({type:'num',body:''+d.ceil(x.body)}),
  cos:(x,y)=>({type:'num',body:''+d.cos(x.body)}),
  cosh:(x,y)=>({type:'num',body:''+d.cosh(x.body)}),
  div:(x,y)=>({type:'num',body:''+d.div(x.body,y.body)}),
  exp:x=>({type:'num',body:''+d.exp(x.body)}),
  floor:x=>({type:'num',body:''+d.floor(x.body)}),
  hypot:(x,y)=>({type:'num',body:''+d.hypot(x.body,y.body)}),
  ln:x=>({type:'num',body:''+d.ln(x.body)}),
  lt:x=>({type:'num',body:''+d.log10(x.body)}),
  log:(x,y)=>({type:'num',body:''+d.log(x.body,y.body)}),
  max:x=>({type:'num',body:''+d.max(...x.body)}),
  min:x=>({type:'num',body:''+d.min(...x.body)}),
  mod:(x,y)=>({type:'num',body:''+d.mod(x.body,y.body)}),
  mul:(x,y)=>({type:'num',body:''+d.mul(x.body,y.body)}),
  pow:(x,y)=>({type:'num',body:''+d.pow(x.body,y.body)}),
  rand:x=>({type:'num',body:''+d.random(x.type=='num'?x.body:[]._)}),
  round:x=>({type:'num',body:''+d.round(x.body)}),
  sign:x=>({type:'num',body:''+d.sign(x.body)}),
  sin:x=>({type:'num',body:''+d.sin(x.body)}),
  sinh:x=>({type:'num',body:''+d.sinh(x.body)}),
  sub:(x,y)=>({type:'num',body:''+d.sub(x.body,y.body)}),
  tan:x=>({type:'num',body:''+d.tan(x.body)}),
  tanh:x=>({type:'num',body:''+d.tanh(x.body)}),
  trunc:x=>({type:'num',body:''+d.trunc(x.body)}),
  cmp:(x,y)=>({type:'num',body:''+d(x.body).cmp(y.body)}),
  neg:x=>({type:'num',body:''+d(x.body).neg()}),
  for:(x,y)=>({type:'ls',body:_.flatMap(y.body,a=>({type:'app',body:x,f:a.big?{type:'str',body:a}:a}))}),
  len:x=>({type:'num',body:x.body.length}),
  get:(x,y)=>y.type=='ls'?{type:'ls',body:y.body.map(a=>get(x.body,a.body))}:x.body.big?{type:'str',body:get(x.body,y.body)}:get(x.body,y.body),
  var:(x,y)=>x.type=='fn'?(cm[x.body]=a=>I(y),y):error('bad var name'),
  join:(x,y)=>({type:'str',body:Array.from(x.body).map(a=>a.body).join(y.body)}),
  split:(x,y)=>({type:'ls',body:x.body.split(y.body).map(a=>({type:'str',body:a}))})
}
cm['||']=cm.abs
cm['+']=cm.add
cm["|'"]=cm.ceil
cm['/']=cm.div
cm['|_']=cm.floor
cm['%']=cm.mod
cm['*']=cm.mul
cm['^']=cm.pow
cm['|:']=cm.round
cm['+-']=cm.sign
cm['-']=cm.sub
cm['|-']=cm.trunc
cm['=']=cm.cmp
cm['_']=cm.neg
cm['>']=cm.for
cm['__']=cm.len
cm[':']=cm.get
cm['\\']=cm.var
cm['><']=cm.join
cm['<>']=cm.split

error=e=>{
  console.log('ERROR: '+e)
  process.exit(1)
}

I=(x,...y)=>
  x.map?
    (X=x.map(a=>I(a,...y)))[X.length-1]
  :x.type=='ls'?
    {type:'ls',body:x.body.map(a=>I(a,...y))}
  :x.type=='app'?
    (z=I(x.body,...y)).type=='fn'?
      cm[z.body].length>1?
        {type:'pt',body:z.body,f:x.f}
      :cm[z.body](I(x.f,...y))
    :z.type=='def'?
      I(z.body,...y.concat(x.f))
    :z.type=='pt'?
      cm[I(z,...y).body](z.f,I(x.f))
    :error('bad function call')
  :x.type=='a'?
    y[x.body]?
      y[x.body]
    :error('the argument does not exist')
  :x

In=x=>tr(x).nodes().some(a=>a.type=='app')
exec=x=>In(x)?exec(I(x)):x
console.log(JSON.stringify(exec(ps),null,2))
