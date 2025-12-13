
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

    if (!fn) {
        return userCode;
    }

    let parseCode = "";
    let callArgs = [];
    let imports = new Set(["java.util.*", "java.io.*", "java.lang.*"]);

    params.forEach((param) => {
        const { name, type } = param;

        if (type === 'int') {
            parseCode += `        int ${name} = Integer.parseInt(reader.readLine().trim());\n`;
        }
        else if (type === 'long') {
            parseCode += `        long ${name} = Long.parseLong(reader.readLine().trim());\n`;
        }
        else if (type === 'double') {
            parseCode += `        double ${name} = Double.parseDouble(reader.readLine().trim());\n`;
        }
        else if (type === 'boolean') {
            parseCode += `        boolean ${name} = Boolean.parseBoolean(reader.readLine().trim());\n`;
        }
        else if (type === 'String') {
            parseCode += `        String ${name} = reader.readLine().trim();\n`;
            // Remove quotes if they exist in input? usually CP input is raw chars for string
            // But if input is "hello" (with quotes), we might need to strip. 
            // Standardizing on: Strings come as raw text.
        }
        else if (type === 'int[]') {
            parseCode += `        String ${name}Raw = reader.readLine().trim();\n`;
            // Expecting [1,2,3] format
            parseCode += `        ${name}Raw = ${name}Raw.substring(1, ${name}Raw.length() - 1);\n`;
            parseCode += `        String[] ${name}Parts = ${name}Raw.split(",");\n`;
            parseCode += `        int[] ${name} = new int[${name}Parts.length];\n`;
            parseCode += `        for(int i=0; i<${name}Parts.length; i++) {\n`;
            parseCode += `            if(!${name}Parts[i].trim().isEmpty()) ${name}[i] = Integer.parseInt(${name}Parts[i].trim());\n`;
            parseCode += `        }\n`;
        }
        else if (type === 'List<Integer>' || type === 'ArrayList<Integer>') {
            parseCode += `        String ${name}Raw = reader.readLine().trim();\n`;
            parseCode += `        ${name}Raw = ${name}Raw.substring(1, ${name}Raw.length() - 1);\n`;
            parseCode += `        String[] ${name}Parts = ${name}Raw.split(",");\n`;
            parseCode += `        List<Integer> ${name} = new ArrayList<>();\n`;
            parseCode += `        for(String part : ${name}Parts) {\n`;
            parseCode += `             if(!part.trim().isEmpty()) ${name}.add(Integer.parseInt(part.trim()));\n`;
            parseCode += `        }\n`;
        }
        // Add more types as needed
        else {
            parseCode += `        // TODO: Parse complex type ${type} for ${name}\n`;
            parseCode += `        ${type} ${name} = null;\n`;
        }

        callArgs.push(name);
    });

    const callArgsStr = callArgs.join(', ');
    const retType = returnType.type || 'void';

    // Determine if user code has 'class Solution'
    const isSolutionClass = userCode.includes('class Solution');

    let functionCall;
    if (isSolutionClass) {
        functionCall = `Solution sol = new Solution();\n        ${retType} result = sol.${fn}(${callArgsStr});`;
    } else {
        // specific static method or different class logic
        functionCall = `${retType} result = ${fn}(${callArgsStr});`;
    }

    let printCode = "";
    if (retType === 'void') {
        printCode = "";
    } else if (retType === 'int[]') {
        printCode = `System.out.print("[");\n        for(int i=0; i<result.length; i++) {\n            System.out.print(result[i]);\n            if(i<result.length-1) System.out.print(",");\n        }\n        System.out.println("]");`;
    } else if (retType === 'List<Integer>' || retType === 'ArrayList<Integer>') {
        printCode = `System.out.print("[");\n        for(int i=0; i<result.size(); i++) {\n            System.out.print(result.get(i));\n            if(i<result.size()-1) System.out.print(",");\n        }\n        System.out.println("]");`;
    } else {
        printCode = `System.out.println(result);`;
    }

    // Wrap in Main class
    // User code is usually "class Solution { ... }"
    // We need "import java.util.*; ... userCode ... public class Main { ... }"

    const importsStr = Array.from(imports).map(i => `import ${i};`).join('\n');

    // If user code has imports, they must be at the top. 
    // But since we can't easily parse them out, we assume user code contains "import ...;" or "class Solution ..."
    // A primitive heuristic: check if userCode starts with import. 
    // Actually, simpler: Just prepend our imports. Java allows multiple imports of same package.
    // However, if user puts 'package x;' that must be first. DSA solutions usually don't have package.

    return `${importsStr}

${userCode}

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));
        
${parseCode}
        ${functionCall}
        ${printCode}
    }
}
`;
};
