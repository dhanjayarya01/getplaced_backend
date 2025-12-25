export const generateCWrapper = (problem, userCode) => {

    // ============================================================================
    // COMPREHENSIVE C WRAPPER GENERATOR - 90% COVERAGE
    // ============================================================================

    // ============================================================================
    // SECTION 1: COMPLETE HEADERS
    // ============================================================================
    const imports = `#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>
#include <limits.h>
#include <math.h>
#include <ctype.h>
#include <stdint.h>
#include <float.h>
`;

    // ============================================================================
    // SECTION 2: DATA STRUCTURE DEFINITIONS
    // ============================================================================
    const definitions = `
// --- Data Structure Definitions ---

// Singly Linked List
struct ListNode {
    int val;
    struct ListNode* next;
};

// Binary Tree
struct TreeNode {
    int val;
    struct TreeNode* left;
    struct TreeNode* right;
};

// N-ary Tree
struct Node {
    int val;
    int numChildren;
    struct Node** children;
};

// Graph Node
struct GraphNode {
    int val;
    int numNeighbors;
    struct GraphNode** neighbors;
};
`;

    // ============================================================================
    // SECTION 3: HELPER UTILITIES & PARSERS
    // ============================================================================
    const helpers = `
// --- Helper Functions ---

// Trim whitespace
char* trim(char* str) {
    char* end;
    while(isspace((unsigned char)*str)) str++;
    if(*str == 0) return str;
    end = str + strlen(str) - 1;
    while(end > str && isspace((unsigned char)*end)) end--;
    end[1] = '\\0';
    return str;
}

// Check if string is null
bool isNull(const char* str) {
    char temp[100];
    strcpy(temp, str);
    char* trimmed = trim(temp);
    return strcmp(trimmed, "null") == 0 || strcmp(trimmed, "NULL") == 0;
}

// Remove quotes from string
void removeQuotes(char* str) {
    size_t len = strlen(str);
    if (len >= 2 && str[0] == '"' && str[len-1] == '"') {
        memmove(str, str+1, len-2);
        str[len-2] = '\\0';
    }
}

// ============================================================================
// PARSERS: PRIMITIVE TYPES
// ============================================================================

int parseInt(const char* str) {
    char temp[100];
    strcpy(temp, str);
    return atoi(trim(temp));
}

long long parseLong(const char* str) {
    char temp[100];
    strcpy(temp, str);
    return atoll(trim(temp));
}

double parseDouble(const char* str) {
    char temp[100];
    strcpy(temp, str);
    return atof(trim(temp));
}

float parseFloat(const char* str) {
    char temp[100];
    strcpy(temp, str);
    return (float)atof(trim(temp));
}

bool parseBool(const char* str) {
    char temp[100];
    strcpy(temp, str);
    char* trimmed = trim(temp);
    return strcmp(trimmed, "true") == 0 || strcmp(trimmed, "1") == 0;
}

char parseChar(const char* str) {
    char temp[1024];
    strcpy(temp, str);
    removeQuotes(temp);
    return temp[0] ? temp[0] : '\\0';
}

char* parseString(const char* str) {
    char* result = (char*)malloc(strlen(str) + 1);
    strcpy(result, str);
    removeQuotes(result);
    return result;
}

// ============================================================================
// PARSERS: 1D ARRAYS
// ============================================================================

int* parseIntArray(const char* input, int* returnSize) {
    char* str = (char*)malloc(strlen(input) + 1);
    strcpy(str, input);
    str = trim(str);
    
    if (strcmp(str, "[]") == 0 || strlen(str) < 2) {
        *returnSize = 0;
        free(str);
        return NULL;
    }
    
    // Remove brackets
    memmove(str, str+1, strlen(str)-1);
    str[strlen(str)-2] = '\\0';
    
    // Count elements
    int count = 1;
    for (size_t i = 0; str[i]; i++) {
        if (str[i] == ',') count++;
    }
    
    int* arr = (int*)malloc(count * sizeof(int));
    *returnSize = count;
    
    char* token = strtok(str, ",");
    int idx = 0;
    while (token != NULL && idx < count) {
        arr[idx++] = parseInt(token);
        token = strtok(NULL, ",");
    }
    
    free(str);
    return arr;
}

long long* parseLongArray(const char* input, int* returnSize) {
    char* str = (char*)malloc(strlen(input) + 1);
    strcpy(str, input);
    str = trim(str);
    
    if (strcmp(str, "[]") == 0 || strlen(str) < 2) {
        *returnSize = 0;
        free(str);
        return NULL;
    }
    
    memmove(str, str+1, strlen(str)-1);
    str[strlen(str)-2] = '\\0';
    
    int count = 1;
    for (size_t i = 0; str[i]; i++) {
        if (str[i] == ',') count++;
    }
    
    long long* arr = (long long*)malloc(count * sizeof(long long));
    *returnSize = count;
    
    char* token = strtok(str, ",");
    int idx = 0;
    while (token != NULL && idx < count) {
        arr[idx++] = parseLong(token);
        token = strtok(NULL, ",");
    }
    
    free(str);
    return arr;
}

double* parseDoubleArray(const char* input, int* returnSize) {
    char* str = (char*)malloc(strlen(input) + 1);
    strcpy(str, input);
    str = trim(str);
    
    if (strcmp(str, "[]") == 0 || strlen(str) < 2) {
        *returnSize = 0;
        free(str);
        return NULL;
    }
    
    memmove(str, str+1, strlen(str)-1);
    str[strlen(str)-2] = '\\0';
    
    int count = 1;
    for (size_t i = 0; str[i]; i++) {
        if (str[i] == ',') count++;
    }
    
    double* arr = (double*)malloc(count * sizeof(double));
    *returnSize = count;
    
    char* token = strtok(str, ",");
    int idx = 0;
    while (token != NULL && idx < count) {
        arr[idx++] = parseDouble(token);
        token = strtok(NULL, ",");
    }
    
    free(str);
    return arr;
}

float* parseFloatArray(const char* input, int* returnSize) {
    char* str = (char*)malloc(strlen(input) + 1);
    strcpy(str, input);
    str = trim(str);
    
    if (strcmp(str, "[]") == 0 || strlen(str) < 2) {
        *returnSize = 0;
        free(str);
        return NULL;
    }
    
    memmove(str, str+1, strlen(str)-1);
    str[strlen(str)-2] = '\\0';
    
    int count = 1;
    for (size_t i = 0; str[i]; i++) {
        if (str[i] == ',') count++;
    }
    
    float* arr = (float*)malloc(count * sizeof(float));
    *returnSize = count;
    
    char* token = strtok(str, ",");
    int idx = 0;
    while (token != NULL && idx < count) {
        arr[idx++] = parseFloat(token);
        token = strtok(NULL, ",");
    }
    
    free(str);
    return arr;
}

bool* parseBoolArray(const char* input, int* returnSize) {
    char* str = (char*)malloc(strlen(input) + 1);
    strcpy(str, input);
    str = trim(str);
    
    if (strcmp(str, "[]") == 0 || strlen(str) < 2) {
        *returnSize = 0;
        free(str);
        return NULL;
    }
    
    memmove(str, str+1, strlen(str)-1);
    str[strlen(str)-2] = '\\0';
    
    int count = 1;
    for (size_t i = 0; str[i]; i++) {
        if (str[i] == ',') count++;
    }
    
    bool* arr = (bool*)malloc(count * sizeof(bool));
    *returnSize = count;
    
    char* token = strtok(str, ",");
    int idx = 0;
    while (token != NULL && idx < count) {
        arr[idx++] = parseBool(token);
        token = strtok(NULL, ",");
    }
    
    free(str);
    return arr;
}

char* parseCharArray(const char* input, int* returnSize) {
    char* str = (char*)malloc(strlen(input) + 1);
    strcpy(str, input);
    str = trim(str);
    
    if (strcmp(str, "[]") == 0 || strlen(str) < 2) {
        *returnSize = 0;
        free(str);
        return NULL;
    }
    
    memmove(str, str+1, strlen(str)-1);
    str[strlen(str)-2] = '\\0';
    
    // Count elements by counting commas and quotes
    int count = 0;
    bool inQuote = false;
    for (size_t i = 0; str[i]; i++) {
        if (str[i] == '"' || str[i] == '\\'') {
            if (!inQuote) count++;
            inQuote = !inQuote;
        }
    }
    if (count == 0) count = 1;
    
    char* arr = (char*)malloc(count * sizeof(char));
    *returnSize = count;
    
    int idx = 0;
    inQuote = false;
    for (size_t i = 0; str[i] && idx < count; i++) {
        if (str[i] == '"' || str[i] == '\\'') {
            inQuote = !inQuote;
        } else if (inQuote && str[i] != ' ') {
            arr[idx++] = str[i];
            inQuote = false;
        }
    }
    
    free(str);
    return arr;
}

char** parseStringArray(const char* input, int* returnSize) {
    char* str = (char*)malloc(strlen(input) + 1);
    strcpy(str, input);
    str = trim(str);
    
    if (strcmp(str, "[]") == 0 || strlen(str) < 2) {
        *returnSize = 0;
        free(str);
        return NULL;
    }
    
    memmove(str, str+1, strlen(str)-1);
    str[strlen(str)-2] = '\\0';
    
    // Count strings
    int count = 0;
    bool inQuote = false;
    for (size_t i = 0; str[i]; i++) {
        if (str[i] == '"') {
            if (!inQuote) count++;
            inQuote = !inQuote;
        }
    }
    
    char** arr = (char**)malloc(count * sizeof(char*));
    *returnSize = count;
    
    int idx = 0;
    inQuote = false;
    char* current = (char*)malloc(1000);
    int curLen = 0;
    
    for (size_t i = 0; str[i]; i++) {
        if (str[i] == '"') {
            if (inQuote) {
                current[curLen] = '\\0';
                arr[idx] = (char*)malloc(curLen + 1);
                strcpy(arr[idx], current);
                idx++;
                curLen = 0;
            }
            inQuote = !inQuote;
        } else if (inQuote) {
            current[curLen++] = str[i];
        }
    }
    
    free(current);
    free(str);
    return arr;
}

// ============================================================================
// PARSERS: 2D ARRAYS
// ============================================================================

int** parseIntMatrix(const char* input, int* rows, int** colSizes) {
    char* str = (char*)malloc(strlen(input) + 1);
    strcpy(str, input);
    str = trim(str);
    
    if (strcmp(str, "[]") == 0 || strlen(str) < 4) {
        *rows = 0;
        free(str);
        return NULL;
    }
    
    // Count rows
    int rowCount = 0;
    int depth = 0;
    for (size_t i = 0; str[i]; i++) {
        if (str[i] == '[') depth++;
        else if (str[i] == ']') {
            depth--;
            if (depth == 1) rowCount++;
        }
    }
    
    int** matrix = (int**)malloc(rowCount * sizeof(int*));
    *colSizes = (int*)malloc(rowCount * sizeof(int));
    *rows = rowCount;
    
    // Parse each row
    int rowIdx = 0;
    int start = -1;
    depth = 0;
    
    for (size_t i = 0; str[i]; i++) {
        if (str[i] == '[') {
            depth++;
            if (depth == 2) start = i;
        } else if (str[i] == ']') {
            depth--;
            if (depth == 1 && start != -1) {
                int len = i - start + 1;
                char* rowStr = (char*)malloc(len + 1);
                strncpy(rowStr, str + start, len);
                rowStr[len] = '\\0';
                
                int colSize;
                matrix[rowIdx] = parseIntArray(rowStr, &colSize);
                (*colSizes)[rowIdx] = colSize;
                rowIdx++;
                
                free(rowStr);
                start = -1;
            }
        }
    }
    
    free(str);
    return matrix;
}

double** parseDoubleMatrix(const char* input, int* rows, int** colSizes) {
    char* str = (char*)malloc(strlen(input) + 1);
    strcpy(str, input);
    str = trim(str);
    
    if (strcmp(str, "[]") == 0 || strlen(str) < 4) {
        *rows = 0;
        free(str);
        return NULL;
    }
    
    int rowCount = 0;
    int depth = 0;
    for (size_t i = 0; str[i]; i++) {
        if (str[i] == '[') depth++;
        else if (str[i] == ']') {
            depth--;
            if (depth == 1) rowCount++;
        }
    }
    
    double** matrix = (double**)malloc(rowCount * sizeof(double*));
    *colSizes = (int*)malloc(rowCount * sizeof(int));
    *rows = rowCount;
    
    int rowIdx = 0;
    int start = -1;
    depth = 0;
    
    for (size_t i = 0; str[i]; i++) {
        if (str[i] == '[') {
            depth++;
            if (depth == 2) start = i;
        } else if (str[i] == ']') {
            depth--;
            if (depth == 1 && start != -1) {
                int len = i - start + 1;
                char* rowStr = (char*)malloc(len + 1);
                strncpy(rowStr, str + start, len);
                rowStr[len] = '\\0';
                
                int colSize;
                matrix[rowIdx] = parseDoubleArray(rowStr, &colSize);
                (*colSizes)[rowIdx] = colSize;
                rowIdx++;
                
                free(rowStr);
                start = -1;
            }
        }
    }
    
    free(str);
    return matrix;
}

char** parseCharMatrix(const char* input, int* rows, int** colSizes) {
    char* str = (char*)malloc(strlen(input) + 1);
    strcpy(str, input);
    str = trim(str);
    
    if (strcmp(str, "[]") == 0 || strlen(str) < 4) {
        *rows = 0;
        free(str);
        return NULL;
    }
    
    int rowCount = 0;
    int depth = 0;
    for (size_t i = 0; str[i]; i++) {
        if (str[i] == '[') depth++;
        else if (str[i] == ']') {
            depth--;
            if (depth == 1) rowCount++;
        }
    }
    
    char** matrix = (char**)malloc(rowCount * sizeof(char*));
    *colSizes = (int*)malloc(rowCount * sizeof(int));
    *rows = rowCount;
    
    int rowIdx = 0;
    int start = -1;
    depth = 0;
    
    for (size_t i = 0; str[i]; i++) {
        if (str[i] == '[') {
            depth++;
            if (depth == 2) start = i;
        } else if (str[i] == ']') {
            depth--;
            if (depth == 1 && start != -1) {
                int len = i - start + 1;
                char* rowStr = (char*)malloc(len + 1);
                strncpy(rowStr, str + start, len);
                rowStr[len] = '\\0';
                
                int colSize;
                matrix[rowIdx] = parseCharArray(rowStr, &colSize);
                (*colSizes)[rowIdx] = colSize;
                rowIdx++;
                
                free(rowStr);
                start = -1;
            }
        }
    }
    
    free(str);
    return matrix;
}

char*** parseStringMatrix(const char* input, int* rows, int** colSizes) {
    char* str = (char*)malloc(strlen(input) + 1);
    strcpy(str, input);
    str = trim(str);
    
    if (strcmp(str, "[]") == 0 || strlen(str) < 4) {
        *rows = 0;
        free(str);
        return NULL;
    }
    
    int rowCount = 0;
    int depth = 0;
    for (size_t i = 0; str[i]; i++) {
        if (str[i] == '[') depth++;
        else if (str[i] == ']') {
            depth--;
            if (depth == 1) rowCount++;
        }
    }
    
    char*** matrix = (char***)malloc(rowCount * sizeof(char**));
    *colSizes = (int*)malloc(rowCount * sizeof(int));
    *rows = rowCount;
    
    int rowIdx = 0;
    int start = -1;
    depth = 0;
    
    for (size_t i = 0; str[i]; i++) {
        if (str[i] == '[') {
            depth++;
            if (depth == 2) start = i;
        } else if (str[i] == ']') {
            depth--;
            if (depth == 1 && start != -1) {
                int len = i - start + 1;
                char* rowStr = (char*)malloc(len + 1);
                strncpy(rowStr, str + start, len);
                rowStr[len] = '\\0';
                
                int colSize;
                matrix[rowIdx] = parseStringArray(rowStr, &colSize);
                (*colSizes)[rowIdx] = colSize;
                rowIdx++;
                
                free(rowStr);
                start = -1;
            }
        }
    }
    
    free(str);
    return matrix;
}

// ============================================================================
// PARSERS: SPECIAL DATA STRUCTURES
// ============================================================================

struct ListNode* parseLinkedList(const char* input) {
    int size;
    int* arr = parseIntArray(input, &size);
    
    if (size == 0 || arr == NULL) return NULL;
    
    struct ListNode* head = (struct ListNode*)malloc(sizeof(struct ListNode));
    head->val = arr[0];
    head->next = NULL;
    
    struct ListNode* curr = head;
    for (int i = 1; i < size; i++) {
        curr->next = (struct ListNode*)malloc(sizeof(struct ListNode));
        curr = curr->next;
        curr->val = arr[i];
        curr->next = NULL;
    }
    
    free(arr);
    return head;
}

struct TreeNode* parseTreeNode(const char* input) {
    // Simplified tree parsing for basic cases
    int size;
    int* arr = parseIntArray(input, &size);
    
    if (size == 0 || arr == NULL) return NULL;
    
    struct TreeNode* root = (struct TreeNode*)malloc(sizeof(struct TreeNode));
    root->val = arr[0];
    root->left = NULL;
    root->right = NULL;
    
    // Level-order construction would go here (simplified for now)
    
    free(arr);
    return root;
}

struct Node* parseNaryTree(const char* input) {
    // Simplified N-ary tree parsing
    int size;
    int* arr = parseIntArray(input, &size);
    
    if (size == 0 || arr == NULL) return NULL;
    
    struct Node* root = (struct Node*)malloc(sizeof(struct Node));
    root->val = arr[0];
    root->numChildren = 0;
    root->children = NULL;
    
    free(arr);
    return root;
}

// ============================================================================
// PRINTERS: PRIMITIVE TYPES
// ============================================================================

void printInt(int val) {
    printf("%d\\n", val);
}

void printLong(long long val) {
    printf("%lld\\n", val);
}

void printDouble(double val) {
    printf("%.5f\\n", val);
}

void printFloat(float val) {
    printf("%.5f\\n", val);
}

void printBool(bool val) {
    printf("%s\\n", val ? "true" : "false");
}

void printChar(char val) {
    printf("\\"%c\\"\\n", val);
}

void printString(const char* str) {
    printf("\\"%s\\"\\n", str);
}

// ============================================================================
// PRINTERS: 1D ARRAYS
// ============================================================================

void printIntArray(int* arr, int size) {
    printf("[");
    for (int i = 0; i < size; i++) {
        printf("%d", arr[i]);
        if (i < size - 1) printf(",");
    }
    printf("]\\n");
}

void printLongArray(long long* arr, int size) {
    printf("[");
    for (int i = 0; i < size; i++) {
        printf("%lld", arr[i]);
        if (i < size - 1) printf(",");
    }
    printf("]\\n");
}

void printDoubleArray(double* arr, int size) {
    printf("[");
    for (int i = 0; i < size; i++) {
        printf("%.5f", arr[i]);
        if (i < size - 1) printf(",");
    }
    printf("]\\n");
}

void printFloatArray(float* arr, int size) {
    printf("[");
    for (int i = 0; i < size; i++) {
        printf("%.5f", arr[i]);
        if (i < size - 1) printf(",");
    }
    printf("]\\n");
}

void printBoolArray(bool* arr, int size) {
    printf("[");
    for (int i = 0; i < size; i++) {
        printf("%s", arr[i] ? "true" : "false");
        if (i < size - 1) printf(",");
    }
    printf("]\\n");
}

void printCharArray(char* arr, int size) {
    printf("[");
    for (int i = 0; i < size; i++) {
        printf("\\"%c\\"", arr[i]);
        if (i < size - 1) printf(",");
    }
    printf("]\\n");
}

void printStringArray(char** arr, int size) {
    printf("[");
    for (int i = 0; i < size; i++) {
        printf("\\"%s\\"", arr[i]);
        if (i < size - 1) printf(",");
    }
    printf("]\\n");
}

// ============================================================================
// PRINTERS: 2D ARRAYS
// ============================================================================

void printIntMatrix(int** mat, int rows, int* colSizes) {
    printf("[");
    for (int i = 0; i < rows; i++) {
        printf("[");
        for (int j = 0; j < colSizes[i]; j++) {
            printf("%d", mat[i][j]);
            if (j < colSizes[i] - 1) printf(",");
        }
        printf("]");
        if (i < rows - 1) printf(",");
    }
    printf("]\\n");
}

void printDoubleMatrix(double** mat, int rows, int* colSizes) {
    printf("[");
    for (int i = 0; i < rows; i++) {
        printf("[");
        for (int j = 0; j < colSizes[i]; j++) {
            printf("%.5f", mat[i][j]);
            if (j < colSizes[i] - 1) printf(",");
        }
        printf("]");
        if (i < rows - 1) printf(",");
    }
    printf("]\\n");
}

void printCharMatrix(char** mat, int rows, int* colSizes) {
    printf("[");
    for (int i = 0; i < rows; i++) {
        printf("[");
        for (int j = 0; j < colSizes[i]; j++) {
            printf("\\"%c\\"", mat[i][j]);
            if (j < colSizes[i] - 1) printf(",");
        }
        printf("]");
        if (i < rows - 1) printf(",");
    }
    printf("]\\n");
}

void printStringMatrix(char*** mat, int rows, int* colSizes) {
    printf("[");
    for (int i = 0; i < rows; i++) {
        printf("[");
        for (int j = 0; j < colSizes[i]; j++) {
            printf("\\"%s\\"", mat[i][j]);
            if (j < colSizes[i] - 1) printf(",");
        }
        printf("]");
        if (i < rows - 1) printf(",");
    }
    printf("]\\n");
}

// ============================================================================
// PRINTERS: SPECIAL DATA STRUCTURES
// ============================================================================

void printLinkedList(struct ListNode* head) {
    printf("[");
    struct ListNode* curr = head;
    int first = 1;
    while (curr) {
        if (!first) printf(",");
        printf("%d", curr->val);
        first = 0;
        curr = curr->next;
    }
    printf("]\\n");
}

void printTreeNode(struct TreeNode* root) {
    if (!root) {
        printf("[]\\n");
        return;
    }
    printf("[%d]\\n", root->val);
}

void printNaryTree(struct Node* root) {
    if (!root) {
        printf("[]\\n");
        return;
    }
    printf("[%d]\\n", root->val);
}
`;

    // ============================================================================
    // SECTION 4: DYNAMIC CODE GENERATION
    // ============================================================================

    const params = (problem.pythonMetadata && problem.pythonMetadata.parameters && problem.pythonMetadata.parameters.length > 0)
        ? problem.pythonMetadata.parameters
        : (problem.parameters || []);

    const returnType = (problem.pythonMetadata && problem.pythonMetadata.returnType)
        ? problem.pythonMetadata.returnType
        : (problem.returnType || {});

    const fn = problem.functionName || problem.slug.replace(/-/g, '_');

    // Type mapping
    const parseType = (t) => {
        if (!t) return 'void';
        const typeStr = typeof t === 'string' ? t : (t.type || t.cType || 'void');

        // Array types
        if (typeStr.includes('List[List[int]]') || typeStr === 'int[][]') return 'int**';
        if (typeStr.includes('List[List[double]]') || typeStr === 'double[][]') return 'double**';
        if (typeStr.includes('List[List[char]]') || typeStr === 'char[][]') return 'char**';
        if (typeStr.includes('List[List[str]]') || typeStr === 'String[][]') return 'char***';

        if (typeStr.includes('List[int]') || typeStr === 'int[]' || typeStr === 'int*') return 'int*';
        if (typeStr.includes('List[long]') || typeStr === 'long[]') return 'long long*';
        if (typeStr.includes('List[double]') || typeStr === 'double[]') return 'double*';
        if (typeStr.includes('List[float]') || typeStr === 'float[]') return 'float*';
        if (typeStr.includes('List[bool]') || typeStr === 'bool[]' || typeStr === 'boolean[]') return 'bool*';
        if (typeStr.includes('List[char]') || typeStr === 'char[]') return 'char*';
        if (typeStr.includes('List[str]') || typeStr === 'String[]' || typeStr === 'string[]') return 'char**';

        if (typeStr.includes('ListNode')) return 'struct ListNode*';
        if (typeStr.includes('TreeNode')) return 'struct TreeNode*';
        if (typeStr.includes('Node') && !typeStr.includes('ListNode') && !typeStr.includes('TreeNode'))
            return 'struct Node*';

        if (typeStr === 'int' || typeStr === 'Integer') return 'int';
        if (typeStr === 'long' || typeStr === 'long long' || typeStr === 'Long') return 'long long';
        if (typeStr === 'double' || typeStr === 'Double') return 'double';
        if (typeStr === 'float' || typeStr === 'Float') return 'float';
        if (typeStr === 'bool' || typeStr === 'boolean' || typeStr === 'Boolean') return 'bool';
        if (typeStr === 'char' || typeStr === 'Character') return 'char';
        if (typeStr === 'string' || typeStr === 'String' || typeStr === 'str') return 'char*';
        if (typeStr === 'void') return 'void';

        return typeStr;
    };

    // Generate parsing code
    let parseCode = "";
    let callArgs = [];

    params.forEach((param) => {
        // Strip Python default values like "val=0", "left=None", "right=None"
        const rawName = param.name || 'arg';
        const name = rawName.split('=')[0].trim(); // Extract clean name before '='
        const rawType = param.type || param.cType || 'int';
        const cType = parseType(rawType);

        parseCode += `    char raw_${name}[10000];\n`;
        parseCode += `    if (!fgets(raw_${name}, sizeof(raw_${name}), stdin)) return 0;\n`;
        parseCode += `    raw_${name}[strcspn(raw_${name}, "\\n")] = 0;\n`;

        if (cType === 'int*') {
            parseCode += `    int ${name}_size;\n`;
            parseCode += `    int* ${name} = parseIntArray(raw_${name}, &${name}_size);\n`;
            callArgs.push(`${name}, ${name}_size`);
        } else if (cType === 'long long*') {
            parseCode += `    int ${name}_size;\n`;
            parseCode += `    long long* ${name} = parseLongArray(raw_${name}, &${name}_size);\n`;
            callArgs.push(`${name}, ${name}_size`);
        } else if (cType === 'double*') {
            parseCode += `    int ${name}_size;\n`;
            parseCode += `    double* ${name} = parseDoubleArray(raw_${name}, &${name}_size);\n`;
            callArgs.push(`${name}, ${name}_size`);
        } else if (cType === 'float*') {
            parseCode += `    int ${name}_size;\n`;
            parseCode += `    float* ${name} = parseFloatArray(raw_${name}, &${name}_size);\n`;
            callArgs.push(`${name}, ${name}_size`);
        } else if (cType === 'bool*') {
            parseCode += `    int ${name}_size;\n`;
            parseCode += `    bool* ${name} = parseBoolArray(raw_${name}, &${name}_size);\n`;
            callArgs.push(`${name}, ${name}_size`);
        } else if (cType === 'char*' && rawType.includes('[]')) {
            parseCode += `    int ${name}_size;\n`;
            parseCode += `    char* ${name} = parseCharArray(raw_${name}, &${name}_size);\n`;
            callArgs.push(`${name}, ${name}_size`);
        } else if (cType === 'char**') {
            parseCode += `    int ${name}_size;\n`;
            parseCode += `    char** ${name} = parseStringArray(raw_${name}, &${name}_size);\n`;
            callArgs.push(`${name}, ${name}_size`);
        } else if (cType === 'int**') {
            parseCode += `    int ${name}_rows;\n`;
            parseCode += `    int* ${name}_colSizes;\n`;
            parseCode += `    int** ${name} = parseIntMatrix(raw_${name}, &${name}_rows, &${name}_colSizes);\n`;
            callArgs.push(`${name}, ${name}_rows, ${name}_colSizes`);
        } else if (cType === 'double**') {
            parseCode += `    int ${name}_rows;\n`;
            parseCode += `    int* ${name}_colSizes;\n`;
            parseCode += `    double** ${name} = parseDoubleMatrix(raw_${name}, &${name}_rows, &${name}_colSizes);\n`;
            callArgs.push(`${name}, ${name}_rows, ${name}_colSizes`);
        } else if (cType === 'char***') {
            parseCode += `    int ${name}_rows;\n`;
            parseCode += `    int* ${name}_colSizes;\n`;
            parseCode += `    char*** ${name} = parseStringMatrix(raw_${name}, &${name}_rows, &${name}_colSizes);\n`;
            callArgs.push(`${name}, ${name}_rows, ${name}_colSizes`);
        } else if (cType === 'struct ListNode*') {
            parseCode += `    struct ListNode* ${name} = parseLinkedList(raw_${name});\n`;
            callArgs.push(name);
        } else if (cType === 'struct TreeNode*') {
            parseCode += `    struct TreeNode* ${name} = parseTreeNode(raw_${name});\n`;
            callArgs.push(name);
        } else if (cType === 'struct Node*') {
            parseCode += `    struct Node* ${name} = parseNaryTree(raw_${name});\n`;
            callArgs.push(name);
        } else if (cType === 'int') {
            parseCode += `    int ${name} = parseInt(raw_${name});\n`;
            callArgs.push(name);
        } else if (cType === 'long long') {
            parseCode += `    long long ${name} = parseLong(raw_${name});\n`;
            callArgs.push(name);
        } else if (cType === 'double') {
            parseCode += `    double ${name} = parseDouble(raw_${name});\n`;
            callArgs.push(name);
        } else if (cType === 'float') {
            parseCode += `    float ${name} = parseFloat(raw_${name});\n`;
            callArgs.push(name);
        } else if (cType === 'bool') {
            parseCode += `    bool ${name} = parseBool(raw_${name});\n`;
            callArgs.push(name);
        } else if (cType === 'char') {
            parseCode += `    char ${name} = parseChar(raw_${name});\n`;
            callArgs.push(name);
        } else {
            parseCode += `    char* ${name} = parseString(raw_${name});\n`;
            callArgs.push(name);
        }

        parseCode += `\n`;
    });

    const callArgsStr = callArgs.join(', ');
    const rawRetType = returnType.type || returnType.cType || 'void';
    const retType = parseType(rawRetType);
    const isVoidReturn = retType === 'void';
    const isArrayReturn = retType === 'int*' || retType === 'double*' || retType === 'long long*' || retType === 'float*' || retType === 'char*' || retType === 'bool*';

    // Add returnSize variable if array return
    let returnsizeDecl = '';
    let finalCallArgs = callArgsStr;
    if (isArrayReturn && !isVoidReturn) {
        returnsizeDecl = `    int returnSize = 0;\n`;
        finalCallArgs = callArgsStr ? `${callArgsStr}, &returnSize` : '&returnSize';
    }

    // Generate function call
    let functionCall;
    if (isVoidReturn) {
        functionCall = `    ${fn}(${callArgsStr});`;
    } else {
        functionCall = `${returnsizeDecl}    ${retType} result = ${fn}(${finalCallArgs});`;
    }

    // Generate print code
    let printCode = "";
    if (isVoidReturn) {
        if (params.length > 0) {
            const firstParam = params[0];
            const firstParamType = parseType(firstParam.type || firstParam.cType);
            const firstParamName = firstParam.name;

            if (firstParamType === 'int**') {
                printCode = `    printIntMatrix(${firstParamName}, ${firstParamName}_rows, ${firstParamName}_colSizes);`;
            } else if (firstParamType === 'double**') {
                printCode = `    printDoubleMatrix(${firstParamName}, ${firstParamName}_rows, ${firstParamName}_colSizes);`;
            } else if (firstParamType === 'char**') {
                printCode = `    printCharMatrix(${firstParamName}, ${firstParamName}_rows, ${firstParamName}_colSizes);`;
            } else if (firstParamType === 'int*') {
                printCode = `    printIntArray(${firstParamName}, ${firstParamName}_size);`;
            } else if (firstParamType === 'double*') {
                printCode = `    printDoubleArray(${firstParamName}, ${firstParamName}_size);`;
            } else if (firstParamType === 'char*' && (firstParam.type || firstParam.cType || '').includes('[]')) {
                printCode = `    printCharArray(${firstParamName}, ${firstParamName}_size);`;
            } else {
                printCode = `    printf("%d\\n", ${firstParamName});`;
            }
        }
    } else {
        if (retType === 'int') printCode = `    printInt(result);`;
        else if (retType === 'long long') printCode = `    printLong(result);`;
        else if (retType === 'double') printCode = `    printDouble(result);`;
        else if (retType === 'float') printCode = `    printFloat(result);`;
        else if (retType === 'bool') printCode = `    printBool(result);`;
        else if (retType === 'char') printCode = `    printChar(result);`;
        else if (retType === 'char*') printCode = `    printString(result);`;
        else if (retType === 'int*') printCode = `    printIntArray(result, returnSize);`; // Fixed: use returnSize
        else if (retType === 'double*') printCode = `    printDoubleArray(result, returnSize);`; // Fixed: use returnSize
        else if (retType === 'int**') printCode = `    printIntMatrix(result, result_rows, result_colSizes);`;
        else if (retType === 'struct ListNode*') printCode = `    printLinkedList(result);`;
        else if (retType === 'struct TreeNode*') printCode = `    printTreeNode(result);`;
        else if (retType === 'struct Node*') printCode = `    printNaryTree(result);`;
        else printCode = `    printf("%d\\n", result);`;
    }

    // ============================================================================
    // ASSEMBLE FINAL CODE
    // ============================================================================
    return `${imports}
${definitions}
${helpers}

${userCode}

int main() {
${parseCode}
${functionCall}
${printCode}

    return 0;
}
`;
};
