/**
 * COMPREHENSIVE PYTHON WRAPPER GENERATOR
 * Uses Regex AST to extract perfect signatures from user code, ignoring broken DB metadata.
 * Uses a bracket-aware splitter to handle multiline JSON testcases flawlessly.
 */
export const generatePythonWrapper = (problem, userCode) => {

    const metadata = problem.pythonMetadata || problem.metaData || {};
    let fn = metadata.functionName || metadata.name || problem.functionName || problem.slug.replace(/-/g, '_');

    let params = [];
    let returnType = {};

    let isDesign = problem.problemType === 'design';
    const isInteractive = problem.problemType === 'interactive';
    const outputParamIndex = metadata.outputParamIndex !== undefined ? metadata.outputParamIndex : 0;

    // Auto-detect design problems
    const BUILTIN_CLASSES = new Set(['Solution','ListNode','TreeNode','Node','GraphNode','Interval','Point']);
    const classNames = [...userCode.matchAll(/^class\s+(\w+)/gm)].map(m => m[1]);
    if (!isDesign && !isInteractive && classNames.some(c => !BUILTIN_CLASSES.has(c))) {
        isDesign = true;
    }

    // 🚀 SMART SIGNATURE EXTRACTOR: Ignore broken DB metadata
    if (!isDesign) {
        const signatureMatch = userCode.match(/def\s+(\w+)\s*\(\s*(?:self\s*,?\s*)?(.*?)\)\s*(?:->\s*([^:]+))?:/);
        if (signatureMatch) {
            fn = signatureMatch[1];
            const paramsStr = signatureMatch[2].trim();
            if (paramsStr) {
                let pList = [];
                let bCount = 0;
                let current = "";
                for(let i=0; i<paramsStr.length; i++){
                    let c = paramsStr[i];
                    if(c === '[') bCount++;
                    else if(c === ']') bCount--;
                    else if(c === ',' && bCount === 0) {
                        pList.push(current.trim());
                        current = "";
                        continue;
                    }
                    current += c;
                }
                if(current.trim().length > 0) pList.push(current.trim());

                params = pList.map((p) => {
                    const parts = p.split(':');
                    const name = parts[0].trim();
                    const type = parts.length > 1 ? parts[1].trim() : 'int';
                    return { name, type };
                });
            } else {
                params = [];
            }
            if (signatureMatch[3]) {
                returnType.type = signatureMatch[3].trim();
            }
        } else {
            params = (metadata.parameters && metadata.parameters.length > 0) ? metadata.parameters : (problem.parameters || []);
            returnType = (metadata.returnType && metadata.returnType.type) ? metadata.returnType : (metadata.return && metadata.return.type) ? metadata.return : (problem.returnType || {});
        }
    } else {
        params = (metadata.parameters && metadata.parameters.length > 0) ? metadata.parameters : (problem.parameters || []);
        returnType = (metadata.returnType && metadata.returnType.type) ? metadata.returnType : (metadata.return && metadata.return.type) ? metadata.return : (problem.returnType || {});
    }

    const mapType = (cType, paramName) => {
        if (!cType) return 'int';
        const typeStr = typeof cType === 'string' ? cType : (cType.type || cType.cType || 'int');

        if (typeStr.includes('Interval')) return 'IntervalArray';
        if (typeStr.includes('Point')) return 'PointArray';

        if (typeStr.startsWith('List[')) return typeStr;
        if (typeStr.startsWith('Dict[')) return typeStr;
        if (typeStr.startsWith('Set[')) return typeStr;
        if (typeStr.startsWith('Tuple[')) return typeStr;
        if (typeStr === 'Optional[ListNode]' || typeStr.includes('ListNode')) return 'Optional[ListNode]';
        if (typeStr === 'Optional[TreeNode]' || typeStr.includes('TreeNode')) return 'Optional[TreeNode]';
        if (typeStr === 'Optional[Node]') return 'Optional[Node]';
        if (typeStr === 'Optional[GraphNode]' || typeStr.includes('GraphNode')) return 'Optional[GraphNode]';

        if (typeStr.includes('Node') && !typeStr.includes('ListNode') && !typeStr.includes('TreeNode') && !typeStr.includes('GraphNode'))
            return 'Optional[Node]';

        if (typeStr.includes('vector<vector<vector<int>>>') || typeStr === 'int[][][]') return 'List[List[List[int]]]';
        if (typeStr.includes('vector<vector<int>>') || typeStr === 'int[][]' || typeStr === 'List[List[int]]') return 'List[List[int]]';
        if (typeStr.includes('vector<vector<double>>') || typeStr === 'double[][]' || typeStr === 'List[List[double]]') return 'List[List[float]]';
        if (typeStr.includes('vector<vector<string>>') || typeStr === 'String[][]' || typeStr === 'List[List[str]]') return 'List[List[str]]';
        if (typeStr.includes('vector<int>') || typeStr === 'int[]' || typeStr === 'List[int]') return 'List[int]';
        if (typeStr.includes('vector<double>') || typeStr === 'double[]' || typeStr === 'List[float]') return 'List[float]';
        if (typeStr.includes('vector<bool>') || typeStr === 'boolean[]' || typeStr === 'List[bool]') return 'List[bool]';
        if (typeStr.includes('vector<string>') || typeStr === 'String[]' || typeStr === 'List[str]') return 'List[str]';

        if (typeStr === 'int' || typeStr === 'Integer' || typeStr.includes('long')) return 'int';
        if (typeStr === 'double' || typeStr === 'Double' || typeStr === 'float') return 'float';
        if (typeStr === 'bool' || typeStr === 'boolean' || typeStr === 'Boolean') return 'bool';
        if (typeStr === 'char' || typeStr === 'string' || typeStr === 'String' || typeStr === 'str') return 'str';
        if (typeStr === 'void' || typeStr === 'None') return 'None';

        return typeStr;
    };

    const sanitizeName = (name) => {
        if (!name) return 'param';
        let clean = String(name).replace(/[^a-zA-Z0-9_]/g, '_');
        if (/^\d/.test(clean)) clean = 'param_' + clean;
        if (!clean || clean === '_') clean = 'param';
        return clean;
    };

    params = params.map(p => ({
        name: sanitizeName(p.name),
        type: p.type || mapType(p.cType, p.name)
    }));

    const normalizedReturnType = returnType.type || mapType(returnType.cType, 'return');
    const isVoidReturn = normalizedReturnType === 'None' || normalizedReturnType === 'void';

    const headerCode = `import sys
import json
sys.setrecursionlimit(10000)
from typing import List, Optional, Dict, Set, Tuple
from collections import deque, defaultdict, Counter
from itertools import permutations, combinations
from functools import lru_cache
from heapq import heappush, heappop
import math

# ============================================================================
# DATA STRUCTURE DEFINITIONS
# ============================================================================

class ListNode:
    def __init__(self, val=0, next=None, random=None):
        self.val = val
        self.next = next
        self.random = random

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

class Node:
    def __init__(self, val=None, children=None):
        self.val = val
        self.children = children if children is not None else []

class GraphNode:
    def __init__(self, val=0, neighbors=None):
        self.val = val
        self.neighbors = neighbors if neighbors is not None else []

class Interval:
    def __init__(self, start=0, end=0):
        self.start = start
        self.end = end

class Point:
    def __init__(self, x=0, y=0):
        self.x = x
        self.y = y

# ============================================================================
# DESERIALIZATION HELPERS
# ============================================================================

def split_inputs(all_inputs):
    res = []
    brace_count = 0
    bracket_count = 0
    in_quote = False
    curr = []
    for i, c in enumerate(all_inputs):
        if c == '"' and (i == 0 or all_inputs[i-1] != '\\\\'):
            in_quote = not in_quote
        elif not in_quote:
            if c == '{': brace_count += 1
            elif c == '}': brace_count -= 1
            elif c == '[': bracket_count += 1
            elif c == ']': bracket_count -= 1
        
        if c == '\\n' and brace_count == 0 and bracket_count == 0 and not in_quote:
            j = "".join(curr).strip()
            if j: res.append(j)
            curr = []
        else:
            curr.append(c)
    
    j = "".join(curr).strip()
    if j: res.append(j)
    return res

def to_linked_list(arr):
    if not arr: return None
    
    if isinstance(arr[0], list):
        # Random pointer array
        nodes = []
        head = ListNode(arr[0][0])
        nodes.append(head)
        curr = head
        for i in range(1, len(arr)):
            curr.next = ListNode(arr[i][0])
            curr = curr.next
            nodes.append(curr)
        for i in range(len(arr)):
            rand_idx = arr[i][1]
            if rand_idx is not None and 0 <= rand_idx < len(nodes):
                nodes[i].random = nodes[rand_idx]
        return head
        
    head = ListNode(arr[0])
    curr = head
    for i in range(1, len(arr)):
        curr.next = ListNode(arr[i])
        curr = curr.next
    return head

def to_binary_tree(arr):
    if not arr or arr[0] is None: return None
    root = TreeNode(arr[0])
    queue = [root]
    i = 1
    while queue and i < len(arr):
        node = queue.pop(0)
        if i < len(arr) and arr[i] is not None:
            node.left = TreeNode(arr[i])
            queue.append(node.left)
        i += 1
        if i < len(arr) and arr[i] is not None:
            node.right = TreeNode(arr[i])
            queue.append(node.right)
        i += 1
    return root

def to_nary_tree(arr):
    if not arr or arr[0] is None: return None
    root = Node(arr[0])
    queue = [root]
    i = 2
    while queue and i < len(arr):
        node = queue.pop(0)
        while i < len(arr) and arr[i] is not None:
            child = Node(arr[i])
            node.children.append(child)
            queue.append(child)
            i += 1
        i += 1
    return root

def to_graph(arr):
    if not arr: return None
    nodes = [GraphNode(i + 1) for i in range(len(arr))]
    for i, neighbors in enumerate(arr):
        for neighbor_val in neighbors:
            if 1 <= neighbor_val <= len(nodes):
                nodes[i].neighbors.append(nodes[neighbor_val - 1])
    return nodes[0] if nodes else None

def to_interval_array(arr):
    if not arr: return []
    return [Interval(a[0], a[1]) for a in arr]

def to_point_array(arr):
    if not arr: return []
    return [Point(a[0], a[1]) for a in arr]

def parse_tuple(arr):
    return tuple(arr) if isinstance(arr, list) else arr

def parse_set(arr):
    return set(arr) if isinstance(arr, list) else arr

def parse_dict(obj):
    return obj if isinstance(obj, dict) else {}

# ============================================================================
# SERIALIZATION HELPERS
# ============================================================================

def list_node_to_array(head):
    arr = []
    curr = head
    is_random = False
    nodes_map = {}
    idx = 0
    while curr:
        nodes_map[curr] = idx
        if getattr(curr, 'random', None) is not None: is_random = True
        curr = curr.next
        idx += 1
    curr = head
    while curr:
        if is_random:
            rand_idx = nodes_map.get(curr.random) if curr.random else None
            arr.append([curr.val, rand_idx])
        else:
            arr.append(curr.val)
        curr = curr.next
    return arr

def tree_node_to_array(root):
    if not root: return []
    output = []
    queue = [root]
    while queue:
        node = queue.pop(0)
        if node:
            output.append(node.val)
            queue.append(node.left)
            queue.append(node.right)
        else:
            output.append(None)
    while output and output[-1] is None:
        output.pop()
    return output

def nary_tree_to_array(root):
    if not root: return []
    result = [root.val, None]
    queue = [root]
    while queue:
        node = queue.pop(0)
        for child in node.children:
            result.append(child.val)
            queue.append(child)
        result.append(None)
    if result and result[-1] is None: result.pop()
    return result

def graph_to_adjacency_list(node):
    if not node: return []
    visited = {}
    result = []
    def dfs(curr):
        if curr.val in visited: return
        visited[curr.val] = True
        neighbors = [n.val for n in curr.neighbors]
        result.append(neighbors)
        for neighbor in curr.neighbors: dfs(neighbor)
    dfs(node)
    return result

def serialize_value(val):
    if val is None: return "null"
    if isinstance(val, ListNode): return json.dumps(list_node_to_array(val), separators=(',', ':'))
    if isinstance(val, TreeNode): return json.dumps(tree_node_to_array(val), separators=(',', ':'))
    if isinstance(val, Node): return json.dumps(nary_tree_to_array(val), separators=(',', ':'))
    if isinstance(val, GraphNode): return json.dumps(graph_to_adjacency_list(val), separators=(',', ':'))
    if isinstance(val, set): return json.dumps(sorted(list(val)), separators=(',', ':'))
    if isinstance(val, tuple): return json.dumps(list(val), separators=(',', ':'))
    if isinstance(val, list) and len(val)>0 and isinstance(val[0], Interval): return json.dumps([[i.start, i.end] for i in val], separators=(',', ':'))
    if isinstance(val, list) and len(val)>0 and isinstance(val[0], Point): return json.dumps([[p.x, p.y] for p in val], separators=(',', ':'))
    return json.dumps(val, separators=(',', ':'))
`;

    const interactiveHelpers = isInteractive ? `
# ============================================================================
# INTERACTIVE API MOCKS
# ============================================================================
_hidden_target = 0
def isBadVersion(version):
    global _hidden_target
    return version >= _hidden_target

def guess(num):
    global _hidden_target
    if num > _hidden_target: return -1
    if num < _hidden_target: return 1
    return 0
` : '';

    let parseCode = "";
    let functionCall = "";
    let printCode = "";

    if (isDesign) {
        parseCode = `
        lines = split_inputs(sys.stdin.read())
        commands = json.loads(lines[0])
        all_args = json.loads(lines[1])
        output = []
        obj = None
        class_ref = globals().get(commands[0])
        if not class_ref: raise Exception("Class not found: " + commands[0])
        for i in range(len(commands)):
            cmd = commands[i]
            args = all_args[i]
            if i == 0:
                obj = class_ref(*args)
                output.append(None)
            else:
                method = getattr(obj, cmd, None)
                if method:
                    res = method(*args)
                    output.append(res)
                else:
                    output.append(None)
        print(json.dumps(output, separators=(',', ':')))
        `;
    } else {
        parseCode = `        lines = split_inputs(sys.stdin.read())\n`;
        if (isInteractive) {
            parseCode += `
        global _hidden_target
        if len(lines) > ${params.length}: _hidden_target = json.loads(lines[-1])
        `;
        }
        
        let callArgs = [];
        params.forEach((param, index) => {
            const { name, type } = param;
            parseCode += `        raw_${name} = json.loads(lines[${index}]) if len(lines) > ${index} else None\n`;
            if (type === 'Optional[ListNode]' || type === 'ListNode') parseCode += `        ${name} = to_linked_list(raw_${name})\n`;
            else if (type === 'Optional[TreeNode]' || type === 'TreeNode') parseCode += `        ${name} = to_binary_tree(raw_${name})\n`;
            else if (type === 'Optional[Node]' || type === 'Node') parseCode += `        ${name} = to_nary_tree(raw_${name})\n`;
            else if (type === 'Optional[GraphNode]' || type === 'GraphNode') parseCode += `        ${name} = to_graph(raw_${name})\n`;
            else if (type === 'IntervalArray') parseCode += `        ${name} = to_interval_array(raw_${name})\n`;
            else if (type === 'PointArray') parseCode += `        ${name} = to_point_array(raw_${name})\n`;
            else if (type.startsWith('Tuple[')) parseCode += `        ${name} = parse_tuple(raw_${name})\n`;
            else if (type.startsWith('Set[')) parseCode += `        ${name} = parse_set(raw_${name})\n`;
            else if (type.startsWith('Dict[')) parseCode += `        ${name} = parse_dict(raw_${name})\n`;
            else if (type === 'List[List[List[int]]]') parseCode += `        ${name} = raw_${name}\n`;
            else parseCode += `        ${name} = raw_${name}\n`;
            callArgs.push(name);
        });

        const callArgsStr = callArgs.join(', ');
        const isClassMethod = /class\s+Solution/.test(userCode);

        if (isVoidReturn) {
            if (isClassMethod) functionCall = `        sol = Solution()\n        sol.${fn}(${callArgsStr})`;
            else functionCall = `        ${fn}(${callArgsStr})`;
            
            if (params.length > outputParamIndex) {
                printCode = `        print(serialize_value(${params[outputParamIndex].name}))`;
            }
        } else {
            if (isClassMethod) functionCall = `        sol = Solution()\n        result = sol.${fn}(${callArgsStr})`;
            else functionCall = `        result = ${fn}(${callArgsStr})`;
            printCode = `        print(serialize_value(result))`;
        }
    }

    return `${headerCode}
${interactiveHelpers}
${userCode}

if __name__ == "__main__":
    try:
${parseCode}
${functionCall}
${printCode}
    except Exception as e:
        sys.stderr.write(f"Runtime Error: {str(e)}\\n")
        raise e
`;
};
