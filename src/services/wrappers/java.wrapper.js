
/**
 * Generate Java wrapper code using explicit Java metadata
 * @param {Object} problem - Problem object with javaMetadata
 * @param {string} userCode - User's Java code
 * @returns {string} - Complete Java program
 */
export const generateJavaWrapper = (problem, userCode) => {
    // Problem Metadata
    const fn = problem.functionName; // Fallback to root function name if javaMetadata missing
    const metadata = problem.javaMetadata || {};
    const params = (metadata.parameters && metadata.parameters.length > 0) ? metadata.parameters : (problem.parameters || []);
    const returnType = metadata.returnType || problem.returnType || {};

    if (!fn) return userCode;

    const imports = `
import java.util.*;
import java.io.*;
import java.util.stream.Collectors;
`;

    const definitions = `
// --- Definitions ---
class ListNode {
    int val;
    ListNode next;
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
`;

    const mainClassStart = `
public class Main {
    // --- Helpers ---
    private static int[] stringToIntArray(String input) {
        input = input.trim();
        if(input.equals("[]")) return new int[0];
        if(input.startsWith("[")) input = input.substring(1, input.length()-1);
        if(input.isEmpty()) return new int[0];
        
        String[] parts = input.split(",");
        int[] res = new int[parts.length];
        for(int i=0; i<parts.length; i++) {
            try {
                res[i] = Integer.parseInt(parts[i].trim());
            } catch(NumberFormatException e) {
                res[i] = 0; // Fallback
            }
        }
        return res;
    }

    private static char[] stringToCharArray(String input) {
        input = input.trim();
        if(input.equals("[]")) return new char[0];
        if(input.startsWith("[")) input = input.substring(1, input.length()-1);
        if(input.isEmpty()) return new char[0];

        // Parse ["a","b"] -> char[] {'a','b'}
        // Simple regex split by comma, then strip quotes
        List<Character> chars = new ArrayList<>();
        boolean inQuote = false;
        StringBuilder sb = new StringBuilder();
        
        for(char c : input.toCharArray()) {
            if(c == '"' || c == '\\'') {
                inQuote = !inQuote;
            } else if (c == ',' && !inQuote) {
                if(sb.length() > 0) chars.add(sb.charAt(0));
                sb.setLength(0);
            } else {
                sb.append(c);
            }
        }
        if(sb.length() > 0) chars.add(sb.charAt(0));
        
        char[] res = new char[chars.size()];
        for(int i=0; i<chars.size(); i++) res[i] = chars.get(i);
        return res;
    }

    private static int[][] stringTo2DIntArray(String input) {
        input = input.trim();
        if(input.equals("[]") || input.length() < 4) return new int[0][0]; // "[]" or "[[]]"
        if(input.startsWith("[")) input = input.substring(1, input.length()-1);
        
        List<int[]> rows = new ArrayList<>();
        int start = 0;
        int brackets = 0;
        for(int i=0; i<input.length(); i++) {
            if(input.charAt(i) == '[') brackets++;
            else if(input.charAt(i) == ']') brackets--;
            
            if(brackets == 0 && (i == input.length()-1 || input.charAt(i+1) == ',')) {
                 // Found a row: input[start...i+1]
                 // Strip trailing comma if needed
                 String rowStr = input.substring(start, i+1);
                 rows.add(stringToIntArray(rowStr));
                 start = i + 2; // skip ],
                 i++; 
            }
        }
        
        int[][] res = new int[rows.size()][];
        for(int i=0; i<rows.size(); i++) res[i] = rows.get(i);
        return res;
    }

    private static ListNode stringToListNode(String input) {
        int[] arr = stringToIntArray(input);
        if(arr.length == 0) return null;
        ListNode head = new ListNode(arr[0]);
        ListNode curr = head;
        for(int i=1; i<arr.length; i++) {
            curr.next = new ListNode(arr[i]);
            curr = curr.next;
        }
        return head;
    }

    private static TreeNode stringToTreeNode(String input) {
        input = input.trim();
        if(input.equals("[]") || input.equals("null")) return null;
        if(input.startsWith("[")) input = input.substring(1, input.length()-1);
        if(input.isEmpty()) return null;

        String[] parts = input.split(",");
        if(parts.length == 0 || parts[0].trim().equals("null")) return null;

        TreeNode root = new TreeNode(Integer.parseInt(parts[0].trim()));
        Queue<TreeNode> queue = new LinkedList<>();
        queue.add(root);

        int i = 1;
        while(!queue.isEmpty() && i < parts.length) {
            TreeNode curr = queue.poll();
            
            // Left
            if(i < parts.length) {
                String val = parts[i].trim();
                if(!val.equals("null")) {
                    curr.left = new TreeNode(Integer.parseInt(val));
                    queue.add(curr.left);
                }
                i++;
            }

            // Right
            if(i < parts.length) {
                String val = parts[i].trim();
                if(!val.equals("null")) {
                    curr.right = new TreeNode(Integer.parseInt(val));
                    queue.add(curr.right);
                }
                i++;
            }
        }
        return root;
    }

    // --- Printers ---
    private static void printListNode(ListNode head) {
        System.out.print("[");
        ListNode curr = head;
        while(curr != null) {
            System.out.print(curr.val);
            if(curr.next != null) System.out.print(",");
            curr = curr.next;
        }
        System.out.println("]");
    }

    private static void printTreeNode(TreeNode root) {
        if(root == null) { System.out.println("[]"); return; }
        List<String> res = new ArrayList<>();
        Queue<TreeNode> q = new LinkedList<>();
        q.add(root);
        
        while(!q.isEmpty()) {
            TreeNode curr = q.poll();
            if(curr == null) res.add("null");
            else {
                res.add(String.valueOf(curr.val));
                q.add(curr.left);
                q.add(curr.right);
            }
        }
        
        // Trim trailing nulls
        int i = res.size() - 1;
        while(i >= 0 && res.get(i).equals("null")) {
            res.remove(i);
            i--;
        }

        System.out.print("[");
        for(int j=0; j<res.size(); j++) {
            System.out.print(res.get(j));
            if(j < res.size()-1) System.out.print(",");
        }
        System.out.println("]");
    }

    private static void printArray(int[] arr) {
        System.out.print("[");
        for(int i=0; i<arr.length; i++) {
            System.out.print(arr[i]);
            if(i < arr.length-1) System.out.print(",");
        }
        System.out.println("]");
    }
    
    // For String Compression
    private static void printCharArray(char[] arr, int len) {
        System.out.print("[");
        for(int i=0; i<len; i++) {
            System.out.print("\\"" + arr[i] + "\\"");
            if(i < len - 1) System.out.print(",");
        }
        System.out.println("]");
    }

    public static void main(String[] args) throws IOException {
        BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));
`;

    // Helper to map C/Standard types to Java types
    const parseType = (t) => {
        if (!t) return 'Object';
        if (t.includes('ListNode')) return 'ListNode';
        if (t.includes('TreeNode')) return 'TreeNode';
        if (t === 'int**' || t === 'List<List<Integer>>' || t === 'int[][]') return 'int[][]';
        if (t === 'int*' || t === 'int[]' || t === 'list<int>') return 'int[]';
        if (t === 'char[]' || t === 'vector<char>') return 'char[]';
        if (t === 'string' || t === 'char*' || t === 'String') return 'String';
        if (t === 'char**' || t === 'string[]') return 'String[]'; // Simplified
        if (t === 'long long') return 'long';
        if (t === 'double' || t === 'float') return 'double';
        if (t === 'boolean' || t === 'bool') return 'boolean';
        return t;
    };

    // Parsing Logic
    let parseCode = "";
    let callArgs = [];

    // Special Case: Rearrange Words string input
    const isRearrangeWords = problem.slug === 'rearrange-words-in-a-sentence';
    const isStringCompression = problem.slug === 'string-compression';

    params.forEach((param) => {
        const { name } = param;
        let cType = param.type || param.cType; // Flexible property
        let javaType = parseType(cType);

        if (isStringCompression && name === 'chars') {
            javaType = 'char[]';
        }

        parseCode += `        String raw_${name} = reader.readLine();\n        if(raw_${name} == null) return;\n`;

        if (javaType === 'ListNode') {
            parseCode += `        ListNode ${name} = stringToListNode(raw_${name});\n`;
            callArgs.push(name);
        } else if (javaType === 'TreeNode') {
            parseCode += `        TreeNode ${name} = stringToTreeNode(raw_${name});\n`;
            callArgs.push(name);
        } else if (javaType === 'int[]') {
            parseCode += `        int[] ${name} = stringToIntArray(raw_${name});\n`;
            callArgs.push(name);
        } else if (javaType === 'char[]') {
            parseCode += `        char[] ${name} = stringToCharArray(raw_${name});\n`;
            callArgs.push(name);
        } else if (javaType === 'int[][]') {
            parseCode += `        int[][] ${name} = stringTo2DIntArray(raw_${name});\n`;
            if (cType === 'List<List<Integer>>') {
                parseCode += `        List<List<Integer>> ${name}_list = new ArrayList<>();\n`;
                parseCode += `        for(int[] row : ${name}) {\n`;
                parseCode += `            List<Integer> listRow = new ArrayList<>();\n`;
                parseCode += `            for(int v : row) listRow.add(v);\n`;
                parseCode += `            ${name}_list.add(listRow);\n`;
                callArgs.push(`${name}_list`);
            } else {
                callArgs.push(name);
            }
        } else if (javaType === 'int' || cType === 'integer') {
            parseCode += `        int ${name} = 0;\n`;
            parseCode += `        try { ${name} = Integer.parseInt(raw_${name}.trim()); } catch(Exception e) {}\n`;
            callArgs.push(name);
        } else if (javaType === 'long') {
            parseCode += `        long ${name} = 0;\n`;
            parseCode += `        try { ${name} = Long.parseLong(raw_${name}.trim()); } catch(Exception e) {}\n`;
            callArgs.push(name);
        } else if (javaType === 'String') {
            parseCode += `        String ${name} = raw_${name}.trim();\n`;
            // Always strip quotes for Java input strings from JSON-like lines
            parseCode += `        if(${name}.startsWith("\\"")) ${name} = ${name}.substring(1, ${name}.length()-1);\n`;
            callArgs.push(name);
        } else if (javaType === 'boolean') {
            parseCode += `        boolean ${name} = Boolean.parseBoolean(raw_${name}.trim());\n`;
            callArgs.push(name);
        } else {
            // Fallback to List<Integer> if explicitly requested, else int[]
            if (cType.includes('List<Integer>')) {
                parseCode += `        int[] arr_${name} = stringToIntArray(raw_${name});\n`;
                parseCode += `        List<Integer> ${name} = new ArrayList<>();\n`;
                parseCode += `        for(int val : arr_${name}) ${name}.add(val);\n`;
                callArgs.push(name);
            } else {
                parseCode += `        // Unknown type ${cType} -> ${javaType}, passing raw might fail but better than nothing\n`;
                parseCode += `        String ${name} = raw_${name};\n`;
                callArgs.push(name);
            }
        }
    });

    const callArgsStr = callArgs.join(', ');
    const rawRetType = returnType.type || returnType.cType || 'void';
    let retType = parseType(rawRetType);

    // Handle List<Integer> return specifically
    // Use regex to check if the main function actually returns List<Integer>
    if (userCode.match(new RegExp(`public\\s+List<Integer>\\s+${fn}`))) {
        retType = 'List<Integer>';
    } else if (userCode.match(new RegExp(`public\\s+List<List<Integer>>\\s+${fn}`))) {
        retType = 'List<List<Integer>>';
    } else if (rawRetType.includes('List<Integer>')) {
        retType = 'List<Integer>';
    } else if (rawRetType.includes('List<List<Integer>>')) {
        retType = 'List<List<Integer>>';
    } else if (rawRetType === 'int*') {
        retType = 'int[]';
    } else if (rawRetType === 'long long') {
        retType = 'long';
    }

    const isSolutionClass = userCode.includes('class Solution');
    const functionCall = isSolutionClass
        ? `        Solution sol = new Solution();\n        ${retType} result = sol.${fn}(${callArgsStr});`
        : `        ${retType} result = ${fn}(${callArgsStr});`;

    let printLogic;
    if (problem.slug === 'string-compression') {
        printLogic = `            System.out.print("Return " + result + ", and the first ");\n        if(result == 1) System.out.print("character"); else System.out.print(result + " characters");\n        System.out.print(" of the input array should be: ");\n        printCharArray(chars, result);`;
    } else if (retType === 'ListNode') {
        printLogic = `            printListNode(result);`;
    } else if (retType === 'TreeNode') {
        printLogic = `            printTreeNode(result);`;
    } else if (retType.includes('[]')) {
        printLogic = `            printArray(result);`;
    } else if (retType.includes('List')) {
        // Print List as Array
        printLogic = `            System.out.print("[");\n        for(int i=0; i<result.size(); i++) {\n            System.out.print(result.get(i));\n            if(i < result.size()-1) System.out.print(",");\n        }\n        System.out.println("]");`;
    } else if (retType === 'String') {
        printLogic = `            System.out.println("\\"" + result + "\\"");`;
    } else {
        printLogic = `            System.out.println(result);`;
    }

    let printCode = printLogic;

    // Clean user code: remove 'public' from 'public class Solution' to avoid collision
    const sanitizedUserCode = userCode.replace(/public\s+class\s+Solution/g, 'class Solution');

    return `${imports}
${definitions}

${sanitizedUserCode}

${mainClassStart}
${parseCode}
    ${functionCall}
    ${printCode}
    }
}
`;
};
