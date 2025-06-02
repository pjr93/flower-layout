function draw_outline_circle(radius, position, label = 'egg', colorHex = 0xFFFFFF, link = '') {
    // Outlined circle (no fill) using EllipseCurve
    const curve = new THREE.EllipseCurve(
        position.x, position.y,            // ax, aY: center
        radius, radius,                    // xRadius, yRadius
        0, 2 * Math.PI,                    // startAngle, endAngle
        false,                             // clockwise
        0                                  // rotation
    );
    const points = curve.getPoints(64); // 64 segments for smoothness
    const outlineGeometry = new THREE.BufferGeometry().setFromPoints(points);
    // Use a new material per circle to avoid shared color issues
    const outlineMaterial = new THREE.LineBasicMaterial({ color: colorHex, linewidth: 2 });
    const outlineCircle = new THREE.LineLoop(outlineGeometry, outlineMaterial);

    //label portion
    const div = document.createElement('div');

    const url = document.createElement('a')
    url.href = link
    url.textContent = label;
    url.className = 'node-text';
    url.style.color = 'white'
    url.style.pointerEvents = 'auto'
    url.style.backgroundColor = 'black'
    url.target = '_blank'; // Open in new tab
    url.rel = 'noopener noreferrer'; // Security best practice
    url.dataset.baseSize = 10
    div.appendChild(url)

    const html_label = new THREE.CSS2DObject(div);
    html_label.position.set(position.x, position.y + radius, 0);
    outlineCircle.add(html_label)

    return outlineCircle
}

function lerpColorWhiteToOrange(t) {
    // t in [0, 1]: 0 = white, 1 = orange
    // White: (255,255,255), Orange: (255,165,0)
    const r = 255;
    const g = Math.round(255 * (1 - t)); // + 165 * t
    const b = Math.round(255 * (1 - t)); // from 255 to 0
    return (r << 16) | (g << 8) | b;
}




