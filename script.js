document.addEventListener("DOMContentLoaded", () => {
    // Text Fade-In/Out Animation
    const fadeTexts = document.querySelectorAll('.fade-text');

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                } else {
                    entry.target.classList.remove('visible');
                }
            });
        },
        { threshold: 0.1 } // Trigger when 10% of the element is visible
    );

    fadeTexts.forEach((text) => observer.observe(text));

    // 3D Animation with Three.js
    const canvas = document.getElementById('3d-animation');
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas });
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Wireframe Sphere Geometry
    const geometry = new THREE.SphereGeometry(15, 32, 32);
    const wireframeMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffcc,
        wireframe: true,
    });
    const wireframeSphere = new THREE.Mesh(geometry, wireframeMaterial);

    scene.add(wireframeSphere);

    // Light
    const light = new THREE.PointLight(0x00ffcc, 1, 100);
    light.position.set(10, 10, 10);
    scene.add(light);

    camera.position.z = 50;

    // Animation Loop
    function animate() {
        requestAnimationFrame(animate);

        // Rotate Sphere
        wireframeSphere.rotation.x += 0.01;
        wireframeSphere.rotation.y += 0.01;

        renderer.render(scene, camera);
    }
    animate();
});
