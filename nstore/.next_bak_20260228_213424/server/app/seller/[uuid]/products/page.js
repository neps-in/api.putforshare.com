(()=>{var e={};e.id=344,e.ids=[344],e.modules={7849:e=>{"use strict";e.exports=require("next/dist/client/components/action-async-storage.external")},2934:e=>{"use strict";e.exports=require("next/dist/client/components/action-async-storage.external.js")},5403:e=>{"use strict";e.exports=require("next/dist/client/components/request-async-storage.external")},4580:e=>{"use strict";e.exports=require("next/dist/client/components/request-async-storage.external.js")},4749:e=>{"use strict";e.exports=require("next/dist/client/components/static-generation-async-storage.external")},5869:e=>{"use strict";e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},399:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},7782:(e,t,r)=>{"use strict";r.r(t),r.d(t,{GlobalError:()=>u.a,__next_app__:()=>d,originalPathname:()=>p,pages:()=>c,routeModule:()=>g,tree:()=>l}),r(5847),r(2655),r(5866);var s=r(3191),n=r(8716),a=r(7922),u=r.n(a),o=r(5231),i={};for(let e in o)0>["default","tree","pages","GlobalError","originalPathname","__next_app__","routeModule"].indexOf(e)&&(i[e]=()=>o[e]);r.d(t,i);let l=["",{children:["seller",{children:["[uuid]",{children:["products",{children:["__PAGE__",{},{page:[()=>Promise.resolve().then(r.bind(r,5847)),"/Users/arouldas/djre-store/nstore/src/app/seller/[uuid]/products/page.jsx"]}]},{}]},{}]},{}]},{layout:[()=>Promise.resolve().then(r.bind(r,2655)),"/Users/arouldas/djre-store/nstore/src/app/layout.jsx"],"not-found":[()=>Promise.resolve().then(r.t.bind(r,5866,23)),"next/dist/client/components/not-found-error"]}],c=["/Users/arouldas/djre-store/nstore/src/app/seller/[uuid]/products/page.jsx"],p="/seller/[uuid]/products/page",d={require:r,loadChunk:()=>Promise.resolve()},g=new s.AppPageRouteModule({definition:{kind:n.x.APP_PAGE,page:"/seller/[uuid]/products/page",pathname:"/seller/[uuid]/products",bundlePath:"",filename:"",appPaths:[]},userland:{loaderTree:l}})},2247:(e,t,r)=>{Promise.resolve().then(r.t.bind(r,9404,23))},1812:(e,t,r)=>{"use strict";let{createProxy:s}=r(8570);e.exports=s("/Users/arouldas/djre-store/nstore/node_modules/next/dist/client/link.js")},5847:(e,t,r)=>{"use strict";r.r(t),r.d(t,{default:()=>o});var s=r(9510),n=r(1812),a=r.n(n),u=r(2856);async function o({params:e,searchParams:t}){let{uuid:r}=e,n=function(e){let t=Number.parseInt(String(e||"1"),10);return Number.isNaN(t)||t<1?1:t}(t?.page),o={count:0,next:null,previous:null,results:[]};try{o=await (0,u._1)(r,{page:n,pageSize:24})}catch{o={count:0,next:null,previous:null,results:[]}}return(0,s.jsxs)("main",{className:"w-full px-4 py-8",children:[(0,s.jsxs)("nav",{className:"flex items-center gap-2 text-sm text-slate-500","aria-label":"Breadcrumb",children:[s.jsx(a(),{className:"font-semibold text-orange-700 hover:text-orange-800",href:"/",children:"Home"}),s.jsx("span",{children:"/"}),s.jsx("span",{children:"Seller"})]}),s.jsx("h1",{className:"mt-3 text-2xl font-semibold text-slate-900",children:"Seller Products"}),(0,s.jsxs)("p",{className:"mt-1 text-sm text-slate-500",children:["Seller ID: ",r]}),(0,s.jsxs)("p",{className:"mt-2 text-sm text-slate-600",children:["Total products: ",s.jsx("strong",{children:o.count})]}),s.jsx("section",{className:"mt-4 grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3",children:o.results.map(e=>(0,s.jsxs)(a(),{className:"flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",href:`/product/${e.uuid}`,children:[s.jsx("p",{className:"inline-flex w-fit rounded-full bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-700",children:e.sku}),s.jsx("h2",{className:"mt-2 text-base font-semibold text-slate-900",children:e.name}),s.jsx("p",{className:"mt-1 text-sm text-slate-600",children:e.short_description||"No description available."}),(0,s.jsxs)("div",{className:"mt-3 flex items-center justify-between gap-2",children:[(0,s.jsxs)("p",{className:"text-base font-semibold text-orange-800",children:["Rs ",e.sale_price]}),s.jsx("span",{className:`rounded-full px-2 py-0.5 text-xs font-semibold ${Number(e.stock_quantity)>0?"bg-emerald-100 text-emerald-700":"bg-red-100 text-red-700"}`,children:Number(e.stock_quantity)>0?"In stock":"Out of stock"})]})]},e.uuid))}),(0,s.jsxs)("section",{className:"mt-6 flex items-center gap-3",children:[n>1?s.jsx(a(),{className:"rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50",href:`/seller/${r}/products?page=${n-1}`,children:"Previous"}):null,o.next?s.jsx(a(),{className:"rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50",href:`/seller/${r}/products?page=${n+1}`,children:"Next"}):null]})]})}},2856:(e,t,r)=>{"use strict";r.d(t,{y7:()=>b,E4:()=>_,T1:()=>$,t2:()=>S,Qq:()=>q,an:()=>j,qh:()=>z,_1:()=>k,V2:()=>P,fs:()=>v,n4:()=>w,Lp:()=>f,On:()=>N});let s=`
  query Products($page: Int, $pageSize: Int, $categoryUuid: String, $tagSlug: String) {
    products(page: $page, pageSize: $pageSize, categoryUuid: $categoryUuid, tagSlug: $tagSlug) {
      count
      next
      previous
      results {
        uuid
        sku
        name
        short_description
        sale_price
        stock_quantity
      }
    }
  }
`,n=`
  query ProductDetail($uuid: String!) {
    productDetail(uuid: $uuid) {
      uuid
      sku
      name
      product_type
      short_description
      description
      sale_price
      stock_quantity
      category {
        uuid
        name
        slug
      }
      tags
      tag_details {
        name
        slug
      }
      book_details {
        isbn_10
        isbn_13
        book_language
        book_edition
        cover_type
        page_count
        published_year
        publisher {
          uuid
          name
          slug
        }
        authors {
          uuid
          name
          slug
        }
      }
    }
  }
`,a=`
  query TagsWithCount($page: Int, $pageSize: Int) {
    tagsWithProductCount(page: $page, pageSize: $pageSize) {
      count
      next
      previous
      results {
        name
        slug
        product_count
      }
    }
  }
`,u=`
  query CategoriesWithCount($page: Int, $pageSize: Int) {
    categoriesWithProductCount(page: $page, pageSize: $pageSize) {
      count
      next
      previous
      results {
        uuid
        name
        slug
        description
        product_count
      }
    }
  }
`,o=`
  query AuthorsWithCount($page: Int, $pageSize: Int) {
    authorsWithProductCount(page: $page, pageSize: $pageSize) {
      count
      next
      previous
      results {
        uuid
        name
        slug
        product_count
      }
    }
  }
`,i=`
  query PublishersWithCount($page: Int, $pageSize: Int) {
    publishersWithProductCount(page: $page, pageSize: $pageSize) {
      count
      next
      previous
      results {
        uuid
        name
        slug
        description
        product_count
      }
    }
  }
`,l=`
  query ProductsByCategory($categoryUuid: String!, $page: Int, $pageSize: Int) {
    productsByCategory(categoryUuid: $categoryUuid, page: $page, pageSize: $pageSize) {
      count
      next
      previous
      results {
        uuid
        sku
        name
        short_description
        sale_price
        stock_quantity
        category {
          uuid
          name
          slug
        }
      }
    }
  }
`,c=`
  query ProductsByTag($tagSlug: String!, $page: Int, $pageSize: Int) {
    productsByTag(tagSlug: $tagSlug, page: $page, pageSize: $pageSize) {
      count
      next
      previous
      results {
        uuid
        sku
        name
        short_description
        sale_price
        stock_quantity
      }
    }
  }
`,p=`
  query ProductsByAuthor($authorSlug: String!, $page: Int, $pageSize: Int) {
    productsByAuthor(authorSlug: $authorSlug, page: $page, pageSize: $pageSize) {
      count
      next
      previous
      results {
        uuid
        sku
        name
        short_description
        sale_price
        stock_quantity
      }
    }
  }
`,d=`
  query ProductsByPublisher($publisherSlug: String!, $page: Int, $pageSize: Int) {
    productsByPublisher(publisherSlug: $publisherSlug, page: $page, pageSize: $pageSize) {
      count
      next
      previous
      results {
        uuid
        sku
        name
        short_description
        sale_price
        stock_quantity
      }
    }
  }
`;function g(){return"http://localhost:8000/api/v1"}function x(e,t){let r=String(e||"http://localhost:8000/api/v1").replace(/\/+$/,""),s=String(t||"").replace(/^\/+/,"");return`${r}/${s}`}async function h(e,t={}){let r=await fetch(x(g(),"graphql/"),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({query:e,variables:t}),next:{revalidate:60}});if(!r.ok)throw Error(`GraphQL request failed (${r.status})`);let s=await r.json();if(Array.isArray(s?.errors)&&s.errors.length>0)throw Error(s.errors[0]?.message||"GraphQL request failed");return s?.data||{}}function m(){return{count:0,next:null,previous:null,results:[]}}async function y(e,t){let r=await fetch(x(g(),e),{method:"GET",next:{revalidate:60}});if(!r.ok)throw Error(t||`Could not load ${e}`);let s=await r.json();return s&&"object"==typeof s?{count:Number(s.count||0),next:s.next??null,previous:s.previous??null,results:Array.isArray(s.results)?s.results:[]}:m()}async function S({page:e=1,pageSize:t=24}={}){let r=await h(s,{page:e,pageSize:t});return Array.isArray(r?.products?.results)?r.products.results:[]}async function $(e){let t=await h(n,{uuid:e});return t?.productDetail||null}async function f({page:e=1,pageSize:t=12}={}){let r=await h(a,{page:e,pageSize:t});return r?.tagsWithProductCount||m()}async function _({page:e=1,pageSize:t=12}={}){let r=await h(u,{page:e,pageSize:t});return r?.categoriesWithProductCount||m()}async function b({page:e=1,pageSize:t=12}={}){let r=await h(o,{page:e,pageSize:t});return r?.authorsWithProductCount||m()}async function v({page:e=1,pageSize:t=12}={}){let r=await h(i,{page:e,pageSize:t});return r?.publishersWithProductCount||m()}async function j(e,{page:t=1,pageSize:r=24}={}){let s=await h(l,{categoryUuid:e,page:t,pageSize:r});return s?.productsByCategory||m()}async function P(e,{page:t=1,pageSize:r=24}={}){let s=await h(c,{tagSlug:e,page:t,pageSize:r});return s?.productsByTag||m()}async function q(e,{page:t=1,pageSize:r=24}={}){let s=await h(p,{authorSlug:e,page:t,pageSize:r});return s?.productsByAuthor||m()}async function z(e,{page:t=1,pageSize:r=24}={}){let s=await h(d,{publisherSlug:e,page:t,pageSize:r});return s?.productsByPublisher||m()}async function w({page:e=1,pageSize:t=24}={}){let r=new URLSearchParams({page:String(e),page_size:String(t)});return y(`inventory/re-store/products/?${r.toString()}`,"Could not load Re Store products")}async function N({page:e=1,pageSize:t=24,maxPrice:r=10}={}){let s=new URLSearchParams({page:String(e),page_size:String(t),max_price:String(r)});return y(`inventory/under-price/products/?${s.toString()}`,"Could not load under-price products")}async function k(e,{page:t=1,pageSize:r=24}={}){let s=new URLSearchParams({page:String(t),page_size:String(r)});return y(`inventory/sellers/${e}/products/?${s.toString()}`,"Could not load seller products")}}};var t=require("../../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),s=t.X(0,[948,982,49],()=>r(7782));module.exports=s})();