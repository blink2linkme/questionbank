window.pdfViewer = (function(){
    // capture console logs for diagnostic purposes
    window.app = window.app || {};
    window.app._logs = window.app._logs || [];
    (function(){
        const origLog = console.log.bind(console);
        const origError = console.error.bind(console);
        const origWarn = console.warn.bind(console);
        console.log = function(){
            try{ window.app._logs.push({level:'log', args: Array.from(arguments)}); }catch(e){}
            origLog.apply(null, arguments);
        };
        console.error = function(){
            try{ window.app._logs.push({level:'error', args: Array.from(arguments)}); }catch(e){}
            origError.apply(null, arguments);
        };
        console.warn = function(){
            try{ window.app._logs.push({level:'warn', args: Array.from(arguments)}); }catch(e){}
            origWarn.apply(null, arguments);
        };
        window.app.getLogs = function(){ return window.app._logs.map(l=>JSON.stringify(l)); };
    })();

    // Minimal PDF.js-based renderer with watermarking and basic anti-screenshot measures (see README for limitations)
    const pdfjsUrl = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';

    function addListeners(container){
        // Prevent context menu on the container
        container.addEventListener('contextmenu', e => e.preventDefault());

        // Hide/blur content when page hidden or window loses focus
        document.addEventListener('visibilitychange', ()=>{
            if(document.hidden) container.style.filter = 'blur(12px)'; else container.style.filter = 'none';
        });
        window.addEventListener('blur', ()=>{ container.style.filter = 'blur(12px)'; });
        window.addEventListener('focus', ()=>{ container.style.filter = 'none'; });

        // Try to intercept PrintScreen key (may not be delivered to browser in many OSes)
        window.addEventListener('keydown', (e)=>{
            if(e.key === 'PrintScreen'){
                e.preventDefault();
                // clear selection and briefly hide content
                container.style.visibility = 'hidden';
                setTimeout(()=>container.style.visibility='visible', 500);
            }
        });
    }

    async function ensurePdfJs(){
        if(window['pdfjsLib']) return;
        // load script dynamically
        await new Promise((resolve, reject)=>{
            const s = document.createElement('script');
            s.src = pdfjsUrl;
            s.onload = resolve; s.onerror = reject;
            document.head.appendChild(s);
        });
        // set workerSrc if available
        if(window['pdfjsLib'] && window['pdfjsLib'].GlobalWorkerOptions){
            window['pdfjsLib'].GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
        }
    }

    async function loadPdf(url, user){
        const container = document.getElementById('pdfContainer');
        if(!container){ console.error('pdfContainer not found'); return; }
        container.innerHTML = '';
        addListeners(container);
        await ensurePdfJs();
        try{
            const resp = await fetch(url);
            if(!resp.ok){ container.innerHTML = '<p class="text-danger">Failed to load PDF: '+resp.status+'</p>'; return; }
            const data = await resp.arrayBuffer();
            const pdf = await window['pdfjsLib'].getDocument({data}).promise;
            for(let i=1;i<=pdf.numPages;i++){
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({scale:1.5});
                const canvas = document.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                canvas.style.display = 'block';
                canvas.style.marginBottom = '12px';
                const ctx = canvas.getContext('2d');
                await page.render({canvasContext:ctx, viewport}).promise;
                // watermark: diagonal semi-transparent user info + timestamp
                ctx.save();
                ctx.translate(canvas.width/2, canvas.height/2);
                ctx.rotate(-0.5);
                ctx.font = Math.max(14, canvas.width/30) + 'px Arial';
                ctx.fillStyle = 'rgba(255,0,0,0.12)';
                ctx.textAlign = 'center';
                const text = (user || '') + ' — ' + new Date().toLocaleString();
                ctx.fillText(text, 0, 0);
                ctx.restore();

                container.appendChild(canvas);
            }
        }catch(err){
            console.error(err);
            container.innerHTML = '<p class="text-danger">Error rendering PDF</p>';
        }
    }

    // helper for fetching catalog.json from the host page context (fallback for HttpClient issues)
    window.app = window.app || {};
    window.app.fetchCatalog = async function(){
        try{
            const resp = await fetch('/data/catalog.json');
            if(!resp.ok){ console.error('fetchCatalog non-ok', resp.status); return null; }
            return await resp.text();
        }catch(e){
            console.error('fetchCatalog error', e);
            return null;
        }
    };
    window.app.getLogs = window.app.getLogs || function(){ return window.app._logs ? window.app._logs.map(l=>JSON.stringify(l)) : []; };

    return { loadPdf };
})();
