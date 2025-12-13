/**
 * Code Wrapper Service
 * 
 * Generates executable wrapper code for different languages.
 * Uses problem metadata (functionName, inputFormat, returnType) to generate
 * proper driver code that parses inputs and calls user functions.
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
 * Generate C++ wrapper code
 * @param {Object} problem - Problem object with metadata
 * @param {string} userCode - User's C++ code
 * @returns {string} - Complete C++ program
 */
export const generateCppWrapper = (problem, userCode) => {
    const fn = problem.functionName;
    const inputs = problem.inputFormat || [];
    const returnType = problem.returnType || 'int';

    if (!fn) {
        return `
#include <iostream>
#include <vector>
#include <string>
using namespace std;

${userCode}

int main() {
    return 0;
}
`;
    }

    // For C++, we'll use similar logic but with C++ I/O
    return `
#include <iostream>
#include <vector>
#include <string>
#include <sstream>
using namespace std;

${userCode}

int main() {
    // C++ wrapper implementation
    // TODO: Implement C++ specific parsing
    return 0;
}
`;
};

/**
 * Main wrapper function - requires problem metadata
 * @param {Object} problem - Problem object with functionName, inputFormat, returnType
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
        default:
            return code;
    }
};

export default {
    generateCWrapper,
    generateCppWrapper,
    wrapCode
};
