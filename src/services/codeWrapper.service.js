
import { generatePythonWrapper } from './wrappers/python.wrapper.js';
import { generateJavaWrapper } from './wrappers/java.wrapper.js';

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
    if (!fn) {
        return `
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>

${userCode}

int main() {
    // No metadata available - user must handle I/O
    return 0;
}
`;
    }

    let parseCode = "";
    let callArgs = [];

    // First, collect all sizeParam names that are auto-generated from array parameters
    const declaredSizeParams = new Set();
    params.forEach((param) => {
        if ((param.cType === 'int*' || param.cType === 'int[]') && param.sizeParam) {
            declaredSizeParams.add(param.sizeParam);
        }
    });

    // Generate input parsing based on C types
    params.forEach((param) => {
        const { name, cType, sizeParam } = param;

        // Skip this parameter if it's already been declared as a sizeParam for an array
        if (declaredSizeParams.has(name)) {
            return; // Don't parse this parameter, it's auto-generated
        }

        if (cType === 'int') {
            parseCode += `
    int ${name};
    scanf("%d", &${name});
`;
            callArgs.push(name);
        }
        else if (cType === 'char*' || cType === 'string') {
            parseCode += `
    char ${name}[200000];
    scanf("%s", ${name});
`;
            callArgs.push(name);
        }
        else if (cType === 'int*' || cType === 'int[]') {
            // Array input - needs parsing from JSON-like format
            const sizeName = sizeParam || `${name}Size`;
            parseCode += `
    char raw_${name}[500000];
    scanf("%s", raw_${name});
    int ${name}[200000];
    int ${sizeName} = 0;

    // Parse array from format like [1,2,3]
    for (int j = 0; raw_${name}[j] != '\\0'; j++) {
        if ((raw_${name}[j] >= '0' && raw_${name}[j] <= '9') || raw_${name}[j] == '-') {
            ${name}[${sizeName}] = atoi(&raw_${name}[j]);
            ${sizeName}++;
            while ((raw_${name}[j] >= '0' && raw_${name}[j] <= '9') || raw_${name}[j] == '-') j++;
        }
    }
`;
            callArgs.push(name);
            callArgs.push(sizeName);
        }
        else if (cType === 'double' || cType === 'float') {
            parseCode += `
    ${cType} ${name};
    scanf("%${cType === 'double' ? 'lf' : 'f'}", &${name});
`;
            callArgs.push(name);
        }
        else {
            // Generic fallback
            parseCode += `
    // TODO: Handle type ${cType} for ${name}
`;
            callArgs.push(name);
        }
    });

    // Add return size parameter if return type is pointer/array
    let returnSizeDecl = "";
    const retCType = returnType.cType || 'int';
    const retSizeParam = returnType.sizeParam;

    if (retCType.includes('*') || retCType.includes('[]')) {
        const sizeName = retSizeParam || 'returnSize';
        returnSizeDecl = `int ${sizeName} = 0;`;
        callArgs.push(`&${sizeName}`);
    }

    // Generate function call
    const callArgsStr = callArgs.join(', ');
    const functionCall = retCType === 'void'
        ? `${fn}(${callArgsStr});`
        : `${retCType} result = ${fn}(${callArgsStr});`;

    // Generate output printing
    let printCode = "";

    if (retCType === 'void') {
        printCode = `    // No output for void function`;
    } else if (retCType === 'int') {
        printCode = `    printf("%d", result);`;
    } else if (retCType === 'char*' || retCType === 'string') {
        printCode = `    printf("%s", result);`;
    } else if (retCType.includes('*') || retCType.includes('[]')) {
        // Array/pointer return
        const sizeName = retSizeParam || 'returnSize';
        printCode = `
    printf("[");
    for (int i = 0; i < ${sizeName}; i++) {
        printf("%d", result[i]);
        if (i < ${sizeName} - 1) printf(",");
    }
    printf("]");
`;
    } else {
        printCode = `    printf("%d", result); // Generic output`;
    }

    return `
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>
#include <math.h>

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
 * Automatically converts C types to C++ types
 * @param {Object} problem - Problem object with metadata
 * @param {string} userCode - User's C++ code
 * @returns {string} - Complete C++ program
 */
export const generateCppWrapper = (problem, userCode) => {
    const fn = problem.functionName;
    const params = problem.parameters || [];
    const returnType = problem.returnType || {};

    if (!fn) {
        return `
#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
#include <unordered_map>
#include <map>
#include <set>
#include <queue>
#include <stack>
#include <cmath>
using namespace std;

${userCode}

