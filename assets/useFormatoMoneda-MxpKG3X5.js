function n(){return{formatearCOP:r=>r==null||isNaN(r)?"$ 0":new Intl.NumberFormat("es-CO",{style:"currency",currency:"COP",maximumFractionDigits:0}).format(Number(r))}}export{n as u};
