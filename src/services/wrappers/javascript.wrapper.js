/**
 * COMPREHENSIVE JAVASCRIPT WRAPPER GENERATOR
 * Supports Interactive, Void Returns.
 * Uses AST Regex to bypass DB metadata and a bracket-aware multiline parser.
 */
export const generateJavaScriptWrapper = (problem, userCode) => {

    const metadata = problem.metaData || {};
    let fn = metadata.functionName || metadata.name || problem.functionName;
    let isDesign = problem.problemType === 'design';
    const isInteractive = problem.problemType === 'interactive';
    const outputParamIndex = metadata.outputParamIndex !== undefined ? metadata.outputParamIndex : 0;

    // Auto-detect design problems
    const BUILTIN_CLASSES = new Set(['Solution','ListNode','TreeNode','Node','GraphNode','Interval','Point']);
    const classNames = [...userCode.matchAll(/^class\s+(\w+)/gm)].map(m => m[1]);
    if (!isDesign && !isInteractive && classNames.some(c => !BUILTIN_CLASSES.has(c))) {
        isDesign = true;
    }

    let params = [];
    let returnType = {};

    // 🚀 SMART SIGNATURE EXTRACTOR: Ignore broken DB metadata
    if (!isDesign) {
        let signatureMatch = userCode.match(/(?:var|let|const)\s+(\w+)\s*=\s*function\s*\((.*?)\)/);
        if (!signatureMatch) {
            signatureMatch = userCode.match(/function\s+(\w+)\s*\((.*?)\)/);
        }
        if (signatureMatch) {
            fn = signatureMatch[1].trim();
            const paramsStr = signatureMatch[2].trim();
            if (paramsStr) {
                const pList = paramsStr.split(',').map(p => p.trim()).filter(p => p.length > 0);
                // For JS, we just extract names. We'll fallback to DB metadata for types, or default to generic parsing.
                const dbParams = (metadata.parameters && metadata.parameters.length > 0) ? metadata.parameters : (problem.parameters || []);
                params = pList.map((name, i) => {
                    let type = 'any';
                    if (dbParams.length > i) type = dbParams[i].type || dbParams[i].cType || 'any';
                    return { name, type };
                });
            }
        } else {
            params = (metadata.parameters && metadata.parameters.length > 0) ? metadata.parameters : (problem.parameters || []);
        }
        returnType = (metadata.returnType && metadata.returnType.type) ? metadata.returnType : (metadata.return && metadata.return.type) ? metadata.return : (problem.returnType || {});
    } else {
        params = (metadata.parameters && metadata.parameters.length > 0) ? metadata.parameters : (problem.parameters || []);
        returnType = (metadata.returnType && metadata.returnType.type) ? metadata.returnType : (metadata.return && metadata.return.type) ? metadata.return : (problem.returnType || {});
    }

    if (!fn && !isDesign) return userCode;

    const jsType = (cType, paramName) => {
        if (!cType) return 'any';
        let typeStr = typeof cType === 'string' ? cType : (cType.type || cType.cType || 'any');
        if (typeStr.includes('Interval')) return 'IntervalArray';
        if (typeStr.includes('Point')) return 'PointArray';
        if (typeStr.includes('ListNode')) return 'ListNode';
        if (typeStr.includes('TreeNode')) return 'TreeNode';
        if (typeStr.includes('GraphNode')) return 'GraphNode';
        if (typeStr.includes('Node') && !typeStr.includes('ListNode') && !typeStr.includes('TreeNode') && !typeStr.includes('GraphNode')) return 'Node';
        if (typeStr === 'void' || typeStr === 'None') return 'void';
        return typeStr;
    };

    const isVoidReturn = jsType(returnType.type || returnType.cType, 'return') === 'void';

    const headerCode = `const fs = require('fs');

// ============================================================================
// DATA STRUCTURE DEFINITIONS
// ============================================================================

function ListNode(val, next, random) {
    this.val = (val===undefined ? 0 : val)
    this.next = (next===undefined ? null : next)
    this.random = (random===undefined ? null : random)
}

function TreeNode(val, left, right) {
    this.val = (val===undefined ? 0 : val)
    this.left = (left===undefined ? null : left)
    this.right = (right===undefined ? null : right)
}

function Node(val, children) {
    this.val = val === undefined ? 0 : val;
    this.children = children === undefined ? [] : children;
}

function GraphNode(val, neighbors) {
    this.val = val === undefined ? 0 : val;
    this.neighbors = neighbors === undefined ? [] : neighbors;
}

function Interval(start, end) {
    this.start = start === undefined ? 0 : start;
    this.end = end === undefined ? 0 : end;
}

function Point(x, y) {
    this.x = x === undefined ? 0 : x;
    this.y = y === undefined ? 0 : y;
}

// ============================================================================
// DESERIALIZATION HELPERS
// ============================================================================

function splitInputs(str) {
    let res = [];
    let braceCount = 0, bracketCount = 0;
    let inQuote = false;
    let curr = "";
    for(let i=0; i<str.length; i++){
        let c = str[i];
        if(c === '"' && (i === 0 || str[i-1] !== '\\\\')) inQuote = !inQuote;
        else if(!inQuote) {
            if(c === '{') braceCount++;
            else if(c === '}') braceCount--;
            else if(c === '[') bracketCount++;
            else if(c === ']') bracketCount--;
        }
        if(c === '\\n' && braceCount === 0 && bracketCount === 0 && !inQuote) {
            if(curr.trim().length > 0) res.push(curr.trim());
            curr = "";
        } else {
            curr += c;
        }
    }
    if(curr.trim().length > 0) res.push(curr.trim());
    return res;
}

function toLinkedList(arr) {
    if (!arr || arr.length === 0) return null;
    if (Array.isArray(arr[0])) {
        const nodes = [];
        const head = new ListNode(arr[0][0]);
        nodes.push(head);
        let curr = head;
        for (let i = 1; i < arr.length; i++) {
            curr.next = new ListNode(arr[i][0]);
            curr = curr.next;
            nodes.push(curr);
        }
        for (let i = 0; i < arr.length; i++) {
            const randIdx = arr[i][1];
            if (randIdx !== null && randIdx !== undefined && randIdx >= 0 && randIdx < nodes.length) {
                nodes[i].random = nodes[randIdx];
            }
        }
        return head;
    }
    
    let head = new ListNode(arr[0]);
    let curr = head;
    for (let i = 1; i < arr.length; i++) {
        curr.next = new ListNode(arr[i]);
        curr = curr.next;
    }
    return head;
}

function toBinaryTree(arr) {
    if (!arr || arr.length === 0 || arr[0] === null) return null;
    let root = new TreeNode(arr[0]);
    let queue = [root];
    let i = 1;
    while (queue.length > 0 && i < arr.length) {
        let node = queue.shift();
        if (i < arr.length && arr[i] !== null) {
            node.left = new TreeNode(arr[i]);
            queue.push(node.left);
        }
        i++;
        if (i < arr.length && arr[i] !== null) {
            node.right = new TreeNode(arr[i]);
            queue.push(node.right);
        }
        i++;
    }
    return root;
}

function toNaryTree(arr) {
    if (!arr || arr.length === 0 || arr[0] === null) return null;
    let root = new Node(arr[0]);
    let queue = [root];
    let i = 2; // Skip first val and null
    while (queue.length > 0 && i < arr.length) {
        let node = queue.shift();
        while (i < arr.length && arr[i] !== null) {
            let child = new Node(arr[i]);
            node.children.push(child);
            queue.push(child);
            i++;
        }
        i++; // Skip null
    }
    return root;
}

function toGraph(arr) {
    if (!arr || arr.length === 0) return null;
    let nodes = [];
    for (let i = 0; i < arr.length; i++) {
        nodes.push(new GraphNode(i + 1));
    }
    for (let i = 0; i < arr.length; i++) {
        for (let neighborVal of arr[i]) {
            nodes[i].neighbors.push(nodes[neighborVal - 1]);
        }
    }
    return nodes.length > 0 ? nodes[0] : null;
}

// ============================================================================
// SERIALIZATION HELPERS
// ============================================================================

function serialize(val) {
    if (val === null || val === undefined) return "null";
    
    if (val instanceof ListNode) {
        let arr = [];
        let curr = val;
        let isRandom = false;
        let map = new Map();
        let idx = 0;
        while(curr) {
            map.set(curr, idx++);
            if(curr.random) isRandom = true;
            curr = curr.next;
        }
        curr = val;
        while(curr) {
            if(isRandom) arr.push([curr.val, curr.random ? map.get(curr.random) : null]);
            else arr.push(curr.val);
            curr = curr.next;
        }
        return JSON.stringify(arr);
    }
    
    if (val instanceof TreeNode) {
        let res = [];
        let q = [val];
        while(q.length > 0) {
            let curr = q.shift();
            if(curr) {
                res.push(curr.val);
                q.push(curr.left);
                q.push(curr.right);
            } else {
                res.push(null);
            }
        }
        while(res.length > 0 && res[res.length-1] === null) res.pop();
        return JSON.stringify(res);
    }
    
    if (val instanceof Node) {
        let res = [val.val, null];
        let q = [val];
        while(q.length > 0) {
            let curr = q.shift();
            for(let child of curr.children) {
                res.push(child.val);
                q.push(child);
            }
            res.push(null);
        }
        if(res.length > 0 && res[res.length-1] === null) res.pop();
        return JSON.stringify(res);
    }
    
    if (Array.isArray(val) && val.length > 0 && val[0] instanceof Interval) {
        return JSON.stringify(val.map(i => [i.start, i.end]));
    }
    
    return JSON.stringify(val);
}
`;

    const interactiveHelpers = isInteractive ? `
let _hiddenTarget = 0;
function isBadVersion(version) {
    return version >= _hiddenTarget;
}
function guess(num) {
    if (num > _hiddenTarget) return -1;
    if (num < _hiddenTarget) return 1;
    return 0;
}
` : '';

    let mainCode = "";

    if (isDesign) {
        mainCode = `
    const allInputs = fs.readFileSync(0, 'utf-8');
    const inputLines = splitInputs(allInputs);
    if(inputLines.length < 2) return;
    
    const commands = JSON.parse(inputLines[0]);
    const allArgs = JSON.parse(inputLines[1]);
    
    const output = [];
    let obj = null;
    
    const classRef = eval(commands[0]);
    
    for (let i = 0; i < commands.length; i++) {
        const cmd = commands[i];
        const args = allArgs[i];
        
        if (i === 0) {
            obj = new classRef(...args);
            output.push(null);
        } else {
            const method = obj[cmd];
            if (method) {
                const res = method.apply(obj, args);
                output.push(res !== undefined ? res : null);
            } else {
                output.push(null);
            }
        }
    }
    
    console.log(JSON.stringify(output));
        `;
    } else {
        let reads = `
    const allInputs = fs.readFileSync(0, 'utf-8');
    const inputLines = splitInputs(allInputs);
        `;
        
        let callArgs = [];
        params.forEach((param, i) => {
            const jType = jsType(param.type, param.name);
            reads += `    let raw_${i} = inputLines.length > ${i} ? JSON.parse(inputLines[${i}]) : null;\n`;
            
            if (jType === 'ListNode') reads += `    let p${i} = toLinkedList(raw_${i});\n`;
            else if (jType === 'TreeNode') reads += `    let p${i} = toBinaryTree(raw_${i});\n`;
            else if (jType === 'Node') reads += `    let p${i} = toNaryTree(raw_${i});\n`;
            else if (jType === 'GraphNode') reads += `    let p${i} = toGraph(raw_${i});\n`;
            else if (jType === 'IntervalArray') reads += `    let p${i} = raw_${i} ? raw_${i}.map(x => new Interval(x[0], x[1])) : [];\n`;
            else if (jType === 'PointArray') reads += `    let p${i} = raw_${i} ? raw_${i}.map(x => new Point(x[0], x[1])) : [];\n`;
            else reads += `    let p${i} = raw_${i};\n`;
            
            callArgs.push(`p${i}`);
        });

        if (isInteractive) {
            reads += `    if (inputLines.length > ${params.length}) _hiddenTarget = JSON.parse(inputLines[inputLines.length-1]);\n`;
        }

        const argsStr = callArgs.join(', ');

        if (isVoidReturn) {
            mainCode = `
${reads}
    ${fn}(${argsStr});
    console.log(serialize(p${outputParamIndex}));
            `;
        } else {
            mainCode = `
${reads}
    const result = ${fn}(${argsStr});
    console.log(serialize(result));
            `;
        }
    }

    return `${headerCode}
${interactiveHelpers}
${userCode}

try {
${mainCode}
} catch (err) {
    console.error(err);
}
`;
};
