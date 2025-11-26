// Simple page interactions + hero 3D background
document.addEventListener("DOMContentLoaded", () => {
    /* ===== Fade-in on scroll ===== */
    const observer = new IntersectionObserver(
        entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("in-view");
                    observer.unobserve(entry.target);
                }
            });
        },
        {
            threshold: 0.12
        }
    );

    document.querySelectorAll(".fade-text").forEach(el => observer.observe(el));

    /* ===== three.js hero animation ===== */
    const canvas = document.getElementById("3d-animation");
    if (canvas && window.THREE) {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(
            55,
            window.innerWidth / window.innerHeight,
            0.1,
            100
        );
        camera.position.z = 4;

        const renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            alpha: true
        });
        renderer.setPixelRatio(window.devicePixelRatio || 1);
        renderer.setSize(window.innerWidth, window.innerHeight);

        // Soft gradient background sphere
        const geometry = new THREE.IcosahedronGeometry(1.6, 2);
        const material = new THREE.MeshStandardMaterial({
            color: 0x6366f1,
            emissive: 0x1d4ed8,
            metalness: 0.6,
            roughness: 0.25
        });
        const blob = new THREE.Mesh(geometry, material);
        scene.add(blob);

        // Wireframe overlay
        const wireMaterial = new THREE.MeshBasicMaterial({
            color: 0xa855f7,
            wireframe: true,
            transparent: true,
            opacity: 0.35
        });
        const wireBlob = new THREE.Mesh(geometry, wireMaterial);
        scene.add(wireBlob);

        // Lighting
        const ambient = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambient);

        const keyLight = new THREE.PointLight(0x6366f1, 1.2);
        keyLight.position.set(4, 4, 4);
        scene.add(keyLight);

        const rimLight = new THREE.PointLight(0xa855f7, 1.2);
        rimLight.position.set(-3, -2, -4);
        scene.add(rimLight);

        // Animation loop
        let mouseX = 0, mouseY = 0;

        const onMouseMove = e => {
            const x = (e.clientX / window.innerWidth) * 2 - 1;
            const y = -(e.clientY / window.innerHeight) * 2 + 1;
            mouseX = x * 0.6;
            mouseY = y * 0.6;
        };

        window.addEventListener("mousemove", onMouseMove);

        function animate() {
            requestAnimationFrame(animate);

            blob.rotation.x += 0.002;
            blob.rotation.y += 0.003;

            wireBlob.rotation.x += 0.001;
            wireBlob.rotation.y += 0.002;

            camera.position.x += (mouseX - camera.position.x) * 0.04;
            camera.position.y += (mouseY - camera.position.y) * 0.04;
            camera.lookAt(scene.position);

            renderer.render(scene, camera);
        }
        animate();

        // Resize
        window.addEventListener("resize", () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        });
    }
});
