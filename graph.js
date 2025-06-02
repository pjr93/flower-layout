function defaultDict(factory) {
    return new Proxy({}, {
        get: (obj, key) => {
            if (!(key in obj)) {
                obj[key] = factory();
            }
            return obj[key];
        }
    });
}

class Queue {
    constructor() {
        this.items = {};
        this.headIndex = 0;
        this.tailIndex = 0;
    }
    enqueue(element) {
        this.items[this.tailIndex] = element;
        this.tailIndex++;
    }
    dequeue() {
        if (this.isEmpty()) return undefined;
        const item = this.items[this.headIndex];
        delete this.items[this.headIndex];
        this.headIndex++;
        return item;
    }
    isEmpty() {
        return this.tailIndex === this.headIndex;
    }
    size() {
        return this.tailIndex - this.headIndex;
    }
    peek() {
        return this.items[this.headIndex];
    }
    clear() {
        this.items = {};
        this.headIndex = 0;
        this.tailIndex = 0;
    }
}

class Network {
    constructor() {
        this.graph = { nodes: [], edges: [] }
        this.edgeHash = defaultDict(() => [])
        this.nodeHash = {}
    }

    addEdge(fro, to, data = {}) {
        this.graph.edges.push({ from: fro, to: to, ...data })
        this.edgeHash[fro].push(to)
    }

    addNode(id, data = {}) {
        this.graph.nodes.push({ id: id, ...data })
        this.nodeHash[id] = this.graph.nodes.length - 1 // should just point to the node, I think
    }

    setGraph(graph, from_keyname ='fro', to_keyname='to') {
        this.graph = graph
        this.edgeHash = defaultDict(() => [])
        this.nodeHash = {}

        for (let i = 0; i < this.graph.nodes.length; i++) {
            this.nodeHash[this.graph.nodes[i].id] = i
        }
        
        for (let edge of this.graph.edges){
            this.edgeHash[edge[from_keyname]].push(edge[to_keyname]) 
        }
    }


    bfsGraph(start = null, visitor = () => { }) {
        const visited = new Set()

        if (start == null) {
            start = this.graph.nodes[0]?.id
        }

        if (!(start in this.nodeHash)) {
            return
        }
        const queue = new Queue()
        queue.enqueue([start, 0])
        this.graph.nodes[this.nodeHash[start]].level = 0
        visited.add(start)

        while (!queue.isEmpty()) {
            var [current, level] = queue.dequeue()
            var currentArray = this.edgeHash[current] || []
            var currentId = this.nodeHash[current]
            var numberOfChildren = currentArray.length || 0
            this.graph.nodes[currentId].numberOfChildren = numberOfChildren
            console.log(queue)
            for (let child of currentArray) {
                if (!visited.has(child)) {
                    queue.enqueue([child, level + 1])
                    this.graph.nodes[this.nodeHash[child]].level = level + 1
                    visited.add(child)
                }
            }
        }
    }

    randomGraph(depth = 4, breadth = 4, breadthDecay = 2) {
        // Reset existing graph data
        this.graph = { nodes: [], edges: [] };
        this.edgeHash = defaultDict(() => []);
        this.nodeHash = {};

        // Create root node
        this.addNode(0, { level: 0, label: getWord() });
        const queue = new Queue();
        queue.enqueue([0, 0]); // [nodeId, currentLevel]
        let nextId = 1;

        while (!queue.isEmpty()) {
            const [currentId, currentLevel] = queue.dequeue();

            if (currentLevel >= depth) continue;
            const numChildren = Math.floor(Math.random() * breadth) - breadthDecay * currentLevel + 1

            for (let i = 0; i < numChildren; i++) {
                const childId = nextId++;
                this.addNode(childId, { level: currentLevel + 1, label: getWord() });
                this.addEdge(currentId, childId);
                queue.enqueue([childId, currentLevel + 1]);
            }
        }
    }
}


function getWord() {
    const DICTIONARY = ["apple", "banana", "cherry", "date", "elderberry", "cucumber","blueberry","strawberry","mango","pineapple","grape"];
    return DICTIONARY[Math.floor(Math.random() * DICTIONARY.length)];
}