
function main() {


    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    //=============== initialization stuff ===============
    // Label setup
    const labelRenderer = new THREE.CSS2DRenderer();
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.pointerEvents = 'none';

    labelRenderer.domElement.style.top = '0px';
    document.body.appendChild(labelRenderer.domElement);


    // Scene setup
    const scene = new THREE.Scene();
    // With this:
    const aspect = window.innerWidth / window.innerHeight;
    const d = 40; // Adjust this value to fit your scene
    const camera = new THREE.OrthographicCamera(
        -d * aspect, d * aspect, d, -d, 0.1, 1000
    );
    camera.position.set(0, 0, 100); // Look straight at the XY plane
    camera.lookAt(0, 0, 0);


    // Attach the renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Initialize graph
    let net;
    net = new Network()
    net.randomGraph(breadth = 20, depth = 5, breadthDecay = 1)

    let labelObjects = [];
    let nodeObjects = [];
    //=============== functions ===============
    //the parent radius should actually be the radius of the currentNodeId

    const calculateLayout = (currentNodeId, parentRadius, parentPosition = { x: 0, y: 0 }) => { // needs parent and child node
        const buffer = 1;
        const children = net.edgeHash[currentNodeId];

        if (!children || children.length === 0) return;

        let childNodes = children.map((id, i) => {
            const node = net.graph.nodes[net.nodeHash[id]];

            //node.rawRadius = ("numberOfChildren" in node ? node.numberOfChildren : net.edgeHash[node.id].length) + 1 + i;
            node.rawRadius = 1;
            return node;
        });

        // Sort by raw radius descending
        childNodes = childNodes.sort((a, b) => b.rawRadius - a.rawRadius);
        // Find scaling factor so that max child fits in parent

        const radiusRescale = (x, r_parent, layer = 0, k = 1) => {
            return (r_parent / (3 * 2 ** layer)) / (1 + Math.exp(-k * x))
        }

        childNodes[0].radius = radiusRescale(childNodes[0].rawRadius, parentRadius)
        const centerRadius = childNodes[0].radius
        childNodes[0].position = { ...parentPosition };
        // Petal layout for remaining children
        const petalNodes = childNodes.slice(1);




        if (petalNodes.length > 0) {
            let theta = 0;
            let dR = 0
            let petal_layer = 1
            let start_index = 0
            petalNodes[0].radius = radiusRescale(petalNodes[0].rawRadius, parentRadius, layer = petal_layer)

            for (let i = 0; i < petalNodes.length; i++) {
                if (i > 0) {
                    petalNodes[i].radius = radiusRescale(petalNodes[i].rawRadius, parentRadius, layer = petal_layer)

                    const a = petalNodes[i - 1].radius + petalNodes[i].radius
                    const b = petalNodes[i].radius + centerRadius + 2 * dR
                    const c = petalNodes[i - 1].radius + centerRadius + 2 * dR
                    var dtheta = Math.acos((b * b + c * c - a * a) / (2 * b * c));

                    if (theta + 2 * dtheta < 2 * Math.PI) {
                        theta += dtheta
                    } else if (theta + 2 * dtheta > 2 * Math.PI) {
                        petal_layer++
                        theta = 0
                        petalNodes[i].radius = radiusRescale(petalNodes[i].rawRadius, parentRadius, layer = petal_layer)
                        dR += Math.max(...petalNodes.slice(start_index, i).map(ele => ele.radius))
                        start_index = i
                    }
                }
                const r = petalNodes[i].radius + centerRadius + 2 * dR;
                petalNodes[i].position = {
                    x: parentPosition.x + r * Math.cos(theta),
                    y: parentPosition.y + r * Math.sin(theta)
                };

            }
            return childNodes;
        }
    };

    // --- BFS wrapper for drawing the layout ---
    const draw_layout_bfs = (label_keyname = 'name') => { //could be made to require nodes for redraw. This suggests a global set of key mappings could be set ahead of time 
        const visited = new Set();
        const queue = new Queue();
        const labels = []

        const firstNode = net.graph.nodes[0]
        firstNode.radius = 20;
        firstNode.position = { x: 0, y: 0 };
        const startId = firstNode.id;
        queue.enqueue({ id: startId, radius: 20, position: { x: 0, y: 0 } });

        const maxNodes = net.graph.nodes.length; // For normalization
        const factor = 4000
        // Draw root outline

        let colorHex = lerpColorWhiteToOrange(0);
        const rootCircle = draw_outline_circle(20, { x: 0, y: 0 }, label = firstNode[label_keyname], colorHex = colorHex, link = startId)
        nodeObjects.push(rootCircle)
        scene.add(rootCircle);
        while (!queue.isEmpty()) {
            const { id: currentId, radius: parentRadius, position: parentPosition } = queue.dequeue();
            const layout = calculateLayout(currentId, parentRadius, parentPosition);

            if (!layout) continue;

            for (let node of layout) {
                if (!visited.has(node.id)) {
                    visited.add(node.id);
                    queue.enqueue({
                        id: node.id,
                        radius: node.radius,
                        position: node.position
                    });
                    let t = factor * node.level / maxNodes;
                    let colorHex = lerpColorWhiteToOrange(t);
                    const circle = draw_outline_circle(node.radius, node.position, label = node[label_keyname], colorHex = colorHex, link = node.id)
                    nodeObjects.push(circle)
                    labelObjects.push(circle.children[0])
                    scene.add(circle); //node.label, node.radius for font scaling?

                    labels.push({ labelObject: circle.children[0], nodeLevel: node.level, nodeRadius: node.radius, nodePosition: node.position }) //I'm getting a lot of the node properties, so I should probably just pass the node here and get the children for the labels later

                }
            }
        }
        return labels
    };




    // visual radius to get the proportions required for zoom senitivity

    function getWindowRadius(r, position, camera) { //uses node radius and the camera of course. Perhaps sending the camera is redundant
        const center = new THREE.Vector3(position.x, position.y, 0)
        // Project center to screen
        const centerScreen = center.clone().project(camera);

        // Project edge point to screen (e.g., along X axis)
        const edgeWorld = center.clone().add(new THREE.Vector3(r, 0, 0));
        const edgeScreen = edgeWorld.project(camera);

        // Convert from NDC (-1 to +1) to window pixels
        function ndcToPixels(ndc, width, height) {
            return {
                x: (ndc.x + 1) / 2 * width,
                y: (1 - ndc.y) / 2 * height
            };
        }

        const width = renderer.domElement.width;
        const height = renderer.domElement.height;

        const centerPx = ndcToPixels(centerScreen, width, height);
        const edgePx = ndcToPixels(edgeScreen, width, height);

        // Apparent radius in pixels:
        const apparentRadius = Math.sqrt(
            Math.pow(edgePx.x - centerPx.x, 2) +
            Math.pow(edgePx.y - centerPx.y, 2)
        );
        return apparentRadius

    }

    // label updater
    function updateLabelVisibility(labels, camera) { //straightforward
        labels.forEach(({ labelObject, nodePosition, nodeRadius }) => {
            const pixelRadius = getWindowRadius(nodeRadius, nodePosition, camera)
            labelObject.visible = pixelRadius > window.innerHeight / 10; //the divisor has to be scaled somehow exponentially I think, perhaps by the rescale function I made earlier? Not sure what the best method is but this method in principle is alright
        });
    }

    // Render loop
    labelObjects = draw_layout_bfs(label_keyname = 'label') //having to pass this label objects is awkward

    function animate() {
        requestAnimationFrame(animate);
        updateLabelVisibility(labelObjects, camera);

        renderer.render(scene, camera);
        labelRenderer.render(scene, camera)
        console.log('current zoom: ', camera.zoom)
    }
    animate();

    // Responsive resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });


    // Panning utilities
    // Add after creating camera and renderer
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enablePan = true;                // Enable panning (default true)
    controls.screenSpacePanning = true;       // Makes panning feel natural
    controls.enableZoom = true;               // Enable zooming for OrthographicCamera

    // Optionally, set zoom limits for better user experience
    controls.minZoom = 0.5;
    controls.maxZoom = 50000;


    // tooltip

    // Tooltip DOM element
    const tooltip = document.getElementById('tooltip');

    // Raycaster and mouse vector for scene coordinate calculation
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    function onMouseMove(event) {
        // Window (screen) coordinates
        const x = event.clientX;
        const y = event.clientY;

        // Update tooltip position
        tooltip.style.left = (x + 15) + 'px';
        tooltip.style.top = (y + 15) + 'px';
        tooltip.style.display = 'block';

        // Convert to normalized device coordinates (-1 to +1)
        mouse.x = (x / window.innerWidth) * 2 - 1;
        mouse.y = - (y / window.innerHeight) * 2 + 1;

        // Raycast from camera to scene
        raycaster.setFromCamera(mouse, camera);

        // Intersect with XY plane at z = 0
        const planeZ = 0;
        const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -planeZ);
        const intersection = new THREE.Vector3();
        const hit = raycaster.ray.intersectPlane(plane, intersection);

        // Only show scene coordinates if intersection exists
        if (hit) {
            tooltip.innerText =
                `Window: (${x}, ${y})\n` +
                `Scene: (${intersection.x.toFixed(2)}, ${intersection.y.toFixed(2)}, ${intersection.z.toFixed(2)})`;
        } else {
            tooltip.innerText = `Window: (${x}, ${y})\nScene: (no intersection)`;
        }
    }


    // Hide tooltip when mouse leaves
    function onMouseOut() {
        tooltip.style.display = 'none';
    }

    window.addEventListener('mousemove', onMouseMove, false);
    window.addEventListener('mouseout', onMouseOut, false);

    // level and node keyboard navigation
    // level determined by keypress
    function go_to_level(level) {

    }

    // file reader

    function removeObject3D(object) {
        if (!(object instanceof THREE.Object3D)) return;
        // Recursively dispose children
        while (object.children.length > 0) {
            removeObject3D(object.children[0]);
        }
        // Dispose geometry
        if (object.geometry) object.geometry.dispose();
        // Dispose material(s)
        if (object.material) {
            if (Array.isArray(object.material)) {
                object.material.forEach(mat => mat.dispose());
            } else {
                object.material.dispose();
            }
        }
        // Remove from parent
        if (object.parent) object.parent.remove(object);
    }




    document.getElementById('fileinput').addEventListener('change', function (e) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = function (event) {
            const json = JSON.parse(event.target.result);

            // Remove old objects
            labelObjects.forEach(obj => removeObject3D(obj));
            nodeObjects.forEach(obj => removeObject3D(obj));
            labelObjects = [];
            nodeObjects = [];

            net.setGraph(json, fro_keyname = 'from', to_keyname = 'to');
            console.log(net.graph)
            // Redraw
            labelObjects = draw_layout_bfs();
        };
        reader.readAsText(file);
    });

}