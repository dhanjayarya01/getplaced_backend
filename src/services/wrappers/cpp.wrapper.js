/**
 * COMPREHENSIVE C++ WRAPPER GENERATOR
 * Supports Interactive, Void Returns, Random Pointers, Intervals.
 * Uses Regex AST to extract perfect signatures from user code, bypassing DB metadata.
 */
export const generateCPPWrapper = (problem, userCode) => {

    const metadata = problem.cppMetadata || problem.metaData || {};
    let fn = metadata.functionName || metadata.name || problem.functionName;
    const isDesign = problem.problemType === 'design';
    const isInteractive = problem.problemType === 'interactive';
    const outputParamIndex = metadata.outputParamIndex !== undefined ? metadata.outputParamIndex : 0;

    let params = [];
    let returnType = {};

    // 🚀 SMART SIGNATURE EXTRACTOR: Ignore broken DB metadata
    if (!isDesign) {
        let signatureMatch = userCode.match(/public:\s*([a-zA-Z0-9_*<>\s:]+?)\s+(\w+)\s*\((.*?)\)\s*\{/);
        if (!signatureMatch) {
            signatureMatch = userCode.match(/([a-zA-Z0-9_*<>\s:]+?)\s+(\w+)\s*\((.*?)\)\s*\{/);
        }
        if (signatureMatch) {
            returnType.type = signatureMatch[1].trim();
            fn = signatureMatch[2].trim();
            const paramsStr = signatureMatch[3].trim();
            if (paramsStr) {
                let pList = [];
                let bCount = 0;
                let current = "";
                for(let i=0; i<paramsStr.length; i++){
                    let c = paramsStr[i];
                    if(c === '<') bCount++;
                    else if(c === '>') bCount--;
                    else if(c === ',' && bCount === 0) {
                        pList.push(current.trim());
                        current = "";
                        continue;
                    }
                    current += c;
                }
                if(current.trim().length > 0) pList.push(current.trim());

                params = pList.map((p) => {
                    const parts = p.split(/\s+/);
                    let name = parts.pop().replace(/[&*]/g, '');
                    let type = parts.join(' ').replace(/&/g, '').trim();
                    return { name, type };
                });
            } else {
                params = [];
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

    const cppType = (cType, paramName) => {
        if (!cType) return 'int';
        let typeStr = typeof cType === 'string' ? cType : (cType.type || cType.cType || 'int');

        if (typeStr.includes('Interval')) return 'vector<Interval>';
        if (typeStr.includes('Point')) return 'vector<Point>';

        if (typeStr.includes('ListNode**')) return 'vector<ListNode*>';
        if (typeStr.includes('ListNode')) return 'ListNode*';
        if (typeStr.includes('TreeNode')) return 'TreeNode*';
        if (typeStr.includes('GraphNode')) return 'GraphNode*';
        if (typeStr.includes('Node') && !typeStr.includes('ListNode') && !typeStr.includes('TreeNode') && !typeStr.includes('GraphNode')) return 'Node*';

        if (typeStr.includes('vector<vector<int>>') || typeStr === 'int[][]') return 'vector<vector<int>>';
        if (typeStr.includes('vector<vector<string>>') || typeStr === 'String[][]') return 'vector<vector<string>>';
        if (typeStr.includes('vector<vector<char>>') || typeStr === 'char[][]') return 'vector<vector<char>>';

        if (typeStr.includes('vector<int>') || typeStr === 'int[]') return 'vector<int>';
        if (typeStr.includes('vector<double>') || typeStr === 'double[]') return 'vector<double>';
        if (typeStr.includes('vector<string>') || typeStr === 'String[]') return 'vector<string>';
        if (typeStr.includes('vector<char>') || typeStr === 'char[]') return 'vector<char>';
        if (typeStr.includes('vector<bool>') || typeStr === 'boolean[]') return 'vector<bool>';

        if (typeStr === 'int' || typeStr === 'Integer') return 'int';
        if (typeStr === 'long' || typeStr === 'long long') return 'long long';
        if (typeStr === 'double' || typeStr === 'Double' || typeStr === 'float') return 'double';
        if (typeStr === 'bool' || typeStr === 'boolean') return 'bool';
        if (typeStr === 'char' || typeStr === 'Character') return 'char';
        if (typeStr === 'string' || typeStr === 'String') return 'string';
        if (typeStr === 'void' || typeStr === 'None') return 'void';

        return typeStr; 
    };

    const isVoidReturn = cppType(returnType.type || returnType.cType, 'return') === 'void';

    const headerCode = `#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
#include <map>
#include <set>
#include <unordered_map>
#include <unordered_set>
#include <queue>
#include <stack>
#include <cmath>
#include <sstream>

using namespace std;

// ============================================================================
// DATA STRUCTURE DEFINITIONS
// ============================================================================

struct ListNode {
    int val;
    ListNode *next;
    ListNode *random;
    ListNode() : val(0), next(nullptr), random(nullptr) {}
    ListNode(int x) : val(x), next(nullptr), random(nullptr) {}
    ListNode(int x, ListNode *next) : val(x), next(next), random(nullptr) {}
};

struct TreeNode {
    int val;
    TreeNode *left;
    TreeNode *right;
    TreeNode() : val(0), left(nullptr), right(nullptr) {}
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
    TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {}
};

class Node {
public:
    int val;
    vector<Node*> children;
    Node() {}
    Node(int _val) { val = _val; }
    Node(int _val, vector<Node*> _children) { val = _val; children = _children; }
};

class GraphNode {
public:
    int val;
    vector<GraphNode*> neighbors;
    GraphNode() { val = 0; }
    GraphNode(int _val) { val = _val; }
    GraphNode(int _val, vector<GraphNode*> _neighbors) { val = _val; neighbors = _neighbors; }
};

class Interval {
public:
    int start, end;
    Interval(int start, int end) { this->start = start; this->end = end; }
};

class Point {
public:
    int x, y;
    Point() : x(0), y(0) {}
    Point(int a, int b) : x(a), y(b) {}
};

// ============================================================================
// JSON PARSER HELPERS
// ============================================================================
class Helper {
public:
    static string trim(const string& str) {
        size_t first = str.find_first_not_of(" \\t\\n\\r");
        if (string::npos == first) return "";
        size_t last = str.find_last_not_of(" \\t\\n\\r");
        return str.substr(first, (last - first + 1));
    }

    static vector<string> splitInputs(const string& allInputs) {
        vector<string> res;
        int braceCount = 0, bracketCount = 0;
        bool inQuote = false;
        string curr = "";
        for (size_t i = 0; i < allInputs.length(); i++) {
            char c = allInputs[i];
            if (c == '"' && (i == 0 || allInputs[i-1] != '\\\\')) inQuote = !inQuote;
            else if (!inQuote) {
                if (c == '{') braceCount++;
                else if (c == '}') braceCount--;
                else if (c == '[') bracketCount++;
                else if (c == ']') bracketCount--;
            }
            if (c == '\\n' && braceCount == 0 && bracketCount == 0 && !inQuote) {
                string trimmed = trim(curr);
                if (!trimmed.empty()) res.push_back(trimmed);
                curr = "";
            } else {
                curr += c;
            }
        }
        string trimmed = trim(curr);
        if (!trimmed.empty()) res.push_back(trimmed);
        return res;
    }

    static vector<string> parseArray(string s) {
        s = trim(s);
        if(s.length() < 2) return {};
        s = s.substr(1, s.length() - 2);
        if(s.empty()) return {};
        vector<string> res;
        int braceCount = 0;
        int bracketCount = 0;
        bool inQuote = false;
        size_t start = 0;
        for (size_t i = 0; i < s.length(); i++) {
            char c = s[i];
            if (c == '"' && (i == 0 || s[i-1] != '\\\\')) inQuote = !inQuote;
            else if (!inQuote) {
                if (c == '{') braceCount++;
                else if (c == '}') braceCount--;
                else if (c == '[') bracketCount++;
                else if (c == ']') bracketCount--;
                else if ((c == ',' || c == '\\n') && braceCount == 0 && bracketCount == 0) {
                    string token = trim(s.substr(start, i - start));
                    if(!token.empty()) res.push_back(token);
                    start = i + 1;
                }
            }
        }
        string lastToken = trim(s.substr(start));
        if(!lastToken.empty()) res.push_back(lastToken);
        return res;
    }

    static string stripQuotes(string s) {
        s = trim(s);
        if (s.length() >= 2 && s.front() == '"' && s.back() == '"') return s.substr(1, s.length()-2);
        return s;
    }

    static int toInt(string s) { return stoi(trim(s)); }
    static long long toLong(string s) { return stoll(trim(s)); }
    static double toDouble(string s) { return stod(trim(s)); }
    static bool toBool(string s) { return trim(s) == "true"; }

    static vector<int> toIntArray(string s) {
        vector<string> arr = parseArray(s);
        vector<int> res;
        for(auto& x : arr) res.push_back(toInt(x));
        return res;
    }

    static vector<vector<int>> toInt2DArray(string s) {
        vector<string> arr = parseArray(s);
        vector<vector<int>> res;
        for(auto& x : arr) res.push_back(toIntArray(x));
        return res;
    }

    static vector<string> toStringArray(string s) {
        vector<string> arr = parseArray(s);
        vector<string> res;
        for(auto& x : arr) res.push_back(stripQuotes(x));
        return res;
    }

    static ListNode* toLinkedList(string s) {
        if(s == "[]") return nullptr;
        vector<string> arr = parseArray(s);
        if(arr.empty()) return nullptr;

        if(arr[0].find("[") != string::npos) {
            vector<ListNode*> nodes;
            for(size_t i=0; i<arr.size(); i++) {
                vector<string> pair = parseArray(arr[i]);
                nodes.push_back(new ListNode(toInt(pair[0])));
                if(i > 0) nodes[i-1]->next = nodes[i];
            }
            for(size_t i=0; i<arr.size(); i++) {
                vector<string> pair = parseArray(arr[i]);
                if(pair[1] != "null") nodes[i]->random = nodes[toInt(pair[1])];
            }
            return nodes[0];
        }

        ListNode* head = new ListNode(toInt(arr[0]));
        ListNode* curr = head;
        for(size_t i=1; i<arr.size(); i++) {
            curr->next = new ListNode(toInt(arr[i]));
            curr = curr->next;
        }
        return head;
    }

    static vector<ListNode*> toLinkedListArray(string s) {
        vector<string> arr = parseArray(s);
        vector<ListNode*> res;
        for(auto& x : arr) res.push_back(toLinkedList(x));
        return res;
    }

    static TreeNode* toBinaryTree(string s) {
        if(s == "[]") return nullptr;
        vector<string> arr = parseArray(s);
        if(arr.empty() || arr[0] == "null") return nullptr;
        TreeNode* root = new TreeNode(toInt(arr[0]));
        queue<TreeNode*> q;
        q.push(root);
        size_t i = 1;
        while(!q.empty() && i < arr.size()) {
            TreeNode* curr = q.front(); q.pop();
            if(i < arr.size() && arr[i] != "null") {
                curr->left = new TreeNode(toInt(arr[i]));
                q.push(curr->left);
            }
            i++;
            if(i < arr.size() && arr[i] != "null") {
                curr->right = new TreeNode(toInt(arr[i]));
                q.push(curr->right);
            }
            i++;
        }
        return root;
    }

    static string serialize(ListNode* head) {
        if(!head) return "[]";
        bool isRandom = false;
        unordered_map<ListNode*, int> map;
        int idx = 0;
        ListNode* temp = head;
        while(temp) {
            map[temp] = idx++;
            if(temp->random) isRandom = true;
            temp = temp->next;
        }
        string res = "[";
        ListNode* curr = head;
        while(curr) {
            if(res.length() > 1) res += ",";
            if(isRandom) {
                res += "[" + to_string(curr->val) + ",";
                res += curr->random ? to_string(map[curr->random]) : "null";
                res += "]";
            } else {
                res += to_string(curr->val);
            }
            curr = curr->next;
        }
        res += "]";
        return res;
    }

    static string serialize(TreeNode* root) {
        if(!root) return "[]";
        vector<string> res;
        queue<TreeNode*> q;
        q.push(root);
        while(!q.empty()) {
            TreeNode* curr = q.front(); q.pop();
            if(curr) {
                res.push_back(to_string(curr->val));
                q.push(curr->left);
                q.push(curr->right);
            } else {
                res.push_back("null");
            }
        }
        while(!res.empty() && res.back() == "null") res.pop_back();
        string out = "[";
        for(size_t i=0; i<res.size(); i++) {
            if(i > 0) out += ",";
            out += res[i];
        }
        out += "]";
        return out;
    }

    static string serialize(int val) { return to_string(val); }
    static string serialize(double val) { return to_string(val); }
    static string serialize(bool val) { return val ? "true" : "false"; }
    static string serialize(string val) { return "\\"" + val + "\\""; }
    
    template<typename T>
    static string serialize(vector<T> arr) {
        string res = "[";
        for(size_t i=0; i<arr.size(); i++) {
            if(i > 0) res += ",";
            res += serialize(arr[i]);
        }
        res += "]";
        return res;
    }
};
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
    string allInputs = "";
    string line;
    while(getline(cin, line)) { allInputs += line + "\\n"; }
    vector<string> inputLines = Helper::splitInputs(allInputs);
    if(inputLines.size() < 2) return 0;
    
    vector<string> commands = Helper::toStringArray(inputLines[0]);
    vector<string> allArgsStr = Helper::parseArray(inputLines[1]);
    
    cout << "[]\\n"; // Dynamic dispatch not supported natively in C++ AST
        `;
    } else {
        let reads = `    string allInputs = "";
    string line;
    while(getline(cin, line)) { allInputs += line + "\\n"; }
    vector<string> inputLines = Helper::splitInputs(allInputs);\n`;
        
        let callArgs = [];
        params.forEach((param, i) => {
            const cppTypeMapped = cppType(param.type || param.cType, param.name);
            reads += `    string raw_${i} = inputLines.size() > ${i} ? inputLines[${i}] : "";\n`;
            
            if(cppTypeMapped === 'int') reads += `    int p${i} = Helper::toInt(raw_${i});\n`;
            else if(cppTypeMapped === 'double') reads += `    double p${i} = Helper::toDouble(raw_${i});\n`;
            else if(cppTypeMapped === 'bool') reads += `    bool p${i} = Helper::toBool(raw_${i});\n`;
            else if(cppTypeMapped === 'string') reads += `    string p${i} = Helper::stripQuotes(raw_${i});\n`;
            else if(cppTypeMapped === 'vector<int>') reads += `    vector<int> p${i} = Helper::toIntArray(raw_${i});\n`;
            else if(cppTypeMapped === 'vector<vector<int>>') reads += `    vector<vector<int>> p${i} = Helper::toInt2DArray(raw_${i});\n`;
            else if(cppTypeMapped === 'vector<string>') reads += `    vector<string> p${i} = Helper::toStringArray(raw_${i});\n`;
            else if(cppTypeMapped === 'ListNode*') reads += `    ListNode* p${i} = Helper::toLinkedList(raw_${i});\n`;
            else if(cppTypeMapped === 'vector<ListNode*>') reads += `    vector<ListNode*> p${i} = Helper::toLinkedListArray(raw_${i});\n`;
            else if(cppTypeMapped === 'TreeNode*') reads += `    TreeNode* p${i} = Helper::toBinaryTree(raw_${i});\n`;
            else reads += `    string p${i} = raw_${i};\n`; // fallback
            callArgs.push(`p${i}`);
        });

        if (isInteractive) {
            reads += `    if(inputLines.size() > ${params.length}) _hiddenTarget = Helper::toInt(inputLines.back());\n`;
        }

        const argsStr = callArgs.join(', ');
        const isSolutionObj = userCode.includes('class Solution');

        if(isVoidReturn) {
            mainCode = `
${reads}
    ${isSolutionObj ? `Solution sol;\n    sol.${fn}(${argsStr});` : `${fn}(${argsStr});`}
    cout << Helper::serialize(p${outputParamIndex}) << "\\n";
        `;
        } else {
            mainCode = `
${reads}
    auto result = ${isSolutionObj ? `Solution().${fn}(${argsStr})` : `${fn}(${argsStr})`};
    cout << Helper::serialize(result) << "\\n";
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
