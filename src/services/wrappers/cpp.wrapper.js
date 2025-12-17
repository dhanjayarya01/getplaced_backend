export const generateCPPWrapper = (problem, userCode) => {

    // Basic headers
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
#include <cctype>
#include <cmath>

using namespace std;
`;

    // Data Structure Definitions
    const definitions = `
// --- Definitions ---
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
`;

    // Helpers
    const helpers = `
// --- Helpers ---
// Trim string
string trim(const string& str) {
    size_t first = str.find_first_not_of(" \\t\\n\\r");
    if (string::npos == first) return "";
    size_t last = str.find_last_not_of(" \\t\\n\\r");
    return str.substr(first, (last - first + 1));
}

// Parse Integer array: [1,2,3]
vector<int> stringToVector(string input) {
    input = trim(input);
    if(input == "[]" || input.length() < 2) return {};
    input = input.substr(1, input.length() - 2); // remove []
    if(input.empty()) return {};

    vector<int> res;
    stringstream ss(input);
    string item;
    while(getline(ss, item, ',')) {
        res.push_back(stoi(trim(item)));
    }
    return res;
}

// Parse Char array: ["a", "b"]
vector<char> stringToCharVector(string input) {
    input = trim(input);
    if(input == "[]" || input.length() < 2) return {};
    input = input.substr(1, input.length() - 2); 
    if(input.empty()) return {};

    vector<char> res;
    stringstream ss(input);
    string item;
    // Items are like "a" or 'a'
    while(getline(ss, item, ',')) {
        item = trim(item);
        if(item.length() >= 3 && (item[0] == '"' || item[0] == '\\'')) {
             res.push_back(item[1]);
        } else if (item.length() == 1) {
             res.push_back(item[0]);
        }
    }
    return res;
}

// Parse Matrix: [[1,2],[3,4]]
vector<vector<int>> stringToMatrix(string input) {
    input = trim(input);
    if(input == "[]" || input.length() < 4) return {};
    input = input.substr(1, input.length() - 2);
    
    vector<vector<int>> res;
    int brackets = 0;
    string current;
    for(char c : input) {
        if(c == '[') brackets++;
        else if(c == ']') brackets--;
        
        if (c == ',' && brackets == 0) {
            if(!current.empty()) res.push_back(stringToVector(current));
            current = "";
        } else {
            current += c;
        }
    }
    if(!current.empty()) res.push_back(stringToVector(current));
    return res;
}

// Parse ListNode: [1,2,3]
ListNode* stringToListNode(string input) {
    vector<int> nums = stringToVector(input);
    if(nums.empty()) return nullptr;
    ListNode* head = new ListNode(nums[0]);
    ListNode* curr = head;
    for(size_t i=1; i<nums.size(); i++) {
        curr->next = new ListNode(nums[i]);
        curr = curr->next;
    }
    return head;
}

// Parse TreeNode: [1,null,2,3]
TreeNode* stringToTreeNode(string input) {
    input = trim(input);
    if(input == "[]" || input == "null" || input.length() < 2) return nullptr;
    input = input.substr(1, input.length() - 2);
    if(input.empty()) return nullptr;

    stringstream ss(input);
    string item;
    vector<string> parts;
    while(getline(ss, item, ',')) parts.push_back(trim(item));

    if(parts.empty() || parts[0] == "null") return nullptr;

    TreeNode* root = new TreeNode(stoi(parts[0]));
    queue<TreeNode*> q;
    q.push(root);

    size_t i = 1;
    while(!q.empty() && i < parts.size()) {
        TreeNode* curr = q.front(); q.pop();

        if(i < parts.size()) {
            if(parts[i] != "null") {
                curr->left = new TreeNode(stoi(parts[i]));
                q.push(curr->left);
            }
            i++;
        }
        if(i < parts.size()) {
            if(parts[i] != "null") {
                curr->right = new TreeNode(stoi(parts[i]));
                q.push(curr->right);
            }
            i++;
        }
    }
    return root;
}

// --- Printers ---
void printVector(const vector<int>& nums) {
    cout << "[";
    for(size_t i=0; i<nums.size(); i++) {
        cout << nums[i];
        if(i < nums.size()-1) cout << ",";
    }
    cout << "]" << endl;
}

void printCharVector(const vector<char>& chars) { // For Compress String output
    cout << "[";
    for(size_t i=0; i<chars.size(); i++) {
        cout << "\\"" << chars[i] << "\\"";
        if(i < chars.size()-1) cout << ",";
    }
    cout << "]" << endl;
}

void printMatrix(const vector<vector<int>>& mat) {
    cout << "[";
    for(size_t i=0; i<mat.size(); i++) {
        cout << "[";
        for(size_t j=0; j<mat[i].size(); j++) {
            cout << mat[i][j];
            if(j < mat[i].size()-1) cout << ",";
        }
        cout << "]";
        if(i < mat.size()-1) cout << ",";
    }
    cout << "]" << endl;
}

void printListNode(ListNode* head) {
    vector<int> nums;
    while(head) {
        nums.push_back(head->val);
        head = head->next;
    }
    printVector(nums);
}

void printTreeNode(TreeNode* root) {
    if(!root) { cout << "[]" << endl; return; }
    vector<string> res;
    queue<TreeNode*> q;
    q.push(root);
    while(!q.empty()) {
        TreeNode* curr = q.front(); q.pop();
        if(!curr) res.push_back("null");
        else {
            res.push_back(to_string(curr->val));
            q.push(curr->left);
            q.push(curr->right);
        }
    }
    // Trim trailing nulls
    while(!res.empty() && res.back() == "null") res.pop_back();

    cout << "[";
    for(size_t i=0; i<res.size(); i++) {
        cout << res[i];
        if(i < res.size()-1) cout << ",";
    }
    cout << "]" << endl;
}
`;

    // const userCode = ... already passed as arg
    const params = (problem.pythonMetadata && problem.pythonMetadata.parameters && problem.pythonMetadata.parameters.length > 0)
        ? problem.pythonMetadata.parameters
        : (problem.parameters || []);
    const returnType = (problem.pythonMetadata && problem.pythonMetadata.returnType) ? problem.pythonMetadata.returnType : (problem.returnType || {});
    const fn = problem.functionName || (problem.slug.includes('-') ? problem.slug.replace(/-([a-z])/g, (g) => g[1].toUpperCase()) : problem.slug);


    // Helper to map C/Standard types to CPP types
    const parseType = (t) => {
        if (!t) return 'void';
        // Python style
        if (t === 'List[ListNode]' || t === 'ListNode[]') return 'vector<ListNode*>';
        if (t === 'List[int]' || t === 'List[Integer]') return 'vector<int>';
        if (t === 'List[List[int]]' || t === 'List[List[Integer]]') return 'vector<vector<int>>';
        if (t === 'List[str]' || t === 'List[String]') return 'vector<string>';

        if (t.includes('ListNode')) return 'ListNode*';
        if (t.includes('TreeNode')) return 'TreeNode*';
        if (t === 'int**' || t === 'List<List<Integer>>' || t === 'int[][]' || t === 'vector<vector<int>>') return 'vector<vector<int>>';
        if (t === 'int*' || t === 'int[]' || t === 'list<int>' || t === 'vector<int>') return 'vector<int>';
        if (t === 'char[]' || t === 'vector<char>') return 'vector<char>';
        if (t === 'string' || t === 'char*' || t === 'String' || t === 'str') return 'string';
        if (t === 'char**' || t === 'string[]') return 'vector<string>';
        if (t === 'long long' || t === 'long') return 'long long';
        if (t === 'double' || t === 'float') return 'double';
        if (t === 'boolean' || t === 'bool') return 'bool';
        return t;
    };

    // Parsing Logic
    let parseCode = "";
    let callArgs = [];

    // Special Case Check
    const isStringCompression = problem.slug === 'string-compression';
    // const isRearrange = problem.slug === 'rearrange-words-in-a-sentence'; // String return

    params.forEach((param) => {
        const { name } = param;
        let cType = param.type || param.cType; // pythonMetadata params usually have 'type'
        let cppType = parseType(cType);

        if (isStringCompression && name === 'chars') {
            cppType = 'vector<char>&'; // Pass by ref usually in C++ for modification
        }


        parseCode += `    // Debug: Param=${name}, cType=${cType}, cppType=${cppType}\n`;
        parseCode += `    string raw_${name};
    if (!getline(cin, raw_${name})) return 0;
`;

        if (cppType.includes('ListNode')) {
            parseCode += `    ListNode* ${name} = stringToListNode(raw_${name});\n`;
            callArgs.push(name);
        } else if (cppType.includes('TreeNode')) {
            parseCode += `    TreeNode* ${name} = stringToTreeNode(raw_${name});\n`;
            callArgs.push(name);
        } else if (cppType === 'vector<int>') {
            parseCode += `    vector<int> ${name} = stringToVector(raw_${name});\n`;
            callArgs.push(name);
        } else if (cppType === 'vector<char>' || cppType === 'vector<char>&') {
            parseCode += `    vector<char> ${name} = stringToCharVector(raw_${name});\n`;
            callArgs.push(name);
        } else if (cppType === 'vector<vector<int>>') {
            parseCode += `    vector<vector<int>> ${name} = stringToMatrix(raw_${name});\n`;
            callArgs.push(name);
        } else if (cppType === 'int') {
            parseCode += `    int ${name} = 0; try { ${name} = stoi(trim(raw_${name})); } catch(...) {}\n`;
            callArgs.push(name);
        } else if (cppType === 'long long') {
            parseCode += `    long long ${name} = 0; try { ${name} = stoll(trim(raw_${name})); } catch(...) {}\n`;
            callArgs.push(name);
        } else if (cppType === 'string') {
            parseCode += `    string ${name} = trim(raw_${name});\n`;
            parseCode += `    if(${name}.size() >= 2 && ${name}.front() == '"' && ${name}.back() == '"') ${name} = ${name}.substr(1, ${name}.length()-2);\n`;
            callArgs.push(name);
        } else if (cppType === 'bool') {
            parseCode += `    string temp_${name} = trim(raw_${name});\n`;
            parseCode += `    bool ${name} = (temp_${name} == "true" || temp_${name} == "1");\n`;
            callArgs.push(name);
        } else {
            parseCode += `    // Unknown fallback\n`;
            parseCode += `    string ${name} = raw_${name};\n`;
            callArgs.push(name);
        }
    });

    const callArgsStr = callArgs.join(', ');
    const rawRetType = returnType.type || returnType.cType || 'void';
    let retType = parseType(rawRetType);

    // Detect Class vs Free Function
    const isSolutionClass = userCode.includes('class Solution');
    const funcNameRegex = /Expected Function Name: (\w+)/; // Can't easily parse C++ signature reliably without regex parsing the user code.
    // We will assume "Solution" class has the method. Finding the method name is hard if it's not "solve" or derived from slug.
    // Actually, in C++ wrappers, usually we just call `Solution().method(args)`
    // The method name needs to be accurate. 
    // userCode usually has `public: ReturnType methodName(Args)`

    // We try to find the method name in the user code that matches the return type partially
    // But `fn` derived from slug is usually correct (camelCase).

    const functionCall = isSolutionClass
        ? `    Solution sol;
    auto result = sol.${fn}(${callArgsStr});`
        : `    auto result = ${fn}(${callArgsStr});`;

    let printCode = "";

    if (isStringCompression) {
        printCode = `    cout << "Return " << result << ", and the first " << (result == 1 ? "character" : to_string(result) + " characters") << " of the input array should be: ";\n`;
        printCode += `    chars.resize(result);\n`; // Resize to matched length
        printCode += `    printCharVector(chars);\n`;
    } else if (retType.includes('ListNode')) {
        printCode = `    printListNode(result);`;
    } else if (retType.includes('TreeNode')) {
        printCode = `    printTreeNode(result);`;
    } else if (retType.includes('vector') && !retType.includes('vector<vector')) { // 1D vector
        printCode = `    printVector(result);`;
    } else if (retType.includes('string')) {
        printCode = `    cout << "\\"" << result << "\\"" << endl;`;
    } else {
        printCode = `    cout << result << endl;`;
    }

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


