
/**
 * Generate JavaScript wrapper code
 * @param {Object} problem - Problem object with metadata
 * @param {string} userCode - User's JavaScript code
 * @returns {string} - Complete JavaScript program
 */
export const generateJavaScriptWrapper = (problem, userCode) => {
    // Try to find function name
    let functionName = problem.functionName;

    // Fallback: Try regex on user code
    if (!functionName) {
        const functionMatch = userCode.match(/function\s+(\w+)|const\s+(\w+)\s*=\s*\(|var\s+(\w+)\s*=\s*\(|let\s+(\w+)\s*=\s*\(/);
        functionName = functionMatch ? (functionMatch[1] || functionMatch[2] || functionMatch[3] || functionMatch[4]) : null;
    }

    if (!functionName) return userCode;

    const helpers = `
// --- Definitions ---
function ListNode(val, next) {
    this.val = (val===undefined ? 0 : val);
    this.next = (next===undefined ? null : next);
}

function TreeNode(val, left, right) {
    this.val = (val===undefined ? 0 : val);
    this.left = (left===undefined ? null : left);
    this.right = (right===undefined ? null : right);
}

// --- Helpers ---
function toLinkedList(arr) {
    if (!arr || arr.length === 0) return null;
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
        let curr = queue.shift();
        
        // Left
        if (i < arr.length) {
            if (arr[i] !== null) {
                curr.left = new TreeNode(arr[i]);
                queue.push(curr.left);
            }
            i++;
        }
        
        // Right
        if (i < arr.length) {
            if (arr[i] !== null) {
                curr.right = new TreeNode(arr[i]);
                queue.push(curr.right);
            }
            i++;
        }
    }
    return root;
}

function linkedListToArray(head) {
    let arr = [];
    while (head) {
        arr.push(head.val);
        head = head.next;
    }
    return arr;
}

function binaryTreeToArray(root) {
    if (!root) return [];
    let res = [];
    let queue = [root];
    while (queue.length > 0) {
        let curr = queue.shift();
        if (curr) {
            res.push(curr.val);
            queue.push(curr.left);
            queue.push(curr.right);
        } else {
            res.push(null);
        }
    }
    // Trim trailing nulls
    while (res.length > 0 && res[res.length - 1] === null) {
        res.pop();
    }
    return res;
}
`;

    const params = problem.parameters || [];
    const returnType = problem.returnType || {};
    // Check return type from metadata to handle nulls
    const retTypeStr = (returnType.type || returnType.cType || "").toLowerCase();
    const isComplexReturn = retTypeStr.includes('listnode') || retTypeStr.includes('treenode') || retTypeStr.includes('list') || retTypeStr.includes('vector');
    const isStringCompression = problem.slug === 'string-compression';

    // Argument Parser Logic
    const argParser = `
    const args = lines.map((line, index) => {
        if (!line.trim()) return undefined;
        let parsed;
        try {
            parsed = JSON.parse(line);
        } catch (e) {
            return line;
        }
        
        const paramName = (params[index] && params[index].name) ? params[index].name : '';
        const paramType = (params[index] && (params[index].type || params[index].cType)) ? (params[index].type || params[index].cType) : '';

        if (Array.isArray(parsed)) {
            // Check metadata first
            if (paramType.includes('ListNode')) return toLinkedList(parsed);
            if (paramType.includes('TreeNode')) return toBinaryTree(parsed);

            // Heuristics
            if (paramName === 'head' || paramName === 'l1' || paramName === 'l2' || paramName === 'list') {
                return toLinkedList(parsed);
            }
            if (paramName === 'root' || paramName === 't1' || paramName === 't2') {
                return toBinaryTree(parsed);
            }
        }
        return parsed;
    }).filter(arg => arg !== undefined);
`;

    // Result Formatter Logic
    let resultFormatter = `
    const result = ${functionName}(...args);
    
    if (result !== undefined) {
        if (result === null) {
             if (${isComplexReturn}) console.log("[]");
             else console.log("null");
        } 
        else if (result instanceof ListNode) {
            console.log(JSON.stringify(linkedListToArray(result)));
        } else if (result instanceof TreeNode) {
            console.log(JSON.stringify(binaryTreeToArray(result)));
        } else {
            console.log(JSON.stringify(result));
        }
    }
`;

    // Override for String Compression
    if (isStringCompression) {
        resultFormatter = `
    const result = ${functionName}(...args);
    // args[0] is the 'chars' array (passed by reference-ish in JS objects/arrays)
    // JS arrays are mutable.
    const chars = args[0];
    const len = result;
    
    // Resize for display similar to C++ behavior
    // We only care about the first 'len' elements
    const sliced = chars.slice(0, len);
    
    console.log("Return " + len + ", and the first " + (len === 1 ? "character" : len + " characters") + " of the input array should be: " + JSON.stringify(sliced));
`;
    }


    return `
${userCode}

${helpers}

if (typeof fs === 'undefined') {
    var fs = require('fs');
}

try {
    const input = fs.readFileSync(0, 'utf-8').trim();
    const lines = input.split('\\n');
    
    // Metadata Parameters (injected)
    const params = ${JSON.stringify(params)};

    ${argParser}
    

    ${resultFormatter}

} catch (error) {
    console.error(error.message);
}
`;
};
