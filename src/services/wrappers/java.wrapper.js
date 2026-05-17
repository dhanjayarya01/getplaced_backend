/**
 * COMPREHENSIVE JAVA WRAPPER GENERATOR
 * Uses Regex AST to extract perfect signatures from user code, ignoring broken DB metadata.
 * Uses a bracket-aware splitter to handle multiline JSON testcases flawlessly.
 */
export const generateJavaWrapper = (problem, userCode) => {

    const metadata = problem.javaMetadata || problem.metaData || {};
    let fn = metadata.functionName || metadata.name || problem.functionName;
    let isDesign = problem.problemType === 'design';
    const isInteractive = problem.problemType === 'interactive';
    const outputParamIndex = metadata.outputParamIndex !== undefined ? metadata.outputParamIndex : 0;

    // Auto-detect design problems: if user code defines a class other than Solution/known data structures
    const BUILTIN_CLASSES = new Set(['Solution','ListNode','TreeNode','Node','GraphNode','Interval','Point']);
    const classNames = [...userCode.matchAll(/^class\s+(\w+)/gm)].map(m => m[1]);
    if (!isDesign && !isInteractive && classNames.some(c => !BUILTIN_CLASSES.has(c))) {
        isDesign = true;
    }

    let params = [];
    let returnType = {};

    // 🚀 SMART SIGNATURE EXTRACTOR: Ignore broken DB metadata and parse the user's code directly!
    if (!isDesign) {
        const signatureMatch = userCode.match(/public\s+(?:static\s+)?([a-zA-Z0-9_<>[\]]+)\s+(\w+)\s*\((.*?)\)/);
        if (signatureMatch) {
            returnType.type = signatureMatch[1];
            fn = signatureMatch[2];
            const paramsStr = signatureMatch[3].trim();
            if (paramsStr) {
                // Split by comma (ignoring commas inside nested generic brackets if any, though rare in inputs)
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
                    const name = parts.pop();
                    const type = parts.join(' ');
                    return { name, type };
                });
            }
        } else {
            // Fallback to metadata if no matching method found
            params = (metadata.parameters && metadata.parameters.length > 0) ? metadata.parameters : (problem.parameters || []);
            returnType = (metadata.returnType && metadata.returnType.type) ? metadata.returnType : (metadata.return && metadata.return.type) ? metadata.return : (problem.returnType || {});
        }
    } else {
        // Design problems have no single signature
        params = (metadata.parameters && metadata.parameters.length > 0) ? metadata.parameters : (problem.parameters || []);
        returnType = (metadata.returnType && metadata.returnType.type) ? metadata.returnType : (metadata.return && metadata.return.type) ? metadata.return : (problem.returnType || {});
    }

    if (!fn && !isDesign) return userCode;

    const javaType = (cType, paramName) => {
        if (!cType) return 'int';
        let typeStr = typeof cType === 'string' ? cType : (cType.type || cType.cType || 'int');

        if (typeStr.includes('Interval')) return 'Interval[]';
        if (typeStr.includes('Point')) return 'Point[]';

        if (typeStr.includes('ListNode[]') || typeStr.includes('ListNode**')) return 'ListNode[]';
        if (typeStr.includes('ListNode')) return 'ListNode';
        if (typeStr.includes('TreeNode[]') || typeStr.includes('TreeNode**')) return 'TreeNode[]';
        if (typeStr.includes('TreeNode')) return 'TreeNode';
        if (typeStr.includes('GraphNode[]') || typeStr.includes('GraphNode**')) return 'GraphNode[]';
        if (typeStr.includes('GraphNode')) return 'GraphNode';
        if (typeStr.includes('Node[]') || typeStr.includes('Node**')) return 'Node[]';
        if (typeStr.includes('Node') && !typeStr.includes('ListNode') && !typeStr.includes('TreeNode') && !typeStr.includes('GraphNode')) return 'Node';

        if (typeStr.includes('vector<vector<int>>') || typeStr === 'int[][]' || typeStr === 'List<List<Integer>>') return 'int[][]';
        if (typeStr.includes('vector<vector<string>>') || typeStr === 'String[][]' || typeStr === 'List<List<String>>') return 'String[][]';
        if (typeStr.includes('vector<vector<char>>') || typeStr === 'char[][]' || typeStr === 'List<List<Character>>') return 'char[][]';
        
        if (typeStr.includes('vector<long>') || typeStr === 'long[]' || typeStr === 'List<Long>') return 'long[]';
        if (typeStr.includes('vector<int>') || typeStr === 'int[]' || typeStr === 'List<Integer>') return 'int[]';
        if (typeStr.includes('vector<double>') || typeStr === 'double[]' || typeStr === 'List<Double>') return 'double[]';
        if (typeStr.includes('vector<string>') || typeStr === 'String[]' || typeStr === 'List<String>') return 'String[]';
        if (typeStr.includes('vector<char>') || typeStr === 'char[]' || typeStr === 'List<Character>') return 'char[]';
        if (typeStr.includes('vector<boolean>') || typeStr === 'boolean[]' || typeStr === 'List<Boolean>') return 'boolean[]';

        if (typeStr === 'long' || typeStr === 'Long' || typeStr === 'long long') return 'long';
        if (typeStr === 'int' || typeStr === 'Integer') return 'int';
        if (typeStr === 'double' || typeStr === 'Double') return 'double';
        if (typeStr === 'float' || typeStr === 'Float') return 'float';
        if (typeStr === 'boolean' || typeStr === 'Boolean' || typeStr === 'bool') return 'boolean';
        if (typeStr === 'char' || typeStr === 'Character') return 'char';
        if (typeStr === 'String' || typeStr === 'string' || typeStr === 'str') return 'String';
        if (typeStr === 'void' || typeStr === 'None') return 'void';

        return typeStr;
    };

    const isVoidReturn = javaType(returnType.type || returnType.cType, 'return') === 'void';

    const headerCode = `import java.util.*;
import java.io.*;
import java.lang.reflect.*;
import java.util.regex.*;

// ============================================================================
// DATA STRUCTURE DEFINITIONS
// ============================================================================

class ListNode {
    int val;
    ListNode next;
    ListNode random;
    ListNode() {}
    ListNode(int val) { this.val = val; }
    ListNode(int val, ListNode next) { this.val = val; this.next = next; }
}

class TreeNode {
    int val;
    TreeNode left;
    TreeNode right;
    TreeNode() {}
    TreeNode(int val) { this.val = val; }
    TreeNode(int val, TreeNode left, TreeNode right) {
        this.val = val;
        this.left = left;
        this.right = right;
    }
}

class Node {
    public int val;
    public List<Node> children;
    public Node() {}
    public Node(int _val) { val = _val; children = new ArrayList<>(); }
    public Node(int _val, List<Node> _children) { val = _val; children = _children; }
}

class GraphNode {
    public int val;
    public List<GraphNode> neighbors;
    public GraphNode() { val = 0; neighbors = new ArrayList<>(); }
    public GraphNode(int _val) { val = _val; neighbors = new ArrayList<>(); }
    public GraphNode(int _val, ArrayList<GraphNode> _neighbors) { val = _val; neighbors = _neighbors; }
}

class Interval {
    int start;
    int end;
    Interval() { start = 0; end = 0; }
    Interval(int s, int e) { start = s; end = e; }
}

class Point {
    int x;
    int y;
    Point() { x = 0; y = 0; }
    Point(int a, int b) { x = a; y = b; }
}

// ============================================================================
// JSON PARSER HELPERS
// ============================================================================
class Helper {
    // Robust Multiline Input Splitter
    public static List<String> splitInputs(String allInputs) {
        List<String> res = new ArrayList<>();
        int braceCount = 0, bracketCount = 0;
        boolean inQuote = false;
        StringBuilder curr = new StringBuilder();
        for (int i = 0; i < allInputs.length(); i++) {
            char c = allInputs.charAt(i);
            if (c == '"' && (i == 0 || allInputs.charAt(i-1) != '\\\\')) inQuote = !inQuote;
            else if (!inQuote) {
                if (c == '{') braceCount++;
                else if (c == '}') braceCount--;
                else if (c == '[') bracketCount++;
                else if (c == ']') bracketCount--;
            }
            
            if (c == '\\n' && braceCount == 0 && bracketCount == 0 && !inQuote) {
                if(curr.toString().trim().length() > 0) res.add(curr.toString().trim());
                curr.setLength(0);
            } else {
                curr.append(c);
            }
        }
        if(curr.toString().trim().length() > 0) res.add(curr.toString().trim());
        return res;
    }

    public static String[] parseArray(String s) {
        s = s.trim();
        if (s.length() < 2) return new String[0];
        s = s.substring(1, s.length() - 1);
        if (s.isEmpty()) return new String[0];
        List<String> res = new ArrayList<>();
        int braceCount = 0;
        int bracketCount = 0;
        boolean inQuote = false;
        int start = 0;
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c == '"' && (i == 0 || s.charAt(i-1) != '\\\\')) inQuote = !inQuote;
            else if (!inQuote) {
                if (c == '{') braceCount++;
                else if (c == '}') braceCount--;
                else if (c == '[') bracketCount++;
                else if (c == ']') bracketCount--;
                else if ((c == ',' || c == '\\n') && braceCount == 0 && bracketCount == 0) {
                    String token = s.substring(start, i).trim();
                    if(token.length() > 0) res.add(token);
                    start = i + 1;
                }
            }
        }
        String lastToken = s.substring(start).trim();
        if(lastToken.length() > 0) res.add(lastToken);
        return res.toArray(new String[0]);
    }
    
    public static String stripQuotes(String s) {
        s = s.trim();
        if (s.length() >= 2 && s.startsWith("\\"") && s.endsWith("\\"")) return s.substring(1, s.length()-1);
        return s;
    }
    
    public static int toInt(String s) { return Integer.parseInt(s.trim()); }
    public static double toDouble(String s) { return Double.parseDouble(s.trim()); }
    public static boolean toBoolean(String s) { return Boolean.parseBoolean(s.trim()); }
    
    public static int[] toIntArray(String s) {
        String[] arr = parseArray(s);
        int[] res = new int[arr.length];
        for(int i=0; i<arr.length; i++) res[i] = toInt(arr[i]);
        return res;
    }
    
    public static int[][] toInt2DArray(String s) {
        String[] arr = parseArray(s);
        int[][] res = new int[arr.length][];
        for(int i=0; i<arr.length; i++) res[i] = toIntArray(arr[i]);
        return res;
    }
    
    public static String[] toStringArray(String s) {
        String[] arr = parseArray(s);
        String[] res = new String[arr.length];
        for(int i=0; i<arr.length; i++) res[i] = stripQuotes(arr[i]);
        return res;
    }
    
    public static ListNode toLinkedList(String s) {
        if(s.equals("[]")) return null;
        String[] arr = parseArray(s);
        if(arr.length == 0) return null;
        
        if(arr[0].startsWith("[")) {
            ListNode[] nodes = new ListNode[arr.length];
            for(int i=0; i<arr.length; i++) {
                String[] pair = parseArray(arr[i]);
                nodes[i] = new ListNode(toInt(pair[0]));
                if(i > 0) nodes[i-1].next = nodes[i];
            }
            for(int i=0; i<arr.length; i++) {
                String[] pair = parseArray(arr[i]);
                if(!pair[1].equals("null")) nodes[i].random = nodes[toInt(pair[1])];
            }
            return nodes[0];
        }
        
        ListNode head = new ListNode(toInt(arr[0]));
        ListNode curr = head;
        for(int i=1; i<arr.length; i++) {
            curr.next = new ListNode(toInt(arr[i]));
            curr = curr.next;
        }
        return head;
    }
    
    public static ListNode[] toLinkedListArray(String s) {
        String[] arr = parseArray(s);
        ListNode[] res = new ListNode[arr.length];
        for(int i=0; i<arr.length; i++) res[i] = toLinkedList(arr[i]);
        return res;
    }
    
    public static TreeNode toBinaryTree(String s) {
        if(s.equals("[]")) return null;
        String[] arr = parseArray(s);
        if(arr.length == 0 || arr[0].equals("null")) return null;
        TreeNode root = new TreeNode(toInt(arr[0]));
        Queue<TreeNode> q = new LinkedList<>();
        q.add(root);
        int i = 1;
        while(!q.isEmpty() && i < arr.length) {
            TreeNode curr = q.poll();
            if(i < arr.length && !arr[i].equals("null")) {
                curr.left = new TreeNode(toInt(arr[i]));
                q.add(curr.left);
            }
            i++;
            if(i < arr.length && !arr[i].equals("null")) {
                curr.right = new TreeNode(toInt(arr[i]));
                q.add(curr.right);
            }
            i++;
        }
        return root;
    }
    
    public static long[] toLongArray(String s) {
        String[] arr = parseArray(s);
        long[] res = new long[arr.length];
        for(int i=0; i<arr.length; i++) res[i] = Long.parseLong(arr[i].trim());
        return res;
    }
    
    public static double[] toDoubleArray(String s) {
        String[] arr = parseArray(s);
        double[] res = new double[arr.length];
        for(int i=0; i<arr.length; i++) res[i] = Double.parseDouble(arr[i].trim());
        return res;
    }
    
    public static boolean[] toBoolArray(String s) {
        String[] arr = parseArray(s);
        boolean[] res = new boolean[arr.length];
        for(int i=0; i<arr.length; i++) res[i] = Boolean.parseBoolean(arr[i].trim());
        return res;
    }
    
    public static char[] toCharArray(String s) {
        String[] arr = parseArray(s);
        char[] res = new char[arr.length];
        for(int i=0; i<arr.length; i++) res[i] = stripQuotes(arr[i]).charAt(0);
        return res;
    }
    
    public static char[][] toChar2DArray(String s) {
        String[] arr = parseArray(s);
        char[][] res = new char[arr.length][];
        for(int i=0; i<arr.length; i++) res[i] = toCharArray(arr[i]);
        return res;
    }
    
    public static String serialize(Object o) {
        if(o == null) return "null";
        if(o instanceof int[]) return Arrays.toString((int[])o).replaceAll(" ", "");
        if(o instanceof int[][]) {
            StringBuilder sb = new StringBuilder("[");
            int[][] a = (int[][])o;
            for(int i=0; i<a.length; i++) {
                if(i>0) sb.append(",");
                sb.append(Arrays.toString(a[i]).replaceAll(" ", ""));
            }
            sb.append("]");
            return sb.toString();
        }
        if(o instanceof List) {
            StringBuilder sb = new StringBuilder("[");
            List<?> list = (List<?>)o;
            for(int i=0; i<list.size(); i++) {
                if(i>0) sb.append(",");
                sb.append(serialize(list.get(i)));
            }
            sb.append("]");
            return sb.toString();
        }
        if(o instanceof String[]) {
            StringBuilder sb = new StringBuilder("[");
            String[] a = (String[])o;
            for(int i=0; i<a.length; i++) {
                if(i>0) sb.append(",");
                sb.append((char)34).append(a[i]).append((char)34);
            }
            sb.append("]");
            return sb.toString();
        }
        if(o instanceof ListNode) {
            ListNode curr = (ListNode)o;
            boolean isRandom = false;
            Map<ListNode, Integer> map = new HashMap<>();
            int idx = 0;
            ListNode temp = curr;
            while(temp != null) {
                map.put(temp, idx++);
                if(temp.random != null) isRandom = true;
                temp = temp.next;
            }
            StringBuilder sb = new StringBuilder("[");
            while(curr != null) {
                if(sb.length()>1) sb.append(",");
                if(isRandom) {
                    sb.append("[").append(curr.val).append(",").append(curr.random == null ? "null" : map.get(curr.random)).append("]");
                } else {
                    sb.append(curr.val);
                }
                curr = curr.next;
            }
            sb.append("]");
            return sb.toString();
        }
        if(o instanceof TreeNode) {
            List<String> res = new ArrayList<>();
            Queue<TreeNode> q = new LinkedList<>();
            q.add((TreeNode)o);
            while(!q.isEmpty()) {
                TreeNode curr = q.poll();
                if(curr != null) {
                    res.add(String.valueOf(curr.val));
                    q.add(curr.left);
                    q.add(curr.right);
                } else {
                    res.add("null");
                }
            }
            while(res.size() > 0 && res.get(res.size()-1).equals("null")) res.remove(res.size()-1);
            return "[" + String.join(",", res) + "]";
        }
        if(o instanceof long[]) {
            StringBuilder sb = new StringBuilder("["); long[] a = (long[])o;
            for(int i=0; i<a.length; i++) { if(i>0) sb.append(","); sb.append(a[i]); }
            return sb.append("]").toString();
        }
        if(o instanceof double[]) {
            StringBuilder sb = new StringBuilder("["); double[] a = (double[])o;
            for(int i=0; i<a.length; i++) { if(i>0) sb.append(","); sb.append(a[i]); }
            return sb.append("]").toString();
        }
        if(o instanceof boolean[]) {
            StringBuilder sb = new StringBuilder("["); boolean[] a = (boolean[])o;
            for(int i=0; i<a.length; i++) { if(i>0) sb.append(","); sb.append(a[i]); }
            return sb.append("]").toString();
        }
        if(o instanceof char[]) {
            StringBuilder sb = new StringBuilder("["); char[] a = (char[])o;
            for(int i=0; i<a.length; i++) { if(i>0) sb.append(","); sb.append((char)34).append(a[i]).append((char)34); }
            return sb.append("]").toString();
        }
        if(o instanceof char[][]) {
            StringBuilder sb = new StringBuilder("["); char[][] a = (char[][])o;
            for(int i=0; i<a.length; i++) { if(i>0) sb.append(","); sb.append("[");
                for(int j=0; j<a[i].length; j++) { if(j>0) sb.append(","); sb.append((char)34).append(a[i][j]).append((char)34); }
                sb.append("]"); }
            return sb.append("]").toString();
        }
        if(o instanceof String) return String.valueOf((char)34) + o + (char)34;
        return String.valueOf(o);
    }
}
`;

    const interactiveHelpers = isInteractive ? `
    static int _hiddenTarget = 0;
    public static boolean isBadVersion(int version) {
        return version >= _hiddenTarget;
    }
    public static int guess(int num) {
        if (num > _hiddenTarget) return -1;
        if (num < _hiddenTarget) return 1;
        return 0;
    }
` : '';

    let mainCode = "";

    if (isDesign) {
        mainCode = `
        StringBuilder sb = new StringBuilder();
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String line;
        while((line = br.readLine()) != null) { sb.append(line).append("\\n"); }
        List<String> inputLines = Helper.splitInputs(sb.toString());
        if(inputLines.size() < 2) return;
        
        String[] commands = Helper.toStringArray(inputLines.get(0));
        String[] allArgsStr = Helper.parseArray(inputLines.get(1));
        
        List<String> output = new ArrayList<>();
        Object obj = null;
        Class<?> clazz = null;
        
        try {
            clazz = Class.forName(commands[0]);
            String[] consArgs = Helper.parseArray(allArgsStr[0]);
            for(Constructor<?> c : clazz.getDeclaredConstructors()) {
                if(c.getParameterCount() == consArgs.length) {
                    Object[] parsedArgs = new Object[consArgs.length];
                    Class<?>[] pTypes = c.getParameterTypes();
                    for(int j=0; j<consArgs.length; j++) {
                        if(pTypes[j] == int.class) parsedArgs[j] = Helper.toInt(consArgs[j]);
                        else if(pTypes[j] == String.class) parsedArgs[j] = Helper.stripQuotes(consArgs[j]);
                        else if(pTypes[j] == int[].class) parsedArgs[j] = Helper.toIntArray(consArgs[j]);
                    }
                    c.setAccessible(true);
                    obj = c.newInstance(parsedArgs);
                    output.add("null");
                    break;
                }
            }
            
            for(int i=1; i<commands.length; i++) {
                String cmd = commands[i];
                String[] mArgs = Helper.parseArray(allArgsStr[i]);
                boolean found = false;
                for(Method m : clazz.getDeclaredMethods()) {
                    if(m.getName().equals(cmd) && m.getParameterCount() == mArgs.length) {
                        Object[] parsedArgs = new Object[mArgs.length];
                        Class<?>[] pTypes = m.getParameterTypes();
                        for(int j=0; j<mArgs.length; j++) {
                            if(pTypes[j] == int.class) parsedArgs[j] = Helper.toInt(mArgs[j]);
                            else if(pTypes[j] == String.class) parsedArgs[j] = Helper.stripQuotes(mArgs[j]);
                            else if(pTypes[j] == int[].class) parsedArgs[j] = Helper.toIntArray(mArgs[j]);
                        }
                        m.setAccessible(true);
                        Object res = m.invoke(obj, parsedArgs);
                        output.add(m.getReturnType() == void.class ? "null" : Helper.serialize(res));
                        found = true;
                        break;
                    }
                }
                if(!found) output.add("null");
            }
            System.out.println("[" + String.join(",", output) + "]");
        } catch(Exception e) {
            e.printStackTrace();
        }
        `;
    } else {
        let reads = `
        StringBuilder sb = new StringBuilder();
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String line;
        while((line = br.readLine()) != null) { sb.append(line).append("\\n"); }
        List<String> inputLines = Helper.splitInputs(sb.toString());
        `;
        
        let callArgs = [];
        params.forEach((param, i) => {
            const jType = javaType(param.type || param.cType, param.name);
            reads += `        String raw_${i} = inputLines.size() > ${i} ? inputLines.get(${i}) : "";\n`;
            
            // Generate parser based on extracted type
            if(jType === 'int') reads += `        int p${i} = Helper.toInt(raw_${i});\n`;
            else if(jType === 'long') reads += `        long p${i} = Long.parseLong(raw_${i}.trim());\n`;
            else if(jType === 'double' || jType === 'float') reads += `        double p${i} = Double.parseDouble(raw_${i}.trim());\n`;
            else if(jType === 'boolean') reads += `        boolean p${i} = Helper.toBoolean(raw_${i});\n`;
            else if(jType === 'char') reads += `        char p${i} = Helper.stripQuotes(raw_${i}).charAt(0);\n`;
            else if(jType === 'String') reads += `        String p${i} = Helper.stripQuotes(raw_${i});\n`;
            else if(jType === 'int[]') reads += `        int[] p${i} = Helper.toIntArray(raw_${i});\n`;
            else if(jType === 'long[]') reads += `        long[] p${i} = Helper.toLongArray(raw_${i});\n`;
            else if(jType === 'double[]') reads += `        double[] p${i} = Helper.toDoubleArray(raw_${i});\n`;
            else if(jType === 'boolean[]') reads += `        boolean[] p${i} = Helper.toBoolArray(raw_${i});\n`;
            else if(jType === 'char[]') reads += `        char[] p${i} = Helper.toCharArray(raw_${i});\n`;
            else if(jType === 'int[][]') reads += `        int[][] p${i} = Helper.toInt2DArray(raw_${i});\n`;
            else if(jType === 'char[][]') reads += `        char[][] p${i} = Helper.toChar2DArray(raw_${i});\n`;
            else if(jType === 'String[]') reads += `        String[] p${i} = Helper.toStringArray(raw_${i});\n`;
            else if(jType === 'ListNode') reads += `        ListNode p${i} = Helper.toLinkedList(raw_${i});\n`;
            else if(jType === 'ListNode[]') reads += `        ListNode[] p${i} = Helper.toLinkedListArray(raw_${i});\n`;
            else if(jType === 'TreeNode') reads += `        TreeNode p${i} = Helper.toBinaryTree(raw_${i});\n`;
            else reads += `        String p${i} = raw_${i};\n`; // fallback
            callArgs.push(`p${i}`);
        });

        if (isInteractive) {
            reads += `        if(inputLines.size() > ${params.length}) _hiddenTarget = Helper.toInt(inputLines.get(inputLines.size()-1));\n`;
        }

        const argsStr = callArgs.join(', ');
        const isSolutionObj = userCode.includes('class Solution');

        if(isVoidReturn) {
            mainCode = `
${reads}
        ${isSolutionObj ? `Solution sol = new Solution();\n        sol.${fn}(${argsStr});` : `${fn}(${argsStr});`}
        System.out.println(Helper.serialize(p${outputParamIndex}));
        `;
        } else {
            mainCode = `
${reads}
        Object result = ${isSolutionObj ? `new Solution().${fn}(${argsStr})` : `${fn}(${argsStr})`};
        System.out.println(Helper.serialize(result));
        `;
        }
    }

    return `${headerCode}

${userCode}

public class Main {
${interactiveHelpers}
    public static void main(String[] args) throws Exception {
${mainCode}
    }
}
`;
};
