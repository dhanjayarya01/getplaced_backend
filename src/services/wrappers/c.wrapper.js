/**
 * COMPREHENSIVE C WRAPPER GENERATOR
 * Supports Interactive, Void Returns.
 * Uses AST Regex to bypass DB metadata and a bracket-aware multiline parser.
 */
export const generateCWrapper = (problem, userCode) => {

    const metadata = problem.metaData || {};
    let fn = metadata.functionName || metadata.name || problem.functionName;
    const isDesign = problem.problemType === 'design';
    const isInteractive = problem.problemType === 'interactive';
    const outputParamIndex = metadata.outputParamIndex !== undefined ? metadata.outputParamIndex : 0;

    let params = [];
    let returnType = {};

    // 🚀 SMART SIGNATURE EXTRACTOR: Ignore broken DB metadata
    if (!isDesign) {
        const signatureMatch = userCode.match(/(struct\s+[a-zA-Z0-9_]+\*?|[a-zA-Z0-9_*]+)\s+(\w+)\s*\((.*?)\)/);
        if (signatureMatch) {
            returnType.type = signatureMatch[1].trim();
            fn = signatureMatch[2].trim();
            const paramsStr = signatureMatch[3].trim();
            if (paramsStr) {
                const pList = paramsStr.split(',').map(p => p.trim()).filter(p => p.length > 0);
                params = pList.map((p) => {
                    const parts = p.split(/\s+/);
                    let name = parts.pop().replace(/[*]/g, '');
                    let type = parts.join(' ').trim();
                    return { name, type };
                });
            }
        } else {
            params = (metadata.parameters && metadata.parameters.length > 0) ? metadata.parameters : (problem.parameters || []);
            returnType = (metadata.returnType && metadata.returnType.type) ? metadata.returnType : (metadata.return && metadata.return.type) ? metadata.return : (problem.returnType || {});
        }
    } else {
        params = (metadata.parameters && metadata.parameters.length > 0) ? metadata.parameters : (problem.parameters || []);
        returnType = (metadata.returnType && metadata.returnType.type) ? metadata.returnType : (metadata.return && metadata.return.type) ? metadata.return : (problem.returnType || {});
    }

    if (!fn && !isDesign) return userCode;

    const cType = (typeObj, paramName) => {
        if (!typeObj) return 'int';
        let typeStr = typeof typeObj === 'string' ? typeObj : (typeObj.type || typeObj.cType || 'int');

        if (typeStr.includes('ListNode')) return 'struct ListNode*';
        if (typeStr.includes('TreeNode')) return 'struct TreeNode*';
        if (typeStr.includes('GraphNode')) return 'struct GraphNode*';
        if (typeStr.includes('Node') && !typeStr.includes('ListNode') && !typeStr.includes('TreeNode') && !typeStr.includes('GraphNode')) return 'struct Node*';

        if (typeStr.includes('vector<vector<int>>') || typeStr === 'int[][]' || typeStr.includes('**')) return 'int**';
        if (typeStr.includes('vector<vector<string>>') || typeStr === 'String[][]') return 'char***';
        if (typeStr.includes('vector<vector<char>>') || typeStr === 'char[][]') return 'char***';

        if (typeStr.includes('vector<int>') || typeStr === 'int[]' || typeStr === 'int*') return 'int*';
        if (typeStr.includes('vector<double>') || typeStr === 'double[]' || typeStr === 'double*') return 'double*';
        if (typeStr.includes('vector<string>') || typeStr === 'String[]' || typeStr === 'char**') return 'char**';
        if (typeStr.includes('vector<char>') || typeStr === 'char[]' || typeStr === 'char*') return 'char*';
        if (typeStr.includes('vector<bool>') || typeStr === 'boolean[]' || typeStr === 'bool*') return 'bool*';

        if (typeStr === 'int' || typeStr === 'Integer') return 'int';
        if (typeStr === 'long' || typeStr === 'long long') return 'long long';
        if (typeStr === 'double' || typeStr === 'Double' || typeStr === 'float') return 'double';
        if (typeStr === 'bool' || typeStr === 'boolean') return 'bool';
        if (typeStr === 'char' || typeStr === 'Character') return 'char';
        if (typeStr === 'string' || typeStr === 'String') return 'char*';
        if (typeStr === 'void' || typeStr === 'None') return 'void';

        return 'char*';
    };

    const isVoidReturn = cType(returnType.type || returnType.cType, 'return') === 'void';

    const headerCode = `#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>
#include <limits.h>
#include <math.h>
#include <ctype.h>

// ============================================================================
// DATA STRUCTURE DEFINITIONS
// ============================================================================

struct ListNode {
    int val;
    struct ListNode *next;
    struct ListNode *random;
};

struct TreeNode {
    int val;
    struct TreeNode *left;
    struct TreeNode *right;
};

struct Node {
    int val;
    int numChildren;
    struct Node **children;
};

// ============================================================================
// JSON PARSER HELPERS
// ============================================================================

char* trim(char* str) {
    if(!str) return NULL;
    char* end;
    while(isspace((unsigned char)*str)) str++;
    if(*str == 0) return str;
    end = str + strlen(str) - 1;
    while(end > str && isspace((unsigned char)*end)) end--;
    end[1] = '\\0';
    return str;
}

char* readAllStdin() {
    size_t cap = 10000;
    size_t len = 0;
    char* buf = (char*)malloc(cap);
    buf[0] = '\\0';
    char temp[1024];
    while (fgets(temp, 1024, stdin)) {
        size_t tLen = strlen(temp);
        if (len + tLen + 1 > cap) {
            cap *= 2;
            buf = (char*)realloc(buf, cap);
        }
        strcpy(buf + len, temp);
        len += tLen;
    }
    return buf;
}

char** splitInputs(const char* allInputs, int* count) {
    char** res = (char**)malloc(100 * sizeof(char*));
    int c = 0;
    int braceCount = 0, bracketCount = 0;
    bool inQuote = false;
    char* curr = (char*)malloc(strlen(allInputs) + 1);
    int currLen = 0;
    for (size_t i = 0; allInputs[i]; i++) {
        char ch = allInputs[i];
        if (ch == '"' && (i == 0 || allInputs[i-1] != '\\\\')) inQuote = !inQuote;
        else if (!inQuote) {
            if (ch == '{') braceCount++;
            else if (ch == '}') braceCount--;
            else if (ch == '[') bracketCount++;
            else if (ch == ']') bracketCount--;
        }
        if (ch == '\\n' && braceCount == 0 && bracketCount == 0 && !inQuote) {
            curr[currLen] = '\\0';
            char* trimmed = trim(curr);
            if (strlen(trimmed) > 0) {
                res[c] = (char*)malloc(strlen(trimmed) + 1);
                strcpy(res[c++], trimmed);
            }
            currLen = 0;
        } else {
            curr[currLen++] = ch;
        }
    }
    curr[currLen] = '\\0';
    char* trimmed = trim(curr);
    if (strlen(trimmed) > 0) {
        res[c] = (char*)malloc(strlen(trimmed) + 1);
        strcpy(res[c++], trimmed);
    }
    free(curr);
    *count = c;
    return res;
}

void removeQuotes(char* str) {
    size_t len = strlen(str);
    if (len >= 2 && str[0] == '"' && str[len-1] == '"') {
        memmove(str, str+1, len-2);
        str[len-2] = '\\0';
    }
}

int parseInt(const char* str) {
    char temp[1024]; strcpy(temp, str);
    return atoi(trim(temp));
}

double parseDouble(const char* str) {
    char temp[1024]; strcpy(temp, str);
    return atof(trim(temp));
}

bool parseBool(const char* str) {
    char temp[1024]; strcpy(temp, str);
    char* trimmed = trim(temp);
    return strcmp(trimmed, "true") == 0 || strcmp(trimmed, "1") == 0;
}

char* parseString(const char* str) {
    char* result = (char*)malloc(strlen(str) + 1);
    strcpy(result, str);
    removeQuotes(result);
    return result;
}

int* parseIntArray(const char* input, int* returnSize) {
    char* str = (char*)malloc(strlen(input) + 1);
    strcpy(str, input); str = trim(str);
    if (strcmp(str, "[]") == 0 || strlen(str) < 2) { *returnSize = 0; free(str); return NULL; }
    memmove(str, str+1, strlen(str)-1); str[strlen(str)-2] = '\\0';
    int count = 1; for (size_t i = 0; str[i]; i++) if (str[i] == ',' || str[i] == '\\n') count++;
    int* arr = (int*)malloc(count * sizeof(int)); *returnSize = 0;
    char* token = strtok(str, ",\\n"); int idx = 0;
    while (token != NULL && idx < count) { 
        char* t = trim(token);
        if(strlen(t) > 0) { arr[idx++] = parseInt(t); (*returnSize)++; }
        token = strtok(NULL, ",\\n"); 
    }
    free(str); return arr;
}

struct ListNode* parseLinkedList(const char* input) {
    int size; int* arr = parseIntArray(input, &size);
    if (size == 0 || arr == NULL) return NULL;
    struct ListNode* head = (struct ListNode*)malloc(sizeof(struct ListNode));
    head->val = arr[0]; head->next = NULL; head->random = NULL;
    struct ListNode* curr = head;
    for (int i = 1; i < size; i++) {
        curr->next = (struct ListNode*)malloc(sizeof(struct ListNode));
        curr = curr->next; curr->val = arr[i]; curr->next = NULL; curr->random = NULL;
    }
    free(arr); return head;
}

void printIntArray(int* arr, int size) {
    printf("[");
    for (int i = 0; i < size; i++) { printf("%d", arr[i]); if (i < size - 1) printf(","); }
    printf("]\\n");
}

void printLinkedList(struct ListNode* head) {
    printf("[");
    struct ListNode* curr = head;
    while(curr) {
        printf("%d", curr->val);
        if(curr->next) printf(",");
        curr = curr->next;
    }
    printf("]\\n");
}
`;

    const interactiveHelpers = isInteractive ? `
int _hiddenTarget = 0;
bool isBadVersion(int version) {
    return version >= _hiddenTarget;
}
int guess(int num) {
    if (num > _hiddenTarget) return -1;
    if (num < _hiddenTarget) return 1;
    return 0;
}
` : '';

    let mainCode = "";

    if (isDesign) {
        mainCode = `
    printf("[]\\n");
        `;
    } else {
        let reads = `
    char* allInputs = readAllStdin();
    int inputCount = 0;
    char** inputLines = splitInputs(allInputs, &inputCount);
        `;
        
        let callArgs = [];
        params.forEach((param, i) => {
            const type = cType(param.type || param.cType, param.name);
            reads += `    char* raw_${i} = inputCount > ${i} ? inputLines[${i}] : "";\n`;
            
            if(type === 'int') reads += `    int p${i} = parseInt(raw_${i});\n`;
            else if(type === 'double') reads += `    double p${i} = parseDouble(raw_${i});\n`;
            else if(type === 'bool') reads += `    bool p${i} = parseBool(raw_${i});\n`;
            else if(type === 'char*') reads += `    char* p${i} = parseString(raw_${i});\n`;
            else if(type === 'int*') reads += `    int p${i}_size; int* p${i} = parseIntArray(raw_${i}, &p${i}_size);\n`;
            else if(type === 'struct ListNode*') reads += `    struct ListNode* p${i} = parseLinkedList(raw_${i});\n`;
            else reads += `    char* p${i} = parseString(raw_${i});\n`; // fallback
            
            if(type === 'int*') callArgs.push(`p${i}`, `p${i}_size`);
            else callArgs.push(`p${i}`);
        });

        if (isInteractive) {
            reads += `    if (inputCount > ${params.length}) _hiddenTarget = parseInt(inputLines[inputCount-1]);\n`;
        }

        const argsStr = callArgs.join(', ');
        const cRetType = cType(returnType.type || returnType.cType, 'return');

        if(isVoidReturn) {
            const outType = cType(params[outputParamIndex]?.type, '');
            let printStmt = `printf("%d\\n", p${outputParamIndex});`;
            if(outType === 'int*') printStmt = `printIntArray(p${outputParamIndex}, p${outputParamIndex}_size);`;
            else if(outType === 'struct ListNode*') printStmt = `printLinkedList(p${outputParamIndex});`;
            
            mainCode = `
${reads}
    ${fn}(${argsStr});
    ${printStmt}
        `;
        } else {
            let callStr = ``;
            let printStmt = `printf("%d\\n", result);`;
            if(cRetType === 'int*') {
                callStr = `int retSize; int* result = ${fn}(${argsStr}, &retSize);`;
                printStmt = `printIntArray(result, retSize);`;
            } else if(cRetType === 'struct ListNode*') {
                callStr = `struct ListNode* result = ${fn}(${argsStr});`;
                printStmt = `printLinkedList(result);`;
            } else if(cRetType === 'bool') {
                callStr = `bool result = ${fn}(${argsStr});`;
                printStmt = `printf("%s\\n", result ? "true" : "false");`;
            } else {
                callStr = `${cRetType} result = ${fn}(${argsStr});`;
            }
            
            mainCode = `
${reads}
    ${callStr}
    ${printStmt}
        `;
        }
    }

    return `${headerCode}

${interactiveHelpers}
${userCode}

int main() {
${mainCode}
    return 0;
}
`;
};
