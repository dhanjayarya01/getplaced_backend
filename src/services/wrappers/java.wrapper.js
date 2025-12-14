
/**
 * Generate Java wrapper code using explicit Java metadata
 * @param {Object} problem - Problem object with javaMetadata
 * @param {string} userCode - User's Java code
 * @returns {string} - Complete Java program
 */
export const generateJavaWrapper = (problem, userCode) => {
    const metadata = problem.javaMetadata || {};
    const fn = metadata.functionName;
    const params = metadata.parameters || [];
    const returnType = metadata.returnType || {};

    if (!fn) return userCode;

    // Detect Usage
    const allTypes = [...params.map(p => p.type), returnType.type].filter(Boolean).join(' ');
    const usesListNode = allTypes.includes('ListNode');
    const usesTreeNode = allTypes.includes('TreeNode');



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

    public static void main(String[] args) throws IOException {
        BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));
`;

    // Parsing Logic
    let parseCode = "";
    let callArgs = [];

    params.forEach((param) => {
        const { name, type } = param;
        parseCode += `        String raw_${name} = reader.readLine();\n        if(raw_${name} == null) return;\n`;

        if (type.includes('ListNode')) {
            parseCode += `        ListNode ${name} = stringToListNode(raw_${name});\n`;
            callArgs.push(name);
        } else if (type.includes('TreeNode')) {
            parseCode += `        TreeNode ${name} = stringToTreeNode(raw_${name});\n`;
            callArgs.push(name);
        } else if (type === 'int[]') {
            parseCode += `        int[] ${name} = stringToIntArray(raw_${name});\n`;
            callArgs.push(name);
        } else if (type === 'int') {
            // Safe parse
            parseCode += `        int ${name} = 0;\n`;
            parseCode += `        try { ${name} = Integer.parseInt(raw_${name}.trim()); } catch(Exception e) {}\n`;
            callArgs.push(name);
        } else if (type === 'String') {
            parseCode += `        String ${name} = raw_${name};\n`;
            callArgs.push(name);
        } else if (type.includes('List<Integer>')) {
            parseCode += `        int[] arr_${name} = stringToIntArray(raw_${name});\n`;
            parseCode += `        List<Integer> ${name} = new ArrayList<>();\n`;
            parseCode += `        for(int val : arr_${name}) ${name}.add(val);\n`;
            callArgs.push(name);
        } else {
            // Fallback
            parseCode += `        // Unknown type ${type}\n`;
        }
    });

    const callArgsStr = callArgs.join(', ');
    const retType = returnType.type || 'void';

    const isSolutionClass = userCode.includes('class Solution');
    const functionCall = isSolutionClass
        ? `        Solution sol = new Solution();\n        ${retType} result = sol.${fn}(${callArgsStr});`
        : `        ${retType} result = ${fn}(${callArgsStr});`;

    let printCode = "";
    if (retType.includes('ListNode')) {
        printCode = `        printListNode(result);`;
    } else if (retType.includes('TreeNode')) {
        printCode = `        printTreeNode(result);`;
    } else if (retType === 'int[]') {
        printCode = `        System.out.print("[");
        for(int i=0; i<result.length; i++) {
            System.out.print(result[i]);
            if(i<result.length-1) System.out.print(",");
        }
        System.out.println("]");`;
    } else {
        printCode = `        System.out.println(result);`;
    }

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
