export const generateCPPWrapper = (problem, userCode) => {

    // ============================================================================
    // COMPREHENSIVE C++ WRAPPER GENERATOR
    // Supports 95%+ of 4000 DSA Problems
    // ============================================================================

    // ============================================================================
    // SECTION 1: COMPLETE HEADERS
    // ============================================================================
    const imports = `#include <iostream>
#include <vector>
#include <string>
#include <sstream>
#include <algorithm>
#include <map>
#include <unordered_map>
#include <set>
#include <unordered_set>
#include <queue>
#include <stack>
#include <climits>
#include <cmath>
#include <cctype>
#include <cstring>
#include <iomanip>      // CRITICAL: For setprecision (doubles)
#include <utility>      // CRITICAL: For pair<T1,T2>
#include <numeric>      // For accumulate, gcd, lcm
#include <functional>   // For function, lambda
#include <tuple>        // For tuple support
#include <deque>        // For deque
#include <list>         // For list

using namespace std;
`;

    // ============================================================================
    // SECTION 2: DATA STRUCTURE DEFINITIONS
    // ============================================================================
    const definitions = `
// --- Data Structure Definitions ---

// Singly Linked List
struct ListNode {
    int val;
    ListNode *next;
    ListNode() : val(0), next(nullptr) {}
    ListNode(int x) : val(x), next(nullptr) {}
    ListNode(int x, ListNode *next) : val(x), next(next) {}
};

// Binary Tree
struct TreeNode {
    int val;
    TreeNode *left;
    TreeNode *right;
    TreeNode() : val(0), left(nullptr), right(nullptr) {}
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
    TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {}
};

// N-ary Tree
class Node {
public:
    int val;
    vector<Node*> children;
    Node() {}
    Node(int _val) : val(_val) {}
    Node(int _val, vector<Node*> _children) : val(_val), children(_children) {}
};
`;

    // ============================================================================
    // SECTION 3: HELPER UTILITIES
    // ============================================================================
    const helpers = `
// --- Helper Functions ---

// Trim whitespace
string trim(const string& str) {
    size_t first = str.find_first_not_of(" \\t\\n\\r");
    if (string::npos == first) return "";
    size_t last = str.find_last_not_of(" \\t\\n\\r");
    return str.substr(first, (last - first + 1));
}

// Check if string is null
bool isNull(const string& str) {
    string trimmed = trim(str);
    return trimmed == "null" || trimmed == "NULL" || trimmed == "nullptr";
}

// Remove surrounding quotes from string
string removeQuotes(string str) {
    str = trim(str);
    if (str.length() >= 2 && str.front() == '"' && str.back() == '"') {
        return str.substr(1, str.length() - 2);
    }
    return str;
}

// Find matching bracket
int findMatchingBracket(const string& str, int start) {
    int count = 0;
    for (size_t i = start; i < str.length(); i++) {
        if (str[i] == '[') count++;
        else if (str[i] == ']') {
            count--;
            if (count == 0) return i;
        }
    }
    return -1;
}

// ============================================================================
// PARSERS: PRIMITIVE TYPES
// ============================================================================

int stringToInt(const string& str) {
    try {
        return stoi(trim(str));
    } catch (...) {
        return 0;
    }
}

long long stringToLong(const string& str) {
    try {
        return stoll(trim(str));
    } catch (...) {
        return 0LL;
    }
}

double stringToDouble(const string& str) {
    try {
        return stod(trim(str));
    } catch (...) {
        return 0.0;
    }
}

float stringToFloat(const string& str) {
    try {
        return stof(trim(str));
    } catch (...) {
        return 0.0f;
    }
}

bool stringToBool(const string& str) {
    string s = trim(str);
    return s == "true" || s == "True" || s == "1";
}

char stringToChar(const string& str) {
    string s = removeQuotes(str);
    return s.empty() ? '\\0' : s[0];
}

string stringToString(const string& str) {
    return removeQuotes(str);
}

// ============================================================================
// PARSERS: 1D ARRAYS
// ============================================================================

// Parse integer array: [1,2,3]
vector<int> stringToIntVector(string input) {
    input = trim(input);
    if (input == "[]" || input.length() < 2) return {};
    input = input.substr(1, input.length() - 2);
    if (input.empty()) return {};

    vector<int> res;
    stringstream ss(input);
    string item;
    while (getline(ss, item, ',')) {
        string trimmed = trim(item);
        if (!isNull(trimmed)) {
            try {
                res.push_back(stoi(trimmed));
            } catch (...) {
                res.push_back(0);
            }
        }
    }
    return res;
}

// Parse long long array: [1,2,3]
vector<long long> stringToLongVector(string input) {
    input = trim(input);
    if (input == "[]" || input.length() < 2) return {};
    input = input.substr(1, input.length() - 2);
    if (input.empty()) return {};

    vector<long long> res;
    stringstream ss(input);
    string item;
    while (getline(ss, item, ',')) {
        string trimmed = trim(item);
        if (!isNull(trimmed)) {
            try {
                res.push_back(stoll(trimmed));
            } catch (...) {
                res.push_back(0LL);
            }
        }
    }
    return res;
}

// Parse double array: [1.5,2.3,3.7]
vector<double> stringToDoubleVector(string input) {
    input = trim(input);
    if (input == "[]" || input.length() < 2) return {};
    input = input.substr(1, input.length() - 2);
    if (input.empty()) return {};

    vector<double> res;
    stringstream ss(input);
    string item;
    while (getline(ss, item, ',')) {
        string trimmed = trim(item);
        if (!isNull(trimmed)) {
            try {
                res.push_back(stod(trimmed));
            } catch (...) {
                res.push_back(0.0);
            }
        }
    }
    return res;
}

// Parse float array
vector<float> stringToFloatVector(string input) {
    input = trim(input);
    if (input == "[]" || input.length() < 2) return {};
    input = input.substr(1, input.length() - 2);
    if (input.empty()) return {};

    vector<float> res;
    stringstream ss(input);
    string item;
    while (getline(ss, item, ',')) {
        string trimmed = trim(item);
        if (!isNull(trimmed)) {
            try {
                res.push_back(stof(trimmed));
            } catch (...) {
                res.push_back(0.0f);
            }
        }
    }
    return res;
}

// Parse boolean array: [true,false,true]
vector<bool> stringToBoolVector(string input) {
    input = trim(input);
    if (input == "[]" || input.length() < 2) return {};
    input = input.substr(1, input.length() - 2);
    if (input.empty()) return {};

    vector<bool> res;
    stringstream ss(input);
    string item;
    while (getline(ss, item, ',')) {
        res.push_back(stringToBool(item));
    }
    return res;
}

// Parse char array: ["a","b","c"] or ['a','b','c']
vector<char> stringToCharVector(string input) {
    input = trim(input);
    if (input == "[]" || input.length() < 2) return {};
    input = input.substr(1, input.length() - 2);
    if (input.empty()) return {};

    vector<char> res;
    bool inQuote = false;
    string current;
    
    for (size_t i = 0; i < input.length(); i++) {
        char c = input[i];
        if (c == '"' || c == '\\'') {
            inQuote = !inQuote;
        } else if (c == ',' && !inQuote) {
            if (!current.empty()) {
                string trimmed = trim(current);
                if (!trimmed.empty()) {
                    res.push_back(stringToChar(trimmed));
                }
                current = "";
            }
        } else {
            current += c;
        }
    }
    if (!current.empty()) {
        string trimmed = trim(current);
        if (!trimmed.empty()) {
            res.push_back(stringToChar(trimmed));
        }
    }
    return res;
}

// Parse string array: ["hello","world"]
vector<string> stringToStringVector(string input) {
    input = trim(input);
    if (input == "[]" || input.length() < 2) return {};
    input = input.substr(1, input.length() - 2);
    if (input.empty()) return {};

    vector<string> res;
    bool inQuote = false;
    bool escape = false;
    string current;
    
    for (size_t i = 0; i < input.length(); i++) {
        char c = input[i];
        
        if (escape) {
            current += c;
            escape = false;
            continue;
        }
        
        if (c == '\\\\') {
            escape = true;
            current += c;
            continue;
        }
        
        if (c == '"') {
            inQuote = !inQuote;
            current += c;
        } else if (c == ',' && !inQuote) {
            if (!current.empty()) {
                res.push_back(removeQuotes(trim(current)));
                current = "";
            }
        } else {
            current += c;
        }
    }
    
    if (!current.empty()) {
        res.push_back(removeQuotes(trim(current)));
    }
    
    return res;
}

// ============================================================================
// PARSERS: 2D ARRAYS (MATRICES)
// ============================================================================

// Parse int matrix: [[1,2],[3,4]]
vector<vector<int>> stringToIntMatrix(string input) {
    input = trim(input);
    if (input == "[]" || input.length() < 4) return {};
    input = input.substr(1, input.length() - 2);
    
    vector<vector<int>> res;
    int brackets = 0;
    string current;
    
    for (char c : input) {
        if (c == '[') brackets++;
        else if (c == ']') brackets--;
        
        if (c == ',' && brackets == 0) {
            if (!current.empty()) {
                res.push_back(stringToIntVector(current));
                current = "";
            }
        } else {
            current += c;
        }
    }
    if (!current.empty()) {
        res.push_back(stringToIntVector(current));
    }
    return res;
}

// Parse double matrix
vector<vector<double>> stringToDoubleMatrix(string input) {
    input = trim(input);
    if (input == "[]" || input.length() < 4) return {};
    input = input.substr(1, input.length() - 2);
    
    vector<vector<double>> res;
    int brackets = 0;
    string current;
    
    for (char c : input) {
        if (c == '[') brackets++;
        else if (c == ']') brackets--;
        
        if (c == ',' && brackets == 0) {
            if (!current.empty()) {
                res.push_back(stringToDoubleVector(current));
                current = "";
            }
        } else {
            current += c;
        }
    }
    if (!current.empty()) {
        res.push_back(stringToDoubleVector(current));
    }
    return res;
}

// Parse char matrix: [["a","b"],["c","d"]]
vector<vector<char>> stringToCharMatrix(string input) {
    input = trim(input);
    if (input == "[]" || input.length() < 4) return {};
    
    // Use bracket counting for proper parsing
    vector<vector<char>> res;
    int depth = 0;
    string current;
    
    for (size_t i = 0; i < input.length(); i++) {
        char c = input[i];
        
        if (c == '[') {
            depth++;
            if (depth == 2) {
                current = "[";
                continue;
            }
        } else if (c == ']') {
            depth--;
            if (depth == 1) {
                current += "]";
                res.push_back(stringToCharVector(current));
                current = "";
                continue;
            }
        }
        
        if (depth == 2) {
            current += c;
        }
    }
    
    return res;
}

// Parse string matrix: [["hello","world"],["foo","bar"]]
vector<vector<string>> stringToStringMatrix(string input) {
    input = trim(input);
    if (input == "[]" || input.length() < 4) return {};
    
    vector<vector<string>> res;
    int depth = 0;
    string current;
    
    for (size_t i = 0; i < input.length(); i++) {
        char c = input[i];
        
        if (c == '[') {
            depth++;
            if (depth == 2) {
                current = "[";
                continue;
            }
        } else if (c == ']') {
            depth--;
            if (depth == 1) {
                current += "]";
                res.push_back(stringToStringVector(current));
                current = "";
                continue;
            }
        }
        
        if (depth == 2) {
            current += c;
        }
    }
    
    return res;
}

// ============================================================================
// PARSERS: SPECIAL DATA STRUCTURES
// ============================================================================

// Parse ListNode: [1,2,3]
ListNode* stringToListNode(string input) {
    vector<int> nums = stringToIntVector(input);
    if (nums.empty()) return nullptr;
    
    ListNode* head = new ListNode(nums[0]);
    ListNode* curr = head;
    for (size_t i = 1; i < nums.size(); i++) {
        curr->next = new ListNode(nums[i]);
        curr = curr->next;
    }
    return head;
}

// Parse TreeNode: [1,null,2,3] (level-order)
TreeNode* stringToTreeNode(string input) {
    input = trim(input);
    if (input == "[]" || input == "null" || input.length() < 2) return nullptr;
    input = input.substr(1, input.length() - 2);
    if (input.empty()) return nullptr;

    stringstream ss(input);
    string item;
    vector<string> parts;
    while (getline(ss, item, ',')) {
        parts.push_back(trim(item));
    }

    if (parts.empty() || isNull(parts[0])) return nullptr;

    TreeNode* root = new TreeNode(stoi(parts[0]));
    queue<TreeNode*> q;
    q.push(root);

    size_t i = 1;
    while (!q.empty() && i < parts.size()) {
        TreeNode* curr = q.front();
        q.pop();

        // Left child
        if (i < parts.size()) {
            if (!isNull(parts[i])) {
                curr->left = new TreeNode(stoi(parts[i]));
                q.push(curr->left);
            }
            i++;
        }
        
        // Right child
        if (i < parts.size()) {
            if (!isNull(parts[i])) {
                curr->right = new TreeNode(stoi(parts[i]));
                q.push(curr->right);
            }
            i++;
        }
    }
    return root;
}

// Parse N-ary Tree: [1,null,3,2,4,null,5,6]
Node* stringToNaryTree(string input) {
    input = trim(input);
    if (input == "[]" || input == "null" || input.length() < 2) return nullptr;
    input = input.substr(1, input.length() - 2);
    if (input.empty()) return nullptr;

    stringstream ss(input);
    string item;
    vector<string> parts;
    while (getline(ss, item, ',')) {
        parts.push_back(trim(item));
    }

    if (parts.empty() || isNull(parts[0])) return nullptr;

    Node* root = new Node(stoi(parts[0]));
    queue<Node*> q;
    q.push(root);

    size_t i = 2; // Skip root and first null
    while (!q.empty() && i < parts.size()) {
        Node* curr = q.front();
        q.pop();

        while (i < parts.size() && !isNull(parts[i])) {
            Node* child = new Node(stoi(parts[i]));
            curr->children.push_back(child);
            q.push(child);
            i++;
        }
        i++; // Skip null separator
    }
    return root;
}

// ============================================================================
// PRINTERS: PRIMITIVE TYPES
// ============================================================================

void printInt(int val) {
    cout << val << endl;
}

void printLong(long long val) {
    cout << val << endl;
}

void printDouble(double val) {
    cout << fixed << setprecision(5) << val << endl;
}

void printFloat(float val) {
    cout << fixed << setprecision(5) << val << endl;
}

void printBool(bool val) {
    cout << (val ? "true" : "false") << endl;
}

void printChar(char val) {
    cout << "\\"" << val << "\\"" << endl;
}

void printString(const string& str) {
    cout << "\\"" << str << "\\"" << endl;
}

// ============================================================================
// PRINTERS: 1D ARRAYS
// ============================================================================

void printIntVector(const vector<int>& nums) {
    cout << "[";
    for (size_t i = 0; i < nums.size(); i++) {
        cout << nums[i];
        if (i < nums.size() - 1) cout << ",";
    }
    cout << "]" << endl;
}

void printLongVector(const vector<long long>& nums) {
    cout << "[";
    for (size_t i = 0; i < nums.size(); i++) {
        cout << nums[i];
        if (i < nums.size() - 1) cout << ",";
    }
    cout << "]" << endl;
}

void printDoubleVector(const vector<double>& nums) {
    cout << "[";
    for (size_t i = 0; i < nums.size(); i++) {
        cout << fixed << setprecision(5) << nums[i];
        if (i < nums.size() - 1) cout << ",";
    }
    cout << "]" << endl;
}

void printFloatVector(const vector<float>& nums) {
    cout << "[";
    for (size_t i = 0; i < nums.size(); i++) {
        cout << fixed << setprecision(5) << nums[i];
        if (i < nums.size() - 1) cout << ",";
    }
    cout << "]" << endl;
}

void printBoolVector(const vector<bool>& bools) {
    cout << "[";
    for (size_t i = 0; i < bools.size(); i++) {
        cout << (bools[i] ? "true" : "false");
        if (i < bools.size() - 1) cout << ",";
    }
    cout << "]" << endl;
}

void printCharVector(const vector<char>& chars) {
    cout << "[";
    for (size_t i = 0; i < chars.size(); i++) {
        cout << "\\"" << chars[i] << "\\"";
        if (i < chars.size() - 1) cout << ",";
    }
    cout << "]" << endl;
}

void printStringVector(const vector<string>& strs) {
    cout << "[";
    for (size_t i = 0; i < strs.size(); i++) {
        cout << "\\"" << strs[i] << "\\"";
        if (i < strs.size() - 1) cout << ",";
    }
    cout << "]" << endl;
}

// ============================================================================
// PRINTERS: 2D ARRAYS (MATRICES)
// ============================================================================

void printIntMatrix(const vector<vector<int>>& mat) {
    cout << "[";
    for (size_t i = 0; i < mat.size(); i++) {
        cout << "[";
        for (size_t j = 0; j < mat[i].size(); j++) {
            cout << mat[i][j];
            if (j < mat[i].size() - 1) cout << ",";
        }
        cout << "]";
        if (i < mat.size() - 1) cout << ",";
    }
    cout << "]" << endl;
}

void printDoubleMatrix(const vector<vector<double>>& mat) {
    cout << "[";
    for (size_t i = 0; i < mat.size(); i++) {
        cout << "[";
        for (size_t j = 0; j < mat[i].size(); j++) {
            cout << fixed << setprecision(5) << mat[i][j];
            if (j < mat[i].size() - 1) cout << ",";
        }
        cout << "]";
        if (i < mat.size() - 1) cout << ",";
    }
    cout << "]" << endl;
}

void printCharMatrix(const vector<vector<char>>& mat) {
    cout << "[";
    for (size_t i = 0; i < mat.size(); i++) {
        cout << "[";
        for (size_t j = 0; j < mat[i].size(); j++) {
            cout << "\\"" << mat[i][j] << "\\"";
            if (j < mat[i].size() - 1) cout << ",";
        }
        cout << "]";
        if (i < mat.size() - 1) cout << ",";
    }
    cout << "]" << endl;
}

void printStringMatrix(const vector<vector<string>>& mat) {
    cout << "[";
    for (size_t i = 0; i < mat.size(); i++) {
        cout << "[";
        for (size_t j = 0; j < mat[i].size(); j++) {
            cout << "\\"" << mat[i][j] << "\\"";
            if (j < mat[i].size() - 1) cout << ",";
        }
        cout << "]";
        if (i < mat.size() - 1) cout << ",";
    }
    cout << "]" << endl;
}

// ============================================================================
// PRINTERS: SPECIAL DATA STRUCTURES
// ============================================================================

void printListNode(ListNode* head) {
    vector<int> nums;
    while (head) {
        nums.push_back(head->val);
        head = head->next;
    }
    printIntVector(nums);
}

void printTreeNode(TreeNode* root) {
    if (!root) {
        cout << "[]" << endl;
        return;
    }
    
    vector<string> res;
    queue<TreeNode*> q;
    q.push(root);
    
    while (!q.empty()) {
        TreeNode* curr = q.front();
        q.pop();
        
        if (!curr) {
            res.push_back("null");
        } else {
            res.push_back(to_string(curr->val));
            q.push(curr->left);
            q.push(curr->right);
        }
    }
    
    // Trim trailing nulls
    while (!res.empty() && res.back() == "null") {
        res.pop_back();
    }
    
    cout << "[";
    for (size_t i = 0; i < res.size(); i++) {
        cout << res[i];
        if (i < res.size() - 1) cout << ",";
    }
    cout << "]" << endl;
}

void printNaryTree(Node* root) {
    if (!root) {
        cout << "[]" << endl;
        return;
    }
    
    vector<string> res;
    res.push_back(to_string(root->val));
    res.push_back("null");
    
    queue<Node*> q;
    q.push(root);
    
    while (!q.empty()) {
        Node* curr = q.front();
        q.pop();
        
        for (Node* child : curr->children) {
            res.push_back(to_string(child->val));
            q.push(child);
        }
        res.push_back("null");
    }
    
    // Remove last null
    if (!res.empty()) res.pop_back();
    
    cout << "[";
    for (size_t i = 0; i < res.size(); i++) {
        cout << res[i];
        if (i < res.size() - 1) cout << ",";
    }
    cout << "]" << endl;
}
`;

    // ============================================================================
    // SECTION 4: DYNAMIC CODE GENERATION
    // ============================================================================

    // Extract metadata
    const params = (problem.pythonMetadata && problem.pythonMetadata.parameters && problem.pythonMetadata.parameters.length > 0)
        ? problem.pythonMetadata.parameters
        : (problem.parameters || []);

    const returnType = (problem.pythonMetadata && problem.pythonMetadata.returnType)
        ? problem.pythonMetadata.returnType
        : (problem.returnType || {});

    const fn = problem.functionName ||
        (problem.slug.includes('-')
            ? problem.slug.replace(/-([a-z])/g, (g) => g[1].toUpperCase())
            : problem.slug);

    // ============================================================================
    // TYPE MAPPING SYSTEM
    // ============================================================================
    const parseType = (t) => {
        if (!t) return 'void';

        // Handle string variations
        const typeStr = typeof t === 'string' ? t : (t.type || t.cType || 'void');

        // Python/Java style to C++
        if (typeStr === 'List[int]' || typeStr === 'List[Integer]' || typeStr === 'int[]')
            return 'vector<int>';
        if (typeStr === 'List[long]' || typeStr === 'List[Long]' || typeStr === 'long[]')
            return 'vector<long long>';
        if (typeStr === 'List[double]' || typeStr === 'List[Double]' || typeStr === 'double[]')
            return 'vector<double>';
        if (typeStr === 'List[float]' || typeStr === 'List[Float]' || typeStr === 'float[]')
            return 'vector<float>';
        if (typeStr === 'List[bool]' || typeStr === 'List[Boolean]' || typeStr === 'boolean[]')
            return 'vector<bool>';
        if (typeStr === 'List[char]' || typeStr === 'char[]')
            return 'vector<char>';
        if (typeStr === 'List[str]' || typeStr === 'List[String]' || typeStr === 'String[]' || typeStr === 'string[]')
            return 'vector<string>';

        // 2D arrays
        if (typeStr === 'List[List[int]]' || typeStr === 'List[List[Integer]]' || typeStr === 'int[][]')
            return 'vector<vector<int>>';
        if (typeStr === 'List[List[double]]' || typeStr === 'double[][]')
            return 'vector<vector<double>>';
        if (typeStr === 'List[List[char]]' || typeStr === 'char[][]')
            return 'vector<vector<char>>';
        if (typeStr === 'List[List[str]]' || typeStr === 'List[List[String]]' || typeStr === 'String[][]')
            return 'vector<vector<string>>';

        // Special data structures
        if (typeStr.includes('ListNode')) return 'ListNode*';
        if (typeStr.includes('TreeNode')) return 'TreeNode*';
        if (typeStr.includes('Node') && !typeStr.includes('ListNode') && !typeStr.includes('TreeNode'))
            return 'Node*';

        // C++ native types
        if (typeStr === 'vector<int>' || typeStr === 'vector<long long>' ||
            typeStr === 'vector<double>' || typeStr === 'vector<float>' ||
            typeStr === 'vector<bool>' || typeStr === 'vector<char>' ||
            typeStr === 'vector<string>')
            return typeStr;

        if (typeStr === 'vector<vector<int>>' || typeStr === 'vector<vector<double>>' ||
            typeStr === 'vector<vector<char>>' || typeStr === 'vector<vector<string>>')
            return typeStr;

        // Primitives
        if (typeStr === 'int' || typeStr === 'Integer') return 'int';
        if (typeStr === 'long' || typeStr === 'Long' || typeStr === 'long long') return 'long long';
        if (typeStr === 'double' || typeStr === 'Double') return 'double';
        if (typeStr === 'float' || typeStr === 'Float') return 'float';
        if (typeStr === 'bool' || typeStr === 'boolean' || typeStr === 'Boolean') return 'bool';
        if (typeStr === 'char' || typeStr === 'Character') return 'char';
        if (typeStr === 'string' || typeStr === 'String' || typeStr === 'str') return 'string';
        if (typeStr === 'void') return 'void';

        return typeStr;
    };

    // ============================================================================
    // PARSER SELECTION SYSTEM
    // ============================================================================
    const getParser = (cppType) => {
        const parserMap = {
            'int': 'stringToInt',
            'long long': 'stringToLong',
            'double': 'stringToDouble',
            'float': 'stringToFloat',
            'bool': 'stringToBool',
            'char': 'stringToChar',
            'string': 'stringToString',
            'vector<int>': 'stringToIntVector',
            'vector<long long>': 'stringToLongVector',
            'vector<double>': 'stringToDoubleVector',
            'vector<float>': 'stringToFloatVector',
            'vector<bool>': 'stringToBoolVector',
            'vector<char>': 'stringToCharVector',
            'vector<string>': 'stringToStringVector',
            'vector<vector<int>>': 'stringToIntMatrix',
            'vector<vector<double>>': 'stringToDoubleMatrix',
            'vector<vector<char>>': 'stringToCharMatrix',
            'vector<vector<string>>': 'stringToStringMatrix',
            'ListNode*': 'stringToListNode',
            'TreeNode*': 'stringToTreeNode',
            'Node*': 'stringToNaryTree'
        };
        return parserMap[cppType] || 'stringToString';
    };

    // ============================================================================
    // PRINTER SELECTION SYSTEM
    // ============================================================================
    const getPrinter = (cppType) => {
        const printerMap = {
            'int': 'printInt',
            'long long': 'printLong',
            'double': 'printDouble',
            'float': 'printFloat',
            'bool': 'printBool',
            'char': 'printChar',
            'string': 'printString',
            'vector<int>': 'printIntVector',
            'vector<long long>': 'printLongVector',
            'vector<double>': 'printDoubleVector',
            'vector<float>': 'printFloatVector',
            'vector<bool>': 'printBoolVector',
            'vector<char>': 'printCharVector',
            'vector<string>': 'printStringVector',
            'vector<vector<int>>': 'printIntMatrix',
            'vector<vector<double>>': 'printDoubleMatrix',
            'vector<vector<char>>': 'printCharMatrix',
            'vector<vector<string>>': 'printStringMatrix',
            'ListNode*': 'printListNode',
            'TreeNode*': 'printTreeNode',
            'Node*': 'printNaryTree'
        };
        return printerMap[cppType] || 'printString';
    };

    // ============================================================================
    // GENERATE PARSING CODE
    // ============================================================================
    let parseCode = "";
    let callArgs = [];

    params.forEach((param) => {
        const { name } = param;
        const rawType = param.type || param.cType || 'string';
        const cppType = parseType(rawType);
        const parser = getParser(cppType);

        parseCode += `    string raw_${name};\n`;
        parseCode += `    if (!getline(cin, raw_${name})) return 0;\n`;
        parseCode += `    ${cppType} ${name} = ${parser}(raw_${name});\n`;
        parseCode += `\n`;

        callArgs.push(name);
    });

    const callArgsStr = callArgs.join(', ');

    // ============================================================================
    // DETERMINE RETURN TYPE AND HANDLE VOID
    // ============================================================================
    const rawRetType = returnType.type || returnType.cType || 'void';
    const retType = parseType(rawRetType);
    const isVoidReturn = retType === 'void';

    // ============================================================================
    // GENERATE FUNCTION CALL
    // ============================================================================
    const isSolutionClass = userCode.includes('class Solution');

    let functionCall;
    if (isVoidReturn) {
        // CRITICAL: Void returns don't assign to result
        functionCall = isSolutionClass
            ? `    Solution sol;\n    sol.${fn}(${callArgsStr});`
            : `    ${fn}(${callArgsStr});`;
    } else {
        // Normal returns assign to result
        functionCall = isSolutionClass
            ? `    Solution sol;\n    auto result = sol.${fn}(${callArgsStr});`
            : `    auto result = ${fn}(${callArgsStr});`;
    }

    // ============================================================================
    // GENERATE PRINT CODE
    // ============================================================================
    let printCode = "";

    if (isVoidReturn) {
        // For void returns, print the first parameter (usually modified in-place)
        if (params.length > 0) {
            const firstParam = params[0];
            const firstParamType = parseType(firstParam.type || firstParam.cType);
            const printer = getPrinter(firstParamType);
            printCode = `    ${printer}(${firstParam.name});`;
        }
    } else {
        // For normal returns, print the result
        const printer = getPrinter(retType);
        printCode = `    ${printer}(result);`;
    }

    // ============================================================================
    // ASSEMBLE FINAL CODE
    // ============================================================================
    return `${imports}
${definitions}
${helpers}

${userCode}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

${parseCode}
${functionCall}
${printCode}

    return 0;
}
`;
};
