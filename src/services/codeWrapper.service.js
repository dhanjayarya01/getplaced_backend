
import { generatePythonWrapper } from './wrappers/python.wrapper.js';
import { generateJavaWrapper } from './wrappers/java.wrapper.js';

/**
 * Generate C wrapper code with input parsing and output formatting
 * Uses optimized schema with parameter names and C types
 * @param {Object} problem - Problem object with metadata
 * @param {string} userCode - User's C function code
 * @returns {string} - Complete C program
 */

/**
 * Generate C wrapper code with input parsing and output formatting
 * Uses optimized schema with parameter names and C types
 * @param {Object} problem - Problem object with metadata
 * @param {string} userCode - User's C function code
 * @returns {string} - Complete C program
 */
export const generateCWrapper = (problem, userCode) => {
    const fn = problem.functionName;
    const params = problem.parameters || [];
    const returnType = problem.returnType || {};

    // If no metadata, return simple wrapper
    if (!fn) return userCode; // Fallback

    // Helper: Determine if we need specific structs
    const allTypes = [...params.map(p => p.cType), returnType.cType].filter(Boolean).join(' ');
    const usesListNode = allTypes.includes('ListNode');
    const usesTreeNode = allTypes.includes('TreeNode');

    const headerCode = `
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>
#include <ctype.h>
#include <math.h>
#include <limits.h>

// --- Struct Definitions ---
struct ListNode {
    int val;
    struct ListNode *next;
};

struct TreeNode {
    int val;
    struct TreeNode *left;
    struct TreeNode *right;
};

// --- Helpers for Struct Construction ---
struct ListNode* createListNode(int val) {
    struct ListNode* node = (struct ListNode*)malloc(sizeof(struct ListNode));
    node->val = val;
    node->next = NULL;
    return node;
}

struct TreeNode* createTreeNode(int val) {
    struct TreeNode* node = (struct TreeNode*)malloc(sizeof(struct TreeNode));
    node->val = val;
    node->left = NULL;
    node->right = NULL;
    return node;
}

// --- Helpers for Parsing ---
// Parse [1,2,3] to int array
int* stringToArray(char* input, int* size) {
    if (!input || strlen(input) < 2) { *size = 0; return NULL; }
    
    // Count elements
    int count = 0;
    for (int i = 0; input[i]; i++) {
        if (input[i] == ',') count++;
    }
    if (strlen(input) > 2) count++; // At least one element if length > 2 "[]"
    
    int* arr = (int*)malloc(count * sizeof(int));
    *size = 0;
    
    char* ptr = input + 1; // Skip '['
    while (*ptr && *ptr != ']') {
        if (isdigit(*ptr) || *ptr == '-') {
            arr[(*size)++] = atoi(ptr);
             while (*ptr && *ptr != ',' && *ptr != ']') ptr++;
        } else {
            ptr++;
        }
    }
    return arr;
}

// Parse [1,2,3] to linked list
struct ListNode* stringToListNode(char* input) {
    int size = 0;
    int* arr = stringToArray(input, &size);
    if (size == 0) return NULL;
    
    struct ListNode* head = createListNode(arr[0]);
    struct ListNode* curr = head;
    for (int i = 1; i < size; i++) {
        curr->next = createListNode(arr[i]);
        curr = curr->next;
    }
    free(arr);
    return head;
}

// Parse [1,null,2,3] to binary tree (Level Order)
// Only simplified queue implementation for building tree
struct TreeNode** createQueue(int* front, int* rear, int capacity) {
    *front = 0; 
    *rear = 0; 
    return (struct TreeNode**)malloc(capacity * sizeof(struct TreeNode*));
}

struct TreeNode* stringToTreeNode(char* input) {
    // Basic Parsing of keys first
    if (!input || strlen(input) < 2) return NULL;
    
    // Dynamic buffer for values (simplified string parsing)
    char buffer[100000];
    strcpy(buffer, input);
    
    // Remove brackets
    if(buffer[0] == '[') memmove(buffer, buffer+1, strlen(buffer));
    if(buffer[strlen(buffer)-1] == ']') buffer[strlen(buffer)-1] = '\\0';
    
    if (strlen(buffer) == 0) return NULL;

    // Split by comma
    // Note: C doesn't have split, doing manual
    // Assuming max 10000 nodes for now
    char* tokens[10000];
    int tokenCount = 0;
    char* token = strtok(buffer, ",");
    while (token != NULL) {
        tokens[tokenCount++] = token;
        token = strtok(NULL, ",");
    }
    
    if (tokenCount == 0 || strcmp(tokens[0], "null") == 0) return NULL;

    struct TreeNode* root = createTreeNode(atoi(tokens[0]));
    
    struct TreeNode** queue = (struct TreeNode**)malloc(10000 * sizeof(struct TreeNode*));
    int front = 0; 
    int rear = 0;
    queue[rear++] = root;
    
    int i = 1;
    while (front < rear && i < tokenCount) {
        struct TreeNode* curr = queue[front++];
        
        // Left child
        if (i < tokenCount) {
            if (strcmp(tokens[i], "null") != 0) {
                curr->left = createTreeNode(atoi(tokens[i]));
                queue[rear++] = curr->left;
            }
            i++;
        }
        
        // Right child
        if (i < tokenCount) {
             if (strcmp(tokens[i], "null") != 0) {
                curr->right = createTreeNode(atoi(tokens[i]));
                queue[rear++] = curr->right;
            }
            i++;
        }
    }
    
    free(queue);
    return root;
}

// --- Output Formatting ---
void printListNode(struct ListNode* head) {
    printf("[");
    struct ListNode* curr = head;
    while (curr) {
        printf("%d", curr->val);
        if (curr->next) printf(",");
        curr = curr->next;
    }
    printf("]\\n");
}

void printArray(int* arr, int size) {
    printf("[");
    for (int i = 0; i < size; i++) {
        printf("%d", arr[i]);
        if (i < size - 1) printf(",");
    }
    printf("]\\n");
}

`;

    let parseCode = "";
    let callArgs = [];

    // Helper to check for size param auto-generation
    const declaredSizeParams = new Set();
    params.forEach((param) => {
        if ((param.cType.includes('*') || param.cType.includes('[]')) && param.sizeParam) {
            declaredSizeParams.add(param.sizeParam);
        }
    });

    params.forEach((param) => {
        const { name, cType, sizeParam } = param;
        if (declaredSizeParams.has(name)) return; // Skip size params, we generate them

        // Input Buffer
        parseCode += `    char raw_${name}[100000];\n    if (scanf("%s", raw_${name}) == EOF) return 0;\n`;

        if (cType.includes('ListNode')) {
            parseCode += `    struct ListNode* ${name} = stringToListNode(raw_${name});\n`;
            callArgs.push(name);
        }
        else if (cType.includes('TreeNode')) {
            parseCode += `    struct TreeNode* ${name} = stringToTreeNode(raw_${name});\n`;
            callArgs.push(name);
        }
        else if (cType === 'int*' || cType === 'int[]') {
            const sizeName = sizeParam || `${name}Size`;
            parseCode += `    int ${sizeName} = 0;\n`;
            parseCode += `    int* ${name} = stringToArray(raw_${name}, &${sizeName});\n`;
            callArgs.push(name);
            callArgs.push(sizeName);
        }
        else if (cType === 'int') {
            parseCode += `    int ${name} = atoi(raw_${name});\n`;
            callArgs.push(name);
        }
        else if (cType === 'char*' || cType === 'string') {
            // Remove potential quotes
            parseCode += `    char* ${name} = raw_${name};\n`;
            callArgs.push(name);
        }
        else {
            parseCode += `    // TODO: Handle type ${cType}\n`;
            callArgs.push(name);
        }
    });

    // Return handling
    // Check if return type has size param (e.g. return array)
    let returnSizeDecl = "";
    const retCType = returnType.cType || 'int';
    const retSizeParam = returnType.sizeParam;

    // Only pass returnSize for raw arrays (int*, int[]), NOT for ListNode* or TreeNode*
    if ((retCType.includes('*') || retCType.includes('[]')) &&
        !retCType.includes('ListNode') && !retCType.includes('TreeNode')) {
        const sizeName = retSizeParam || 'returnSize';
        returnSizeDecl = `int ${sizeName} = 0;`;
        callArgs.push(`&${sizeName}`);
    }

    const callArgsStr = callArgs.join(', ');
    const functionCall = retCType === 'void'
        ? `${fn}(${callArgsStr});`
        : `${retCType} result = ${fn}(${callArgsStr});`;

    let printCode = "";
    if (retCType.includes('ListNode')) {
        printCode = `printListNode(result);`;
    } else if (retCType === 'int*' || retCType === 'int[]') {
        const sizeName = retSizeParam || 'returnSize';
        printCode = `printArray(result, ${sizeName});`;
    } else if (retCType === 'int') {
        printCode = `printf("%d\\n", result);`;
    } else {
        printCode = `printf("%d\\n", result);`; // Default
    }

    return `${headerCode}

${userCode}

int main() {
${parseCode}
    ${returnSizeDecl}
    ${functionCall}
    ${printCode}
    return 0;
}
`;
};