int main() {
    return 0;
}
`;
    }

    // Convert C return type to C++
    const retCType = convertCTypeToCpp(returnType.cType || 'int');

    // Collect sizeParams to skip (C-style size params not needed in C++)
    const declaredSizeParams = new Set();
    params.forEach((param) => {
        // Skip sizeParam for any C-style pointer types
        if ((param.cType === 'int*' || param.cType === 'int[]' || param.cType === 'double*' || param.cType === 'float*') && param.sizeParam) {
            declaredSizeParams.add(param.sizeParam);
        }
    });

    let parseCode = "";
    let callArgs = [];

    params.forEach((param) => {
        const { name, cType } = param;

        // Skip if it's a sizeParam
        if (declaredSizeParams.has(name)) {
            return;
        }

        // Convert C type to C++ type
        const cppType = convertCTypeToCpp(cType);

        if (cppType === 'int' || cppType === 'double' || cppType === 'float' || cppType === 'bool') {
            parseCode += `
    ${cppType} ${name};
    cin >> ${name};
`;
            callArgs.push(name);
        }
        else if (cppType === 'string') {
            parseCode += `
    string ${name};
    cin >> ${name};
`;
            callArgs.push(name);
        }
        else if (cppType.includes('vector<int>')) {
            parseCode += `
    string rawInput_${name};
    cin >> rawInput_${name};
    vector<int> ${name};
    
    // Parse JSON-like array format [1,2,3]
    for (size_t i = 0; i < rawInput_${name}.length(); i++) {
        if (isdigit(rawInput_${name}[i]) || rawInput_${name}[i] == '-') {
            int num = 0;
            bool negative = false;
            if (rawInput_${name}[i] == '-') {
                negative = true;
                i++;
            }
            while (i < rawInput_${name}.length() && isdigit(rawInput_${name}[i])) {
                num = num * 10 + (rawInput_${name}[i] - '0');
                i++;
            }
            ${name}.push_back(negative ? -num : num);
        }
    }
`;
            callArgs.push(name);
        }
        else if (cppType.includes('vector')) {
            // Generic vector handling
            parseCode += `
    // TODO: Parse vector type ${cppType} for ${name}
    vector<int> ${name}; // Placeholder
`;
            callArgs.push(name);
        }
        else {
            // Generic fallback
            parseCode += `
    // TODO: Handle C++ type ${cType} for ${name}
`;
            callArgs.push(name);
        }
    });

    const callArgsStr = callArgs.join(', ');

    // Determine if it's a class-based solution
    const isClassBased = userCode.includes('class Solution');

    let functionCall;
    let printCode;

    if (isClassBased) {
        functionCall = `Solution sol;
    auto result = sol.${fn}(${callArgsStr});`;
    } else {
        functionCall = `auto result = ${fn}(${callArgsStr});`;
    }

    // Generate output code based on return type
    if (retCType === 'int' || retCType === 'double' || retCType === 'float' || retCType === 'bool') {
        printCode = `cout << result << endl;`;
    } else if (retCType === 'string') {
        printCode = `cout << result << endl;`;
    } else if (retCType.includes('vector<int>')) {
        printCode = `
    cout << "[";
    for (size_t i = 0; i < result.size(); i++) {
        cout << result[i];
        if (i < result.size() - 1) cout << ",";
    }
    cout << "]" << endl;
`;
    } else {
        printCode = `cout << result << endl; // Generic output`;
    }

    return `
#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
#include <unordered_map>
#include <map>
#include <set>
#include <queue>
#include <stack>
#include <cmath>
using namespace std;

${userCode}

int main() {
${parseCode}
    ${functionCall}
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
export const generateJavaScriptWrapper = (problem, userCode) => {
    // Try to find function name
    // First check metadata
    let functionName = problem.functionName;

    // Fallback: Try regex on user code
    if (!functionName) {
        const functionMatch = userCode.match(/function\s+(\w+)|const\s+(\w+)\s*=\s*\(|var\s+(\w+)\s*=\s*\(|let\s+(\w+)\s*=\s*\(/);
        functionName = functionMatch ? (functionMatch[1] || functionMatch[2] || functionMatch[3] || functionMatch[4]) : null;
    }

    if (!functionName) return userCode; // Cannot wrap if function name not found

    return `
${userCode}

// Driver Code
// Only declare fs if not already declared by user (imperfect check)
if (typeof fs === 'undefined') {
    var fs = require('fs');
}

try {
    const input = fs.readFileSync(0, 'utf-8').trim();
    let args;
    try {
        args = JSON.parse(input);
        // If input is not an array (e.g. single number), wrap it in array if arguments length > 1? 
        // Or assume problem input format is consistent with function args.
        // For array inputs: function(nums, target) -> input should be [ [nums], target ] or similar?
        // Current existing standard in this app seems to be simple JSON or raw values.
    } catch (e) {
        args = input; // Fallback to raw string
    }

    // Call the user's function
    let result;
    if (Array.isArray(args)) {
        // If args is [arg1, arg2], spread it
        result = ${functionName}(...args);
    } else {
        result = ${functionName}(args);
    }

    // Output the result
    if (result !== undefined) {
        console.log(JSON.stringify(result));
    }
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
