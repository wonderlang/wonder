start=a:(com/expr)*{
  return a.filter(x=>!x.big)
}

expr=a:(_/type)';'?{
  return a
}

//separators
_=[ \n]

//types
type=str/bin/get/oct/hex/num/bool/cond/ls/ev/obj/pm/var/aapp/app/pm/def/arg/fn/a/ref

//comments
com='#.'[^\n]*{return''}

//strings
str='"'a:([^"\\]/'\\'.)*'"'?{
  return{
    type:'str',
    body:a.map(x=>x.pop?x[1]=='"'?'"':x.join``:x).join``.replace(/\\\\/g,'\\')
  }
}
//numbers
num=a:([0-9]+('.'[0-9]+)?('e''_'?[0-9]+)?/'.'[0-9]+('e''_'?[0-9]+)?/'oo'){
  var f
  return{
    type:'num',
    body:a!='oo'?(f=z=>z.map(x=>x&&x.pop?f(x):x).join``.replace(/_/g,'-'))(a):'Infinity'
  }
}
bin=a:('0b'([01]+('.'[01]+)?/'.'[0-9]+)){
  var f
  return{
    type:'num',
    body:(f=z=>z.map(x=>x&&x.pop?f(x):x).join``.replace(/_/g,'-'))(a)
  }
}
oct=a:('0o'([0-8]+('.'[0-8]+)?/'.'[0-8]+)){
  var f
  return{
    type:'num',
    body:(f=z=>z.map(x=>x&&x.pop?f(x):x).join``.replace(/_/g,'-'))(a)
  }
}
hex=a:('0x'([0-9A-Fa-f]+('.'[0-9A-Fa-f]+)?/'.'[0-9A-Fa-f]+)){
  var f
  return{
    type:'num',
    body:(f=z=>z.map(x=>x&&x.pop?f(x):x).join``.replace(/_/g,'-'))(a)
  }
}

//bool
bool=a:[TF]{
  return{
    type:'bool',
    body:+(a=='T')
  }
}

//list
ls='['a:expr*']'?{
  return{
    type:'ls',
    body:a.filter(x=>!x.big)
  }
}
//object
obj='{'_*a:((num/fn/str)_*'\\'_*type _*';'?_*)*_*'}'?{
  var o={}
  return{
    type:'obj',
    body:(a.map(x=>o[x[0].body]=x[4]),o)
  }
}
pm='.{'_*a:(type _*'\\'_*type _*';'?_*)*b:type? _*'}'?{
  return{
    type:'pm',
    body:(
      a.map(x=>[x[0],x[4]]).concat([['@',b||{type:'bool',body:0}]])
    )
  }
}
//expression list (holds multiple expressions)
arg='('a:expr*')'?{
  return a.filter(x=>!x.big)
}
//argument reference
a=a:('#'_*[0-9]+){
  return{
    type:'a',
    body:+a[2].join``
  }
}
ref=a:('#'_*(fn/arg/ls/obj/pm)){
  return{
    type:'ref',
    body:a[2]
  }
}

//function reference
fn=a:[^ \n;0-9".[\]\\(){}@#TF?`]+{
  return{
    type:'fn',
    body:a.join``
  }
}
//function application
app=a:(fn/def)_* b:type{
  return{
    type:'app',
    body:a.pop?a[1]:a,
    f:b
  }
}
aapp=a:(app/arg) _*b:type{
  return{
    type:'app',
    body:a,
    f:b
  }
}
//function definition
def='@'_*b:type{
  return{
    type:'def',
    body:b
  }
}
var=a:fn _*'\\'_*b:type{
  return{
    type:'var',
    body:a,
    f:b
  }
}

//conditionals
cond='['_*a:type _*'?'_*b:expr*_*'?'_*c:expr*_*']'?{
  return{
  	type:'cond',
    body:a,
    f:b&&b.length?b.filter(x=>!x.big):{type:'bool',body:1},
    g:c&&c.length?c.filter(x=>!x.big):{type:'bool',body:0}
  }
}

//eval block
ev=a:arg _*b:var{
  return{
    type:'ev',
    body:a.filter(x=>!x.big),
    f:b.body,
    g:b.f
  }
}

//get
get=a:(ls/obj/pm)b:type{
  return{
    type:'app',
    body:a,
    f:b
  }
}
