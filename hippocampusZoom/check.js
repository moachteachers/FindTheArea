

    const ASSETS = {
      brain: "brain.png",
      cerebellum: "hippocampus.png",
      network: "hippocampus_neuralNetwork.png",
      purkinjeThumb: "pyramidal_cell_thumb.png"
    };

    function base64ToObjectUrl(base64, mimeType){
      const binary = atob(base64);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
      return URL.createObjectURL(new Blob([bytes], { type: mimeType }));
    }

    const STAGE_ORDER = ["brain", "cerebellum", "network", "purkinje"];

    const STATES = {
      brain: {
        type: "image",
        image: ASSETS.brain,
        aspect: 1445 / 1088,
        title: "מוח",
        hint: "לחצו על ההיפוקמפוס כדי להתקרב.",
        crumb: "מוח",
        parent: null,
        hotspots: [
          { x: 43, y: 50, w: 24, h: 22, target: "cerebellum", label: "היפוקמפוס", cueX: 55, cueY: 61, zoomScale: 3.2, nextStartScale: 1.32, nextOriginX: 50, nextOriginY: 50 }
        ]
      },
      cerebellum: {
        type: "image",
        image: ASSETS.cerebellum,
        aspect: 1419 / 1108,
        title: "היפוקמפוס",
        hint: "לחצו על ההיפוקמפוס כדי להתקרב לרשת הנוירונים שבתוכו.",
        crumb: "היפוקמפוס",
        parent: "brain",
        hotspots: [
          { x: 12, y: 10, w: 76, h: 80, target: "network", label: "רשת נוירונים בהיפוקמפוס", cueX: 50, cueY: 51, zoomScale: 3.0, nextStartScale: 1.28, nextOriginX: 50, nextOriginY: 50 }
        ]
      },
      network: {
        type: "image",
        image: ASSETS.network,
        aspect: 1402 / 1122,
        title: "רשת נוירונים בהיפוקמפוס",
        hint: "לחצו על רשת הנוירונים כדי לעבור למודל תלת־ממדי של תא פירמידלי.",
        crumb: "רשת נוירונים",
        parent: "cerebellum",
        hotspots: [
          { x: 8, y: 6, w: 84, h: 86, target: "purkinje", label: "תא פירמידלי", cueX: 50, cueY: 49, zoomScale: 3.5, nextStartScale: 1.15, nextOriginX: 50, nextOriginY: 50 }
        ]
      },
      purkinje: {
        type: "model",
        model: "hippocampus_ca1_pyramidal_cell.glb",
        aspect: 1445 / 1088,
        title: "תא פירמידלי CA1",
        hint: "",
        crumb: "תא פירמידלי CA1",
        parent: "network",
        hotspots: []
      }
    };

    const imgA = document.getElementById("imgA");
    const imgB = document.getElementById("imgB");
    const modelLayer = document.getElementById("modelLayer");
    const purkinjeModel = document.getElementById("purkinjeModel");
    const PURKINJE_MODEL_URL = "hippocampus_ca1_pyramidal_cell.glb";
    purkinjeModel.src = PURKINJE_MODEL_URL;
    const flash = document.getElementById("flash");
    const hotspotsEl = document.getElementById("hotspots");
    const titleEl = document.getElementById("title");
    const hintEl = document.getElementById("hint");
    const stageMenuEl = document.getElementById("stageMenu");
    const backBtn = document.getElementById("backBtn");
    const homeBtn = document.getElementById("homeBtn");
    const fullscreenBtn = document.getElementById("fullscreenBtn");
    const hoverCue = document.getElementById("hoverCue");
    const hoverLabel = document.getElementById("hoverLabel");
    const viewport = document.getElementById("viewport");

    let current = "brain";
    let history = [];
    let front = imgA;
    let back = imgB;
    let busy = false;
    let visited = new Set(["brain"]);
    let currentHoverTarget = null;
    let hideHoverTimer = null;
    let visualMode = "image";

    function currentAspect(){ return STATES[current]?.aspect || (1672 / 941); }

    function imageRect(stateKey = current){
      const r = viewport.getBoundingClientRect();
      const vw = r.width;
      const vh = r.height;
      const aspect = STATES[stateKey]?.aspect || currentAspect();
      const viewAspect = vw / vh;
      let w, h, left, top;
      if (viewAspect > aspect) {
        h = vh;
        w = h * aspect;
        left = (vw - w) / 2;
        top = 0;
      } else {
        w = vw;
        h = w / aspect;
        left = 0;
        top = (vh - h) / 2;
      }
      return { left, top, width: w, height: h };
    }

    function pointFromImagePercent(x, y, stateKey = current){
      const r = imageRect(stateKey);
      return { x: r.left + (x / 100) * r.width, y: r.top + (y / 100) * r.height };
    }

    function placeByImagePercent(el, x, y, w, h, stateKey = current){
      const r = imageRect(stateKey);
      el.style.left = (r.left + (x / 100) * r.width) + "px";
      el.style.top = (r.top + (y / 100) * r.height) + "px";
      el.style.width = ((w / 100) * r.width) + "px";
      el.style.height = ((h / 100) * r.height) + "px";
    }

    function hotspotBounds(h){
      if (!h.poly) return { x: h.x, y: h.y, w: h.w, h: h.h };
      const xs = h.poly.map(p => p[0]);
      const ys = h.poly.map(p => p[1]);
      const minX = Math.min(...xs), maxX = Math.max(...xs);
      const minY = Math.min(...ys), maxY = Math.max(...ys);
      return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    }

    function applyHotspotShape(el, h){
      const b = hotspotBounds(h);
      placeByImagePercent(el, b.x, b.y, b.w, b.h);
      if (h.poly) {
        const pts = h.poly.map(([px, py]) => `${((px - b.x) / b.w) * 100}% ${((py - b.y) / b.h) * 100}%`).join(', ');
        el.style.clipPath = `polygon(${pts})`;
      } else {
        el.style.clipPath = 'none';
      }
    }

    function preloadImages(){
      Object.values(STATES).filter(s => s.type === "image").forEach(s => {
        const img = new Image();
        img.src = s.image;
      });
    }

    function buildHistoryFor(target){
      const chain = [];
      let node = STATES[target];
      while (node && node.parent) {
        chain.unshift(node.parent);
        node = STATES[node.parent];
      }
      return chain;
    }

    function resetLayer(el, src=null) {
      if (src !== null) el.src = src;
      el.style.transition = "none";
      el.style.opacity = "0";
      el.style.transform = "translate3d(0px,0px,0px) scale(1.20)";
      el.style.filter = "saturate(.96) brightness(.88) blur(7px)";
      el.style.transformOrigin = "50% 50%";
      void el.offsetWidth;
      el.style.transition = "";
    }

    function resetModelLayer() {
      modelLayer.style.transition = "none";
      modelLayer.style.opacity = "0";
      modelLayer.style.transform = "scale(1.08)";
      modelLayer.style.filter = "saturate(.96) brightness(.88) blur(7px)";
      modelLayer.classList.remove("active");
      void modelLayer.offsetWidth;
      modelLayer.style.transition = "";
    }

    function renderStageMenu(){
      stageMenuEl.innerHTML = "";
      STAGE_ORDER.filter(key => visited.has(key)).forEach(key => {
        const s = STATES[key];
        const btn = document.createElement("button");
        btn.className = "stageCard" + (key === current ? " active" : "");
        btn.disabled = busy ? true : false;
        btn.addEventListener("click", () => { if (key !== current) jumpToState(key); });

        const meta = document.createElement("div");
        meta.className = "stageMeta";
        const name = document.createElement("div");
        name.className = "stageName";
        name.textContent = s.crumb;
        const state = document.createElement("div");
        state.className = "stageState";
        state.textContent = key === current ? "הרמה הנוכחית" : "נפתחה";
        meta.appendChild(name);
        meta.appendChild(state);

        let thumb;
        if (s.type === "image") {
          thumb = document.createElement("img");
          thumb.className = "stageThumb";
          thumb.src = s.image;
          thumb.alt = s.crumb;
        } else {
          thumb = document.createElement("img");
          thumb.className = "stageThumb purkinjeMenuThumb";
          thumb.src = ASSETS.purkinjeThumb;
          thumb.alt = s.crumb;
        }

        btn.appendChild(meta);
        btn.appendChild(thumb);
        stageMenuEl.appendChild(btn);
      });
    }

    function hideHoverCue(force=false, target=null){
      clearTimeout(hideHoverTimer);
      if (!force && target && currentHoverTarget && target !== currentHoverTarget) return;
      hideHoverTimer = setTimeout(() => {
        currentHoverTarget = null;
        hoverCue.classList.remove("visible");
        hoverLabel.classList.remove("visible");
        hoverLabel.textContent = "";
        viewport.style.cursor = "default";
      }, force ? 0 : 45);
    }

    function mousePointInViewport(ev){
      const r = viewport.getBoundingClientRect();
      return { x: ev.clientX - r.left, y: ev.clientY - r.top };
    }

    function setGlowAtMouse(h, ev){
      const b = hotspotBounds(h);
      const r = imageRect();
      const cueSize = Math.max(95, Math.min(175, Math.max((b.w/100)*r.width, (b.h/100)*r.height) * 0.38));
      const p = ev ? mousePointInViewport(ev) : pointFromImagePercent(h.cueX ?? (b.x + b.w/2), h.cueY ?? (b.y + b.h/2));
      hoverCue.style.width = cueSize + "px";
      hoverCue.style.height = cueSize + "px";
      hoverCue.style.left = p.x + "px";
      hoverCue.style.top = p.y + "px";
      hoverCue.classList.add("visible");
      return { p, cueSize };
    }

    function showHoverCue(h, ev=null){
      clearTimeout(hideHoverTimer);
      const sameTarget = currentHoverTarget === h.target && hoverCue.classList.contains("visible");
      currentHoverTarget = h.target;
      const { p, cueSize } = setGlowAtMouse(h, ev);
      if (!sameTarget) {
        if (h.label && h.label.trim()) {
          hoverLabel.textContent = h.label;
          hoverLabel.style.left = p.x + "px";
          hoverLabel.style.top = (p.y + cueSize/2 + 8) + "px";
          hoverLabel.classList.add("visible");
        } else {
          hoverLabel.classList.remove("visible");
          hoverLabel.textContent = "";
        }
      }
      viewport.style.cursor = "zoom-in";
    }

    function renderUI(){
      const s = STATES[current];
      titleEl.textContent = s.title;
      hintEl.textContent = s.hint || "";
      hintEl.style.display = s.hint ? "block" : "none";
      backBtn.disabled = history.length === 0;
      renderStageMenu();
      hotspotsEl.innerHTML = "";
      hideHoverCue(true);

      if (s.type === "image") {
        s.hotspots.slice().sort((a,b) => (a.priority||0) - (b.priority||0)).forEach(h => {
          const btn = document.createElement("button");
          btn.className = "hotspot";
          applyHotspotShape(btn, h);
          btn.addEventListener("mouseenter", (ev) => showHoverCue(h, ev));
          btn.addEventListener("mousemove", (ev) => showHoverCue(h, ev));
          btn.addEventListener("mouseleave", () => hideHoverCue(false, h.target));
          btn.addEventListener("focus", () => showHoverCue(h));
          btn.addEventListener("blur", () => hideHoverCue(true));
          btn.addEventListener("click", () => navigate(h.target, h));
          hotspotsEl.appendChild(btn);
        });
      }
      updateFullscreenButton();
    }

    function swapLayers() {
      const temp = front;
      front = back;
      back = temp;
      resetLayer(back);
    }

    function showImageOnly(){
      visualMode = "image";
      modelLayer.classList.remove("active");
      modelLayer.style.pointerEvents = "none";
    }

    function showModelOnly(){
      visualMode = "model";
      modelLayer.classList.add("active");
      modelLayer.style.pointerEvents = "auto";
    }

    function animateTransition(target, hotspot=null, mode="forward") {
      busy = true;
      hideHoverCue(true);
      renderStageMenu();

      const targetState = STATES[target];
      const currentState = STATES[current];
      const isBackLike = mode === "back";
      const duration = isBackLike ? 2400 : 3000;
      const hb = hotspot ? hotspotBounds(hotspot) : null;
      const cx = hotspot ? (hotspot.cueX ?? (hb.x + hb.w/2)) : 50;
      const cy = hotspot ? (hotspot.cueY ?? (hb.y + hb.h/2)) : 50;
      const zoomScale = hotspot?.zoomScale || (isBackLike ? 1.16 : 1.45);
      const nextStartScale = hotspot?.nextStartScale || (isBackLike ? 0.94 : 1.16);
      const nextOriginX = hotspot?.nextOriginX ?? 50;
      const nextOriginY = hotspot?.nextOriginY ?? 50;

      if (currentState.type === "model" && targetState.type === "image") {
        back.src = targetState.image;
        back.style.transition = `transform ${duration}ms cubic-bezier(.16,.72,.18,1), opacity ${duration}ms cubic-bezier(.16,.72,.18,1), filter ${duration}ms cubic-bezier(.16,.72,.18,1)`;
        modelLayer.style.transition = `transform ${duration}ms cubic-bezier(.16,.72,.18,1), opacity ${duration}ms cubic-bezier(.16,.72,.18,1), filter ${duration}ms cubic-bezier(.16,.72,.18,1)`;
        back.style.opacity = "0";
        back.style.transform = "translate3d(0px,0px,0px) scale(0.94)";
        back.style.filter = "saturate(.96) brightness(.90) blur(4px)";
        void back.offsetWidth;
        requestAnimationFrame(() => {
          flash.style.opacity = ".78";
          modelLayer.style.opacity = "0";
          modelLayer.style.transform = "scale(1.15)";
          modelLayer.style.filter = "saturate(1.04) brightness(1.00) blur(4px)";
          back.style.opacity = "1";
          back.style.transform = "translate3d(0px,0px,0px) scale(1)";
          back.style.filter = "saturate(1) brightness(1) blur(0px)";
        });
        setTimeout(() => { flash.style.opacity = "0"; }, 650);
        setTimeout(() => {
          current = target;
          visited.add(target);
          swapLayers();
          resetModelLayer();
          showImageOnly();
          busy = false;
          renderUI();
        }, duration + 80);
        return;
      }

      if (currentState.type === "image" && targetState.type === "model") {
        front.style.transition = `transform ${duration}ms cubic-bezier(.16,.72,.18,1), opacity ${duration}ms cubic-bezier(.16,.72,.18,1), filter ${duration}ms cubic-bezier(.16,.72,.18,1)`;
        modelLayer.style.transition = `transform ${duration}ms cubic-bezier(.16,.72,.18,1), opacity ${duration}ms cubic-bezier(.16,.72,.18,1), filter ${duration}ms cubic-bezier(.16,.72,.18,1)`;
        front.style.transformOrigin = `${cx}% ${cy}%`;
        modelLayer.style.opacity = "0";
        modelLayer.style.transform = `scale(${nextStartScale})`;
        modelLayer.style.filter = "saturate(.96) brightness(.88) blur(7px)";
        modelLayer.classList.add("active");
        void modelLayer.offsetWidth;
        requestAnimationFrame(() => {
          flash.style.opacity = ".95";
          front.style.transform = `translate3d(0px,0px,0px) scale(${zoomScale})`;
          front.style.opacity = "0";
          front.style.filter = "saturate(1.15) brightness(1.04) blur(3px)";
          setTimeout(() => {
            modelLayer.style.opacity = "1";
            modelLayer.style.transform = "scale(1)";
            modelLayer.style.filter = "saturate(1) brightness(1) blur(0px)";
          }, Math.round(duration * 0.22));
        });
        setTimeout(() => { flash.style.opacity = "0"; }, 650);
        setTimeout(() => {
          current = target;
          visited.add(target);
          showModelOnly();
          resetLayer(back);
          busy = false;
          renderUI();
        }, duration + 80);
        return;
      }

      // Image-to-image transition
      back.src = targetState.image;
      front.style.transition = `transform ${duration}ms cubic-bezier(.16,.72,.18,1), opacity ${duration}ms cubic-bezier(.16,.72,.18,1), filter ${duration}ms cubic-bezier(.16,.72,.18,1)`;
      back.style.transition  = `transform ${duration}ms cubic-bezier(.16,.72,.18,1), opacity ${duration}ms cubic-bezier(.16,.72,.18,1), filter ${duration}ms cubic-bezier(.16,.72,.18,1)`;
      front.style.transformOrigin = `${cx}% ${cy}%`;
      back.style.transformOrigin = `${nextOriginX}% ${nextOriginY}%`;

      if (isBackLike) {
        back.style.opacity = "0";
        back.style.transform = "translate3d(0px,0px,0px) scale(0.94)";
        back.style.filter = "saturate(.96) brightness(.90) blur(4px)";
      } else {
        back.style.opacity = "0";
        back.style.transform = `translate3d(0px,0px,0px) scale(${nextStartScale})`;
        back.style.filter = "saturate(.96) brightness(.88) blur(7px)";
      }
      void back.offsetWidth;

      requestAnimationFrame(() => {
        flash.style.opacity = ".95";
        if (isBackLike) {
          front.style.transform = "translate3d(0px,0px,0px) scale(1.18)";
          front.style.opacity = "0.05";
          front.style.filter = "saturate(1.06) brightness(1.02) blur(1px)";
          back.style.opacity = "1";
          back.style.transform = "translate3d(0px,0px,0px) scale(1)";
          back.style.filter = "saturate(1) brightness(1) blur(0px)";
        } else {
          front.style.transform = `translate3d(0px,0px,0px) scale(${zoomScale})`;
          front.style.opacity = "0.00";
          front.style.filter = "saturate(1.15) brightness(1.04) blur(2px)";
          setTimeout(() => {
            back.style.opacity = "1";
            back.style.transform = "translate3d(0px,0px,0px) scale(1)";
            back.style.filter = "saturate(1) brightness(1) blur(0px)";
          }, Math.round(duration * 0.22));
        }
      });

      setTimeout(() => { flash.style.opacity = "0"; }, 650);
      setTimeout(() => {
        current = target;
        visited.add(target);
        swapLayers();
        showImageOnly();
        busy = false;
        renderUI();
      }, duration + 80);
    }

    function navigate(target, hotspot){
      if (busy || target === current) return;
      history = buildHistoryFor(current).concat([current]);
      animateTransition(target, hotspot, "forward");
    }

    function goBack(){
      if (busy || history.length === 0) return;
      const prev = history.pop();
      animateTransition(prev, null, "back");
    }

    function goHome(){
      if (busy || current === "brain") return;
      history = [];
      animateTransition("brain", null, "back");
    }

    function jumpToState(target){
      if (busy || target === current || !visited.has(target)) return;
      const currentIndex = STAGE_ORDER.indexOf(current);
      const targetIndex = STAGE_ORDER.indexOf(target);
      history = buildHistoryFor(target);
      const mode = targetIndex < currentIndex ? "back" : "forward";
      animateTransition(target, null, mode);
    }

    function updateFullscreenButton(){
      const isFull = !!document.fullscreenElement;
      fullscreenBtn.textContent = isFull ? "יציאה ממסך מלא" : "מסך מלא";
    }

    async function toggleFullscreen(){
      try {
        if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
        else await document.exitFullscreen();
      } catch(e) {}
      updateFullscreenButton();
    }

    backBtn.addEventListener("click", goBack);
    homeBtn.addEventListener("click", goHome);
    fullscreenBtn.addEventListener("click", toggleFullscreen);
    document.addEventListener("fullscreenchange", () => { updateFullscreenButton(); if (!busy) renderUI(); });
    window.addEventListener("resize", () => { if (!busy) renderUI(); });

    purkinjeModel.addEventListener("load", () => {
      purkinjeModel.updateFraming?.();
      purkinjeModel.cameraOrbit = "0deg 70deg 14m";
      purkinjeModel.fieldOfView = "42deg";
      const fb = document.querySelector(".modelFallback");
      if (fb) fb.style.display = "none";
    });

    purkinjeModel.addEventListener("error", () => {
      const fb = document.querySelector(".modelFallback");
      if (fb) {
        fb.style.display = "block";
        fb.textContent = "לא הצלחתי לטעון את המודל. ודאו שהקובץ נפתח דרך GitHub Pages או דרך דפדפן עם חיבור לאינטרנט, כדי שרכיב התלת־ממד ייטען.";
      }
    });

    preloadImages();
    resetModelLayer();
    renderUI();
  