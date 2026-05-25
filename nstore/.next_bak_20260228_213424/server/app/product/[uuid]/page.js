(()=>{var e={};e.id=772,e.ids=[772],e.modules={7849:e=>{"use strict";e.exports=require("next/dist/client/components/action-async-storage.external")},2934:e=>{"use strict";e.exports=require("next/dist/client/components/action-async-storage.external.js")},5403:e=>{"use strict";e.exports=require("next/dist/client/components/request-async-storage.external")},4580:e=>{"use strict";e.exports=require("next/dist/client/components/request-async-storage.external.js")},4749:e=>{"use strict";e.exports=require("next/dist/client/components/static-generation-async-storage.external")},5869:e=>{"use strict";e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},399:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},747:(e,t,s)=>{"use strict";s.r(t),s.d(t,{GlobalError:()=>n.a,__next_app__:()=>p,originalPathname:()=>c,pages:()=>d,routeModule:()=>g,tree:()=>u}),s(6312),s(2655),s(5866);var a=s(3191),r=s(8716),o=s(7922),n=s.n(o),i=s(5231),l={};for(let e in i)0>["default","tree","pages","GlobalError","originalPathname","__next_app__","routeModule"].indexOf(e)&&(l[e]=()=>i[e]);s.d(t,l);let u=["",{children:["product",{children:["[uuid]",{children:["__PAGE__",{},{page:[()=>Promise.resolve().then(s.bind(s,6312)),"/Users/arouldas/djre-store/nstore/src/app/product/[uuid]/page.jsx"]}]},{}]},{}]},{layout:[()=>Promise.resolve().then(s.bind(s,2655)),"/Users/arouldas/djre-store/nstore/src/app/layout.jsx"],"not-found":[()=>Promise.resolve().then(s.t.bind(s,5866,23)),"next/dist/client/components/not-found-error"]}],d=["/Users/arouldas/djre-store/nstore/src/app/product/[uuid]/page.jsx"],c="/product/[uuid]/page",p={require:s,loadChunk:()=>Promise.resolve()},g=new a.AppPageRouteModule({definition:{kind:r.x.APP_PAGE,page:"/product/[uuid]/page",pathname:"/product/[uuid]",bundlePath:"",filename:"",appPaths:[]},userland:{loaderTree:u}})},4561:(e,t,s)=>{Promise.resolve().then(s.bind(s,4784))},4784:(e,t,s)=>{"use strict";s.d(t,{default:()=>n});var a=s(326),r=s(434),o=s(9210);function n({product:e,loading:t=!1,error:s=""}){let{addToCart:n}=(0,o.jD)();return(0,a.jsxs)("main",{className:"w-full px-4 py-8",children:[(0,a.jsxs)("nav",{className:"flex items-center gap-2 text-sm text-slate-500","aria-label":"Breadcrumb",children:[a.jsx(r.default,{className:"font-semibold text-orange-700 hover:text-orange-800",href:"/",children:"Home"}),a.jsx("span",{children:"/"}),a.jsx("span",{children:"Product Details"})]}),t&&a.jsx("article",{className:"mt-4 min-h-[230px] animate-pulse rounded-2xl bg-slate-200"}),s&&a.jsx("p",{className:"mt-2 text-sm font-semibold text-red-600",children:s}),!t&&!s&&e&&(0,a.jsxs)("article",{className:"mt-4 grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-[30%_70%]",children:[a.jsx("div",{children:a.jsx("img",{className:"h-64 w-full rounded-xl border border-slate-200 bg-white object-contain",src:"/assets/placeholder-product.svg",alt:e.name||"Product placeholder"})}),(0,a.jsxs)("div",{className:"space-y-4",children:[a.jsx("p",{className:"inline-flex w-fit rounded-full bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-700",children:e.sku}),(0,a.jsxs)("div",{className:"space-y-2",children:[(0,a.jsxs)("h1",{className:"text-2xl font-semibold text-slate-900",children:[e.name," ","BOOK"===e.product_type&&e.book_details?(0,a.jsxs)("span",{className:"text-slate-600",children:[e.book_details.book_edition?` ${e.book_details.book_edition}`:""," ",e.book_details.cover_type?`${e.book_details.cover_type}`:""]}):null]}),"BOOK"===e.product_type&&e.book_details?(0,a.jsxs)("div",{className:"space-y-2 text-sm text-slate-600",children:[(0,a.jsxs)("p",{children:["by"," ",Array.isArray(e.book_details.authors)&&e.book_details.authors.length>0?e.book_details.authors.map((t,s)=>(0,a.jsxs)("span",{children:[t.slug?a.jsx(r.default,{className:"font-semibold text-orange-700 hover:text-orange-800",href:`/author/${t.slug}/books`,children:t.name}):t.name,s<e.book_details.authors.length-1?", ":""]},t.uuid||t.slug||t.name)):"-"]}),e.book_details.publisher?(0,a.jsxs)("div",{className:"flex items-center gap-2",children:[e.book_details.publisher.brand_image?a.jsx("img",{src:e.book_details.publisher.brand_image,alt:e.book_details.publisher.name||"Publisher",className:"h-6 w-6 rounded-full border border-slate-200 object-contain"}):null,(0,a.jsxs)("span",{children:["Published by"," ",e.book_details.publisher?.slug?a.jsx(r.default,{className:"font-semibold text-orange-700 hover:text-orange-800",href:`/publisher/${e.book_details.publisher.slug}/books`,children:e.book_details.publisher.name}):e.book_details.publisher?.name||"-"]})]}):null]}):null]}),e.category?(0,a.jsxs)("p",{className:"text-sm text-slate-600",children:["Category:"," ",a.jsx(r.default,{className:"font-semibold text-orange-700 hover:text-orange-800",href:`/category/${e.category.uuid}/products`,children:e.category.name})]}):null,Array.isArray(e.tag_details)&&e.tag_details.length>0?a.jsx("div",{className:"flex flex-wrap gap-2",children:e.tag_details.map(e=>(0,a.jsxs)(r.default,{className:"inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700",href:`/tag/${e.slug}/products`,children:["#",e.name]},e.slug))}):null,(0,a.jsxs)("div",{className:"flex flex-wrap items-center gap-4",children:[(0,a.jsxs)("p",{className:"text-lg font-semibold text-red-600",children:["Rs. ",e.sale_price]}),a.jsx("button",{className:"inline-flex items-center justify-center rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50",onClick:()=>n(e),disabled:0>=Number(e.stock_quantity),children:"Add to cart"})]}),"BOOK"===e.product_type&&e.book_details?(0,a.jsxs)("section",{className:"pt-2",children:[a.jsx("hr",{className:"border-slate-200"}),a.jsx("h2",{className:"mt-4 text-lg font-semibold text-slate-900",children:"Book Details"}),(0,a.jsxs)("dl",{className:"mt-3 grid gap-x-4 gap-y-2 text-sm md:grid-cols-[160px_1fr]",children:[a.jsx("dt",{className:"font-semibold text-slate-500",children:"ISBN-10"}),a.jsx("dd",{className:"text-slate-700",children:e.book_details.isbn_10||"-"}),a.jsx("dt",{className:"font-semibold text-slate-500",children:"ISBN-13"}),a.jsx("dd",{className:"text-slate-700",children:e.book_details.isbn_13||"-"}),a.jsx("dt",{className:"font-semibold text-slate-500",children:"Language"}),a.jsx("dd",{className:"text-slate-700",children:e.book_details.book_language||"-"}),a.jsx("dt",{className:"font-semibold text-slate-500",children:"Edition"}),a.jsx("dd",{className:"text-slate-700",children:e.book_details.book_edition||"-"}),a.jsx("dt",{className:"font-semibold text-slate-500",children:"Cover"}),a.jsx("dd",{className:"text-slate-700",children:e.book_details.cover_type||"-"}),a.jsx("dt",{className:"font-semibold text-slate-500",children:"Pages"}),a.jsx("dd",{className:"text-slate-700",children:e.book_details.page_count||"-"}),a.jsx("dt",{className:"font-semibold text-slate-500",children:"Published Year"}),a.jsx("dd",{className:"text-slate-700",children:e.book_details.published_year||"-"}),a.jsx("dt",{className:"font-semibold text-slate-500",children:"Publisher"}),a.jsx("dd",{className:"text-slate-700",children:e.book_details.publisher?.slug?a.jsx(r.default,{className:"font-semibold text-orange-700 hover:text-orange-800",href:`/publisher/${e.book_details.publisher.slug}/books`,children:e.book_details.publisher.name}):e.book_details.publisher?.name||"-"}),a.jsx("dt",{className:"font-semibold text-slate-500",children:"Authors"}),a.jsx("dd",{className:"text-slate-700",children:Array.isArray(e.book_details.authors)&&e.book_details.authors.length>0?e.book_details.authors.map((t,s)=>(0,a.jsxs)("span",{children:[t.slug?a.jsx(r.default,{className:"font-semibold text-orange-700 hover:text-orange-800",href:`/author/${t.slug}/books`,children:t.name}):t.name,s<e.book_details.authors.length-1?", ":""]},t.uuid||t.slug||t.name)):"-"})]})]}):null]})]})]})}},6312:(e,t,s)=>{"use strict";s.r(t),s.d(t,{default:()=>d});var a=s(9510),r=s(2856),o=s(8570);let n=(0,o.createProxy)(String.raw`/Users/arouldas/djre-store/nstore/src/components/ProductDetailClient.jsx`),{__esModule:i,$$typeof:l}=n;n.default;let u=(0,o.createProxy)(String.raw`/Users/arouldas/djre-store/nstore/src/components/ProductDetailClient.jsx#default`);async function d({params:e}){let{uuid:t}=e,s=null,o="";try{(s=await (0,r.T1)(t))||(o="Product not found or API unavailable")}catch{o="Product not found or API unavailable"}return a.jsx(u,{product:s,loading:!1,error:o})}},2856:(e,t,s)=>{"use strict";s.d(t,{y7:()=>S,E4:()=>j,T1:()=>_,t2:()=>y,Qq:()=>N,an:()=>k,qh:()=>P,_1:()=>z,V2:()=>v,fs:()=>$,n4:()=>w,Lp:()=>f,On:()=>q});let a=`
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
`,r=`
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
`,o=`
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
`,n=`
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
`,i=`
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
`,l=`
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
`,u=`
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
`,d=`
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
`,c=`
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
`,p=`
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
`;function g(){return"http://localhost:8000/api/v1"}function h(e,t){let s=String(e||"http://localhost:8000/api/v1").replace(/\/+$/,""),a=String(t||"").replace(/^\/+/,"");return`${s}/${a}`}async function x(e,t={}){let s=await fetch(h(g(),"graphql/"),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({query:e,variables:t}),next:{revalidate:60}});if(!s.ok)throw Error(`GraphQL request failed (${s.status})`);let a=await s.json();if(Array.isArray(a?.errors)&&a.errors.length>0)throw Error(a.errors[0]?.message||"GraphQL request failed");return a?.data||{}}function m(){return{count:0,next:null,previous:null,results:[]}}async function b(e,t){let s=await fetch(h(g(),e),{method:"GET",next:{revalidate:60}});if(!s.ok)throw Error(t||`Could not load ${e}`);let a=await s.json();return a&&"object"==typeof a?{count:Number(a.count||0),next:a.next??null,previous:a.previous??null,results:Array.isArray(a.results)?a.results:[]}:m()}async function y({page:e=1,pageSize:t=24}={}){let s=await x(a,{page:e,pageSize:t});return Array.isArray(s?.products?.results)?s.products.results:[]}async function _(e){let t=await x(r,{uuid:e});return t?.productDetail||null}async function f({page:e=1,pageSize:t=12}={}){let s=await x(o,{page:e,pageSize:t});return s?.tagsWithProductCount||m()}async function j({page:e=1,pageSize:t=12}={}){let s=await x(n,{page:e,pageSize:t});return s?.categoriesWithProductCount||m()}async function S({page:e=1,pageSize:t=12}={}){let s=await x(i,{page:e,pageSize:t});return s?.authorsWithProductCount||m()}async function $({page:e=1,pageSize:t=12}={}){let s=await x(l,{page:e,pageSize:t});return s?.publishersWithProductCount||m()}async function k(e,{page:t=1,pageSize:s=24}={}){let a=await x(u,{categoryUuid:e,page:t,pageSize:s});return a?.productsByCategory||m()}async function v(e,{page:t=1,pageSize:s=24}={}){let a=await x(d,{tagSlug:e,page:t,pageSize:s});return a?.productsByTag||m()}async function N(e,{page:t=1,pageSize:s=24}={}){let a=await x(c,{authorSlug:e,page:t,pageSize:s});return a?.productsByAuthor||m()}async function P(e,{page:t=1,pageSize:s=24}={}){let a=await x(p,{publisherSlug:e,page:t,pageSize:s});return a?.productsByPublisher||m()}async function w({page:e=1,pageSize:t=24}={}){let s=new URLSearchParams({page:String(e),page_size:String(t)});return b(`inventory/re-store/products/?${s.toString()}`,"Could not load Re Store products")}async function q({page:e=1,pageSize:t=24,maxPrice:s=10}={}){let a=new URLSearchParams({page:String(e),page_size:String(t),max_price:String(s)});return b(`inventory/under-price/products/?${a.toString()}`,"Could not load under-price products")}async function z(e,{page:t=1,pageSize:s=24}={}){let a=new URLSearchParams({page:String(t),page_size:String(s)});return b(`inventory/sellers/${e}/products/?${a.toString()}`,"Could not load seller products")}}};var t=require("../../../webpack-runtime.js");t.C(e);var s=e=>t(t.s=e),a=t.X(0,[948,982,49],()=>s(747));module.exports=a})();