/**
 * Convert C types to C++ equivalents
 * Allows single metadata definition to work across languages
 * @param {string} cType - C type (e.g., "int*", "char*", "int")
 * @returns {string} - C++ equivalent type
 */
const convertCTypeToCpp = (cType) => {
    const typeMap = {
        'int*': 'vector<int>&',
        'int[]': 'vector<int>&',
        'char*': 'string',
        'double*': 'vector<double>&',
        'float*': 'vector<float>&',
        'string': 'string',
        'int': 'int',
        'double': 'double',
        'float': 'float',
        'bool': 'bool',
        'void': 'void'
    };

    return typeMap[cType] || cType; // Return original if not found
};

/**
 * Generate C++ wrapper code
 * @param {Object} problem - Problem object with metadata
 * @param {string} userCode - User's C++ code
 * @returns {string} - Complete C++ program
 */
export const generateCppWrapper = (problem, userCode) => {
    const fn = problem.functionName;
    const params = problem.parameters || [];
    const returnType = problem.returnType || {};

    if (!fn) return userCode;

    // Helper: Determine if we need specific structs
    const allTypes = [...params.map(p => p.cType), returnType.cType].filter(Boolean).join(' ');
    const usesListNode = allTypes.includes('ListNode');
    const usesTreeNode = allTypes.includes('TreeNode');

    // Headers and Structs
    const headerCode = `
#include <iostream>
#include <vector>
#include <string>
#include <sstream>
#include <algorithm>
#include <unordered_map>
#include <map>
#include <set>
#include <queue>
#include <stack>
#include <cmath>
#include <climits>
#include <iomanip>
#include <numeric>
#include <functional>

using namespace std;

// --- Struct Definitions ---
struct ListNode {
    int val;
    ListNode *next;
    ListNode() : val(0), next(nullptr) {}
    ListNode(int x) : val(x), next(nullptr) {}
    ListNode(int x, ListNode *next) : val(x), next(next) {}
};

struct TreeNode {
    int val;
    TreeNode *left;
    TreeNode *right;
    TreeNode() : val(0), left(nullptr), right(nullptr) {}
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
    TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {}
};

// --- Helper Functions for Parsing ---

// Trim whitespace and brackets [ ]
string trim(string s) {
    if (s.empty()) return s;
    size_t first = s.find_first_not_of(" []\\t\\n\\r");
    if (string::npos == first) return "";
    size_t last = s.find_last_not_of(" []\\t\\n\\r");
    return s.substr(first, (last - first + 1));
}

// Split string by commas, handling nested brackets (basic)
vector<string> split(string s) {
    vector<string> tokens;
    string token;
    int depth = 0;
    for (char c : s) {
        if (c == '[') depth++;
        if (c == ']') depth--;
        if (c == ',' && depth == 0) {
            tokens.push_back(token);
            token = "";
        } else {
            token += c;
        }
    }
    if (!token.empty()) tokens.push_back(token);
    return tokens;
}

// Parse Vector<int>
vector<int> stringToVector(string input) {
    input = trim(input);
    if (input.empty()) return {};
    vector<string> parts = split(input);
    vector<int> res;
    for(string p : parts) {
        if(p == "null" || p.empty()) continue; // Skip nulls in int vectors usually
        try { res.push_back(stoi(trim(p))); } catch(...) {}
    }
    return res;
}

// Parse ListNode
ListNode* stringToListNode(string input) {
    vector<int> vals = stringToVector(input);
    if (vals.empty()) return nullptr;
    
    ListNode* head = new ListNode(vals[0]);
    ListNode* curr = head;
    for(size_t i = 1; i < vals.size(); ++i) {
        curr->next = new ListNode(vals[i]);
        curr = curr->next;
    }
    return head;
}

// Parse TreeNode (Level Order: [1,null,2,3])
TreeNode* stringToTreeNode(string input) {
    input = trim(input);
    if (input.empty() || input == "null") return nullptr;
    
    vector<string> parts = split(input);
    if (parts.empty()) return nullptr;
    
    string rootVal = trim(parts[0]);
    if(rootVal == "null") return nullptr;
    
    TreeNode* root = new TreeNode(stoi(rootVal));
    queue<TreeNode*> q;
    q.push(root);
    
    size_t i = 1;
    while(!q.empty() && i < parts.size()) {
        TreeNode* curr = q.front();
        q.pop();
        
        // Left
        if(i < parts.size()) {
            string val = trim(parts[i]);
            if(val != "null") {
                curr->left = new TreeNode(stoi(val));
                q.push(curr->left);
            }
            i++;
        }
        
        // Right
        if(i < parts.size()) {
            string val = trim(parts[i]);
            if(val != "null") {
                curr->right = new TreeNode(stoi(val));
                q.push(curr->right);
            }
            i++;
        }
    }
    return root;
}

// --- Output Formatting ---
void printListNode(ListNode* head) {
    cout << "[";
    while(head) {
        cout << head->val;
        if(head->next) cout << ",";
        head = head->next;
    }
    cout << "]" << endl;
}

void printTreeNode(TreeNode* root) {
    if(!root) { cout << "[]" << endl; return; }
    
    vector<string> res;
    queue<TreeNode*> q;
    q.push(root);
    
    while(!q.empty()) {
        TreeNode* curr = q.front();
        q.pop();
        
        if(curr) {
            res.push_back(to_string(curr->val));
            q.push(curr->left);
            q.push(curr->right);
        } else {
            res.push_back("null");
        }
    }
    
    // Trim trailing nulls
    while(!res.empty() && res.back() == "null") res.pop_back();
    
    cout << "[";
    for(size_t i = 0; i < res.size(); ++i) {
        cout << res[i] << (i < res.size()-1 ? "," : "");
    }
    cout << "]" << endl;
}

void printVector(const vector<int>& v) {
    cout << "[";
    for(size_t i = 0; i < v.size(); ++i) {
        cout << v[i] << (i < v.size()-1 ? "," : "");
    }
    cout << "]" << endl;
}
`;

    // Type Conversion Helper (Simplified)
    const mapType = (t) => {
        if (t.includes('int*') || t.includes('vector<int>')) return 'vector<int>';
        if (t.includes('ListNode')) return 'ListNode*';
        if (t.includes('TreeNode')) return 'TreeNode*';
        if (t === 'int') return 'int';
        if (t === 'string') return 'string';
        if (t === 'bool') return 'bool';
        if (t === 'double') return 'double';
        return t; // Fallback
    };

    // Generate Main
    let parseCode = "";
    let callArgs = [];

    params.forEach((param) => {
        const { name, cType } = param;
        const cppType = mapType(cType);

        parseCode += `    string raw_${name}; if(!getline(cin, raw_${name})) return 0;\n`;

        if (cppType === 'ListNode*') {
            parseCode += `    ListNode* ${name} = stringToListNode(raw_${name});\n`;
        } else if (cppType === 'TreeNode*') {
            parseCode += `    TreeNode* ${name} = stringToTreeNode(raw_${name});\n`;
        } else if (cppType === 'vector<int>') {
            parseCode += `    vector<int> ${name} = stringToVector(raw_${name});\n`;
        } else if (cppType === 'string') {
            parseCode += `    string ${name} = trim(raw_${name}); // Remove quotes if needed but trim is safe\n`;
        } else if (cppType === 'int' || cppType === 'double' || cppType === 'bool') {
            // For primitives, parsing is simpler but raw string IO is safer for unified flow
            parseCode += `    ${cppType} ${name};\n`;
            parseCode += `    stringstream ss_${name}(raw_${name}); ss_${name} >> ${name};\n`;
        } else {
            parseCode += `    // WARNING: Unknown type ${cppType}\n    ${cppType} ${name};\n`;
        }

        callArgs.push(name);
    });

    const callArgsStr = callArgs.join(', ');
    const isClassBased = userCode.includes('class Solution');
    const funcCall = isClassBased
        ? `Solution sol; auto result = sol.${fn}(${callArgsStr});`
        : `auto result = ${fn}(${callArgsStr});`;

    // Output
    let printCode = "";
    const retType = mapType(returnType.cType);

    if (retType === 'ListNode*') {
        printCode = `printListNode(result);`;
    } else if (retType === 'TreeNode*') {
        printCode = `printTreeNode(result);`;
    } else if (retType === 'vector<int>') {
        printCode = `printVector(result);`;
    } else {
        printCode = `cout << result << endl;`;
    }

    return `${headerCode}

${userCode}

int main() {
${parseCode}
    ${funcCall}
    ${printCode}
    return 0;
}
`;
};


