(function () {
    "use strict";

    /* =========================================================
       Navigation: mobile menu, header rule, active section
       ========================================================= */

    const header = document.querySelector(".header");
    const navToggle = document.querySelector(".nav-toggle");
    const nav = document.getElementById("site-nav");

    function setMenu(open) {
        if (!navToggle || !nav) return;
        navToggle.setAttribute("aria-expanded", String(open));
        nav.classList.toggle("is-open", open);
        const label = navToggle.querySelector(".nav-toggle-label");
        if (label) label.textContent = open ? "Close" : "Menu";
    }

    if (navToggle && nav) {
        navToggle.addEventListener("click", function () {
            setMenu(navToggle.getAttribute("aria-expanded") !== "true");
        });

        nav.addEventListener("click", function (event) {
            if (event.target.closest("a")) setMenu(false);
        });

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape" && nav.classList.contains("is-open")) {
                setMenu(false);
                navToggle.focus();
            }
        });

        document.addEventListener("click", function (event) {
            if (nav.classList.contains("is-open") && !event.target.closest(".header")) {
                setMenu(false);
            }
        });

        const wide = window.matchMedia("(min-width: 1081px)");
        const onWide = function (mq) { if (mq.matches) setMenu(false); };
        if (wide.addEventListener) wide.addEventListener("change", onWide);
        else if (wide.addListener) wide.addListener(onWide);
    }

    const navLinks = nav ? Array.from(nav.querySelectorAll('a[href^="#"]')) : [];
    const sections = navLinks
        .map(function (link) { return document.querySelector(link.getAttribute("href")); })
        .filter(Boolean);

    function updateActiveLink() {
        const line = window.innerHeight * 0.4;
        let current = null;

        sections.forEach(function (section) {
            if (section.getBoundingClientRect().top <= line) current = section.id;
        });

        const atBottom = window.innerHeight + window.scrollY >=
            document.documentElement.scrollHeight - 4;
        if (atBottom && sections.length) current = sections[sections.length - 1].id;

        navLinks.forEach(function (link) {
            const on = link.getAttribute("href") === "#" + current;
            link.classList.toggle("is-active", on);
            if (on) link.setAttribute("aria-current", "location");
            else link.removeAttribute("aria-current");
        });
    }

    let scrollQueued = false;
    function onScroll() {
        if (scrollQueued) return;
        scrollQueued = true;
        requestAnimationFrame(function () {
            scrollQueued = false;
            if (header) header.classList.toggle("is-scrolled", window.scrollY > 8);
            updateActiveLink();
        });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();

    /* =========================================================
       Fig. 1: the Lonely Runner Conjecture, drawn with three.js

       Five runners move at speeds 1, 3, 4, 7 and 8 laps per unit
       of time. A sixth runner stands still at the start line. It
       is lonely when every moving runner is at least 1/6 of a lap
       away, which is what the shaded zone tracks.
       ========================================================= */

    const canvas = document.getElementById("3d-animation");
    const figure = canvas ? canvas.closest(".hero-figure") : null;
    if (!canvas || !figure) return;

    function hideFigure() {
        figure.classList.add("is-unavailable");
        const hero = figure.closest(".hero");
        if (hero) hero.classList.add("hero--solo");
    }

    const THREE = window.THREE;
    if (!THREE || !webglAvailable()) {
        hideFigure();
        return;
    }

    const statusBox = document.getElementById("runner-status");
    const statusT = statusBox ? statusBox.querySelector(".status-t") : null;
    const statusText = statusBox ? statusBox.querySelector(".status-text") : null;
    const playButton = document.getElementById("figure-toggle");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const SPEEDS = [1, 3, 4, 7, 8];
    const N = SPEEDS.length;
    const DELTA = 1 / (N + 1);
    const LAP_SECONDS = 30;          // time for the speed 1 runner to finish a lap
    const START_DELAY = 1.1;         // seconds on the line before the race starts
    const START = -Math.PI / 2;      // start line faces the viewer
    const INNER = 1.0;
    const LANE = 0.17;
    const OUTER = INNER + LANE * N;
    const TILT = -0.98;
    const STEM = 0.3;
    const HEAD = 0.058;
    const TRAIL = 0.022;             // trail length, in units of time

    const rootStyle = getComputedStyle(document.documentElement);
    function cssColor(name, fallback) {
        const value = (rootStyle.getPropertyValue(name) || "").trim();
        return new THREE.Color(value || fallback);
    }

    const C = {
        ink: cssColor("--ink", "#141B34"),
        soft: cssColor("--ink-soft", "#4A5270"),
        faint: cssColor("--rule-strong", "#9AA3B8"),
        blue: cssColor("--blue", "#2338D6"),
        mark: cssColor("--mark", "#F5C518"),
        surface: cssColor("--paper-raised", "#F6F7FA")
    };

    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    } catch (error) {
        hideFigure();
        return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    const world = new THREE.Group();
    world.rotation.x = TILT;
    scene.add(world);

    /* ---------- Helpers ---------- */

    function setAttr(geometry, name, attribute) {
        if (geometry.setAttribute) geometry.setAttribute(name, attribute);
        else geometry.addAttribute(name, attribute);
    }

    // Everything on the track surface is drawn flat, in order, without depth.
    function flatMaterial(color, opacity) {
        return new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: opacity === undefined ? 1 : opacity,
            depthTest: false,
            depthWrite: false,
            side: THREE.DoubleSide
        });
    }

    function addFlat(geometry, material, order, parent) {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.renderOrder = order;
        (parent || world).add(mesh);
        return mesh;
    }

    function radialBar(angle, r0, r1, width, material, order) {
        const mesh = addFlat(new THREE.PlaneGeometry(r1 - r0, width), material, order);
        const mid = (r0 + r1) / 2;
        mesh.position.set(Math.cos(angle) * mid, Math.sin(angle) * mid, 0);
        mesh.rotation.z = angle;
        return mesh;
    }

    function polar(object, radius, angle) {
        object.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
    }

    function lapDistance(x) {
        const f = x - Math.floor(x);
        return Math.min(f, 1 - f);
    }

    /* ---------- Track ---------- */

    addFlat(new THREE.RingGeometry(INNER, OUTER, 180, 1), flatMaterial(C.surface, 0.85), 0);

    const zoneMaterial = flatMaterial(C.mark, 0.14);
    addFlat(
        new THREE.RingGeometry(INNER, OUTER, 72, 1, START - 2 * Math.PI * DELTA, 4 * Math.PI * DELTA),
        zoneMaterial,
        1
    );

    for (let k = 0; k <= N; k++) {
        const edge = k === 0 || k === N;
        const r = INNER + k * LANE;
        const w = edge ? 0.012 : 0.006;
        addFlat(new THREE.RingGeometry(r - w / 2, r + w / 2, 220, 1), flatMaterial(edge ? C.soft : C.faint), 2);
    }

    // Dashed zone boundaries at plus and minus 1/6 of a lap from the start
    const dashMaterial = flatMaterial(C.soft, 0.9);
    [-1, 1].forEach(function (side) {
        const angle = START + side * 2 * Math.PI * DELTA;
        for (let r = INNER; r < OUTER; r += 0.08) {
            radialBar(angle, r, Math.min(r + 0.045, OUTER), 0.009, dashMaterial, 3);
        }
    });

    // Start line
    radialBar(START, INNER - 0.06, OUTER + 0.06, 0.022, flatMaterial(C.ink), 3);

    /* ---------- Trails ---------- */

    const trailMaterial = new THREE.ShaderMaterial({
        uniforms: {
            color: { value: C.blue },
            fade: { value: 0 }
        },
        vertexShader: [
            "attribute float alpha;",
            "varying float vAlpha;",
            "void main() {",
            "  vAlpha = alpha;",
            "  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);",
            "}"
        ].join("\n"),
        fragmentShader: [
            "uniform vec3 color;",
            "uniform float fade;",
            "varying float vAlpha;",
            "void main() {",
            "  gl_FragColor = vec4(color, vAlpha * fade);",
            "}"
        ].join("\n"),
        transparent: true,
        depthTest: false,
        depthWrite: false,
        side: THREE.DoubleSide
    });

    function makeTrail(radius, speed) {
        const arc = 2 * Math.PI * speed * TRAIL;
        const segments = 48;
        const width = LANE * 0.34;
        const positions = new Float32Array((segments + 1) * 6);
        const alphas = new Float32Array((segments + 1) * 2);
        const index = [];

        for (let s = 0; s <= segments; s++) {
            const f = s / segments;
            const a = -arc * (1 - f);
            const half = (width * (0.25 + 0.75 * f)) / 2;
            const c = Math.cos(a);
            const sn = Math.sin(a);
            positions.set([
                c * (radius - half), sn * (radius - half), 0,
                c * (radius + half), sn * (radius + half), 0
            ], s * 6);
            const alpha = Math.pow(f, 1.6) * 0.8;
            alphas[s * 2] = alpha;
            alphas[s * 2 + 1] = alpha;
            if (s < segments) {
                const b = s * 2;
                index.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
            }
        }

        const geometry = new THREE.BufferGeometry();
        setAttr(geometry, "position", new THREE.BufferAttribute(positions, 3));
        setAttr(geometry, "alpha", new THREE.BufferAttribute(alphas, 1));
        geometry.setIndex(index);
        return addFlat(geometry, trailMaterial, 3);
    }

    /* ---------- Runners ---------- */

    const stemGeometry = new THREE.CylinderGeometry(0.009, 0.009, STEM, 8);
    stemGeometry.rotateX(Math.PI / 2);
    stemGeometry.translate(0, 0, STEM / 2);
    const headGeometry = new THREE.SphereGeometry(HEAD, 28, 18);
    const shadowGeometry = new THREE.CircleGeometry(HEAD * 0.95, 28);

    function solidMaterial(color, side) {
        return new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 1,
            side: side || THREE.FrontSide
        });
    }

    const inkMaterial = solidMaterial(C.ink);
    const outlineMaterial = solidMaterial(C.ink, THREE.BackSide);
    const shadowMaterial = flatMaterial(C.ink, 0.16);

    function makePin(fill) {
        const group = new THREE.Group();
        addFlat(shadowGeometry, shadowMaterial, 4, group);

        const stem = new THREE.Mesh(stemGeometry, inkMaterial);
        stem.renderOrder = 10;

        const outline = new THREE.Mesh(headGeometry, outlineMaterial);
        outline.scale.setScalar(1.3);
        outline.position.z = STEM;
        outline.renderOrder = 10;

        const headMaterial = solidMaterial(fill);
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.z = STEM;
        head.renderOrder = 11;

        group.add(stem, outline, head);
        world.add(group);
        return { group: group, headMaterial: headMaterial };
    }

    const runners = SPEEDS.map(function (speed, i) {
        const radius = INNER + (i + 0.5) * LANE;
        return {
            speed: speed,
            radius: radius,
            trail: makeTrail(radius, speed),
            pin: makePin(C.blue)
        };
    });

    // The stationary runner, just inside the track at the start line
    const WATCH_RADIUS = INNER - 0.17;
    const watcher = makePin(C.surface);
    polar(watcher.group, WATCH_RADIUS, START);

    // A ripple on the ground each time the watcher becomes lonely
    const pulseMaterial = flatMaterial(C.soft, 0);
    const pulse = addFlat(new THREE.RingGeometry(0.93, 1, 72, 1), pulseMaterial, 2);
    polar(pulse, WATCH_RADIUS, START);
    pulse.scale.setScalar(0.001);
    let pulseAge = Infinity;

    /* ---------- Camera and sizing ---------- */

    const stage = canvas.parentElement;
    let baseDistance = 8;
    let lookY = 0;

    // Points that must stay in frame: the outer edge and the tops of the pins
    const framePoints = [];
    for (let i = 0; i < 72; i++) {
        const a = (i / 72) * Math.PI * 2;
        const rim = OUTER + 0.07;
        const lane = OUTER - LANE / 2;
        framePoints.push(new THREE.Vector3(Math.cos(a) * rim, Math.sin(a) * rim, 0));
        framePoints.push(new THREE.Vector3(Math.cos(a) * lane, Math.sin(a) * lane, STEM + HEAD * 1.4));
    }
    world.updateMatrixWorld(true);
    framePoints.forEach(function (point) { point.applyMatrix4(world.matrixWorld); });
    const projected = new THREE.Vector3();

    function projectedBounds(distance, targetY) {
        camera.position.set(0, 0, distance);
        camera.lookAt(0, targetY, 0);
        camera.updateMatrixWorld(true);
        const b = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
        framePoints.forEach(function (point) {
            projected.copy(point).project(camera);
            b.minX = Math.min(b.minX, projected.x);
            b.maxX = Math.max(b.maxX, projected.x);
            b.minY = Math.min(b.minY, projected.y);
            b.maxY = Math.max(b.maxY, projected.y);
        });
        return b;
    }

    // Find the closest camera distance that keeps the whole figure in view, centred
    function frameCamera() {
        const margin = 0.9;
        const tanHalf = Math.tan((camera.fov * Math.PI) / 360);
        let distance = 8;
        let targetY = 0;
        for (let pass = 0; pass < 4; pass++) {
            let lo = 2;
            let hi = 60;
            for (let step = 0; step < 26; step++) {
                const mid = (lo + hi) / 2;
                const b = projectedBounds(mid, targetY);
                const extent = Math.max(b.maxX, -b.minX, (b.maxY - b.minY) / 2);
                if (extent > margin) lo = mid;
                else hi = mid;
            }
            distance = hi;
            const b = projectedBounds(distance, targetY);
            targetY += ((b.maxY + b.minY) / 2) * tanHalf * distance;
        }
        baseDistance = distance;
        lookY = targetY;
    }

    function resize() {
        const width = stage.clientWidth;
        const height = stage.clientHeight;
        if (!width || !height) return;
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        frameCamera();
        settle = Math.max(settle, 2);
        kick();
    }

    /* ---------- State ---------- */

    let t = reduceMotion ? 0.1875 : 0;   // reduced motion opens on a lonely moment
    let playing = !reduceMotion;
    let delay = reduceMotion ? 0 : START_DELAY;
    let inView = true;
    let settle = 2;
    let rafId = null;
    let last = 0;
    let glow = 0;
    let wasLonely = false;
    let statusClock = Infinity;
    let pointerX = 0;
    let pointerY = 0;
    let camX = 0;
    let camY = 0;
    let firstFrame = true;

    const surfaceColor = C.surface.clone();
    const workColor = new THREE.Color();

    function updateStatus(inside, lonely) {
        if (!statusBox) return;
        if (statusT) statusT.innerHTML = "<i>t</i> = " + t.toFixed(2);
        if (statusText) {
            if (t === 0) statusText.textContent = "All runners at the start";
            else if (lonely) statusText.textContent = "Lonely: no runner within 1/6 lap";
            else statusText.textContent = inside + (inside === 1 ? " runner" : " runners") + " within 1/6 lap";
        }
        statusBox.classList.toggle("is-lonely", lonely && t > 0);
    }

    function update(dt) {
        if (playing) {
            if (delay > 0) delay -= dt;
            else t += dt / LAP_SECONDS;
        }

        let inside = 0;
        runners.forEach(function (runner) {
            const lap = runner.speed * t;
            const angle = START + 2 * Math.PI * (lap - Math.floor(lap));
            polar(runner.pin.group, runner.radius, angle);
            runner.trail.rotation.z = angle;
            if (lapDistance(lap) < DELTA) inside++;
        });

        const lonely = inside === 0;
        trailMaterial.uniforms.fade.value = Math.min(1, t / (TRAIL * 1.5));

        // Ease the zone and the watcher toward their new state
        const ease = reduceMotion ? 1 : 1 - Math.exp(-dt * 14);
        glow += ((lonely ? 1 : 0) - glow) * ease;
        zoneMaterial.opacity = 0.14 + glow * 0.76;
        workColor.copy(surfaceColor).lerp(C.mark, glow);
        watcher.headMaterial.color.copy(workColor);

        if (lonely && !wasLonely && t > 0 && !reduceMotion) pulseAge = 0;
        wasLonely = lonely;

        if (pulseAge < 1.2) {
            pulseAge += dt;
            const p = Math.min(1, pulseAge / 1.2);
            pulse.scale.setScalar(0.08 + p * 0.42);
            pulseMaterial.opacity = 0.55 * (1 - p);
        } else {
            pulseMaterial.opacity = 0;
        }

        // Gentle camera parallax that follows the pointer
        const follow = reduceMotion ? 0 : 1 - Math.exp(-dt * 3);
        camX += (pointerX - camX) * follow;
        camY += (pointerY - camY) * follow;
        camera.position.set(camX * 0.5, -camY * 0.3, baseDistance);
        camera.lookAt(0, lookY, 0);

        statusClock += dt;
        const shownLonely = statusBox ? statusBox.classList.contains("is-lonely") : lonely;
        if (statusClock > 0.1 || lonely !== shownLonely) {
            statusClock = 0;
            updateStatus(inside, lonely);
        }

        const moving = Math.abs(pointerX - camX) + Math.abs(pointerY - camY) > 0.002;
        const easing = Math.abs((lonely ? 1 : 0) - glow) > 0.002 || pulseAge < 1.2;
        if (moving || easing) settle = Math.max(settle, 2);
    }

    function shouldRun() {
        return inView && !document.hidden && (playing || settle > 0);
    }

    function frame(now) {
        const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
        last = now;
        if (!playing && settle > 0) settle--;

        update(dt);
        renderer.render(scene, camera);

        if (firstFrame) {
            firstFrame = false;
            figure.classList.add("is-ready");
        }

        rafId = shouldRun() ? requestAnimationFrame(frame) : null;
    }

    function kick() {
        if (rafId === null && shouldRun()) {
            last = 0;
            rafId = requestAnimationFrame(frame);
        }
    }

    /* ---------- Events ---------- */

    if ("ResizeObserver" in window) new ResizeObserver(resize).observe(stage);
    else window.addEventListener("resize", resize);

    if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (entries) {
            inView = entries[0].isIntersecting;
            kick();
        }).observe(figure);
    }

    document.addEventListener("visibilitychange", kick);

    if (!reduceMotion) {
        window.addEventListener("pointermove", function (event) {
            pointerX = (event.clientX / window.innerWidth - 0.5) * 2;
            pointerY = (event.clientY / window.innerHeight - 0.5) * 2;
            settle = Math.max(settle, 2);
            kick();
        }, { passive: true });
    }

    function syncButton() {
        if (!playButton) return;
        playButton.textContent = playing ? "Pause" : "Play";
        playButton.setAttribute("aria-label", playing ? "Pause the animation" : "Play the animation");
    }

    if (playButton) {
        playButton.addEventListener("click", function () {
            playing = !playing;
            if (playing) delay = 0;
            settle = 2;
            syncButton();
            kick();
        });
    }

    syncButton();
    resize();
    kick();

    function webglAvailable() {
        try {
            const probe = document.createElement("canvas");
            return !!(window.WebGLRenderingContext &&
                (probe.getContext("webgl") || probe.getContext("experimental-webgl")));
        } catch (error) {
            return false;
        }
    }
})();
