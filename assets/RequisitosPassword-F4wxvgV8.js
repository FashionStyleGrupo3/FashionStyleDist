import{R as m}from"./validarPassword-B2fnxoyE.js";import{C as n}from"./check-CBig31FS.js";import{c as p}from"./createLucideIcon-CDk3Vl0e.js";import{c as e,d as a,F as d,r as u,n as g,m as r,b as c,g as k,t as x,y}from"./index-lGECs1Ex.js";/**
 * @license lucide-vue-next v0.368.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _=p("CircleIcon",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}]]),f={class:"mt-2 grid grid-cols-1 gap-1 text-xs sm:grid-cols-2"},R={__name:"RequisitosPassword",props:{password:{type:String,default:""}},setup(o){const l=o,i=y(()=>m.map(t=>({...t,ok:t.cumple(l.password||"")})));return(t,S)=>(e(),a("ul",f,[(e(!0),a(d,null,u(i.value,s=>(e(),a("li",{key:s.id,class:g(["flex items-center gap-1.5",s.ok?"text-emerald-600":"text-gray-400"])},[s.ok?(e(),r(c(n),{key:0,class:"h-3.5 w-3.5"})):(e(),r(c(_),{key:1,class:"h-3.5 w-3.5"})),k(" "+x(s.texto),1)],2))),128))]))}};export{R as _};