/**
 * Generate JavaScript wrapper code
 * @param {Object} problem - Problem object with metadata
 * @param {string} userCode - User's JavaScript code
 * @returns {string} - Complete JavaScript program
 */

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

    // Metadata check for smart parsing
    // JS is loosely typed, so we can infer or rely on metadata if present
    const params = problem.parameters || [];
    const returnType = problem.returnType || {}; // Only usually present on backend for C/Java, but we can reuse logic

    // Check if we need to convert args based on parameter names or simple heuristics
    // Since JS param types aren't strictly stored in the same "type" field always (depends on admin form),
    // we use a heuristic: if json input is array, and param name contains "head" or "list", try list.
    // Or better: Use the standard problem metadata if available. The current schema stores Java/Python specific metadata.
    // We can peek at 'dataStructures' or just always try to see if it fits.

    // Safer approach: rely on problem description/metadata
    // If we assume standard LeetCode style: 
    // - Input [1,2,3] for 'head' -> LinkedList
    // - Input [1,null,2] for 'root' -> TreeNode

    // Let's generate a smart argument parser loop
    const argParser = `
    const args = lines.map((line, index) => {
        if (!line.trim()) return undefined;
        let parsed;
        try {
            parsed = JSON.parse(line);
        } catch (e) {
            return line;
        }
        
        // Heuristic Type Inference based on param names (if available) or just simple logic
        // But we don't know the param name easily without metadata.
        // Let's assume standard names used in params list
        const paramName = (params[index] && params[index].name) ? params[index].name : '';
        
        if (Array.isArray(parsed)) {
            // Is it a Linked List? (param name 'head', 'l1', 'l2')
            if (paramName === 'head' || paramName === 'l1' || paramName === 'l2' || paramName === 'list') {
                return toLinkedList(parsed);
            }
            // Is it a Tree? (param name 'root', 't1', 't2')
            if (paramName === 'root' || paramName === 't1' || paramName === 't2') {
                return toBinaryTree(parsed);
            }
        }
        return parsed;
    }).filter(arg => arg !== undefined);
`;

    // Check return type from metadata to handle nulls correctly (as [])
    const retType = (problem.returnType && (problem.returnType.type || problem.returnType.cType)) || '';
    const isComplexReturn = retType.includes('ListNode') || retType.includes('TreeNode') || retType.includes('List') || retType.includes('Vector');

    const resultFormatter = `
    // Call function
    const result = ${functionName}(...args);
    
    // Format Output
    if (result !== undefined) {
        // Handle nulls for complex types specifically
        if (result === null) {
            // If metadata says it's a list/tree, print [] instead of null
            if (${isComplexReturn}) {
                console.log("[]");
            } else {
                console.log("null");
            }
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

    return `
${userCode}

${helpers}

// Driver Code
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

/**
 * Main wrapper function - requires problem metadata
 * @param {Object} problem - Problem object with functionName, parameters, returnType
 * @param {string} code - User's code
 * @param {string} language - Programming language
 * @returns {string} - Wrapped code
 */
export const wrapCode = (problem, code, language) => {
    switch (language.toLowerCase()) {
        case 'c':
            return generateCWrapper(problem, code);
        case 'cpp':
        case 'c++':
            return generateCppWrapper(problem, code);
        case 'python':
        case 'python3':
            return generatePythonWrapper(problem, code);
        case 'java':
            return generateJavaWrapper(problem, code);
        case 'javascript':
        case 'js':
            return generateJavaScriptWrapper(problem, code);
        default:
            return code;
    }
};

export default {
    generateCWrapper,
    generateCppWrapper,
    generatePythonWrapper,
    generateJavaWrapper,
    generateJavaScriptWrapper,
    wrapCode
};
