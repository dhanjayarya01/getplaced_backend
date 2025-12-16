
/**
 * Generate Python wrapper code using explicit Python metadata
 * @param {Object} problem - Problem object with pythonMetadata
 * @param {string} userCode - User's Python code
 * @returns {string} - Complete Python program
 */
export const generatePythonWrapper = (problem, userCode) => {
    const metadata = problem.pythonMetadata || {};
    let fn = metadata.functionName || problem.functionName;

    // Fallback if metadata params are empty but problem params exist
    let params = (metadata.parameters && metadata.parameters.length > 0)
        ? metadata.parameters
        : (problem.parameters || []);

    // Fallback for return type if metadata is empty object
    const returnType = (metadata.returnType && metadata.returnType.type)
        ? metadata.returnType
        : (problem.returnType || {}); // problem.returnType has cType

    // Mapper for C types to Python types if needed
    const mapCTypeToPython = (cType, paramName) => {
        if (!cType) return 'int'; // default
        if (cType.includes('ListNode')) return 'ListNode';
        if (cType.includes('TreeNode')) return 'TreeNode';
        if (cType.includes('int*') || cType.includes('int[]') || cType.includes('vector')) return 'List[int]';
        if (cType.includes('char*') || cType.includes('string')) return 'str';
        if (cType.includes('bool')) return 'bool';
        if (cType.includes('double') || cType.includes('float')) return 'float';
        // Check heuristics
        if (paramName && (paramName.includes('arr') || paramName.includes('nums'))) return 'List[int]';
        return 'int';
    };

    // Normalize parameters
    params = params.map(p => ({
        name: p.name,
        type: p.type || mapCTypeToPython(p.cType, p.name)
    }));

    // Normalize return type
    const normalizedReturnType = {
        type: returnType.type || mapCTypeToPython(returnType.cType, 'return')
    };

    if (!fn) return userCode; // Fallback

    // Detect Types Used
    const allTypes = [...params.map(p => p.type), normalizedReturnType.type].filter(Boolean).join(' ');
    const usesListNode = allTypes.includes('ListNode');
    const usesTreeNode = allTypes.includes('TreeNode');

    // Helper Functions
    const headerCode = `
import sys
import json
sys.setrecursionlimit(2000)
from typing import List, Optional, Dict, Set, Tuple

# Standard Definition for singly-linked list.
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

# Standard Definition for a binary tree node.
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

# Helpers for Deserialization
def to_linked_list(arr):
    if not arr: return None
    head = ListNode(arr[0])
    curr = head
    for i in range(1, len(arr)):
        curr.next = ListNode(arr[i])
        curr = curr.next
    return head

def to_binary_tree(arr):
    if not arr: return None
    if not arr[0] and arr[0] != 0: return None # Handle [null] case specific to LeetCode format if needed? usually [None]
    
    root = TreeNode(arr[0])
    queue = [root]
    i = 1
    while queue and i < len(arr):
        node = queue.pop(0)
        
        # Left child
        if i < len(arr) and arr[i] is not None:
            node.left = TreeNode(arr[i])
            queue.append(node.left)
        i += 1
        
        # Right child
        if i < len(arr) and arr[i] is not None:
            node.right = TreeNode(arr[i])
            queue.append(node.right)
        i += 1
    return root

# Helpers for Serialization
def list_node_to_array(head):
    arr = []
    curr = head
    while curr:
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
    # Trim trailing Nones
    while output and output[-1] is None:
        output.pop()
    return output
`;

    // Generate Input Parsing
    let parseCode = "";
    let callArgs = [];

    params.forEach((param) => {
        const { name, type } = param;

        // 1. Read JSON Line
        const rawVar = `raw_${name}`;
        parseCode += `        ${rawVar} = json.loads(input().strip())\n`;

        // 2. Convert if necessary
        if (type.includes('ListNode')) {
            parseCode += `        ${name} = to_linked_list(${rawVar})\n`;
        } else if (type.includes('TreeNode')) {
            parseCode += `        ${name} = to_binary_tree(${rawVar})\n`;
        } else {
            // Primitives, Lists, Dicts - handled directly by json.loads
            parseCode += `        ${name} = ${rawVar}\n`;
        }
        callArgs.push(name);
    });

    const callArgsStr = callArgs.join(', ');

    // Call User Function
    const isClassMethod = /class\s+Solution/.test(userCode);
    let functionCall;
    if (isClassMethod) {
        functionCall = `        sol = Solution()\n        result = sol.${fn}(${callArgsStr})`;
    } else {
        functionCall = `        result = ${fn}(${callArgsStr})`;
    }

    // Output Formatting
    let printCode = "";
    const rType = normalizedReturnType.type;

    if (rType && rType.includes('ListNode')) {
        printCode = `        out_arr = list_node_to_array(result)\n        print(json.dumps(out_arr, separators=(',', ':')))`;
    } else if (rType && rType.includes('TreeNode')) {
        printCode = `        out_arr = tree_node_to_array(result)\n        print(json.dumps(out_arr, separators=(',', ':')))`;
    } else if (problem.slug === 'string-compression') {
        printCode = `        out_len = result
        out_list = ${params[0].name}[:out_len]
        print(f'Return {out_len}, and the first {"character" if out_len == 1 else f"{out_len} characters"} of the input array should be: {json.dumps(out_list, separators=(",", ":"))}')`;
    } else {
        // Default JSON dump for primitives/lists
        printCode = `        print(json.dumps(result, separators=(',', ':')))`;
    }

    // Explicit flush
    printCode += `\n        sys.stdout.flush()`;

    return `${headerCode}

${userCode}

if __name__ == "__main__":
    try:
${parseCode}
${functionCall}
${printCode}
    except Exception as e:
        sys.stderr.write(f"Runtime Error: {str(e)}")
        raise e
`;
};
